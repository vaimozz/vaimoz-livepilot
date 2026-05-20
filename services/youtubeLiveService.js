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
        categoryId,
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
