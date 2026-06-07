/**
 * Notifications Routes — /api/notifications
 * Sistem notifikasi in-app yang tersimpan di database.
 */

import { Router } from 'express';
import { db, logEvent } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

function serializeNotification(row) {
  if (!row) return null;
  let data = {};
  try { data = JSON.parse(row.data_json || '{}'); } catch { data = {}; }
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    data,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
  };
}

// ── GET /api/notifications ────────────────────────────────────────────────────
// Query params: limit (default 50), unread (true/false)
notificationsRouter.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50'), 200);
  const unreadOnly = req.query.unread === 'true';

  let query = 'SELECT * FROM notifications';
  const params = [];
  if (unreadOnly) {
    query += ' WHERE is_read = 0';
  }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(query).all(...params);
  res.json({ notifications: rows.map(serializeNotification) });
}));

// ── GET /api/notifications/count — Jumlah unread ─────────────────────────────
notificationsRouter.get('/count', asyncHandler(async (req, res) => {
  const row = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get();
  res.json({ unread: row.count });
}));

// ── PATCH /api/notifications/:id/read — Mark satu sebagai read ───────────────
notificationsRouter.patch('/:id/read', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT id FROM notifications WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Notifikasi tidak ditemukan.' });

  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
  res.json({ ok: true });
}));

// ── POST /api/notifications/read-all — Mark semua sebagai read ───────────────
notificationsRouter.post('/read-all', asyncHandler(async (req, res) => {
  const result = db.prepare('UPDATE notifications SET is_read = 1 WHERE is_read = 0').run();
  res.json({ ok: true, updated: result.changes });
}));

// ── DELETE /api/notifications/:id — Hapus satu notifikasi ────────────────────
notificationsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT id FROM notifications WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Notifikasi tidak ditemukan.' });

  db.prepare('DELETE FROM notifications WHERE id = ?').run(id);
  res.json({ ok: true });
}));

// ── DELETE /api/notifications — Hapus semua notifikasi ───────────────────────
notificationsRouter.delete('/', asyncHandler(async (req, res) => {
  const result = db.prepare('DELETE FROM notifications').run();
  logEvent('INFO', 'Notifikasi', `${result.changes} notifikasi dihapus.`);
  res.json({ ok: true, deleted: result.changes });
}));
