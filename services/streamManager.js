import { db, logEvent } from '../db/database.js';
import { stopFfmpegStream } from './ffmpegRunner.js';
import { completeBroadcast } from './youtubeLiveService.js';
import { stopChatbot } from './youtubeChatService.js';
import { stopStreamMonitoring } from './youtubeAnalyticsService.js';

/**
 * Stop an active campaign stream and clean up all associated services
 * (FFmpeg, Chatbot, Analytics, YouTube Broadcast)
 * @param {number} campaignId 
 * @returns {Promise<{ok: boolean, stopped: boolean, message?: string, streamId?: number}>}
 */
export async function stopActiveCampaignStream(campaignId) {
  const id = Number(campaignId);
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  
  if (!campaign) {
    return { ok: false, stopped: false, message: 'Kampanye tidak ditemukan.' };
  }

  // Find active stream for this campaign
  const activeStream = db.prepare(
    "SELECT * FROM streams WHERE campaign_id = ? AND status IN ('Online','Starting') ORDER BY created_at DESC LIMIT 1"
  ).get(id);

  if (!activeStream) {
    // If no active stream, ensure campaign is marked as Draft
    db.prepare('UPDATE campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('Draft', id);
    return { ok: true, stopped: false, message: 'Tidak ada stream aktif untuk kampanye ini.' };
  }

  // 1. Stop chatbot if active
  try {
    stopChatbot(activeStream.id);
    logEvent('INFO', 'YouTube Chatbot', `Stopped chatbot for stream #${activeStream.id}`);
  } catch (error) {
    logEvent('WARN', 'YouTube Chatbot', `Failed to stop chatbot: ${error.message}`);
  }

  // 2. Stop analytics monitoring
  try {
    stopStreamMonitoring(activeStream.id);
    logEvent('INFO', 'YouTube Analytics', `Stopped monitoring stream #${activeStream.id}`);
  } catch (error) {
    logEvent('WARN', 'YouTube Analytics', `Failed to stop monitoring: ${error.message}`);
  }

  // 3. Stop FFmpeg stream
  const result = stopFfmpegStream(activeStream.id);

  // 4. Complete YouTube broadcast if exists
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

  // 5. Update campaign status → Draft
  db.prepare('UPDATE campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('Draft', id);

  logEvent('INFO', 'Kampanye', `Campaign #${id} "${campaign.name}" dihentikan. Stream #${activeStream.id}`);

  return { ok: true, stopped: result.stopped, streamId: activeStream.id };
}
