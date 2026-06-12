/* ═══════════════════════════════════════════════════════════════
   Page_Pengaturan — E-ARSIP DIO
   Exposes: window.PAGE_PENGATURAN
   Access: SUPER_ADMIN, ADMIN only

   Code.gs functions used:
     getAllSettings(token)
       → { success, data: { key: value, … } }
         All setting keys returned as a plain object.
         Keys:
           app_name, app_subtitle, footer_copyright, app_logo_url
           kop_line1, kop_line2, kop_line3, kop_line4, kop_line5, kop_logo_url
           drive_folder_id  ← READ-ONLY (auto-managed, never sent to saveSettings)
           session_duration, max_file_mb, retention_warn_days

     saveSettings(token, settingsObj)
       → { success, message }
         Accepts any key-value pairs EXCEPT drive_folder_id (ignored server-side).
         Only SUPER_ADMIN and ADMIN can call.

     getDriveInfo(token)
       → { success, folderName, folderId, folderUrl }
         Returns the root Google Drive folder info.
         drive_folder_id is auto-generated and shown read-only here.

     exportBackupJSON(token)
       → { success, data: jsonString }
         SUPER_ADMIN only.

     exportArchivesCSV(token, filters)
       → { success, data: csvString }
         SUPER_ADMIN + ADMIN. Passes empty filters = all archives.
═══════════════════════════════════════════════════════════════ */

window.PAGE_PENGATURAN = {};

/* ── Internal state ── */
PAGE_PENGATURAN._settings = {};  // from getAllSettings

/* Setting keys that are editable via saveSettings.
   drive_folder_id is excluded — it is auto-managed by Code.gs. */
PAGE_PENGATURAN.EDITABLE_KEYS = [
  'app_name', 'app_subtitle', 'footer_copyright', 'app_logo_url',
  'kop_line1', 'kop_line2', 'kop_line3', 'kop_line4', 'kop_line5', 'kop_logo_url',
  'session_duration', 'max_file_mb', 'retention_warn_days'
];

/* ──────────────────────────────────────────────────────────────
   RENDER
────────────────────────────────────────────────────────────── */
PAGE_PENGATURAN.render = function (params) {
  var pc = document.getElementById('page-content');
  if (!pc) return;

  PAGE_PENGATURAN._settings = {};
  pc.innerHTML = PAGE_PENGATURAN._shellHtml();
  PAGE_PENGATURAN._load();
};

/* ──────────────────────────────────────────────────────────────
   SHELL HTML — sections rendered as skeleton while loading
────────────────────────────────────────────────────────────── */
PAGE_PENGATURAN._shellHtml = function () {
  return '<div class="page-header">' +
    '<div class="page-header-left">' +
      '<h1 class="page-title">Pengaturan Sistem</h1>' +
      '<p class="page-subtitle">Konfigurasi identitas aplikasi dan parameter sistem</p>' +
    '</div>' +
  '</div>' +
  '<div id="settings-body">' +
    '<div class="card"><div class="card-body">' +
      '<div class="skeleton" style="height:200px;border-radius:8px"></div>' +
    '</div></div>' +
  '</div>';
};

/* ──────────────────────────────────────────────────────────────
   LOAD — getAllSettings + getDriveInfo (parallel)
────────────────────────────────────────────────────────────── */
PAGE_PENGATURAN._load = function () {
  var settingsDone = false;
  var driveDone    = false;
  var driveData    = null;

  var tryRender = function () {
    if (settingsDone && driveDone) {
      PAGE_PENGATURAN._renderForm(driveData);
    }
  };

  APP.call('getAllSettings', [APP.token], function (result) {
    if (result && result.success) {
      PAGE_PENGATURAN._settings = result.data || {};
    }
    settingsDone = true;
    tryRender();
  }, { noLoading: true });

  APP.call('getDriveInfo', [APP.token], function (result) {
    driveData = (result && result.success) ? result : null;
    driveDone = true;
    tryRender();
  }, { noLoading: true, silent: true });
};

/* ──────────────────────────────────────────────────────────────
   RENDER FORM — fills #settings-body with all sections
────────────────────────────────────────────────────────────── */
PAGE_PENGATURAN._renderForm = function (driveData) {
  var body = document.getElementById('settings-body');
  if (!body) return;

  var s   = PAGE_PENGATURAN._settings;
  var esc = APP._esc;
  var actor = APP.currentUser;
  var isSuperAdmin = actor && actor.role === 'SUPER_ADMIN';

  var html = '';

  /* ────────────────────────────────────────────────────────
     SECTION 1: Identitas Aplikasi
  ──────────────────────────────────────────────────────── */
  html += '<div class="card" style="margin-bottom:16px">' +
    '<div class="card-header"><span class="card-title">🏷 Identitas Aplikasi</span></div>' +
    '<div class="card-body">' +
      '<div class="setting-section">' +

        /* Logo aplikasi — URL input + live preview */
        '<div class="setting-section-title">🖼 Logo Aplikasi (Login & Sidebar)</div>' +
        '<div class="logo-upload-zone" onclick="PAGE_PENGATURAN._focusLogoUrl(\'app_logo_url\')">' +
          '<div class="logo-preview" id="prev-app-logo">' +
            PAGE_PENGATURAN._logoPreviewContent(s['app_logo_url'], '🗂') +
          '</div>' +
          '<div class="logo-upload-info">' +
            '<div class="logo-upload-title">URL Logo Aplikasi</div>' +
            '<div class="logo-upload-hint">Masukkan URL publik gambar (PNG/SVG, maks 2MB). ' +
              'Logo akan tampil di halaman login dan sidebar.</div>' +
          '</div>' +
        '</div>' +
        '<div class="form-group" style="margin-top:10px">' +
          '<input type="url" id="set-app_logo_url" name="app_logo_url" class="form-control" ' +
            'placeholder="https://..." ' +
            'value="' + esc(s['app_logo_url'] || '') + '" ' +
            'oninput="PAGE_PENGATURAN._previewLogo(\'app_logo_url\',\'prev-app-logo\',this.value,\'🗂\')">' +
        '</div>' +

        '<div class="form-row col-2" style="margin-top:16px">' +
          '<div class="form-group">' +
            '<label class="form-label" for="set-app_name">Nama Aplikasi</label>' +
            '<input type="text" id="set-app_name" name="app_name" class="form-control" ' +
              'placeholder="E-ARSIP DIO" ' +
              'value="' + esc(s['app_name'] || '') + '">' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label" for="set-app_subtitle">Sub Judul Aplikasi</label>' +
            '<input type="text" id="set-app_subtitle" name="app_subtitle" class="form-control" ' +
              'placeholder="Sistem Kearsipan Legal Corporate" ' +
              'value="' + esc(s['app_subtitle'] || '') + '">' +
          '</div>' +
        '</div>' +

        '<div class="form-group">' +
          '<label class="form-label" for="set-footer_copyright">Teks Footer Copyright</label>' +
          '<input type="text" id="set-footer_copyright" name="footer_copyright" class="form-control" ' +
            'placeholder="DIO Legal Archive" ' +
            'value="' + esc(s['footer_copyright'] || '') + '">' +
        '</div>' +

      '</div>' +
    '</div>' +
  '</div>' +

  /* ────────────────────────────────────────────────────────
     SECTION 2: Kop Surat Laporan
  ──────────────────────────────────────────────────────── */
  '<div class="card" style="margin-bottom:16px">' +
    '<div class="card-header"><span class="card-title">📄 Kop Surat Laporan</span></div>' +
    '<div class="card-body">' +
      '<div class="setting-section">' +

        /* Kop logo */
        '<div class="setting-section-title">🖼 Logo Kop Surat (untuk cetak laporan)</div>' +
        '<div class="logo-upload-zone" onclick="PAGE_PENGATURAN._focusLogoUrl(\'kop_logo_url\')">' +
          '<div class="logo-preview" id="prev-kop-logo">' +
            PAGE_PENGATURAN._logoPreviewContent(s['kop_logo_url'], '🗂') +
          '</div>' +
          '<div class="logo-upload-info">' +
            '<div class="logo-upload-title">URL Logo Kop Surat</div>' +
            '<div class="logo-upload-hint">Gunakan file PNG transparan untuk hasil cetak terbaik (maks 2MB).</div>' +
          '</div>' +
        '</div>' +
        '<div class="form-group" style="margin-top:10px">' +
          '<input type="url" id="set-kop_logo_url" name="kop_logo_url" class="form-control" ' +
            'placeholder="https://..." ' +
            'value="' + esc(s['kop_logo_url'] || '') + '" ' +
            'oninput="PAGE_PENGATURAN._previewLogo(\'kop_logo_url\',\'prev-kop-logo\',this.value,\'🗂\')">' +
        '</div>' +

        '<div class="form-row col-2" style="margin-top:16px">' +
          '<div class="form-group">' +
            '<label class="form-label" for="set-kop_line1">' +
              'Baris 1 — Nama Perusahaan <span style="font-size:10px">(Tebal & Besar)</span>' +
            '</label>' +
            '<input type="text" id="set-kop_line1" name="kop_line1" class="form-control" ' +
              'placeholder="DIO LEGAL CORPORATE" ' +
              'value="' + esc(s['kop_line1'] || '') + '" ' +
              'oninput="PAGE_PENGATURAN._updateKopPreview()">' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label" for="set-kop_line2">' +
              'Baris 2 — Satuan Kerja / Divisi <span style="font-size:10px">(Tebal)</span>' +
            '</label>' +
            '<input type="text" id="set-kop_line2" name="kop_line2" class="form-control" ' +
              'placeholder="Divisi Kearsipan & Dokumentasi" ' +
              'value="' + esc(s['kop_line2'] || '') + '" ' +
              'oninput="PAGE_PENGATURAN._updateKopPreview()">' +
          '</div>' +
        '</div>' +

        '<div class="form-row col-2">' +
          '<div class="form-group">' +
            '<label class="form-label" for="set-kop_line3">Baris 3 — Alamat</label>' +
            '<input type="text" id="set-kop_line3" name="kop_line3" class="form-control" ' +
              'placeholder="Jl. Contoh No. 1, Jakarta 10000" ' +
              'value="' + esc(s['kop_line3'] || '') + '" ' +
              'oninput="PAGE_PENGATURAN._updateKopPreview()">' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label" for="set-kop_line4">Baris 4 — Telepon / Fax</label>' +
            '<input type="text" id="set-kop_line4" name="kop_line4" class="form-control" ' +
              'placeholder="Telp. (021) 000000; Fax. (021) 000001" ' +
              'value="' + esc(s['kop_line4'] || '') + '" ' +
              'oninput="PAGE_PENGATURAN._updateKopPreview()">' +
          '</div>' +
        '</div>' +

        '<div class="form-group">' +
          '<label class="form-label" for="set-kop_line5">Baris 5 — Email / Website</label>' +
          '<input type="text" id="set-kop_line5" name="kop_line5" class="form-control" ' +
            'placeholder="E-mail: info@dio.co.id; Website: www.dio.co.id" ' +
            'value="' + esc(s['kop_line5'] || '') + '" ' +
            'oninput="PAGE_PENGATURAN._updateKopPreview()">' +
        '</div>' +

        /* Kop mini preview */
        '<button class="btn btn-ghost btn-sm" style="margin-bottom:8px" ' +
          'onclick="PAGE_PENGATURAN._toggleKopPreview()">👁 Pratinjau Kop Surat</button>' +
        '<div class="kop-mini-preview" id="kop-mini-preview">' +
          '<div class="kop-mini-line1" id="kprev-line1">' + esc(s['kop_line1'] || '') + '</div>' +
          '<div class="kop-mini-line2" id="kprev-line2">' + esc(s['kop_line2'] || '') + '</div>' +
          '<div class="kop-mini-line3" id="kprev-line3">' + esc(s['kop_line3'] || '') + '</div>' +
          '<div class="kop-mini-line4" id="kprev-line4">' + esc(s['kop_line4'] || '') + '</div>' +
          '<div class="kop-mini-line5" id="kprev-line5">' + esc(s['kop_line5'] || '') + '</div>' +
        '</div>' +

      '</div>' +
    '</div>' +
  '</div>' +

  /* ────────────────────────────────────────────────────────
     SECTION 3: Parameter Sistem
  ──────────────────────────────────────────────────────── */
  '<div class="card" style="margin-bottom:16px">' +
    '<div class="card-header"><span class="card-title">⚙️ Parameter Sistem</span></div>' +
    '<div class="card-body">' +

      '<div class="form-row col-2">' +
        '<div class="form-group">' +
          '<label class="form-label" for="set-session_duration">Durasi Sesi (detik)</label>' +
          '<input type="number" id="set-session_duration" name="session_duration" ' +
            'class="form-control" min="300" max="86400" step="60" ' +
            'placeholder="3600" value="' + esc(s['session_duration'] || '3600') + '">' +
          '<div class="form-hint">Minimum 300 (5 menit), maksimum 21600 (6 jam), default 14400 (4 jam)</div>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label" for="set-max_file_mb">Maks Upload File (MB)</label>' +
          '<input type="number" id="set-max_file_mb" name="max_file_mb" ' +
            'class="form-control" min="1" max="100" ' +
            'placeholder="25" value="' + esc(s['max_file_mb'] || '25') + '">' +
          '<div class="form-hint">Batas ukuran file yang dapat diupload per berkas</div>' +
        '</div>' +
      '</div>' +

      '<div class="form-group">' +
        '<label class="form-label" for="set-retention_warn_days">Jangka Peringatan Retensi (hari)</label>' +
        '<input type="number" id="set-retention_warn_days" name="retention_warn_days" ' +
          'class="form-control" min="1" max="365" ' +
          'style="max-width:200px" ' +
          'placeholder="90" value="' + esc(s['retention_warn_days'] || '90') + '">' +
        '<div class="form-hint">Berkas akan muncul di Jadwal Retensi N hari sebelum tanggal musnah</div>' +
      '</div>' +

    '</div>' +
  '</div>' +

  /* ────────────────────────────────────────────────────────
     SECTION 4: Google Drive
  ──────────────────────────────────────────────────────── */
  '<div class="card" style="margin-bottom:16px">' +
    '<div class="card-header"><span class="card-title">☁️ Google Drive</span></div>' +
    '<div class="card-body">' +

      '<p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px">' +
        'Folder Google Drive dibuat dan dikelola otomatis oleh sistem. ' +
        'Berkas tersimpan dalam struktur: <code style="color:var(--accent);font-family:var(--font-mono);' +
        'font-size:11px">E-ARSIP DIO / TAHUN / DEPARTEMEN / TIPE</code>' +
      '</p>' +

      (driveData
        ? '<div class="drive-info-box">' +
            '<div class="drive-info-icon">📁</div>' +
            '<div class="drive-info-text">' +
              '<div class="drive-info-name">' + APP._esc(driveData.folderName) + '</div>' +
              '<div class="drive-info-id">ID: ' + APP._esc(driveData.folderId) + '</div>' +
            '</div>' +
            '<a href="' + APP._esc(driveData.folderUrl) + '" target="_blank" rel="noopener" ' +
              'class="btn btn-secondary btn-sm">Buka di Drive ↗</a>' +
          '</div>'
        : '<div class="drive-info-box" style="opacity:0.6">' +
            '<div class="drive-info-icon">📁</div>' +
            '<div class="drive-info-text">' +
              '<div class="drive-info-name">Folder belum dibuat</div>' +
              '<div class="drive-info-id">Akan dibuat otomatis saat pertama kali upload berkas</div>' +
            '</div>' +
          '</div>') +

    '</div>' +
  '</div>' +

  /* ────────────────────────────────────────────────────────
     SECTION 5: Backup & Keamanan (SUPER_ADMIN only view)
  ──────────────────────────────────────────────────────── */
  (isSuperAdmin
    ? '<div class="card" style="margin-bottom:16px">' +
        '<div class="card-header"><span class="card-title">🔒 Keamanan & Backup</span></div>' +
        '<div class="card-body">' +

          '<div class="setting-section-title" style="margin-bottom:14px">Export Backup Database</div>' +
          '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:14px">' +
            'Download backup lengkap untuk disimpan di server lokal atau komputer Anda. ' +
            'Password pengguna tidak disertakan dalam backup.' +
          '</p>' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
            '<button class="btn btn-secondary" id="btn-export-json" ' +
              'onclick="PAGE_PENGATURAN._exportJSON()">💾 Export JSON</button>' +
            '<button class="btn btn-secondary" id="btn-export-csv" ' +
              'onclick="PAGE_PENGATURAN._exportCSV()">📊 Export CSV Arsip</button>' +
          '</div>' +

          '<div class="divider"></div>' +

          '<div class="setting-section-title" style="margin-bottom:10px">Proteksi Dokumen Rahasia</div>' +
          '<div class="security-note">' +
            '<strong style="color:var(--warning)">⚠ Catatan Keamanan:</strong>' +
            '<ul>' +
              '<li>File dengan klasifikasi "Rahasia" dan "Sangat Rahasia" hanya dapat diakses oleh Admin dan unit terkait</li>' +
              '<li>Semua akses tercatat dalam audit trail secara otomatis</li>' +
              '<li>Gunakan Google Drive dengan enkripsi untuk keamanan maksimal</li>' +
              '<li>Backup rutin disarankan minimal setiap bulan</li>' +
            '</ul>' +
          '</div>' +

        '</div>' +
      '</div>'
    : '') +

  /* ── Save button ── */
  '<div style="display:flex;justify-content:flex-end;gap:10px;padding-bottom:20px">' +
    '<button class="btn btn-secondary" onclick="PAGE_PENGATURAN._load()">↺ Reset</button>' +
    '<button class="btn btn-primary" id="btn-save-settings" ' +
      'onclick="PAGE_PENGATURAN._save()">✓ Simpan Perubahan</button>' +
  '</div>';

  body.innerHTML = html;
};

/* ──────────────────────────────────────────────────────────────
   LOGO PREVIEW HELPERS
────────────────────────────────────────────────────────────── */
PAGE_PENGATURAN._logoPreviewContent = function (url, fallback) {
  if (!url) return fallback || '🗂';
  return '<img src="' + APP._esc(url) + '" alt="Logo" ' +
    'style="width:100%;height:100%;object-fit:contain" ' +
    'onerror="this.parentElement.innerHTML=\'' + (fallback || '🗂') + '\'">';
};

PAGE_PENGATURAN._previewLogo = function (key, previewId, url, fallback) {
  var el = document.getElementById(previewId);
  if (!el) return;
  el.innerHTML = PAGE_PENGATURAN._logoPreviewContent(url, fallback);
};

PAGE_PENGATURAN._focusLogoUrl = function (key) {
  var el = document.getElementById('set-' + key);
  if (el) el.focus();
};

/* ──────────────────────────────────────────────────────────────
   KOP SURAT LIVE PREVIEW
────────────────────────────────────────────────────────────── */
PAGE_PENGATURAN._kopPreviewVisible = false;

PAGE_PENGATURAN._toggleKopPreview = function () {
  PAGE_PENGATURAN._kopPreviewVisible = !PAGE_PENGATURAN._kopPreviewVisible;
  var el = document.getElementById('kop-mini-preview');
  if (el) el.classList.toggle('visible', PAGE_PENGATURAN._kopPreviewVisible);
};

PAGE_PENGATURAN._updateKopPreview = function () {
  var lines = ['kop_line1','kop_line2','kop_line3','kop_line4','kop_line5'];
  lines.forEach(function (key) {
    var input   = document.getElementById('set-' + key);
    var preview = document.getElementById('kprev-' + key.replace('kop_',''));
    if (input && preview) preview.textContent = input.value;
  });
};

/* ──────────────────────────────────────────────────────────────
   SAVE — saveSettings(token, settingsObj)
   Only sends EDITABLE_KEYS — never includes drive_folder_id
────────────────────────────────────────────────────────────── */
PAGE_PENGATURAN._save = function () {
  /* Collect values only for EDITABLE_KEYS */
  var settingsObj = {};
  PAGE_PENGATURAN.EDITABLE_KEYS.forEach(function (key) {
    var el = document.getElementById('set-' + key);
    if (el) settingsObj[key] = el.value.trim();
  });

  /* Validate numeric fields */
  var numChecks = [
    { key: 'session_duration',    min: 300,  max: 21600, label: 'Durasi Sesi' },  // GAS ScriptCache max 21600s (6h)
    { key: 'max_file_mb',         min: 1,    max: 100,   label: 'Maks Upload File' },
    { key: 'retention_warn_days', min: 1,    max: 365,   label: 'Jangka Peringatan Retensi' }
  ];

  for (var i = 0; i < numChecks.length; i++) {
    var chk = numChecks[i];
    var val = parseInt(settingsObj[chk.key]);
    if (settingsObj[chk.key] !== '' && (isNaN(val) || val < chk.min || val > chk.max)) {
      APP.toast(chk.label + ' harus antara ' + chk.min + ' dan ' + chk.max + '.', 'warning');
      var inp = document.getElementById('set-' + chk.key);
      if (inp) inp.focus();
      return;
    }
  }

  var btn = document.getElementById('btn-save-settings');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Menyimpan…'; }

  APP.call('saveSettings', [APP.token, settingsObj], function (result) {
    if (btn) { btn.disabled = false; btn.textContent = '✓ Simpan Perubahan'; }

    if (result && result.success) {
      APP.toast(result.message || 'Pengaturan berhasil disimpan.', 'success');

      /* Update app meta in landing/topbar with new app_name */
      if (settingsObj.app_name) {
        document.title = settingsObj.app_name;
        var sbName = document.getElementById('sb-app-name');
        if (sbName) {
          var parts = settingsObj.app_name.split(' ');
          var last  = parts.pop();
          sbName.innerHTML = (parts.length ? parts.join(' ') + ' ' : '') +
            '<span>' + APP._esc(last) + '</span>';
        }
      }
    } else {
      APP.toast((result && result.message) || 'Gagal menyimpan pengaturan.', 'danger');
    }
  });
};

/* ──────────────────────────────────────────────────────────────
   BACKUP EXPORT (from this page — same as Page_Laporan)
────────────────────────────────────────────────────────────── */
PAGE_PENGATURAN._exportJSON = function () {
  var actor = APP.currentUser;
  if (!actor || actor.role !== 'SUPER_ADMIN') {
    APP.toast('Hanya Super Admin yang dapat melakukan backup.', 'warning');
    return;
  }

  APP.confirm({
    icon       : '💾',
    title      : 'Export Backup JSON',
    msg        : 'Seluruh data arsip, klasifikasi, dan pengaturan akan diekspor. ' +
                 'Password pengguna tidak disertakan.',
    okLabel    : 'Export',
    okClass    : 'btn-primary',
    cancelLabel: 'Batal'
  }).then(function (ok) {
    if (!ok) return;

    var btn = document.getElementById('btn-export-json');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Memproses…'; }

    APP.call('exportBackupJSON', [APP.token], function (result) {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Export JSON'; }

      if (!result || !result.success) {
        APP.toast((result && result.message) || 'Gagal export backup.', 'danger');
        return;
      }

      var date = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      APP.downloadText(result.data, 'earsip-dio-backup-' + date + '.json', 'application/json');
      APP.toast('Backup JSON berhasil diunduh.', 'success');
    });
  });
};

PAGE_PENGATURAN._exportCSV = function () {
  var btn = document.getElementById('btn-export-csv');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Mengekspor…'; }

  /* Export all archives — empty filters = no restriction */
  APP.call('exportArchivesCSV', [APP.token, {}], function (result) {
    if (btn) { btn.disabled = false; btn.textContent = '📊 Export CSV Arsip'; }

    if (!result || !result.success) {
      APP.toast((result && result.message) || 'Gagal export CSV.', 'danger');
      return;
    }

    var date = new Date().toISOString().slice(0, 10);
    APP.downloadText(result.data, 'earsip-dio-arsip-' + date + '.csv', 'text/csv;charset=utf-8');
    APP.toast('Export CSV berhasil diunduh.', 'success');
  });
};
