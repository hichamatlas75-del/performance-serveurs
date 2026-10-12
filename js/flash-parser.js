/**
 * ==============================================================================
 * GREY CORNER — PARSEUR INTELLIGENT DES FICHIERS FLASH JOURNÉE (EXCEL)
 * ==============================================================================
 */

window.FlashParser = {
  /**
   * Parse un fichier Excel Flash Journée
   * @param {ArrayBuffer|Uint8Array} fileData
   * @param {string} fileName
   * @returns {Object} { date: 'YYYY-MM-DD', yearMonth: 'YYYY-MM', servers: [ { server, rawName, totalNet, tickets, ... } ], totalNetGlobal: number }
   */
  parseWorkbook(fileData, fileName) {
    if (typeof XLSX === 'undefined') {
      throw new Error("La bibliothèque SheetJS (XLSX) n'est pas chargée.");
    }

    const workbook = XLSX.read(fileData, { type: 'array' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("Le classeur Excel ne contient aucune feuille.");
    }

    // Détection de la date depuis le nom de fichier
    const dateInfo = this.extractDateFromFileName(fileName);
    let parsedDate = dateInfo.date;
    let parsedYearMonth = dateInfo.yearMonth;

    let allServersData = [];
    let detectedTotalGlobal = 0;

    // Parcourir toutes les feuilles du classeur pour trouver la section Serveurs
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      if (!rows || rows.length === 0) continue;

      // Si la date n'est pas dans le nom de fichier, tenter de la trouver dans les premières lignes
      if (!parsedDate) {
        for (let r = 0; r < Math.min(rows.length, 10); r++) {
          const rowStr = rows[r].join(" ");
          const m = rowStr.match(/(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/) || rowStr.match(/(\d{4})[\/\.-](\d{2})[\/\.-](\d{2})/);
          if (m) {
            if (m[1].length === 4) {
              parsedDate = `${m[1]}-${m[2]}-${m[3]}`;
              parsedYearMonth = `${m[1]}-${m[2]}`;
            } else {
              parsedDate = `${m[3]}-${m[2]}-${m[1]}`;
              parsedYearMonth = `${m[3]}-${m[2]}`;
            }
            break;
          }
        }
      }

      const extracted = this.extractServersFromRows(rows);
      if (extracted.servers.length > 0) {
        allServersData = extracted.servers;
        if (extracted.totalGlobal > 0) detectedTotalGlobal = extracted.totalGlobal;
        break; // Feuille principale identifiée
      }
    }

    // Calcul du total net global si non détecté
    if (detectedTotalGlobal === 0 && allServersData.length > 0) {
      detectedTotalGlobal = allServersData.reduce((acc, s) => acc + (s.totalNet || 0), 0);
    }

    return {
      fileName: fileName,
      date: parsedDate || new Date().toISOString().slice(0, 10),
      yearMonth: parsedYearMonth || (parsedDate ? parsedDate.slice(0, 7) : new Date().toISOString().slice(0, 7)),
      totalNetGlobal: Math.round(detectedTotalGlobal * 100) / 100,
      servers: allServersData
    };
  },

  /**
   * Extrait la date depuis le nom de fichier (ex: Flash_Journee_20260907.xls)
   */
  extractDateFromFileName(fileName) {
    if (!fileName) return { date: null, yearMonth: null };
    const m = fileName.match(/(\d{4})(\d{2})(\d{2})/);
    if (m) {
      return {
        date: `${m[1]}-${m[2]}-${m[3]}`,
        yearMonth: `${m[1]}-${m[2]}`
      };
    }
    const mDash = fileName.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
    if (mDash) {
      return {
        date: `${mDash[1]}-${mDash[2]}-${mDash[3]}`,
        yearMonth: `${mDash[1]}-${mDash[2]}`
      };
    }
    return { date: null, yearMonth: null };
  },

  /**
   * Analyse les lignes du tableur pour extraire les serveurs et leurs chiffres
   */
  extractServersFromRows(rows) {
    const servers = [];
    let totalGlobal = 0;
    let headerRowIdx = -1;
    let colServer = -1;
    let colNet = -1;
    let colTickets = -1;
    let colBrut = -1;

    // 1. Recherche de la ligne d'en-tête contenant "serveur", "vendeur", "employé", "total net", etc.
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      for (let c = 0; c < row.length; c++) {
        const val = normalizeServerString(String(row[c]));
        if (val.includes("serveur") || val.includes("vendeur") || val.includes("employe") || val.includes("nom")) {
          colServer = c;
          headerRowIdx = r;
        }
        if (val.includes("total net") || val.includes("net") || val.includes("recette") || val.includes("montant net") || val.includes("c a net")) {
          colNet = c;
        }
        if (val.includes("ticket") || val.includes("couvert") || val.includes("nbre") || val.includes("nbr")) {
          colTickets = c;
        }
        if (val.includes("total brut") || val.includes("brut")) {
          colBrut = c;
        }
      }

      if (colServer !== -1 && (colNet !== -1 || r + 1 < rows.length)) {
        break;
      }
    }

    // 2. Si un en-tête a été trouvé, lire les lignes suivantes
    if (headerRowIdx !== -1 && colServer !== -1) {
      // Si la colonne Net n'a pas été trouvée par son intitulé, trouver la dernière colonne numérique
      for (let r = headerRowIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!Array.isArray(row) || row.length === 0) continue;

        const rawServerName = String(row[colServer] || "").trim();
        if (!rawServerName || rawServerName.length < 2) continue;

        const normServerName = normalizeServerString(rawServerName);

        // Détection de fin de tableau ou ligne de totalisation
        if (normServerName.startsWith("total") || normServerName.includes("total general") || normServerName.includes("global") || normServerName.includes("cumul")) {
          const possibleTotal = this.parseNumericValue(row[colNet !== -1 ? colNet : row.length - 1]);
          if (possibleTotal > 0) totalGlobal = possibleTotal;
          continue;
        }

        // Ignorer les lignes de titres ou répétition d'en-tête
        if (normServerName.includes("serveur") || normServerName.includes("vendeur")) continue;

        // Extraire le montant net
        let netAmount = 0;
        if (colNet !== -1) {
          netAmount = this.parseNumericValue(row[colNet]);
        } else {
          // Rechercher la colonne numérique la plus pertinente
          for (let c = row.length - 1; c >= 0; c--) {
            if (c === colServer) continue;
            const n = this.parseNumericValue(row[c]);
            if (n > 0) {
              netAmount = n;
              break;
            }
          }
        }

        // Nombre de tickets / couverts si disponible
        let ticketsCount = 0;
        if (colTickets !== -1) {
          ticketsCount = Math.round(this.parseNumericValue(row[colTickets]));
        }

        if (netAmount > 0 || normServerName.length > 2) {
          const resolvedServer = findServerByRawName(rawServerName);
          servers.push({
            server: resolvedServer,
            rawName: rawServerName,
            totalNet: Math.round(netAmount * 100) / 100,
            tickets: ticketsCount,
            totalBrut: colBrut !== -1 ? this.parseNumericValue(row[colBrut]) : netAmount
          });
        }
      }
    } else {
      // 3. Fallback heuristique : balayer chaque ligne pour trouver [Texte correspondant à un serveur, Nombre]
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (!Array.isArray(row)) continue;

        let foundName = null;
        let foundNum = null;

        for (let c = 0; c < row.length; c++) {
          const cellStr = String(row[c] || "").trim();
          const num = this.parseNumericValue(row[c]);

          if (num > 10 && foundNum === null) {
            foundNum = num;
          } else if (cellStr.length >= 3 && isNaN(cellStr) && foundName === null) {
            const norm = normalizeServerString(cellStr);
            if (!norm.includes("total") && !norm.includes("date") && !norm.includes("grey") && !norm.includes("page")) {
              const matched = findServerByRawName(cellStr);
              if (matched) foundName = cellStr;
            }
          }
        }

        if (foundName && foundNum) {
          const resolved = findServerByRawName(foundName);
          servers.push({
            server: resolved,
            rawName: foundName,
            totalNet: Math.round(foundNum * 100) / 100,
            tickets: 0,
            totalBrut: foundNum
          });
        }
      }
    }

    return { servers, totalGlobal };
  },

  /**
   * Convertit une valeur de cellule en float fiable (gère les séparateurs 1 200,50 ou 1,200.50 ou DH)
   */
  parseNumericValue(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;

    let s = String(val)
      .replace(/[^\d,\.-]/g, "") // Supprime DH, DHS, espaces insécables, etc.
      .trim();

    if (!s) return 0;

    // Gérer les formats avec virgule comme séparateur décimal (ex: 1250,50)
    if (s.includes(",") && !s.includes(".")) {
      s = s.replace(",", ".");
    } else if (s.includes(",") && s.includes(".")) {
      // Format 1,250.50 -> supprimer la virgule
      if (s.indexOf(",") < s.indexOf(".")) {
        s = s.replace(/,/g, "");
      } else {
        // Format 1.250,50 -> point est millier, virgule décimale
        s = s.replace(/\./g, "").replace(",", ".");
      }
    }

    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }
};
