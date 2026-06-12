/* ═══════════════════════════════════════════════════════════════
   Page_Klasifikasi — E-ARSIP DIO
   Exposes: window.PAGE_KLASIFIKASI
   Access: SUPER_ADMIN, ADMIN only

   Tabs:
     1. Klasifikasi & JRA — kode klasifikasi (getClassifications)
     2. Jenis Berkas       — master data (getJenisBerkas + CRUD)
     3. Kategori Berkas    — master data (getKategoriBerkas + CRUD)

   Code.gs functions — Klasifikasi:
     getClassifications(token)           → { success, data[] }
       data[].id, .kode, .namaKlasifikasi, .deskripsi, .indukKode,
       .level, .retensiAktif, .retensiInaktif, .ketRetensiAktif,
       .ketRetensiInaktif, .penyusutanAkhir, .hakAkses,
       .klasifikasiKeamanan, .status, .catatanKlasifikasi, .createdAt
     addClassification(token, d)         → { success, message }
       required: d.kode, d.namaKlasifikasi, d.penyusutanAkhir
       optional: d.deskripsi, d.retensiAktif, d.retensiInaktif,
                 d.ketRetensiAktif, d.ketRetensiInaktif, d.hakAkses,
                 d.klasifikasiKeamanan, d.status, d.catatanKlasifikasi
     updateClassification(token, id, d)  → { success, message }
     deleteClassification(token, id)     → { success, message }

   Code.gs functions — Master Data:
     getJenisBerkas(token)               → { success, data[] }
       data[].id, .nama, .kelompok, .deskripsi, .isActive, .createdAt, .updatedAt
     addJenisBerkas(token, {nama, kelompok, deskripsi})    → { success, message, id }
     updateJenisBerkas(token, id, {nama, kelompok, deskripsi, isActive}) → { success, message }
     deleteJenisBerkas(token, id)        → { success, message }
     restoreJenisBerkas(token, id)       → { success, message }
     getJenisBerkasKelompok(token)       → { success, data[] }

     getKategoriBerkas(token)            → { success, data[] }
     addKategoriBerkas(token, {nama, kelompok, deskripsi})
     updateKategoriBerkas(token, id, {nama, kelompok, deskripsi, isActive})
     deleteKategoriBerkas(token, id)
     restoreKategoriBerkas(token, id)
     getKategoriBerkasKelompok(token)    → { success, data[] }

   APP.constants used:
     penyusutan[], hakAkses[], keamanan[]
═══════════════════════════════════════════════════════════════ */

window.PAGE_KLASIFIKASI = {};

PAGE_KLASIFIKASI._activeTab   = 'klas';
PAGE_KLASIFIKASI._klasData    = [];
PAGE_KLASIFIKASI._jenisData   = [];
PAGE_KLASIFIKASI._kategoriData= [];
PAGE_KLASIFIKASI._editingKlasId   = null;
PAGE_KLASIFIKASI._editingJenisId  = null;
PAGE_KLASIFIKASI._editingKatId    = null;
PAGE_KLASIFIKASI._klasMap         = {};

PAGE_KLASIFIKASI.render = function (params) {
  var pc = document.getElementById('page-content');
  if (!pc) return;

  PAGE_KLASIFIKASI._activeTab       = 'klas';
  PAGE_KLASIFIKASI._editingKlasId   = null;
  PAGE_KLASIFIKASI._editingJenisId  = null;
  PAGE_KLASIFIKASI._editingKatId    = null;

  pc.innerHTML = PAGE_KLASIFIKASI._shellHtml();
  PAGE_KLASIFIKASI._loadAllData();
};

PAGE_KLASIFIKASI._shellHtml = function () {
  return '<div class="page-header">' +
    '<div class="page-header-left">' +
      '<h1 class="page-title">Klasifikasi & JRA</h1>' +
      '<p class="page-subtitle">Kelola kode klasifikasi, jenis berkas, dan kategori berkas</p>' +
    '</div>' +
  '</div>' +

  '<div class="tab-bar">' +
    '<button class="tab-btn active" id="tab-klas"      onclick="PAGE_KLASIFIKASI._switchTab(\'klas\')">🏷 Kode Klasifikasi</button>' +
    '<button class="tab-btn"        id="tab-jenis"     onclick="PAGE_KLASIFIKASI._switchTab(\'jenis\')">📋 Jenis Berkas</button>' +
    '<button class="tab-btn"        id="tab-kategori"  onclick="PAGE_KLASIFIKASI._switchTab(\'kategori\')">📂 Kategori Berkas</button>' +
  '</div>' +

  '<div class="klas-panel active" id="klas-panel-klas">' +
    '<div class="card" style="margin-bottom:16px">' +
      '<div class="card-header">' +
        '<span class="card-title">➕ Tambah / Edit Kode Klasifikasi</span>' +
        '<button class="btn btn-ghost btn-sm" id="btn-klas-collapse" ' +
          'onclick="PAGE_KLASIFIKASI._toggleForm()">Sembunyikan ▲</button>' +
      '</div>' +
      '<div class="card-body" id="klas-form-body">' +
        PAGE_KLASIFIKASI._klasFormHtml() +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="card-header">' +
        '<span class="card-title" id="klas-table-count">🏷 Memuat…</span>' +
        '<button class="btn btn-secondary btn-sm" onclick="PAGE_KLASIFIKASI._loadKlas()">↻ Perbarui</button>' +
      '</div>' +
      '<div class="table-wrap" id="klas-table-wrap">' +
        APP.skeletonTableHtml(6, 6) +
      '</div>' +
    '</div>' +
  '</div>' +

  '<div class="klas-panel" id="klas-panel-jenis">' +
    PAGE_KLASIFIKASI._masterPanelHtml('jenis', 'Jenis Berkas', '📋') +
  '</div>' +

  '<div class="klas-panel" id="klas-panel-kategori">' +
    PAGE_KLASIFIKASI._masterPanelHtml('kategori', 'Kategori Berkas', '📂') +
  '</div>';
};

PAGE_KLASIFIKASI._klasFormHtml = function (data) {
  var c   = APP.constants || {};
  var d   = data || {};
  var esc = APP._esc;
  var penyusutanList = (c.penyusutan && c.penyusutan.length > 0)
    ? c.penyusutan
    : ['Musnah', 'Permanen', 'Dinilai Kembali', 'Arsip Aktif'];
  var hakAksesList = (c.hakAkses && c.hakAkses.length > 0)
    ? c.hakAkses
    : ['Semua', 'Direktur', 'Manajer', 'Supervisor', 'Staff Senior', 'Staff'];
  var keamananList = (c.keamanan && c.keamanan.length > 0)
    ? c.keamanan
    : ['Umum', 'Internal', 'Rahasia', 'Sangat Rahasia'];

  return '<div id="klas-form-fields">' +
    '<div class="form-row col-2">' +
      '<div class="form-group">' +
        '<label class="form-label" for="kf-kode">Kode Klasifikasi <span class="required">*</span></label>' +
        '<input type="text" id="kf-kode" class="form-control" ' +
          'placeholder="Cth: OT, OT.00, OT.01.1" ' +
          'style="text-transform:uppercase" ' +
          'value="' + esc(d.kode || '') + '" ' +
          (d.id ? 'disabled title="Kode tidak dapat diubah"' : '') + '>' +
        '<div class="form-hint">Format: HURUF (Lvl 1), HURUF.00 (Lvl 2), HURUF.00.0 (Lvl 3)</div>' +
        '<div class="form-error" id="err-kf-kode"></div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="kf-nama">Nama Klasifikasi <span class="required">*</span></label>' +
        '<input type="text" id="kf-nama" class="form-control" ' +
          'placeholder="Cth: Organisasi dan Tata Laksana" ' +
          'value="' + esc(d.namaKlasifikasi || '') + '">' +
        '<div class="form-error" id="err-kf-nama"></div>' +
      '</div>' +
    '</div>' +

    '<div class="form-group">' +
      '<label class="form-label" for="kf-deskripsi">Deskripsi</label>' +
      '<textarea id="kf-deskripsi" class="form-control" rows="2" ' +
        'placeholder="Deskripsi singkat cakupan kode ini">' + esc(d.deskripsi || '') + '</textarea>' +
    '</div>' +

    '<div class="form-row col-2">' +
      '<div class="form-group">' +
        '<label class="form-label" for="kf-ret-aktif">Retensi Aktif (tahun) <span class="required">*</span></label>' +
        '<input type="number" id="kf-ret-aktif" class="form-control" min="0" ' +
          'value="' + esc(String(d.retensiAktif != null ? d.retensiAktif : 2)) + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="kf-ret-inaktif">Retensi Inaktif (tahun) <span class="required">*</span></label>' +
        '<input type="number" id="kf-ret-inaktif" class="form-control" min="0" ' +
          'value="' + esc(String(d.retensiInaktif != null ? d.retensiInaktif : 8)) + '">' +
      '</div>' +
    '</div>' +

    '<div class="form-row col-2">' +
      '<div class="form-group">' +
        '<label class="form-label" for="kf-ket-aktif">Keterangan Retensi Aktif</label>' +
        '<input type="text" id="kf-ket-aktif" class="form-control" ' +
          'placeholder="Misal: Selama masih aktif digunakan" ' +
          'value="' + esc(d.ketRetensiAktif || '') + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="kf-ket-inaktif">Keterangan Retensi Inaktif</label>' +
        '<input type="text" id="kf-ket-inaktif" class="form-control" ' +
          'placeholder="Misal: Setelah tidak aktif" ' +
          'value="' + esc(d.ketRetensiInaktif || '') + '">' +
      '</div>' +
    '</div>' +

    '<div class="form-row col-2">' +
      '<div class="form-group">' +
        '<label class="form-label" for="kf-penyusutan">Penyusutan Akhir <span class="required">*</span></label>' +
        '<select id="kf-penyusutan" class="form-control">' +
          APP.buildSelectOptions(penyusutanList, d.penyusutanAkhir || 'Musnah', '') +
        '</select>' +
        '<div class="form-error" id="err-kf-penyusutan"></div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="kf-hak-akses">Hak Akses</label>' +
        '<select id="kf-hak-akses" class="form-control">' +
          APP.buildSelectOptions(hakAksesList, d.hakAkses || 'Semua', '') +
        '</select>' +
      '</div>' +
    '</div>' +

    '<div class="form-row col-2">' +
      '<div class="form-group">' +
        '<label class="form-label" for="kf-keamanan">Klasifikasi Keamanan</label>' +
        '<select id="kf-keamanan" class="form-control">' +
          APP.buildSelectOptions(keamananList, d.klasifikasiKeamanan || 'Internal', '') +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="kf-status">Status</label>' +
        '<select id="kf-status" class="form-control">' +
          '<option value="Aktif"'    + (d.status === 'Non Aktif' ? '' : ' selected') + '>Aktif</option>' +
          '<option value="Non Aktif"' + (d.status === 'Non Aktif' ? ' selected' : '') + '>Non Aktif</option>' +
        '</select>' +
      '</div>' +
    '</div>' +

    '<div class="form-group">' +
      '<label class="form-label" for="kf-catatan">Catatan / Dasar Pertimbangan</label>' +
      '<textarea id="kf-catatan" class="form-control" rows="2" ' +
        'placeholder="Dasar hukum, referensi regulasi, catatan khusus">' +
        esc(d.catatanKlasifikasi || '') +
      '</textarea>' +
    '</div>' +

    '<div style="display:flex;gap:10px;justify-content:flex-end">' +
      '<button class="btn btn-secondary" onclick="PAGE_KLASIFIKASI._resetKlasForm()">Reset</button>' +
      '<button class="btn btn-primary" id="btn-klas-save" ' +
        'onclick="PAGE_KLASIFIKASI._submitKlas()">' +
        (d.id ? '✓ Simpan Perubahan' : '+ Tambah Klasifikasi') +
      '</button>' +
    '</div>' +
  '</div>';
};

PAGE_KLASIFIKASI._masterPanelHtml = function (type, label, icon) {
  var esc = APP._esc;
  return '<div class="card" style="margin-bottom:16px">' +
    '<div class="card-header">' +
      '<span class="card-title">' + icon + ' Tambah ' + esc(label) + '</span>' +
    '</div>' +
    '<div class="card-body">' +
      '<div class="master-add-form" id="master-form-' + type + '">' +
        '<div class="form-group" style="margin:0">' +
          '<label class="form-label">Nama <span class="required">*</span></label>' +
          '<input type="text" id="mf-' + type + '-nama" class="form-control" ' +
            'placeholder="Nama ' + esc(label) + '">' +
        '</div>' +
        '<div class="form-group" style="margin:0">' +
          '<label class="form-label">Kelompok</label>' +
          '<input type="text" id="mf-' + type + '-kelompok" class="form-control" ' +
            'placeholder="Cth: Legal & Hukum">' +
        '</div>' +
        '<div class="form-group" style="margin:0">' +
          '<label class="form-label">Deskripsi</label>' +
          '<input type="text" id="mf-' + type + '-deskripsi" class="form-control" ' +
            'placeholder="Deskripsi singkat (opsional)">' +
        '</div>' +
        '<div style="display:flex;gap:8px;align-items:flex-end">' +
          '<button class="btn btn-secondary" id="btn-' + type + '-cancel" style="display:none" ' +
            'onclick="PAGE_KLASIFIKASI._cancelMasterEdit(\'' + type + '\')">Batal</button>' +
          '<button class="btn btn-primary" id="btn-' + type + '-save" ' +
            'onclick="PAGE_KLASIFIKASI._submitMaster(\'' + type + '\')">+ Tambah</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>' +

  '<div class="card">' +
    '<div class="card-header">' +
      '<span class="card-title" id="master-' + type + '-count">' + icon + ' Memuat…</span>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        '<label style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px;cursor:pointer">' +
          '<input type="checkbox" id="show-inactive-' + type + '" ' +
            'onchange="PAGE_KLASIFIKASI._renderMasterTable(\'' + type + '\')">' +
          ' Tampilkan nonaktif' +
        '</label>' +
        '<button class="btn btn-secondary btn-sm" ' +
          'onclick="PAGE_KLASIFIKASI._load' +
          (type === 'jenis' ? 'Jenis' : 'Kategori') + '()">↻</button>' +
      '</div>' +
    '</div>' +
    '<div class="table-wrap" id="master-' + type + '-table">' +
      APP.skeletonTableHtml(4, 5) +
    '</div>' +
  '</div>';
};

PAGE_KLASIFIKASI._switchTab = function (tab) {
  PAGE_KLASIFIKASI._activeTab = tab;

  ['klas','jenis','kategori'].forEach(function (t) {
    var btn   = document.getElementById('tab-' + t);
    var panel = document.getElementById('klas-panel-' + t);
    if (btn)   btn.classList.toggle('active', t === tab);
    if (panel) panel.classList.toggle('active', t === tab);
  });
};

PAGE_KLASIFIKASI._loadAllData = function () {
  PAGE_KLASIFIKASI._loadKlas();
  PAGE_KLASIFIKASI._loadJenis();
  PAGE_KLASIFIKASI._loadKategori();
};

PAGE_KLASIFIKASI._loadKlas = function () {
  var wrap = document.getElementById('klas-table-wrap');
  if (wrap) wrap.innerHTML = APP.skeletonTableHtml(6, 6);

  APP.call('getClassifications', [APP.token], function (result) {
    if (!result || !result.success) {
      if (wrap) wrap.innerHTML = APP.emptyStateHtml('⚠️', 'Gagal memuat',
        (result && result.message) || '');
      return;
    }
    PAGE_KLASIFIKASI._klasData = result.data || [];
    PAGE_KLASIFIKASI._klasMap = {};
    PAGE_KLASIFIKASI._klasData.forEach(function (k) {
      if (k.id) PAGE_KLASIFIKASI._klasMap[k.id] = k;
    });
    PAGE_KLASIFIKASI._renderKlasTable();
  }, { noLoading: true });
};

PAGE_KLASIFIKASI._renderKlasTable = function () {
  var wrap    = document.getElementById('klas-table-wrap');
  var countEl = document.getElementById('klas-table-count');
  if (!wrap) return;

  var data = PAGE_KLASIFIKASI._klasData;
  var esc  = APP._esc;

  if (countEl) countEl.textContent = '🏷 ' + data.length + ' Kode Klasifikasi';

  if (data.length === 0) {
    wrap.innerHTML = APP.emptyStateHtml('🏷', 'Belum ada kode klasifikasi',
      'Tambahkan kode pertama menggunakan form di atas.');
    return;
  }

  var html = '<table class="data-table"><thead><tr>' +
    '<th>Kode</th>' +
    '<th>Nama Klasifikasi</th>' +
    '<th>Level / Induk</th>' +
    '<th>Retensi (A/I)</th>' +
    '<th>Penyusutan</th>' +
    '<th>Status</th>' +
    '<th>Aksi</th>' +
  '</tr></thead><tbody>';

  var sorted = data.slice().sort(function (a, b) {
    return String(a.kode).localeCompare(String(b.kode));
  });

  sorted.forEach(function (k) {
    var lvl     = parseInt(k.level) || 1;
    var lvlCls  = 'klas-lvl-' + Math.min(lvl, 4);
    var isAktif = k.status === 'Aktif';

    html += '<tr' + (isAktif ? '' : ' style="opacity:0.5"') + '>' +
      '<td><span class="klas-kode">' + esc(k.kode || '–') + '</span></td>' +
      '<td class="' + lvlCls + '">' + esc(k.namaKlasifikasi || '–') + '</td>' +
      '<td>' +
        '<span style="font-size:11px;color:var(--text-muted)">Lvl ' + lvl + '</span>' +
        (k.indukKode && k.indukKode !== '-'
          ? '<span class="klas-kode" style="margin-left:8px;font-size:11px">' + esc(k.indukKode) + '</span>'
          : '') +
      '</td>' +
      '<td>' +
        '<span style="font-size:12px">' +
          esc(String(k.retensiAktif || 0)) + ' / ' + esc(String(k.retensiInaktif || 0)) + ' Thn' +
        '</span>' +
      '</td>' +
      '<td><span class="badge badge-muted">' + esc(k.penyusutanAkhir || '–') + '</span></td>' +
      '<td>' +
        (isAktif
          ? '<span class="badge badge-success">Aktif</span>'
          : '<span class="badge badge-danger">Non Aktif</span>') +
      '</td>' +
      '<td>' +
        '<div style="display:flex;gap:6px">' +
          '<button class="btn btn-ghost btn-icon btn-sm" title="Edit" ' +
            'onclick="PAGE_KLASIFIKASI._editKlas(\'' + esc(k.id) + '\')">' +
            '✏️' +
          '</button>' +
          '<button class="btn btn-ghost btn-icon btn-sm" title="Hapus" style="color:#F47067" ' +
            'onclick="PAGE_KLASIFIKASI._deleteKlas(\'' + esc(k.id) + '\',\'' + esc(k.kode) + '\')">' +
            '🗑' +
          '</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;
};

PAGE_KLASIFIKASI._formVisible = true;

PAGE_KLASIFIKASI._toggleForm = function () {
  PAGE_KLASIFIKASI._formVisible = !PAGE_KLASIFIKASI._formVisible;
  var body = document.getElementById('klas-form-body');
  var btn  = document.getElementById('btn-klas-collapse');
  if (body) body.style.display = PAGE_KLASIFIKASI._formVisible ? '' : 'none';
  if (btn)  btn.textContent    = PAGE_KLASIFIKASI._formVisible ? 'Sembunyikan ▲' : 'Tampilkan ▼';
};

PAGE_KLASIFIKASI._submitKlas = function () {
  var get = function (id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };

  var valid = true;
  var checks = [
    { id: 'kf-kode',      errId: 'err-kf-kode',      msg: 'Kode klasifikasi wajib diisi.' },
    { id: 'kf-nama',      errId: 'err-kf-nama',      msg: 'Nama klasifikasi wajib diisi.' },
    { id: 'kf-penyusutan',errId: 'err-kf-penyusutan', msg: 'Penyusutan wajib dipilih.' }
  ];

  checks.forEach(function (c) {
    var el    = document.getElementById(c.id);
    var errEl = document.getElementById(c.errId);
    var isEmpty = !el || !el.value.trim();
    if (el) el.classList.toggle('is-invalid', isEmpty);
    if (errEl) { errEl.textContent = isEmpty ? c.msg : ''; errEl.style.display = isEmpty ? 'block' : 'none'; }
    if (isEmpty) valid = false;
  });

  if (!valid) return;

  var d = {
    kode                : get('kf-kode').toUpperCase(),
    namaKlasifikasi     : get('kf-nama'),
    deskripsi           : get('kf-deskripsi'),
    retensiAktif        : Number(get('kf-ret-aktif')   || 0),
    retensiInaktif      : Number(get('kf-ret-inaktif') || 0),
    ketRetensiAktif     : get('kf-ket-aktif'),
    ketRetensiInaktif   : get('kf-ket-inaktif'),
    penyusutanAkhir     : get('kf-penyusutan'),
    hakAkses            : get('kf-hak-akses'),
    klasifikasiKeamanan : get('kf-keamanan'),
    status              : get('kf-status') || 'Aktif',
    catatanKlasifikasi  : get('kf-catatan')
  };

  var btn = document.getElementById('btn-klas-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan…'; }

  var isEdit  = !!PAGE_KLASIFIKASI._editingKlasId;
  var fnName  = isEdit ? 'updateClassification' : 'addClassification';
  var args    = isEdit
    ? [APP.token, PAGE_KLASIFIKASI._editingKlasId, d]
    : [APP.token, d];

  APP.call(fnName, args, function (result) {
    if (btn) { btn.disabled = false; btn.textContent = isEdit ? '✓ Simpan Perubahan' : '+ Tambah Klasifikasi'; }
    if (result && result.success) {
      APP.toast(result.message || 'Berhasil.', 'success');
      PAGE_KLASIFIKASI._resetKlasForm();
      PAGE_KLASIFIKASI._loadKlas();
    } else {
      APP.toast((result && result.message) || 'Gagal menyimpan.', 'danger');
    }
  });
};

PAGE_KLASIFIKASI._editKlas = function (id) {
  var klas = (PAGE_KLASIFIKASI._klasMap && PAGE_KLASIFIKASI._klasMap[id])
    || PAGE_KLASIFIKASI._klasData.find(function (k) { return k.id === id; });
  if (!klas) {
    APP.call('getClassifications', [APP.token], function (r) {
      if (r && r.success && r.data) {
        PAGE_KLASIFIKASI._klasData = r.data;
        PAGE_KLASIFIKASI._klasMap  = {};
        r.data.forEach(function (k) { if (k.id) PAGE_KLASIFIKASI._klasMap[k.id] = k; });
        var fresh = PAGE_KLASIFIKASI._klasMap[id];
        if (fresh) {
          PAGE_KLASIFIKASI._editKlas(id);
        } else {
          APP.toast('Data tidak ditemukan. Coba refresh halaman.', 'warning');
        }
      }
    }, { noLoading: true, silent: true });
    return;
  }

  PAGE_KLASIFIKASI._editingKlasId = id;

  var formBody = document.getElementById('klas-form-body');
  if (formBody) formBody.innerHTML = PAGE_KLASIFIKASI._klasFormHtml(klas);

  PAGE_KLASIFIKASI._formVisible = true;
  formBody.style.display = '';
  var colBtn = document.getElementById('btn-klas-collapse');
  if (colBtn) colBtn.textContent = 'Sembunyikan ▲';

  var pc = document.getElementById('page-content');
  if (pc) pc.scrollTop = 0;

  var saveBtn = document.getElementById('btn-klas-save');
  if (saveBtn) saveBtn.textContent = '✓ Simpan Perubahan';
};

PAGE_KLASIFIKASI._resetKlasForm = function () {
  PAGE_KLASIFIKASI._editingKlasId = null;
  var formBody = document.getElementById('klas-form-body');
  if (formBody) formBody.innerHTML = PAGE_KLASIFIKASI._klasFormHtml();
};

PAGE_KLASIFIKASI._deleteKlas = function (id, kode) {
  APP.confirm({
    icon       : '🗑',
    title      : 'Hapus Kode Klasifikasi',
    msg        : 'Kode "' + kode + '" akan dihapus. Tidak dapat dihapus jika masih digunakan oleh arsip atau memiliki sub-kode.',
    okLabel    : 'Hapus',
    okClass    : 'btn-danger',
    cancelLabel: 'Batal'
  }).then(function (ok) {
    if (!ok) return;
    APP.call('deleteClassification', [APP.token, id], function (result) {
      if (result && result.success) {
        APP.toast(result.message || 'Berhasil dihapus.', 'success');
        PAGE_KLASIFIKASI._loadKlas();
      } else {
        APP.toast((result && result.message) || 'Gagal menghapus.', 'danger');
      }
    });
  });
};

PAGE_KLASIFIKASI._loadJenis = function () {
  var wrap = document.getElementById('master-jenis-table');
  if (wrap) wrap.innerHTML = APP.skeletonTableHtml(4, 5);

  APP.call('getJenisBerkas', [APP.token], function (result) {
    PAGE_KLASIFIKASI._jenisData = (result && result.success && result.data) ? result.data : [];
    PAGE_KLASIFIKASI._renderMasterTable('jenis');
  }, { noLoading: true });
};

PAGE_KLASIFIKASI._loadKategori = function () {
  var wrap = document.getElementById('master-kategori-table');
  if (wrap) wrap.innerHTML = APP.skeletonTableHtml(4, 5);

  APP.call('getKategoriBerkas', [APP.token], function (result) {
    PAGE_KLASIFIKASI._kategoriData = (result && result.success && result.data) ? result.data : [];
    PAGE_KLASIFIKASI._renderMasterTable('kategori');
  }, { noLoading: true });
};

PAGE_KLASIFIKASI._renderMasterTable = function (type) {
  var wrap     = document.getElementById('master-' + type + '-table');
  var countEl  = document.getElementById('master-' + type + '-count');
  var showInact= document.getElementById('show-inactive-' + type);
  if (!wrap) return;

  var rawData   = type === 'jenis' ? PAGE_KLASIFIKASI._jenisData : PAGE_KLASIFIKASI._kategoriData;
  var showAll   = showInact && showInact.checked;
  var data      = showAll ? rawData : rawData.filter(function (r) { return r.isActive; });
  var label     = type === 'jenis' ? 'Jenis Berkas' : 'Kategori Berkas';
  var icon      = type === 'jenis' ? '📋' : '📂';
  var esc       = APP._esc;

  if (countEl) countEl.textContent = icon + ' ' + data.length + ' ' + label;

  if (data.length === 0) {
    wrap.innerHTML = APP.emptyStateHtml(icon, 'Belum ada ' + label,
      'Tambahkan ' + label.toLowerCase() + ' menggunakan form di atas.');
    return;
  }

  var html = '<table class="data-table"><thead><tr>' +
    '<th>Nama</th>' +
    '<th>Kelompok</th>' +
    '<th>Deskripsi</th>' +
    '<th>Status</th>' +
    '<th>Aksi</th>' +
  '</tr></thead><tbody>';

  data.forEach(function (item) {
    var trCls = item.isActive ? '' : ' class="master-row-inactive"';
    html += '<tr' + trCls + '>' +
      '<td style="font-weight:500">' + esc(item.nama || '–') + '</td>' +
      '<td><span class="badge badge-muted">' + esc(item.kelompok || '–') + '</span></td>' +
      '<td style="font-size:12px;color:var(--text-secondary)">' + esc(item.deskripsi || '–') + '</td>' +
      '<td>' +
        (item.isActive
          ? '<span class="badge badge-success">Aktif</span>'
          : '<span class="badge badge-danger">Nonaktif</span>') +
      '</td>' +
      '<td>' +
        '<div style="display:flex;gap:6px">' +
          '<button class="btn btn-ghost btn-icon btn-sm" title="Edit" ' +
            'onclick="PAGE_KLASIFIKASI._editMaster(\'' + type + '\',\'' + esc(item.id) + '\')">' +
            '✏️' +
          '</button>' +
          (item.isActive
            ? '<button class="btn btn-ghost btn-icon btn-sm" title="Nonaktifkan" style="color:#F47067" ' +
                'onclick="PAGE_KLASIFIKASI._deleteMaster(\'' + type + '\',\'' + esc(item.id) + '\',\'' + esc(item.nama) + '\')">' +
                '🚫' +
              '</button>'
            : '<button class="btn btn-ghost btn-icon btn-sm" title="Aktifkan kembali" style="color:var(--success)" ' +
                'onclick="PAGE_KLASIFIKASI._restoreMaster(\'' + type + '\',\'' + esc(item.id) + '\',\'' + esc(item.nama) + '\')">' +
                '✓' +
              '</button>') +
        '</div>' +
      '</td>' +
    '</tr>';
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;
};

PAGE_KLASIFIKASI._submitMaster = function (type) {
  var namaEl   = document.getElementById('mf-' + type + '-nama');
  var kelEl    = document.getElementById('mf-' + type + '-kelompok');
  var deskEl   = document.getElementById('mf-' + type + '-deskripsi');
  var saveBtn  = document.getElementById('btn-' + type + '-save');
  var cancelBtn= document.getElementById('btn-' + type + '-cancel');

  if (!namaEl || !namaEl.value.trim()) {
    namaEl.classList.add('is-invalid');
    APP.toast('Nama wajib diisi.', 'warning');
    return;
  }
  namaEl.classList.remove('is-invalid');

  var d = {
    nama     : namaEl.value.trim(),
    kelompok : (kelEl  && kelEl.value)  ? kelEl.value.trim()  : '',
    deskripsi: (deskEl && deskEl.value) ? deskEl.value.trim() : ''
  };

  var isEdit  = (type === 'jenis' && PAGE_KLASIFIKASI._editingJenisId)
             || (type === 'kategori' && PAGE_KLASIFIKASI._editingKatId);
  var editId  = type === 'jenis'
    ? PAGE_KLASIFIKASI._editingJenisId
    : PAGE_KLASIFIKASI._editingKatId;

  var fnAdd    = type === 'jenis' ? 'addJenisBerkas'      : 'addKategoriBerkas';
  var fnUpdate = type === 'jenis' ? 'updateJenisBerkas'   : 'updateKategoriBerkas';
  var fnName   = isEdit ? fnUpdate : fnAdd;
  var args     = isEdit ? [APP.token, editId, d] : [APP.token, d];

  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Menyimpan…'; }

  APP.call(fnName, args, function (result) {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = isEdit ? '✓ Simpan' : '+ Tambah'; }
    if (result && result.success) {
      APP.toast(result.message || 'Berhasil.', 'success');
      PAGE_KLASIFIKASI._cancelMasterEdit(type);
      if (type === 'jenis')    PAGE_KLASIFIKASI._loadJenis();
      else                     PAGE_KLASIFIKASI._loadKategori();
    } else {
      APP.toast((result && result.message) || 'Gagal menyimpan.', 'danger');
    }
  });
};

PAGE_KLASIFIKASI._editMaster = function (type, id) {
  var data  = type === 'jenis' ? PAGE_KLASIFIKASI._jenisData : PAGE_KLASIFIKASI._kategoriData;
  var item  = data.find(function (d) { return d.id === id; });
  if (!item) { APP.toast('Data tidak ditemukan.', 'warning'); return; }

  if (type === 'jenis')    PAGE_KLASIFIKASI._editingJenisId = id;
  else                     PAGE_KLASIFIKASI._editingKatId   = id;

  var namaEl = document.getElementById('mf-' + type + '-nama');
  var kelEl  = document.getElementById('mf-' + type + '-kelompok');
  var deskEl = document.getElementById('mf-' + type + '-deskripsi');
  var saveBtn= document.getElementById('btn-' + type + '-save');
  var canBtn = document.getElementById('btn-' + type + '-cancel');

  if (namaEl) namaEl.value = item.nama      || '';
  if (kelEl)  kelEl.value  = item.kelompok  || '';
  if (deskEl) deskEl.value = item.deskripsi || '';
  if (saveBtn){ saveBtn.textContent = '✓ Simpan'; }
  if (canBtn) canBtn.style.display = '';

  var formEl = document.getElementById('master-form-' + type);
  if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

PAGE_KLASIFIKASI._cancelMasterEdit = function (type) {
  if (type === 'jenis')    PAGE_KLASIFIKASI._editingJenisId = null;
  else                     PAGE_KLASIFIKASI._editingKatId   = null;

  var namaEl  = document.getElementById('mf-' + type + '-nama');
  var kelEl   = document.getElementById('mf-' + type + '-kelompok');
  var deskEl  = document.getElementById('mf-' + type + '-deskripsi');
  var saveBtn = document.getElementById('btn-' + type + '-save');
  var canBtn  = document.getElementById('btn-' + type + '-cancel');

  if (namaEl)  { namaEl.value = '';  namaEl.classList.remove('is-invalid'); }
  if (kelEl)   kelEl.value   = '';
  if (deskEl)  deskEl.value  = '';
  if (saveBtn) saveBtn.textContent = '+ Tambah';
  if (canBtn)  canBtn.style.display = 'none';
};

PAGE_KLASIFIKASI._deleteMaster = function (type, id, nama) {
  APP.confirm({
    icon       : '🚫',
    title      : 'Nonaktifkan ' + (type === 'jenis' ? 'Jenis Berkas' : 'Kategori Berkas'),
    msg        : '"' + nama + '" akan dinonaktifkan. Tidak dapat dinonaktifkan jika masih digunakan oleh berkas aktif.',
    okLabel    : 'Nonaktifkan',
    okClass    : 'btn-danger',
    cancelLabel: 'Batal'
  }).then(function (ok) {
    if (!ok) return;
    var fnName = type === 'jenis' ? 'deleteJenisBerkas' : 'deleteKategoriBerkas';
    APP.call(fnName, [APP.token, id], function (result) {
      if (result && result.success) {
        APP.toast(result.message || 'Berhasil dinonaktifkan.', 'success');
        if (type === 'jenis') PAGE_KLASIFIKASI._loadJenis();
        else                  PAGE_KLASIFIKASI._loadKategori();
      } else {
        APP.toast((result && result.message) || 'Gagal menonaktifkan.', 'danger');
      }
    });
  });
};

PAGE_KLASIFIKASI._restoreMaster = function (type, id, nama) {
  APP.confirm({
    icon       : '✓',
    title      : 'Aktifkan Kembali',
    msg        : '"' + nama + '" akan diaktifkan kembali.',
    okLabel    : 'Aktifkan',
    okClass    : 'btn-success',
    cancelLabel: 'Batal'
  }).then(function (ok) {
    if (!ok) return;
    var fnName = type === 'jenis' ? 'restoreJenisBerkas' : 'restoreKategoriBerkas';
    APP.call(fnName, [APP.token, id], function (result) {
      if (result && result.success) {
        APP.toast(result.message || 'Berhasil diaktifkan.', 'success');
        if (type === 'jenis') PAGE_KLASIFIKASI._loadJenis();
        else                  PAGE_KLASIFIKASI._loadKategori();
      } else {
        APP.toast((result && result.message) || 'Gagal mengaktifkan.', 'danger');
      }
    });
  });
};
