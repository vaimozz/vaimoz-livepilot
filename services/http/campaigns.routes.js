import { Router } from 'express';
import { db, writeJson, logEvent } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { serializeCampaign, serializeStream } from '../../utils/serializers.js';
import { startFfmpegStream, stopFfmpegStream } from '../ffmpegRunner.js';
import {
  createYoutubeLiveBroadcast,
  transitionBroadcastToLive,
  uploadBroadcastThumbnail,
  addBroadcastToPlaylist,
  completeBroadcast,
} from '../youtubeLiveService.js';

export const campaignsRouter = Router();
campaignsRouter.use(requireAuth);

// ── GET /campaigns ────────────────────────────────────────────────────────────
campaignsRouter.get('/', asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
  res.json({ campaigns: rows.map(serializeCampaign) });
}));

// ── POST /campaigns ───────────────────────────────────────────────────────────
campaignsRouter.post('/', asyncHandler(async (req, res) => {
  const name   = String(req.body.name   || 'Kampanye Baru').trim();
  const mode   = String(req.body.mode   || 'YouTube API').trim();
  const status = String(req.body.status || 'Draft').trim();
  const config = req.body.config || {};
  const result = db.prepare('INSERT INTO campaigns (name, mode, status, config_json) VALUES (?, ?, ?, ?)')
    .run(name, mode, status, writeJson(config));
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ campaign: serializeCampaign(row) });
}));

// ── GET /campaigns/:id ────────────────────────────────────────────────────────
campaignsRouter.get('/:id', asyncHandler(async (req, res) => {
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });
  res.json({ campaign: serializeCampaign(row) });
}));

// ── PATCH /campaigns/:id ──────────────────────────────────────────────────────
campaignsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const id      = Number(req.params.id);
  const current = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });
  const name   = String(req.body.name   || current.name).trim();
  const mode   = String(req.body.mode   || current.mode).trim();
  const status = String(req.body.status || current.status).trim();
  const config = req.body.config || JSON.parse(current.config_json || '{}');
  db.prepare('UPDATE campaigns SET name = ?, mode = ?, status = ?, config_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(name, mode, status, writeJson(config), id);
  res.json({ campaign: serializeCampaign(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id)) });
}));

// ── DELETE /campaigns/:id ─────────────────────────────────────────────────────
campaignsRouter.delete('/:id', asyncHandler(async (req, res) => {
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// POST /campaigns/:id/start
// Baca config campaign → pilih video+thumbnail acak → jalankan FFmpeg
// ═══════════════════════════════════════════════════════════════════════════════
campaignsRouter.post('/:id/start', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  if (!campaign) return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });

  let cfg = {};
  try { cfg = JSON.parse(campaign.config_json || '{}'); } catch { cfg = {}; }

  // Resolve RTMP URL — dari request body dulu, fallback ke config campaign
  const rtmpUrl   = String(req.body.rtmpUrl   || cfg.rtmpUrl   || '').trim();
  const streamKey = String(req.body.streamKey || cfg.streamKey || '').trim();
  if (!rtmpUrl) {
    return res.status(400).json({ error: 'RTMP URL tidak ditemukan. Isi RTMP URL di form kampanye dan simpan draft dulu.' });
  }

  // ── Pilih VIDEO acak dari videoAssetIds ─────────────────────────────────
  const videoIds = Array.isArray(cfg.videoAssetIds) ? cfg.videoAssetIds.map(Number).filter(Boolean) : [];
  let chosenVideo = null;

  if (videoIds.length > 0) {
    const pl = videoIds.map(() => '?').join(', ');
    const candidates = db.prepare(`SELECT * FROM assets WHERE id IN (${pl}) AND type = 'Video'`).all(...videoIds);
    if (candidates.length > 0) chosenVideo = candidates[Math.floor(Math.random() * candidates.length)];
  }
  if (!chosenVideo) {
    chosenVideo = db.prepare("SELECT * FROM assets WHERE type = 'Video' ORDER BY RANDOM() LIMIT 1").get();
  }
  if (!chosenVideo)  return res.status(400).json({ error: 'Tidak ada video di Pustaka Aset. Upload video sebelum live.' });
  if (!chosenVideo.path) return res.status(400).json({ error: `Path file tidak ditemukan untuk: ${chosenVideo.name}` });

  // ── Pilih THUMBNAIL acak dari thumbnailAssetIds ──────────────────────────
  const thumbIds = Array.isArray(cfg.thumbnailAssetIds) ? cfg.thumbnailAssetIds.map(Number).filter(Boolean) : [];
  let chosenThumbnail = null;

  if (thumbIds.length > 0) {
    const pl = thumbIds.map(() => '?').join(', ');
    const thumbs = db.prepare(`SELECT * FROM assets WHERE id IN (${pl})`).all(...thumbIds);
    if (thumbs.length > 0) chosenThumbnail = thumbs[Math.floor(Math.random() * thumbs.length)];
  }
  if (!chosenThumbnail && cfg.thumbnailMode !== 'Tanpa thumbnail') {
    chosenThumbnail = db.prepare("SELECT * FROM assets WHERE type IN ('Images','Thumbnail') ORDER BY RANDOM() LIMIT 1").get() || null;
  }

  // ── Pilih JUDUL acak dari liveTitles ─────────────────────────────────────
  const titles = String(cfg.liveTitles || '').split('\n').map((t) => t.trim()).filter(Boolean);
  const chosenTitle = titles.length > 0 ? titles[Math.floor(Math.random() * titles.length)] : campaign.name;

  // ── Update campaign status → Aktif ───────────────────────────────────────
  db.prepare('UPDATE campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('Aktif', id);

  // ── Jalankan FFmpeg ────────────────────────────────────────────────────── 
  const encoder  = cfg.encoder  || {};
  const platform = cfg.platform || 'Manual RTMP';

  const started = startFfmpegStream({ campaignId: id, platform, inputPath: chosenVideo.path, rtmpUrl, streamKey, encoder });

  // ── Simpan pilihan aset ke row stream ────────────────────────────────────
  try {
    db.prepare('UPDATE streams SET chosen_video_id = ?, chosen_thumbnail_id = ?, chosen_title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(chosenVideo.id ?? null, chosenThumbnail?.id ?? null, chosenTitle, started.streamId);
  } catch { /* kolom mungkin belum ada — migrasi berjalan di initDatabase */ }

  logEvent('INFO', 'Kampanye', `Campaign #${id} "${campaign.name}" dimulai. Video: ${chosenVideo.name}, Thumbnail: ${chosenThumbnail?.name || 'none'}, Judul: ${chosenTitle}`);

  res.status(201).json({
    ok: true,
    streamId: started.streamId,
    pid: started.pid,
    chosenVideo:     { id: chosenVideo.id, name: chosenVideo.name, path: chosenVideo.path },
    chosenThumbnail: chosenThumbnail ? { id: chosenThumbnail.id, name: chosenThumbnail.name } : null,
    chosenTitle,
  });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// POST /campaigns/:id/start-youtube-live
// Start campaign dengan YouTube API - create broadcast, bind stream, start FFmpeg
// ═══════════════════════════════════════════════════════════════════════════════
campaignsRouter.post('/:id/start-youtube-live', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  if (!campaign) return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });

  let cfg = {};
  try { cfg = JSON.parse(campaign.config_json || '{}'); } catch { cfg = {}; }

  // Validate YouTube channel
  const youtubeChannelId = cfg.youtubeChannelId || req.body.youtubeChannelId;
  if (!youtubeChannelId) {
    return res.status(400).json({ error: 'YouTube channel belum dipilih. Pilih channel di form kampanye.' });
  }

  // ── Pilih VIDEO acak dari videoAssetIds ─────────────────────────────────
  const videoIds = Array.isArray(cfg.videoAssetIds) ? cfg.videoAssetIds.map(Number).filter(Boolean) : [];
  let chosenVideo = null;

  if (videoIds.length > 0) {
    const pl = videoIds.map(() => '?').join(', ');
    const candidates = db.prepare(`SELECT * FROM assets WHERE id IN (${pl}) AND type = 'Video'`).all(...videoIds);
    if (candidates.length > 0) chosenVideo = candidates[Math.floor(Math.random() * candidates.length)];
  }
  if (!chosenVideo) {
    chosenVideo = db.prepare("SELECT * FROM assets WHERE type = 'Video' ORDER BY RANDOM() LIMIT 1").get();
  }
  if (!chosenVideo) return res.status(400).json({ error: 'Tidak ada video di Pustaka Aset. Upload video sebelum live.' });
  if (!chosenVideo.path) return res.status(400).json({ error: `Path file tidak ditemukan untuk: ${chosenVideo.name}` });

  // ── Pilih THUMBNAIL acak dari thumbnailAssetIds ──────────────────────────
  const thumbIds = Array.isArray(cfg.thumbnailAssetIds) ? cfg.thumbnailAssetIds.map(Number).filter(Boolean) : [];
  let chosenThumbnail = null;

  if (thumbIds.length > 0) {
    const pl = thumbIds.map(() => '?').join(', ');
    const thumbs = db.prepare(`SELECT * FROM assets WHERE id IN (${pl})`).all(...thumbIds);
    if (thumbs.length > 0) chosenThumbnail = thumbs[Math.floor(Math.random() * thumbs.length)];
  }
  if (!chosenThumbnail && cfg.thumbnailMode !== 'Tanpa thumbnail') {
    chosenThumbnail = db.prepare("SELECT * FROM assets WHERE type IN ('Images','Thumbnail') ORDER BY RANDOM() LIMIT 1").get() || null;
  }

  // ── Pilih JUDUL acak dari liveTitles ─────────────────────────────────────
  const titles = String(cfg.youtubeLiveTitles || cfg.liveTitles || '').split('\n').map((t) => t.trim()).filter(Boolean);
  const chosenTitle = titles.length > 0 ? titles[Math.floor(Math.random() * titles.length)] : campaign.name;

  // ── Create YouTube broadcast & stream ────────────────────────────────────
  logEvent('INFO', 'YouTube Live', `Creating YouTube broadcast for campaign #${id}: ${chosenTitle}`);

  const broadcastData = await createYoutubeLiveBroadcast({
    channelId: youtubeChannelId,
    title: chosenTitle,
    description: cfg.youtubeDescription || '',
    categoryId: cfg.youtubeCategoryId || '10',
    privacyStatus: (cfg.youtubePrivacy || 'Publik').toLowerCase() === 'publik' ? 'public' : 
                   (cfg.youtubePrivacy || 'Publik').toLowerCase() === 'tidak publik' ? 'unlisted' : 'private',
    scheduledStartTime: req.body.scheduledStartTime || null,
    enableAutoStart: true,
    enableAutoStop: cfg.youtubeAutoStopEnabled !== false,
    recordFromStart: true,
    frameRate: cfg.encoder?.frameRate || '30fps',
    resolution: cfg.encoder?.resolution || '1080p',
  });

  const { broadcast, stream, rtmpUrl, streamKey, broadcastId, streamId, watchUrl } = broadcastData;

  logEvent('INFO', 'YouTube Live', `Broadcast created: ${broadcastId}, Watch: ${watchUrl}`);

  // ── Upload thumbnail (if available) ──────────────────────────────────────
  if (chosenThumbnail?.path) {
    try {
      await uploadBroadcastThumbnail(youtubeChannelId, broadcastId, chosenThumbnail.path);
    } catch (error) {
      logEvent('WARN', 'YouTube Live', `Failed to upload thumbnail: ${error.message}`);
    }
  }

  // ── Add to playlist (if configured) ──────────────────────────────────────
  if (cfg.youtubePlaylistId) {
    try {
      await addBroadcastToPlaylist(youtubeChannelId, broadcastId, cfg.youtubePlaylistId);
    } catch (error) {
      logEvent('WARN', 'YouTube Live', `Failed to add to playlist: ${error.message}`);
    }
  }

  // ── Update campaign status → Aktif ───────────────────────────────────────
  db.prepare('UPDATE campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('Aktif', id);

  // ── Start FFmpeg stream ──────────────────────────────────────────────────
  const encoder = cfg.encoder || {};
  const started = startFfmpegStream({
    campaignId: id,
    platform: 'YouTube API',
    inputPath: chosenVideo.path,
    rtmpUrl,
    streamKey,
    encoder,
  });

  // ── Save stream info with YouTube broadcast data ─────────────────────────
  db.prepare(`
    UPDATE streams SET 
      chosen_video_id = ?, 
      chosen_thumbnail_id = ?, 
      chosen_title = ?,
      youtube_broadcast_id = ?,
      youtube_stream_id = ?,
      youtube_watch_url = ?,
      updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(
    chosenVideo.id ?? null,
    chosenThumbnail?.id ?? null,
    chosenTitle,
    broadcastId,
    streamId,
    watchUrl,
    started.streamId
  );

  // ── Transition broadcast to live (after a delay) ─────────────────────────
  // Wait for FFmpeg to start streaming, then transition to live
  setTimeout(async () => {
    try {
      await transitionBroadcastToLive(youtubeChannelId, broadcastId);
      logEvent('INFO', 'YouTube Live', `Broadcast ${broadcastId} is now LIVE`);
    } catch (error) {
      logEvent('ERROR', 'YouTube Live', `Failed to transition to live: ${error.message}`);
    }
  }, 30000); // Wait 30 seconds for FFmpeg to connect

  logEvent('INFO', 'Kampanye', `Campaign #${id} "${campaign.name}" started with YouTube Live. Video: ${chosenVideo.name}, Broadcast: ${broadcastId}`);

  res.status(201).json({
    ok: true,
    streamId: started.streamId,
    pid: started.pid,
    chosenVideo: { id: chosenVideo.id, name: chosenVideo.name, path: chosenVideo.path },
    chosenThumbnail: chosenThumbnail ? { id: chosenThumbnail.id, name: chosenThumbnail.name } : null,
    chosenTitle,
    youtube: {
      broadcastId,
      streamId,
      watchUrl,
      rtmpUrl: rtmpUrl.substring(0, 30) + '...', // Hide full RTMP URL
    },
  });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// POST /campaigns/:id/stop
// Hentikan stream aktif milik campaign ini
// ═══════════════════════════════════════════════════════════════════════════════
campaignsRouter.post('/:id/stop', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  if (!campaign) return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });

  // Cari stream Online milik campaign ini
  const activeStream = db.prepare(
    "SELECT * FROM streams WHERE campaign_id = ? AND status IN ('Online','Starting') ORDER BY created_at DESC LIMIT 1"
  ).get(id);

  if (!activeStream) {
    db.prepare('UPDATE campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('Draft', id);
    return res.json({ ok: true, stopped: false, message: 'Tidak ada stream aktif untuk kampanye ini.' });
  }

  // Stop FFmpeg stream
  const result = stopFfmpegStream(activeStream.id);

  // Complete YouTube broadcast if exists
  if (activeStream.youtube_broadcast_id) {
    try {
      let cfg = {};
      try { cfg = JSON.parse(campaign.config_json || '{}'); } catch { cfg = {}; }
      const youtubeChannelId = cfg.youtubeChannelId;
      
      if (youtubeChannelId) {
        await completeBroadcast(youtubeChannelId, activeStream.youtube_broadcast_id);
        logEvent('INFO', 'YouTube Live', `Broadcast ${activeStream.youtube_broadcast_id} completed`);
      }
    } catch (error) {
      logEvent('ERROR', 'YouTube Live', `Failed to complete broadcast: ${error.message}`);
    }
  }

  // Update campaign status → Draft
  db.prepare('UPDATE campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('Draft', id);

  logEvent('INFO', 'Kampanye', `Campaign #${id} "${campaign.name}" dihentikan. Stream #${activeStream.id}`);

  res.json({ ok: true, stopped: result.stopped, streamId: activeStream.id });
}));
