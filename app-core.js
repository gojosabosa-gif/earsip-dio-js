/**
 * E-ARSIP DIO - Frontend Core Module
 * Dependencies: api-client.js, app-init.js (loaded before this file)
 * Global Namespace: window.APP
 * Uses global: api (EarsipAPI instance)
 */

(function() {
  'use strict';

  window.APP = {};

  const _SK_TOKEN = 'earsip_token';
  const _SK_USER = 'earsip_user';

  APP._loadCount = 0;
  APP._confirmCallback = null;
  APP._currentPage = null;

  APP.pages = {
    'dashboard': { title: 'Dashboard', roles: null },
    'manajemen-arsip': { title: 'Manajemen Arsip', roles: null },
    'registrasi-arsip': { title: 'Registrasi Berkas', roles: null },
    'klasifikasi': { title: 'Klasifikasi & JRA', roles: ['SUPER_ADMIN', 'ADMIN'] },
    'manajemen-user': { title: 'Manajemen User', roles: ['SUPER_ADMIN', 'ADMIN'] },
    'jadwal-retensi': { title: 'Jadwal Retensi', roles: ['SUPER_ADMIN', 'ADMIN'] },
    'jejak-audit': { title: 'Jejak Audit', roles: ['SUPER_ADMIN', 'ADMIN'] },
    'laporan': { title: 'Laporan', roles: ['SUPER_ADMIN', 'ADMIN'] },
    'pengaturan': { title: 'Pengaturan', roles: ['SUPER_ADMIN'] }
  };

  APP.doLogin = function() {
    const username = (document.getElementById('login-username') || {}).value || '';
    const password = (document.getElementById('login-password') || {}).value || '';
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('btn-login');

    if (errorEl) errorEl.style.display = 'none';

    if (!username.trim() || !password) {
      if (errorEl) {
        errorEl.textContent = 'Username dan password wajib diisi.';
        errorEl.style.display = 'flex';
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>Memverifikasi…';
    }

    api.login(username.trim(), password)
      .then(result => {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Masuk Sistem';
        }

        APP.closeLogin();
        const pwd = document.getElementById('login-password');
        if (pwd) pwd.value = '';

        APP._startSession(result.token, result.user);
      })
      .catch(err => {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Masuk Sistem';
        }
        if (errorEl) {
          errorEl.textContent = err.message || 'Login gagal.';
          errorEl.style.display = 'flex';
        }
      });
  };

  APP.doLogout = function(silent) {
    if (silent) {
      APP._doLogoutImmediate();
      return;
    }
    APP.confirm({
      icon: '⎋',
      title: 'Keluar dari Sistem',
      msg: 'Sesi Anda akan diakhiri. Yakin ingin keluar?',
      okLabel: 'Keluar',
      okClass: 'btn-danger',
      cancelLabel: 'Batal'
    }).then(ok => {
      if (ok) APP._doLogoutImmediate();
    });
  };

  APP._doLogoutImmediate = function() {
    api.logout();

    APP._currentPage = null;
    APP._loadCount = 0;

    const pwd = document.getElementById('login-password');
    if (pwd) pwd.value = '';

    document.getElementById('landing').style.display = '';
    document.getElementById('app-shell').style.display = 'none';

    const pc = document.getElementById('page-content');
    if (pc) pc.innerHTML = '';

    APP.closeDrawer();
    APP.hideLoading();

    setTimeout(() => APP.openLogin(), 300);
  };

  APP._startSession = function(token, user) {
    const userJson = JSON.stringify(user);
    try { sessionStorage.setItem(_SK_TOKEN, token); } catch(e) {}
    try { sessionStorage.setItem(_SK_USER, userJson); } catch(e) {}
    try { localStorage.setItem(_SK_TOKEN, token); } catch(e) {}
    try { localStorage.setItem(_SK_USER, userJson); } catch(e) {}

    document.getElementById('landing').style.display = 'none';
    document.getElementById('app-shell').style.display = '';

    APP.navigate('dashboard');
  };

  APP.openLogin = function() {
    document.getElementById('modal-overlay').classList.add('visible');
    setTimeout(() => {
      const inp = document.getElementById('login-username');
      if (inp) inp.focus();
    }, 150);
  };

  APP.closeLogin = function() {
    document.getElementById('modal-overlay').classList.remove('visible');
    const err = document.getElementById('login-error');
    if (err) err.style.display = 'none';
  };

  APP.navigate = function(page, params) {
    const user = api.getUser();
    if (!user) return;

    const def = APP.pages[page];
    if (!def) {
      APP.toast('Halaman "' + page + '" tidak ditemukan.', 'warning');
      return;
    }

    if (def.roles && def.roles.indexOf(user.role) === -1) {
      APP.toast('Anda tidak memiliki akses ke halaman ini.', 'warning');
      return;
    }

    APP._currentPage = page;
    APP.closeDrawer();

    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    const navLink = document.querySelector(`[data-page="${page}"]`);
    if (navLink) navLink.classList.add('active');

    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = def.title;

    window.scrollTo(0, 0);
    const pc = document.getElementById('page-content');
    if (pc) pc.scrollTop = 0;

    switch(page) {
      case 'dashboard':
        APP.renderDashboard(params || {});
        break;
      case 'manajemen-arsip':
        if (window.PAGE_MANAJEMEN_ARSIP) PAGE_MANAJEMEN_ARSIP.render(params || {});
        break;
      case 'registrasi-arsip':
        if (window.PAGE_REGISTRASI_ARSIP) PAGE_REGISTRASI_ARSIP.render(params || {});
        break;
      case 'klasifikasi':
        if (window.PAGE_KLASIFIKASI) PAGE_KLASIFIKASI.render(params || {});
        break;
      case 'manajemen-user':
        if (window.PAGE_MANAJEMEN_USER) PAGE_MANAJEMEN_USER.render(params || {});
        break;
      case 'jadwal-retensi':
        if (window.PAGE_JADWAL_RETENSI) PAGE_JADWAL_RETENSI.render(params || {});
        break;
      case 'jejak-audit':
        if (window.PAGE_JEJAK_AUDIT) PAGE_JEJAK_AUDIT.render(params || {});
        break;
      case 'laporan':
        if (window.PAGE_LAPORAN) PAGE_LAPORAN.render(params || {});
        break;
      case 'pengaturan':
        if (window.PAGE_PENGATURAN) PAGE_PENGATURAN.render(params || {});
        break;
      default:
        pc.innerHTML = '<div class="alert alert-warning">Halaman belum tersedia.</div>';
    }
  };

  APP.renderDashboard = function(params) {
    const pc = document.getElementById('page-content');
    if (!pc) return;

    const user = api.getUser();
    const isAdmin = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');

    pc.innerHTML = APP._dashboardSkeleton(user);

    api.getDashboardStats()
      .then(data => {
        pc.innerHTML = APP._buildDashboardHtml(data, user);
        APP._initDashboardCharts(data);
      })
      .catch(err => {
        pc.innerHTML = '<div class="empty-state">' +
          '<div class="empty-state-icon">⚠️</div>' +
          '<div class="empty-state-title">Gagal memuat dashboard</div>' +
          '<div class="empty-state-desc">' + APP.escapeHtml(err.message) + '</div>' +
          '<div style="margin-top:16px"><button class="btn btn-secondary" ' +
          'onclick="APP.navigate(\'dashboard\')">Coba Lagi</button></div>' +
          '</div>';
      });
  };

  APP._dashboardSkeleton = function(user) {
    let skCards = '';
    for (let i = 0; i < 4; i++) {
      skCards += '<div class="stat-card">' +
        '<div class="skeleton" style="width:80px;height:10px;margin-bottom:12px"></div>' +
        '<div class="skeleton" style="width:50px;height:34px;margin-bottom:8px"></div>' +
        '<div class="skeleton" style="width:110px;height:10px"></div>' +
        '</div>';
    }

    return '<div class="page-header">' +
      '<div class="page-header-left">' +
        '<h1 class="page-title">Dashboard</h1>' +
        '<p class="page-subtitle">Selamat datang, ' + APP.escapeHtml(user ? user.fullname : '') + '</p>' +
      '</div>' +
      '</div>' +
      '<div class="stat-grid">' + skCards + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">' +
        '<div class="card"><div class="card-body"><div class="skeleton" style="height:200px"></div></div></div>' +
        '<div class="card"><div class="card-body"><div class="skeleton" style="height:200px"></div></div></div>' +
      '</div>';
  };

  APP._buildDashboardHtml = function(d, user) {
    const isAdmin = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');
    const esc = APP.escapeHtml;

    const hour = new Date().getHours();
    const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';

    let html = '';

    html += '<div class="page-header">' +
      '<div class="page-header-left">' +
        '<h1 class="page-title">Dashboard</h1>' +
        '<p class="page-subtitle">' + esc(greet) + ', <strong>' + esc(user ? user.fullname : '') + '</strong>' +
          (user && user.departemen ? ' · ' + esc(user.departemen) : '') + '</p>' +
      '</div>' +
      '<div class="page-header-actions">' +
        '<button class="btn btn-secondary btn-sm" onclick="APP.navigate(\'dashboard\')">' +
          '↻ Perbarui' +
        '</button>' +
        (isAdmin ? '<button class="btn btn-primary btn-sm" onclick="APP.navigate(\'registrasi-arsip\')">' +
          '+ Registrasi Berkas</button>' : '') +
      '</div>' +
    '</div>';

    html += '<div class="stat-grid">';

    html += APP._statCard({
      label: 'Total Berkas',
      value: d.total || 0,
      sub: 'Klik untuk lihat semua berkas',
      icon: '🗂',
      accentColor: 'var(--accent)',
      clickPage: 'manajemen-arsip'
    });

    html += APP._statCard({
      label: 'Arsip Aktif',
      value: d.aktif || 0,
      sub: 'Berkas siap pakai',
      icon: '⚡',
      accentColor: 'var(--success)',
      clickPage: 'manajemen-arsip'
    });

    html += APP._statCard({
      label: 'Arsip Inaktif',
      value: d.inaktif || 0,
      sub: 'Berkas disimpan',
      icon: '📦',
      accentColor: 'var(--warning)',
      clickPage: 'manajemen-arsip'
    });

    html += APP._statCard({
      label: 'Arsip Statis',
      value: d.statis || 0,
      sub: 'Berkas permanen',
      icon: '🏛',
      accentColor: 'var(--info)',
      clickPage: 'manajemen-arsip'
    });

    html += '</div>';

    html += '<div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:24px">';

    html += APP._statCard({
      label: 'Upload Bulan Ini',
      value: d.thisMonth || 0,
      sub: 'Berkas baru bulan ini',
      icon: '📤',
      accentColor: 'var(--accent)',
      small: true
    });

    if (isAdmin) {
      html += APP._statCard({
        label: 'Rahasia',
        value: (d.keamanan && d.keamanan.rahasia) || 0,
        sub: 'Klasifikasi rahasia',
        icon: '🔒',
        accentColor: 'var(--warning)',
        small: true
      });

      html += APP._statCard({
        label: 'Sangat Rahasia',
        value: (d.keamanan && d.keamanan.sgtRahasia) || 0,
        sub: 'Akses sangat terbatas',
        icon: '🔐',
        accentColor: 'var(--danger)',
        small: true
      });
    }

    html += APP._statCard({
      label: 'Internal',
      value: (d.keamanan && d.keamanan.internal) || 0,
      sub: 'Klasifikasi internal',
      icon: '🏢',
      accentColor: 'var(--info)',
      small: true
    });

    html += '</div>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">';

    html += '<div class="card">' +
      '<div class="card-header">' +
        '<span class="card-title">📈 Trend Upload 6 Bulan Terakhir</span>' +
      '</div>' +
      '<div class="card-body" style="padding:16px">' +
        '<canvas id="db-trend-chart" style="width:100%;height:220px"></canvas>' +
      '</div>' +
    '</div>';

    html += '<div class="card">' +
      '<div class="card-header">' +
        '<span class="card-title">📊 5 Klasifikasi Terbanyak</span>' +
      '</div>' +
      '<div class="card-body" style="padding:16px">' +
        '<canvas id="db-class-chart" style="width:100%;height:220px"></canvas>' +
      '</div>' +
    '</div>';

    html += '</div>';

    if (isAdmin) {
      html += '<div class="card" style="margin-bottom:20px">' +
        '<div class="card-header"><span class="card-title">⚡ Aksi Cepat</span></div>' +
        '<div class="card-body">' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">' +
            APP._quickAction('📋', 'Registrasi Berkas', 'registrasi-arsip') +
            APP._quickAction('🗂', 'Manajemen Arsip', 'manajemen-arsip') +
            APP._quickAction('🏷', 'Klasifikasi & JRA', 'klasifikasi') +
            APP._quickAction('⏰', 'Jadwal Retensi', 'jadwal-retensi') +
            APP._quickAction('📄', 'Laporan', 'laporan') +
            APP._quickAction('⚙️', 'Pengaturan', 'pengaturan') +
          '</div>' +
        '</div>' +
      '</div>';
    } else {
      html += '<div class="card" style="margin-bottom:20px">' +
        '<div class="card-header"><span class="card-title">⚡ Aksi Cepat</span></div>' +
        '<div class="card-body">' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">' +
            APP._quickAction('📋', 'Registrasi Berkas', 'registrasi-arsip') +
            APP._quickAction('🗂', 'Manajemen Arsip', 'manajemen-arsip') +
          '</div>' +
        '</div>' +
      '</div>';
    }

    html += '<div class="card">' +
      '<div class="card-header">' +
        '<span class="card-title">🕐 Aktivitas Terbaru</span>' +
        (isAdmin ? '<button class="btn btn-ghost btn-sm" onclick="APP.navigate(\'jejak-audit\')">Lihat Semua →</button>' : '') +
      '</div>';

    if (!d.recentActs || d.recentActs.length === 0) {
      html += '<div class="card-body">' +
        '<div class="empty-state">' +
          '<div class="empty-state-icon">📋</div>' +
          '<div class="empty-state-title">Belum ada aktivitas</div>' +
        '</div>' +
        '</div>';
    } else {
      html += '<div class="table-wrap"><table class="data-table">' +
        '<thead><tr>' +
          '<th>Waktu</th>' +
          '<th>Pengguna</th>' +
          '<th>Departemen</th>' +
          '<th>Aksi</th>' +
          '<th>Detail</th>' +
        '</tr></thead>' +
        '<tbody>';

      d.recentActs.forEach(act => {
        html += '<tr>' +
          '<td style="white-space:nowrap;font-size:12px;font-family:monospace;color:var(--text-muted)">' +
            esc(act.timestamp || '–') + '</td>' +
          '<td><strong>' + esc(act.fullname || '–') + '</strong></td>' +
          '<td><span class="badge badge-muted">' + esc(act.departemen || '–') + '</span></td>' +
          '<td>' + APP._aksiTag(act.aksi) + '</td>' +
          '<td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' +
              'color:var(--text-secondary);font-size:12px">' +
            esc(act.detail || '–') + '</td>' +
        '</tr>';
      });

      html += '</tbody></table></div>';
    }

    html += '</div>';

    return html;
  };

  APP._statCard = function(opts) {
    let clickAttr = '';
    if (opts.clickPage) {
      clickAttr = ' style="cursor:pointer" onclick="APP.navigate(\'' + opts.clickPage + '\')"';
    }

    const valueSize = opts.small ? '28px' : '36px';

    return '<div class="stat-card"' + clickAttr +
        ' style="--card-accent:' + (opts.accentColor || 'var(--accent)') + '">' +
      '<div class="stat-label">' + APP.escapeHtml(opts.label) + '</div>' +
      '<div class="stat-value" style="font-size:' + valueSize + '">' + (opts.value || 0) + '</div>' +
      '<div class="stat-sub">' + (opts.sub || '') + '</div>' +
      '<div class="stat-icon">' + (opts.icon || '📄') + '</div>' +
    '</div>';
  };

  APP._quickAction = function(icon, label, page) {
    return '<button class="btn btn-secondary" style="' +
        'display:flex;flex-direction:column;align-items:center;gap:8px;' +
        'padding:18px 12px;height:auto;border-radius:8px" ' +
        'onclick="APP.navigate(\'' + page + '\')">' +
      '<span style="font-size:24px">' + icon + '</span>' +
      '<span style="font-size:12px;font-weight:500">' + APP.escapeHtml(label) + '</span>' +
    '</button>';
  };

  APP._aksiTag = function(aksi) {
    const aksiStr = String(aksi || '');
    let cls = 'badge-muted';
    if (aksiStr.indexOf('LOGIN') !== -1) cls = 'badge-info';
    if (aksiStr.indexOf('ADD_') !== -1) cls = 'badge-success';
    if (aksiStr.indexOf('UPDATE_') !== -1) cls = 'badge-warning';
    if (aksiStr.indexOf('DELETE_') !== -1 || aksiStr.indexOf('DEACTIVATE') !== -1) cls = 'badge-danger';
    if (aksiStr.indexOf('EXPORT_') !== -1) cls = 'badge-accent';
    if (aksiStr.indexOf('RETENSI') !== -1) cls = 'badge-warning';
    if (aksiStr.indexOf('LOGOUT') !== -1) cls = 'badge-muted';

    return '<span class="badge ' + cls + '">' + APP.escapeHtml(aksiStr) + '</span>';
  };

  APP._initDashboardCharts = function(d) {
    if (typeof Chart === 'undefined') return;

    const accentGold = '#C9A84C';
    const accentSoft = 'rgba(201,168,76,0.15)';
    const textMuted = '#5A6478';
    const textSecondary = '#8B97AE';
    const gridColor = 'rgba(255,255,255,0.05)';

    const trendCanvas = document.getElementById('db-trend-chart');
    if (trendCanvas && d.trend && d.trend.length > 0) {
      const trendLabels = d.trend.map(t => t.label);
      const trendCounts = d.trend.map(t => t.count);

      new Chart(trendCanvas, {
        type: 'line',
        data: {
          labels: trendLabels,
          datasets: [{
            label: 'Upload Berkas',
            data: trendCounts,
            borderColor: accentGold,
            backgroundColor: accentSoft,
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: accentGold,
            pointBorderColor: accentGold,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1C2333',
              borderColor: 'rgba(255,255,255,0.07)',
              borderWidth: 1,
              titleColor: '#E8EDF5',
              bodyColor: '#8B97AE',
              padding: 10
            }
          },
          scales: {
            x: {
              grid: { color: gridColor, drawBorder: false },
              ticks: { color: textMuted, font: { size: 11 } }
            },
            y: {
              beginAtZero: true,
              grid: { color: gridColor, drawBorder: false },
              ticks: {
                color: textMuted,
                font: { size: 11 },
                stepSize: 1,
                callback: function(val) { return Number.isInteger(val) ? val : ''; }
              }
            }
          }
        }
      });
    }

    const classCanvas = document.getElementById('db-class-chart');
    if (classCanvas && d.topClass && d.topClass.length > 0) {
      const classLabels = d.topClass.map(c => c.kode);
      const classCounts = d.topClass.map(c => c.count);
      const barColors = [
        'rgba(201,168,76,0.8)',
        'rgba(56,139,253,0.8)',
        'rgba(46,160,67,0.8)',
        'rgba(210,153,34,0.8)',
        'rgba(218,54,51,0.8)'
      ];

      new Chart(classCanvas, {
        type: 'bar',
        data: {
          labels: classLabels,
          datasets: [{
            label: 'Jumlah Berkas',
            data: classCounts,
            backgroundColor: barColors,
            borderRadius: 4,
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1C2333',
              borderColor: 'rgba(255,255,255,0.07)',
              borderWidth: 1,
              titleColor: '#E8EDF5',
              bodyColor: '#8B97AE',
              padding: 10
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: gridColor, drawBorder: false },
              ticks: {
                color: textMuted,
                font: { size: 11 },
                stepSize: 1,
                callback: function(val) { return Number.isInteger(val) ? val : ''; }
              }
            },
            y: {
              grid: { display: false },
              ticks: { color: textSecondary, font: { size: 12 } }
            }
          }
        }
      });
    }
  };

  APP.toast = function(msg, type, title) {
    type = type || 'info';
    const defaultTitles = { success: 'Berhasil', danger: 'Gagal', warning: 'Perhatian', info: 'Info' };
    title = title || defaultTitles[type] || 'Info';

    const icons = { success: '✅', danger: '❌', warning: '⚠️', info: 'ℹ️' };

    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.innerHTML =
      '<div class="toast-icon">' + (icons[type] || 'ℹ️') + '</div>' +
      '<div class="toast-body">' +
        '<div class="toast-title">' + APP.escapeHtml(title) + '</div>' +
        '<div class="toast-msg">' + APP.escapeHtml(msg) + '</div>' +
      '</div>';

    const container = document.getElementById('toast-container');
    if (!container) return;
    container.appendChild(el);

    const dur = type === 'danger' ? 5000 : 3500;
    setTimeout(() => {
      el.classList.add('hide');
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }, dur);
  };

  APP.showLoading = function() {
    APP._loadCount++;
    const el = document.getElementById('loading-overlay');
    if (el) el.classList.add('visible');
  };

  APP.hideLoading = function() {
    APP._loadCount = Math.max(0, APP._loadCount - 1);
    if (APP._loadCount === 0) {
      const el = document.getElementById('loading-overlay');
      if (el) el.classList.remove('visible');
    }
  };

  APP.confirm = function(opts) {
    opts = opts || {};
    const modal = document.getElementById('confirm-modal');
    const iconEl = document.getElementById('confirm-icon');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-msg');
    const okBtn = document.getElementById('confirm-ok');
    const canBtn = document.getElementById('confirm-cancel');

    if (!modal) return Promise.resolve(false);

    if (iconEl) iconEl.innerHTML = opts.icon || '⚠️';
    if (titleEl) titleEl.textContent = opts.title || 'Konfirmasi';
    if (msgEl) msgEl.innerHTML = opts.msg || 'Apakah Anda yakin?';
    if (okBtn) {
      okBtn.textContent = opts.okLabel || 'Ya';
      okBtn.className = 'btn ' + (opts.okClass || 'btn-danger');
    }
    if (canBtn) canBtn.textContent = opts.cancelLabel || 'Batal';

    modal.classList.add('visible');

    return new Promise(resolve => {
      APP._confirmCallback = resolve;
    });
  };

  APP.confirmResolve = function(val) {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.classList.remove('visible');
    if (typeof APP._confirmCallback === 'function') {
      const fn = APP._confirmCallback;
      APP._confirmCallback = null;
      fn(val);
    }
  };

  APP.openDrawer = function(opts) {
    opts = opts || {};
    const overlay = document.getElementById('drawer-overlay');
    const drawer = document.getElementById('drawer');
    const titleEl = document.getElementById('drawer-title');
    const bodyEl = document.getElementById('drawer-body');
    const footerEl = document.getElementById('drawer-footer');

    if (!drawer) return;

    if (titleEl) titleEl.textContent = opts.title || '';
    if (bodyEl) bodyEl.innerHTML = opts.bodyHtml || '';
    if (footerEl) {
      footerEl.innerHTML = opts.footerHtml || '';
      footerEl.style.display = opts.footerHtml ? '' : 'none';
    }

    drawer._onClose = opts.onClose || null;

    if (overlay) overlay.classList.add('visible');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  APP.closeDrawer = function() {
    const overlay = document.getElementById('drawer-overlay');
    const drawer = document.getElementById('drawer');
    if (!drawer) return;

    if (overlay) overlay.classList.remove('visible');
    drawer.classList.remove('open');
    document.body.style.overflow = '';

    if (typeof drawer._onClose === 'function') {
      const fn = drawer._onClose;
      drawer._onClose = null;
      fn();
    }
  };

  APP.escapeHtml = function(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  APP.formatDate = function(val) {
    return (val && String(val) !== 'false' && String(val) !== '') ? String(val) : '–';
  };

  APP.formatFileSize = function(bytes) {
    if (!bytes || bytes === 0) return '–';
    const b = parseInt(bytes);
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
    return (b / 1073741824).toFixed(2) + ' GB';
  };

  APP.statusArsipBadge = function(status) {
    const map = {
      'Aktif': 'badge-success',
      'Inaktif': 'badge-warning',
      'Statis': 'badge-info',
      'Dimusnahkan': 'badge-danger'
    };
    const cls = map[status] || 'badge-muted';
    return '<span class="badge ' + cls + '">' + APP.escapeHtml(status || '–') + '</span>';
  };

  APP.keamananBadge = function(k) {
    const map = {
      'Umum': 'badge-secondary',
      'Internal': 'badge-info',
      'Rahasia': 'badge-warning',
      'Sangat Rahasia': 'badge-danger'
    };
    const cls = map[k] || 'badge-muted';
    return '<span class="badge ' + cls + '">' + APP.escapeHtml(k || '–') + '</span>';
  };

  APP.roleBadge = function(role) {
    const map = {
      SUPER_ADMIN: ['badge-danger', 'Super Admin'],
      ADMIN: ['badge-primary', 'Admin'],
      USER: ['badge-secondary', 'Staff']
    };
    const item = map[role] || ['badge-muted', role];
    return '<span class="badge ' + item[0] + '">' + APP.escapeHtml(item[1]) + '</span>';
  };

  APP.tipeBerkasBadge = function(tipe) {
    const icons = {
      'Dokumen': '📄',
      'Desain': '🎨',
      'Gambar': '🖼',
      'Video': '🎬',
      'Audio': '🎵',
      'Kode': '💾',
      'Lainnya': '📁'
    };
    return '<span class="badge badge-secondary">' +
      (icons[tipe] || '📁') + ' ' + APP.escapeHtml(tipe || 'Lainnya') + '</span>';
  };

  APP.buildPagination = function(total, page, limit, callbackName) {
    if (!total || total <= limit) return '';

    const totalPages = Math.ceil(total / limit);
    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    let html = '<div class="pagination">';
    html += '<span class="page-info">Menampilkan ' + from + '–' + to + ' dari ' + total + '</span>';

    html += '<button class="page-btn" ' + (page <= 1 ? 'disabled' : '') +
            ' onclick="' + callbackName + '(' + (page - 1) + ')">‹</button>';

    APP._pageRange(page, totalPages).forEach(p => {
      if (p === '…') {
        html += '<span class="page-btn" style="border:none;background:none;cursor:default">…</span>';
      } else {
        html += '<button class="page-btn' + (p === page ? ' active' : '') + '" ' +
                'onclick="' + callbackName + '(' + p + ')">' + p + '</button>';
      }
    });

    html += '<button class="page-btn" ' + (page >= totalPages ? 'disabled' : '') +
            ' onclick="' + callbackName + '(' + (page + 1) + ')">›</button>';

    html += '</div>';
    return html;
  };

  APP._pageRange = function(current, total) {
    if (total <= 7) {
      const arr = [];
      for (let i = 1; i <= total; i++) arr.push(i);
      return arr;
    }
    if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
    if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '…', current - 1, current, current + 1, '…', total];
  };

  APP._boot = function() {
    const savedToken = localStorage.getItem(_SK_TOKEN) || sessionStorage.getItem(_SK_TOKEN) || null;
    const savedUserStr = localStorage.getItem(_SK_USER) || sessionStorage.getItem(_SK_USER) || null;

    if (!savedToken || !savedUserStr) {
      APP.openLogin();
      return;
    }

    try {
      sessionStorage.setItem(_SK_TOKEN, savedToken);
      sessionStorage.setItem(_SK_USER, savedUserStr);
      localStorage.setItem(_SK_TOKEN, savedToken);
      localStorage.setItem(_SK_USER, savedUserStr);
    } catch(e) {}

    let savedUser = null;
    try {
      savedUser = JSON.parse(savedUserStr);
    } catch(e) {}

    if (!savedUser || !savedUser.username) {
      sessionStorage.removeItem(_SK_TOKEN);
      sessionStorage.removeItem(_SK_USER);
      localStorage.removeItem(_SK_TOKEN);
      localStorage.removeItem(_SK_USER);
      APP.openLogin();
      return;
    }

    APP.showLoading();

    api.verifySession()
      .then(user => {
        APP.hideLoading();
        if (user && user.username) {
          APP._startSession(savedToken, user);
        } else {
          sessionStorage.removeItem(_SK_TOKEN);
          sessionStorage.removeItem(_SK_USER);
          localStorage.removeItem(_SK_TOKEN);
          localStorage.removeItem(_SK_USER);
          APP.openLogin();
        }
      })
      .catch(err => {
        APP.hideLoading();
        if (savedUser && savedUser.username) {
          APP._startSession(savedToken, savedUser);
        } else {
          sessionStorage.removeItem(_SK_TOKEN);
          sessionStorage.removeItem(_SK_USER);
          localStorage.removeItem(_SK_TOKEN);
          localStorage.removeItem(_SK_USER);
          APP.openLogin();
        }
      });
  };

  document.addEventListener('DOMContentLoaded', () => {
    APP._boot();
  });

})();
