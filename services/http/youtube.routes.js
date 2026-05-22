import { Router } from 'express';
import { db } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { serializeYoutubeChannel } from '../../utils/serializers.js';
import { createBroadcastAndStream, createPlaylist, exchangeCode, getChannelAnalytics, listPlaylists, makeAuthUrl } from '../youtubeService.js';

export const youtubeRouter = Router();

function tokenFromChannel(row) {
  return {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: row.expires_at,
  };
}

youtubeRouter.get('/auth-url', requireAuth, asyncHandler(async (req, res) => {
  res.json({ url: makeAuthUrl(String(req.user.id)) });
}));

youtubeRouter.get('/callback', asyncHandler(async (req, res) => {
  const code = String(req.query.code || '');
  if (!code) return res.status(400).send('Kode OAuth tidak ditemukan.');
  const { tokens, channel } = await exchangeCode(code);
  const snippet = channel?.snippet || {};
  const youtubeChannelId = channel?.id || '';
  const title = snippet.title || 'YouTube Channel';
  const avatar = snippet.thumbnails?.default?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.high?.url || title.split(/\s+/).slice(0, 2).map((item) => item[0]).join('').toUpperCase() || 'YT';
  const expiresAt = tokens.expiry_date || Date.now() + 3600 * 1000;

  const exists = db.prepare('SELECT id FROM youtube_channels WHERE youtube_channel_id = ?').get(youtubeChannelId);
  if (exists) {
    db.prepare(`
      UPDATE youtube_channels SET title = ?, access_token = ?, refresh_token = ?, expires_at = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP
      WHERE youtube_channel_id = ?
    `).run(title, tokens.access_token || '', tokens.refresh_token || '', expiresAt, avatar, youtubeChannelId);
  } else {
    db.prepare(`
      INSERT INTO youtube_channels (youtube_channel_id, title, access_token, refresh_token, expires_at, avatar, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(youtubeChannelId, title, tokens.access_token || '', tokens.refresh_token || '', expiresAt, avatar, 0);
  }

  res.redirect('/settings?youtube_connected=1');
}));

youtubeRouter.use(requireAuth);

youtubeRouter.get('/channels', asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT * FROM youtube_channels ORDER BY is_default DESC, created_at DESC').all();
  res.json({ channels: rows.map(serializeYoutubeChannel) });
}));

youtubeRouter.delete('/channels/:id', asyncHandler(async (req, res) => {
  db.prepare('DELETE FROM youtube_channels WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
}));

youtubeRouter.post('/channels/:id/default', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE youtube_channels SET is_default = 0').run();
  db.prepare('UPDATE youtube_channels SET is_default = 1 WHERE id = ?').run(id);
  res.json({ ok: true });
}));

youtubeRouter.get('/channels/:id/playlists', asyncHandler(async (req, res) => {
  const row = db.prepare('SELECT * FROM youtube_channels WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Channel YouTube tidak ditemukan.' });
  if (!row.refresh_token && !row.access_token) {
    const local = db.prepare('SELECT * FROM playlists WHERE channel_id = ? ORDER BY created_at DESC').all(String(row.id));
    return res.json({ playlists: local, source: 'local-db' });
  }
  const items = await listPlaylists(tokenFromChannel(row));
  res.json({ playlists: items, source: 'youtube-api' });
}));

youtubeRouter.post('/channels/:id/playlists', asyncHandler(async (req, res) => {
  const row = db.prepare('SELECT * FROM youtube_channels WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Channel YouTube tidak ditemukan.' });
  const title = String(req.body.title || req.body.name || '').trim();
  if (!title) return res.status(400).json({ error: 'Nama playlist wajib diisi.' });

  if (!row.refresh_token && !row.access_token) {
    const result = db.prepare('INSERT INTO playlists (channel_id, name, type, privacy, item_ids_json) VALUES (?, ?, ?, ?, ?)')
      .run(String(row.id), title, 'YouTube', req.body.privacyStatus || 'Private', '[]');
    return res.status(201).json({ playlist: { id: result.lastInsertRowid, title, source: 'local-db' } });
  }

  const playlist = await createPlaylist(tokenFromChannel(row), {
    title,
    description: req.body.description || '',
    privacyStatus: req.body.privacyStatus || 'private',
  });
  res.status(201).json({ playlist, source: 'youtube-api' });
}));

youtubeRouter.post('/channels/:id/broadcasts', asyncHandler(async (req, res) => {
  const row = db.prepare('SELECT * FROM youtube_channels WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Channel YouTube tidak ditemukan.' });
  if (!row.refresh_token && !row.access_token) return res.status(400).json({ error: 'Channel ini belum punya token OAuth YouTube asli.' });
  const result = await createBroadcastAndStream(tokenFromChannel(row), req.body);
  res.status(201).json(result);
}));

youtubeRouter.get('/channels/:id/analytics', asyncHandler(async (req, res) => {
  const row = db.prepare('SELECT * FROM youtube_channels WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Channel YouTube tidak ditemukan.' });
  if (!row.refresh_token && !row.access_token) return res.status(400).json({ error: 'Channel ini belum punya token OAuth YouTube asli.' });
  
  const analytics = await getChannelAnalytics(tokenFromChannel(row), String(row.id));
  res.json(analytics);
}));
