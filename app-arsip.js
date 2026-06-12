/* ═══════════════════════════════════════════════════════════════
   Page_ManajemenArsip — E-ARSIP DIO
   Exposes: window.PAGE_MANAJEMEN_ARSIP

   EarsipAPI methods:
     api.getArchives(filters)
     api.getArchive(id)
     api.updateArchive(id, data)
     api.deleteArchive(id)
     api.bulkUpdateArchives(ids, updates)
     api.bulkExportArchives(ids)
     api.checkDuplicates(nama, nomor)
     api.getRelatedArchives(id)
     api.getArchiveDepartemen()
     api.getArchiveYears()
     api.getConstants()
     api.getClassifications()
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var P = window.PAGE_MANAJEMEN_ARSIP = {};

  /* ─── State ─────────────────────────────────────────────── */
  P._allData        = [];
  P._filtered       = [];
  P._archiveMap     = {};
  P._selected       = new Set();
  P._curPage        = 1;
  P._limit          = 20;
  P._filters        = {};
  P._klasList       = [];
  P._deptList       = [];
  P._yearList       = [];
  P._currentDetailId = null;
  P._currentArchive  = null;
  P._searchTimer     = null;
  P._previewOpen     = false;

  /* ─── Styles ────────────────────────────────────────────── */
  var _styleId = 'ma-style';
  if (!document.getElementById(_styleId)) {
    var s = document.createElement('style');
    s.id = _styleId;
    s.textContent =
      '.archive-table .col-nama{min-width:200px}' +
      '.archive-table .col-nomor{min-width:130px}' +
      '.archive-table .col-klas{min-width:120px}' +
      '.archive-table .col-tipe{width:100px}' +
      '.archive-table .col-status{width:90px}' +
      '.archive-table .col-aman{width:110px}' +
      '.archive-table .col-dept{width:120px}' +
      '.archive-table .col-aksi{width:90px}' +
      '.detail-section{margin-bottom:20px}' +
      '.detail-section-title{font-size:11px;font-weight:700;text-transform:uppercase;' +
      'letter-spacing:0.08em;color:var(--text-muted);margin-bottom:10px;padding-bottom:6px;' +
      'border-bottom:1px solid var(--border)}' +
      '.detail-row{display:flex;justify-content:space-between;align-items:flex-start;' +
      'gap:16px;padding:6px 0;font-size:13px;border-bottom:1px solid var(--border)}' +
      '.detail-row:last-child{border-bottom:none}' +
      '.detail-label{color:var(--text-muted);font-size:12px;flex-shrink:0;min-width:120px}' +
      '.detail-value{color:var(--text-primary);text-align:right;word-break:break-word}' +
      '.file-link{display:inline-flex;align-items:center;gap:4px;font-size:12px;' +
      'color:var(--accent);text-decoration:none}' +
      '.file-link:hover{text-decoration:underline}' +
      '.filter-chips-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;min-height:0}' +
      '.filter-chip{display:inline-flex;align-items:center;gap:4px;' +
      'background:var(--accent-soft);border:1px solid var(--accent-border);' +
      'border-radius:99px;padding:2px 10px;font-size:11px;' +
      'color:var(--accent);cursor:pointer;transition:var(--transition)}' +
      '.filter-chip:hover{background:var(--accent-glow)}' +
      '.filter-chip-x{font-size:10px;opacity:0.7}' +
      '.edit-form .form-row{margin-bottom:0}' +
      '.row-selected td{background:var(--accent-soft)!important}' +
      '@media(max-width:700px){.archive-table .col-klas,.archive-table .col-dept{display:none}}';
    document.head.appendChild(s);
  }

  /* ─── Render Entry Point ────────────────────────────────── */
  P.render = function (params) {
    params = params || {};
    var pc = document.getElementById('page-content');
    if (!pc) return;
    var user    = APP.currentUser;
    var isAdmin = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');
    P._allData    = [];
    P._archiveMap = {};
    P._selected   = new Set();
    P._curPage    = 1;
    P._filters    = {};
    if (params.search)              P._filters.search              = params.search;
    if (params.statusArsip)         P._filters.statusArsip         = params.statusArsip;
    if (params.klasifikasiKeamanan) P._filters.klasifikasiKeamanan = params.klasifikasiKeamanan;
    pc.innerHTML = P._shellHtml(user, isAdmin);
    P._populateFilterSelects(user, isAdmin);
    if (params.search)              { var el = document.getElementById('ma-search');       if (el) el.value = params.search; }
    if (params.statusArsip)         { var el = document.getElementById('ma-filter-status');if (el) el.value = params.statusArsip; }
    if (params.klasifikasiKeamanan) { var el = document.getElementById('ma-filter-aman');  if (el) el.value = params.klasifikasiKeamanan; }
    P._loadSupportData(function () {
      P._loadArchives(function () {
        if (params.openId) {
          var rec = P._archiveMap[params.openId];
          if (rec) P.openDetail(rec);
        }
      });
    });
  };

  /* ─── Shell HTML ────────────────────────────────────────── */
  P._shellHtml = function (user, isAdmin) {
    return (
      '<div class="page-header">' +
        '<div class="page-header-left">' +
          '<h1 class="page-title">Manajemen Arsip</h1>' +
          '<p class="page-subtitle">Kelola seluruh berkas legal dan desain</p>' +
        '</div>' +
        '<div class="page-header-actions">' +
          '<button class="btn btn-secondary btn-sm" onclick="PAGE_MANAJEMEN_ARSIP.refresh()">&#8635; Perbarui</button>' +
          '<button class="btn btn-secondary btn-sm" onclick="PAGE_MANAJEMEN_ARSIP._exportCSV()">&#8595; CSV</button>' +
          '<button class="btn btn-primary btn-sm" onclick="APP.navigate(\'registrasi-arsip\')">+ Registrasi</button>' +
        '</div>' +
      '</div>' +

      '<div id="bulk-action-bar" style="display:none;margin-bottom:12px;padding:12px 16px;' +
        'background:var(--accent-soft);border:1px solid var(--accent-border);' +
        'border-radius:var(--radius-md);align-items:center;gap:12px;flex-wrap:wrap">' +
        '<span id="bulk-count-label" style="font-size:13px;font-weight:600;color:var(--accent)">0 dipilih</span>' +
        '<div style="flex:1"></div>' +
        '<select id="bulk-status-select" class="form-control" style="max-width:160px;height:34px">' +
          '<option value="">Ubah Status&hellip;</option>' +
          '<option value="Aktif">Aktif</option>' +
          '<option value="Inaktif">Inaktif</option>' +
          '<option value="Statis">Statis</option>' +
        '</select>' +
        '<button class="btn btn-secondary btn-sm" onclick="PAGE_MANAJEMEN_ARSIP._bulkChangeStatus()">Terapkan</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="PAGE_MANAJEMEN_ARSIP._bulkExport()">&#8595; Export Terpilih</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="PAGE_MANAJEMEN_ARSIP._clearSelection()">&#10005; Batal</button>' +
      '</div>' +

      '<div class="card" style="margin-bottom:16px">' +
        '<div class="card-body" style="padding:16px">' +
          '<div class="filter-bar">' +
            '<div class="input-wrap search-input" style="flex:1;min-width:200px;max-width:340px">' +
              '<span class="input-icon">&#128269;</span>' +
              '<input type="text" id="ma-search" class="form-control" ' +
                'placeholder="Cari nama, nomor, keterangan&hellip;" ' +
                'oninput="PAGE_MANAJEMEN_ARSIP._onSearchInput(this.value)">' +
            '</div>' +
            '<select id="ma-filter-tipe" class="form-control" style="min-width:120px" ' +
              'onchange="PAGE_MANAJEMEN_ARSIP._applyFilters()"><option value="">Semua Tipe</option></select>' +
            '<select id="ma-filter-jenis" class="form-control" style="min-width:150px" ' +
              'onchange="PAGE_MANAJEMEN_ARSIP._applyFilters()"><option value="">Semua Jenis</option></select>' +
            '<select id="ma-filter-status" class="form-control" style="min-width:120px" ' +
              'onchange="PAGE_MANAJEMEN_ARSIP._applyFilters()"><option value="">Semua Status</option></select>' +
            '<select id="ma-filter-aman" class="form-control" style="min-width:130px" ' +
              'onchange="PAGE_MANAJEMEN_ARSIP._applyFilters()"><option value="">Semua Keamanan</option></select>' +
            (isAdmin ? '<select id="ma-filter-dept" class="form-control" style="min-width:130px" ' +
              'onchange="PAGE_MANAJEMEN_ARSIP._applyFilters()"><option value="">Semua Departemen</option></select>' : '') +
            '<select id="ma-filter-tahun" class="form-control" style="min-width:100px" ' +
              'onchange="PAGE_MANAJEMEN_ARSIP._applyFilters()"><option value="">Semua Tahun</option></select>' +
            '<button class="btn btn-ghost btn-sm" onclick="PAGE_MANAJEMEN_ARSIP._clearFilters()">&#10005; Reset</button>' +
          '</div>' +
          '<div class="filter-chips-row" id="ma-filter-chips"></div>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-header">' +
          '<span class="card-title" id="ma-result-count">&#128194; Memuat&hellip;</span>' +
        '</div>' +
        '<div id="ma-table-wrap" class="table-wrap">' + APP.skeletonTableHtml(7, 8) + '</div>' +
        '<div id="ma-pagination" class="card-footer" style="display:none"></div>' +
      '</div>'
    );
  };

  /* ─── Populate Filter Selects ────────────────────────────── */
  P._populateFilterSelects = function (user, isAdmin) {
    var c = APP.constants || {};
    APP.populateSelect('ma-filter-tipe',   c.tipeBerkas  || [], '', 'Semua Tipe');
    APP.populateSelect('ma-filter-jenis',  c.jenisBerkas || [], '', 'Semua Jenis');
    APP.populateSelect('ma-filter-status', c.statusArsip || [], '', 'Semua Status');
    APP.populateSelect('ma-filter-aman',   c.keamanan    || [], '', 'Semua Keamanan');
  };

  /* ─── Load Support Data ─────────────────────────────────── */
  P._loadSupportData = function (callback) {
    var done = 0;
    var total = 3;
    var check = function () { done++; if (done >= total && callback) callback(); };
    var user    = APP.currentUser;
    var isAdmin = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');
    APP.call('getClassifications', [APP.token], function (r) {
      P._klasList = (r && r.success && r.data)
        ? r.data.filter(function (k) { return k.status === 'Aktif'; }) : [];
      check();
    }, { noLoading: true, silent: true });
    APP.call('getArchiveDepartemen', [APP.token], function (r) {
      P._deptList = (r && r.success && r.data) ? r.data : [];
      if (isAdmin) APP.populateSelect('ma-filter-dept', P._deptList, '', 'Semua Departemen');
      check();
    }, { noLoading: true, silent: true });
    APP.call('getArchiveYears', [APP.token], function (r) {
      P._yearList = (r && r.success && r.data) ? r.data : [];
      APP.populateSelect('ma-filter-tahun',
        P._yearList.map(function (y) { return { value: String(y), label: String(y) }; }),
        '', 'Semua Tahun');
      check();
    }, { noLoading: true, silent: true });
  };

  /* ─── Load Archives ─────────────────────────────────────── */
  P._loadArchives = function (callback) {
    var wrap    = document.getElementById('ma-table-wrap');
    var countEl = document.getElementById('ma-result-count');
    if (wrap)    wrap.innerHTML = APP.skeletonTableHtml(7, 8);
    if (countEl) countEl.textContent = '\uD83D\uDCC2 Memuat\u2026';
    var f = P._filters;
    var sf = {};
    ['search','kodeKlasifikasi','jenisBerkas','tipeBerkas','departemen',
     'statusArsip','klasifikasiKeamanan','tahun','lokasiSimpan'].forEach(function (k) {
      if (f[k]) sf[k] = f[k];
    });
    APP.call('getArchives', [APP.token, sf], function (result) {
      if (!result || !result.success) {
        if (wrap) wrap.innerHTML = APP.emptyStateHtml('&#9888;', 'Gagal memuat', (result && result.message) || '');
        return;
      }
      P._allData  = result.data || [];
      P._filtered = P._allData;
      P._archiveMap = {};
      P._allData.forEach(function (a) { if (a.id) P._archiveMap[a.id] = a; });
      P._renderTable();
      P._renderChips();
      if (typeof callback === 'function') callback();
    }, { noLoading: true });
  };

  /* ─── Render Table ──────────────────────────────────────── */
  P._renderTable = function () {
    var wrap    = document.getElementById('ma-table-wrap');
    var pagWrap = document.getElementById('ma-pagination');
    var countEl = document.getElementById('ma-result-count');
    if (!wrap) return;
    var user    = APP.currentUser;
    var isAdmin = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');
    var data    = P._filtered;
    var page    = P._curPage;
    var limit   = P._limit;
    var total   = data.length;
    var esc     = APP._esc;
    if (countEl) countEl.textContent = '\uD83D\uDCC2 ' + total + ' Berkas Ditemukan';
    if (total === 0) {
      wrap.innerHTML = APP.emptyStateHtml('\uD83D\uDCC2', 'Tidak ada berkas',
        'Belum ada arsip yang sesuai dengan filter.',
        '<button class="btn btn-primary" onclick="APP.navigate(\'registrasi-arsip\')">+ Registrasi Berkas</button>');
      if (pagWrap) pagWrap.style.display = 'none';
      return;
    }
    var start    = (page - 1) * limit;
    var pageData = data.slice(start, start + limit);
    var html = '<table class="data-table archive-table"><thead><tr>' +
      (isAdmin ? '<th style="width:36px"><input type="checkbox" id="bulk-check-all" ' +
        'onchange="PAGE_MANAJEMEN_ARSIP._toggleSelectAll(this.checked)"></th>' : '') +
      '<th class="col-nama">Nama Berkas</th><th class="col-nomor">Nomor Dokumen</th>' +
      '<th class="col-klas">Klasifikasi</th><th class="col-tipe">Tipe</th>' +
      '<th class="col-status">Status</th><th class="col-aman">Keamanan</th>' +
      (isAdmin ? '<th class="col-dept">Departemen</th>' : '') +
      '<th class="col-aksi">Aksi</th></tr></thead><tbody>';
    pageData.forEach(function (a) {
      var sel = P._selected.has(a.id);
      var hasFile = a.fileUrl && a.fileUrl !== '';
      var fileLink = hasFile
        ? '<a href="' + esc(a.fileUrl) + '" target="_blank" rel="noopener" class="file-link">' +
          APP.tipeBerkasIcon(a.tipeBerkas) + ' Buka</a>'
        : '<span style="color:var(--text-muted);font-size:12px">&ndash;</span>';
      html += '<tr class="' + (sel ? 'row-selected' : '') + '">' +
        (isAdmin
          ? '<td style="width:36px;text-align:center"><input type="checkbox" class="bulk-row-check" ' +
            'data-id="' + esc(a.id) + '" ' + (sel ? 'checked' : '') +
            ' onchange="PAGE_MANAJEMEN_ARSIP._toggleSelect(\'' + esc(a.id) + '\',this.checked)"></td>'
          : '') +
        '<td class="col-nama">' +
          '<div style="font-weight:500;margin-bottom:2px">' + esc(a.namaBerkas || '&ndash;') + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted)">' + esc(a.nomorBerkas ? 'Berkas: ' + a.nomorBerkas : '') + '</div>' +
          '<div style="margin-top:4px">' + fileLink + '</div>' +
        '</td>' +
        '<td class="col-nomor"><span style="font-family:var(--font-mono);font-size:12px">' +
          esc(a.nomorDokumen || '&ndash;') + '</span></td>' +
        '<td class="col-klas">' +
          '<div style="font-family:var(--font-mono);font-size:12px;color:var(--accent)">' +
          esc(a.kodeKlasifikasi || '&ndash;') + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' +
          esc(a.namaKlasifikasi || '') + '</div>' +
        '</td>' +
        '<td class="col-tipe">' + APP.tipeBerkasBadge(a.tipeBerkas) + '</td>' +
        '<td class="col-status">' + APP.statusArsipBadge(a.statusArsip) + '</td>' +
        '<td class="col-aman">'   + APP.keamananBadge(a.klasifikasiKeamanan) + '</td>' +
        (isAdmin ? '<td class="col-dept"><span class="badge badge-muted">' +
          esc(a.departemen || '&ndash;') + '</span></td>' : '') +
        '<td class="col-aksi"><div style="display:flex;gap:6px">' +
          '<button class="btn btn-ghost btn-icon btn-sm" title="Detail" ' +
            'onclick="PAGE_MANAJEMEN_ARSIP.openDetail(\'' + esc(a.id) + '\')">&#128065;</button>' +
          (isAdmin
            ? '<button class="btn btn-ghost btn-icon btn-sm" title="Edit" ' +
              'onclick="PAGE_MANAJEMEN_ARSIP.openEdit(\'' + esc(a.id) + '\')">&#9999;</button>' +
              '<button class="btn btn-ghost btn-icon btn-sm" title="Hapus" style="color:#F47067" ' +
              'onclick="PAGE_MANAJEMEN_ARSIP.confirmDelete(\'' + esc(a.id) + '\',\'' + esc(a.namaBerkas) + '\')">&#128465;</button>'
            : '') +
        '</div></td></tr>';
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
    if (pagWrap) {
      var pag = APP.buildPagination(total, page, limit, 'PAGE_MANAJEMEN_ARSIP._goPage');
      pagWrap.innerHTML = pag || '';
      pagWrap.style.display = pag ? '' : 'none';
    }
  };

  /* ─── Search Input ───────────────────────────────────────── */
  P._onSearchInput = function (val) {
    clearTimeout(P._searchTimer);
    P._searchTimer = setTimeout(function () {
      if (val.trim()) P._filters.search = val.trim();
      else            delete P._filters.search;
      P._curPage = 1;
      P._loadArchives();
    }, 400);
  };

  /* ─── Apply Filters ─────────────────────────────────────── */
  P._applyFilters = function () {
    var f = P._filters;
    var get = function (id) { var el = document.getElementById(id); return el ? el.value : ''; };
    var pairs = [
      ['ma-filter-tipe',   'tipeBerkas'],
      ['ma-filter-jenis',  'jenisBerkas'],
      ['ma-filter-status', 'statusArsip'],
      ['ma-filter-aman',   'klasifikasiKeamanan'],
      ['ma-filter-dept',   'departemen'],
      ['ma-filter-tahun',  'tahun']
    ];
    pairs.forEach(function (p) {
      var v = get(p[0]);
      if (v) f[p[1]] = v; else delete f[p[1]];
    });
    P._curPage = 1;
    P._loadArchives();
  };

  /* ─── Render Filter Chips ───────────────────────────────── */
  P._renderChips = function () {
    var el = document.getElementById('ma-filter-chips');
    if (!el) return;
    var f = P._filters;
    var labels = { search:'&#128269; ', tipeBerkas:'Tipe: ', jenisBerkas:'Jenis: ',
      statusArsip:'Status: ', klasifikasiKeamanan:'Keamanan: ', departemen:'Dept: ',
      tahun:'Tahun: ', kodeKlasifikasi:'Klas: ' };
    el.innerHTML = Object.keys(f).filter(function (k) { return f[k]; }).map(function (k) {
      return '<span class="filter-chip" onclick="PAGE_MANAJEMEN_ARSIP._removeFilter(\'' + k + '\')">' +
        (labels[k] || k + ': ') + APP._esc(f[k]) + ' <span class="filter-chip-x">&#10005;</span></span>';
    }).join('');
  };

  /* ─── Remove Single Filter ──────────────────────────────── */
  P._removeFilter = function (key) {
    delete P._filters[key];
    var map = { search:'ma-search', tipeBerkas:'ma-filter-tipe', jenisBerkas:'ma-filter-jenis',
      statusArsip:'ma-filter-status', klasifikasiKeamanan:'ma-filter-aman',
      departemen:'ma-filter-dept', tahun:'ma-filter-tahun' };
    var el = document.getElementById(map[key]);
    if (el) el.value = '';
    P._curPage = 1;
    P._loadArchives();
  };

  /* ─── Clear All Filters ─────────────────────────────────── */
  P._clearFilters = function () {
    P._filters = {};
    ['ma-search','ma-filter-tipe','ma-filter-jenis','ma-filter-status',
     'ma-filter-aman','ma-filter-dept','ma-filter-tahun'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    P._curPage = 1;
    P._loadArchives();
  };

  /* ─── Pagination ─────────────────────────────────────────── */
  window.PAGE_MANAJEMEN_ARSIP_goPage = function (p) { P._goPage(p); };
  P._goPage = function (p) {
    P._curPage = p;
    P._renderTable();
    var pc = document.getElementById('page-content');
    if (pc) pc.scrollTop = 0;
  };

  /* ─── Open Detail ────────────────────────────────────────── */
  P.openDetail = function (archiveOrId) {
    var archive = (typeof archiveOrId === 'string')
      ? (P._archiveMap[archiveOrId] || null) : archiveOrId;
    if (!archive) { APP.toast('Data arsip tidak ditemukan.', 'warning'); return; }
    var user    = APP.currentUser;
    var isAdmin = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');
    var esc     = APP._esc;
    var body    = '';

    if (archive.fileUrl) {
      var m = archive.fileUrl.match(/(?:drive\.google\.com\/file\/d\/|id=)([^\/&?]+)/);
      var fid = m ? m[1] : (archive.fileId || null);
      var canPreview = (archive.tipeBerkas === 'Dokumen' ||
                        archive.tipeBerkas === 'Gambar'  ||
                        archive.tipeBerkas === 'Desain');
      var embedUrl = fid ? 'https://drive.google.com/file/d/' + fid + '/preview' : null;
      body += '<div style="margin-bottom:16px;border:1px solid var(--accent-border);' +
        'border-radius:var(--radius-md);overflow:hidden;background:var(--accent-soft)">' +
        '<div style="padding:12px 14px;display:flex;align-items:center;gap:10px">' +
          '<span style="font-size:22px">' + APP.tipeBerkasIcon(archive.tipeBerkas) + '</span>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:500;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
            esc(archive.fileName || archive.namaBerkas) + '</div>' +
            '<div style="font-size:11px;color:var(--text-muted)">' +
            APP.formatFileSize(archive.fileSize) + (archive.fileType ? ' &middot; ' + esc(archive.fileType) : '') + '</div>' +
          '</div>' +
          '<a href="' + esc(archive.fileUrl) + '" target="_blank" rel="noopener" ' +
          'class="btn btn-primary btn-sm">&#8599; Buka</a>' +
          (embedUrl && canPreview
            ? '<button class="btn btn-ghost btn-sm" id="btn-toggle-preview" ' +
              'onclick="PAGE_MANAJEMEN_ARSIP._togglePreview()">&#128065; Preview</button>'
            : '') +
        '</div>' +
        (embedUrl && canPreview
          ? '<div id="file-preview-wrap" style="display:none;border-top:1px solid var(--accent-border)">' +
              '<iframe id="file-preview-iframe" src="" data-src="' + esc(embedUrl) + '" ' +
                'style="width:100%;height:420px;border:none;background:#fff" allow="autoplay" allowfullscreen></iframe>' +
            '</div>'
          : '') +
      '</div>';
    }

    body += '<div class="detail-section"><div class="detail-section-title">Identitas Berkas</div>' +
      P._dr('Nama Berkas',  archive.namaBerkas) +
      P._dr('Nomor Dokumen',archive.nomorDokumen) +
      P._dr('Nomor Berkas', archive.nomorBerkas) +
      P._dr('Tipe Berkas',  APP.tipeBerkasBadge(archive.tipeBerkas), true) +
      P._dr('Jenis Berkas', archive.jenisBerkas) +
      P._dr('Kategori',     archive.kategoriBerkas) +
      P._dr('Status',       APP.statusArsipBadge(archive.statusArsip), true) +
      P._dr('Keamanan',     APP.keamananBadge(archive.klasifikasiKeamanan), true) +
    '</div>';

    body += '<div class="detail-section"><div class="detail-section-title">Klasifikasi &amp; Retensi</div>' +
      P._dr('Kode Klasifikasi',
        '<span style="font-family:var(--font-mono);color:var(--accent)">' +
        esc(archive.kodeKlasifikasi || '&ndash;') + '</span>', true) +
      P._dr('Nama Klasifikasi', archive.namaKlasifikasi) +
      P._dr('Retensi Aktif',    (archive.retensiAktif   || 0) + ' tahun') +
      P._dr('Retensi Inaktif',  (archive.retensiInaktif || 0) + ' tahun') +
      P._dr('Penyusutan Akhir', archive.penyusutanAkhir) +
      P._dr('Tgl Musnah',
        '<span style="color:var(--warning)">' + esc(archive.tglMusnah || '&ndash;') + '</span>', true) +
    '</div>';

    body += '<div class="detail-section"><div class="detail-section-title">Penyimpanan &amp; Metadata</div>' +
      P._dr('Lokasi Simpan', archive.lokasiSimpan) +
      P._dr('Departemen',
        '<span class="badge badge-muted">' + esc(archive.departemen || '&ndash;') + '</span>', true) +
      P._dr('Tgl Dokumen',   archive.tanggalDokumen) +
      P._dr('Tahun',         archive.tahunDokumen) +
      P._dr('Diupload oleh', archive.uploadedBy) +
      P._dr('Dibuat',        archive.createdAt) +
      P._dr('Diperbarui',    archive.updatedAt) +
    '</div>';

    if (archive.tanggalDeadline) {
      body += '<div class="detail-section"><div class="detail-section-title">Deadline &amp; Reminder</div>' +
        P._dr('Tanggal Deadline',
          '<span style="color:var(--warning);font-weight:600">' + esc(archive.tanggalDeadline) + '</span>', true) +
        P._dr('Reminder', (archive.reminderHari || 30) + ' hari sebelum deadline') +
      '</div>';
    }

    if (archive.keterangan) {
      body += '<div class="detail-section"><div class="detail-section-title">Keterangan</div>' +
        '<div style="font-size:13px;color:var(--text-secondary);line-height:1.6;' +
          'background:var(--bg-elevated);padding:12px;border-radius:var(--radius-md)">' +
          esc(archive.keterangan) + '</div></div>';
    }

    body += '<div class="detail-section">' +
      '<div class="detail-section-title" style="margin-bottom:8px">&#128206; Dokumen Terkait</div>' +
      '<div id="related-docs-list" style="font-size:12px;color:var(--text-muted)">Memuat&hellip;</div>' +
    '</div>';

    body += '<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">' +
      '<button class="btn btn-ghost btn-sm" onclick="PAGE_MANAJEMEN_ARSIP._toggleQR()">&#128241; QR Code</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="PAGE_MANAJEMEN_ARSIP._printLabel()">&#127991; Cetak Label</button>' +
    '</div>' +
    '<div id="qr-container" style="display:none;text-align:center;margin-top:12px;' +
      'padding:16px;background:var(--bg-elevated);border-radius:var(--radius-md)"></div>';

    P._currentArchive  = archive;
    P._currentDetailId = archive.id;
    P._previewOpen     = false;

    var footerHtml = isAdmin
      ? '<button class="btn btn-secondary" onclick="APP.closeDrawer()">Tutup</button>' +
        '<button class="btn btn-ghost" style="color:#F47067" ' +
          'onclick="APP.closeDrawer();PAGE_MANAJEMEN_ARSIP.confirmDelete(\'' +
          esc(archive.id) + '\',\'' + esc(archive.namaBerkas) + '\')">&#128465; Hapus</button>' +
        '<button class="btn btn-primary" ' +
          'onclick="APP.closeDrawer();PAGE_MANAJEMEN_ARSIP.openEdit(\'' +
          esc(archive.id) + '\')">&#9999; Edit</button>'
      : '<button class="btn btn-primary" onclick="APP.closeDrawer()">Tutup</button>';

    APP.openDrawer({
      title: '&#128194; Detail Berkas', bodyHtml: body, footerHtml: footerHtml,
      onClose: function () {
        P._currentDetailId = null;
        P._currentArchive  = null;
        P._previewOpen     = false;
      }
    });
    setTimeout(function () { P._loadRelated(archive.id); }, 250);
  };

  /* ─── Detail Row Helper ─────────────────────────────────── */
  P._dr = function (label, value, isHtml) {
    var valHtml = isHtml
      ? (value || '<span style="color:var(--text-muted)">&ndash;</span>')
      : '<span>' + APP._esc(value != null && value !== '' ? String(value) : '&ndash;') + '</span>';
    return '<div class="detail-row">' +
      '<div class="detail-label">' + APP._esc(label) + '</div>' +
      '<div class="detail-value">' + valHtml + '</div></div>';
  };

  /* ─── Open Edit ──────────────────────────────────────────── */
  P.openEdit = function (id) {
    var c = APP.constants || {};
    var esc = APP._esc;
    APP.call('getArchive', [APP.token, id], function (result) {
      if (!result || !result.success) {
        APP.toast((result && result.message) || 'Berkas tidak ditemukan.', 'danger');
        return;
      }
      var a = result.data;
      var klas = P._klasList;
      var klasOpts = '<option value="">-- Pilih Klasifikasi --</option>' +
        klas.map(function (k) {
          return '<option value="' + esc(k.kode) + '"' +
            (a.kodeKlasifikasi === k.kode ? ' selected' : '') + '>' +
            esc(k.kode + ' \u00b7 ' + k.namaKlasifikasi) + '</option>';
        }).join('');
      var mkOpts = function (arr, cur) {
        return '<option value="">-- Pilih --</option>' + (arr||[]).map(function (v) {
          return '<option value="' + esc(v) + '"' + (cur === v ? ' selected' : '') + '>' + esc(v) + '</option>';
        }).join('');
      };
      var jOpts = '<option value="">-- Pilih Jenis --</option>' + (c.jenisBerkas||[]).map(function (v) {
        return '<option value="' + esc(v) + '"' + (a.jenisBerkas === v ? ' selected' : '') + '>' + esc(v) + '</option>';
      }).join('');
      var kOpts = '<option value="">-- Pilih Kategori --</option>' + (c.kategoriBerkas||[]).map(function (v) {
        return '<option value="' + esc(v) + '"' + (a.kategoriBerkas === v ? ' selected' : '') + '>' + esc(v) + '</option>';
      }).join('');

      var body = '<div id="edit-form" class="edit-form">' +
        '<div class="form-row col-2">' +
          '<div class="form-group"><label class="form-label">Nama Berkas <span class="required">*</span></label>' +
            '<input type="text" name="namaBerkas" class="form-control" value="' + esc(a.namaBerkas||'') + '"></div>' +
          '<div class="form-group"><label class="form-label">Nomor Dokumen <span class="required">*</span></label>' +
            '<input type="text" name="nomorDokumen" class="form-control" value="' + esc(a.nomorDokumen||'') + '"></div>' +
        '</div>' +
        '<div class="form-row col-2">' +
          '<div class="form-group"><label class="form-label">Kode Klasifikasi <span class="required">*</span></label>' +
            '<select name="kodeKlasifikasi" class="form-control">' + klasOpts + '</select></div>' +
          '<div class="form-group"><label class="form-label">Jenis Berkas <span class="required">*</span></label>' +
            '<select name="jenisBerkas" class="form-control">' + jOpts + '</select></div>' +
        '</div>' +
        '<div class="form-row col-2">' +
          '<div class="form-group"><label class="form-label">Kategori Berkas <span class="required">*</span></label>' +
            '<select name="kategoriBerkas" class="form-control">' + kOpts + '</select></div>' +
          '<div class="form-group"><label class="form-label">Status Arsip</label>' +
            '<select name="statusArsip" class="form-control">' + mkOpts(c.statusArsip, a.statusArsip) + '</select></div>' +
        '</div>' +
        '<div class="form-row col-2">' +
          '<div class="form-group"><label class="form-label">Klasifikasi Keamanan</label>' +
            '<select name="klasifikasiKeamanan" class="form-control">' + mkOpts(c.keamanan, a.klasifikasiKeamanan) + '</select></div>' +
          '<div class="form-group"><label class="form-label">Penyusutan Akhir</label>' +
            '<select name="penyusutanAkhir" class="form-control">' + mkOpts(c.penyusutan, a.penyusutanAkhir) + '</select></div>' +
        '</div>' +
        '<div class="form-row col-2">' +
          '<div class="form-group"><label class="form-label">Retensi Aktif (thn)</label>' +
            '<input type="number" name="retensiAktif" class="form-control" min="0" value="' +
            esc(String(a.retensiAktif||0)) + '"></div>' +
          '<div class="form-group"><label class="form-label">Retensi Inaktif (thn)</label>' +
            '<input type="number" name="retensiInaktif" class="form-control" min="0" value="' +
            esc(String(a.retensiInaktif||0)) + '"></div>' +
        '</div>' +
        '<div class="form-row col-2">' +
          '<div class="form-group"><label class="form-label">Nomor Berkas</label>' +
            '<input type="text" name="nomorBerkas" class="form-control" value="' + esc(a.nomorBerkas||'') + '"></div>' +
          '<div class="form-group"><label class="form-label">Lokasi Simpan</label>' +
            '<input type="text" name="lokasiSimpan" class="form-control" value="' + esc(a.lokasiSimpan||'') + '"></div>' +
        '</div>' +
        '<div class="form-row col-2">' +
          '<div class="form-group"><label class="form-label">Tanggal Deadline</label>' +
            '<input type="date" name="tanggalDeadline" class="form-control" value="' + esc(a.tanggalDeadline||'') + '"></div>' +
          '<div class="form-group"><label class="form-label">Reminder (hari)</label>' +
            '<input type="number" name="reminderHari" class="form-control" min="1" max="365" value="' +
            esc(String(a.reminderHari||30)) + '"></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Keterangan</label>' +
          '<textarea name="keterangan" class="form-control" rows="3">' + esc(a.keterangan||'') + '</textarea></div>' +
      '</div>';

      APP.openDrawer({
        title: '&#9999; Edit Berkas', bodyHtml: body,
        footerHtml: '<button class="btn btn-secondary" onclick="APP.closeDrawer()">Batal</button>' +
          '<button class="btn btn-primary" id="btn-save-edit" ' +
          'onclick="PAGE_MANAJEMEN_ARSIP._submitEdit(\'' + esc(id) + '\')">Simpan Perubahan</button>'
      });
    });
  };

  /* ─── Submit Edit ────────────────────────────────────────── */
  P._submitEdit = function (id) {
    if (!APP.validateForm('edit-form', ['namaBerkas','nomorDokumen','kodeKlasifikasi',
        'jenisBerkas','kategoriBerkas'])) {
      APP.toast('Lengkapi field yang wajib diisi.', 'warning');
      return;
    }
    var data = APP.readForm('edit-form');
    data.retensiAktif   = Number(data.retensiAktif   || 0);
    data.retensiInaktif = Number(data.retensiInaktif || 0);
    data.reminderHari   = Number(data.reminderHari   || 30);
    var btn = document.getElementById('btn-save-edit');
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan\u2026'; }
    APP.call('updateArchive', [APP.token, id, data], function (result) {
      if (btn) { btn.disabled = false; btn.textContent = 'Simpan Perubahan'; }
      if (result && result.success) {
        APP.toast(result.message || 'Berkas berhasil diperbarui.', 'success');
        APP.closeDrawer();
        P._loadArchives();
      } else {
        APP.toast((result && result.message) || 'Gagal memperbarui.', 'danger');
      }
    });
  };

  /* ─── Confirm Delete ─────────────────────────────────────── */
  P.confirmDelete = function (id, nama) {
    APP.confirm({
      icon:'&#128465;', title:'Hapus Berkas',
      msg:'Berkas "' + (nama||id) + '" akan dihapus dari sistem.',
      okLabel:'Hapus', okClass:'btn-danger', cancelLabel:'Batal'
    }).then(function (ok) {
      if (!ok) return;
      APP.call('deleteArchive', [APP.token, id], function (result) {
        if (result && result.success) {
          APP.toast(result.message || 'Berhasil dihapus.', 'success');
          P._loadArchives();
        } else {
          APP.toast((result && result.message) || 'Gagal menghapus.', 'danger');
        }
      });
    });
  };

  /* ─── Export CSV ─────────────────────────────────────────── */
  P._exportCSV = function () {
    var f = P._filters;
    var sf = {};
    ['search','kodeKlasifikasi','jenisBerkas','tipeBerkas','departemen',
     'statusArsip','klasifikasiKeamanan','tahun'].forEach(function (k) {
      if (f[k]) sf[k] = f[k];
    });
    APP.call('exportArchivesCSV', [APP.token, sf], function (result) {
      if (!result || !result.success) {
        APP.toast((result && result.message) || 'Gagal export.', 'danger');
        return;
      }
      APP.downloadText(result.data,
        'earsip-arsip-' + new Date().toISOString().slice(0,10) + '.csv',
        'text/csv;charset=utf-8');
      APP.toast('Export CSV berhasil.', 'success');
    });
  };

  /* ─── Refresh ────────────────────────────────────────────── */
  P.refresh = function () { P._loadArchives(); };

  /* ─── Bulk Selection ─────────────────────────────────────── */
  P._toggleSelect = function (id, checked) {
    if (checked) P._selected.add(id);
    else         P._selected.delete(id);
    P._updateBulkBar();
  };

  P._toggleSelectAll = function (checked) {
    var ids = P._filtered.slice(
      (P._curPage - 1) * P._limit,
      P._curPage * P._limit
    ).map(function (a) { return a.id; });
    ids.forEach(function (id) {
      if (checked) P._selected.add(id);
      else         P._selected.delete(id);
    });
    document.querySelectorAll('.bulk-row-check').forEach(function (cb) { cb.checked = checked; });
    P._updateBulkBar();
  };

  P._clearSelection = function () {
    P._selected = new Set();
    document.querySelectorAll('.bulk-row-check').forEach(function (cb) { cb.checked = false; });
    var ac = document.getElementById('bulk-check-all');
    if (ac) ac.checked = false;
    P._updateBulkBar();
  };

  P._updateBulkBar = function () {
    var n   = P._selected.size;
    var bar = document.getElementById('bulk-action-bar');
    var lbl = document.getElementById('bulk-count-label');
    if (bar) bar.style.display = n > 0 ? 'flex' : 'none';
    if (lbl) lbl.textContent = n + ' berkas dipilih';
  };

  /* ─── Bulk Change Status ─────────────────────────────────── */
  P._bulkChangeStatus = function () {
    var ids = Array.from(P._selected);
    var st  = (document.getElementById('bulk-status-select')||{}).value || '';
    if (!ids.length) { APP.toast('Pilih berkas terlebih dahulu.', 'warning'); return; }
    if (!st)         { APP.toast('Pilih status yang akan diterapkan.', 'warning'); return; }
    APP.confirm({
      icon:'&#9881;', title:'Bulk Ubah Status',
      msg:'Ubah ' + ids.length + ' berkas ke status "' + st + '"?',
      okLabel:'Ya, Ubah', okClass:'btn-primary', cancelLabel:'Batal'
    }).then(function (ok) {
      if (!ok) return;
      APP.call('bulkUpdateArchives', [APP.token, ids, { statusArsip: st }], function (result) {
        if (result && result.success) {
          APP.toast(result.message, 'success');
          P._clearSelection();
          P._loadArchives();
        } else {
          APP.toast((result && result.message) || 'Gagal bulk update.', 'danger');
        }
      });
    });
  };

  /* ─── Bulk Export ────────────────────────────────────────── */
  P._bulkExport = function () {
    var ids = Array.from(P._selected);
    if (!ids.length) { APP.toast('Pilih berkas terlebih dahulu.', 'warning'); return; }
    APP.call('bulkExportArchives', [APP.token, ids], function (result) {
      if (result && result.success) {
        APP.downloadText(result.data,
          'earsip-selected-' + new Date().toISOString().slice(0,10) + '.csv',
          'text/csv;charset=utf-8');
        APP.toast(result.count + ' berkas diekspor.', 'success');
      } else {
        APP.toast((result && result.message) || 'Gagal export.', 'danger');
      }
    });
  };

  /* ─── Toggle Preview ─────────────────────────────────────── */
  P._togglePreview = function () {
    var wrap   = document.getElementById('file-preview-wrap');
    var iframe = document.getElementById('file-preview-iframe');
    var btn    = document.getElementById('btn-toggle-preview');
    if (!wrap) return;
    P._previewOpen = !P._previewOpen;
    if (P._previewOpen) {
      if (iframe && iframe.dataset.src) iframe.src = iframe.dataset.src;
      wrap.style.display = 'block';
      if (btn) btn.textContent = '\u2715 Tutup Preview';
    } else {
      if (iframe) iframe.src = '';
      wrap.style.display = 'none';
      if (btn) btn.textContent = '\uD83D\uDC41 Preview';
    }
  };

  /* ─── Load Related Archives ──────────────────────────────── */
  P._loadRelated = function (archiveId) {
    var list = document.getElementById('related-docs-list');
    if (!list) return;
    APP.call('getRelatedArchives', [APP.token, archiveId], function (result) {
      var esc = APP._esc;
      if (!result || !result.success || !result.data || !result.data.length) {
        list.innerHTML = '<span style="color:var(--text-muted)">Tidak ada dokumen terkait.</span>';
        return;
      }
      list.innerHTML = result.data.map(function (a) {
        return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;' +
          'border-bottom:1px solid var(--border)">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:12px;font-weight:500;overflow:hidden;' +
            'text-overflow:ellipsis;white-space:nowrap">' + esc(a.namaBerkas) + '</div>' +
            '<div style="font-size:11px;color:var(--text-muted)">' +
            esc(a.nomorDokumen || '\u2013') + ' \u00b7 ' + esc(a.departemen || '') + '</div>' +
          '</div>' +
          APP.statusArsipBadge(a.statusArsip) +
          '<button class="btn btn-ghost btn-icon btn-sm" title="Lihat detail" ' +
            'onclick="APP.closeDrawer();setTimeout(function(){PAGE_MANAJEMEN_ARSIP.openDetail(\'' +
            esc(a.id) + '\');},200)">\uD83D\uDC41</button>' +
        '</div>';
      }).join('');
    }, { noLoading: true, silent: true });
  };

  /* ─── Toggle QR ──────────────────────────────────────────── */
  P._toggleQR = function () {
    var container = document.getElementById('qr-container');
    var archive   = P._currentArchive;
    if (!container || !archive) return;
    if (container.style.display !== 'none') { container.style.display = 'none'; return; }
    var appUrl = window.location.href.split('?')[0] +
      '?archiveId=' + encodeURIComponent(archive.id);
    var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' +
      encodeURIComponent(appUrl);
    var esc = APP._esc;
    container.innerHTML =
      '<div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:8px">' +
      'QR CODE ARSIP</div>' +
      '<img src="' + esc(qrUrl) + '" width="180" height="180" alt="QR" ' +
      'style="border:8px solid #fff;border-radius:8px">' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:8px">' +
      esc(archive.nomorBerkas||archive.id) + '</div>' +
      '<div style="font-size:10px;color:var(--text-muted);margin-top:2px">' +
      esc(archive.namaBerkas||'') + '</div>' +
      '<a href="' + esc(qrUrl) + '" download="qr-' + esc(archive.nomorBerkas||archive.id) +
      '.png" class="btn btn-ghost btn-sm" style="margin-top:10px">&#8595; Unduh QR</a>';
    container.style.display = 'block';
  };

  /* ─── Print Label ────────────────────────────────────────── */
  P._printLabel = function () {
    var archive = P._currentArchive;
    if (!archive) { APP.toast('Data arsip tidak ditemukan.', 'warning'); return; }
    var appName = (APP._meta && APP._meta.appName) || 'E-ARSIP DIO';
    var appUrl  = window.location.href.split('?')[0] +
      '?archiveId=' + encodeURIComponent(archive.id);
    var qrUrl   = 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=' +
      encodeURIComponent(appUrl);
    var pw = window.open('', '_blank', 'width=440,height=360');
    if (!pw) {
      APP.toast('Popup diblokir. Izinkan popup untuk halaman ini.', 'warning');
      return;
    }
    pw.document.write('<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<title>Label Arsip</title><style>' +
      '@page{size:10cm 6cm;margin:0}' +
      'body{margin:0;font-family:Arial,sans-serif;-webkit-print-color-adjust:exact;' +
      'print-color-adjust:exact}' +
      '.lbl{width:10cm;height:6cm;border:2px solid #1B2A4A;box-sizing:border-box;' +
      'display:flex;flex-direction:column;padding:6px 8px}' +
      '.lh{background:#1B2A4A;color:#fff;padding:3px 6px;font-size:9px;font-weight:700;' +
      'text-align:center;letter-spacing:.1em;margin:-6px -8px 6px -8px}' +
      '.lb{display:flex;flex:1;gap:6px}.lt{flex:1;min-width:0}' +
      '.ln{font-size:11px;font-weight:700;line-height:1.3;margin-bottom:4px}' +
      '.lk{font-size:16px;font-weight:900;color:#1B2A4A;margin-top:4px}' +
      '.lr{font-size:9px;color:#333;line-height:1.5}' +
      '.lq{flex-shrink:0;text-align:center}.lq img{width:96px;height:96px}' +
      '.lqn{font-size:8px;color:#555;margin-top:2px}' +
      '.lf{font-size:8px;color:#666;text-align:right;margin-top:4px;' +
      'border-top:1px solid #ddd;padding-top:2px}' +
      '@media print{button{display:none}}</style></head><body>' +
      '<div class="lbl"><div class="lh">' + appName.toUpperCase() + '</div>' +
      '<div class="lb"><div class="lt">' +
        '<div class="ln">' + (archive.namaBerkas||'').substring(0,60) + '</div>' +
        '<div class="lk">' + (archive.kodeKlasifikasi||'') + '</div>' +
        '<div class="lr">No. Berkas : ' + (archive.nomorBerkas||'-') + '</div>' +
        '<div class="lr">Departemen : ' + (archive.departemen||'-') + '</div>' +
        '<div class="lr">Tahun      : ' + (archive.tahunDokumen||'-') + '</div>' +
        '<div class="lr">Status     : ' + (archive.statusArsip||'-') + '</div>' +
      '</div>' +
      '<div class="lq"><img src="' + qrUrl + '" alt="QR"><div class="lqn">Scan detail</div></div>' +
      '</div><div class="lf">' + new Date().toLocaleDateString('id-ID') +
      ' &middot; ' + (archive.klasifikasiKeamanan||'') + '</div></div>' +
      '<div style="margin-top:12px;text-align:center">' +
      '<button onclick="window.print()" style="padding:8px 20px;background:#1B2A4A;' +
      'color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">' +
      '&#128424; Cetak</button></div>' +
      '</body></html>');
    pw.document.close();
  };

})();
