/* ═══════════════════════════════════════════════════════════════
   Page_Peminjaman — E-ARSIP DIO
   Exposes: window.PAGE_PEMINJAMAN
   Access: SUPER_ADMIN, ADMIN

   Code.gs functions:
     getLoanRecords(token, filters?) → {success, data[], total}
       filters: { status?, archiveId? }
       data[]: id, archiveId, namaBerkas, nomorBerkas,
               peminjamUsername, peminjamFullname,
               tglPinjam, tglKembaliRencana, tglKembaliAktual,
               status, catatan, createdAt
     createLoan(token, {archiveId, peminjamUsername, tglPinjam, tglKembaliRencana, catatan})
       → {success, message, id}
     returnLoan(token, loanId, catatan?) → {success, message}
     getUsers(token) → {success, data[]} — for peminjam select
     getArchives(token, {search}) → {success, data[]} — for archive search
═══════════════════════════════════════════════════════════════ */

window.PAGE_PEMINJAMAN = {};
PAGE_PEMINJAMAN._data        = [];
PAGE_PEMINJAMAN._filterStatus= '';
PAGE_PEMINJAMAN._userList    = [];
PAGE_PEMINJAMAN._searchTimer = null;

PAGE_PEMINJAMAN.render = function (params) {
  var pc = document.getElementById('page-content');
  if (!pc) return;
  PAGE_PEMINJAMAN._data        = [];
  PAGE_PEMINJAMAN._filterStatus= '';
  pc.innerHTML = PAGE_PEMINJAMAN._shellHtml();
  PAGE_PEMINJAMAN._loadUsers();
  PAGE_PEMINJAMAN._load();
};

PAGE_PEMINJAMAN._shellHtml = function () {
  return (
    '<div class="page-header">' +
      '<div class="page-header-left">' +
        '<h1 class="page-title">Peminjaman Arsip</h1>' +
        '<p class="page-subtitle">Kelola peminjaman dan pengembalian arsip fisik</p>' +
      '</div>' +
      '<div class="page-header-actions">' +
        '<button class="btn btn-secondary btn-sm" onclick="PAGE_PEMINJAMAN._load()">&#8635; Perbarui</button>' +
        '<button class="btn btn-primary btn-sm" onclick="PAGE_PEMINJAMAN._openPinjamForm()">+ Catat Peminjaman</button>' +
      '</div>' +
    '</div>' +

    '<div class="tab-bar" style="margin-bottom:16px">' +
      '<button class="tab-btn active" id="ptab-all"       onclick="PAGE_PEMINJAMAN._setFilter(\'\')">Semua</button>' +
      '<button class="tab-btn"        id="ptab-dipinjam"  onclick="PAGE_PEMINJAMAN._setFilter(\'Dipinjam\')">&#128308; Dipinjam</button>' +
      '<button class="tab-btn"        id="ptab-terlambat" onclick="PAGE_PEMINJAMAN._setFilter(\'Terlambat\')">&#9888;&#65039; Terlambat</button>' +
      '<button class="tab-btn"        id="ptab-kembali"   onclick="PAGE_PEMINJAMAN._setFilter(\'Dikembalikan\')">&#9989; Dikembalikan</button>' +
    '</div>' +

    '<div class="card">' +
      '<div class="card-header">' +
        '<span class="card-title" id="pinjam-count">&#128218; Memuat&hellip;</span>' +
      '</div>' +
      '<div id="pinjam-table-wrap" class="table-wrap">' +
        APP.skeletonTableHtml(7, 5) +
      '</div>' +
    '</div>'
  );
};

PAGE_PEMINJAMAN._loadUsers = function () {
  APP.call('getUsers', [APP.token], function (r) {
    PAGE_PEMINJAMAN._userList = (r && r.success && r.data) ? r.data : [];
  }, { noLoading: true, silent: true });
};

PAGE_PEMINJAMAN._load = function () {
  var wrap = document.getElementById('pinjam-table-wrap');
  if (wrap) wrap.innerHTML = APP.skeletonTableHtml(7, 5);
  var filters = {};
  if (PAGE_PEMINJAMAN._filterStatus) filters.status = PAGE_PEMINJAMAN._filterStatus;
  APP.call('getLoanRecords', [APP.token, filters], function (result) {
    if (!result || !result.success) {
      if (wrap) wrap.innerHTML = APP.emptyStateHtml('&#9888;', 'Gagal memuat', (result && result.message) || '');
      return;
    }
    PAGE_PEMINJAMAN._data = result.data || [];
    PAGE_PEMINJAMAN._render();
  }, { noLoading: true });
};

PAGE_PEMINJAMAN._setFilter = function (status) {
  PAGE_PEMINJAMAN._filterStatus = status;
  ['all','dipinjam','terlambat','kembali'].forEach(function (k) {
    var btn = document.getElementById('ptab-' + k);
    if (btn) btn.classList.remove('active');
  });
  var activeId = status === 'Dipinjam' ? 'ptab-dipinjam' :
                 status === 'Terlambat' ? 'ptab-terlambat' :
                 status === 'Dikembalikan' ? 'ptab-kembali' : 'ptab-all';
  var activeBtn = document.getElementById(activeId);
  if (activeBtn) activeBtn.classList.add('active');
  PAGE_PEMINJAMAN._load();
};

PAGE_PEMINJAMAN._render = function () {
  var wrap    = document.getElementById('pinjam-table-wrap');
  var countEl = document.getElementById('pinjam-count');
  var data    = PAGE_PEMINJAMAN._data;
  var esc     = APP._esc;

  if (countEl) countEl.textContent = '\uD83D\uDCDA ' + data.length + ' Catatan Peminjaman';

  if (!data || data.length === 0) {
    wrap.innerHTML = APP.emptyStateHtml('\uD83D\uDCDA', 'Tidak ada data peminjaman',
      PAGE_PEMINJAMAN._filterStatus
        ? 'Tidak ada peminjaman dengan status "' + PAGE_PEMINJAMAN._filterStatus + '".'
        : 'Belum ada catatan peminjaman arsip fisik.',
      '<button class="btn btn-primary" onclick="PAGE_PEMINJAMAN._openPinjamForm()">+ Catat Peminjaman</button>');
    return;
  }

  var html = '<table class="data-table"><thead><tr>' +
    '<th>Arsip</th><th>Peminjam</th><th>Tgl Pinjam</th>' +
    '<th>Rencana Kembali</th><th>Aktual Kembali</th>' +
    '<th>Status</th><th>Aksi</th>' +
  '</tr></thead><tbody>';

  data.forEach(function (r) {
    var statusCls = r.status === 'Terlambat' ? 'loan-status-terlambat' :
                   r.status === 'Dipinjam'  ? 'loan-status-dipinjam'  :
                   'loan-status-kembali';
    var rowCls = r.status === 'Terlambat' ? 'loan-row-terlambat' :
                 r.status === 'Dipinjam'  ? 'loan-row-dipinjam'  : '';

    html += '<tr class="' + rowCls + '">' +
      '<td>' +
        '<div style="font-weight:500;font-size:13px">' + esc(r.namaBerkas || '&ndash;') + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">' + esc(r.nomorBerkas || '') + '</div>' +
      '</td>' +
      '<td>' +
        '<div style="font-size:13px">' + esc(r.peminjamFullname || r.peminjamUsername || '&ndash;') + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted)">@' + esc(r.peminjamUsername || '') + '</div>' +
      '</td>' +
      '<td style="font-size:12px">' + esc(r.tglPinjam || '&ndash;') + '</td>' +
      '<td style="font-size:12px;' + (r.status === 'Terlambat' ? 'color:var(--danger);font-weight:600' : '') + '">' +
        esc(r.tglKembaliRencana || '&ndash;') +
      '</td>' +
      '<td style="font-size:12px;color:var(--success)">' + esc(r.tglKembaliAktual || '&ndash;') + '</td>' +
      '<td><span class="' + statusCls + '">' + esc(r.status) + '</span></td>' +
      '<td>' +
        (r.status !== 'Dikembalikan'
          ? '<button class="btn btn-success btn-sm" ' +
              'onclick="PAGE_PEMINJAMAN._returnLoan(\'' + esc(r.id) + '\',\'' + esc(r.namaBerkas) + '\')">&#9989; Kembalikan</button>'
          : '<span style="font-size:11px;color:var(--text-muted)">Selesai</span>') +
      '</td>' +
    '</tr>';
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;
};

PAGE_PEMINJAMAN._openPinjamForm = function () {
  var esc   = APP._esc;
  var users = PAGE_PEMINJAMAN._userList;
  var userOpts = '<option value="">-- Pilih Peminjam --</option>' +
    users.map(function (u) {
      return '<option value="' + esc(u.username) + '">' +
        esc(u.fullname + ' (@' + u.username + ')') + '</option>';
    }).join('');

  var today = new Date().toISOString().slice(0, 10);

  var body =
    '<div id="pinjam-form">' +
      '<div class="form-group">' +
        '<label class="form-label">Cari Arsip <span class="required">*</span></label>' +
        '<div style="display:flex;gap:8px">' +
          '<input type="text" id="pinjam-arsip-search" class="form-control" ' +
            'placeholder="Ketik nama atau nomor berkas&hellip;" ' +
            'oninput="PAGE_PEMINJAMAN._searchArsip(this.value)">' +
        '</div>' +
        '<div id="pinjam-arsip-results" style="margin-top:6px;max-height:180px;overflow-y:auto;' +
          'border:1px solid var(--border);border-radius:var(--radius-md);display:none"></div>' +
        '<input type="hidden" id="pinjam-arsip-id">' +
        '<div id="pinjam-arsip-selected" style="margin-top:6px;font-size:12px;color:var(--accent)"></div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Peminjam <span class="required">*</span></label>' +
        '<select id="pinjam-user" class="form-control">' + userOpts + '</select>' +
      '</div>' +
      '<div class="form-row col-2">' +
        '<div class="form-group">' +
          '<label class="form-label">Tanggal Pinjam</label>' +
          '<input type="date" id="pinjam-tgl-pinjam" class="form-control" value="' + today + '">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Rencana Kembali <span class="required">*</span></label>' +
          '<input type="date" id="pinjam-tgl-kembali" class="form-control">' +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Catatan</label>' +
        '<textarea id="pinjam-catatan" class="form-control" rows="2" placeholder="Keperluan peminjaman&hellip;"></textarea>' +
      '</div>' +
    '</div>';

  APP.openDrawer({
    title: '+ Catat Peminjaman Arsip Fisik',
    bodyHtml: body,
    footerHtml:
      '<button class="btn btn-secondary" onclick="APP.closeDrawer()">Batal</button>' +
      '<button class="btn btn-primary" id="btn-pinjam-save" onclick="PAGE_PEMINJAMAN._saveLoan()">Simpan</button>'
  });
};

PAGE_PEMINJAMAN._searchArsip = function (val) {
  clearTimeout(PAGE_PEMINJAMAN._searchTimer);
  var results = document.getElementById('pinjam-arsip-results');
  if (!val || val.length < 2) {
    if (results) results.style.display = 'none';
    return;
  }
  PAGE_PEMINJAMAN._searchTimer = setTimeout(function () {
    APP.call('getArchives', [APP.token, { search: val }], function (r) {
      if (!results) return;
      var data = (r && r.success && r.data) ? r.data.slice(0, 8) : [];
      if (data.length === 0) {
        results.style.display = 'none';
        return;
      }
      var esc = APP._esc;
      results.innerHTML = data.map(function (a) {
        return '<div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:12px" ' +
          'onmouseover="this.style.background=\'var(--bg-elevated)\'" ' +
          'onmouseout="this.style.background=\'\'" ' +
          'onclick="PAGE_PEMINJAMAN._selectArsip(\'' + esc(a.id) + '\',\'' +
            esc(a.namaBerkas) + '\',\'' + esc(a.nomorBerkas||'') + '\')">' +
          '<div style="font-weight:500">' + esc(a.namaBerkas) + '</div>' +
          '<div style="color:var(--text-muted)">' + esc(a.nomorBerkas||a.nomorDokumen||'') + ' &middot; ' + esc(a.departemen||'') + '</div>' +
        '</div>';
      }).join('');
      results.style.display = 'block';
    }, { noLoading: true, silent: true });
  }, 400);
};

PAGE_PEMINJAMAN._selectArsip = function (id, nama, nomor) {
  var idEl  = document.getElementById('pinjam-arsip-id');
  var selEl = document.getElementById('pinjam-arsip-selected');
  var srEl  = document.getElementById('pinjam-arsip-results');
  var inEl  = document.getElementById('pinjam-arsip-search');
  if (idEl)  idEl.value = id;
  if (selEl) selEl.innerHTML = '&#9989; Terpilih: <strong>' + APP._esc(nama) + '</strong>' +
    (nomor ? ' <span style="color:var(--text-muted)">[' + APP._esc(nomor) + ']</span>' : '');
  if (srEl)  srEl.style.display = 'none';
  if (inEl)  inEl.value = nama;
};

PAGE_PEMINJAMAN._saveLoan = function () {
  var get = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
  var archiveId = get('pinjam-arsip-id');
  var user      = get('pinjam-user');
  var kembali   = get('pinjam-tgl-kembali');
  if (!archiveId) { APP.toast('Pilih arsip yang dipinjam.', 'warning'); return; }
  if (!user)      { APP.toast('Pilih peminjam.', 'warning'); return; }
  if (!kembali)   { APP.toast('Isi tanggal rencana kembali.', 'warning'); return; }

  var btn = document.getElementById('btn-pinjam-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan\u2026'; }

  APP.call('createLoan', [APP.token, {
    archiveId        : archiveId,
    peminjamUsername : user,
    tglPinjam        : get('pinjam-tgl-pinjam'),
    tglKembaliRencana: kembali,
    catatan          : get('pinjam-catatan')
  }], function (result) {
    if (btn) { btn.disabled = false; btn.textContent = 'Simpan'; }
    if (result && result.success) {
      APP.toast('Peminjaman berhasil dicatat.', 'success');
      APP.closeDrawer();
      PAGE_PEMINJAMAN._load();
    } else {
      APP.toast((result && result.message) || 'Gagal mencatat peminjaman.', 'danger');
    }
  });
};

PAGE_PEMINJAMAN._returnLoan = function (loanId, namaBerkas) {
  APP.confirm({
    icon:'&#9989;', title:'Konfirmasi Pengembalian',
    msg:'Arsip "' + namaBerkas + '" telah dikembalikan?',
    okLabel:'Ya, Sudah Kembali', okClass:'btn-success', cancelLabel:'Batal'
  }).then(function (ok) {
    if (!ok) return;
    APP.call('returnLoan', [APP.token, loanId, ''], function (result) {
      if (result && result.success) {
        APP.toast('Pengembalian berhasil dicatat.', 'success');
        PAGE_PEMINJAMAN._load();
      } else {
        APP.toast((result && result.message) || 'Gagal mencatat pengembalian.', 'danger');
      }
    });
  });
};
