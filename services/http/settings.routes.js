/**
 * Settings Routes
 *
 * Endpoint untuk membaca dan menyimpan konfigurasi aplikasi ke SQLite.
 * Semua setting disimpan di tabel `settings` (key-value).
 */

import { Router } from 'express';
import { db, logEvent } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { testTelegramConnection } from '../telegramService.js';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

// ── Helper ────────────────────────────────────────────────────────────────────
function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value ?? fallback;
}

function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(key, String(value ?? ''));
}

// ── GET /api/settings ─────────────────────────────────────────────────────────
// Kembalikan semua setting (sensor nilai sensitif)
settingsRouter.get('/', asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT key, value, updated_at FROM settings ORDER BY key').all();

  // Sensor nilai sensitif — hanya kirim apakah sudah diisi atau belum
  const SENSITIVE = ['telegram_bot_token', 'google_client_id', 'google_client_secret'];
  const settings = {};
  for (const row of rows) {
    settings[row.key] = SENSITIVE.includes(row.key)
      ? { set: Boolean(row.value), updatedAt: row.updated_at }
      : row.value;
  }

  // Tambahkan status dari env sebagai fallback info
  settings._env = {
    hasTelegramToken:  Boolean(process.env.TELEGRAM_BOT_TOKEN),
    hasTelegramChatId: Boolean(process.env.TELEGRAM_CHAT_ID),
    hasGoogleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
    hasGoogleSecret:   Boolean(process.env.GOOGLE_CLIENT_SECRET),
    redirectUri:       process.env.GOOGLE_REDIRECT_URI || '',
  };

  res.json({ settings });
}));

// ── GET /api/settings/:key ────────────────────────────────────────────────────
settingsRouter.get('/:key', asyncHandler(async (req, res) => {
  const SENSITIVE = ['telegram_bot_token', 'google_client_id', 'google_client_secret'];
  const key = req.params.key;
  const value = getSetting(key);

  if (SENSITIVE.includes(key)) {
    return res.json({ key, set: Boolean(value) });
  }

  res.json({ key, value });
}));

// ── POST /api/settings ────────────────────────────────────────────────────────
// Simpan satu atau banyak setting sekaligus
settingsRouter.post('/', asyncHandler(async (req, res) => {
  const updates = req.body; // { key: value, ... }
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Body harus berupa object { key: value }.' });
  }

  const saved = [];
  for (const [key, value] of Object.entries(updates)) {
    if (typeof key !== 'string' || key.startsWith('_')) continue;
    setSetting(key, value);
    saved.push(key);
  }

  logEvent('INFO', 'Settings', `Updated: ${saved.join(', ')}`);
  res.json({ ok: true, saved });
}));

// ── POST /api/settings/telegram/test ─────────────────────────────────────────
// Test koneksi Telegram dengan token & chat ID yang dikirim
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
// Simpan Telegram credentials ke DB
settingsRouter.post('/telegram/save', asyncHandler(async (req, res) => {
  const botToken = String(req.body.botToken || '').trim();
  const chatId   = String(req.body.chatId   || '').trim();

  if (!botToken) return res.status(400).json({ error: 'Bot Token wajib diisi.' });
  if (!chatId)   return res.status(400).json({ error: 'Chat ID wajib diisi.' });

  setSetting('telegram_bot_token', botToken);
  setSetting('telegram_chat_id', chatId);

  logEvent('INFO', 'Settings', 'Telegram credentials disimpan ke database.');
  res.json({ ok: true, message: 'Telegram credentials berhasil disimpan.' });
}));

// ── DELETE /api/settings/telegram ────────────────────────────────────────────
settingsRouter.delete('/telegram', asyncHandler(async (req, res) => {
  db.prepare("DELETE FROM settings WHERE key IN ('telegram_bot_token', 'telegram_chat_id')").run();
  logEvent('INFO', 'Settings', 'Telegram credentials dihapus dari database.');
  res.json({ ok: true });
}));

// ── POST /api/settings/notifications ─────────────────────────────────────────
// Simpan preferensi notifikasi
settingsRouter.post('/notifications', asyncHandler(async (req, res) => {
  const prefs = {
    notify_stream_start:   req.body.notifyStreamStart   !== false,
    notify_stream_stop:    req.body.notifyStreamStop    !== false,
    notify_stream_error:   req.body.notifyStreamError   !== false,
    notify_viewer_milestone: req.body.notifyViewerMilestone !== false,
    notify_smart_stop:     req.body.notifySmartStop     !== false,
    notify_broadcast_live: req.body.notifyBroadcastLive !== false,
    viewer_milestone_threshold: String(req.body.viewerMilestoneThreshold || '100'),
  };

  for (const [key, value] of Object.entries(prefs)) {
    setSetting(key, String(value));
  }

  logEvent('INFO', 'Settings', 'Notification preferences saved.');
  res.json({ ok: true, saved: prefs });
}));

// ── GET /api/settings/notifications ──────────────────────────────────────────
settingsRouter.get('/notifications/prefs', asyncHandler(async (req, res) => {
  res.json({
    notifyStreamStart:        getSetting('notify_stream_start', 'true') === 'true',
    notifyStreamStop:         getSetting('notify_stream_stop', 'true') === 'true',
    notifyStreamError:        getSetting('notify_stream_error', 'true') === 'true',
    notifyViewerMilestone:    getSetting('notify_viewer_milestone', 'true') === 'true',
    notifySmartStop:          getSetting('notify_smart_stop', 'true') === 'true',
    notifyBroadcastLive:      getSetting('notify_broadcast_live', 'true') === 'true',
    viewerMilestoneThreshold: Number(getSetting('viewer_milestone_threshold', '100')),
  });
}));
