import path from 'node:path';
import { config } from './config.js';
import { readJson } from '../db/database.js';

export function assetUrl(filePath) {
  if (!filePath) return '';
  const relativePath = path.relative(config.uploadDir, filePath).split(path.sep).join('/');
  if (relativePath.startsWith('..')) return '';
  return `/uploads/${relativePath}`;
}

export function serializeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeAsset(row) {
  if (!row) return null;
  const metadata = readJson(row.metadata_json, {});
  const type = row.type;
  return {
    id: row.id,
    name: row.name,
    originalName: row.original_name,
    type,
    mimeType: row.mime_type,
    source: row.source,
    path: row.path,
    url: assetUrl(row.path),
    sizeBytes: row.size_bytes,
    size: formatBytes(row.size_bytes),
    used: row.used_count,
    metadata,
    resolution: metadata.resolution || '',
    duration: metadata.duration || '',
    bitrate: metadata.bitrate || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializePlaylist(row) {
  if (!row) return null;
  const itemIds = readJson(row.item_ids_json, []);
  return {
    id: row.id,
    channelId: row.channel_id,
    name: row.name,
    type: row.type,
    privacy: row.privacy,
    itemIds,
    items: itemIds.length,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeCampaign(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    mode: row.mode,
    status: row.status,
    config: readJson(row.config_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeStream(row) {
  if (!row) return null;
  return {
    id: row.id,
    campaignId: row.campaign_id,
    campaignName: row.campaign_name ?? null,
    platform: row.platform,
    status: row.status,
    pid: row.pid,
    rtmpUrl: row.rtmp_url,
    // YouTube broadcast info
    youtubeBroadcastId: row.youtube_broadcast_id ?? null,
    youtubeStreamId: row.youtube_stream_id ?? null,
    youtubeWatchUrl: row.youtube_watch_url ?? null,
    youtubeLiveChatId: row.youtube_live_chat_id ?? null,
    // Chatbot info
    chatbotStatus: row.chatbot_status ?? 'inactive',
    chatbotStartedAt: row.chatbot_started_at ?? null,
    chatbotStoppedAt: row.chatbot_stopped_at ?? null,
    chatbotMessageCount: row.chatbot_message_count ?? 0,
    chatbotLastMessage: row.chatbot_last_message ?? null,
    // Analytics info
    youtubeConcurrentViewers: row.youtube_concurrent_viewers ?? 0,
    youtubeTotalViews: row.youtube_total_views ?? 0,
    youtubeLikes: row.youtube_likes ?? 0,
    youtubeComments: row.youtube_comments ?? 0,
    youtubeStatsUpdatedAt: row.youtube_stats_updated_at ?? null,
    // Smart stop info
    smartStopDelayedUntil: row.smart_stop_delayed_until ?? null,
    smartStopReason: row.smart_stop_reason ?? null,
    startedAt: row.started_at,
    stoppedAt: row.stopped_at,
    // Aset yang dipilih acak saat stream dimulai
    chosenVideoId: row.chosen_video_id ?? null,
    chosenThumbnailId: row.chosen_thumbnail_id ?? null,
    chosenTitle: row.chosen_title ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeYoutubeChannel(row) {
  if (!row) return null;
  return {
    id: row.id,
    youtubeChannelId: row.youtube_channel_id,
    title: row.title,
    avatar: row.avatar,
    isDefault: Boolean(row.is_default),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 100 ? 0 : size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}
