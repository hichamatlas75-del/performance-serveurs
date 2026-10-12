/**
 * ==============================================================================
 * GREY CORNER — PERFORMANCE SERVEUR APPLICATION ENGINE
 * ==============================================================================
 */

(function () {
  'use strict';

  // État global de l'application
  const AppState = {
    selectedMonth: new Date().toISOString().slice(0, 7), // 'YYYY-MM'
    sessions: new Map(), // 'YYYY-MM-DD' => session object
    availableMonths: new Set(),
    chartInstance: null,
    modalChartInstance: null
  };

  const STORAGE_KEY = 'gc_flash_sessions_v1';

  // ==============================================================================
  // INITIALISATION
  // ==============================================================================
  document.addEventListener('DOMContentLoaded', () => {
    initMonthSelector();
    initEventListeners();
    loadCachedSessions();
    syncFromGitHub();
  });

  function initMonthSelector() {
    const select = document.getElementById('month-select');
    if (!select) return;

    // Générer la liste des mois depuis Avril 2026 jusqu'à Décembre 2026
    const months = [
      { key: '2026-10', label: 'Octobre 2026 (En cours)' },
      { key: '2026-09', label: 'Septembre 2026' },
      { key: '2026-08', label: 'Août 2026' },
      { key: '2026-07', label: 'Juillet 2026' },
      { key: '2026-06', label: 'Juin 2026' },
      { key: '2026-05', label: 'Mai 2026' },
      { key: '2026-04', label: 'Avril 2026' }
    ];

    select.innerHTML = months
      .map(m => `<option value="${m.key}" ${m.key === AppState.selectedMonth ? 'selected' : ''}>${m.label}</option>`)
      .join('');

    select.addEventListener('change', (e) => {
      AppState.selectedMonth = e.target.value;
      updateUI();
    });
  }

  function initEventListeners() {
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
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach(s => {
            if (s && s.date) {
              AppState.sessions.set(s.date, s);
              AppState.availableMonths.add(s.yearMonth || s.date.slice(0, 7));
            }
          });
        }
      }
    } catch (e) {
      console.warn("Erreur lecture cache local :", e);
    }
    updateUI();
  }

  function saveSessionsToCache() {
    try {
      const arr = Array.from(AppState.sessions.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      console.warn("Erreur sauvegarde cache local :", e);
    }
  }

  /**
   * Tente de synchroniser les fichiers depuis GitHub
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
                  // Re-résoudre les serveurs pour avoir les photos et alias à jour
                  if (Array.isArray(s.servers)) {
                    s.servers.forEach(item => {
                      if (item.rawName) {
                        item.server = findServerByRawName(item.rawName);
                      }
                    });
                  }
                  AppState.sessions.set(s.date, s);
                  AppState.availableMonths.add(s.yearMonth || s.date.slice(0, 7));
                  filesLoaded++;
                }
              });
              console.log(`⚡ [Summary] ${summaryData.length} sessions chargées instantanément depuis ${sUrl}`);
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
              if (parsed && parsed.date) {
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
      updateUI();
      if (manual) showToast(`✅ ${filesLoaded} fichier(s) Flash synchronisé(s) !`);
    } else if (manual) {
      showToast("ℹ️ Aucun nouveau fichier distant. Glissez vos fichiers Excel pour charger l'historique.");
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
        if (parsed && parsed.date) {
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
      updateUI();
      showToast(`🎉 ${successCount} fichier(s) Flash importé(s) avec succès !`);
    } else {
      showToast("❌ Aucun fichier Excel valide n'a pu être lu.", true);
    }
  }

  // ==============================================================================
  // CALCULS STATISTIQUES & CLASSEMENTS
  // ==============================================================================
  function calculateMonthStats(yearMonth) {
    const serverTotals = new Map(); // serverId => { server, totalNet, daysWorked, daysDetails: [] }
    let monthTotalNet = 0;
    let daysWithData = 0;
    let bestDay = { date: null, totalNet: 0, server: null, serverAmount: 0 };

    for (const [date, session] of AppState.sessions.entries()) {
      if (!session.yearMonth && date.slice(0, 7) !== yearMonth) continue;
      if (session.yearMonth && session.yearMonth !== yearMonth) continue;

      daysWithData++;
      let dayTotal = 0;

      session.servers.forEach(item => {
        const s = item.server;
        if (!s) return;

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

      monthTotalNet += dayTotal;
      if (dayTotal > bestDay.totalNet) {
        bestDay.totalNet = dayTotal;
      }
    }

    // Conversion en tableau ordonné
    const serversRanked = Array.from(serverTotals.values())
      .map(entry => {
        const net = Math.round(entry.totalNet * 100) / 100;
        const avg = entry.daysWorked > 0 ? Math.round((net / entry.daysWorked) * 100) / 100 : 0;
        const share = monthTotalNet > 0 ? Math.round((net / monthTotalNet) * 1000) / 10 : 0;
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
      yearMonth,
      monthTotalNet: Math.round(monthTotalNet * 100) / 100,
      daysWithData,
      bestDay,
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
    renderLeaderboard(stats);
    renderChart(stats);
  }

  function renderKPICards(stats) {
    const elTotal = document.getElementById('kpi-total-ca');
    const elBest = document.getElementById('kpi-best-server');
    const elDays = document.getElementById('kpi-days-count');
    const elAvg = document.getElementById('kpi-daily-avg');

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
    if (!podiumEl) return;

    if (stats.serversRanked.length === 0) {
      podiumEl.innerHTML = `
        <div class="podium-step" style="grid-column: 1 / -1; padding: 48px; border-style: dashed;">
          <div style="font-size: 38px; margin-bottom: 12px; opacity: 0.6;">📊</div>
          <div style="font-family: var(--font-serif); font-size: 20px; color: var(--gold-light);">Aucune donnée pour ce mois</div>
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
        ${isFirst ? '<div class="crown-badge">👑 Meilleur Serveur du Mois</div>' : ''}
        <div class="podium-rank ${rankClass}">${medal} ${rank}</div>
        <div class="avatar-wrapper">
          ${avatarHtml}
        </div>
        <div class="server-name">${s.displayName || s.name}</div>
        <div class="server-role">${s.role} · ${entry.sharePercent}% du C.A.</div>
        
        <div class="server-metric-box">
          <div class="metric-amount">${formatDH(entry.totalNet)}</div>
          <div class="metric-label">Recette Totale</div>
        </div>

        <div class="server-stats-mini">
          <div><strong>${entry.daysWorked}</strong> j travaillés</div>
          <div><strong>${formatDH(entry.dailyAverage)}</strong> / jour</div>
        </div>
      </div>
    `;
  }

  function renderLeaderboard(stats) {
    const tbody = document.getElementById('leaderboard-tbody');
    if (!tbody) return;

    if (stats.serversRanked.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 32px; color: var(--text-dim);">Aucun serveur répertorié pour ce mois.</td></tr>`;
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
    if (!canvas || typeof Chart === 'undefined') return;

    if (AppState.chartInstance) {
      AppState.chartInstance.destroy();
    }

    if (stats.serversRanked.length === 0) return;

    const labels = stats.serversRanked.map(e => e.server.displayName || e.server.name);
    const data = stats.serversRanked.map(e => e.totalNet);

    const ctx = canvas.getContext('2d');
    AppState.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Recette Totale (DH)',
          data: data,
          backgroundColor: labels.map((_, i) => i === 0 ? 'rgba(201, 169, 110, 0.85)' : 'rgba(201, 169, 110, 0.35)'),
          borderColor: 'rgba(201, 169, 110, 1)',
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
            ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { family: 'DM Sans', size: 11 } },
            grid: { display: false }
          },
          y: {
            ticks: { color: 'rgba(255, 255, 255, 0.4)', font: { family: 'DM Sans', size: 11 } },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
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
    const entry = stats.serversRanked.find(e => e.server.id === serverId);
    if (!entry) return;

    const s = entry.server;
    const modalOverlay = document.getElementById('modal-overlay');
    const modalBody = document.getElementById('modal-body-content');
    if (!modalOverlay || !modalBody) return;

    const avatarHtml = s.photo
      ? `<img src="${s.photo}" alt="${s.displayName}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold);" onerror="this.onerror=null; this.src='images/LOGO.jpg';" />`
      : `<div style="width: 72px; height: 72px; border-radius: 50%; background: var(--surface-3); border: 2px solid var(--gold); display: flex; align-items: center; justify-content: center; font-family: var(--font-serif); font-size: 24px; color: var(--gold);">${getInitials(s.name)}</div>`;

    // Trouver le meilleur jour personnel
    let bestDayDate = null;
    let bestDayAmount = 0;
    entry.daysMap.forEach((amt, d) => {
      if (amt > bestDayAmount) {
        bestDayAmount = amt;
        bestDayDate = d;
      }
    });

    modalBody.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
        ${avatarHtml}
        <div>
          <div style="font-family: var(--font-serif); font-size: 26px; font-weight: 700; color: var(--gold-light);">${s.displayName || s.name}</div>
          <div style="font-size: 12px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.1em;">${s.role} · Grey Corner</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
        <div style="background: var(--surface-2); padding: 14px; border-radius: 12px; border: 1px solid var(--border); text-align: center;">
          <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Total Mois</div>
          <div style="font-family: var(--font-serif); font-size: 22px; font-weight: 700; color: var(--gold);">${formatDH(entry.totalNet)}</div>
        </div>
        <div style="background: var(--surface-2); padding: 14px; border-radius: 12px; border: 1px solid var(--border); text-align: center;">
          <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Moyenne / Jour</div>
          <div style="font-family: var(--font-serif); font-size: 22px; font-weight: 700; color: var(--text);">${formatDH(entry.dailyAverage)}</div>
        </div>
        <div style="background: var(--surface-2); padding: 14px; border-radius: 12px; border: 1px solid var(--border); text-align: center;">
          <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Part de Marché</div>
          <div style="font-family: var(--font-serif); font-size: 22px; font-weight: 700; color: var(--success);">${entry.sharePercent}%</div>
        </div>
      </div>

      <div style="font-size: 13px; font-weight: 700; color: var(--gold); margin-bottom: 12px;">📈 Évolution journalière du mois</div>
      <div style="height: 180px; width: 100%; position: relative; margin-bottom: 20px;">
        <canvas id="modal-server-chart"></canvas>
      </div>

      <div style="background: var(--surface-2); padding: 12px 16px; border-radius: 10px; font-size: 12px; color: var(--text-muted); display: flex; justify-content: space-between;">
        <span>🏆 Record personnel : <strong>${formatDH(bestDayAmount)}</strong></span>
        <span>Date : <strong>${bestDayDate || '—'}</strong></span>
      </div>
    `;

    modalOverlay.classList.add('active');

    // Graphique journalier individuel
    setTimeout(() => {
      const modalCanvas = document.getElementById('modal-server-chart');
      if (!modalCanvas) return;

      const dates = Array.from(entry.daysMap.keys()).sort();
      const amounts = dates.map(d => entry.daysMap.get(d));

      if (AppState.modalChartInstance) AppState.modalChartInstance.destroy();

      const mCtx = modalCanvas.getContext('2d');
      AppState.modalChartInstance = new Chart(mCtx, {
        type: 'line',
        data: {
          labels: dates.map(d => d.slice(8)), // juste le numéro du jour
          datasets: [{
            label: 'DH Net',
            data: amounts,
            borderColor: '#C9A96E',
            backgroundColor: 'rgba(201, 169, 110, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointBackgroundColor: '#C9A96E'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } } }
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
