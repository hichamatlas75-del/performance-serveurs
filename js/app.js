/**
 * ==============================================================================
 * GREY CORNER — PERFORMANCE SERVEUR APPLICATION ENGINE
 * Début officiel du calcul de performance : 1er Août 2026
 * Mode Cumul des Mois & Optimisation PC / Mobile
 * ==============================================================================
 */

(function () {
  'use strict';

  // Début officiel du suivi de performance
  const MIN_TRACKING_MONTH = '2026-08';
  const STORAGE_KEY = 'gc_flash_sessions_v1';

  // État global de l'application
  const AppState = {
    selectedMonth: 'ALL', // 'ALL' = Cumul Général depuis Août 2026, ou 'YYYY-MM'
    sessions: new Map(), // 'YYYY-MM-DD' => session object
    availableMonths: new Set(),
    chartInstance: null,
    modalChartInstance: null
  };

  // ==============================================================================
  // INITIALISATION
  // ==============================================================================
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadEmbeddedData();
    loadCachedSessions();
    initMonthSelector();
    initEventListeners();
    updateUI();
    syncFromGitHub();
  });

  // ==============================================================================
  // GESTION DU THÈME (CLAIR PRO & SOMBRE LUXE)
  // ==============================================================================
  function initTheme() {
    const savedTheme = localStorage.getItem('gc_theme') || 'light';
    applyTheme(savedTheme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gc_theme', theme);
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) {
      if (theme === 'dark') {
        btn.innerHTML = '<i class="fa-solid fa-sun" style="color: var(--gold);"></i> <span>Mode Clair</span>';
        btn.title = "Passer en Mode Clair";
      } else {
        btn.innerHTML = '<i class="fa-solid fa-moon" style="color: var(--gold);"></i> <span>Mode Sombre</span>';
        btn.title = "Passer en Mode Sombre";
      }
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    const stats = calculateMonthStats(AppState.selectedMonth);
    renderChart(stats);
  }

  /**
   * Charge en priorité absolue les données pré-compilées locales (fonctionne hors-ligne et sur file://)
   */
  function loadEmbeddedData() {
    if (typeof window.FLASH_SUMMARY_DATA !== 'undefined' && Array.isArray(window.FLASH_SUMMARY_DATA)) {
      window.FLASH_SUMMARY_DATA.forEach(s => {
        if (s && s.date) {
          const ym = s.yearMonth || s.date.slice(0, 7);
          if (ym >= MIN_TRACKING_MONTH) {
            if (Array.isArray(s.servers)) {
              s.servers = s.servers.filter(item => {
                if (!item) return false;
                const raw = String(item.rawName || "").toLowerCase();
                if (raw.includes('quassir') || raw.includes('hicham')) return false;
                item.server = findServerByRawName(item.rawName);
                return item.server !== null && item.server.id !== 'QUASSIR_HICHAM';
              });
            }
            AppState.sessions.set(s.date, s);
            AppState.availableMonths.add(ym);
          }
        }
      });
      console.log(`⚡ [FlashSummary] ${AppState.sessions.size} sessions chargées immédiatement depuis flash_summary.js`);
    }
  }

  function initMonthSelector() {
    const select = document.getElementById('month-select');
    const tabsContainer = document.getElementById('period-tabs');
    if (!select) return;

    // Récupérer tous les mois disponibles >= '2026-08'
    const available = Array.from(AppState.availableMonths)
      .filter(m => m >= MIN_TRACKING_MONTH);

    // Garantir la présence des mois clés
    ['2026-10', '2026-09', '2026-08'].forEach(m => {
      if (!available.includes(m)) available.push(m);
    });

    available.sort().reverse(); // 2026-10, 2026-09, 2026-08

    const options = [
      { key: 'ALL', label: '🏆 Cumul Général (Août — Octobre 2026)', shortLabel: '🏆 Cumul Global' },
      ...available.map(k => ({
        key: k,
        label: getMonthFullLabel(k),
        shortLabel: getShortMonthLabel(k)
      }))
    ];

    select.innerHTML = options
      .map(o => `<option value="${o.key}" ${o.key === AppState.selectedMonth ? 'selected' : ''}>${o.label}</option>`)
      .join('');

    // Rendu des onglets rapides de période
    if (tabsContainer) {
      tabsContainer.innerHTML = options.map(o => `
        <button type="button" class="period-tab ${o.key === AppState.selectedMonth ? 'active' : ''}" data-period="${o.key}">
          ${o.shortLabel}
        </button>
      `).join('');

      tabsContainer.querySelectorAll('.period-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = btn.getAttribute('data-period');
          AppState.selectedMonth = p;
          select.value = p;
          updatePeriodTabs();
          updateUI();
        });
      });
    }

    select.addEventListener('change', (e) => {
      AppState.selectedMonth = e.target.value;
      updatePeriodTabs();
      updateUI();
    });
  }

  function updatePeriodTabs() {
    const tabsContainer = document.getElementById('period-tabs');
    if (!tabsContainer) return;
    tabsContainer.querySelectorAll('.period-tab').forEach(btn => {
      const p = btn.getAttribute('data-period');
      if (p === AppState.selectedMonth) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function getMonthFullLabel(ym) {
    const map = {
      '2026-10': 'Octobre 2026 (En cours)',
      '2026-09': 'Septembre 2026',
      '2026-08': 'Août 2026 (Début de calcul)'
    };
    if (map[ym]) return map[ym];
    const parts = ym.split('-');
    const mNum = parseInt(parts[1], 10);
    const monthsFr = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return `${monthsFr[mNum - 1] || ym} ${parts[0]}`;
  }

  function getShortMonthLabel(ym) {
    const map = {
      '2026-10': 'Octobre 2026',
      '2026-09': 'Septembre 2026',
      '2026-08': 'Août 2026'
    };
    if (map[ym]) return map[ym];
    const parts = ym.split('-');
    const mNum = parseInt(parts[1], 10);
    const monthsFr = ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
    return `${monthsFr[mNum - 1] || ym} ${parts[0].slice(2)}`;
  }

  function initEventListeners() {
    // Bouton de bascule Mode Clair / Sombre
    const btnTheme = document.getElementById('btn-theme-toggle');
    if (btnTheme) {
      btnTheme.addEventListener('click', toggleTheme);
    }

    // Bouton de synchronisation
    const btnSync = document.getElementById('btn-sync');
    if (btnSync) {
      btnSync.addEventListener('click', () => syncFromGitHub(true));
    }

    // Gestion Drag & Drop
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleIncomingFiles(e.dataTransfer.files);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleIncomingFiles(e.target.files);
        }
      });
    }

    // Modal close
    const modalClose = document.getElementById('modal-close');
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalClose && modalOverlay) {
      modalClose.addEventListener('click', () => modalOverlay.classList.remove('active'));
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) modalOverlay.classList.remove('active');
      });
    }
  }

  // ==============================================================================
  // CHARGEMENT & SYNCHRONISATION DES DONNÉES
  // ==============================================================================
  function loadCachedSessions() {
    try {
      if (typeof localStorage === 'undefined') return;
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach(s => {
            if (s && s.date) {
              const ym = s.yearMonth || s.date.slice(0, 7);
              if (ym >= MIN_TRACKING_MONTH) {
                // Re-résoudre les serveurs et exclure Quassir
                if (Array.isArray(s.servers)) {
                  s.servers = s.servers.filter(item => {
                    if (!item) return false;
                    const raw = String(item.rawName || "").toLowerCase();
                    if (raw.includes('quassir') || raw.includes('hicham')) return false;
                    item.server = findServerByRawName(item.rawName);
                    return item.server !== null && item.server.id !== 'QUASSIR_HICHAM';
                  });
                }
                AppState.sessions.set(s.date, s);
                AppState.availableMonths.add(ym);
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn("Erreur lecture cache local :", e);
    }
  }

  function saveSessionsToCache() {
    try {
      if (typeof localStorage === 'undefined') return;
      const arr = Array.from(AppState.sessions.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      console.warn("Erreur sauvegarde cache local :", e);
    }
  }

  /**
   * Tente de synchroniser les fichiers depuis GitHub ou fichier distant
   */
  async function syncFromGitHub(manual = false) {
    const btnSync = document.getElementById('btn-sync');
    if (btnSync && manual) {
      btnSync.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Synchronisation...';
      btnSync.disabled = true;
    }

    let filesLoaded = 0;

    try {
      // 0. Tenter en priorité le fichier de synthèse instantané flash_summary.json
      const summarySources = [
        'data/flash_summary.json',
        `https://raw.githubusercontent.com/hichamatlas75-del/performance-serveurs/main/data/flash_summary.json?t=${Date.now()}`
      ];

      for (const sUrl of summarySources) {
        try {
          const sRes = await fetch(sUrl, { cache: 'no-store' });
          if (sRes.ok) {
            const summaryData = await sRes.json();
            if (Array.isArray(summaryData) && summaryData.length > 0) {
              summaryData.forEach(s => {
                if (s && s.date) {
                  const ym = s.yearMonth || s.date.slice(0, 7);
                  if (ym >= MIN_TRACKING_MONTH) {
                    if (Array.isArray(s.servers)) {
                      s.servers = s.servers.filter(item => {
                        if (!item) return false;
                        const raw = String(item.rawName || "").toLowerCase();
                        if (raw.includes('quassir') || raw.includes('hicham')) return false;
                        item.server = findServerByRawName(item.rawName);
                        return item.server !== null && item.server.id !== 'QUASSIR_HICHAM';
                      });
                    }
                    AppState.sessions.set(s.date, s);
                    AppState.availableMonths.add(ym);
                    filesLoaded++;
                  }
                }
              });
              break;
            }
          }
        } catch (errSummary) {
          // fallback continue
        }
      }

      // 1. Tenter de lire le manifest flash_serveurs/manifest.json sur GitHub
      const manifestUrl = `https://raw.githubusercontent.com/hichamatlas75-del/Fiche-technique/main/flash_serveurs/manifest.json?t=${Date.now()}`;
      const res = await fetch(manifestUrl, { cache: 'no-store' });

      if (res.ok) {
        const manifest = await res.json();
        if (manifest && Array.isArray(manifest.files)) {
          for (const relPath of manifest.files) {
            const dateMatch = relPath.match(/(\d{4})(\d{2})(\d{2})/);
            const dKey = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null;
            if (dKey && AppState.sessions.has(dKey)) continue; // Déjà chargé

            const rawFileUrl = `https://raw.githubusercontent.com/hichamatlas75-del/Fiche-technique/main/flash_serveurs/${relPath}`;
            const fileRes = await fetch(rawFileUrl);
            if (fileRes.ok) {
              const buffer = await fileRes.arrayBuffer();
              const fileName = relPath.split('/').pop();
              const parsed = FlashParser.parseWorkbook(buffer, fileName);
              if (parsed && parsed.date && parsed.yearMonth >= MIN_TRACKING_MONTH) {
                AppState.sessions.set(parsed.date, parsed);
                AppState.availableMonths.add(parsed.yearMonth);
                filesLoaded++;
              }
            }
          }
        }
      }
    } catch (e) {
      console.log("GitHub sync note :", e);
    }

    if (filesLoaded > 0) {
      saveSessionsToCache();
      initMonthSelector();
      updateUI();
      if (manual) showToast(`✅ ${filesLoaded} fichier(s) Flash synchronisé(s) !`);
    } else if (manual) {
      showToast("ℹ️ Données déjà à jour.");
    }

    if (btnSync && manual) {
      btnSync.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Synchroniser GitHub';
      btnSync.disabled = false;
    }
  }

  /**
   * Traite les fichiers Excel glissés-déposés par l'utilisateur
   */
  async function handleIncomingFiles(fileList) {
    let successCount = 0;
    const progressEl = document.getElementById('dropzone-text');
    if (progressEl) progressEl.innerText = `Lecture de ${fileList.length} fichier(s)...`;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.name.toLowerCase().endsWith('.xls') && !file.name.toLowerCase().endsWith('.xlsx')) continue;

      try {
        const buffer = await file.arrayBuffer();
        const parsed = FlashParser.parseWorkbook(buffer, file.name);
        if (parsed && parsed.date && parsed.yearMonth >= MIN_TRACKING_MONTH) {
          AppState.sessions.set(parsed.date, parsed);
          AppState.availableMonths.add(parsed.yearMonth);
          successCount++;
        }
      } catch (err) {
        console.error(`Erreur sur ${file.name} :`, err);
      }
    }

    if (progressEl) progressEl.innerText = `Glissez-déposez vos fichiers Flash Journée (.xls / .xlsx) ici`;

    if (successCount > 0) {
      saveSessionsToCache();
      initMonthSelector();
      updateUI();
      showToast(`🎉 ${successCount} fichier(s) Flash importé(s) avec succès !`);
    } else {
      showToast("❌ Aucun fichier Excel valide n'a pu être lu.", true);
    }
  }

  // ==============================================================================
  // CALCULS STATISTIQUES (MOIS OU CUMUL DES MOIS)
  // ==============================================================================
  function calculateMonthStats(period) {
    const isCumul = (period === 'ALL');
    const serverTotals = new Map(); // serverId => { server, totalNet, daysWorked, daysDetails: [] }
    let periodTotalNet = 0;
    let daysWithData = 0;
    let bestDay = { date: null, totalNet: 0, server: null, serverAmount: 0 };

    for (const [date, session] of AppState.sessions.entries()) {
      const ym = session.yearMonth || date.slice(0, 7);

      // Filtrer strictement : début de calcul Août 2026
      if (ym < MIN_TRACKING_MONTH) continue;

      // Si mode mensuel spécifique, filtrer par ce mois
      if (!isCumul && ym !== period) continue;

      daysWithData++;
      let dayTotal = 0;

      session.servers.forEach(item => {
        const s = item.server;
        if (!s || s.id === 'QUASSIR_HICHAM') return;
        const raw = String(item.rawName || "").toLowerCase();
        if (raw.includes('quassir') || raw.includes('hicham')) return;

        const sId = s.id;
        if (!serverTotals.has(sId)) {
          serverTotals.set(sId, {
            server: s,
            totalNet: 0,
            daysWorked: 0,
            ticketsTotal: 0,
            daysMap: new Map()
          });
        }

        const current = serverTotals.get(sId);
        current.totalNet += item.totalNet || 0;
        current.daysWorked += 1;
        current.ticketsTotal += item.tickets || 0;
        current.daysMap.set(date, item.totalNet || 0);

        dayTotal += item.totalNet || 0;

        if ((item.totalNet || 0) > bestDay.serverAmount) {
          bestDay.serverAmount = item.totalNet || 0;
          bestDay.server = s;
          bestDay.date = date;
        }
      });

      periodTotalNet += dayTotal;
      if (dayTotal > bestDay.totalNet) {
        bestDay.totalNet = dayTotal;
      }
    }

    // Conversion en tableau ordonné
    const serversRanked = Array.from(serverTotals.values())
      .map(entry => {
        const net = Math.round(entry.totalNet * 100) / 100;
        const avg = entry.daysWorked > 0 ? Math.round((net / entry.daysWorked) * 100) / 100 : 0;
        const share = periodTotalNet > 0 ? Math.round((net / periodTotalNet) * 1000) / 10 : 0;
        return {
          server: entry.server,
          totalNet: net,
          daysWorked: entry.daysWorked,
          dailyAverage: avg,
          sharePercent: share,
          ticketsTotal: entry.ticketsTotal,
          daysMap: entry.daysMap
        };
      })
      .sort((a, b) => b.totalNet - a.totalNet);

    return {
      period,
      isCumul,
      monthTotalNet: Math.round(periodTotalNet * 100) / 100,
      daysWithData,
      bestDay,
      serversRanked
    };
  }

  /**
   * Synthèse Multi-Mois & Performance Cumulée de chaque serveur
   */
  function calculateMultiMonthSummary() {
    // Liste des mois >= MIN_TRACKING_MONTH ordonnés chronologiquement
    const months = Array.from(AppState.availableMonths)
      .filter(m => m >= MIN_TRACKING_MONTH)
      .sort();

    if (months.length === 0) {
      months.push('2026-08', '2026-09', '2026-10');
    }

    const monthTotals = new Map();
    months.forEach(m => monthTotals.set(m, { totalNet: 0, daysCount: 0, topServerId: null, topAmount: 0 }));

    const serverMap = new Map();

    for (const [date, session] of AppState.sessions.entries()) {
      const ym = session.yearMonth || date.slice(0, 7);
      if (ym < MIN_TRACKING_MONTH) continue;

      if (!monthTotals.has(ym)) {
        monthTotals.set(ym, { totalNet: 0, daysCount: 0, topServerId: null, topAmount: 0 });
      }
      const mStat = monthTotals.get(ym);
      mStat.daysCount += 1;

      session.servers.forEach(item => {
        const s = item.server;
        if (!s || s.id === 'QUASSIR_HICHAM') return;
        const raw = String(item.rawName || "").toLowerCase();
        if (raw.includes('quassir') || raw.includes('hicham')) return;
        const sid = s.id;

        if (!serverMap.has(sid)) {
          serverMap.set(sid, {
            server: s,
            byMonth: {},
            cumulNet: 0,
            cumulDays: 0
          });
        }

        const sData = serverMap.get(sid);
        if (!sData.byMonth[ym]) {
          sData.byMonth[ym] = { totalNet: 0, daysWorked: 0 };
        }

        const net = item.totalNet || 0;
        sData.byMonth[ym].totalNet += net;
        sData.byMonth[ym].daysWorked += 1;
        sData.cumulNet += net;
        sData.cumulDays += 1;

        mStat.totalNet += net;
      });
    }

    // Identifier le serveur leader de chaque mois
    months.forEach(ym => {
      let topSid = null;
      let topAmt = 0;
      serverMap.forEach((sData, sid) => {
        const mInfo = sData.byMonth[ym];
        if (mInfo && mInfo.totalNet > topAmt) {
          topAmt = mInfo.totalNet;
          topSid = sid;
        }
      });
      const mStat = monthTotals.get(ym);
      if (mStat) {
        mStat.topServerId = topSid;
        mStat.topAmount = topAmt;
      }
    });

    let globalTeamNet = 0;
    let globalTeamDays = 0;
    monthTotals.forEach(mStat => {
      globalTeamNet += mStat.totalNet;
      globalTeamDays += mStat.daysCount;
    });

    // Ordonner les serveurs par cumulNet décroissant
    const serversRanked = Array.from(serverMap.values())
      .map(entry => {
        const net = Math.round(entry.cumulNet * 100) / 100;
        const avg = entry.cumulDays > 0 ? Math.round((net / entry.cumulDays) * 100) / 100 : 0;
        const share = globalTeamNet > 0 ? Math.round((net / globalTeamNet) * 1000) / 10 : 0;
        return {
          server: entry.server,
          byMonth: entry.byMonth,
          cumulNet: net,
          cumulDays: entry.cumulDays,
          dailyAverage: avg,
          sharePercent: share
        };
      })
      .sort((a, b) => b.cumulNet - a.cumulNet);

    return {
      months,
      monthTotals,
      globalTeamNet: Math.round(globalTeamNet * 100) / 100,
      globalTeamDays,
      serversRanked
    };
  }

  // ==============================================================================
  // RENDU INTERFACE UTILISATEUR
  // ==============================================================================
  function updateUI() {
    const stats = calculateMonthStats(AppState.selectedMonth);

    renderKPICards(stats);
    renderPodium(stats);
    renderMultiMonthSummary();
    renderLeaderboard(stats);
    renderChart(stats);
  }

  function renderKPICards(stats) {
    const elTotal = document.getElementById('kpi-total-ca');
    const elBest = document.getElementById('kpi-best-server');
    const elDays = document.getElementById('kpi-days-count');
    const elAvg = document.getElementById('kpi-daily-avg');

    const lblTotal = document.getElementById('kpi-total-label');
    const subTotal = document.getElementById('kpi-total-sub');
    const lblBest = document.getElementById('kpi-best-label');
    const subDays = document.getElementById('kpi-days-sub');

    if (lblTotal) {
      lblTotal.innerText = stats.isCumul ? "Recette Totale Cumulée" : "Recette Totale Salle";
    }
    if (subTotal) {
      subTotal.innerText = stats.isCumul ? "Total Net cumulé (Août — Octobre)" : "Total Net du mois sélectionné";
    }
    if (lblBest) {
      lblBest.innerText = stats.isCumul ? "Meilleur Serveur au Cumul" : "Meilleur Serveur du Mois";
    }
    if (subDays) {
      subDays.innerText = stats.isCumul ? "Jours analysés (depuis Août 2026)" : "Fichiers Flash Journée analysés";
    }

    if (elTotal) elTotal.innerText = formatDH(stats.monthTotalNet);
    if (elDays) elDays.innerText = `${stats.daysWithData} j`;

    if (elBest) {
      if (stats.serversRanked.length > 0) {
        const top = stats.serversRanked[0];
        elBest.innerText = top.server.displayName || top.server.name;
        const sub = document.getElementById('kpi-best-sub');
        if (sub) sub.innerText = `${formatDH(top.totalNet)} (${top.sharePercent}%)`;
      } else {
        elBest.innerText = "—";
        const sub = document.getElementById('kpi-best-sub');
        if (sub) sub.innerText = "Aucune donnée";
      }
    }

    if (elAvg) {
      const avg = stats.daysWithData > 0 ? Math.round(stats.monthTotalNet / stats.daysWithData) : 0;
      elAvg.innerText = formatDH(avg);
    }
  }

  function renderPodium(stats) {
    const podiumEl = document.getElementById('podium-wrapper');
    const titleEl = document.getElementById('podium-title');
    const subtitleEl = document.getElementById('podium-subtitle');

    if (titleEl) {
      if (stats.isCumul) {
        titleEl.innerHTML = `<i class="fa-solid fa-trophy" style="color: var(--gold);"></i> Podium Général Cumulé`;
      } else {
        titleEl.innerHTML = `<i class="fa-solid fa-trophy" style="color: var(--gold);"></i> Podium Mensuel des Performances (${getMonthFullLabel(stats.period)})`;
      }
    }

    if (subtitleEl) {
      if (stats.isCumul) {
        subtitleEl.innerText = `Classement d'honneur au cumul de tous les mois depuis le début du calcul (Août 2026).`;
      } else {
        subtitleEl.innerText = `Classement d'honneur des serveurs Grey Corner ayant réalisé la plus forte recette pour ce mois.`;
      }
    }

    if (!podiumEl) return;

    if (stats.serversRanked.length === 0) {
      podiumEl.innerHTML = `
        <div class="podium-step" style="grid-column: 1 / -1; padding: 48px; border-style: dashed;">
          <div style="font-size: 38px; margin-bottom: 12px; opacity: 0.6;">📊</div>
          <div style="font-family: var(--font-serif); font-size: 20px; color: var(--gold-light);">Aucune donnée pour cette période</div>
          <div style="font-size: 13px; color: var(--text-dim); margin-top: 6px;">Glissez vos fichiers Flash Journée ci-dessous pour générer le podium.</div>
        </div>
      `;
      return;
    }

    const first = stats.serversRanked[0];
    const second = stats.serversRanked.length > 1 ? stats.serversRanked[1] : null;
    const third = stats.serversRanked.length > 2 ? stats.serversRanked[2] : null;

    let html = '';

    // 2ème Place (Argent)
    if (second) {
      html += renderPodiumStep(second, 2, 'second', 'rank-silver', '🥈');
    } else {
      html += '<div class="podium-step podium-second" style="opacity:0.3;">En attente de données...</div>';
    }

    // 1ère Place (Or)
    html += renderPodiumStep(first, 1, 'first', 'rank-gold', '🥇');

    // 3ème Place (Bronze)
    if (third) {
      html += renderPodiumStep(third, 3, 'third', 'rank-bronze', '🥉');
    } else {
      html += '<div class="podium-step podium-third" style="opacity:0.3;">En attente de données...</div>';
    }

    podiumEl.innerHTML = html;

    // Attacher les clics pour voir les détails
    podiumEl.querySelectorAll('.podium-step').forEach(card => {
      const sId = card.getAttribute('data-server-id');
      if (sId) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => openServerModal(sId, stats));
      }
    });
  }

  function renderPodiumStep(entry, rank, stepClass, rankClass, medal) {
    const s = entry.server;
    const isFirst = rank === 1;

    const avatarHtml = s.photo
      ? `<img src="${s.photo}" alt="${s.displayName}" class="avatar-img" onerror="this.onerror=null; this.src='images/LOGO.jpg';" />`
      : `<div class="avatar-initials">${getInitials(s.name)}</div>`;

    return `
      <div class="podium-step podium-${stepClass}" data-server-id="${s.id}">
        ${isFirst ? '<div class="crown-badge">👑 Leader des Ventes</div>' : ''}
        <div class="podium-rank ${rankClass}">${medal} ${rank}</div>
        <div class="avatar-wrapper">
          ${avatarHtml}
        </div>
        <div class="server-name">${s.displayName || s.name}</div>
        <div class="server-role">${s.role} · ${entry.sharePercent}% de part</div>
        
        <div class="server-metric-box">
          <div class="metric-amount">${formatDH(entry.totalNet)}</div>
          <div class="metric-label">Recette Nette Réalisée</div>
        </div>

        <div class="server-stats-mini">
          <div><strong>${entry.daysWorked}</strong> j travaillés</div>
          <div><strong>${formatDH(entry.dailyAverage)}</strong> / jour</div>
        </div>
      </div>
    `;
  }

  /**
   * Rendu de la Matrice Multi-Mois et Cumul des Performances
   */
  function renderMultiMonthSummary() {
    const summary = calculateMultiMonthSummary();
    const thead = document.getElementById('cumul-table-thead');
    const tbody = document.getElementById('cumul-table-tbody');
    const tfoot = document.getElementById('cumul-table-tfoot');
    const mobileCards = document.getElementById('cumul-cards-mobile');
    const badge = document.getElementById('cumul-total-badge');
    const periodLabel = document.getElementById('cumul-period-label');

    if (badge) badge.innerText = formatDH(summary.globalTeamNet);

    // Mise à jour dynamique du libellé de période cumulée (ex: Août — Octobre)
    if (periodLabel && summary.months.length > 0) {
      const firstLabel = getShortMonthLabel(summary.months[0]);
      const lastLabel = getShortMonthLabel(summary.months[summary.months.length - 1]);
      periodLabel.innerText = `Recette Totale Cumulée (${firstLabel} — ${lastLabel})`;
    }

    // POINT 1 : Rendu 100% dynamique des en-têtes thead (supporte automatiquement Novembre, Décembre, etc.)
    if (thead) {
      const monthHeadersHtml = summary.months.map(ym => {
        return `<th style="text-align: right;">${getMonthFullLabel(ym)}</th>`;
      }).join('');

      thead.innerHTML = `
        <tr>
          <th style="width: 45px; text-align: center;">Rang</th>
          <th class="sticky-col">Serveur</th>
          ${monthHeadersHtml}
          <th style="text-align: right; color: var(--gold-light);">Total Cumulé</th>
          <th style="text-align: center;">Part Globale</th>
          <th style="text-align: right;">Moyenne/J</th>
          <th style="text-align: center;">Jours</th>
        </tr>
      `;
    }

    if (tbody) {
      if (summary.serversRanked.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${4 + summary.months.length}" style="text-align:center; padding: 24px; color: var(--text-dim);">Aucune donnée cumulée disponible.</td></tr>`;
      } else {
        tbody.innerHTML = summary.serversRanked.map((entry, idx) => {
          const s = entry.server;
          const rank = idx + 1;
          let medal = rank;
          if (rank === 1) medal = '🥇';
          else if (rank === 2) medal = '🥈';
          else if (rank === 3) medal = '🥉';

          const avatarHtml = s.photo
            ? `<img src="${s.photo}" alt="${s.displayName}" class="table-avatar" onerror="this.onerror=null; this.src='images/LOGO.jpg';" />`
            : `<div class="table-avatar-init">${getInitials(s.name)}</div>`;

          // Colonnes pour chaque mois
          const monthCellsHtml = summary.months.map(ym => {
            const mData = entry.byMonth[ym] || { totalNet: 0, daysWorked: 0 };
            const isWinner = summary.monthTotals.get(ym)?.topServerId === s.id;
            return `
              <td style="text-align: right;">
                <div class="month-cell-box">
                  <div class="month-cell-amt">
                    ${formatDH(mData.totalNet)}
                    ${isWinner ? '<span class="month-winner-badge" title="Meilleur serveur de ce mois">⭐</span>' : ''}
                  </div>
                  <div class="month-cell-meta">${mData.daysWorked} j</div>
                </div>
              </td>
            `;
          }).join('');

          return `
            <tr style="cursor: pointer;" onclick="window.GC_App_OpenModal('${s.id}')">
              <td style="text-align: center;" class="table-rank">${medal}</td>
              <td class="sticky-col">
                <div class="table-server-cell">
                  ${avatarHtml}
                  <div>
                    <div style="font-weight: 700; color: var(--text);">${s.displayName || s.name}</div>
                    <div style="font-size: 11px; color: var(--text-dim);">${s.role}</div>
                  </div>
                </div>
              </td>
              ${monthCellsHtml}
              <td style="text-align: right;">
                <span class="table-amount" style="color: var(--gold-light); font-size: 16px;">${formatDH(entry.cumulNet)}</span>
              </td>
              <td style="text-align: center; font-weight: 700; color: var(--gold);">${entry.sharePercent}%</td>
              <td style="text-align: right; color: var(--text-muted);">${formatDH(entry.dailyAverage)}</td>
              <td style="text-align: center;">${entry.cumulDays} j</td>
            </tr>
          `;
        }).join('');
      }
    }

    if (tfoot) {
      const monthTotalsHtml = summary.months.map(ym => {
        const mInfo = summary.monthTotals.get(ym) || { totalNet: 0, daysCount: 0 };
        return `
          <td style="text-align: right;">
            <div class="month-cell-box">
              <div class="month-cell-amt" style="color: var(--gold-light); font-size: 14px;">${formatDH(mInfo.totalNet)}</div>
              <div class="month-cell-meta">${mInfo.daysCount} j</div>
            </div>
          </td>
        `;
      }).join('');

      tfoot.innerHTML = `
        <tr>
          <td style="text-align: center;">∑</td>
          <td class="sticky-col" style="font-weight: 700; color: var(--gold-light);">Total Équipe Salle</td>
          ${monthTotalsHtml}
          <td style="text-align: right; color: var(--gold); font-size: 17px;">${formatDH(summary.globalTeamNet)}</td>
          <td style="text-align: center; color: var(--gold);">100%</td>
          <td style="text-align: right; color: var(--gold-light);">${formatDH(summary.globalTeamDays > 0 ? Math.round(summary.globalTeamNet / summary.globalTeamDays) : 0)}</td>
          <td style="text-align: center;">${summary.globalTeamDays} j</td>
        </tr>
      `;
    }

    // Rendu Cartes Mobiles pour smartphones
    if (mobileCards) {
      if (summary.serversRanked.length === 0) {
        mobileCards.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 16px;">Aucune donnée.</div>`;
      } else {
        mobileCards.innerHTML = summary.serversRanked.map((entry, idx) => {
          const s = entry.server;
          const rank = idx + 1;
          let medal = rank;
          if (rank === 1) medal = '🥇';
          else if (rank === 2) medal = '🥈';
          else if (rank === 3) medal = '🥉';

          const avatarHtml = s.photo
            ? `<img src="${s.photo}" alt="${s.displayName}" class="table-avatar" style="width: 36px; height: 36px;" onerror="this.onerror=null; this.src='images/LOGO.jpg';" />`
            : `<div class="table-avatar-init" style="width: 36px; height: 36px; font-size: 13px;">${getInitials(s.name)}</div>`;

          const mGridHtml = summary.months.map(ym => {
            const mData = entry.byMonth[ym] || { totalNet: 0, daysWorked: 0 };
            const isWinner = summary.monthTotals.get(ym)?.topServerId === s.id;
            const mLabel = getShortMonthLabel(ym);
            return `
              <div class="cumul-card-month-cell">
                <div class="cumul-card-month-name">${mLabel} ${isWinner ? '⭐' : ''}</div>
                <div class="cumul-card-month-val">${formatDH(mData.totalNet)}</div>
                <div class="cumul-card-month-days">${mData.daysWorked} j</div>
              </div>
            `;
          }).join('');

          return `
            <div class="cumul-card-item" onclick="window.GC_App_OpenModal('${s.id}')">
              <div class="cumul-card-head">
                <div class="cumul-card-server">
                  <span style="font-size: 16px; font-weight: 700; width: 22px;">${medal}</span>
                  ${avatarHtml}
                  <div>
                    <div style="font-weight: 700; font-size: 14px; color: var(--text);">${s.displayName || s.name}</div>
                    <div style="font-size: 11px; color: var(--text-dim);">${s.role}</div>
                  </div>
                </div>
                <div class="cumul-card-total">
                  <div class="cumul-card-total-val">${formatDH(entry.cumulNet)}</div>
                  <div style="font-size: 10.5px; color: var(--gold); font-weight: 700;">${entry.sharePercent}% du C.A.</div>
                </div>
              </div>

              <div class="cumul-card-months-grid">
                ${mGridHtml}
              </div>

              <div class="cumul-card-foot">
                <span>Présence : <strong>${entry.cumulDays} jours</strong></span>
                <span>Moyenne : <strong>${formatDH(entry.dailyAverage)} / j</strong></span>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  function renderLeaderboard(stats) {
    const tbody = document.getElementById('leaderboard-tbody');
    const titleEl = document.getElementById('leaderboard-title');
    const subtitleEl = document.getElementById('leaderboard-subtitle');

    if (titleEl) {
      if (stats.isCumul) {
        titleEl.innerText = "Classement Général Cumulé (Depuis Août 2026)";
      } else {
        titleEl.innerText = `Classement des Serveurs (${getMonthFullLabel(stats.period)})`;
      }
    }

    if (subtitleEl) {
      subtitleEl.innerText = stats.isCumul
        ? "Total cumulé de tous les mois analysés. Cliquez sur un serveur pour ouvrir sa fiche détaillée."
        : "Cliquez sur un serveur pour ouvrir sa fiche détaillée et son historique quotidien.";
    }

    if (!tbody) return;

    if (stats.serversRanked.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 32px; color: var(--text-dim);">Aucun serveur répertorié pour cette période.</td></tr>`;
      return;
    }

    const maxNet = stats.serversRanked[0].totalNet || 1;

    tbody.innerHTML = stats.serversRanked.map((entry, idx) => {
      const s = entry.server;
      const rank = idx + 1;
      const progressWidth = Math.min(100, Math.round((entry.totalNet / maxNet) * 100));

      const avatarHtml = s.photo
        ? `<img src="${s.photo}" alt="${s.displayName}" class="table-avatar" onerror="this.onerror=null; this.src='images/LOGO.jpg';" />`
        : `<div class="table-avatar-init">${getInitials(s.name)}</div>`;

      let medalIcon = rank;
      if (rank === 1) medalIcon = '🥇';
      else if (rank === 2) medalIcon = '🥈';
      else if (rank === 3) medalIcon = '🥉';

      return `
        <tr style="cursor: pointer;" onclick="window.GC_App_OpenModal('${s.id}')">
          <td class="table-rank">${medalIcon}</td>
          <td>
            <div class="table-server-cell">
              ${avatarHtml}
              <div>
                <div style="font-weight: 700; color: var(--text);">${s.displayName || s.name}</div>
                <div style="font-size: 11px; color: var(--text-dim);">${s.role}</div>
                <div class="mobile-meta-sub">${entry.daysWorked} j · ${formatDH(entry.dailyAverage)}/j · ${entry.sharePercent}%</div>
              </div>
            </div>
          </td>
          <td>
            <div class="table-amount">${formatDH(entry.totalNet)}</div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${progressWidth}%;"></div>
            </div>
          </td>
          <td style="font-weight: 600; color: var(--gold);">${entry.sharePercent}%</td>
          <td>${entry.daysWorked} jours</td>
          <td style="color: var(--text-muted);">${formatDH(entry.dailyAverage)}</td>
        </tr>
      `;
    }).join('');
  }

  // ==============================================================================
  // GRAPHIQUE COMPARATIF (Chart.js)
  // ==============================================================================
  function renderChart(stats) {
    const canvas = document.getElementById('chart-servers');
    if (!canvas || typeof Chart === 'undefined' || !canvas.getContext) return;

    if (AppState.chartInstance) {
      AppState.chartInstance.destroy();
    }

    if (stats.serversRanked.length === 0) return;

    const labels = stats.serversRanked.map(e => e.server.displayName || e.server.name);
    const data = stats.serversRanked.map(e => e.totalNet);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tickColor = isDark ? 'rgba(255, 255, 255, 0.75)' : '#334155';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.07)';

    const ctx = canvas.getContext('2d');
    AppState.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Recette Totale (DH)',
          data: data,
          backgroundColor: labels.map((_, i) => i === 0 ? (isDark ? 'rgba(201, 169, 110, 0.85)' : 'rgba(166, 124, 51, 0.85)') : (isDark ? 'rgba(201, 169, 110, 0.35)' : 'rgba(166, 124, 51, 0.35)')),
          borderColor: isDark ? 'rgba(201, 169, 110, 1)' : 'rgba(166, 124, 51, 1)',
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Recette : ${formatDH(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: tickColor,
              font: { family: 'DM Sans', size: 11, weight: '500' },
              maxRotation: 45,
              minRotation: 0
            },
            grid: { display: false }
          },
          y: {
            ticks: {
              color: tickColor,
              font: { family: 'DM Sans', size: 11 },
              callback: (v) => v >= 1000 ? `${Math.round(v / 1000)}k` : v
            },
            grid: { color: gridColor }
          }
        }
      }
    });
  }

  // ==============================================================================
  // MODAL INDIVIDUEL SERVEUR
  // ==============================================================================
  window.GC_App_OpenModal = function (serverId) {
    const stats = calculateMonthStats(AppState.selectedMonth);
    openServerModal(serverId, stats);
  };

  function openServerModal(serverId, stats) {
    // Calculer aussi la synthèse multi-mois pour enrichir la modale
    const summary = calculateMultiMonthSummary();
    const serverSummary = summary.serversRanked.find(e => e.server.id === serverId);

    const entry = stats.serversRanked.find(e => e.server.id === serverId) || serverSummary;
    if (!entry) return;

    const s = entry.server;
    const modalOverlay = document.getElementById('modal-overlay');
    const modalBody = document.getElementById('modal-body-content');
    if (!modalOverlay || !modalBody) return;

    const avatarHtml = s.photo
      ? `<img src="${s.photo}" alt="${s.displayName}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold);" onerror="this.onerror=null; this.src='images/LOGO.jpg';" />`
      : `<div style="width: 72px; height: 72px; border-radius: 50%; background: var(--surface-3); border: 2px solid var(--gold); display: flex; align-items: center; justify-content: center; font-family: var(--font-serif); font-size: 24px; color: var(--gold);">${getInitials(s.name)}</div>`;

    // Trouver le meilleur jour personnel (sur l'historique complet)
    let bestDayDate = null;
    let bestDayAmount = 0;
    if (entry.daysMap) {
      entry.daysMap.forEach((amt, d) => {
        if (amt > bestDayAmount) {
          bestDayAmount = amt;
          bestDayDate = d;
        }
      });
    }

    // Puces d'historique multi-mois
    let monthsPillsHtml = '';
    if (serverSummary) {
      monthsPillsHtml = summary.months.map(ym => {
        const mData = serverSummary.byMonth[ym] || { totalNet: 0, daysWorked: 0 };
        return `
          <div class="modal-month-pill">
            <div class="modal-month-name">${getShortMonthLabel(ym)}</div>
            <div class="modal-month-amount">${formatDH(mData.totalNet)}</div>
            <div class="modal-month-meta">${mData.daysWorked} j travaillés</div>
          </div>
        `;
      }).join('');

      // Ajouter le pill Cumul
      monthsPillsHtml += `
        <div class="modal-month-pill highlight">
          <div class="modal-month-name" style="color: var(--gold);">Total Cumulé</div>
          <div class="modal-month-amount">${formatDH(serverSummary.cumulNet)}</div>
          <div class="modal-month-meta" style="color: var(--gold);">${serverSummary.cumulDays} j (${serverSummary.sharePercent}%)</div>
        </div>
      `;
    }

    modalBody.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 22px;">
        ${avatarHtml}
        <div>
          <div style="font-family: var(--font-serif); font-size: 26px; font-weight: 700; color: var(--gold-light); line-height: 1.1;">${s.displayName || s.name}</div>
          <div style="font-size: 12px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px;">${s.role} · Restaurant Grey Corner</div>
        </div>
      </div>

      <div style="font-size: 12px; font-weight: 700; color: var(--gold); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">
        Performance par mois & Cumul
      </div>
      <div class="modal-months-row">
        ${monthsPillsHtml}
      </div>

      <div style="font-size: 13px; font-weight: 700; color: var(--gold); margin-bottom: 10px;">
        📈 Évolution des ventes (DH Net par jour)
      </div>
      <div style="height: 180px; width: 100%; position: relative; margin-bottom: 20px;">
        <canvas id="modal-server-chart"></canvas>
      </div>

      <div style="background: var(--surface-2); padding: 12px 16px; border-radius: 10px; font-size: 12px; color: var(--text-muted); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
        <span>🏆 Record personnel journalier : <strong style="color: var(--gold-light);">${formatDH(bestDayAmount)}</strong></span>
        <span>Date record : <strong>${bestDayDate || '—'}</strong></span>
      </div>
    `;

    modalOverlay.classList.add('active');

    // Graphique journalier individuel
    setTimeout(() => {
      const modalCanvas = document.getElementById('modal-server-chart');
      if (!modalCanvas) return;

      let dates = [];
      let amounts = [];

      if (entry.daysMap && entry.daysMap.size > 0) {
        dates = Array.from(entry.daysMap.keys()).sort();
        amounts = dates.map(d => entry.daysMap.get(d));
      }

      if (AppState.modalChartInstance) AppState.modalChartInstance.destroy();

      const mCtx = modalCanvas.getContext('2d');
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const mTickColor = isDark ? 'rgba(255,255,255,0.6)' : '#475569';
      const mGridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.08)';

      AppState.modalChartInstance = new Chart(mCtx, {
        type: 'line',
        data: {
          labels: dates.map(d => d.slice(5)), // MM-DD
          datasets: [{
            label: 'DH Net',
            data: amounts,
            borderColor: isDark ? '#C9A96E' : '#a67c33',
            backgroundColor: isDark ? 'rgba(201, 169, 110, 0.12)' : 'rgba(166, 124, 51, 0.12)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointBackgroundColor: isDark ? '#C9A96E' : '#a67c33',
            pointRadius: dates.length > 20 ? 2 : 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => dates[items[0].dataIndex],
                label: (ctx) => ` Vente : ${formatDH(ctx.raw)}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: mTickColor, font: { size: 10, weight: '500' }, maxRotation: 45 }
            },
            y: {
              grid: { color: mGridColor },
              ticks: { color: mTickColor, font: { size: 10 } }
            }
          }
        }
      });
    }, 50);
  }

  // ==============================================================================
  // OUTILS UTILITAIRES
  // ==============================================================================
  function formatDH(val) {
    if (!val && val !== 0) return '0 DH';
    return Number(val).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' DH';
  }

  function getInitials(name) {
    if (!name) return 'SR';
    const p = name.trim().split(' ');
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  }

  function showToast(msg, isError = false) {
    let t = document.getElementById('toast-msg');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast-msg';
      t.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: var(--surface-2);
        color: var(--text);
        padding: 12px 20px;
        border-radius: 12px;
        border: 1px solid var(--gold);
        box-shadow: var(--shadow);
        z-index: 10000;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(t);
    }
    t.style.borderColor = isError ? 'var(--danger)' : 'var(--gold)';
    t.innerHTML = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateY(0)';
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(10px)';
    }, 4000);
  }

})();
