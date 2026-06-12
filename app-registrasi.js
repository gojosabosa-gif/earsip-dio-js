/* ═══════════════════════════════════════════════════════════════
   Page_RegistrasiArsip — E-ARSIP DIO
   Exposes: window.PAGE_REGISTRASI_ARSIP

   Code.gs functions:
     getClassifications(token)
       → { success, data[] } — data[].id, .kode, .namaKlasifikasi, .deskripsi,
         .level, .retensiAktif, .retensiInaktif, .penyusutanAkhir,
         .klasifikasiKeamanan, .status, .indukKode
     getDepartemenList(token) → { success, data[] }
     uploadFileToDrive(token, base64, mime, name, dept, year, tipeBerkas)
       → { success, fileId, fileUrl, fileName, fileSize, tipeBerkas }
     registerArchive(token, d)
       → { success, message, id }
         required: namaBerkas, nomorDokumen, kodeKlasifikasi, jenisBerkas, kategoriBerkas
         optional: tipeBerkas, lokasiSimpan, keterangan, retensiAktif, retensiInaktif,
                   nomorBerkas, penyusutanAkhir, klasifikasiKeamanan, departemen,
                   tanggalDokumen, tahunDokumen, fileId, fileUrl, fileName, fileType, fileSize
═══════════════════════════════════════════════════════════════ */

window.PAGE_REGISTRASI_ARSIP = {};

PAGE_REGISTRASI_ARSIP._step         = 1;
PAGE_REGISTRASI_ARSIP._klasList     = [];
PAGE_REGISTRASI_ARSIP._deptList     = [];
PAGE_REGISTRASI_ARSIP._uploadResult = null;
PAGE_REGISTRASI_ARSIP._savedId      = '';

PAGE_REGISTRASI_ARSIP._FB = {
  keamanan  : ['Umum','Internal','Rahasia','Sangat Rahasia'],
  penyusutan: ['Musnah','Permanen','Dinilai Kembali','Arsip Aktif']
};

PAGE_REGISTRASI_ARSIP.render = function () {
  var pc = document.getElementById('page-content');
  if (!pc) return;

  PAGE_REGISTRASI_ARSIP._step         = 1;
  PAGE_REGISTRASI_ARSIP._uploadResult = null;
  PAGE_REGISTRASI_ARSIP._savedId      = '';

  pc.innerHTML = PAGE_REGISTRASI_ARSIP._html();
  PAGE_REGISTRASI_ARSIP._loadData();
};

PAGE_REGISTRASI_ARSIP._html = function () {
  return (
    '<div class="page-header">' +
      '<div class="page-header-left">' +
        '<h1 class="page-title">Registrasi Berkas</h1>' +
        '<p class="page-subtitle">Daftarkan berkas baru ke sistem arsip</p>' +
      '</div>' +
      '<div class="page-header-actions">' +
        '<button class="btn btn-secondary btn-sm" onclick="APP.navigate(\'manajemen-arsip\')">← Kembali</button>' +
      '</div>' +
    '</div>' +
    '<div class="card"><div class="card-body">' +

    '<div class="reg-steps">' +
      ['Info Berkas','Klasifikasi','Upload File','Selesai'].map(function(lbl, i) {
        var n = i + 1;
        return '<div class="reg-step' + (n===1?' active':'') + '" id="rs'+n+'">' +
          '<div class="step-num" id="rsn'+n+'">' + (n===1?'1':n) + '</div>' +
          '<div class="step-label">' + lbl + '</div>' +
        '</div>';
      }).join('') +
    '</div>' +

    '<div class="step-panel active" id="rp1">' +

      '<div class="form-row col-2">' +
        '<div class="form-group"><label class="form-label">Nama Berkas <span class="required">*</span></label>' +
        '<input type="text" id="r-nama" class="form-control" placeholder="Cth: Akta Pendirian PT DIO 2024">' +
        '<div class="form-error" id="e-nama"></div></div>' +

        '<div class="form-group"><label class="form-label">Nomor Dokumen <span class="required">*</span></label>' +
        '<input type="text" id="r-nomor" class="form-control" placeholder="Cth: 001/AKT/DIO/I/2024">' +
        '<div class="form-error" id="e-nomor"></div></div>' +
      '</div>' +

      '<div class="form-row col-2">' +
        '<div class="form-group"><label class="form-label">Jenis Berkas <span class="required">*</span></label>' +
        '<select id="r-jenis" class="form-control"><option value="">-- Memuat… --</option></select>' +
        '<div class="form-error" id="e-jenis"></div></div>' +

        '<div class="form-group"><label class="form-label">Kategori Berkas <span class="required">*</span></label>' +
        '<select id="r-kategori" class="form-control"><option value="">-- Memuat… --</option></select>' +
        '<div class="form-error" id="e-kategori"></div></div>' +
      '</div>' +

      '<div class="form-row col-2">' +
        '<div class="form-group"><label class="form-label">Departemen <span class="required">*</span></label>' +
        '<select id="r-dept" class="form-control"><option value="">-- Memuat… --</option></select>' +
        '<div class="form-error" id="e-dept"></div></div>' +

        '<div class="form-group"><label class="form-label">Nomor Berkas</label>' +
        '<input type="text" id="r-noberkas" class="form-control" placeholder="Kosongkan untuk auto-generate">' +
        '<div id="r-noberkas-hint" class="form-hint">Akan digenerate otomatis jika kode klasifikasi dipilih</div></div>' +
      '</div>' +

      '<div class="form-row col-2">' +
        '<div class="form-group"><label class="form-label">Tanggal Dokumen</label>' +
        '<input type="date" id="r-tgl" class="form-control"></div>' +

        '<div class="form-group"><label class="form-label">Tahun Dokumen</label>' +
        '<input type="number" id="r-tahun" class="form-control" min="1900" max="2100" value="' + new Date().getFullYear() + '"></div>' +
      '</div>' +

      '<div class="form-row col-2">' +
        '<div class="form-group"><label class="form-label">Lokasi Simpan Fisik</label>' +
        '<input type="text" id="r-lokasi" class="form-control" placeholder="Cth: Lemari A Rak 2"></div>' +

        '<div class="form-group"><label class="form-label">Klasifikasi Keamanan <span class="required">*</span></label>' +
        '<select id="r-aman" class="form-control"></select></div>' +
      '</div>' +

      '<div class="form-group"><label class="form-label">Keterangan</label>' +
      '<textarea id="r-ket" class="form-control" rows="3" placeholder="Deskripsi singkat isi berkas…"></textarea></div>' +

      '<div style="display:flex;justify-content:flex-end;margin-top:8px">' +
        '<button class="btn btn-primary" onclick="PAGE_REGISTRASI_ARSIP._next()">Lanjut →</button>' +
      '</div>' +
    '</div>' +

    '<div class="step-panel" id="rp2">' +

      '<div class="form-group"><label class="form-label">Kode Klasifikasi <span class="required">*</span></label>' +
      '<select id="r-klas" class="form-control" onchange="PAGE_REGISTRASI_ARSIP._klasChange(this.value)">' +
        '<option value="">-- Memuat daftar klasifikasi… --</option>' +
      '</select>' +
      '<div class="form-error" id="e-klas"></div>' +
      '<div class="klas-info-box" id="r-klas-info"></div></div>' +

      '<div class="form-row col-2">' +
        '<div class="form-group"><label class="form-label">Retensi Aktif (tahun)</label>' +
        '<input type="number" id="r-ret-a" class="form-control" min="0" placeholder="Dari klasifikasi">' +
        '<div class="form-hint">Kosongkan untuk ikuti klasifikasi</div></div>' +

        '<div class="form-group"><label class="form-label">Retensi Inaktif (tahun)</label>' +
        '<input type="number" id="r-ret-i" class="form-control" min="0" placeholder="Dari klasifikasi">' +
        '<div class="form-hint">Kosongkan untuk ikuti klasifikasi</div></div>' +
      '</div>' +

      '<div class="form-group"><label class="form-label">Penyusutan Akhir</label>' +
      '<select id="r-penyusutan" class="form-control"></select>' +
      '<div class="form-hint">Kosongkan untuk mengikuti kode klasifikasi</div></div>' +

      '<div class="form-row col-2">' +
        '<div class="form-group"><label class="form-label">Tanggal Deadline ' +
          '<span style="font-size:10px;color:var(--text-muted)">(Opsional)</span></label>' +
        '<input type="date" id="r-deadline" name="tanggalDeadline" class="form-control">' +
        '<div class="form-hint">Deadline kontrak, perpanjangan, dll.</div></div>' +
        '<div class="form-group"><label class="form-label">Reminder (hari sebelum)</label>' +
        '<input type="number" id="r-reminder" name="reminderHari" class="form-control" ' +
          'min="1" max="365" placeholder="30" value="30">' +
        '<div class="form-hint">Kirim email pengingat N hari sebelum deadline</div></div>' +
      '</div>' +

      '<div style="display:flex;justify-content:space-between;margin-top:8px">' +
        '<button class="btn btn-secondary" onclick="PAGE_REGISTRASI_ARSIP._prev()">← Kembali</button>' +
        '<button class="btn btn-primary" onclick="PAGE_REGISTRASI_ARSIP._next()">Lanjut →</button>' +
      '</div>' +
    '</div>' +

    '<div class="step-panel" id="rp3">' +
      '<p style="font-size:13px;color:var(--text-secondary);margin-bottom:20px">' +
        'Upload file berkas ke Google Drive. <strong>Opsional</strong> — berkas tetap dapat diregistrasi tanpa file.' +
      '</p>' +

      '<div class="reg-upload-zone" id="r-upload-zone"' +
        ' ondragover="PAGE_REGISTRASI_ARSIP._dragOver(event)"' +
        ' ondragleave="PAGE_REGISTRASI_ARSIP._dragLeave()"' +
        ' ondrop="PAGE_REGISTRASI_ARSIP._drop(event)">' +
        '<input type="file" id="r-file" accept="*/*" onchange="PAGE_REGISTRASI_ARSIP._fileSelect(this)">' +
        '<div class="upload-zone-icon">☁️</div>' +
        '<div class="upload-zone-text">Klik atau drag & drop file ke sini</div>' +
        '<div class="upload-zone-hint">PDF, DOCX, AI, PSD, FIG, JPG, PNG, MP4, dll. Maks. 25 MB</div>' +
      '</div>' +

      '<div id="r-preview" style="display:none;margin-top:12px"></div>' +

      '<div class="reg-upload-progress" id="r-progress">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px">' +
          '<span style="color:var(--text-secondary)">Mengupload ke Google Drive…</span>' +
          '<span id="r-pct" style="color:var(--accent)">0%</span>' +
        '</div>' +
        '<div class="progress-bar-wrap"><div class="progress-bar-fill" id="r-bar" style="width:0%"></div></div>' +
      '</div>' +

      '<div id="r-upload-result" style="display:none;margin-top:12px"></div>' +

      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:24px">' +
        '<button class="btn btn-secondary" onclick="PAGE_REGISTRASI_ARSIP._prev()">← Kembali</button>' +
        '<div style="display:flex;gap:10px">' +
          '<button class="btn btn-ghost" id="r-btn-skip" onclick="PAGE_REGISTRASI_ARSIP._submit(false)">Lewati & Simpan</button>' +
          '<button class="btn btn-primary" id="r-btn-upload" onclick="PAGE_REGISTRASI_ARSIP._uploadAndSubmit()">⬆ Upload & Simpan</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="step-panel" id="rp4">' +
      '<div class="reg-success">' +
        '<div class="reg-success-icon">✅</div>' +
        '<div class="reg-success-title">Berkas Berhasil Diregistrasi!</div>' +
        '<div class="reg-success-sub">Berkas telah disimpan ke sistem arsip.</div>' +
        '<div class="reg-success-id" id="r-success-id">–</div>' +
        '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">' +
          '<button class="btn btn-secondary" onclick="APP.navigate(\'manajemen-arsip\')">Lihat Manajemen Arsip</button>' +
          '<button class="btn btn-primary" onclick="PAGE_REGISTRASI_ARSIP.render()">+ Registrasi Berkas Baru</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '</div></div>'
  );
};

PAGE_REGISTRASI_ARSIP._loadData = function () {
  var P  = PAGE_REGISTRASI_ARSIP;
  var c  = APP.constants || {};
  var FB = P._FB;

  APP.populateSelect('r-aman',
    (c.keamanan && c.keamanan.length > 0) ? c.keamanan : FB.keamanan,
    'Internal', '');

  APP.populateSelect('r-penyusutan',
    (c.penyusutan && c.penyusutan.length > 0) ? c.penyusutan : FB.penyusutan,
    '', 'Ikuti klasifikasi');

  APP.populateSelect('r-jenis',    c.jenisBerkas    || [], '', '-- Pilih Jenis Berkas --');
  APP.populateSelect('r-kategori', c.kategoriBerkas || [], '', '-- Pilih Kategori --');

  var el = document.getElementById('r-tgl');
  if (el) el.value = new Date().toISOString().slice(0, 10);

  APP.call('getDepartemenList', [APP.token], function (r) {
    P._deptList = (r && r.success && r.data) ? r.data : (c.departemenDefault || []);
    var user = APP.currentUser;
    APP.populateSelect('r-dept', P._deptList,
      user ? (user.departemen || '') : '', '-- Pilih Departemen --');
  }, { noLoading: true, silent: true });

  APP.call('getClassifications', [APP.token], function (r) {
    if (r && r.success && r.data) {
      P._klasList = r.data.filter(function (k) {
        return k.kode && String(k.kode).trim() !== '';
      });
    } else {
      P._klasList = [];
    }
    P._fillKlasSel();
  }, { noLoading: true, silent: true });
};

PAGE_REGISTRASI_ARSIP._fillKlasSel = function () {
  var sel  = document.getElementById('r-klas');
  if (!sel) return;

  var list = PAGE_REGISTRASI_ARSIP._klasList;
  if (!list || list.length === 0) {
    sel.innerHTML = '<option value="">-- Belum ada kode klasifikasi. Tambah di menu Klasifikasi & JRA --</option>';
    return;
  }

  var sorted = list.slice().sort(function (a, b) {
    return String(a.kode).localeCompare(String(b.kode));
  });

  var html = '<option value="">-- Pilih Kode Klasifikasi --</option>';
  sorted.forEach(function (k) {
    var lvl = parseInt(k.level) || 1;
    var ind = '';
    for (var i = 1; i < lvl; i++) ind += '— ';
    html += '<option value="' + APP._esc(k.kode) + '">' +
      APP._esc(ind + k.kode + ' · ' + (k.namaKlasifikasi || '')) +
    '</option>';
  });
  sel.innerHTML = html;
};

PAGE_REGISTRASI_ARSIP._klasChange = function (kode) {
  var box = document.getElementById('r-klas-info');
  var ra  = document.getElementById('r-ret-a');
  var ri  = document.getElementById('r-ret-i');
  var pen = document.getElementById('r-penyusutan');

  if (!kode) { if (box) box.classList.remove('visible'); return; }

  var k = PAGE_REGISTRASI_ARSIP._klasList.find(function (x) { return x.kode === kode; });
  if (!k) { if (box) box.classList.remove('visible'); return; }

  if (ra  && !ra.value)  ra.value  = k.retensiAktif   != null ? String(k.retensiAktif)   : '';
  if (ri  && !ri.value)  ri.value  = k.retensiInaktif != null ? String(k.retensiInaktif) : '';
  if (pen && !pen.value) pen.value = k.penyusutanAkhir || '';

  if (box) {
    box.innerHTML =
      '<strong style="color:var(--accent)">' + APP._esc(k.kode) + '</strong> ' +
      APP._esc(k.namaKlasifikasi || '') +
      '<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:16px;font-size:11px">' +
        '<span><span style="color:var(--text-muted)">Retensi Aktif:</span> <strong>' + (k.retensiAktif || 0) + ' thn</strong></span>' +
        '<span><span style="color:var(--text-muted)">Retensi Inaktif:</span> <strong>' + (k.retensiInaktif || 0) + ' thn</strong></span>' +
        '<span><span style="color:var(--text-muted)">Penyusutan:</span> <strong>' + APP._esc(k.penyusutanAkhir || '–') + '</strong></span>' +
        '<span><span style="color:var(--text-muted)">Keamanan:</span> ' + APP.keamananBadge(k.klasifikasiKeamanan) + '</span>' +
      '</div>' +
      (k.deskripsi ? '<div style="margin-top:6px;color:var(--text-muted);font-size:11px">' + APP._esc(k.deskripsi) + '</div>' : '');
    box.classList.add('visible');
  }

  var deptEl  = document.getElementById('r-dept');
  var tahunEl = document.getElementById('r-tahun');
  var nomorEl = document.getElementById('r-noberkas');
  var hintEl  = document.getElementById('r-noberkas-hint');
  if (kode && nomorEl && !nomorEl.value) {
    var dept  = deptEl  ? deptEl.value  : '';
    var tahun = tahunEl ? (parseInt(tahunEl.value) || new Date().getFullYear()) : new Date().getFullYear();
    APP.call('previewNomorBerkas', [APP.token, kode, dept, tahun], function (r) {
      if (r && r.success && hintEl) {
        hintEl.textContent = '🔢 Auto: ' + r.nomorBerkas;
        hintEl.style.color = 'var(--accent)';
      }
    }, { noLoading: true, silent: true });
  }
};

PAGE_REGISTRASI_ARSIP._next = function () {
  var s = PAGE_REGISTRASI_ARSIP._step;
  if (s === 1 && !PAGE_REGISTRASI_ARSIP._val1()) return;
  if (s === 2 && !PAGE_REGISTRASI_ARSIP._val2()) return;
  PAGE_REGISTRASI_ARSIP._go(s + 1);
};
PAGE_REGISTRASI_ARSIP._prev = function () {
  var s = PAGE_REGISTRASI_ARSIP._step;
  if (s > 1) PAGE_REGISTRASI_ARSIP._go(s - 1);
};

PAGE_REGISTRASI_ARSIP._go = function (n) {
  PAGE_REGISTRASI_ARSIP._step = n;
  for (var i = 1; i <= 4; i++) {
    var panel  = document.getElementById('rp' + i);
    var stepEl = document.getElementById('rs' + i);
    var numEl  = document.getElementById('rsn' + i);
    if (panel)  panel.classList.toggle('active', i === n);
    if (stepEl && numEl) {
      stepEl.classList.remove('active','done');
      if (i < n)  { stepEl.classList.add('done');   numEl.textContent = '✓'; }
      if (i === n){ stepEl.classList.add('active');  numEl.textContent = String(i); }
      if (i > n)  { numEl.textContent = String(i); }
    }
  }
  var pc = document.getElementById('page-content');
  if (pc) pc.scrollTop = 0;
};

PAGE_REGISTRASI_ARSIP._val1 = function () {
  var ok = true;
  [
    { id:'r-nama',    err:'e-nama',    msg:'Nama berkas wajib diisi.' },
    { id:'r-nomor',   err:'e-nomor',   msg:'Nomor dokumen wajib diisi.' },
    { id:'r-jenis',   err:'e-jenis',   msg:'Pilih jenis berkas.' },
    { id:'r-kategori',err:'e-kategori',msg:'Pilih kategori berkas.' },
    { id:'r-dept',    err:'e-dept',    msg:'Pilih departemen.' }
  ].forEach(function (c) {
    var el = document.getElementById(c.id);
    var ee = document.getElementById(c.err);
    var empty = !el || !el.value || !el.value.trim();
    if (el) el.classList.toggle('is-invalid', empty);
    if (ee) { ee.textContent = empty ? c.msg : ''; ee.style.display = empty ? 'block' : 'none'; }
    if (empty) ok = false;
  });
  return ok;
};

PAGE_REGISTRASI_ARSIP._val2 = function () {
  var el = document.getElementById('r-klas');
  var ee = document.getElementById('e-klas');
  var empty = !el || !el.value;
  if (el) el.classList.toggle('is-invalid', empty);
  if (ee) { ee.textContent = empty ? 'Pilih kode klasifikasi.' : ''; ee.style.display = empty ? 'block' : 'none'; }
  return !empty;
};

PAGE_REGISTRASI_ARSIP._fileSelect = function (input) {
  if (input.files && input.files[0]) PAGE_REGISTRASI_ARSIP._showPreview(input.files[0]);
};
PAGE_REGISTRASI_ARSIP._dragOver = function (e) {
  e.preventDefault();
  var z = document.getElementById('r-upload-zone');
  if (z) z.classList.add('dragover');
};
PAGE_REGISTRASI_ARSIP._dragLeave = function () {
  var z = document.getElementById('r-upload-zone');
  if (z) z.classList.remove('dragover');
};
PAGE_REGISTRASI_ARSIP._drop = function (e) {
  e.preventDefault();
  var z = document.getElementById('r-upload-zone');
  if (z) z.classList.remove('dragover');
  var files = e.dataTransfer && e.dataTransfer.files;
  if (!files || !files[0]) return;
  var input = document.getElementById('r-file');
  if (input) {
    try { var dt = new DataTransfer(); dt.items.add(files[0]); input.files = dt.files; } catch(ex) {}
    PAGE_REGISTRASI_ARSIP._showPreview(files[0]);
  }
};
PAGE_REGISTRASI_ARSIP._showPreview = function (file) {
  var prev = document.getElementById('r-preview');
  var res  = document.getElementById('r-upload-result');
  if (res) res.style.display = 'none';
  var ext  = (file.name || '').split('.').pop().toLowerCase();
  var tipe = ((APP.constants || {}).extToTipe || {})[ext] || 'Lainnya';
  if (prev) {
    prev.style.display = '';
    prev.innerHTML = '<div class="upload-preview">' +
      '<div class="upload-preview-icon">' + APP.tipeBerkasIcon(tipe) + '</div>' +
      '<div class="upload-preview-info">' +
        '<div class="upload-preview-name">' + APP._esc(file.name) + '</div>' +
        '<div class="upload-preview-meta">' + APP.formatFileSize(file.size) + ' · ' + APP._esc(tipe) + '</div>' +
      '</div>' +
      '<span class="upload-preview-remove" onclick="PAGE_REGISTRASI_ARSIP._clearFile()" title="Hapus">✕</span>' +
    '</div>';
  }
};
PAGE_REGISTRASI_ARSIP._clearFile = function () {
  var input = document.getElementById('r-file');
  var prev  = document.getElementById('r-preview');
  var res   = document.getElementById('r-upload-result');
  if (input) input.value = '';
  if (prev)  { prev.style.display = 'none'; prev.innerHTML = ''; }
  if (res)   { res.style.display  = 'none'; res.innerHTML  = ''; }
  PAGE_REGISTRASI_ARSIP._uploadResult = null;
};

PAGE_REGISTRASI_ARSIP._uploadAndSubmit = function () {
  var input = document.getElementById('r-file');
  if (!input || !input.files || !input.files[0]) {
    PAGE_REGISTRASI_ARSIP._submit(false);
    return;
  }
  var prog  = document.getElementById('r-progress');
  var pctEl = document.getElementById('r-pct');
  var barEl = document.getElementById('r-bar');
  var btnUp = document.getElementById('r-btn-upload');
  var btnSk = document.getElementById('r-btn-skip');
  var res   = document.getElementById('r-upload-result');

  if (prog)  prog.classList.add('visible');
  if (btnUp) { btnUp.disabled = true; btnUp.textContent = 'Mengupload…'; }
  if (btnSk) { btnSk.disabled = true; }
  if (res)   res.style.display = 'none';

  var extToTipe  = ((APP.constants || {}).extToTipe) || {};
  var file       = input.files[0];
  var ext        = (file.name || '').split('.').pop().toLowerCase();
  var tipeBerkas = extToTipe[ext] || 'Lainnya';
  var dept       = ((document.getElementById('r-dept') || {}).value) || ((APP.currentUser || {}).departemen) || 'Umum';
  var tahun      = parseInt(((document.getElementById('r-tahun') || {}).value)) || new Date().getFullYear();

  APP.uploadFile(input, { departemen: dept, year: tahun, tipeBerkas: tipeBerkas },
    function (pct) {
      if (pctEl) pctEl.textContent = pct + '%';
      if (barEl) barEl.style.width  = pct + '%';
    }
  ).then(function (up) {
    if (prog)  prog.classList.remove('visible');
    if (btnUp) { btnUp.disabled = false; btnUp.textContent = '⬆ Upload & Simpan'; }
    if (btnSk) { btnSk.disabled = false; }
    if (!up) return;
    PAGE_REGISTRASI_ARSIP._uploadResult = up;
    if (res) {
      res.style.display = '';
      res.innerHTML = '<div class="badge badge-success" style="padding:8px 14px;border-radius:8px;display:inline-flex;gap:8px">' +
        '✅ Upload berhasil: <strong>' + APP._esc(up.fileName) + '</strong> (' + APP.formatFileSize(up.fileSize) + ')</div>';
    }
    PAGE_REGISTRASI_ARSIP._submit(true);
  }).catch(function () {
    if (prog)  prog.classList.remove('visible');
    if (btnUp) { btnUp.disabled = false; btnUp.textContent = '⬆ Upload & Simpan'; }
    if (btnSk) { btnSk.disabled = false; }
  });
};

PAGE_REGISTRASI_ARSIP._submit = function (hasUpload) {
  var g = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };

  var d = {
    namaBerkas         : g('r-nama'),
    nomorDokumen       : g('r-nomor'),
    jenisBerkas        : g('r-jenis'),
    kategoriBerkas     : g('r-kategori'),
    departemen         : g('r-dept'),
    nomorBerkas        : g('r-noberkas'),
    tanggalDokumen     : g('r-tgl'),
    tahunDokumen       : g('r-tahun') ? parseInt(g('r-tahun')) : new Date().getFullYear(),
    lokasiSimpan       : g('r-lokasi'),
    klasifikasiKeamanan: g('r-aman'),
    keterangan         : g('r-ket'),
    kodeKlasifikasi    : g('r-klas'),
    retensiAktif       : g('r-ret-a') !== '' ? Number(g('r-ret-a')) : '',
    retensiInaktif     : g('r-ret-i') !== '' ? Number(g('r-ret-i')) : '',
    penyusutanAkhir    : g('r-penyusutan'),
    tanggalDeadline    : g('r-deadline')  || '',
    reminderHari       : parseInt(g('r-reminder') || '0')
  };

  if (hasUpload && PAGE_REGISTRASI_ARSIP._uploadResult) {
    var up = PAGE_REGISTRASI_ARSIP._uploadResult;
    d.fileId = up.fileId || ''; d.fileUrl = up.fileUrl || ''; d.fileName = up.fileName || '';
    d.fileType = up.tipeBerkas || ''; d.fileSize = up.fileSize || 0; d.tipeBerkas = up.tipeBerkas || '';
  } else {
    d.fileId = ''; d.fileUrl = ''; d.fileName = ''; d.fileType = ''; d.fileSize = 0; d.tipeBerkas = '';
  }

  var req = ['namaBerkas','nomorDokumen','kodeKlasifikasi','jenisBerkas','kategoriBerkas'];
  for (var i = 0; i < req.length; i++) {
    if (!d[req[i]]) {
      APP.toast('Field "' + req[i] + '" wajib diisi.', 'warning');
      PAGE_REGISTRASI_ARSIP._go(req[i] === 'kodeKlasifikasi' ? 2 : 1);
      return;
    }
  }

  APP.call('checkDuplicates', [APP.token, d.namaBerkas, d.nomorDokumen], function (dupResult) {
    if (dupResult && dupResult.success && dupResult.data && dupResult.data.length > 0) {
      var esc = APP._esc;
      var dupHtml = '<div style="font-size:13px;margin-bottom:12px">⚠️ Ditemukan ' +
        dupResult.data.length + ' dokumen yang mungkin serupa:</div>' +
        '<div style="max-height:200px;overflow-y:auto">';
      dupResult.data.forEach(function (a) {
        var badge = a.nomorMatch
          ? '<span class="badge badge-danger" style="font-size:10px">Nomor sama</span>'
          : '<span class="badge badge-warning" style="font-size:10px">' + a.similarity + '% mirip</span>';
        dupHtml += '<div style="padding:8px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px">' +
          '<div style="font-weight:500;font-size:12px">' + esc(a.namaBerkas) + ' ' + badge + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted)">' + esc(a.nomorDokumen||'–') +
          ' · ' + esc(a.departemen||'') + ' · ' + esc(a.createdAt||'') + '</div>' +
        '</div>';
      });
      dupHtml += '</div>';

      APP.confirm({
        icon       : '⚠️',
        title      : 'Kemungkinan Duplikat Terdeteksi',
        msg        : dupHtml,
        okLabel    : 'Tetap Simpan',
        okClass    : 'btn-warning',
        cancelLabel: 'Batal'
      }).then(function (ok) {
        if (!ok) {
          var btn2 = document.getElementById('r-btn-submit');
          if (btn2) { btn2.disabled = false; btn2.textContent = 'Simpan Berkas'; }
          return;
        }
        PAGE_REGISTRASI_ARSIP._doRegister(d);
      });
    } else {
      PAGE_REGISTRASI_ARSIP._doRegister(d);
    }
  }, { noLoading: true, silent: true });
};

PAGE_REGISTRASI_ARSIP._doRegister = function (d) {
  APP.call('registerArchive', [APP.token, d], function (result) {
    if (!result || !result.success) {
      APP.toast((result && result.message) || 'Gagal menyimpan berkas.', 'danger');
      return;
    }
    PAGE_REGISTRASI_ARSIP._savedId = result.id || '';
    PAGE_REGISTRASI_ARSIP._go(4);
    var idEl = document.getElementById('r-success-id');
    if (idEl) idEl.textContent = 'ID: ' + (result.id || '');
  });
};
