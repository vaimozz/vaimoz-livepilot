import { Router } from 'express';
import { db, writeJson } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { serializePlaylist } from '../../utils/serializers.js';

export const playlistsRouter = Router();
playlistsRouter.use(requireAuth);

playlistsRouter.get('/', asyncHandler(async (req, res) => {
  const channelId = req.query.channelId ? String(req.query.channelId) : '';
  const type = req.query.type ? String(req.query.type) : '';
  let rows;
  if (channelId && type) rows = db.prepare('SELECT * FROM playlists WHERE channel_id = ? AND type = ? ORDER BY created_at DESC').all(channelId, type);
  else if (channelId) rows = db.prepare('SELECT * FROM playlists WHERE channel_id = ? ORDER BY created_at DESC').all(channelId);
  else if (type) rows = db.prepare('SELECT * FROM playlists WHERE type = ? ORDER BY created_at DESC').all(type);
  else rows = db.prepare('SELECT * FROM playlists ORDER BY created_at DESC').all();
  res.json({ playlists: rows.map(serializePlaylist) });
}));

playlistsRouter.post('/', asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const channelId = String(req.body.channelId || '').trim();
  const type = String(req.body.type || 'Video').trim();
  const privacy = String(req.body.privacy || 'Private').trim();
  const itemIds = Array.isArray(req.body.itemIds) ? req.body.itemIds : [];
  if (!name) return res.status(400).json({ error: 'Nama playlist wajib diisi.' });

  const result = db.prepare('INSERT INTO playlists (channel_id, name, type, privacy, item_ids_json) VALUES (?, ?, ?, ?, ?)')
    .run(channelId, name, type, privacy, writeJson(itemIds));
  const row = db.prepare('SELECT * FROM playlists WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ playlist: serializePlaylist(row) });
}));

playlistsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'Playlist tidak ditemukan.' });
  const name = String(req.body.name || current.name).trim();
  const privacy = String(req.body.privacy || current.privacy).trim();
  const itemIds = Array.isArray(req.body.itemIds) ? req.body.itemIds : JSON.parse(current.item_ids_json || '[]');
  db.prepare('UPDATE playlists SET name = ?, privacy = ?, item_ids_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(name, privacy, writeJson(itemIds), id);
  res.json({ playlist: serializePlaylist(db.prepare('SELECT * FROM playlists WHERE id = ?').get(id)) });
}));

playlistsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM playlists WHERE id = ?').run(id);
  res.json({ ok: true });
}));
