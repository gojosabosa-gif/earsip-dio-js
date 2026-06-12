window.PAGE_TEMPLAT = {};
PAGE_TEMPLAT._allTemplates   = [];
PAGE_TEMPLAT._aktifKategori  = '';
PAGE_TEMPLAT._selectedFile   = null;
PAGE_TEMPLAT._uploadedResult = null;

PAGE_TEMPLAT.render = function (params) {
  var pc = document.getElementById('page-content');
  if (!pc) return;
  PAGE_TEMPLAT._allTemplates   = [];
  PAGE_TEMPLAT._aktifKategori  = '';
  PAGE_TEMPLAT._selectedFile   = null;
  PAGE_TEMPLAT._uploadedResult = null;
  pc.innerHTML = PAGE_TEMPLAT._shellHtml();
  PAGE_TEMPLAT._load();
};

PAGE_TEMPLAT._shellHtml = function () {
  var user    = APP.currentUser;
  var isAdmin = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');
  var skel = '';
  for (var i=0;i<6;i++) {
    skel += '<div class="templat-card">' +
      '<div class="skeleton" style="width:48px;height:48px;border-radius:8px;flex-shrink:0"></div>' +
      '<div style="flex:1">' +
        '<div class="skeleton" style="height:14px;width:65%;margin-bottom:8px"></div>' +
        '<div class="skeleton" style="height:11px;width:40%"></div>' +
      '</div></div>';
  }
  return (
    '<div class="page-header">' +
      '<div class="page-header-left">' +
        '<h1 class="page-title">Templat Dokumen</h1>' +
        '<p class="page-subtitle">Unduh templat resmi dokumen perusahaan</p>' +
      '</div>' +
      '<div class="page-header-actions">' +
        '<button class="btn btn-secondary btn-sm" onclick="PAGE_TEMPLAT._load()">&#8635; Perbarui</button>' +
        (isAdmin ? '<button class="btn btn-primary btn-sm" onclick="PAGE_TEMPLAT._openAddForm()">+ Tambah Templat</button>' : '') +
      '</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px" id="kat-bar">' +
      '<span style="font-size:12px;color:var(--text-muted)">Filter:</span>' +
      '<button class="kat-btn active" onclick="PAGE_TEMPLAT._filterKat(\'\')">Semua</button>' +
    '</div>' +
    '<div id="templat-body"><div class="templat-grid">' + skel + '</div></div>'
  );
};

PAGE_TEMPLAT._load = function () {
  APP.call('getTemplates', [APP.token], function (result) {
    var body = document.getElementById('templat-body');
    if (!result || !result.success) {
      if (body) body.innerHTML = APP.emptyStateHtml('&#9888;', 'Gagal memuat', (result && result.message) || '');
      return;
    }
    PAGE_TEMPLAT._allTemplates = result.data || [];
    PAGE_TEMPLAT._buildKatBar();
    PAGE_TEMPLAT._renderGrid(PAGE_TEMPLAT._allTemplates);
  }, { noLoading: true });
};

PAGE_TEMPLAT._buildKatBar = function () {
  var bar = document.getElementById('kat-bar');
  if (!bar) return;
  var cats = [];
  PAGE_TEMPLAT._allTemplates.forEach(function (t) {
    if (t.kategori && cats.indexOf(t.kategori) === -1) cats.push(t.kategori);
  });
  var esc = APP._esc;
  var html = '<span style="font-size:12px;color:var(--text-muted)">Filter:</span>';
  [''].concat(cats).forEach(function (c) {
    var active = c === PAGE_TEMPLAT._aktifKategori;
    html += '<button class="kat-btn' + (active ? ' active' : '') + '" ' +
      'onclick="PAGE_TEMPLAT._filterKat(\'' + esc(c) + '\')">' +
      (c || 'Semua') + '</button>';
  });
  bar.innerHTML = html;
};

PAGE_TEMPLAT._DEFAULT_CATS = [
  'Dokumen','Hukum','Keuangan','SDM','Operasional',
  'Desain','Marketing','IT','Kepatuhan','Lainnya'
];

PAGE_TEMPLAT._buildKatOptions = function () {
  var cats = PAGE_TEMPLAT._DEFAULT_CATS.slice();
  PAGE_TEMPLAT._allTemplates.forEach(function (t) {
    if (t.kategori && cats.indexOf(t.kategori) === -1) cats.push(t.kategori);
  });
  return cats.map(function (c) {
    return '<option value="' + APP._esc(c) + '">';
  }).join('');
};

PAGE_TEMPLAT._filterKat = function (kat) {
  PAGE_TEMPLAT._aktifKategori = kat;
  var filtered = kat
    ? PAGE_TEMPLAT._allTemplates.filter(function (t) { return t.kategori === kat; })
    : PAGE_TEMPLAT._allTemplates;
  PAGE_TEMPLAT._buildKatBar();
  PAGE_TEMPLAT._renderGrid(filtered);
};

PAGE_TEMPLAT._renderGrid = function (data) {
  var body    = document.getElementById('templat-body');
  var user    = APP.currentUser;
  var isAdmin = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');
  var esc     = APP._esc;
  if (!body) return;
  if (!data || !data.length) {
    body.innerHTML = APP.emptyStateHtml('&#128196;', 'Belum ada templat',
      isAdmin ? 'Klik "+ Tambah Templat" untuk mengunggah dokumen templat.' : 'Belum ada templat tersedia.',
      isAdmin ? '<button class="btn btn-primary" onclick="PAGE_TEMPLAT._openAddForm()">+ Tambah Templat</button>' : '');
    return;
  }
  var catIcons = {
    'Dokumen':'&#128196;', 'Hukum':'&#9878;&#65039;', 'Keuangan':'&#128181;',
    'SDM':'&#128101;', 'Desain':'&#127912;', 'Marketing':'&#128226;',
    'IT':'&#128187;', 'Operasional':'&#9881;&#65039;', 'Kepatuhan':'&#9989;',
    'Lainnya':'&#128193;'
  };
  var html = '<div class="templat-grid">';
  data.forEach(function (t) {
    var icon = catIcons[t.kategori] || '&#128196;';
    html += '<div class="templat-card">' +
      '<div class="templat-icon">' + icon + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div class="templat-name">' + esc(t.nama) + '</div>' +
        '<div class="templat-meta">' +
          (t.kategori ? '<span class="badge badge-muted">' + esc(t.kategori) + '</span>' : '') +
          '<span>' + APP.formatFileSize(t.fileSize) + '</span>' +
          (t.fileName ? '<span style="font-family:var(--font-mono)">' + esc(t.fileName) + '</span>' : '') +
        '</div>' +
        (t.deskripsi ? '<div class="templat-desc">' + esc(t.deskripsi) + '</div>' : '') +
        '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
          (t.fileUrl
            ? (function(){
                var fileId = '';
                var m = (t.fileId || t.fileUrl).match(/(?:drive\.google\.com\/file\/d\/|id=)([^\/&?]+)/);
                if (m) fileId = m[1];
                else if (t.fileId) fileId = t.fileId;
                var viewUrl     = fileId ? 'https://drive.google.com/file/d/' + fileId + '/view' : t.fileUrl;
                var previewUrl  = fileId ? 'https://drive.google.com/file/d/' + fileId + '/preview' : null;
                var downloadUrl = fileId ? 'https://drive.google.com/uc?export=download&id=' + fileId : t.fileUrl;
                return '<a href="' + esc(viewUrl) + '" target="_blank" rel="noopener" class="btn btn-primary btn-sm">&#128065; Buka</a>' +
                  '<a href="' + esc(downloadUrl) + '" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">&#8595; Unduh</a>' +
                  (previewUrl
                    ? '<button class="btn btn-ghost btn-sm" onclick="PAGE_TEMPLAT._togglePreview(\'' + esc(t.id) + '\',\'' + esc(previewUrl) + '\')">' +
                        '&#9654; Preview</button>' +
                      '<div id="tpl-preview-' + esc(t.id) + '" style="display:none;margin-top:8px;' +
                        'border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden">' +
                        '<iframe src="" data-src="' + esc(previewUrl) + '" ' +
                          'style="width:100%;height:400px;border:none;background:#fff" allow="autoplay" allowfullscreen>' +
                        '</iframe>' +
                      '</div>'
                    : '');
              })()
            : '<button class="btn btn-ghost btn-sm" disabled>Tidak ada file</button>') +
          (isAdmin
            ? '<button class="btn btn-ghost btn-sm" style="color:#F47067" onclick="PAGE_TEMPLAT._delete(\'' + esc(t.id) + '\',\'' + esc(t.nama) + '\')">Hapus</button>'
            : '') +
        '</div>' +
      '</div></div>';
  });
  html += '</div>';
  body.innerHTML = html;
};

PAGE_TEMPLAT._openAddForm = function () {
  PAGE_TEMPLAT._selectedFile   = null;
  PAGE_TEMPLAT._uploadedResult = null;
  PAGE_TEMPLAT._saving         = false;

  var body =
    '<div id="tpl-form">' +
      '<div class="form-row col-2">' +
        '<div class="form-group">' +
          '<label class="form-label">Nama Templat <span class="required">*</span></label>' +
          '<input type="text" id="tpl-nama" class="form-control" placeholder="Cth: Surat Kuasa Umum">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Kategori</label>' +
          '<input type="text" id="tpl-kat" class="form-control" ' +
            'list="tpl-kat-list" ' +
            'placeholder="Ketik atau pilih kategori&hellip;" ' +
            'autocomplete="off">' +
          '<datalist id="tpl-kat-list">' +
            PAGE_TEMPLAT._buildKatOptions() +
          '</datalist>' +
          '<div class="form-hint">Pilih yang sudah ada atau ketik kategori baru</div>' +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Deskripsi</label>' +
        '<textarea id="tpl-desk" class="form-control" rows="2" placeholder="Keterangan singkat templat"></textarea>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">File Templat <span class="required">*</span></label>' +
        '<div id="tpl-dropzone" style="border:2px dashed var(--border);border-radius:var(--radius-md);' +
          'padding:28px;text-align:center;cursor:pointer;transition:var(--transition)" ' +
          'onclick="document.getElementById(\'tpl-file-input\').click()" ' +
          'ondragover="event.preventDefault();this.style.borderColor=\'var(--accent)\'" ' +
          'ondragleave="this.style.borderColor=\'var(--border)\'" ' +
          'ondrop="PAGE_TEMPLAT._onDrop(event)">' +
          '<div style="font-size:32px;margin-bottom:8px">&#128196;</div>' +
          '<div style="font-size:13px;color:var(--text-secondary)">Klik atau seret file ke sini</div>' +
          '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">PDF, DOCX, XLSX, PPTX, dan format lainnya</div>' +
        '</div>' +
        '<input type="file" id="tpl-file-input" style="display:none" onchange="PAGE_TEMPLAT._onFileSelect(this)">' +
        '<div id="tpl-file-preview" style="display:none;margin-top:10px;padding:10px 12px;' +
          'background:var(--bg-elevated);border-radius:var(--radius-md);align-items:center;gap:10px">' +
          '<span style="font-size:20px">&#128196;</span>' +
          '<div style="flex:1;min-width:0">' +
            '<div id="tpl-file-name" style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div>' +
            '<div id="tpl-file-size" style="font-size:11px;color:var(--text-muted)"></div>' +
          '</div>' +
          '<button class="btn btn-ghost btn-icon btn-sm" onclick="PAGE_TEMPLAT._clearFile()" style="color:#F47067">&#10005;</button>' +
        '</div>' +
        '<div id="tpl-progress-wrap" style="display:none;margin-top:8px">' +
          '<div style="background:var(--bg-elevated);border-radius:99px;height:4px;overflow:hidden">' +
            '<div id="tpl-progress-bar" style="height:100%;background:var(--accent);width:0%;transition:width 0.3s"></div>' +
          '</div>' +
          '<div id="tpl-progress-text" style="font-size:11px;color:var(--text-muted);margin-top:4px;text-align:center">Mengunggah&#8230;</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  APP.openDrawer({
    title: '+ Tambah Templat Dokumen',
    bodyHtml: body,
    footerHtml:
      '<button class="btn btn-secondary" onclick="APP.closeDrawer()">Batal</button>' +
      '<button class="btn btn-primary" id="btn-tpl-save" onclick="PAGE_TEMPLAT._save()">Simpan Templat</button>'
  });
};

PAGE_TEMPLAT._onDrop = function (e) {
  e.preventDefault();
  var dz = document.getElementById('tpl-dropzone');
  if (dz) dz.style.borderColor = 'var(--border)';
  var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) PAGE_TEMPLAT._previewFile(file);
};

PAGE_TEMPLAT._onFileSelect = function (input) {
  var file = input && input.files && input.files[0];
  if (file) PAGE_TEMPLAT._previewFile(file);
};

PAGE_TEMPLAT._previewFile = function (file) {
  PAGE_TEMPLAT._selectedFile   = file;
  PAGE_TEMPLAT._uploadedResult = null;
  var preview = document.getElementById('tpl-file-preview');
  var nameEl  = document.getElementById('tpl-file-name');
  var sizeEl  = document.getElementById('tpl-file-size');
  var dz      = document.getElementById('tpl-dropzone');
  if (nameEl)  nameEl.textContent = file.name;
  if (sizeEl)  sizeEl.textContent = APP.formatFileSize(file.size);
  if (preview) preview.style.display = 'flex';
  if (dz)      dz.style.display     = 'none';
};

PAGE_TEMPLAT._clearFile = function () {
  PAGE_TEMPLAT._selectedFile   = null;
  PAGE_TEMPLAT._uploadedResult = null;
  var preview = document.getElementById('tpl-file-preview');
  var dz      = document.getElementById('tpl-dropzone');
  var inp     = document.getElementById('tpl-file-input');
  if (preview) preview.style.display = 'none';
  if (dz)      dz.style.display     = '';
  if (inp)     inp.value             = '';
};

PAGE_TEMPLAT._save = function () {
  if (PAGE_TEMPLAT._saving) return;
  var get = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
  var nama = get('tpl-nama');
  if (!nama) { APP.toast('Nama templat wajib diisi.', 'warning'); return; }
  if (!PAGE_TEMPLAT._selectedFile && !PAGE_TEMPLAT._uploadedResult) {
    APP.toast('Pilih file templat terlebih dahulu.', 'warning'); return;
  }
  PAGE_TEMPLAT._saving = true;

  var btn = document.getElementById('btn-tpl-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan\u2026'; }

  var doSave = function (up) {
    APP.call('addTemplate', [APP.token, {
      nama     : nama,
      kategori : get('tpl-kat'),
      deskripsi: get('tpl-desk'),
      fileId   : up.fileId   || '',
      fileUrl  : up.fileUrl  || '',
      fileName : up.fileName || nama,
      fileSize : up.fileSize || 0
    }], function (result) {
      PAGE_TEMPLAT._saving = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Simpan Templat'; }
      var pw = document.getElementById('tpl-progress-wrap');
      if (pw) pw.style.display = 'none';
      if (result && result.success) {
        APP.toast('Templat berhasil ditambahkan.', 'success');
        APP.closeDrawer();
        PAGE_TEMPLAT._load();
      } else {
        APP.toast((result && result.message) || 'Gagal menyimpan templat.', 'danger');
      }
    });
  };

  if (PAGE_TEMPLAT._uploadedResult) { doSave(PAGE_TEMPLAT._uploadedResult); return; }

  var pw  = document.getElementById('tpl-progress-wrap');
  var pb  = document.getElementById('tpl-progress-bar');
  var pt  = document.getElementById('tpl-progress-text');
  if (pw) pw.style.display = 'block';

  var user = APP.currentUser;
  APP.uploadFile(
    document.getElementById('tpl-file-input'),
    { departemen:(user && user.departemen)||'Umum', year:new Date().getFullYear(), tipeBerkas:'Dokumen', token:APP.token },
    function (pct) { if (pb) pb.style.width = pct+'%'; if (pt) pt.textContent = 'Mengunggah\u2026 '+pct+'%'; }
  ).then(function (up) {
    if (!up || !up.fileUrl) {
      if (btn) { btn.disabled = false; btn.textContent = 'Simpan Templat'; }
      if (pw) pw.style.display = 'none';
      APP.toast('Gagal mengunggah file.', 'danger'); return;
    }
    PAGE_TEMPLAT._uploadedResult = up;
    if (pb) pb.style.width = '100%';
    if (pt) pt.textContent = 'Upload selesai\u2026';
    doSave(up);
  }).catch(function (err) {
    PAGE_TEMPLAT._saving = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Simpan Templat'; }
    if (pw) pw.style.display = 'none';
    APP.toast('Error: ' + ((err && err.message) || 'Upload gagal'), 'danger');
  });
};

PAGE_TEMPLAT._previewStates = {};  // id → open state

PAGE_TEMPLAT._togglePreview = function (id, previewUrl) {
  var wrap   = document.getElementById('tpl-preview-' + id);
  if (!wrap) return;

  var isOpen = PAGE_TEMPLAT._previewStates[id];
  if (isOpen) {
    // Close
    var iframe = wrap.querySelector('iframe');
    if (iframe) iframe.src = '';
    wrap.style.display = 'none';
    PAGE_TEMPLAT._previewStates[id] = false;
    // Reset button text
    var btns = document.querySelectorAll('button');
    btns.forEach(function (b) {
      if (b.textContent.trim() === '▮ Preview') b.textContent = '▶ Preview';
    });
  } else {
    // Open
    var iframe = wrap.querySelector('iframe');
    if (iframe && iframe.dataset.src) iframe.src = iframe.dataset.src;
    wrap.style.display = 'block';
    PAGE_TEMPLAT._previewStates[id] = true;
  }
};

PAGE_TEMPLAT._delete = function (id, nama) {
  APP.confirm({
    icon:'&#128465;', title:'Hapus Templat',
    msg:'"' + nama + '" akan dihapus dari daftar templat dan <strong>file di Google Drive juga akan dihapus permanen</strong>. Tindakan ini tidak dapat dibatalkan.',
    okLabel:'Hapus Permanen', okClass:'btn-danger', cancelLabel:'Batal'
  }).then(function (ok) {
    if (!ok) return;
    APP.call('deleteTemplate', [APP.token, id], function (result) {
      if (result && result.success) { APP.toast('Templat berhasil dihapus.', 'success'); PAGE_TEMPLAT._load(); }
      else { APP.toast((result && result.message) || 'Gagal menghapus.', 'danger'); }
    });
  });
};
