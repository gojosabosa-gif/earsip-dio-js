/* ═══════════════════════════════════════════════════════════════
   Page_Laporan — E-ARSIP DIO
   Exposes: window.PAGE_LAPORAN
   Access: SUPER_ADMIN, ADMIN only

   Code.gs functions used:
     getReportData(token, filters)
       → { success, data[], total, kop, generatedAt }
         filters: all getArchives filters + bulan (1-12 month number)
           Accepted filter keys:
             search, kodeKlasifikasi, jenisBerkas, tipeBerkas,
             departemen, statusArsip, klasifikasiKeamanan, tahun,
             lokasiSimpan, bulan
         kop: {
           kop_line1, kop_line2, kop_line3, kop_line4, kop_line5,
           kop_logo_url, app_name, footer_copyright
         }
         generatedAt: formatted date string

     exportArchivesCSV(token, filters)
       → { success, data: csvString }
         Access: SUPER_ADMIN, ADMIN
         filters: same as getArchives (no bulan)

     exportBackupJSON(token)
       → { success, data: jsonString }
         Access: SUPER_ADMIN only

   APP.constants used:
     statusArsip[], keamanan[], tipeBerkas[], jenisBerkas[], departemenDefault[]
═══════════════════════════════════════════════════════════════ */

window.PAGE_LAPORAN = {};

/* ── Internal state ── */
PAGE_LAPORAN._reportData   = null;  // last getReportData result
PAGE_LAPORAN._filters      = {};
PAGE_LAPORAN._deptList     = [];

/* Month names for display */
PAGE_LAPORAN.MONTHS = [
  { value: '',  label: 'Semua Bulan' },
  { value: '1', label: 'Januari' },   { value: '2',  label: 'Februari' },
  { value: '3', label: 'Maret' },     { value: '4',  label: 'April' },
  { value: '5', label: 'Mei' },       { value: '6',  label: 'Juni' },
  { value: '7', label: 'Juli' },      { value: '8',  label: 'Agustus' },
  { value: '9', label: 'September' }, { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' }, { value: '12', label: 'Desember' }
];

/* ──────────────────────────────────────────────────────────────
   RENDER
────────────────────────────────────────────────────────────── */
PAGE_LAPORAN.render = function (params) {
  var pc = document.getElementById('page-content');
  if (!pc) return;

  PAGE_LAPORAN._reportData = null;
  PAGE_LAPORAN._filters    = {};
  PAGE_LAPORAN._deptList   = [];

  pc.innerHTML = PAGE_LAPORAN._shellHtml();
  PAGE_LAPORAN._loadSupportData();
};

/* ──────────────────────────────────────────────────────────────
   SHELL HTML
────────────────────────────────────────────────────────────── */
PAGE_LAPORAN._shellHtml = function () {
  var c        = APP.constants || {};
  var actor    = APP.currentUser;
  var isSuperAdmin = actor && actor.role === 'SUPER_ADMIN';
  var esc      = APP._esc;

  /* Month options */
  var monthOpts = PAGE_LAPORAN.MONTHS.map(function (m) {
    return '<option value="' + esc(m.value) + '">' + esc(m.label) + '</option>';
  }).join('');

  /* Year options — current year ± 5 */
  var curYear  = new Date().getFullYear();
  var yearOpts = '<option value="">Semua Tahun</option>';
  for (var y = curYear; y >= curYear - 5; y--) {
    yearOpts += '<option value="' + y + '">' + y + '</option>';
  }

  return '<div class="page-header">' +
    '<div class="page-header-left">' +
      '<h1 class="page-title">Laporan</h1>' +
      '<p class="page-subtitle">Laporan rekapitulasi dan statistik arsip</p>' +
    '</div>' +
  '</div>' +

  /* Toolbar card */
  '<div class="card" style="margin-bottom:16px">' +
    '<div class="card-header">' +
      '<span class="card-title">⚙️ Filter & Ekspor</span>' +
    '</div>' +
    '<div class="card-body">' +
      '<div class="laporan-toolbar">' +

        /* Periode bulan */
        '<div class="form-group">' +
          '<label class="form-label">Periode Bulan</label>' +
          '<select id="lap-bulan" class="form-control" style="min-width:130px">' +
            monthOpts +
          '</select>' +
        '</div>' +

        /* Tahun */
        '<div class="form-group">' +
          '<label class="form-label">Tahun</label>' +
          '<select id="lap-tahun" class="form-control" style="min-width:100px">' +
            yearOpts +
          '</select>' +
        '</div>' +

        /* Status arsip */
        '<div class="form-group">' +
          '<label class="form-label">Status</label>' +
          '<select id="lap-status" class="form-control" style="min-width:120px">' +
            APP.buildSelectOptions(c.statusArsip || [], '', 'Semua Status') +
          '</select>' +
        '</div>' +

        /* Klasifikasi keamanan */
        '<div class="form-group">' +
          '<label class="form-label">Keamanan</label>' +
          '<select id="lap-aman" class="form-control" style="min-width:130px">' +
            APP.buildSelectOptions(c.keamanan || [], '', 'Semua Keamanan') +
          '</select>' +
        '</div>' +

        /* Tipe berkas */
        '<div class="form-group">' +
          '<label class="form-label">Tipe</label>' +
          '<select id="lap-tipe" class="form-control" style="min-width:120px">' +
            APP.buildSelectOptions(c.tipeBerkas || [], '', 'Semua Tipe') +
          '</select>' +
        '</div>' +

        /* Departemen — populated from getDepartemenList */
        '<div class="form-group">' +
          '<label class="form-label">Departemen</label>' +
          '<select id="lap-dept" class="form-control" style="min-width:130px">' +
            '<option value="">Semua Departemen</option>' +
          '</select>' +
        '</div>' +

        /* Generate button */
        '<div class="form-group">' +
          '<label class="form-label" style="opacity:0">‒</label>' +
          '<button class="btn btn-primary" id="btn-generate" ' +
            'onclick="PAGE_LAPORAN._generate()">📊 Buat Laporan</button>' +
        '</div>' +

      '</div>' +

      /* Export + print actions */
      '<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">' +
        '<div class="laporan-actions">' +
          '<span style="font-size:12px;color:var(--text-muted)">Ekspor data:</span>' +
          '<button class="btn btn-secondary btn-sm" id="btn-csv" ' +
            'onclick="PAGE_LAPORAN._exportCSV()" disabled>⬇ Export CSV</button>' +
          (isSuperAdmin
            ? '<button class="btn btn-secondary btn-sm" id="btn-json" ' +
                'onclick="PAGE_LAPORAN._exportJSON()">⬇ Backup JSON</button>'
            : '') +
          '<button class="btn btn-secondary btn-sm" id="btn-print" ' +
            'onclick="PAGE_LAPORAN._print()" disabled>🖨 Cetak Laporan</button>' +
        '</div>' +
      '</div>' +

    '</div>' +
  '</div>' +

  /* Preview area */
  '<div id="laporan-preview-container">' +
    '<div class="card">' +
      '<div class="card-body">' +
        APP.emptyStateHtml('📊', 'Laporan Belum Dibuat',
          'Atur filter di atas lalu klik "Buat Laporan" untuk melihat pratinjau.',
          '<button class="btn btn-primary" onclick="PAGE_LAPORAN._generate()">📊 Buat Laporan</button>') +
      '</div>' +
    '</div>' +
  '</div>';
};

/* ──────────────────────────────────────────────────────────────
   LOAD SUPPORT DATA — getDepartemenList
────────────────────────────────────────────────────────────── */
PAGE_LAPORAN._loadSupportData = function () {
  APP.call('getDepartemenList', [APP.token], function (r) {
    PAGE_LAPORAN._deptList = (r && r.success && r.data)
      ? r.data : ((APP.constants || {}).departemenDefault || []);
    APP.populateSelect('lap-dept', PAGE_LAPORAN._deptList, '', 'Semua Departemen');
  }, { noLoading: true, silent: true });
};

/* ──────────────────────────────────────────────────────────────
   GENERATE REPORT — calls getReportData(token, filters)
────────────────────────────────────────────────────────────── */
PAGE_LAPORAN._generate = function () {
  var get = function (id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };

  /* Build filters — only pass non-empty values */
  var filters = {};
  var bulan  = get('lap-bulan');
  var tahun  = get('lap-tahun');
  var status = get('lap-status');
  var aman   = get('lap-aman');
  var tipe   = get('lap-tipe');
  var dept   = get('lap-dept');

  /* bulan is applied by getReportData (createdAt month filter) */
  if (bulan)  filters.bulan              = bulan;
  if (tahun)  filters.tahun              = tahun;
  if (status) filters.statusArsip        = status;
  if (aman)   filters.klasifikasiKeamanan= aman;
  if (tipe)   filters.tipeBerkas         = tipe;
  if (dept)   filters.departemen         = dept;

  PAGE_LAPORAN._filters = filters;

  var btn = document.getElementById('btn-generate');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Memuat…'; }

  // Clear stale data before new call
  PAGE_LAPORAN._reportData = null;
  var csvBtn2 = document.getElementById('btn-csv');
  var printBtn2 = document.getElementById('btn-print');
  if (csvBtn2)   csvBtn2.disabled   = true;
  if (printBtn2) printBtn2.disabled = true;

  APP.call('getReportData', [APP.token, filters], function (result) {
    if (btn) { btn.disabled = false; btn.textContent = '📊 Buat Laporan'; }

    if (!result || !result.success) {
      APP.toast((result && result.message) || 'Gagal memuat data laporan.', 'danger');
      return;
    }

    PAGE_LAPORAN._reportData = result;

    /* Enable export + print buttons */
    var csvBtn   = document.getElementById('btn-csv');
    var printBtn = document.getElementById('btn-print');
    if (csvBtn)   csvBtn.disabled   = false;
    if (printBtn) printBtn.disabled = false;

    PAGE_LAPORAN._renderPreview(result);
  });
};

/* ──────────────────────────────────────────────────────────────
   RENDER PRINT PREVIEW
   Uses kop from result.kop:
     kop_line1, kop_line2, kop_line3, kop_line4, kop_line5,
     kop_logo_url, app_name, footer_copyright
────────────────────────────────────────────────────────────── */
PAGE_LAPORAN._renderPreview = function (result) {
  var container = document.getElementById('laporan-preview-container');
  if (!container) return;

  var kop  = result.kop     || {};
  var data = result.data    || [];
  var esc  = APP._esc;

  /* ── Kop surat ── */
  var logoHtml = kop.kop_logo_url
    ? '<img src="' + esc(kop.kop_logo_url) + '" class="kop-logo" alt="Logo" ' +
        'onerror="this.style.display=\'none\'">'
    : '<div class="kop-logo-placeholder">🗂</div>';

  var kopHtml = '<div class="kop-surat">' +
    logoHtml +
    '<div class="kop-text">' +
      (kop.kop_line1 ? '<div class="kop-line1">' + esc(kop.kop_line1) + '</div>' : '') +
      (kop.kop_line2 ? '<div class="kop-line2">' + esc(kop.kop_line2) + '</div>' : '') +
      (kop.kop_line3 ? '<div class="kop-line3">' + esc(kop.kop_line3) + '</div>' : '') +
      (kop.kop_line4 ? '<div class="kop-line4">' + esc(kop.kop_line4) + '</div>' : '') +
      (kop.kop_line5 ? '<div class="kop-line5">' + esc(kop.kop_line5) + '</div>' : '') +
    '</div>' +
  '</div>';

  /* ── Periode label ── */
  var f         = PAGE_LAPORAN._filters;
  var periodeLabel = 'Semua Data';
  if (f.bulan || f.tahun) {
    var bulanLabel = '';
    if (f.bulan) {
      var m = PAGE_LAPORAN.MONTHS.find(function (m) { return m.value === String(f.bulan); });
      bulanLabel = m ? m.label : '';
    }
    periodeLabel = [bulanLabel, f.tahun].filter(Boolean).join(' ');
  }

  /* Filter labels for report subtitle */
  var filterLabels = [];
  if (f.statusArsip)         filterLabels.push('Status: ' + f.statusArsip);
  if (f.klasifikasiKeamanan) filterLabels.push('Keamanan: ' + f.klasifikasiKeamanan);
  if (f.tipeBerkas)          filterLabels.push('Tipe: ' + f.tipeBerkas);
  if (f.departemen)          filterLabels.push('Dept: ' + f.departemen);

  /* ── Report title ── */
  var titleHtml = '<div class="laporan-report-title">' +
    '<h2>Laporan Ringkasan Rekapitulasi Arsip</h2>' +
    '<div class="laporan-report-meta">' +
      'Periode: ' + esc(periodeLabel) +
      (filterLabels.length > 0 ? ' &nbsp;|&nbsp; ' + filterLabels.map(esc).join(' · ') : '') +
    '</div>' +
    '<div class="laporan-report-meta">Dibuat: ' + esc(result.generatedAt || '') + '</div>' +
  '</div>';

  /* ── Summary boxes ── */
  var aktif   = data.filter(function (a) { return a.statusArsip === 'Aktif'; }).length;
  var inaktif = data.filter(function (a) { return a.statusArsip === 'Inaktif'; }).length;
  var statis  = data.filter(function (a) { return a.statusArsip === 'Statis'; }).length;

  var summaryHtml = '<div class="laporan-summary">' +
    '<div class="laporan-sum-box">' +
      '<div class="laporan-sum-label">Total Arsip</div>' +
      '<div class="laporan-sum-value">' + result.total + '</div>' +
    '</div>' +
    '<div class="laporan-sum-box">' +
      '<div class="laporan-sum-label">Arsip Aktif</div>' +
      '<div class="laporan-sum-value">' + aktif + '</div>' +
    '</div>' +
    '<div class="laporan-sum-box">' +
      '<div class="laporan-sum-label">Arsip Inaktif</div>' +
      '<div class="laporan-sum-value">' + inaktif + '</div>' +
    '</div>' +
    '<div class="laporan-sum-box">' +
      '<div class="laporan-sum-label">Arsip Statis</div>' +
      '<div class="laporan-sum-value">' + statis + '</div>' +
    '</div>' +
  '</div>';

  /* ── Data table ── */
  var tableHtml = '';
  if (data.length === 0) {
    tableHtml = '<div style="text-align:center;padding:32px;color:#888;font-size:13px">' +
      'Tidak ada data untuk filter yang dipilih.' +
    '</div>';
  } else {
    tableHtml = '<table class="laporan-data-table" style="margin:0 32px;width:calc(100% - 64px)">' +
      '<thead><tr>' +
        '<th>#</th>' +
        '<th>Nama Berkas</th>' +
        '<th>Nomor Dokumen</th>' +
        '<th>Kode Klas.</th>' +
        '<th>Jenis</th>' +
        '<th>Departemen</th>' +
        '<th>Status</th>' +
        '<th>Keamanan</th>' +
        '<th>Tgl Musnah</th>' +
      '</tr></thead>' +
      '<tbody>';

    data.forEach(function (a, idx) {
      tableHtml += '<tr>' +
        '<td style="color:#888;white-space:nowrap">' + (idx + 1) + '</td>' +
        '<td style="font-weight:600;max-width:180px;word-break:break-word">' +
          esc(a.namaBerkas || '–') +
        '</td>' +
        '<td style="font-size:10px;font-family:monospace;white-space:nowrap">' +
          esc(a.nomorDokumen || '–') +
        '</td>' +
        '<td style="font-family:monospace;font-size:10px;color:#1B2A4A;font-weight:700">' +
          esc(a.kodeKlasifikasi || '–') +
        '</td>' +
        '<td style="font-size:10px">' + esc(a.jenisBerkas || '–') + '</td>' +
        '<td style="font-size:10px">' + esc(a.departemen  || '–') + '</td>' +
        '<td style="font-size:10px;font-weight:600;white-space:nowrap">' +
          esc(a.statusArsip || '–') +
        '</td>' +
        '<td style="font-size:10px">' + esc(a.klasifikasiKeamanan || '–') + '</td>' +
        '<td style="font-size:10px;white-space:nowrap">' + esc(a.tglMusnah || '–') + '</td>' +
      '</tr>';
    });

    tableHtml += '</tbody></table>';
  }

  /* ── Footer ── */
  var footerHtml = '<div class="laporan-footer-preview">' +
    esc(kop.footer_copyright || kop.app_name || 'E-ARSIP DIO') + ' &nbsp;·&nbsp; ' +
    'Dicetak: ' + esc(result.generatedAt || '') +
  '</div>';

  /* ── Assemble preview ── */
  container.innerHTML =
    '<div class="laporan-preview-wrap" id="laporan-print-area">' +
      kopHtml +
      titleHtml +
      summaryHtml +
      tableHtml +
      footerHtml +
    '</div>' +
    (data.length > 0
      ? '<p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:10px">' +
          'Menampilkan ' + data.length + ' dari ' + result.total + ' berkas. ' +
          'Export CSV untuk data lengkap.' +
        '</p>'
      : '');
};

/* ──────────────────────────────────────────────────────────────
   PRINT
────────────────────────────────────────────────────────────── */
PAGE_LAPORAN._print = function () {
  if (!PAGE_LAPORAN._reportData) {
    APP.toast('Buat laporan terlebih dahulu.', 'warning');
    return;
  }

  var printEl = document.getElementById('laporan-print-area');
  if (!printEl) {
    APP.toast('Pratinjau laporan tidak ditemukan. Buat laporan terlebih dahulu.', 'warning');
    return;
  }

  /* Open print content in a new popup window — works correctly in GAS iframe */
  var printWin = window.open('', '_blank', 'width=900,height=700');
  if (!printWin) {
    APP.toast('Popup diblokir browser. Izinkan popup untuk halaman ini.', 'warning');
    return;
  }

  printWin.document.write(
    '<!DOCTYPE html><html><head>' +
    '<meta charset="utf-8">' +
    '<title>Laporan Arsip — E-ARSIP DIO</title>' +
    '<style>' +
      'body{margin:0;padding:0;font-family:Arial,sans-serif;background:#fff;color:#111;}' +
      '.kop-surat{display:flex;align-items:flex-start;gap:16px;padding:20px 32px 14px;border-bottom:3px solid #1B2A4A;}' +
      '.kop-text{flex:1;text-align:center;}' +
      '.kop-line1{font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:2px;}' +
      '.kop-line2{font-size:14px;font-weight:700;margin-bottom:2px;}' +
      '.kop-line3,.kop-line4,.kop-line5{font-size:11px;color:#444;line-height:1.4;}' +
      '.kop-logo{width:72px;height:72px;object-fit:contain;}' +
      '.kop-logo-placeholder{width:72px;height:72px;display:flex;align-items:center;justify-content:center;font-size:28px;border:2px dashed #ccc;border-radius:8px;}' +
      '.laporan-report-title{text-align:center;padding:16px 32px 10px;border-bottom:1px solid #ddd;}' +
      '.laporan-report-title h2{font-size:14px;font-weight:700;text-transform:uppercase;text-decoration:underline;margin-bottom:2px;}' +
      '.laporan-report-meta{font-size:11px;color:#666;}' +
      '.laporan-summary{display:flex;border:1px solid #ddd;margin:16px 32px;border-radius:6px;overflow:hidden;}' +
      '.laporan-sum-box{flex:1;text-align:center;padding:10px 8px;border-right:1px solid #ddd;background:#f8f9fa;}' +
      '.laporan-sum-box:last-child{border-right:none;}' +
      '.laporan-sum-label{font-size:9px;color:#666;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;}' +
      '.laporan-sum-value{font-size:20px;font-weight:700;color:#1B2A4A;}' +
      '.laporan-data-table{width:calc(100% - 64px);margin:0 32px;border-collapse:collapse;font-size:11px;}' +
      '.laporan-data-table th{background:#1B2A4A;color:#fff;padding:7px 8px;text-align:left;font-weight:600;font-size:10px;text-transform:uppercase;}' +
      '.laporan-data-table td{padding:6px 8px;border-bottom:1px solid #eee;color:#222;vertical-align:top;}' +
      '.laporan-data-table tr:nth-child(even) td{background:#f8f9fa;}' +
      '.laporan-footer-preview{padding:12px 32px 20px;font-size:10px;color:#666;text-align:center;border-top:1px solid #ddd;margin-top:12px;}' +
      '@media print{@page{margin:10mm;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}' +
    '</style>' +
    '</head><body>' +
    printEl.innerHTML +
    '</body></html>'
  );
  printWin.document.close();

  // Trigger print after content loads
  printWin.onload = function () { printWin.print(); };
  // Fallback if onload doesn't fire
  setTimeout(function () { try { printWin.print(); } catch(e) {} }, 800);
};

/* ──────────────────────────────────────────────────────────────
   EXPORT CSV — exportArchivesCSV(token, filters)
   Uses same filters as current report (minus bulan — not in exportArchivesCSV)
────────────────────────────────────────────────────────────── */
PAGE_LAPORAN._exportCSV = function () {
  if (!PAGE_LAPORAN._reportData) {
    APP.toast('Buat laporan terlebih dahulu.', 'warning');
    return;
  }

  /* exportArchivesCSV accepts getArchives filters only (no bulan key) */
  var f = PAGE_LAPORAN._filters;
  var exportFilters = {};
  if (f.tahun)               exportFilters.tahun               = f.tahun;
  if (f.statusArsip)         exportFilters.statusArsip         = f.statusArsip;
  if (f.klasifikasiKeamanan) exportFilters.klasifikasiKeamanan = f.klasifikasiKeamanan;
  if (f.tipeBerkas)          exportFilters.tipeBerkas          = f.tipeBerkas;
  if (f.departemen)          exportFilters.departemen          = f.departemen;
  /* Note: bulan is NOT passed to exportArchivesCSV — only used by getReportData */

  var btn = document.getElementById('btn-csv');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Mengekspor…'; }

  APP.call('exportArchivesCSV', [APP.token, exportFilters], function (result) {
    if (btn) { btn.disabled = false; btn.textContent = '⬇ Export CSV'; }

    if (!result || !result.success) {
      APP.toast((result && result.message) || 'Gagal export CSV.', 'danger');
      return;
    }

    var date = new Date().toISOString().slice(0, 10);
    APP.downloadText(result.data, 'earsip-dio-laporan-' + date + '.csv', 'text/csv;charset=utf-8');
    APP.toast('Export CSV berhasil.', 'success');
  });
};

/* ──────────────────────────────────────────────────────────────
   EXPORT BACKUP JSON — exportBackupJSON(token) — SUPER_ADMIN only
────────────────────────────────────────────────────────────── */
PAGE_LAPORAN._exportJSON = function () {
  var actor = APP.currentUser;
  if (!actor || actor.role !== 'SUPER_ADMIN') {
    APP.toast('Hanya Super Admin yang dapat melakukan backup.', 'warning');
    return;
  }

  APP.confirm({
    icon       : '💾',
    title      : 'Export Backup JSON',
    msg        : 'Seluruh data arsip, klasifikasi, dan pengaturan akan diekspor dalam format JSON. ' +
                 'Password pengguna tidak disertakan dalam backup.',
    okLabel    : 'Export Backup',
    okClass    : 'btn-primary',
    cancelLabel: 'Batal'
  }).then(function (ok) {
    if (!ok) return;

    var btn = document.getElementById('btn-json');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Memproses…'; }

    APP.call('exportBackupJSON', [APP.token], function (result) {
      if (btn) { btn.disabled = false; btn.textContent = '⬇ Backup JSON'; }

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
