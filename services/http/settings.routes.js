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
// BUG-L1 FIX: Gunakan allowlist untuk key yang boleh ditulis via endpoint generik.
// Key sensitif (token, secret) hanya bisa diubah via endpoint spesifik masing-masing.
const SETTINGS_ALLOWLIST = new Set([
  'notify_stream_start',
  'notify_stream_stop',
  'notify_stream_error',
  'notify_viewer_milestone',
  'notify_smart_stop',
  'notify_broadcast_live',
  'viewer_milestone_threshold',
  'telegram_chat_id',
  'google_redirect_uri',
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
