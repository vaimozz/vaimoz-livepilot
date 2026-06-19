/**
 * YouTube Analytics Service
 * 
 * Service untuk mengambil analytics data dari YouTube:
 * - Concurrent viewers (live)
 * - Total views
 * - Likes, comments
 * - Stream health
 */

import { db, logEvent } from '../db/database.js';
import { youtubeWithTokens } from './youtubeService.js';
import { getChannelTokens } from './youtubeTokenUtils.js'; // BUG-020 FIX: Shared utility
import { consumeQuota } from './youtubeQuotaTracker.js';
import { notifyViewerMilestone, notifySmartStopDelayed } from './telegramService.js';

/**
 * Get live stream statistics (concurrent viewers, etc.)
 */
export async function getLiveStreamStats(channelId, broadcastId) {
  const tokens = getChannelTokens(channelId);
  const youtube = youtubeWithTokens(tokens);

  try {
    const response = await youtube.videos.list({
      part: ['statistics', 'liveStreamingDetails', 'snippet'],
      id: [broadcastId],
    });

    if (tokens.project?.clientId) {
      consumeQuota(tokens.project.clientId, 1);
    }

    const video = response.data.items?.[0];
    if (!video) {
      logEvent('WARN', 'YouTube Analytics', `Broadcast ${broadcastId} not found`);
      return null;
    }

    const stats = {
      broadcastId,
      // Live streaming details
      concurrentViewers: parseInt(video.liveStreamingDetails?.concurrentViewers || '0'),
      actualStartTime: video.liveStreamingDetails?.actualStartTime || null,
      actualEndTime: video.liveStreamingDetails?.actualEndTime || null,
      scheduledStartTime: video.liveStreamingDetails?.scheduledStartTime || null,
      
      // Statistics
      viewCount: parseInt(video.statistics?.viewCount || '0'),
      likeCount: parseInt(video.statistics?.likeCount || '0'),
      commentCount: parseInt(video.statistics?.commentCount || '0'),
      
      // Snippet
      title: video.snippet?.title || '',
      description: video.snippet?.description || '',
      publishedAt: video.snippet?.publishedAt || null,
      
      // Timestamps
      fetchedAt: new Date().toISOString(),
    };

    return stats;
  } catch (error) {
    logEvent('ERROR', 'YouTube Analytics', `Failed to get stats: ${error.message}`);
    return null;
  }
}

/**
 * Get stream health metrics
 */
export async function getStreamHealth(channelId, streamId) {
  const tokens = getChannelTokens(channelId);
  const youtube = youtubeWithTokens(tokens);

  try {
    const response = await youtube.liveStreams.list({
      part: ['status', 'cdn'],
      id: [streamId],
    });

    const stream = response.data.items?.[0];
    if (!stream) {
      logEvent('WARN', 'YouTube Analytics', `Stream ${streamId} not found`);
      return null;
    }

    const health = {
      streamId,
      status: stream.status?.streamStatus || 'unknown',
      healthStatus: stream.status?.healthStatus?.status || 'unknown',
      
      // CDN info
      ingestionAddress: stream.cdn?.ingestionInfo?.ingestionAddress || '',
      backupIngestionAddress: stream.cdn?.ingestionInfo?.backupIngestionAddress || '',
      
      // Health issues
      configurationIssues: stream.status?.healthStatus?.configurationIssues || [],
      
      fetchedAt: new Date().toISOString(),
    };

    return health;
  } catch (error) {
    logEvent('ERROR', 'YouTube Analytics', `Failed to get stream health: ${error.message}`);
    return null;
  }
}

/**
 * Monitor live stream and update database periodically
 */
const activeMonitors = new Map(); // streamId -> intervalId
const streamMilestones = new Map(); // streamId -> highest milestone achieved
const lastSmartStopNotified = new Map(); // streamId -> timestamp of last notification

export function startStreamMonitoring(streamId, config) {
  // Stop existing monitor if any
  stopStreamMonitoring(streamId);

  const {
    channelId,
    broadcastId,
    youtubeStreamId,
    intervalSeconds = 30,
  } = config;

  if (!broadcastId) {
    logEvent('WARN', 'YouTube Analytics', `Cannot start monitoring: no broadcast ID for stream ${streamId}`);
    return false;
  }

  const updateStats = async () => {
    try {
      // Get live stats
      const stats = await getLiveStreamStats(channelId, broadcastId);
      if (!stats) return;

      // Update database
      db.prepare(`
        UPDATE streams 
        SET youtube_concurrent_viewers = ?,
            youtube_total_views = ?,
            youtube_likes = ?,
            youtube_comments = ?,
            youtube_stats_updated_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        stats.concurrentViewers,
        stats.viewCount,
        stats.likeCount,
        stats.commentCount,
        streamId
      );

      logEvent('INFO', 'YouTube Analytics', `Stream #${streamId}: ${stats.concurrentViewers} viewers, ${stats.viewCount} total views`);

      // Check for milestones
      const milestones = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000];
      const highestAchieved = streamMilestones.get(streamId) || 0;
      let newMilestone = 0;
      
      for (const m of milestones) {
        if (stats.concurrentViewers >= m && m > highestAchieved) {
          newMilestone = m;
        }
      }
      
      if (newMilestone > 0) {
        streamMilestones.set(streamId, newMilestone);
        try {
           const campRow = db.prepare('SELECT name FROM campaigns WHERE id = (SELECT campaign_id FROM streams WHERE id = ?)').get(streamId);
           const campaignName = campRow ? campRow.name : `Campaign #${streamId}`;
           const watchUrl = `https://www.youtube.com/watch?v=${broadcastId}`;
           notifyViewerMilestone({ campaignName, viewers: newMilestone, watchUrl }).catch(() => {});
        } catch (e) { /* ignore error */ }
      }

      // Check smart stop condition
      await checkSmartStopCondition(streamId, stats.concurrentViewers);
    } catch (error) {
      logEvent('ERROR', 'YouTube Analytics', `Stream #${streamId}: Failed to update stats: ${error.message}`);
    }
  };

  // Update immediately
  updateStats();

  // Schedule periodic updates
  const intervalMs = intervalSeconds * 1000;
  const intervalId = setInterval(updateStats, intervalMs);

  activeMonitors.set(streamId, intervalId);

  logEvent('INFO', 'YouTube Analytics', `Started monitoring stream #${streamId}, interval: ${intervalSeconds}s`);
  return true;
}

/**
 * Stop stream monitoring
 */
export function stopStreamMonitoring(streamId) {
  const intervalId = activeMonitors.get(streamId);
  if (!intervalId) return false;

  clearInterval(intervalId);
  activeMonitors.delete(streamId);
  streamMilestones.delete(streamId);
  lastSmartStopNotified.delete(streamId);

  logEvent('INFO', 'YouTube Analytics', `Stopped monitoring stream #${streamId}`);
  return true;
}

/**
 * Check smart stop condition based on viewer count
 */
async function checkSmartStopCondition(streamId, currentViewers) {
  try {
    // Get stream config
    const stream = db.prepare('SELECT * FROM streams WHERE id = ?').get(streamId);
    if (!stream || !stream.campaign_id) return;

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(stream.campaign_id);
    if (!campaign) return;

    let config = {};
    try {
      config = JSON.parse(campaign.config_json || '{}');
    } catch {
      return;
    }

    // Check if smart stop is enabled
    if (!config.smartStopEnabled) return;

    const threshold = parseInt(config.smartStopViewerThreshold || '0');
    const delayMinutes = parseInt(config.smartStopDelayMinutes || '15');

    // If viewers above threshold, delay stop
    if (currentViewers > threshold) {
      const newStopTime = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
      
      db.prepare(`
        UPDATE streams 
        SET smart_stop_delayed_until = ?,
            smart_stop_reason = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        newStopTime,
        `${currentViewers} viewers > ${threshold} threshold`,
        streamId
      );

      logEvent('INFO', 'Smart Stop', `Stream #${streamId}: Stop delayed by ${delayMinutes} minutes (${currentViewers} viewers)`);
      
      // Notify at most once every 10 minutes to avoid spam
      const lastNotified = lastSmartStopNotified.get(streamId) || 0;
      if (Date.now() - lastNotified > 10 * 60 * 1000) {
        try {
          notifySmartStopDelayed({
            campaignName: campaign.name,
            viewers: currentViewers,
            threshold,
            delayMinutes
          }).catch(() => {});
        } catch(e) {}
        lastSmartStopNotified.set(streamId, Date.now());
      }
    }
  } catch (error) {
    logEvent('ERROR', 'Smart Stop', `Failed to check condition: ${error.message}`);
  }
}

/**
 * Get all active monitors
 */
export function getActiveMonitors() {
  return Array.from(activeMonitors.keys());
}

/**
 * Stop all monitors (for server shutdown)
 */
export function stopAllMonitors() {
  const streamIds = Array.from(activeMonitors.keys());
  streamIds.forEach(stopStreamMonitoring);
  logEvent('INFO', 'YouTube Analytics', `Stopped ${streamIds.length} active monitors`);
}

/**
 * Get channel analytics summary
 */
export async function getChannelAnalytics(channelId) {
  const tokens = getChannelTokens(channelId);
  const youtube = youtubeWithTokens(tokens);

  try {
    const response = await youtube.channels.list({
      part: ['statistics', 'snippet'],
      mine: true,
    });

    if (tokens.project?.clientId) {
      consumeQuota(tokens.project.clientId, 1);
    }

    const channel = response.data.items?.[0];
    if (!channel) return null;

    return {
      channelId: channel.id,
      title: channel.snippet?.title || '',
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
      viewCount: parseInt(channel.statistics?.viewCount || '0'),
      videoCount: parseInt(channel.statistics?.videoCount || '0'),
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    logEvent('ERROR', 'YouTube Analytics', `Failed to get channel analytics: ${error.message}`);
    return null;
  }
}
