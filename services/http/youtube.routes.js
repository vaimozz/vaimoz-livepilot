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

// BUG-H3 FIX: Validasi OAuth state parameter untuk mencegah CSRF attack
// State di-generate saat auth-url dibuat, dan diverifikasi saat callback
// Gunakan simple lookup map dengan TTL 10 menit
const oauthStateMap = new Map();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 menit

function generateOAuthState(userId) {
  const state = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  oauthStateMap.set(state, { userId, createdAt: Date.now() });
  // Bersihkan state lama
  for (const [k, v] of oauthStateMap.entries()) {
    if (Date.now() - v.createdAt > OAUTH_STATE_TTL_MS) oauthStateMap.delete(k);
  }
  return state;
}

function consumeOAuthState(state) {
  const entry = oauthStateMap.get(state);
  if (!entry) return null;
  oauthStateMap.delete(state);
  if (Date.now() - entry.createdAt > OAUTH_STATE_TTL_MS) return null;
  return entry;
}

youtubeRouter.get('/auth-url', requireAuth, asyncHandler(async (req, res) => {
  // BUG-H3 FIX: Buat state unik yang bisa diverifikasi di callback
  const state = generateOAuthState(req.user.id);
  const client = (await import('../youtubeService.js').then(m => m.getOAuthClient))();
  const { getYouTubeScopes } = await import('../youtubeService.js');
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: getYouTubeScopes(),
    state,
  });
  res.json({ url });
}));

youtubeRouter.get('/callback', asyncHandler(async (req, res) => {
  const code = String(req.query.code || '');
  if (!code) return res.status(400).send('Kode OAuth tidak ditemukan.');

  // BUG-H3 FIX: Validasi state parameter untuk mencegah CSRF attack
  const state = String(req.query.state || '');
  if (!state) {
    return res.status(400).send('Parameter state OAuth tidak ditemukan. Kemungkinan CSRF attack.');
  }
  const stateEntry = consumeOAuthState(state);
  if (!stateEntry) {
    // State tidak valid atau sudah expired — tolak callback
    return res.status(400).send('State OAuth tidak valid atau sudah kedaluwarsa. Silakan coba sambungkan YouTube lagi dari halaman Pengaturan.');
  }
  const { tokens, channel } = await exchangeCode(code);
  const snippet = channel?.snippet || {};
  const youtubeChannelId = channel?.id || '';
  const title = snippet.title || 'YouTube Channel';
  const avatar = snippet.thumbnails?.default?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.high?.url || title.split(/\s+/).slice(0, 2).map((item) => item[0]).join('').toUpperCase() || 'YT';
  const expiresAt = tokens.expiry_date || Date.now() + 3600 * 1000;

  const exists = db.prepare('SELECT id, refresh_token FROM youtube_channels WHERE youtube_channel_id = ?').get(youtubeChannelId);
  if (exists) {
    // BUG-023 FIX: Jangan timpa refresh_token jika Google tidak mengembalikannya di login ulang
    const finalRefreshToken = tokens.refresh_token || exists.refresh_token || '';
    db.prepare(`
      UPDATE youtube_channels SET title = ?, access_token = ?, refresh_token = ?, expires_at = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP
      WHERE youtube_channel_id = ?
    `).run(title, tokens.access_token || '', finalRefreshToken, expiresAt, avatar, youtubeChannelId);
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
  if (req.params.id === 'all') {
    const rows = db.prepare('SELECT * FROM youtube_channels WHERE refresh_token != "" OR access_token != ""').all();
    if (rows.length === 0) return res.status(400).json({ error: 'Tidak ada channel YouTube yang terhubung.' });
    
    const aggregated = {
      subscribers: 0,
      totalViews: 0,
      estimatedRevenue: 0,
      estimatedMinutesWatched: 0,
      dailyData: []
    };
    
    const dailyMap = new Map();
    
    const days = parseInt(req.query.days, 10) || 28;
    for (const row of rows) {
      const analytics = await getChannelAnalytics(tokenFromChannel(row), String(row.id), days);
      aggregated.subscribers += (analytics.subscribers || 0);
      aggregated.totalViews += (analytics.totalViews || 0);
      aggregated.estimatedRevenue += (analytics.estimatedRevenue || 0);
      aggregated.estimatedMinutesWatched += (analytics.estimatedMinutesWatched || 0);
      
      if (analytics.dailyData) {
        for (const item of analytics.dailyData) {
          const existing = dailyMap.get(item.day) || { estimatedRevenue: 0, views: 0 };
          dailyMap.set(item.day, {
            estimatedRevenue: existing.estimatedRevenue + (item.estimatedRevenue || 0),
            views: existing.views + (item.views || 0)
          });
        }
      }
    }
    
    aggregated.dailyData = Array.from(dailyMap.entries()).map(([day, data]) => ({
      day,
      estimatedRevenue: data.estimatedRevenue,
      views: data.views
    })).sort((a, b) => a.day.localeCompare(b.day));
    
    return res.json(aggregated);
  }

  const row = db.prepare('SELECT * FROM youtube_channels WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Channel YouTube tidak ditemukan.' });
  if (!row.refresh_token && !row.access_token) return res.status(400).json({ error: 'Channel ini belum punya token OAuth YouTube asli.' });
  
  const days = parseInt(req.query.days, 10) || 28;
  const analytics = await getChannelAnalytics(tokenFromChannel(row), String(row.id), days);
  res.json(analytics);
}));
