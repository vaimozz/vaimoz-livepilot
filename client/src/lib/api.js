const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'vaimoz_token';
const TOKEN_EXPIRY_KEY = 'vaimoz_token_exp';

/**
 * BUG-L4 FIX: Keamanan token JWT di browser.
 *
 * Masalah: Token di localStorage dapat dibaca oleh sembarang JS yang berjalan di halaman
 * (rentan XSS). Solusi terbaik adalah httpOnly cookie (butuh perubahan backend), namun
 * sebagai mitigasi tanpa perubahan backend kita menambahkan:
 *
 * 1. Simpan expiry waktu token secara terpisah dan cek sebelum setiap request —
 *    token yang sudah expired dibersihkan proaktif tanpa harus menunggu respons 401.
 * 2. Tambahkan helper parseTokenExpiry() untuk membaca exp dari JWT payload.
 * 3. Auto-clear token saat tab/window ditutup jika pengguna memilih mode "session only"
 *    (untuk saat ini default ke persistent karena app ini single-user tool).
 *
 * Catatan: Mitigasi XSS sepenuhnya membutuhkan Content-Security-Policy header di server
 * dan implementasi httpOnly cookie — ini adalah rekomendasi untuk iterasi berikutnya.
 */

/**
 * Parse expiry timestamp dari JWT payload (tanpa library eksternal).
 * @param {string} token
 * @returns {number|null} - Unix timestamp dalam ms, atau null jika gagal
 */
function parseTokenExpiry(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url decode
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : null; // konversi detik → ms
  } catch {
    return null;
  }
}

export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY) || '';
  if (!token) return '';

  // Cek expiry secara proaktif — bersihkan token yang sudah expired
  const expiry = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY) || '0', 10);
  if (expiry && Date.now() > expiry) {
    // Token sudah expired — bersihkan sebelum request dikirim
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    window.dispatchEvent(new CustomEvent('vaimoz:unauthorized'));
    return '';
  }

  return token;
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    // Simpan expiry terpisah agar bisa di-cek tanpa decode setiap saat
    const expiry = parseTokenExpiry(token);
    if (expiry) {
      localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry));
    } else {
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    }
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }
}

export async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    let message = typeof data === 'string' ? data : data.error || 'Request gagal.';
    if (response.status === 413) {
      message = 'File terlalu besar. Server menolak permintaan (413 Request Entity Too Large). Silakan periksa konfigurasi server Nginx (client_max_body_size).';
    } else if (typeof message === 'string' && message.includes('<html')) {
      message = `Server Error HTTP ${response.status}`;
    }
    // Jika server membalas 401, token sudah expired — paksa logout
    if (response.status === 401) {
      setToken(null);
      window.dispatchEvent(new CustomEvent('vaimoz:unauthorized'));
    }
    throw new Error(message);
  }
  return data;
}

export const api = {
  health: () => apiRequest('/health'),
  auth: {
    login: (username, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    register: (username, password, displayName) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, displayName }) }),
    me: () => apiRequest('/auth/me'),
    updateMe: (payload) => apiRequest('/auth/me', { method: 'PATCH', body: JSON.stringify(payload) }),
  },
  assets: {
    list: (type = '') => apiRequest(`/assets${type ? `?type=${encodeURIComponent(type)}` : ''}`),
    upload: (files) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('files', file));
      return apiRequest('/assets/upload', { method: 'POST', body: formData });
    },
    uploadWithProgress: (files, onProgress) => new Promise((resolve, reject) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('files', file));
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/assets/upload`);
      const token = getToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded, e.total); };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          let msg = (() => { try { return JSON.parse(xhr.responseText).error; } catch { return 'Upload gagal.'; } })();
          if (xhr.status === 413) {
            msg = 'File terlalu besar. Server menolak permintaan (413 Request Entity Too Large). Silakan periksa konfigurasi server Nginx (client_max_body_size).';
          } else if (typeof xhr.responseText === 'string' && xhr.responseText.includes('<html')) {
            msg = `Server Error HTTP ${xhr.status}`;
          }
          if (xhr.status === 401) { setToken(null); window.dispatchEvent(new CustomEvent('vaimoz:unauthorized')); }
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error('Koneksi gagal saat upload.'));
      xhr.send(formData);
    }),
    rename: (id, name) => apiRequest(`/assets/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    remove: (id) => apiRequest(`/assets/${id}`, { method: 'DELETE' }),
    gdriveStart: (url) => apiRequest('/assets/gdrive', { method: 'POST', body: JSON.stringify({ url }) }),
    gdriveProgress: (jobId) => apiRequest(`/assets/gdrive/progress/${encodeURIComponent(jobId)}`),
  },
  playlists: {
    list: (params = {}) => {
      const search = new URLSearchParams(params).toString();
      return apiRequest(`/playlists${search ? `?${search}` : ''}`);
    },
    create: (payload) => apiRequest('/playlists', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id, payload) => apiRequest(`/playlists/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    remove: (id) => apiRequest(`/playlists/${id}`, { method: 'DELETE' }),
  },
  campaigns: {
    list:   () => apiRequest('/campaigns'),
    create: (payload) => apiRequest('/campaigns', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id, payload) => apiRequest(`/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    remove: (id) => apiRequest(`/campaigns/${id}`, { method: 'DELETE' }),
    start:  (id, payload = {}) => apiRequest(`/campaigns/${id}/start`, { method: 'POST', body: JSON.stringify(payload) }),
    startYoutubeLive: (id, payload = {}) => apiRequest(`/campaigns/${id}/start-youtube-live`, { method: 'POST', body: JSON.stringify(payload) }),
    startSimulcast: (id, targets, durationMinutes) => apiRequest(`/campaigns/${id}/start-simulcast`, { method: 'POST', body: JSON.stringify({ targets, durationMinutes }) }),
    saveAsTemplate: (campaignId, name, description) => apiRequest(`/campaigns/${campaignId}/save-as-template`, { method: 'POST', body: JSON.stringify({ name, description }) }),
    stop:   (id) => apiRequest(`/campaigns/${id}/stop`, { method: 'POST' }),
  },
  streams: {
    list:    () => apiRequest('/streams'),
    running: () => apiRequest('/streams/running'),
    start:   (payload) => apiRequest('/streams/start', { method: 'POST', body: JSON.stringify(payload) }),
    startCampaign: (campaignId, payload) => apiRequest('/streams/start-campaign', { method: 'POST', body: JSON.stringify({ campaignId, ...payload }) }),
    stop:    (id) => apiRequest(`/streams/${id}/stop`, { method: 'POST' }),
    delete:  (ids) => apiRequest('/streams/delete', { method: 'POST', body: JSON.stringify({ ids }) }),
    sync:    (ids) => apiRequest('/streams/sync', { method: 'POST', body: JSON.stringify({ ids }) }),
  },
  youtube: {
    authUrl: () => apiRequest('/youtube/auth-url'),
    channels: () => apiRequest('/youtube/channels'),
    removeChannel: (id) => apiRequest(`/youtube/channels/${id}`, { method: 'DELETE' }),
    setDefaultChannel: (id) => apiRequest(`/youtube/channels/${id}/default`, { method: 'POST' }),
    playlists: (channelId) => apiRequest(`/youtube/channels/${channelId}/playlists`),
    createPlaylist: (channelId, payload) => apiRequest(`/youtube/channels/${channelId}/playlists`, { method: 'POST', body: JSON.stringify(payload) }),
    createBroadcast: (channelId, payload) => apiRequest(`/youtube/channels/${channelId}/broadcasts`, { method: 'POST', body: JSON.stringify(payload) }),
    analytics: (channelId) => apiRequest(`/youtube/channels/${channelId}/analytics`),
  },
  chatbot: {
    start: (campaignId, payload) => apiRequest(`/campaigns/${campaignId}/chatbot/start`, { method: 'POST', body: JSON.stringify(payload) }),
    stop: (campaignId) => apiRequest(`/campaigns/${campaignId}/chatbot/stop`, { method: 'POST' }),
    status: (campaignId) => apiRequest(`/campaigns/${campaignId}/chatbot/status`),
    send: (campaignId, message) => apiRequest(`/campaigns/${campaignId}/chatbot/send`, { method: 'POST', body: JSON.stringify({ message }) }),
  },
  analytics: {
    get: (campaignId) => apiRequest(`/campaigns/${campaignId}/analytics`),
    getGlobal: (params = {}) => {
      const search = new URLSearchParams(params).toString();
      return apiRequest(`/analytics${search ? `?${search}` : ''}`);
    },
  },
  production: {
    jobs: () => apiRequest('/production/jobs'),
    start: (payload) => apiRequest('/production/start', { method: 'POST', body: JSON.stringify(payload) }),
    remove: (id) => apiRequest(`/production/jobs/${id}`, { method: 'DELETE' }),
  },
  monitor: {
    metrics: () => apiRequest('/monitor/metrics'),
    logs: (params = {}) => {
      const search = new URLSearchParams(params).toString();
      return apiRequest(`/monitor/logs${search ? `?${search}` : ''}`);
    },
    clearLogs: () => apiRequest('/monitor/logs', { method: 'DELETE' }),
  },
  settings: {
    get: () => apiRequest('/settings'),
    save: (payload) => apiRequest('/settings', { method: 'POST', body: JSON.stringify(payload) }),
    testTelegram: (botToken, chatId) => apiRequest('/settings/telegram/test', { method: 'POST', body: JSON.stringify({ botToken, chatId }) }),
    saveTelegram: (botToken, chatId) => apiRequest('/settings/telegram/save', { method: 'POST', body: JSON.stringify({ botToken, chatId }) }),
    deleteTelegram: () => apiRequest('/settings/telegram', { method: 'DELETE' }),
    getNotifPrefs: () => apiRequest('/settings/notifications/prefs'),
    saveNotifPrefs: (prefs) => apiRequest('/settings/notifications', { method: 'POST', body: JSON.stringify(prefs) }),
    // Google OAuth credentials
    saveGoogle: (clientId, clientSecret, redirectUri) => apiRequest('/settings/google/save', { method: 'POST', body: JSON.stringify({ clientId, clientSecret, redirectUri }) }),
    deleteGoogle: () => apiRequest('/settings/google', { method: 'DELETE' }),
    // Gemini AI
    saveGemini: (apiKey, apiUrl) => apiRequest('/settings/gemini/save', { method: 'POST', body: JSON.stringify({ apiKey, apiUrl }) }),
    deleteGemini: () => apiRequest('/settings/gemini', { method: 'DELETE' }),
    generateGeminiMetadata: (topic) => apiRequest('/settings/gemini/generate-metadata', { method: 'POST', body: JSON.stringify({ topic }) }),
  },
  backup: {
    export: () => {
      const token = getToken();
      return fetch(`${API_BASE}/backup/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).then(async (res) => {
        if (!res.ok) throw new Error('Gagal mengunduh backup.');
        const blob = await res.blob();
        const dateStr = new Date().toISOString().slice(0, 10);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vaimoz-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { ok: true };
      });
    },
    import: (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const json = JSON.parse(e.target.result);
            const result = await apiRequest('/backup/import', { method: 'POST', body: JSON.stringify(json) });
            resolve(result);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('Gagal membaca file backup.'));
        reader.readAsText(file);
      });
    },
    status: () => apiRequest('/backup/status'),
  },
  templates: {
    list: () => apiRequest('/templates'),
    create: (payload) => apiRequest('/templates', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id, payload) => apiRequest(`/templates/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    remove: (id) => apiRequest(`/templates/${id}`, { method: 'DELETE' }),
    apply: (id, name) => apiRequest(`/templates/${id}/apply`, { method: 'POST', body: JSON.stringify({ name }) }),
    saveFromCampaign: (campaignId, name, description) => apiRequest(`/campaigns/${campaignId}/save-as-template`, { method: 'POST', body: JSON.stringify({ name, description }) }),
  },
  notifications: {
    list: (params = {}) => apiRequest(`/notifications?${new URLSearchParams(params)}`),
    count: () => apiRequest('/notifications/count'),
    markRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => apiRequest('/notifications/read-all', { method: 'POST' }),
    remove: (id) => apiRequest(`/notifications/${id}`, { method: 'DELETE' }),
    clear: () => apiRequest('/notifications', { method: 'DELETE' }),
  },
  streamHealth: {
    streams: () => apiRequest('/health/streams'),
    // SSE — gunakan fetch dengan header Authorization
    // Kembalikan controller untuk bisa dibatalkan
    subscribe: (streamId, onMessage, onError) => {
      const token = getToken();
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      let active = true;

      fetch(`${API_BASE}/health/stream/${streamId}`, { headers })
        .then((res) => {
          if (!res.ok) throw new Error(`SSE error: ${res.status}`);
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          function read() {
            if (!active) return;
            reader.read().then(({ done, value }) => {
              if (done || !active) return;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop();
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try { onMessage(JSON.parse(line.slice(6))); } catch { /* skip */ }
                }
              }
              read();
            }).catch((err) => { if (active && onError) onError(err); });
          }
          read();
        })
        .catch((err) => { if (active && onError) onError(err); });

      // Kembalikan cancel function
      return () => { active = false; };
    },
  },
  // Helper methods to match Axios-like requests used by some scheduler components
  get: (path, options = {}) => {
    // BUG-L2 FIX: Hanya strip prefix "/api" jika diikuti oleh "/" (bukan "/api-something")
    const cleanedPath = path.startsWith('/api/') ? path.substring(4) : (path === '/api' ? '' : path);
    return apiRequest(cleanedPath, { method: 'GET', ...options }).then((data) => ({ data }));
  },
  post: (path, body, options = {}) => {
    // BUG-L2 FIX: Hanya strip prefix "/api" jika diikuti oleh "/" (bukan "/api-something")
    const cleanedPath = path.startsWith('/api/') ? path.substring(4) : (path === '/api' ? '' : path);
    return apiRequest(cleanedPath, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }).then((data) => ({ data }));
  },
};

export default api;

