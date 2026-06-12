window.PAGE_JEJAK_AUDIT = {};

PAGE_JEJAK_AUDIT._filters    = {};
PAGE_JEJAK_AUDIT._total      = 0;
PAGE_JEJAK_AUDIT._limit      = 50;
PAGE_JEJAK_AUDIT._moduleList = [];
PAGE_JEJAK_AUDIT._userList   = [];
PAGE_JEJAK_AUDIT._searchTimer= null;

PAGE_JEJAK_AUDIT.render = function (params) {
  var pc = document.getElementById('page-content');
  if (!pc) return;

  PAGE_JEJAK_AUDIT._filters     = { page: 1, limit: PAGE_JEJAK_AUDIT._limit };
  PAGE_JEJAK_AUDIT._total       = 0;
  PAGE_JEJAK_AUDIT._moduleList  = [];
  PAGE_JEJAK_AUDIT._userList    = [];

  pc.innerHTML = PAGE_JEJAK_AUDIT._shellHtml();
  PAGE_JEJAK_AUDIT._loadSupportData();
};

PAGE_JEJAK_AUDIT._shellHtml = function () {
  return '<div class="page-header">' +
    '<div class="page-header-left">' +
      '<h1 class="page-title">Jejak Audit</h1>' +
      '<p class="page-subtitle">Rekam jejak seluruh aktivitas sistem</p>' +
    '</div>' +
    '<div class="page-header-actions">' +
      '<button class="btn btn-secondary btn-sm" onclick="PAGE_JEJAK_AUDIT._load()">↻ Perbarui</button>' +
    '</div>' +
  '</div>' +

  '<div class="card" style="margin-bottom:16px">' +
    '<div class="card-body" style="padding:16px">' +
      '<div class="filter-bar">' +

        '<div class="input-wrap search-input" style="flex:1;min-width:200px;max-width:320px">' +
          '<span class="input-icon">🔍</span>' +
          '<input type="text" id="audit-search" class="form-control" ' +
            'placeholder="Cari username, aksi, detail…" ' +
            'oninput="PAGE_JEJAK_AUDIT._onSearchInput(this.value)">' +
        '</div>' +

        '<select id="audit-modul" class="form-control" style="min-width:150px" ' +
          'onchange="PAGE_JEJAK_AUDIT._applyFilter(\'modul\', this.value)">' +
          '<option value="">Semua Modul</option>' +
        '</select>' +

        '<select id="audit-username" class="form-control" style="min-width:150px" ' +
          'onchange="PAGE_JEJAK_AUDIT._applyFilter(\'username\', this.value)">' +
          '<option value="">Semua Pengguna</option>' +
        '</select>' +

        '<select id="audit-limit" class="form-control" style="min-width:110px" ' +
          'onchange="PAGE_JEJAK_AUDIT._applyLimit(this.value)">' +
          '<option value="25">25 per hal.</option>' +
          '<option value="50" selected>50 per hal.</option>' +
          '<option value="100">100 per hal.</option>' +
        '</select>' +

        '<button class="btn btn-ghost btn-sm" onclick="PAGE_JEJAK_AUDIT._clearFilters()" ' +
          'title="Reset semua filter">✕ Reset</button>' +

      '</div>' +
    '</div>' +
  '</div>' +

  '<div class="card">' +
    '<div class="card-header">' +
      '<span class="card-title">' +
        '<span class="live-dot"></span>' +
        '<span id="audit-count">🔍 Memuat…</span>' +
      '</span>' +
    '</div>' +
    '<div class="table-wrap" id="audit-table-wrap">' +
      APP.skeletonTableHtml(6, 8) +
    '</div>' +
    '<div id="audit-pagination" class="card-footer" style="display:none"></div>' +
  '</div>';
};

PAGE_JEJAK_AUDIT._loadSupportData = function () {
  var done  = 0;
  var total = 2;
  var check = function () {
    done++;
    if (done >= total) PAGE_JEJAK_AUDIT._load();
  };

  APP.call('getAuditModules', [APP.token], function (r) {
    PAGE_JEJAK_AUDIT._moduleList = (r && r.success && r.data) ? r.data : [];
    APP.populateSelect('audit-modul',
      PAGE_JEJAK_AUDIT._moduleList, '', 'Semua Modul');
    check();
  }, { noLoading: true, silent: true });

  APP.call('getUsers', [APP.token], function (r) {
    PAGE_JEJAK_AUDIT._userList = (r && r.success && r.data) ? r.data : [];
    APP.populateSelect('audit-username',
      PAGE_JEJAK_AUDIT._userList.map(function (u) {
        return { value: u.username, label: u.fullname + ' (@' + u.username + ')' };
      }), '', 'Semua Pengguna');
    check();
  }, { noLoading: true, silent: true });
};

PAGE_JEJAK_AUDIT._load = function () {
  var wrap = document.getElementById('audit-table-wrap');
  var pag  = document.getElementById('audit-pagination');
  if (wrap) wrap.innerHTML = APP.skeletonTableHtml(6, 8);
  if (pag)  pag.style.display = 'none';

  var countEl = document.getElementById('audit-count');
  if (countEl) countEl.textContent = '🔍 Memuat…';

  var f        = PAGE_JEJAK_AUDIT._filters;
  var serverFilters = { page: f.page || 1, limit: f.limit || 50 };
  if (f.search)   serverFilters.search   = f.search;
  if (f.modul)    serverFilters.modul    = f.modul;
  if (f.username) serverFilters.username = f.username;

  APP.call('getAuditTrail', [APP.token, serverFilters], function (result) {
    if (!result || !result.success) {
      if (wrap) wrap.innerHTML = APP.emptyStateHtml('⚠️', 'Gagal memuat',
        (result && result.message) || '');
      return;
    }

    PAGE_JEJAK_AUDIT._total = result.total || 0;

    if (countEl) {
      countEl.textContent = '🔍 ' + result.total + ' Aktivitas' +
        (result.total > result.limit
          ? ' · Hal. ' + result.page + ' dari ' + Math.ceil(result.total / result.limit)
          : '');
    }

    PAGE_JEJAK_AUDIT._renderTable(result.data || []);
    PAGE_JEJAK_AUDIT._renderPagination(result.total, result.page, result.limit);
  }, { noLoading: true });
};

PAGE_JEJAK_AUDIT._renderTable = function (data) {
  var wrap = document.getElementById('audit-table-wrap');
  if (!wrap) return;
  var esc  = APP._esc;

  if (!data || data.length === 0) {
    wrap.innerHTML = APP.emptyStateHtml('📋', 'Tidak ada aktivitas',
      'Belum ada aktivitas yang sesuai dengan filter.');
    return;
  }

  var html = '<table class="data-table"><thead><tr>' +
    '<th style="min-width:160px">Waktu</th>' +
    '<th style="min-width:160px">Pengguna</th>' +
    '<th style="min-width:100px">Departemen</th>' +
    '<th style="min-width:130px">Aksi</th>' +
    '<th style="min-width:110px">Modul</th>' +
    '<th>Detail</th>' +
  '</tr></thead><tbody>';

  data.forEach(function (entry) {
    html += '<tr class="audit-row">' +
      '<td class="audit-timestamp">' + esc(entry.timestamp || '–') + '</td>' +
      '<td>' +
        '<div style="font-weight:500;font-size:13px">' + esc(entry.fullname || entry.username || '–') + '</div>' +
        '<div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">@' +
          esc(entry.username || '') + '</div>' +
      '</td>' +
      '<td>' +
        '<span class="badge badge-muted">' + esc(entry.departemen || '–') + '</span>' +
      '</td>' +
      '<td>' + PAGE_JEJAK_AUDIT._aksiBadge(entry.aksi) + '</td>' +
      '<td>' +
        '<span style="font-size:12px;color:var(--text-secondary)">' +
          esc(entry.modul || '–') +
        '</span>' +
      '</td>' +
      '<td class="audit-detail">' + esc(entry.detail || '–') + '</td>' +
    '</tr>';
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;
};

PAGE_JEJAK_AUDIT._aksiBadge = function (aksi) {
  var str = String(aksi || '');
  var cls = 'aksi-other';
  var icon = '';

  if (str === 'LOGIN')                                   { cls = 'aksi-login';    icon = '🔓'; }
  else if (str === 'LOGOUT')                             { cls = 'aksi-logout';   icon = '🔒'; }
  else if (str === 'CHANGE_PASSWORD')                    { cls = 'aksi-settings'; icon = '🔑'; }
  else if (str.indexOf('ADD_') === 0)                    { cls = 'aksi-add';      icon = '➕'; }
  else if (str.indexOf('UPDATE_') === 0)                 { cls = 'aksi-update';   icon = '✏️'; }
  else if (str.indexOf('DELETE_') === 0 ||
           str.indexOf('DEACTIVATE') === 0)              { cls = 'aksi-delete';   icon = '🗑'; }
  else if (str.indexOf('EXPORT_') === 0)                 { cls = 'aksi-export';   icon = '⬇'; }
  else if (str.indexOf('UPLOAD_') === 0)                 { cls = 'aksi-upload';   icon = '⬆'; }
  else if (str.indexOf('RETENSI') === 0)                 { cls = 'aksi-retensi';  icon = '⏱'; }
  else if (str.indexOf('RESTORE_') === 0)                { cls = 'aksi-add';      icon = '↺'; }
  else if (str === 'UPDATE_SETTINGS')                    { cls = 'aksi-settings'; icon = '⚙️'; }
  else if (str.indexOf('LOGIN_GAGAL') === 0)             { cls = 'aksi-delete';   icon = '⚠️'; }

  return '<span class="aksi-badge ' + cls + '">' +
    (icon ? icon + ' ' : '') + APP._esc(str) +
  '</span>';
};

PAGE_JEJAK_AUDIT._renderPagination = function (total, page, limit) {
  var wrap = document.getElementById('audit-pagination');
  if (!wrap) return;

  if (!total || total <= limit) {
    wrap.style.display = 'none';
    return;
  }

  var pag = APP.buildPagination(total, page, limit, 'PAGE_JEJAK_AUDIT._goPage');
  if (pag) {
    wrap.innerHTML    = pag;
    wrap.style.display = '';
  } else {
    wrap.style.display = 'none';
  }
};

PAGE_JEJAK_AUDIT._goPage = function (p) {
  PAGE_JEJAK_AUDIT._filters.page = p;
  PAGE_JEJAK_AUDIT._load();
  var pc = document.getElementById('page-content');
  if (pc) pc.scrollTop = 0;
};

PAGE_JEJAK_AUDIT._onSearchInput = function (val) {
  clearTimeout(PAGE_JEJAK_AUDIT._searchTimer);
  PAGE_JEJAK_AUDIT._searchTimer = setTimeout(function () {
    if (val.trim()) {
      PAGE_JEJAK_AUDIT._filters.search = val.trim();
    } else {
      delete PAGE_JEJAK_AUDIT._filters.search;
    }
    PAGE_JEJAK_AUDIT._filters.page = 1;
    PAGE_JEJAK_AUDIT._load();
  }, 400);
};

PAGE_JEJAK_AUDIT._applyFilter = function (key, val) {
  if (val) {
    PAGE_JEJAK_AUDIT._filters[key] = val;
  } else {
    delete PAGE_JEJAK_AUDIT._filters[key];
  }
  PAGE_JEJAK_AUDIT._filters.page = 1;
  PAGE_JEJAK_AUDIT._load();
};

PAGE_JEJAK_AUDIT._applyLimit = function (val) {
  PAGE_JEJAK_AUDIT._limit          = parseInt(val) || 50;
  PAGE_JEJAK_AUDIT._filters.limit  = PAGE_JEJAK_AUDIT._limit;
  PAGE_JEJAK_AUDIT._filters.page   = 1;
  PAGE_JEJAK_AUDIT._load();
};

PAGE_JEJAK_AUDIT._clearFilters = function () {
  PAGE_JEJAK_AUDIT._filters = { page: 1, limit: PAGE_JEJAK_AUDIT._limit };

  var ids = ['audit-search','audit-modul','audit-username'];
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });

  PAGE_JEJAK_AUDIT._load();
};
