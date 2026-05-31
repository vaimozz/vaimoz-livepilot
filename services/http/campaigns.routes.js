import { Router } from 'express';
import { db, writeJson, logEvent } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { serializeCampaign, serializeStream } from '../../utils/serializers.js';
import { startFfmpegStream, stopFfmpegStream } from '../ffmpegRunner.js';
import { notifyBroadcastLive } from '../telegramService.js';
import {
  createYoutubeLiveBroadcast,
  transitionBroadcastToLive,
  uploadBroadcastThumbnail,
  addBroadcastToPlaylist,
  completeBroadcast,
} from '../youtubeLiveService.js';
import {
  getLiveChatId,
  startChatbot,
  stopChatbot,
  getChatbotStatus,
  sendChatMessage,
} from '../youtubeChatService.js';
import {
  startStreamMonitoring,
  stopStreamMonitoring,
  getLiveStreamStats,
} from '../youtubeAnalyticsService.js';
import { stopActiveCampaignStream } from '../streamManager.js';

export const campaignsRouter = Router();
campaignsRouter.use(requireAuth);

// ── GET /campaigns ────────────────────────────────────────────────────────────
campaignsRouter.get('/', asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
  // Enrich each campaign with the connected YouTube channel title
  const campaigns = rows.map(row => {
    const c = serializeCampaign(row);
    if (c.config?.youtubeChannelId) {
      // youtubeChannelId in config may be the SQLite row id (number) or YT channel id (string)
      const chRow = db.prepare(
        `SELECT title FROM youtube_channels WHERE id = ? OR youtube_channel_id = ? LIMIT 1`
      ).get(Number(c.config.youtubeChannelId) || 0, String(c.config.youtubeChannelId));
      if (chRow) c.config.youtubeChannelTitle = chRow.title;
    }
    return c;
  });
  res.json({ campaigns });
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
  const youtubeChannelId = cfg.youtubeChannelId || cfg.channelId || req.body.youtubeChannelId;
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
  const thumbnailMode = cfg.thumbnailMode || cfg.youtubeThumbnailMode || 'Rotasi otomatis';
  if (!chosenThumbnail && thumbnailMode !== 'Tanpa thumbnail') {
    chosenThumbnail = db.prepare("SELECT * FROM assets WHERE type IN ('Images','Thumbnail') ORDER BY RANDOM() LIMIT 1").get() || null;
  }

  // ── Pilih JUDUL acak dari liveTitles ─────────────────────────────────────
  const titles = String(cfg.youtubeLiveTitles || cfg.liveTitles || '').split('\n').map((t) => t.trim()).filter(Boolean);
  const chosenTitle = titles.length > 0 ? titles[Math.floor(Math.random() * titles.length)] : campaign.name;

  // ── Create YouTube broadcast & stream ────────────────────────────────────
  logEvent('INFO', 'YouTube Live', `Creating YouTube broadcast for campaign #${id}: ${chosenTitle}`);

  const privacySetting = cfg.youtubePrivacy || cfg.privacy || 'Publik';
  const autoStopSetting = cfg.youtubeAutoStopEnabled ?? cfg.autoStopEnabled ?? true;

  const broadcastData = await createYoutubeLiveBroadcast({
    channelId: youtubeChannelId,
    title: chosenTitle,
    description: cfg.youtubeDescription || cfg.description || '',
    categoryId: cfg.categoryId || cfg.youtubeCategoryId || '10',
    tags: cfg.youtubeTags || cfg.tags || '',
    privacyStatus: privacySetting.toLowerCase() === 'publik' ? 'public' : 
                   privacySetting.toLowerCase() === 'tidak publik' ? 'unlisted' : 'private',
    scheduledStartTime: req.body.scheduledStartTime || null,
    enableAutoStart: true,
    enableAutoStop: autoStopSetting !== false,
    recordFromStart: true,
    frameRate: (() => {
      let fps = String(cfg.encoder?.frameRate || cfg.encoder?.fps || 'variable').toLowerCase();
      if (fps.includes('ikut') || fps.includes('sumber')) return 'variable';
      if (fps.includes('60') || fps.includes('50')) return '60fps';
      if (fps.includes('30') || fps.includes('25') || fps.includes('24')) return '30fps';
      return 'variable';
    })(),
    resolution: (() => {
      let res = String(cfg.encoder?.resolution || 'variable').toLowerCase();
      if (res.includes('ikut') || res.includes('sumber')) return 'variable';
      if (res.includes('2160') || res.includes('4k')) return '2160p';
      if (res.includes('1440') || res.includes('2k')) return '1440p';
      if (res.includes('1080')) return '1080p';
      if (res.includes('720')) return '720p';
      if (res.includes('480')) return '480p';
      if (res.includes('360')) return '360p';
      if (res.includes('240')) return '240p';
      return 'variable';
    })(),
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
  const playlistId = cfg.youtubePlaylistId || cfg.playlist?.id;
  if (playlistId) {
    try {
      await addBroadcastToPlaylist(youtubeChannelId, broadcastId, playlistId);
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

  // ── Get live chat ID and save ────────────────────────────────────────────
  let liveChatId = null;
  try {
    liveChatId = await getLiveChatId(youtubeChannelId, broadcastId);
    if (liveChatId) {
      db.prepare(`
        UPDATE streams 
        SET youtube_live_chat_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(liveChatId, started.streamId);
      
      logEvent('INFO', 'YouTube Live', `Live chat ID saved: ${liveChatId}`);
    }
  } catch (error) {
    logEvent('WARN', 'YouTube Live', `Failed to get live chat ID: ${error.message}`);
  }

  // ── Start analytics monitoring ───────────────────────────────────────────
  try {
    startStreamMonitoring(started.streamId, {
      channelId: youtubeChannelId,
      broadcastId,
      youtubeStreamId: streamId,
      intervalSeconds: 30, // Update every 30 seconds
    });
    logEvent('INFO', 'YouTube Analytics', `Started monitoring stream #${started.streamId}`);
  } catch (error) {
    logEvent('WARN', 'YouTube Analytics', `Failed to start monitoring: ${error.message}`);
  }

  // ── Start chatbot if enabled ─────────────────────────────────────────────
  if (cfg.chatbot?.enabled && liveChatId) {
    try {
      const chatbotMessages = cfg.chatbot.messages || [];
      const chatbotInterval = parseInt(cfg.chatbot.interval || '10');
      const chatbotMode = cfg.chatbot.mode || 'sequential';

      startChatbot(started.streamId, {
        channelId: youtubeChannelId,
        liveChatId,
        messages: chatbotMessages,
        intervalMinutes: chatbotInterval,
        mode: chatbotMode === 'Pesan terjadwal (Jam tertentu)' ? chatbotMode : (chatbotMode === 'Pesan berkala' ? 'sequential' : 'random'),
      });

      logEvent('INFO', 'YouTube Chatbot', `Started chatbot for stream #${started.streamId}`);
    } catch (error) {
      logEvent('WARN', 'YouTube Chatbot', `Failed to start chatbot: ${error.message}`);
    }
  }

  // ── Transition broadcast to live (after a delay) ─────────────────────────
  // Wait for FFmpeg to start streaming, then transition to live
  setTimeout(async () => {
    try {
      await transitionBroadcastToLive(youtubeChannelId, broadcastId);
      logEvent('INFO', 'YouTube Live', `Broadcast ${broadcastId} is now LIVE`);
      
      const watchUrl = `https://youtube.com/watch?v=${broadcastId}`;
      notifyBroadcastLive({ campaignName: campaign.name, broadcastId, watchUrl, title: chosenTitle })
        .catch(e => logEvent('ERROR', 'Telegram', e.message));
        
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
  const result = await stopActiveCampaignStream(req.params.id);
  if (!result.ok) {
    return res.status(404).json({ error: result.message });
  }
  res.json(result);
}));

// ═══════════════════════════════════════════════════════════════════════════════
// POST /campaigns/:id/chatbot/start
// Start chatbot manually for active stream
// ═══════════════════════════════════════════════════════════════════════════════
campaignsRouter.post('/:id/chatbot/start', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  if (!campaign) return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });

  // Find active stream
  const activeStream = db.prepare(
    "SELECT * FROM streams WHERE campaign_id = ? AND status IN ('Online','Starting') ORDER BY created_at DESC LIMIT 1"
  ).get(id);

  if (!activeStream) {
    return res.status(404).json({ error: 'Tidak ada stream aktif untuk kampanye ini.' });
  }

  if (!activeStream.youtube_live_chat_id) {
    return res.status(400).json({ error: 'Stream ini tidak punya live chat ID. Hanya YouTube live yang support chatbot.' });
  }

  // Get config
  let cfg = {};
  try { cfg = JSON.parse(campaign.config_json || '{}'); } catch { cfg = {}; }

  const youtubeChannelId = cfg.youtubeChannelId;
  if (!youtubeChannelId) {
    return res.status(400).json({ error: 'YouTube channel tidak ditemukan di config kampanye.' });
  }

  // Start chatbot
  const chatbotMessages = req.body.messages || cfg.chatbot?.messages || [];
  const chatbotInterval = parseInt(req.body.intervalMinutes || cfg.chatbot?.interval || '10');
  const chatbotMode = req.body.mode || cfg.chatbot?.mode || 'sequential';

  if (chatbotMessages.length === 0) {
    return res.status(400).json({ error: 'Tidak ada pesan chatbot. Tambahkan pesan di config kampanye.' });
  }

  const started = startChatbot(activeStream.id, {
    channelId: youtubeChannelId,
    liveChatId: activeStream.youtube_live_chat_id,
    messages: chatbotMessages,
    intervalMinutes: chatbotInterval,
    mode: chatbotMode === 'Pesan terjadwal (Jam tertentu)' ? chatbotMode : (chatbotMode === 'Pesan berkala' ? 'sequential' : 'random'),
  });

  if (!started) {
    return res.status(500).json({ error: 'Gagal memulai chatbot.' });
  }

  res.json({
    ok: true,
    streamId: activeStream.id,
    chatbot: {
      status: 'active',
      intervalMinutes: chatbotInterval,
      messageCount: chatbotMessages.length,
      mode: chatbotMode,
    },
  });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// POST /campaigns/:id/chatbot/stop
// Stop chatbot for active stream
// ═══════════════════════════════════════════════════════════════════════════════
campaignsRouter.post('/:id/chatbot/stop', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  if (!campaign) return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });

  // Find active stream
  const activeStream = db.prepare(
    "SELECT * FROM streams WHERE campaign_id = ? AND status IN ('Online','Starting') ORDER BY created_at DESC LIMIT 1"
  ).get(id);

  if (!activeStream) {
    return res.status(404).json({ error: 'Tidak ada stream aktif untuk kampanye ini.' });
  }

  const stopped = stopChatbot(activeStream.id);

  res.json({
    ok: true,
    streamId: activeStream.id,
    stopped,
  });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// GET /campaigns/:id/chatbot/status
// Get chatbot status for active stream
// ═══════════════════════════════════════════════════════════════════════════════
campaignsRouter.get('/:id/chatbot/status', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  if (!campaign) return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });

  // Find active stream
  const activeStream = db.prepare(
    "SELECT * FROM streams WHERE campaign_id = ? AND status IN ('Online','Starting') ORDER BY created_at DESC LIMIT 1"
  ).get(id);

  if (!activeStream) {
    return res.json({
      ok: true,
      active: false,
      message: 'Tidak ada stream aktif.',
    });
  }

  const status = getChatbotStatus(activeStream.id);
  const streamData = serializeStream(activeStream);

  res.json({
    ok: true,
    streamId: activeStream.id,
    chatbot: {
      ...status,
      messageCount: streamData.chatbotMessageCount,
      lastMessage: streamData.chatbotLastMessage,
      startedAt: streamData.chatbotStartedAt,
      stoppedAt: streamData.chatbotStoppedAt,
    },
  });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// POST /campaigns/:id/chatbot/send
// Send single message to live chat
// ═══════════════════════════════════════════════════════════════════════════════
campaignsRouter.post('/:id/chatbot/send', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  if (!campaign) return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });

  const message = String(req.body.message || '').trim();
  if (!message) {
    return res.status(400).json({ error: 'Pesan wajib diisi.' });
  }

  // Find active stream
  const activeStream = db.prepare(
    "SELECT * FROM streams WHERE campaign_id = ? AND status IN ('Online','Starting') ORDER BY created_at DESC LIMIT 1"
  ).get(id);

  if (!activeStream) {
    return res.status(404).json({ error: 'Tidak ada stream aktif untuk kampanye ini.' });
  }

  if (!activeStream.youtube_live_chat_id) {
    return res.status(400).json({ error: 'Stream ini tidak punya live chat ID.' });
  }

  // Get config
  let cfg = {};
  try { cfg = JSON.parse(campaign.config_json || '{}'); } catch { cfg = {}; }

  const youtubeChannelId = cfg.youtubeChannelId;
  if (!youtubeChannelId) {
    return res.status(400).json({ error: 'YouTube channel tidak ditemukan.' });
  }

  // Send message
  await sendChatMessage(youtubeChannelId, activeStream.youtube_live_chat_id, message);

  res.json({
    ok: true,
    streamId: activeStream.id,
    message,
    sentAt: new Date().toISOString(),
  });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// GET /campaigns/:id/analytics
// Get live stream analytics (viewer count, etc.)
// ═══════════════════════════════════════════════════════════════════════════════
campaignsRouter.get('/:id/analytics', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  if (!campaign) return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });

  // Find active stream
  const activeStream = db.prepare(
    "SELECT * FROM streams WHERE campaign_id = ? AND status IN ('Online','Starting') ORDER BY created_at DESC LIMIT 1"
  ).get(id);

  if (!activeStream) {
    return res.json({
      ok: true,
      active: false,
      message: 'Tidak ada stream aktif.',
    });
  }

  if (!activeStream.youtube_broadcast_id) {
    return res.json({
      ok: true,
      active: true,
      streamId: activeStream.id,
      analytics: null,
      message: 'Stream ini bukan YouTube live, tidak ada analytics.',
    });
  }

  // Get config
  let cfg = {};
  try { cfg = JSON.parse(campaign.config_json || '{}'); } catch { cfg = {}; }

  const youtubeChannelId = cfg.youtubeChannelId;
  if (!youtubeChannelId) {
    return res.status(400).json({ error: 'YouTube channel tidak ditemukan.' });
  }

  // Get live stats
  const stats = await getLiveStreamStats(youtubeChannelId, activeStream.youtube_broadcast_id);

  const streamData = serializeStream(activeStream);

  res.json({
    ok: true,
    streamId: activeStream.id,
    analytics: {
      concurrentViewers: streamData.youtubeConcurrentViewers,
      totalViews: streamData.youtubeTotalViews,
      likes: streamData.youtubeLikes,
      comments: streamData.youtubeComments,
      statsUpdatedAt: streamData.youtubeStatsUpdatedAt,
      live: stats,
    },
  });
}));
