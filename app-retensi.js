window.PAGE_JADWAL_RETENSI = {};

PAGE_JADWAL_RETENSI._data        = [];
PAGE_JADWAL_RETENSI._filterView  = 'all';

PAGE_JADWAL_RETENSI.ACTIONS = {
  MUSNAH    : 'Musnah',
  KE_STATIS : 'Pindah ke Statis',
  TUNDA     : 'Tunda 1 Tahun'
};

PAGE_JADWAL_RETENSI.render = function (params) {
  var pc = document.getElementById('page-content');
  if (!pc) return;

  PAGE_JADWAL_RETENSI._data       = [];
  PAGE_JADWAL_RETENSI._filterView = 'all';

  pc.innerHTML = PAGE_JADWAL_RETENSI._shellHtml();
  PAGE_JADWAL_RETENSI._load();
};

PAGE_JADWAL_RETENSI._shellHtml = function () {
  return '<div class="page-header">' +
    '<div class="page-header-left">' +
      '<h1 class="page-title">Jadwal Retensi</h1>' +
      '<p class="page-subtitle">Arsip yang mendekati atau melewati batas masa retensi</p>' +
    '</div>' +
    '<div class="page-header-actions">' +
      '<button class="btn btn-secondary btn-sm" onclick="PAGE_JADWAL_RETENSI._load()">↻ Perbarui</button>' +
    '</div>' +
  '</div>' +

  '<div style="background:var(--warning-bg);border:1px solid rgba(210,153,34,0.25);' +
    'border-radius:var(--radius-md);padding:12px 16px;margin-bottom:20px;' +
    'display:flex;gap:12px;align-items:flex-start;font-size:13px">' +
    '<span style="flex-shrink:0;font-size:18px">⚠️</span>' +
    '<div>' +
      '<strong style="color:var(--warning)">Perhatian:</strong> ' +
      'Halaman ini menampilkan arsip yang mendekati atau melewati tanggal musnah dalam jangka peringatan. ' +
      'Jangka peringatan dapat diatur di menu <strong>Pengaturan</strong> (default 90 hari). ' +
      'Eksekusi aksi retensi bersifat permanen dan tidak dapat dibatalkan.' +
    '</div>' +
  '</div>' +

  '<div class="ret-summary" id="ret-summary">' +
    '<div class="ret-stat" style="--ret-color:var(--danger)">' +
      '<div class="ret-stat-label">Lewat Batas (Overdue)</div>' +
      '<div class="ret-stat-value skeleton" style="width:40px;height:30px" id="ret-count-overdue">–</div>' +
      '<div class="ret-stat-sub">Segera ditindaklanjuti</div>' +
    '</div>' +
    '<div class="ret-stat" style="--ret-color:var(--warning)">' +
      '<div class="ret-stat-label">Mendekati Batas</div>' +
      '<div class="ret-stat-value" id="ret-count-upcoming">–</div>' +
      '<div class="ret-stat-sub">Dalam jangka peringatan</div>' +
    '</div>' +
    '<div class="ret-stat" style="--ret-color:var(--accent)">' +
      '<div class="ret-stat-label">Total Dimonitor</div>' +
      '<div class="ret-stat-value" id="ret-count-total">–</div>' +
      '<div class="ret-stat-sub">Semua yang muncul</div>' +
    '</div>' +
  '</div>' +

  '<div class="tab-bar" style="margin-bottom:16px">' +
    '<button class="tab-btn active" id="rtab-all"     onclick="PAGE_JADWAL_RETENSI._setView(\'all\')">Semua</button>' +
    '<button class="tab-btn"        id="rtab-overdue" onclick="PAGE_JADWAL_RETENSI._setView(\'overdue\')">🔴 Lewat Batas</button>' +
    '<button class="tab-btn"        id="rtab-upcoming"onclick="PAGE_JADWAL_RETENSI._setView(\'upcoming\')">🟡 Mendekati</button>' +
  '</div>' +

  '<div class="card">' +
    '<div class="card-header">' +
      '<span class="card-title" id="ret-table-count">⏰ Memuat…</span>' +
    '</div>' +
    '<div class="table-wrap" id="ret-table-wrap">' +
      APP.skeletonTableHtml(6, 5) +
    '</div>' +
  '</div>';
};

PAGE_JADWAL_RETENSI._load = function () {
  var wrap = document.getElementById('ret-table-wrap');
  if (wrap) wrap.innerHTML = APP.skeletonTableHtml(6, 5);

  ['ret-count-overdue','ret-count-upcoming','ret-count-total'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.textContent = '–';
  });

  APP.call('getRetentionSchedule', [APP.token], function (result) {
    if (!result || !result.success) {
      if (wrap) wrap.innerHTML = APP.emptyStateHtml('⚠️', 'Gagal memuat',
        (result && result.message) || '');
      return;
    }

    PAGE_JADWAL_RETENSI._data = result.data || [];
    PAGE_JADWAL_RETENSI._updateStats();
    PAGE_JADWAL_RETENSI._renderTable();

    if (window.TOPBAR) TOPBAR._setBellState(PAGE_JADWAL_RETENSI._data.length);
  }, { noLoading: true });
};

PAGE_JADWAL_RETENSI._updateStats = function () {
  var data     = PAGE_JADWAL_RETENSI._data;
  var overdue  = data.filter(function (d) { return d.isOverdue; }).length;
  var upcoming = data.filter(function (d) { return !d.isOverdue; }).length;
  var total    = data.length;

  var setVal = function (id, val, color) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    el.style.color = color || '';
  };

  setVal('ret-count-overdue',  overdue,  overdue  > 0 ? 'var(--danger)'  : '');
  setVal('ret-count-upcoming', upcoming, upcoming > 0 ? 'var(--warning)' : '');
  setVal('ret-count-total',    total,    '');
};

PAGE_JADWAL_RETENSI._setView = function (view) {
  PAGE_JADWAL_RETENSI._filterView = view;

  ['all','overdue','upcoming'].forEach(function (v) {
    var btn = document.getElementById('rtab-' + v);
    if (btn) btn.classList.toggle('active', v === view);
  });

  PAGE_JADWAL_RETENSI._renderTable();
};

PAGE_JADWAL_RETENSI._renderTable = function () {
  var wrap    = document.getElementById('ret-table-wrap');
  var countEl = document.getElementById('ret-table-count');
  if (!wrap) return;

  var view = PAGE_JADWAL_RETENSI._filterView;
  var data = PAGE_JADWAL_RETENSI._data;
  var esc  = APP._esc;

  if (view === 'overdue')  data = data.filter(function (d) { return d.isOverdue; });
  if (view === 'upcoming') data = data.filter(function (d) { return !d.isOverdue; });

  if (countEl) countEl.textContent = '⏰ ' + data.length + ' Arsip';

  if (data.length === 0) {
    wrap.innerHTML = APP.emptyStateHtml(
      view === 'overdue'  ? '✅' : '📋',
      view === 'overdue'  ? 'Tidak ada arsip yang melewati batas' :
      view === 'upcoming' ? 'Tidak ada arsip yang mendekati batas' :
                            'Tidak ada arsip dalam jadwal retensi',
      'Semua arsip dalam kondisi baik untuk jangka peringatan ini.'
    );
    return;
  }

  var html = '<table class="data-table"><thead><tr>' +
    '<th>Nama Berkas</th>' +
    '<th>Klasifikasi</th>' +
    '<th>Departemen</th>' +
    '<th>Tgl Musnah</th>' +
    '<th>Penyusutan</th>' +
    '<th>Status</th>' +
    '<th style="min-width:220px">Aksi Retensi</th>' +
  '</tr></thead><tbody>';

  data.forEach(function (item) {
    var rowCls = item.isOverdue ? 'retensi-overdue' : 'retensi-warning';

    html += '<tr class="retensi-row ' + rowCls + '">' +
      '<td>' +
        '<div style="font-weight:500;margin-bottom:2px">' + esc(item.namaBerkas || '–') + '</div>' +
        (item.tahunDokumen
          ? '<div style="font-size:11px;color:var(--text-muted)">Tahun: ' + esc(String(item.tahunDokumen)) + '</div>'
          : '') +
      '</td>' +
      '<td>' +
        '<div class="klas-kode" style="font-family:var(--font-mono);font-size:12px;color:var(--accent)">' +
          esc(item.kodeKlasifikasi || '–') +
        '</div>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' +
          esc(item.namaKlasifikasi || '') +
        '</div>' +
      '</td>' +
      '<td>' +
        '<span class="badge badge-muted">' + esc(item.departemen || '–') + '</span>' +
      '</td>' +
      '<td>' +
        '<div style="font-weight:600;color:' + (item.isOverdue ? 'var(--danger)' : 'var(--warning)') + '">' +
          esc(item.tglMusnah || '–') +
        '</div>' +
        (item.isOverdue
          ? '<div style="font-size:11px;color:var(--danger);margin-top:2px">● Melewati batas</div>'
          : '<div style="font-size:11px;color:var(--warning);margin-top:2px">⚡ Mendekati batas</div>') +
      '</td>' +
      '<td>' +
        '<span class="badge badge-muted">' + esc(item.penyusutanAkhir || '–') + '</span>' +
      '</td>' +
      '<td>' +
        APP.statusArsipBadge(item.statusArsip) +
      '</td>' +
      '<td>' +
        PAGE_JADWAL_RETENSI._actionButtons(item) +
      '</td>' +
    '</tr>';
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;
};

PAGE_JADWAL_RETENSI._actionButtons = function (item) {
  var id  = item.id;
  var esc = APP._esc;

  var canMusnah  = item.penyusutanAkhir === 'Musnah' || item.penyusutanAkhir === 'Dinilai Kembali';
  var canStatis  = item.penyusutanAkhir === 'Permanen' || item.penyusutanAkhir === 'Dinilai Kembali';
  var canTunda   = true;

  var html = '<div class="action-btn-group">';

  if (canMusnah) {
    html +=
      '<button class="btn btn-danger btn-sm" ' +
        'onclick="PAGE_JADWAL_RETENSI._confirmAction(\'' + esc(id) + '\',\'' +
          PAGE_JADWAL_RETENSI.ACTIONS.MUSNAH + '\',\'' + esc(item.namaBerkas) + '\')" ' +
        'title="Musnahkan berkas ini">' +
        '🗑 Musnah' +
      '</button>';
  }

  if (canStatis) {
    html +=
      '<button class="btn btn-secondary btn-sm" ' +
        'onclick="PAGE_JADWAL_RETENSI._confirmAction(\'' + esc(id) + '\',\'' +
          PAGE_JADWAL_RETENSI.ACTIONS.KE_STATIS + '\',\'' + esc(item.namaBerkas) + '\')" ' +
        'title="Pindahkan ke arsip statis">' +
        '🏛 Statis' +
      '</button>';
  }

  html +=
    '<button class="btn btn-ghost btn-sm" ' +
      'onclick="PAGE_JADWAL_RETENSI._confirmAction(\'' + esc(id) + '\',\'' +
        PAGE_JADWAL_RETENSI.ACTIONS.TUNDA + '\',\'' + esc(item.namaBerkas) + '\')" ' +
      'title="Tunda 1 tahun dari tanggal musnah saat ini">' +
      '⏱ Tunda' +
    '</button>' +
    '<button class="btn btn-ghost btn-icon btn-sm" ' +
      'onclick="APP.navigate(\'manajemen-arsip\',{openId:\'' + esc(id) + '\'})" ' +
      'title="Lihat detail berkas">👁</button>';

  html += '</div>';
  return html;
};

PAGE_JADWAL_RETENSI._confirmAction = function (archiveId, action, namaBerkas) {
  var A = PAGE_JADWAL_RETENSI.ACTIONS;

  var configs = {};
  configs[A.MUSNAH]     = {
    icon      : '🗑',
    title     : 'Musnahkan Arsip',
    msg       : '"' + namaBerkas + '" akan DIMUSNAHKAN secara permanen dari sistem. ' +
                'Tindakan ini tidak dapat dibatalkan.',
    okLabel   : 'Ya, Musnahkan',
    okClass   : 'btn-danger'
  };
  configs[A.KE_STATIS]  = {
    icon      : '🏛',
    title     : 'Pindah ke Arsip Statis',
    msg       : '"' + namaBerkas + '" akan dipindahkan ke status Statis (arsip permanen). ' +
                'Berkas tidak akan muncul lagi di jadwal retensi.',
    okLabel   : 'Pindah ke Statis',
    okClass   : 'btn-secondary'
  };
  configs[A.TUNDA]      = {
    icon      : '⏱',
    title     : 'Tunda Retensi 1 Tahun',
    msg       : 'Tanggal musnah "' + namaBerkas + '" akan diperpanjang 1 tahun dari tanggal musnah saat ini.',
    okLabel   : 'Tunda 1 Tahun',
    okClass   : 'btn-secondary'
  };

  var cfg = configs[action];
  if (!cfg) {
    APP.toast('Aksi tidak dikenal.', 'danger');
    return;
  }

  APP.confirm({
    icon       : cfg.icon,
    title      : cfg.title,
    msg        : cfg.msg,
    okLabel    : cfg.okLabel,
    okClass    : cfg.okClass,
    cancelLabel: 'Batal'
  }).then(function (ok) {
    if (!ok) return;
    PAGE_JADWAL_RETENSI._execute(archiveId, action);
  });
};

PAGE_JADWAL_RETENSI._execute = function (archiveId, action) {
  APP.call('executeRetention', [APP.token, archiveId, action], function (result) {
    if (result && result.success) {
      APP.toast(result.message || 'Aksi retensi berhasil.', 'success');
      PAGE_JADWAL_RETENSI._load();
    } else {
      APP.toast((result && result.message) || 'Gagal melaksanakan aksi retensi.', 'danger');
    }
  });
};
