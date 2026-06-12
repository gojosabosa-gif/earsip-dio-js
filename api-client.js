/**
 * E-ARSIP DIO — API Client for Static Frontend
 * Handles communication with Apps Script backend API
 * Usage: Include this before your main app.js
 */

class EarsipAPI {
  constructor(config) {
    this.baseURL = config.baseURL || '';
    this.token = null;
    this.user = null;
    this.onUnauthorized = config.onUnauthorized || (() => {});
    this.onError = config.onError || ((err) => console.error('API Error:', err));
    
    // Load saved session
    this.loadSession();
  }

  // ============================================================
  // SESSION MANAGEMENT
  // ============================================================

  loadSession() {
    try {
      const token = localStorage.getItem('earsip_token');
      const userStr = localStorage.getItem('earsip_user');
      if (token && userStr) {
        this.token = token;
        this.user = JSON.parse(userStr);
      }
    } catch (e) {
      console.warn('Failed to load session:', e);
    }
  }

  saveSession(token, user) {
    this.token = token;
    this.user = user;
    try {
      localStorage.setItem('earsip_token', token);
      localStorage.setItem('earsip_user', JSON.stringify(user));
      sessionStorage.setItem('earsip_token', token);
      sessionStorage.setItem('earsip_user', JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to save session:', e);
    }
  }

  clearSession() {
    this.token = null;
    this.user = null;
    try {
      localStorage.removeItem('earsip_token');
      localStorage.removeItem('earsip_user');
      sessionStorage.removeItem('earsip_token');
      sessionStorage.removeItem('earsip_user');
    } catch (e) {
      console.warn('Failed to clear session:', e);
    }
  }

  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  getUser() {
    return this.user;
  }

  // ============================================================
  // HTTP REQUEST WRAPPER
  // ============================================================

  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      requireAuth = true,
      params = {}
    } = options;

    try {
      // Build URL with endpoint parameter
      const url = new URL(this.baseURL);
      url.searchParams.set('endpoint', endpoint);
      
      // Add token if required
      if (requireAuth && this.token) {
        url.searchParams.set('token', this.token);
      }

      // Add additional params
      Object.keys(params).forEach(key => {
        url.searchParams.set(key, params[key]);
      });

      // Prepare fetch options
      const fetchOptions = {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      // Add body for POST requests
      if (method === 'POST' && body) {
        fetchOptions.body = JSON.stringify(body);
      }

      // Make request
      const response = await fetch(url.toString(), fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Handle unauthorized
      if (!result.success && result.error && 
          (result.error.includes('UNAUTHORIZED') || result.error.includes('Invalid or expired session'))) {
        this.clearSession();
        this.onUnauthorized();
        throw new Error('Session expired. Please login again.');
      }

      return result;

    } catch (error) {
      console.error('API Request Error:', error);
      this.onError(error);
      throw error;
    }
  }

  // ============================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================

  async ping() {
    return this.request('ping', { requireAuth: false });
  }

  async login(username, password) {
    const result = await this.request('login', {
      method: 'POST',
      body: { username, password },
      requireAuth: false
    });

    if (result.success && result.token && result.user) {
      this.saveSession(result.token, result.user);
    }

    return result;
  }

  async verifySession() {
    if (!this.token) {
      return { success: false, error: 'No session token' };
    }

    const result = await this.request('verify', {
      method: 'POST',
      requireAuth: true
    });

    if (result.success && result.user) {
      this.user = result.user;
    } else {
      this.clearSession();
    }

    return result;
  }

  logout() {
    this.clearSession();
    return { success: true };
  }

  // ============================================================
  // CONSTANTS & METADATA
  // ============================================================

  async getConstants() {
    return this.request('constants', { requireAuth: false });
  }

  // ============================================================
  // ARCHIVES ENDPOINTS
  // ============================================================

  async getArchives(filters = {}) {
    return this.request('archives/list', {
      method: 'POST',
      body: { filters },
      requireAuth: true
    });
  }

  async getArchive(id) {
    return this.request('archives/get', {
      method: 'POST',
      body: { id },
      requireAuth: true
    });
  }

  async createArchive(data) {
    return this.request('archives/create', {
      method: 'POST',
      body: data,
      requireAuth: true
    });
  }

  async updateArchive(id, data) {
    return this.request('archives/update', {
      method: 'POST',
      body: { id, data },
      requireAuth: true
    });
  }

  async deleteArchive(id) {
    return this.request('archives/delete', {
      method: 'POST',
      body: { id },
      requireAuth: true
    });
  }

  // ============================================================
  // DASHBOARD ENDPOINTS
  // ============================================================

  async getDashboardStats() {
    return this.request('dashboard/stats', {
      method: 'POST',
      requireAuth: true
    });
  }

  // ============================================================
  // CLASSIFICATIONS ENDPOINTS
  // ============================================================

  async getClassifications() {
    return this.request('classifications/list', {
      method: 'POST',
      requireAuth: true
    });
  }

  // ============================================================
  // USERS ENDPOINTS
  // ============================================================

  async getUsers() {
    return this.request('users/list', {
      method: 'POST',
      requireAuth: true
    });
  }

  // ============================================================
  // ARCHIVES — EXTRA
  // ============================================================

  async bulkUpdateArchives(ids, updates) {
    return this.request('archives/bulk-update', { method:'POST', body:{ids,updates} });
  }
  async bulkExportArchives(ids) {
    return this.request('archives/bulk-export', { method:'POST', body:{ids} });
  }
  async checkDuplicates(namaBerkas, nomorDokumen) {
    return this.request('archives/check-duplicates', { method:'POST', body:{namaBerkas,nomorDokumen} });
  }
  async getRelatedArchives(archiveId) {
    return this.request('archives/related', { method:'POST', body:{archiveId} });
  }
  async previewNomorBerkas(kodeKlas, departemen, tahun) {
    return this.request('archives/preview-nomor', { method:'POST', body:{kodeKlas,departemen,tahun} });
  }
  async getArchiveDepartemen() {
    return this.request('archives/departemen', { method:'POST' });
  }
  async getArchiveYears() {
    return this.request('archives/years', { method:'POST' });
  }
  async getDeadlineReminders() {
    return this.request('retention/deadline-reminders', { method:'POST' });
  }

  // ============================================================
  // CLASSIFICATIONS — FULL CRUD
  // ============================================================

  async addClassification(data) {
    return this.request('classifications/add', { method:'POST', body:data });
  }
  async updateClassification(id, data) {
    return this.request('classifications/update', { method:'POST', body:{id,data} });
  }
  async deleteClassification(id) {
    return this.request('classifications/delete', { method:'POST', body:{id} });
  }

  // ============================================================
  // JENIS & KATEGORI BERKAS
  // ============================================================

  async getJenisBerkas() { return this.request('jenis/list', { method:'POST' }); }
  async addJenisBerkas(data) { return this.request('jenis/add', { method:'POST', body:data }); }
  async updateJenisBerkas(id, data) { return this.request('jenis/update', { method:'POST', body:{id,data} }); }
  async deleteJenisBerkas(id) { return this.request('jenis/delete', { method:'POST', body:{id} }); }
  async restoreJenisBerkas(id) { return this.request('jenis/restore', { method:'POST', body:{id} }); }
  async getJenisBerkasKelompok() { return this.request('jenis/kelompok', { method:'POST' }); }
  async getKategoriBerkas() { return this.request('kategori/list', { method:'POST' }); }
  async addKategoriBerkas(data) { return this.request('kategori/add', { method:'POST', body:data }); }
  async updateKategoriBerkas(id, data) { return this.request('kategori/update', { method:'POST', body:{id,data} }); }
  async deleteKategoriBerkas(id) { return this.request('kategori/delete', { method:'POST', body:{id} }); }
  async restoreKategoriBerkas(id) { return this.request('kategori/restore', { method:'POST', body:{id} }); }
  async getKategoriBerkasKelompok() { return this.request('kategori/kelompok', { method:'POST' }); }

  // ============================================================
  // USERS — FULL CRUD
  // ============================================================

  async addUser(data) { return this.request('users/add', { method:'POST', body:data }); }
  async updateUser(username, updates) { return this.request('users/update', { method:'POST', body:{username,updates} }); }
  async deleteUser(username) { return this.request('users/delete', { method:'POST', body:{username} }); }
  async getDepartemenList() { return this.request('users/departemen', { method:'POST' }); }
  async changePassword(oldPassword, newPassword) {
    return this.request('change-password', { method:'POST', body:{oldPassword,newPassword} });
  }

  // ============================================================
  // RETENTION
  // ============================================================

  async getRetentionSchedule() { return this.request('retention/schedule', { method:'POST' }); }
  async executeRetention(archiveId, action) {
    return this.request('retention/execute', { method:'POST', body:{archiveId,action} });
  }

  // ============================================================
  // AUDIT TRAIL
  // ============================================================

  async getAuditTrail(filters={}) { return this.request('audit/list', { method:'POST', body:{filters} }); }
  async getAuditModules() { return this.request('audit/modules', { method:'POST' }); }

  // ============================================================
  // REPORTS
  // ============================================================

  async getReportData(filters={}) { return this.request('reports/data', { method:'POST', body:{filters} }); }
  async exportCSV(filters={}) { return this.request('reports/export-csv', { method:'POST', body:{filters} }); }
  async exportJSON() { return this.request('reports/export-json', { method:'POST' }); }

  // ============================================================
  // SETTINGS
  // ============================================================

  async getSettings() { return this.request('settings/list', { method:'POST' }); }
  async saveSettings(settings) { return this.request('settings/save', { method:'POST', body:{settings} }); }
  async getDriveInfo() { return this.request('settings/drive-info', { method:'POST' }); }

  // ============================================================
  // TEMPLATES
  // ============================================================

  async getTemplates() { return this.request('templates/list', { method:'POST' }); }
  async addTemplate(data) { return this.request('templates/add', { method:'POST', body:data }); }
  async deleteTemplate(id) { return this.request('templates/delete', { method:'POST', body:{id} }); }

  // ============================================================
  // LOANS
  // ============================================================

  async getLoans(filters={}) { return this.request('loans/list', { method:'POST', body:{filters} }); }
  async createLoan(data) { return this.request('loans/create', { method:'POST', body:data }); }
  async returnLoan(loanId, catatan) { return this.request('loans/return', { method:'POST', body:{loanId,catatan} }); }

  // ============================================================
  // FILE UPLOAD
  // ============================================================

  async uploadFile(fileInput, departemen, year, tipeBerkas) {
    if (!fileInput || !fileInput.files || !fileInput.files[0]) throw new Error('No file selected');
    const file = fileInput.files[0];
    const maxSize = parseInt(this.config?.maxFileMb || '25') * 1024 * 1024;
    if (file.size > maxSize) throw new Error('File size exceeds limit');
    const base64 = await this.readFileAsBase64(file);
    return this.request('upload/file', {
      method:'POST', body:{base64, mimeType:file.type, fileName:file.name, departemen, year, tipeBerkas}
    });
  }

  async deleteFile(fileId) { return this.request('upload/delete', { method:'POST', body:{fileId} }); }

  readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => { const dataURL=e.target.result; resolve(dataURL.substring(dataURL.indexOf(',')+1)); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// ============================================================
// LOADING MANAGER (Optional utility)
// ============================================================

class LoadingManager {
  constructor() {
    this.count = 0;
    this.overlay = null;
  }

  init() {
    // Create loading overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'loading-overlay';
    this.overlay.innerHTML = '<div class="loading-spinner"></div>';
    this.overlay.style.cssText = `
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(10, 14, 26, 0.75);
      z-index: 9999;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    `;
    document.body.appendChild(this.overlay);
  }

  show() {
    this.count++;
    if (this.overlay) {
      this.overlay.style.display = 'flex';
    }
  }

  hide() {
    this.count = Math.max(0, this.count - 1);
    if (this.count === 0 && this.overlay) {
      this.overlay.style.display = 'none';
    }
  }
}

// ============================================================
// EXPORT
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EarsipAPI, LoadingManager };
}
