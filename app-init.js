/**
 * E-ARSIP DIO - App Initialization
 * Load this FIRST before any other app-*.js modules
 * Sets up global API instance and configuration
 */

// ============================================================
// CONFIGURATION — Update this URL with your Apps Script deployment
// ============================================================

const APP_CONFIG = {
  API_BASE_URL: 'https://script.google.com/macros/s/AKfycby37i8wQ9fz5C7Aw65JmX3-mbe0dmpevaSngOFZVniPJnIFwtG9KFcYVEHBLP-v14_-/exec'
};

// ============================================================
// GLOBAL API INSTANCE — Used by all app-*.js modules
// ============================================================

let api = null;
let apiReady = false;

function initApp() {
  try {
    api = new EarsipAPI({
      baseURL: APP_CONFIG.API_BASE_URL,
      onUnauthorized: function() {
        var modal = document.getElementById('login-modal');
        var appEl = document.getElementById('app');
        if (modal) modal.classList.add('visible');
        if (appEl) appEl.classList.add('hidden');
        if (window.APP && window.APP.toast) {
          window.APP.toast('Sesi berakhir. Silakan login kembali.', 'warning');
        }
      },
      onError: function(error) {
        console.error('API Error:', error);
      }
    });

    apiReady = true;

    // Check if already logged in
    if (api.isAuthenticated()) {
      api.verifySession().then(function(result) {
        if (result.success) {
          startApp();
        } else {
          showLogin();
        }
      });
    } else {
      showLogin();
    }
  } catch (e) {
    console.error('Failed to initialize app:', e);
  }
}

function showLogin() {
  var modal = document.getElementById('login-modal');
  if (modal) modal.classList.add('visible');
}

function startApp() {
  var modal = document.getElementById('login-modal');
  var appEl = document.getElementById('app');
  if (modal) modal.classList.remove('visible');
  if (appEl) appEl.classList.remove('hidden');
  
  var user = api.getUser();
  var welcome = document.getElementById('user-welcome');
  var nameEl = document.getElementById('user-name');
  var roleEl = document.getElementById('user-role');
  
  if (user) {
    if (nameEl) nameEl.textContent = user.fullname || user.username;
    if (roleEl) {
      var labels = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', USER: 'Staff' };
      roleEl.textContent = labels[user.role] || user.role;
    }
    if (welcome) {
      var h = new Date().getHours();
      var g = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
      welcome.textContent = g + ', ' + (user.fullname || user.username);
    }
  }
  
  // Load dashboard by default
  if (window.APP && window.APP.navigate) {
    window.APP.navigate('dashboard');
  }
}

// Auto-init when DOM ready
document.addEventListener('DOMContentLoaded', initApp);

// Expose login handler globally (called from template)
window.handleLogin = function() {
  var username = document.getElementById('login-username');
  var password = document.getElementById('login-password');
  var errorEl = document.getElementById('login-error');
  var btn = document.getElementById('btn-login');
  
  if (!username || !password || !errorEl) return;
  
  var u = username.value.trim();
  var p = password.value;
  
  if (!u || !p) {
    if (errorEl) { errorEl.textContent = 'Username dan password wajib diisi'; errorEl.classList.remove('hidden'); }
    return;
  }
  
  errorEl.classList.add('hidden');
  
  if (!api) {
    errorEl.textContent = 'Sistem belum siap. Refresh halaman.';
    errorEl.classList.remove('hidden');
    return;
  }
  
  if (btn) { btn.disabled = true; btn.textContent = 'Memverifikasi...'; }
  
  api.login(u, p).then(function(result) {
    if (btn) { btn.disabled = false; btn.textContent = 'Masuk Sistem'; }
    if (result.success) {
      password.value = '';
      errorEl.classList.add('hidden');
      startApp();
    } else {
      errorEl.textContent = result.message || 'Login gagal';
      errorEl.classList.remove('hidden');
    }
  }).catch(function(err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Masuk Sistem'; }
    errorEl.textContent = 'Error: ' + (err.message || 'Gagal terhubung ke server');
    errorEl.classList.remove('hidden');
  });
};

window.handleLogout = function() {
  if (confirm('Yakin ingin keluar dari sistem?')) {
    api.logout();
    if (window.APP && window.APP.toast) {
      window.APP.toast('Anda telah keluar', 'info');
    }
    showLogin();
  }
};
