window.PAGE_MANAJEMEN_USER = {};

PAGE_MANAJEMEN_USER._allUsers    = [];
PAGE_MANAJEMEN_USER._deptList    = [];
PAGE_MANAJEMEN_USER._editingUser = null;

PAGE_MANAJEMEN_USER.render = function (params) {
  var pc = document.getElementById('page-content');
  if (!pc) return;

  var actor = APP.currentUser;
  PAGE_MANAJEMEN_USER._editingUser = null;
  PAGE_MANAJEMEN_USER._allUsers    = [];

  pc.innerHTML = PAGE_MANAJEMEN_USER._shellHtml(actor);
  PAGE_MANAJEMEN_USER._loadSupportData(actor);
};

PAGE_MANAJEMEN_USER._shellHtml = function (actor) {
  var isSuperAdmin = actor && actor.role === 'SUPER_ADMIN';

  return '<div class="page-header">' +
    '<div class="page-header-left">' +
      '<h1 class="page-title">Manajemen User</h1>' +
      '<p class="page-subtitle">Kelola pengguna dan hak akses sistem</p>' +
    '</div>' +
    '<div class="page-header-actions">' +
      '<button class="btn btn-secondary btn-sm" onclick="PAGE_MANAJEMEN_USER._loadUsers()">↻ Perbarui</button>' +
    '</div>' +
  '</div>' +

  '<div class="card" style="margin-bottom:16px">' +
    '<div class="card-header">' +
      '<span class="card-title" id="user-form-title">➕ Tambah Pengguna Baru</span>' +
      '<button class="btn btn-ghost btn-sm" id="btn-form-toggle" ' +
        'onclick="PAGE_MANAJEMEN_USER._toggleForm()">Sembunyikan ▲</button>' +
    '</div>' +
    '<div class="card-body" id="user-form-body">' +
      PAGE_MANAJEMEN_USER._formHtml(actor, null) +
    '</div>' +
  '</div>' +

  '<div class="card">' +
    '<div class="card-header">' +
      '<span class="card-title" id="user-list-count">👥 Memuat…</span>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        '<label style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;' +
          'gap:6px;cursor:pointer">' +
          '<input type="checkbox" id="show-inactive-users" ' +
            'onchange="PAGE_MANAJEMEN_USER._renderUserList()">' +
          ' Tampilkan nonaktif' +
        '</label>' +
        '<div class="input-wrap" style="max-width:200px">' +
          '<span class="input-icon" style="font-size:13px">🔍</span>' +
          '<input type="text" class="form-control" id="user-search" ' +
            'placeholder="Cari pengguna…" ' +
            'oninput="PAGE_MANAJEMEN_USER._renderUserList()" ' +
            'style="height:34px;padding-left:32px;font-size:12px">' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div id="user-list-body">' +
      PAGE_MANAJEMEN_USER._skeletonUsers() +
    '</div>' +
  '</div>';
};

PAGE_MANAJEMEN_USER._formHtml = function (actor, data) {
  var isEdit       = !!data;
  var isSuperAdmin = actor && actor.role === 'SUPER_ADMIN';
  var c            = APP.constants || {};
  var esc          = APP._esc;

  var availableRoles = isSuperAdmin
    ? (c.roles || ['SUPER_ADMIN','ADMIN','USER'])
    : ['USER'];

  return '<div id="user-form-fields">' +
    '<div class="form-row col-2">' +
      '<div class="form-group">' +
        '<label class="form-label" for="uf-fullname">Nama Lengkap <span class="required">*</span></label>' +
        '<input type="text" id="uf-fullname" class="form-control" ' +
          'placeholder="Cth: Budi Santoso" ' +
          'value="' + esc(data ? data.fullname : '') + '">' +
        '<div class="form-error" id="err-uf-fullname"></div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="uf-username">Username <span class="required">*</span></label>' +
        '<input type="text" id="uf-username" class="form-control" ' +
          'placeholder="Cth: budi_s" ' +
          'value="' + esc(data ? data.username : '') + '" ' +
          (isEdit ? 'disabled title="Username tidak dapat diubah"' : '') + '>' +
        '<div class="form-error" id="err-uf-username"></div>' +
      '</div>' +
    '</div>' +

    '<div class="form-row col-2">' +
      '<div class="form-group">' +
        '<label class="form-label" for="uf-password">' +
          'Password' + (isEdit ? '' : ' <span class="required">*</span>') +
        '</label>' +
        '<div class="input-wrap">' +
          '<span class="input-icon">🔑</span>' +
          '<input type="password" id="uf-password" class="form-control" ' +
            'placeholder="' + (isEdit ? 'Kosongkan jika tidak diubah' : 'Minimal 6 karakter') + '" ' +
            'oninput="PAGE_MANAJEMEN_USER._onPasswordInput(this.value)">' +
          '<span class="input-eye" ' +
            'onclick="APP.togglePasswordVis(\'uf-password\',this)" title="Tampilkan">👁</span>' +
        '</div>' +
        '<div class="pwd-strength"><div class="pwd-strength-fill" id="pwd-strength-fill"></div></div>' +
        '<div class="pwd-hint" id="pwd-hint">Minimal 6 karakter</div>' +
        '<div class="form-error" id="err-uf-password"></div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="uf-role">Role <span class="required">*</span></label>' +
        '<select id="uf-role" class="form-control" ' +
          (!isSuperAdmin ? 'disabled' : '') + '>' +
          APP.buildSelectOptions(
            availableRoles.map(function (r) {
              var labels = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', USER: 'Staff' };
              return { value: r, label: labels[r] || r };
            }),
            data ? data.role : (isSuperAdmin ? 'USER' : 'USER'),
            '') +
        '</select>' +
        (!isSuperAdmin
          ? '<div class="form-hint">Admin hanya dapat membuat akun Staff</div>'
          : '') +
        '<div class="form-error" id="err-uf-role"></div>' +
      '</div>' +
    '</div>' +

    '<div class="form-row col-2">' +
      '<div class="form-group">' +
        '<label class="form-label" for="uf-dept">Departemen</label>' +
        '<select id="uf-dept" class="form-control">' +
          '<option value="">-- Pilih Departemen --</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="uf-jabatan">Jabatan</label>' +
        '<input type="text" id="uf-jabatan" class="form-control" ' +
          'placeholder="Cth: Manajer Legal" ' +
          'value="' + esc(data ? (data.jabatan || '') : '') + '">' +
      '</div>' +
    '</div>' +

    '<div class="form-group">' +
      '<label class="form-label" for="uf-nik">NIK (Nomor Induk Karyawan)</label>' +
      '<input type="text" id="uf-nik" class="form-control" ' +
        'placeholder="Cth: 20240001" ' +
        'value="' + esc(data ? (data.nik || '') : '') + '">' +
    '</div>' +

    (isEdit && isSuperAdmin
      ? '<div class="form-group">' +
          '<label class="form-label">Status Akun</label>' +
          '<div style="display:flex;gap:12px;margin-top:4px">' +
            '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">' +
              '<input type="radio" name="uf-isactive" value="true" ' +
                (data.isActive !== false ? 'checked' : '') + '> Aktif' +
            '</label>' +
            '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">' +
              '<input type="radio" name="uf-isactive" value="false" ' +
                (data.isActive === false ? 'checked' : '') + '> Nonaktif' +
            '</label>' +
          '</div>' +
        '</div>'
      : '') +

    '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">' +
      (isEdit
        ? '<button class="btn btn-secondary" onclick="PAGE_MANAJEMEN_USER._cancelEdit()">Batal</button>'
        : '<button class="btn btn-secondary" onclick="PAGE_MANAJEMEN_USER._resetForm()">Reset</button>') +
      '<button class="btn btn-primary" id="btn-user-save" ' +
        'onclick="PAGE_MANAJEMEN_USER._submitForm()">' +
        (isEdit ? '✓ Simpan Perubahan' : '+ Tambah Pengguna') +
      '</button>' +
    '</div>' +
  '</div>';
};

PAGE_MANAJEMEN_USER._skeletonUsers = function () {
  var html = '';
  for (var i = 0; i < 4; i++) {
    html += '<div class="user-card-row">' +
      '<div class="user-avatar-lg skeleton" style="border:none;background:var(--bg-elevated)"></div>' +
      '<div style="flex:1">' +
        '<div class="skeleton" style="height:14px;width:160px;margin-bottom:8px"></div>' +
        '<div class="skeleton" style="height:11px;width:240px"></div>' +
      '</div>' +
    '</div>';
  }
  return html;
};

PAGE_MANAJEMEN_USER._loadSupportData = function (actor) {
  var c = APP.constants || {};

  APP.call('getDepartemenList', [APP.token], function (r) {
    PAGE_MANAJEMEN_USER._deptList = (r && r.success && r.data)
      ? r.data : (c.departemenDefault || []);

    APP.populateSelect('uf-dept',
      PAGE_MANAJEMEN_USER._deptList,
      actor ? actor.departemen : '',
      '-- Pilih Departemen --');

    PAGE_MANAJEMEN_USER._loadUsers();
  }, { noLoading: true, silent: true });
};

PAGE_MANAJEMEN_USER._loadUsers = function () {
  var body = document.getElementById('user-list-body');
  if (body) body.innerHTML = PAGE_MANAJEMEN_USER._skeletonUsers();

  APP.call('getUsers', [APP.token], function (result) {
    if (!result || !result.success) {
      if (body) body.innerHTML = APP.emptyStateHtml('⚠️', 'Gagal memuat',
        (result && result.message) || '');
      return;
    }
    PAGE_MANAJEMEN_USER._allUsers = result.data || [];
    PAGE_MANAJEMEN_USER._renderUserList();
  }, { noLoading: true });
};

PAGE_MANAJEMEN_USER._renderUserList = function () {
  var body      = document.getElementById('user-list-body');
  var countEl   = document.getElementById('user-list-count');
  var showInact = (document.getElementById('show-inactive-users') || {}).checked;
  var searchVal = ((document.getElementById('user-search') || {}).value || '').toLowerCase().trim();
  var actor     = APP.currentUser;
  var isSuperAdmin = actor && actor.role === 'SUPER_ADMIN';
  var esc       = APP._esc;

  if (!body) return;

  var data = PAGE_MANAJEMEN_USER._allUsers;

  if (!showInact) data = data.filter(function (u) { return u.isActive !== false; });

  if (searchVal) {
    data = data.filter(function (u) {
      return (u.fullname   || '').toLowerCase().includes(searchVal) ||
             (u.username   || '').toLowerCase().includes(searchVal) ||
             (u.departemen || '').toLowerCase().includes(searchVal) ||
             (u.jabatan    || '').toLowerCase().includes(searchVal) ||
             (u.nik        || '').toLowerCase().includes(searchVal);
    });
  }

  if (countEl) countEl.textContent = '👥 ' + data.length + ' Pengguna';

  if (data.length === 0) {
    body.innerHTML = APP.emptyStateHtml('👥', 'Tidak ada pengguna',
      searchVal ? 'Tidak ada yang cocok dengan pencarian.' : 'Belum ada pengguna terdaftar.');
    return;
  }

  var html = '';

  var roleOrder = ['SUPER_ADMIN','ADMIN','USER'];
  roleOrder.forEach(function (role) {
    var group = data.filter(function (u) { return u.role === role; });
    if (group.length === 0) return;

    html += '<div style="padding:10px 18px 4px;font-size:11px;font-weight:600;' +
      'color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;' +
      'border-bottom:1px solid var(--border);background:var(--bg-elevated)">' +
      APP.roleBadge(role) + ' <span style="margin-left:8px">' + group.length + ' pengguna</span>' +
    '</div>';

    group.forEach(function (u) {
      var initials = (u.fullname || u.username || '?')
        .split(' ').slice(0,2).map(function (w) { return w[0] || ''; }).join('').toUpperCase();
      var isMe     = actor && u.username === actor.username;
      var inactive = u.isActive === false;

      var canEdit   = true;
      var canDelete = isSuperAdmin && u.username !== 'superadmin' && u.username !== actor.username;

      html += '<div class="user-card-row' + (inactive ? ' user-inactive' : '') + '">' +
        '<div class="user-avatar-lg">' + esc(initials) + '</div>' +

        '<div class="user-card-info">' +
          '<div class="user-card-name">' +
            esc(u.fullname || '–') +
            (isMe ? ' <span class="badge badge-accent" style="font-size:10px;padding:1px 6px">Anda</span>' : '') +
            (inactive ? ' <span class="badge badge-danger" style="font-size:10px;padding:1px 6px">Nonaktif</span>' : '') +
          '</div>' +
          '<div class="user-card-meta">' +
            '<span>' + APP.roleBadge(u.role) + '</span>' +
            (u.departemen
              ? '<span>🏢 ' + esc(u.departemen) + '</span>'
              : '') +
            (u.jabatan
              ? '<span>💼 ' + esc(u.jabatan) + '</span>'
              : '') +
            (u.nik
              ? '<span style="font-family:var(--font-mono)">🪪 ' + esc(u.nik) + '</span>'
              : '') +
            '<span style="font-size:11px;color:var(--text-muted)">' +
              '@' + esc(u.username) + '</span>' +
          '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);margin-top:3px">' +
            (u.lastLogin
              ? '🕐 Login terakhir: ' + esc(u.lastLogin)
              : '🕐 Belum pernah login') +
            ' &nbsp;·&nbsp; Dibuat: ' + esc(u.createdAt || '–') +
          '</div>' +
        '</div>' +

        '<div class="user-card-actions">' +
          (canEdit
            ? '<button class="btn btn-ghost btn-icon btn-sm" title="Edit pengguna" ' +
                'onclick="PAGE_MANAJEMEN_USER._editUser(\'' + esc(u.username) + '\')">' +
                '✏️' +
              '</button>'
            : '') +
          (canDelete
            ? (u.isActive !== false
                ? '<button class="btn btn-ghost btn-icon btn-sm" title="Nonaktifkan" style="color:#F47067" ' +
                    'onclick="PAGE_MANAJEMEN_USER._deactivateUser(\'' + esc(u.username) + '\',\'' + esc(u.fullname) + '\')">' +
                    '🚫' +
                  '</button>'
                : '<button class="btn btn-ghost btn-icon btn-sm" title="Aktifkan kembali" style="color:var(--success)" ' +
                    'onclick="PAGE_MANAJEMEN_USER._reactivateUser(\'' + esc(u.username) + '\',\'' + esc(u.fullname) + '\')">' +
                    '✓' +
                  '</button>')
            : '') +
        '</div>' +

      '</div>';
    });
  });

  body.innerHTML = html;
};

PAGE_MANAJEMEN_USER._formVisible = true;

PAGE_MANAJEMEN_USER._toggleForm = function () {
  PAGE_MANAJEMEN_USER._formVisible = !PAGE_MANAJEMEN_USER._formVisible;
  var body = document.getElementById('user-form-body');
  var btn  = document.getElementById('btn-form-toggle');
  if (body) body.style.display = PAGE_MANAJEMEN_USER._formVisible ? '' : 'none';
  if (btn)  btn.textContent    = PAGE_MANAJEMEN_USER._formVisible ? 'Sembunyikan ▲' : 'Tampilkan ▼';
};

PAGE_MANAJEMEN_USER._onPasswordInput = function (val) {
  var fill    = document.getElementById('pwd-strength-fill');
  var hint    = document.getElementById('pwd-hint');
  if (!fill || !hint) return;

  var len     = val.length;
  var hasUpper= /[A-Z]/.test(val);
  var hasNum  = /[0-9]/.test(val);
  var hasSym  = /[^A-Za-z0-9]/.test(val);
  var score   = 0;

  if (len >= 6)  score++;
  if (len >= 10) score++;
  if (hasUpper)  score++;
  if (hasNum)    score++;
  if (hasSym)    score++;

  var configs = [
    { pct: '0%',   color: 'var(--bg-elevated)',  label: 'Minimal 6 karakter' },
    { pct: '20%',  color: 'var(--danger)',        label: 'Sangat lemah' },
    { pct: '40%',  color: 'var(--warning)',       label: 'Lemah' },
    { pct: '60%',  color: 'var(--warning)',       label: 'Sedang' },
    { pct: '80%',  color: 'var(--success)',       label: 'Kuat' },
    { pct: '100%', color: 'var(--success)',       label: 'Sangat kuat' }
  ];

  var cfg = len === 0 ? configs[0] : configs[Math.min(score, 5)];
  fill.style.width      = cfg.pct;
  fill.style.background = cfg.color;
  hint.textContent      = cfg.label;
  hint.style.color      = len === 0 ? 'var(--text-muted)' : cfg.color;
};

PAGE_MANAJEMEN_USER._submitForm = function () {
  var actor    = APP.currentUser;
  var isEdit   = !!PAGE_MANAJEMEN_USER._editingUser;
  var esc      = APP._esc;

  var get = function (id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };

  var fullname = get('uf-fullname');
  var username = get('uf-username');
  var password = get('uf-password');
  var role     = get('uf-role');
  var dept     = get('uf-dept');
  var jabatan  = get('uf-jabatan');
  var nik      = get('uf-nik');

  var isActiveEl = document.querySelector('input[name="uf-isactive"]:checked');
  var isActive   = isActiveEl ? (isActiveEl.value === 'true') : undefined;

  var valid = true;
  var clearErr = function (id) {
    var e = document.getElementById(id);
    if (e) { e.textContent = ''; e.style.display = 'none'; }
  };
  var setErr = function (inputId, errId, msg) {
    var inp = document.getElementById(inputId);
    var err = document.getElementById(errId);
    if (inp) inp.classList.add('is-invalid');
    if (err) { err.textContent = msg; err.style.display = 'block'; }
    valid = false;
  };

  ['err-uf-fullname','err-uf-username','err-uf-password','err-uf-role'].forEach(clearErr);
  ['uf-fullname','uf-username','uf-password','uf-role'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('is-invalid');
  });

  if (!fullname) setErr('uf-fullname', 'err-uf-fullname', 'Nama lengkap wajib diisi.');
  if (!isEdit && !username) setErr('uf-username', 'err-uf-username', 'Username wajib diisi.');
  if (!isEdit && !password) setErr('uf-password', 'err-uf-password', 'Password wajib diisi.');
  if (!isEdit && password && password.length < 6) {
    setErr('uf-password', 'err-uf-password', 'Password minimal 6 karakter.');
  }
  if (isEdit && password && password.length > 0 && password.length < 6) {
    setErr('uf-password', 'err-uf-password', 'Password minimal 6 karakter jika diisi.');
  }
  if (!role) setErr('uf-role', 'err-uf-role', 'Role wajib dipilih.');

  if (!valid) return;

  var btn = document.getElementById('btn-user-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan…'; }

  if (isEdit) {
    var updates = {
      fullname  : fullname,
      nik       : nik,
      jabatan   : jabatan,
      departemen: dept
    };
    if (password && password.length >= 6) updates.password = password;
    if (actor && actor.role === 'SUPER_ADMIN') {
      updates.role = role;
      if (typeof isActive !== 'undefined') updates.isActive = isActive;
    }

    APP.call('updateUser', [APP.token, PAGE_MANAJEMEN_USER._editingUser, updates],
      function (result) {
        if (btn) { btn.disabled = false; btn.textContent = '✓ Simpan Perubahan'; }
        if (result && result.success) {
          APP.toast(result.message || 'Pengguna berhasil diperbarui.', 'success');
          PAGE_MANAJEMEN_USER._cancelEdit();
          PAGE_MANAJEMEN_USER._loadUsers();
        } else {
          APP.toast((result && result.message) || 'Gagal memperbarui.', 'danger');
        }
      });

  } else {
    var d = {
      fullname  : fullname,
      username  : username,
      password  : password,
      role      : role,
      departemen: dept,
      jabatan   : jabatan,
      nik       : nik
    };

    APP.call('addUser', [APP.token, d], function (result) {
      if (btn) { btn.disabled = false; btn.textContent = '+ Tambah Pengguna'; }
      if (result && result.success) {
        APP.toast(result.message || 'Pengguna berhasil ditambahkan.', 'success');
        PAGE_MANAJEMEN_USER._resetForm();
        PAGE_MANAJEMEN_USER._loadUsers();
      } else {
        APP.toast((result && result.message) || 'Gagal menambahkan pengguna.', 'danger');
      }
    });
  }
};

PAGE_MANAJEMEN_USER._editUser = function (username) {
  var user = PAGE_MANAJEMEN_USER._allUsers.find(function (u) { return u.username === username; });
  if (!user) { APP.toast('Pengguna tidak ditemukan.', 'warning'); return; }

  var actor = APP.currentUser;
  PAGE_MANAJEMEN_USER._editingUser = username;

  var formBody  = document.getElementById('user-form-body');
  var formTitle = document.getElementById('user-form-title');
  if (formBody)  formBody.innerHTML = PAGE_MANAJEMEN_USER._formHtml(actor, user);
  if (formTitle) formTitle.textContent = '✏️ Edit Pengguna: ' + user.fullname;

  APP.populateSelect('uf-dept', PAGE_MANAJEMEN_USER._deptList,
    user.departemen || '', '-- Pilih Departemen --');

  PAGE_MANAJEMEN_USER._formVisible = true;
  if (formBody) formBody.style.display = '';
  var colBtn = document.getElementById('btn-form-toggle');
  if (colBtn) colBtn.textContent = 'Sembunyikan ▲';

  var pc = document.getElementById('page-content');
  if (pc) pc.scrollTop = 0;
};

PAGE_MANAJEMEN_USER._cancelEdit = function () {
  PAGE_MANAJEMEN_USER._editingUser = null;

  var actor     = APP.currentUser;
  var formBody  = document.getElementById('user-form-body');
  var formTitle = document.getElementById('user-form-title');

  if (formBody)  formBody.innerHTML = PAGE_MANAJEMEN_USER._formHtml(actor, null);
  if (formTitle) formTitle.textContent = '➕ Tambah Pengguna Baru';

  APP.populateSelect('uf-dept', PAGE_MANAJEMEN_USER._deptList,
    actor ? actor.departemen : '', '-- Pilih Departemen --');
};

PAGE_MANAJEMEN_USER._resetForm = function () {
  var actor    = APP.currentUser;
  var formBody = document.getElementById('user-form-body');
  if (formBody) formBody.innerHTML = PAGE_MANAJEMEN_USER._formHtml(actor, null);
  APP.populateSelect('uf-dept', PAGE_MANAJEMEN_USER._deptList,
    actor ? actor.departemen : '', '-- Pilih Departemen --');
};

PAGE_MANAJEMEN_USER._deactivateUser = function (username, fullname) {
  APP.confirm({
    icon       : '🚫',
    title      : 'Nonaktifkan Pengguna',
    msg        : 'Akun "' + fullname + '" (@' + username + ') akan dinonaktifkan. ' +
                 'Pengguna tidak akan bisa login.',
    okLabel    : 'Nonaktifkan',
    okClass    : 'btn-danger',
    cancelLabel: 'Batal'
  }).then(function (ok) {
    if (!ok) return;
    APP.call('deleteUser', [APP.token, username], function (result) {
      if (result && result.success) {
        APP.toast(result.message || 'Pengguna berhasil dinonaktifkan.', 'success');
        PAGE_MANAJEMEN_USER._loadUsers();
      } else {
        APP.toast((result && result.message) || 'Gagal menonaktifkan pengguna.', 'danger');
      }
    });
  });
};

PAGE_MANAJEMEN_USER._reactivateUser = function (username, fullname) {
  APP.confirm({
    icon       : '✓',
    title      : 'Aktifkan Kembali Pengguna',
    msg        : 'Akun "' + fullname + '" (@' + username + ') akan diaktifkan kembali.',
    okLabel    : 'Aktifkan',
    okClass    : 'btn-success',
    cancelLabel: 'Batal'
  }).then(function (ok) {
    if (!ok) return;
    APP.call('updateUser', [APP.token, username, { isActive: true }], function (result) {
      if (result && result.success) {
        APP.toast(result.message || 'Pengguna berhasil diaktifkan kembali.', 'success');
        PAGE_MANAJEMEN_USER._loadUsers();
      } else {
        APP.toast((result && result.message) || 'Gagal mengaktifkan pengguna.', 'danger');
      }
    });
  });
};
