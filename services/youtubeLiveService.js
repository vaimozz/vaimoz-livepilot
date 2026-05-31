/**
 * YouTube Live Service
 * 
 * Service untuk mengelola lifecycle YouTube live broadcast:
 * - Create broadcast & stream
 * - Bind broadcast ke stream
 * - Transition broadcast status (testing → live)
 * - Upload thumbnail
 * - Add to playlist
 * - Stop broadcast
 */

import { google } from 'googleapis';
import fs from 'node:fs';
import { db, logEvent } from '../db/database.js';
import { getOAuthClient, youtubeWithTokens } from './youtubeService.js';

/**
 * Get tokens from youtube_channels table
 */
function getChannelTokens(channelId) {
  const row = db.prepare('SELECT * FROM youtube_channels WHERE id = ?').get(Number(channelId));
  if (!row) throw new Error('YouTube channel tidak ditemukan.');
  if (!row.access_token && !row.refresh_token) {
    throw new Error('Channel belum punya OAuth token. Sambungkan channel dulu via Settings.');
  }
  return {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: row.expires_at,
  };
}

/**
 * Create YouTube live broadcast and stream
 * Returns: { broadcast, stream, rtmpUrl, streamKey }
 */
export async function createYoutubeLiveBroadcast(options) {
  const {
    channelId,
    title = 'Vaimoz LivePilot Stream',
    description = '',
    categoryId = '10',
    privacyStatus = 'public',
    scheduledStartTime = null,
    enableAutoStart = true,
    enableAutoStop = true,
    recordFromStart = true,
    frameRate = '30fps',
    resolution = '1080p',
    tags = [],
  } = options;

  const tokens = getChannelTokens(channelId);
  const youtube = youtubeWithTokens(tokens);

  // Calculate scheduled start time (default: 10 minutes from now)
  const startTime = scheduledStartTime || new Date(Date.now() + 10 * 60 * 1000).toISOString();

  logEvent('INFO', 'YouTube Live', `Creating broadcast: ${title}`);

  // 1. Create broadcast
  const broadcastResponse = await youtube.liveBroadcasts.insert({
    part: ['snippet', 'status', 'contentDetails'],
    requestBody: {
      snippet: {
        title,
        description,
        scheduledStartTime: startTime,
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false,
      },
      contentDetails: {
        enableAutoStart,
        enableAutoStop,
        recordFromStart,
        enableDvr: true,
        enableContentEncryption: false,
        enableEmbed: true,
        latencyPreference: 'normal',
      },
    },
  });

  const broadcast = broadcastResponse.data;
  logEvent('INFO', 'YouTube Live', `Broadcast created: ${broadcast.id}`);

  // Update video metadata to set categoryId and tags
  try {
    const videoResponse = await youtube.videos.list({
      part: ['snippet'],
      id: [broadcast.id]
    });
    
    if (videoResponse.data.items && videoResponse.data.items.length > 0) {
      const videoSnippet = videoResponse.data.items[0].snippet;
      await youtube.videos.update({
        part: ['snippet'],
        requestBody: {
          id: broadcast.id,
          snippet: {
            ...videoSnippet,
            categoryId: categoryId,
            tags: Array.isArray(tags) ? tags : String(tags || '').split(',').map(t => t.trim()).filter(Boolean),
          }
        }
      });
      logEvent('INFO', 'YouTube Live', `Updated categoryId and tags for video ${broadcast.id}`);
    }
  } catch (error) {
    logEvent('WARN', 'YouTube Live', `Failed to update video category and tags: ${error.message}`);
  }

  // 2. Create stream
  const streamResponse = await youtube.liveStreams.insert({
    part: ['snippet', 'cdn', 'status'],
    requestBody: {
      snippet: {
        title: `${title} - Stream`,
      },
      cdn: {
        frameRate,
        ingestionType: 'rtmp',
        resolution,
      },
    },
  });

  const stream = streamResponse.data;
  logEvent('INFO', 'YouTube Live', `Stream created: ${stream.id}`);

  // 3. Bind broadcast to stream
  await youtube.liveBroadcasts.bind({
    part: ['id', 'snippet', 'contentDetails', 'status'],
    id: broadcast.id,
    streamId: stream.id,
  });

  logEvent('INFO', 'YouTube Live', `Broadcast ${broadcast.id} bound to stream ${stream.id}`);

  // Extract RTMP URL and stream key
  const rtmpUrl = stream.cdn?.ingestionInfo?.ingestionAddress || '';
  const streamKey = stream.cdn?.ingestionInfo?.streamName || '';

  return {
    broadcast,
    stream,
    rtmpUrl,
    streamKey,
    broadcastId: broadcast.id,
    streamId: stream.id,
    watchUrl: `https://www.youtube.com/watch?v=${broadcast.id}`,
  };
}

/**
 * Transition broadcast to 'live' status
 * Call this after FFmpeg starts streaming
 */
export async function transitionBroadcastToLive(channelId, broadcastId) {
  const tokens = getChannelTokens(channelId);
  const youtube = youtubeWithTokens(tokens);

  logEvent('INFO', 'YouTube Live', `Transitioning broadcast ${broadcastId} to live`);

  try {
    // First transition to 'testing'
    await youtube.liveBroadcasts.transition({
      part: ['id', 'status'],
      broadcastStatus: 'testing',
      id: broadcastId,
    });

    logEvent('INFO', 'YouTube Live', `Broadcast ${broadcastId} → testing`);

    // Wait a bit for YouTube to process
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Then transition to 'live'
    const response = await youtube.liveBroadcasts.transition({
      part: ['id', 'status', 'snippet'],
      broadcastStatus: 'live',
      id: broadcastId,
    });

    logEvent('INFO', 'YouTube Live', `Broadcast ${broadcastId} → live`);

    return response.data;
  } catch (error) {
    logEvent('ERROR', 'YouTube Live', `Failed to transition broadcast: ${error.message}`);
    throw error;
  }
}

/**
 * Upload custom thumbnail to broadcast
 */
export async function uploadBroadcastThumbnail(channelId, broadcastId, thumbnailPath) {
  if (!thumbnailPath || !fs.existsSync(thumbnailPath)) {
    logEvent('WARN', 'YouTube Live', `Thumbnail not found: ${thumbnailPath}`);
    return null;
  }

  const tokens = getChannelTokens(channelId);
  const youtube = youtubeWithTokens(tokens);

  logEvent('INFO', 'YouTube Live', `Uploading thumbnail for broadcast ${broadcastId}`);

  try {
    const response = await youtube.thumbnails.set({
      videoId: broadcastId,
      media: {
        body: fs.createReadStream(thumbnailPath),
      },
    });

    logEvent('INFO', 'YouTube Live', `Thumbnail uploaded for broadcast ${broadcastId}`);
    return response.data;
  } catch (error) {
    logEvent('ERROR', 'YouTube Live', `Failed to upload thumbnail: ${error.message}`);
    return null;
  }
}

/**
 * Add broadcast to playlist
 */
export async function addBroadcastToPlaylist(channelId, broadcastId, playlistId) {
  if (!playlistId) return null;

  const tokens = getChannelTokens(channelId);
  const youtube = youtubeWithTokens(tokens);

  logEvent('INFO', 'YouTube Live', `Adding broadcast ${broadcastId} to playlist ${playlistId}`);

  try {
    const response = await youtube.playlistItems.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId: broadcastId,
          },
        },
      },
    });

    logEvent('INFO', 'YouTube Live', `Broadcast added to playlist ${playlistId}`);
    return response.data;
  } catch (error) {
    logEvent('ERROR', 'YouTube Live', `Failed to add to playlist: ${error.message}`);
    return null;
  }
}

/**
 * Stop/Complete broadcast
 */
export async function completeBroadcast(channelId, broadcastId) {
  const tokens = getChannelTokens(channelId);
  const youtube = youtubeWithTokens(tokens);

  logEvent('INFO', 'YouTube Live', `Completing broadcast ${broadcastId}`);

  try {
    const response = await youtube.liveBroadcasts.transition({
      part: ['id', 'status'],
      broadcastStatus: 'complete',
      id: broadcastId,
    });

    logEvent('INFO', 'YouTube Live', `Broadcast ${broadcastId} completed`);
    return response.data;
  } catch (error) {
    logEvent('ERROR', 'YouTube Live', `Failed to complete broadcast: ${error.message}`);
    throw error;
  }
}

/**
 * Get broadcast status
 */
export async function getBroadcastStatus(channelId, broadcastId) {
  const tokens = getChannelTokens(channelId);
  const youtube = youtubeWithTokens(tokens);

  try {
    const response = await youtube.liveBroadcasts.list({
      part: ['id', 'snippet', 'status', 'contentDetails'],
      id: [broadcastId],
    });

    return response.data.items?.[0] || null;
  } catch (error) {
    logEvent('ERROR', 'YouTube Live', `Failed to get broadcast status: ${error.message}`);
    return null;
  }
}

/**
 * Update broadcast metadata (title, description, tags)
 */
export async function updateBroadcastMetadata(channelId, broadcastId, updates) {
  const tokens = getChannelTokens(channelId);
  const youtube = youtubeWithTokens(tokens);

  logEvent('INFO', 'YouTube Live', `Updating broadcast ${broadcastId} metadata`);

  try {
    // Get current broadcast data
    const current = await getBroadcastStatus(channelId, broadcastId);
    if (!current) throw new Error('Broadcast not found');

    const response = await youtube.liveBroadcasts.update({
      part: ['snippet', 'status'],
      requestBody: {
        id: broadcastId,
        snippet: {
          ...current.snippet,
          title: updates.title || current.snippet.title,
          description: updates.description !== undefined ? updates.description : current.snippet.description,
          categoryId: updates.categoryId || current.snippet.categoryId,
          tags: updates.tags || current.snippet.tags,
        },
        status: current.status,
      },
    });

    logEvent('INFO', 'YouTube Live', `Broadcast ${broadcastId} metadata updated`);
    return response.data;
  } catch (error) {
    logEvent('ERROR', 'YouTube Live', `Failed to update broadcast: ${error.message}`);
    throw error;
  }
}

/**
 * Start a YouTube Live campaign programmatically (used by Scheduler)
 * Mirrors the logic of POST /campaigns/:id/start-youtube-live
 */
export async function startYoutubeLiveCampaign(campaignId, options = {}) {
  // Import these here to avoid circular deps at module load time
  const { startFfmpegStream } = await import('./ffmpegRunner.js');
  const { notifyBroadcastLive } = await import('./telegramService.js');
  const { getLiveChatId, startChatbot } = await import('./youtubeChatService.js');
  const { startStreamMonitoring } = await import('./youtubeAnalyticsService.js');

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(Number(campaignId));
  if (!campaign) throw new Error(`Kampanye #${campaignId} tidak ditemukan.`);

  let cfg = {};
  try { cfg = JSON.parse(campaign.config_json || '{}'); } catch { cfg = {}; }

  const youtubeChannelId = cfg.youtubeChannelId || cfg.channelId;
  if (!youtubeChannelId) throw new Error('YouTube channel belum dipilih di config kampanye.');

  // ── Pilih VIDEO ────────────────────────────────────────────────────────────
  const videoIds = Array.isArray(cfg.videoAssetIds) ? cfg.videoAssetIds.map(Number).filter(Boolean) : [];
  let chosenVideo = null;
  if (videoIds.length > 0) {
    const pl = videoIds.map(() => '?').join(', ');
    const candidates = db.prepare(`SELECT * FROM assets WHERE id IN (${pl}) AND type = 'Video'`).all(...videoIds);
    if (candidates.length > 0) chosenVideo = candidates[Math.floor(Math.random() * candidates.length)];
  }
  if (!chosenVideo) chosenVideo = db.prepare("SELECT * FROM assets WHERE type = 'Video' ORDER BY RANDOM() LIMIT 1").get();
  if (!chosenVideo) throw new Error('Tidak ada video di Pustaka Aset.');

  // ── Pilih THUMBNAIL ────────────────────────────────────────────────────────
  const thumbIds = Array.isArray(cfg.thumbnailAssetIds) ? cfg.thumbnailAssetIds.map(Number).filter(Boolean) : [];
  let chosenThumbnail = null;
  if (thumbIds.length > 0) {
    const pl = thumbIds.map(() => '?').join(', ');
    const thumbs = db.prepare(`SELECT * FROM assets WHERE id IN (${pl})`).all(...thumbIds);
    if (thumbs.length > 0) chosenThumbnail = thumbs[Math.floor(Math.random() * thumbs.length)];
  }
  if (!chosenThumbnail) chosenThumbnail = db.prepare("SELECT * FROM assets WHERE type IN ('Images','Thumbnail') ORDER BY RANDOM() LIMIT 1").get() || null;

  // ── Pilih JUDUL ────────────────────────────────────────────────────────────
  const titles = String(cfg.youtubeLiveTitles || cfg.liveTitles || '').split('\n').map(t => t.trim()).filter(Boolean);
  const chosenTitle = titles.length > 0 ? titles[Math.floor(Math.random() * titles.length)] : campaign.name;

  // ── Buat broadcast YouTube ─────────────────────────────────────────────────
  logEvent('INFO', 'Scheduler', `Scheduler memulai YouTube Live untuk kampanye #${campaignId}: ${chosenTitle}`);

  const privacySetting = cfg.youtubePrivacy || cfg.privacy || 'Publik';
  const broadcastData = await createYoutubeLiveBroadcast({
    channelId: youtubeChannelId,
    title: chosenTitle,
    description: cfg.youtubeDescription || cfg.description || '',
    categoryId: cfg.categoryId || cfg.youtubeCategoryId || '10',
    tags: cfg.youtubeTags || cfg.tags || '',
    privacyStatus: privacySetting.toLowerCase() === 'publik' ? 'public'
                  : privacySetting.toLowerCase() === 'tidak publik' ? 'unlisted' : 'private',
    enableAutoStart: true,
    enableAutoStop: cfg.youtubeAutoStopEnabled !== false,
    recordFromStart: true,
  });

  const { rtmpUrl, streamKey, broadcastId, streamId, watchUrl } = broadcastData;

  // ── Upload thumbnail ───────────────────────────────────────────────────────
  if (chosenThumbnail?.path) {
    try { await uploadBroadcastThumbnail(youtubeChannelId, broadcastId, chosenThumbnail.path); }
    catch (e) { logEvent('WARN', 'Scheduler', `Thumbnail upload gagal: ${e.message}`); }
  }

  // ── Add ke playlist ────────────────────────────────────────────────────────
  const playlistId = cfg.youtubePlaylistId || cfg.playlist?.id;
  if (playlistId) {
    try { await addBroadcastToPlaylist(youtubeChannelId, broadcastId, playlistId); }
    catch (e) { logEvent('WARN', 'Scheduler', `Add to playlist gagal: ${e.message}`); }
  }

  // ── Update status kampanye → Aktif ────────────────────────────────────────
  db.prepare("UPDATE campaigns SET status = 'Aktif', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(campaignId);

  // ── Start FFmpeg ───────────────────────────────────────────────────────────
  const started = startFfmpegStream({
    campaignId,
    platform: 'YouTube API',
    inputPath: chosenVideo.path,
    rtmpUrl,
    streamKey,
    encoder: cfg.encoder || {},
    durationMinutes: options.durationMinutes,
  });

  // ── Simpan data stream ─────────────────────────────────────────────────────
  try {
    db.prepare(`UPDATE streams SET chosen_video_id=?, chosen_thumbnail_id=?, chosen_title=?, youtube_broadcast_id=?, youtube_stream_id=?, youtube_watch_url=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .run(chosenVideo.id ?? null, chosenThumbnail?.id ?? null, chosenTitle, broadcastId, streamId, watchUrl, started.streamId);
  } catch (e) { logEvent('WARN', 'Scheduler', `Simpan stream info gagal: ${e.message}`); }

  // ── Live chat & monitoring ─────────────────────────────────────────────────
  let liveChatId = null;
  try {
    liveChatId = await getLiveChatId(youtubeChannelId, broadcastId);
    if (liveChatId) db.prepare('UPDATE streams SET youtube_live_chat_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(liveChatId, started.streamId);
  } catch (e) { logEvent('WARN', 'Scheduler', `Get live chat ID gagal: ${e.message}`); }

  try {
    startStreamMonitoring(started.streamId, { channelId: youtubeChannelId, broadcastId, youtubeStreamId: streamId, intervalSeconds: 30 });
  } catch (e) { logEvent('WARN', 'Scheduler', `Start monitoring gagal: ${e.message}`); }

  if (cfg.chatbot?.enabled && liveChatId) {
    try {
      startChatbot(started.streamId, {
        channelId: youtubeChannelId, liveChatId,
        messages: cfg.chatbot.messages || [],
        intervalMinutes: parseInt(cfg.chatbot.interval || '10'),
        mode: cfg.chatbot.mode === 'Pesan berkala' ? 'sequential' : 'random',
      });
    } catch (e) { logEvent('WARN', 'Scheduler', `Start chatbot gagal: ${e.message}`); }
  }

  // ── Transisi ke LIVE setelah 30 detik ─────────────────────────────────────
  setTimeout(async () => {
    try {
      await transitionBroadcastToLive(youtubeChannelId, broadcastId);
      logEvent('INFO', 'Scheduler', `Broadcast ${broadcastId} sekarang LIVE`);
      notifyBroadcastLive({ campaignName: campaign.name, broadcastId, watchUrl, title: chosenTitle })
        .catch(e => logEvent('ERROR', 'Telegram', e.message));
    } catch (e) {
      logEvent('ERROR', 'Scheduler', `Transisi ke LIVE gagal: ${e.message}`);
    }
  }, 30000);

  logEvent('INFO', 'Scheduler', `Kampanye #${campaignId} berhasil dimulai oleh scheduler. Broadcast: ${broadcastId}`);
  return { streamId: started.streamId, broadcastId, watchUrl };
}
