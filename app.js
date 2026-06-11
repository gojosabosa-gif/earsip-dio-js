/* ============================================================
   E-ARSIP DIO — Shared Application JS (Blogspot)
   ============================================================
   Include AFTER shared-style.css on every page
   Dependencies: None (vanilla JS)
   ============================================================ */

var APP = (function() {

  // ─── CONFIGURATION ──────────────────────────────────────
  // USER MUST SET THIS to the deployed GAS WebApp URL
  var API_BASE_URL = 'YOUR_GAS_WEBAPP_URL_HERE';

  var CONFIG = {
    TOKEN_KEY: 'earsip_token',
    USER_KEY: 'earsip_user',
    PAGE_KEY: 'earsip_page'
  };

  // ─── STATE ──────────────────────────────────────────────
  var currentUser = null;
  var currentPage = '';
  var isInitialized = false;

  // ─── API CLIENT ─────────────────────────────────────────
  function api(action, payload) {
    payload = payload || {};
    payload.action = action;

    var token = getToken();
    if (token) payload.token = token;

    return fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(response) {
      return response.json();
    })
    .then(function(result) {
      if (result.status === 'error') {
        throw new Error(result.message || 'Unknown error');
      }
      return result.data !== undefined ? result.data : result;
    });
  }

  // ─── AUTH ───────────────────────────────────────────────
  function getToken() {
    try { return localStorage.getItem(CONFIG.TOKEN_KEY); }
    catch(e) { return null; }
  }

  function getStoredUser() {
    try {
      var data = localStorage.getItem(CONFIG.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch(e) { return null; }
  }

  function saveAuth(token, user) {
    try {
      localStorage.setItem(CONFIG.TOKEN_KEY, token);
      localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
    } catch(e) {}
  }

  function clearAuth() {
    try {
      localStorage.removeItem(CONFIG.TOKEN_KEY);
      localStorage.removeItem(CONFIG.USER_KEY);
    } catch(e) {}
  }

  function login(username, password) {
    return api('login', { username: username, password: password })
      .then(function(res) {
        saveAuth(res.token, res.user);
        currentUser = res.user;
        return res;
      });
  }

  function logout() {
    var token = getToken();
    clearAuth();
    currentUser = null;
    if (token) {
      api('logout', {}).catch(function() {});
    }
    redirectToLogin();
  }

  function verifySession() {
    var token = getToken();
    if (!token) return Promise.resolve(null);

    return api('verifySession', {})
      .then(function(user) {
        currentUser = user;
        try { localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user)); } catch(e) {}
        return user;
      })
      .catch(function() {
        clearAuth();
        currentUser = null;
        return null;
      });
  }

  function isLoggedIn() {
    return currentUser !== null;
  }

  function isRole(roles) {
    if (!currentUser) return false;
    if (!roles || roles.length === 0) return true;
    for (var i = 0; i < roles.length; i++) {
      if (currentUser.role === roles[i]) return true;
    }
    return false;
  }

  function getCurrentUser() { return currentUser; }

  function requireAuth(redirect) {
    if (!currentUser) {
      if (redirect !== false) redirectToLogin();
      return false;
    }
    return true;
  }

  function redirectToLogin() {
    window.location.href = '/p/login.html';
  }

  // ─── UI HELPERS ─────────────────────────────────────────
  function showLoading() {
    var el = document.getElementById('loading-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'loading-overlay';
      el.className = 'loading-overlay';
      el.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(el);
    }
    el.classList.add('active');
  }

  function hideLoading() {
    var el = document.getElementById('loading-overlay');
    if (el) el.classList.remove('active');
  }

  function showToast(message, type) {
    type = type || 'info';
    var icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    var container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML =
      '<span class="toast-icon">' + (icons[type] || 'ℹ️') + '</span>' +
      '<span class="toast-msg">' + escapeHtml(message) + '</span>' +
      '<button class="toast-dismiss" onclick="this.parentElement.remove()">&times;</button>';

    container.appendChild(toast);

    setTimeout(function() {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(function() {
          if (toast.parentElement) toast.remove();
        }, 300);
      }
    }, 4000);
  }

  function openModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function closeModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('active');
  }

  function closeAllModals() {
    var modals = document.querySelectorAll('.modal-overlay');
    for (var i = 0; i < modals.length; i++) {
      modals[i].classList.remove('active');
    }
  }

  function confirmDialog(message, callbackYes, callbackNo) {
    var existing = document.getElementById('modal-confirm');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'modal-confirm';
    overlay.className = 'modal-overlay active';
    overlay.innerHTML =
      '<div class="modal modal-sm">' +
        '<div class="modal-header">' +
          '<h3>Konfirmasi</h3>' +
          '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<p style="color:var(--text-secondary)">' + escapeHtml(message) + '</p>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-secondary" id="confirm-no">Batal</button>' +
          '<button class="btn btn-danger" id="confirm-yes">Ya, Lanjutkan</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    document.getElementById('confirm-yes').onclick = function() {
      overlay.remove();
      if (callbackYes) callbackYes();
    };
    document.getElementById('confirm-no').onclick = function() {
      overlay.remove();
      if (callbackNo) callbackNo();
    };
  }

  function setBreadcrumb(path) {
    var el = document.getElementById('breadcrumb');
    if (!el) return;
    el.innerHTML = '<a href="/p/dashboard.html">Beranda</a>';
    if (path) {
      el.innerHTML += ' <span class="sep">›</span> <span>' + escapeHtml(path) + '</span>';
    }
  }

  function setPageTitle(title) {
    var el = document.getElementById('page-title');
    if (el) el.textContent = title;
    document.title = title + ' | E-ARSIP DIO';
  }

  function updateUserDisplay() {
    var nameEl = document.getElementById('user-name');
    var roleEl = document.getElementById('user-role');
    var avatarEl = document.getElementById('user-avatar');
    if (!currentUser) return;
    if (nameEl) nameEl.textContent = currentUser.fullname;
    if (roleEl) roleEl.textContent = currentUser.role;
    if (avatarEl) avatarEl.textContent = (currentUser.fullname || 'U').charAt(0).toUpperCase();
  }

  function setPageModule(moduleName) {
    currentPage = moduleName;
    try { localStorage.setItem(CONFIG.PAGE_KEY, moduleName); } catch(e) {}
  }

  // ─── SUB-NAVIGATION ─────────────────────────────────────
  function initSidebar() {
    var menuItems = [
      { icon: '📊', label: 'Dashboard', page: 'dashboard', roles: null },
      { icon: '📁', label: 'Manajemen Arsip', page: 'manajemen-arsip', roles: null },
      { icon: '📝', label: 'Registrasi Arsip', page: 'registrasi-arsip', roles: null },
      { icon: '🏷️', label: 'Klasifikasi', page: 'klasifikasi', roles: null },
      { icon: '👥', label: 'Manajemen User', page: 'manajemen-user', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { icon: '📅', label: 'Jadwal Retensi', page: 'jadwal-retensi', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { icon: '📋', label: 'Jejak Audit', page: 'jejak-audit', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { icon: '📄', label: 'Laporan', page: 'laporan', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { icon: '📦', label: 'Peminjaman', page: 'peminjaman', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { icon: '📎', label: 'Templat', page: 'templat', roles: null },
      { icon: '⚙️', label: 'Pengaturan', page: 'pengaturan', roles: ['SUPER_ADMIN'] }
    ];

    var nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    var html = '';
    for (var i = 0; i < menuItems.length; i++) {
      var item = menuItems[i];
      if (item.roles && !isRole(item.roles)) continue;
      var active = currentPage === item.page ? ' active' : '';
      html += '<a class="nav-item' + active + '" href="/p/' + item.page + '.html">' +
        '<span class="nav-icon">' + item.icon + '</span>' +
        item.label +
        '</a>';
    }
    nav.innerHTML = html;
  }

  // ─── FORM HELPERS ───────────────────────────────────────
  function getFormData(formId) {
    var form = document.getElementById(formId);
    if (!form) return {};
    var data = {};
    var elements = form.querySelectorAll('[name]');
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (el.type === 'checkbox') {
        data[el.name] = el.checked;
      } else if (el.type === 'radio') {
        if (el.checked) data[el.name] = el.value;
      } else {
        data[el.name] = el.value;
      }
    }
    return data;
  }

  function fillForm(formId, data) {
    var form = document.getElementById(formId);
    if (!form) return;
    for (var key in data) {
      var el = form.querySelector('[name="' + key + '"]');
      if (!el) continue;
      if (el.type === 'checkbox') {
        el.checked = !!data[key];
      } else {
        el.value = data[key] !== undefined && data[key] !== null ? data[key] : '';
      }
    }
  }

  function resetForm(formId) {
    var form = document.getElementById(formId);
    if (!form) return;
    form.reset();
  }

  function clearFormErrors() {
    var errors = document.querySelectorAll('.form-error');
    for (var i = 0; i < errors.length; i++) errors[i].textContent = '';
  }

  function showFormError(fieldName, message) {
    var el = document.querySelector('[data-error="' + fieldName + '"]');
    if (el) el.textContent = message;
  }

  // ─── TABLE HELPER ───────────────────────────────────────
  function renderTable(tableId, columns, data, rowIdField) {
    rowIdField = rowIdField || 'id';
    var table = document.getElementById(tableId);
    if (!table) return;

    var thead = table.querySelector('thead');
    var tbody = table.querySelector('tbody');

    if (!thead) {
      thead = document.createElement('thead');
      table.appendChild(thead);
    }
    if (!tbody) {
      tbody = document.createElement('tbody');
      table.appendChild(tbody);
    }

    // Header
    var headerHtml = '<tr>';
    for (var i = 0; i < columns.length; i++) {
      headerHtml += '<th>' + escapeHtml(columns[i].label) + '</th>';
    }
    headerHtml += '</tr>';
    thead.innerHTML = headerHtml;

    // Body
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="' + columns.length + '" style="text-align:center;padding:32px;color:var(--text-muted)">Tidak ada data</td></tr>';
      return;
    }

    var bodyHtml = '';
    for (var r = 0; r < data.length; r++) {
      bodyHtml += '<tr data-id="' + escapeHtml(String(data[r][rowIdField] || '')) + '">';
      for (var c = 0; c < columns.length; c++) {
        var col = columns[c];
        var val = '';
        if (typeof col.render === 'function') {
          val = col.render(data[r]);
        } else if (col.field) {
          val = String(data[r][col.field] !== undefined ? data[r][col.field] : '');
        }
        bodyHtml += '<td>' + val + '</td>';
      }
      bodyHtml += '</tr>';
    }
    tbody.innerHTML = bodyHtml;
  }

  // ─── SELECT OPTIONS ─────────────────────────────────────
  function populateSelect(selectId, options, valueField, labelField, defaultText) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    var html = defaultText ? '<option value="">' + escapeHtml(defaultText) + '</option>' : '';
    for (var i = 0; i < options.length; i++) {
      var val = options[i][valueField || 'value'];
      var lbl = options[i][labelField || 'label'];
      html += '<option value="' + escapeHtml(String(val)) + '">' + escapeHtml(String(lbl || val)) + '</option>';
    }
    sel.innerHTML = html;
  }

  function populateSelectSimple(selectId, items, defaultText) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    if (!items || items.length === 0) return;
    var html = defaultText ? '<option value="">' + escapeHtml(defaultText) + '</option>' : '';
    for (var i = 0; i < items.length; i++) {
      var val = typeof items[i] === 'object' ? items[i].value : items[i];
      var lbl = typeof items[i] === 'object' ? items[i].label : items[i];
      html += '<option value="' + escapeHtml(String(val)) + '">' + escapeHtml(String(lbl || val)) + '</option>';
    }
    sel.innerHTML = html;
  }

  // ─── PAGINATION ─────────────────────────────────────────
  function renderPagination(containerId, page, totalPages, onPageClick) {
    var container = document.getElementById(containerId);
    if (!container) return;

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    var html = '';
    html += '<button class="page-btn" data-page="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + '>‹</button>';

    var start = Math.max(1, page - 2);
    var end = Math.min(totalPages, page + 2);

    if (start > 1) {
      html += '<button class="page-btn" data-page="1">1</button>';
      if (start > 2) html += '<span class="page-btn" style="border:none;background:none;cursor:default">…</span>';
    }

    for (var i = start; i <= end; i++) {
      html += '<button class="page-btn' + (i === page ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }

    if (end < totalPages) {
      if (end < totalPages - 1) html += '<span class="page-btn" style="border:none;background:none;cursor:default">…</span>';
      html += '<button class="page-btn" data-page="' + totalPages + '">' + totalPages + '</button>';
    }

    html += '<button class="page-btn" data-page="' + (page + 1) + '"' + (page >= totalPages ? ' disabled' : '') + '>›</button>';

    container.innerHTML = html;

    container.querySelectorAll('.page-btn[data-page]').forEach(function(btn) {
      btn.onclick = function() {
        var p = parseInt(this.getAttribute('data-page'));
        if (p >= 1 && p <= totalPages && onPageClick) onPageClick(p);
      };
    });
  }

  // ─── HAMBURGER / MOBILE ─────────────────────────────────
  function initHamburger() {
    var btn = document.getElementById('hamburger-btn');
    var sidebar = document.getElementById('sidebar');
    if (!btn || !sidebar) return;

    btn.onclick = function() {
      sidebar.classList.toggle('open');
    };

    document.addEventListener('click', function(e) {
      if (window.innerWidth <= 768 &&
          !sidebar.contains(e.target) &&
          !btn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // ─── INIT ───────────────────────────────────────────────
  function init(options) {
    if (isInitialized) return;
    options = options || {};

    if (options.apiBaseUrl) API_BASE_URL = options.apiBaseUrl;

    return verifySession()
      .then(function(user) {
        isInitialized = true;
        updateUserDisplay();
        initSidebar();
        initHamburger();

        // Close modal on overlay click
        document.addEventListener('click', function(e) {
          if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('active');
          }
        });

        // ESC key closes modals
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape') closeAllModals();
        });

        return user;
      });
  }

  // ─── SANITIZE ───────────────────────────────────────────
  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ─── FORMAT ─────────────────────────────────────────────
  function formatDate(dateStr, includeTime) {
    if (!dateStr) return '-';
    var d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    var pad = function(n) { return String(n).padStart(2, '0'); };
    var date = pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
    if (!includeTime) return date;
    return date + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function formatFileSize(bytes) {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // ─── EXPORT ─────────────────────────────────────────────
  return {
    // API
    api: api,

    // Auth
    login: login,
    logout: logout,
    verifySession: verifySession,
    isLoggedIn: isLoggedIn,
    isRole: isRole,
    getCurrentUser: getCurrentUser,
    requireAuth: requireAuth,
    getToken: getToken,
    getStoredUser: getStoredUser,

    // UI
    showLoading: showLoading,
    hideLoading: hideLoading,
    showToast: showToast,
    openModal: openModal,
    closeModal: closeModal,
    closeAllModals: closeAllModals,
    confirmDialog: confirmDialog,
    setBreadcrumb: setBreadcrumb,
    setPageTitle: setPageTitle,
    updateUserDisplay: updateUserDisplay,
    setPageModule: setPageModule,

    // Form
    getFormData: getFormData,
    fillForm: fillForm,
    resetForm: resetForm,
    clearFormErrors: clearFormErrors,
    showFormError: showFormError,

    // Table
    renderTable: renderTable,
    populateSelect: populateSelect,
    populateSelectSimple: populateSelectSimple,

    // Pagination
    renderPagination: renderPagination,

    // Format
    formatDate: formatDate,
    formatFileSize: formatFileSize,
    escapeHtml: escapeHtml,

    // Lifecycle
    init: init,
    requireAuth: requireAuth,

    // Constants for pages
    ROLE: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', USER: 'USER' },
    KEAMANAN: { UMUM: 'Umum', INTERNAL: 'Internal', RAHASIA: 'Rahasia', SANGAT_RAHASIA: 'Sangat Rahasia' },
    STATUS_ARSIP: { AKTIF: 'Aktif', INAKTIF: 'Inaktif', STATIS: 'Statis' },
    PENYUSUTAN: ['Musnah', 'Permanen', 'Dinilai Kembali', 'Arsip Aktif']
  };
})();
