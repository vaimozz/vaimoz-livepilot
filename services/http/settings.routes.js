/**
 * Settings Routes — /api/settings
 *
 * Simpan dan baca konfigurasi aplikasi dari tabel `settings` (key-value SQLite).
 * Nilai sensitif (token, secret) hanya dikembalikan sebagai { set: true/false }.
 */

import { Router } from 'express';
import { db, logEvent } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { testTelegramConnection } from '../telegramService.js';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value ?? fallback;
}

function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE
      SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(key, String(value ?? ''));
}

const SENSITIVE = ['telegram_bot_token', 'google_client_id', 'google_client_secret'];

// ── GET /api/settings ─────────────────────────────────────────────────────────
settingsRouter.get('/', asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT key, value, updated_at FROM settings ORDER BY key').all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = SENSITIVE.includes(row.key)
      ? { set: Boolean(row.value), updatedAt: row.updated_at }
      : row.value;
  }
  // Env fallback info (tidak expose nilai)
  settings._env = {
    hasTelegramToken:  Boolean(process.env.TELEGRAM_BOT_TOKEN),
    hasTelegramChatId: Boolean(process.env.TELEGRAM_CHAT_ID),
    hasGoogleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
    hasGoogleSecret:   Boolean(process.env.GOOGLE_CLIENT_SECRET),
    redirectUri:       process.env.GOOGLE_REDIRECT_URI || '',
  };
  res.json({ settings });
}));

// ── POST /api/settings ────────────────────────────────────────────────────────
// BUG-L1 update: Perluas allowlist dengan key Google OAuth dan Gemini
// yang perlu disimpan via endpoint generik (sebagai komplemen endpoint spesifik)
const SETTINGS_ALLOWLIST = new Set([
  // Notification preferences
  'notify_stream_start',
  'notify_stream_stop',
  'notify_stream_error',
  'notify_viewer_milestone',
  'notify_smart_stop',
  'notify_broadcast_live',
  'viewer_milestone_threshold',
  // Telegram (via generic — dedicated endpoint juga ada)
  'telegram_chat_id',
  // Google OAuth credentials (sensitif tapi perlu disimpan via UI settings)
  'google_client_id',
  'google_client_secret',
  'google_redirect_uri',
  // Gemini AI
  'gemini_api_key',
  'gemini_api_url',
  // App preferences
  'app_theme',
  'app_language',
  'default_encoder_mode',
  'default_resolution',
]);

settingsRouter.post('/', asyncHandler(async (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Body harus berupa object { key: value }.' });
  }
  const saved = [];
  const rejected = [];
  for (const [key, value] of Object.entries(updates)) {
    if (typeof key !== 'string' || key.startsWith('_')) continue;
    // BUG-L1 FIX: Hanya izinkan key yang ada dalam allowlist
    if (!SETTINGS_ALLOWLIST.has(key)) {
      rejected.push(key);
      continue;
    }
    setSetting(key, value);
    saved.push(key);
  }
  if (saved.length > 0) {
    logEvent('INFO', 'Settings', `Updated: ${saved.join(', ')}`);
  }
  if (rejected.length > 0) {
    logEvent('WARN', 'Settings', `Ditolak (tidak ada di allowlist): ${rejected.join(', ')}`);
  }
  res.json({ ok: true, saved, rejected: rejected.length > 0 ? rejected : undefined });
}));

// ── POST /api/settings/telegram/test ─────────────────────────────────────────
settingsRouter.post('/telegram/test', asyncHandler(async (req, res) => {
  const botToken = String(req.body.botToken || getSetting('telegram_bot_token') || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId   = String(req.body.chatId   || getSetting('telegram_chat_id')   || process.env.TELEGRAM_CHAT_ID   || '').trim();
  if (!botToken) return res.status(400).json({ error: 'Bot Token wajib diisi.' });
  if (!chatId)   return res.status(400).json({ error: 'Chat ID wajib diisi.' });

  const result = await testTelegramConnection(botToken, chatId);
  if (result.ok) {
    logEvent('INFO', 'Telegram', `Test berhasil ke chat ${chatId}`);
    res.json({ ok: true, message: 'Pesan test berhasil dikirim ke Telegram!' });
  } else {
    res.status(400).json({ ok: false, error: result.reason || 'Gagal mengirim pesan.' });
  }
}));

// ── POST /api/settings/telegram/save ─────────────────────────────────────────
settingsRouter.post('/telegram/save', asyncHandler(async (req, res) => {
  const botToken = String(req.body.botToken || '').trim();
  const chatId   = String(req.body.chatId   || '').trim();
  
  if (!botToken && !getSetting('telegram_bot_token')) {
    return res.status(400).json({ error: 'Bot Token wajib diisi.' });
  }
  if (!chatId) return res.status(400).json({ error: 'Chat ID wajib diisi.' });

  if (botToken) setSetting('telegram_bot_token', botToken);
  setSetting('telegram_chat_id', chatId);
  logEvent('INFO', 'Settings', 'Telegram credentials disimpan ke database.');
  res.json({ ok: true, message: 'Telegram credentials berhasil disimpan.' });
}));

// ── DELETE /api/settings/telegram ────────────────────────────────────────────
settingsRouter.delete('/telegram', asyncHandler(async (req, res) => {
  db.prepare("DELETE FROM settings WHERE key IN ('telegram_bot_token', 'telegram_chat_id')").run();
  logEvent('INFO', 'Settings', 'Telegram credentials dihapus.');
  res.json({ ok: true });
}));

// ── GET /api/settings/notifications/prefs ────────────────────────────────────
settingsRouter.get('/notifications/prefs', asyncHandler(async (req, res) => {
  res.json({
    notifyStreamStart:           getSetting('notify_stream_start',           'true') === 'true',
    notifyStreamStop:            getSetting('notify_stream_stop',            'true') === 'true',
    notifyStreamError:           getSetting('notify_stream_error',           'true') === 'true',
    notifyViewerMilestone:       getSetting('notify_viewer_milestone',       'true') === 'true',
    notifySmartStop:             getSetting('notify_smart_stop',             'true') === 'true',
    notifyBroadcastLive:         getSetting('notify_broadcast_live',         'true') === 'true',
    viewerMilestoneThreshold:    Number(getSetting('viewer_milestone_threshold', '100')),
  });
}));

// ── POST /api/settings/notifications ─────────────────────────────────────────
settingsRouter.post('/notifications', asyncHandler(async (req, res) => {
  const prefs = {
    notify_stream_start:        String(req.body.notifyStreamStart        !== false),
    notify_stream_stop:         String(req.body.notifyStreamStop         !== false),
    notify_stream_error:        String(req.body.notifyStreamError        !== false),
    notify_viewer_milestone:    String(req.body.notifyViewerMilestone    !== false),
    notify_smart_stop:          String(req.body.notifySmartStop          !== false),
    notify_broadcast_live:      String(req.body.notifyBroadcastLive      !== false),
    viewer_milestone_threshold: String(req.body.viewerMilestoneThreshold || 100),
  };
  for (const [key, value] of Object.entries(prefs)) setSetting(key, value);
  logEvent('INFO', 'Settings', 'Notification preferences saved.');
  res.json({ ok: true, saved: prefs });
}));

// ── POST /api/settings/gemini/generate-metadata ──────────────────────────────
settingsRouter.post('/gemini/generate-metadata', asyncHandler(async (req, res) => {
  const { topic } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'Topik (topic) wajib diisi untuk men-generate metadata.' });
  }

  try {
    const { generateGeminiMetadata } = await import('../geminiService.js');
    const result = await generateGeminiMetadata(topic);
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}));

// ── POST /api/settings/google/save ───────────────────────────────────────────
// Endpoint khusus untuk menyimpan Google OAuth credentials (Client ID & Secret)
settingsRouter.post('/google/save', asyncHandler(async (req, res) => {
  const clientId     = String(req.body.clientId     || '').trim();
  const clientSecret = String(req.body.clientSecret || '').trim();
  const redirectUri  = String(req.body.redirectUri  || '').trim();

  if (!clientId && !clientSecret) {
    return res.status(400).json({ error: 'Client ID atau Client Secret wajib diisi.' });
  }

  if (clientId)     setSetting('google_client_id', clientId);
  if (clientSecret) setSetting('google_client_secret', clientSecret);
  if (redirectUri)  setSetting('google_redirect_uri', redirectUri);

  logEvent('INFO', 'Settings', 'Google OAuth credentials disimpan ke database.');
  res.json({ ok: true, message: 'Google OAuth credentials berhasil disimpan.' });
}));

// ── DELETE /api/settings/google ───────────────────────────────────────────────
settingsRouter.delete('/google', asyncHandler(async (req, res) => {
  db.prepare("DELETE FROM settings WHERE key IN ('google_client_id', 'google_client_secret')").run();
  logEvent('INFO', 'Settings', 'Google OAuth credentials dihapus dari database.');
  res.json({ ok: true });
}));

// ── POST /api/settings/gemini/save ───────────────────────────────────────────
// Endpoint khusus untuk menyimpan Gemini API Key
settingsRouter.post('/gemini/save', asyncHandler(async (req, res) => {
  const apiKey = String(req.body.apiKey || '').trim();
  const apiUrl = String(req.body.apiUrl || '').trim();

  if (!apiKey) {
    return res.status(400).json({ error: 'Gemini API Key wajib diisi.' });
  }

  setSetting('gemini_api_key', apiKey);
  if (apiUrl) setSetting('gemini_api_url', apiUrl);
  else db.prepare("DELETE FROM settings WHERE key = 'gemini_api_url'").run();

  logEvent('INFO', 'Settings', 'Gemini API Key disimpan ke database.');
  res.json({ ok: true, message: 'Gemini API Key berhasil disimpan.' });
}));

// ── DELETE /api/settings/gemini ───────────────────────────────────────────────
settingsRouter.delete('/gemini', asyncHandler(async (req, res) => {
  db.prepare("DELETE FROM settings WHERE key IN ('gemini_api_key', 'gemini_api_url')").run();
  logEvent('INFO', 'Settings', 'Gemini API Key dihapus dari database.');
  res.json({ ok: true });
}));
