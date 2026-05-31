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

  // Find ALL active streams for this campaign to prevent orphaned streams
  const activeStreams = db.prepare(
    "SELECT * FROM streams WHERE campaign_id = ? AND status IN ('Online','Starting')"
  ).all(id);

  if (activeStreams.length === 0) {
    // If no active stream, ensure campaign status is correct
    const newStatus = campaign.recurring_enabled ? 'Scheduled' : 'Draft';
    db.prepare('UPDATE campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, id);
    return { ok: true, stopped: false, message: 'Tidak ada stream aktif untuk kampanye ini.' };
  }

  let anyStopped = false;
  let lastStreamId = null;

  for (const activeStream of activeStreams) {
    lastStreamId = activeStream.id;

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
    if (result.stopped) anyStopped = true;

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
  }

  // 5. Update campaign status → Draft (or Scheduled if recurring)
  // If the campaign is a 'once' schedule, scheduler sets it to 'Completed'. Don't overwrite it with 'Draft'.
  let newStatus = campaign.status;
  if (campaign.status !== 'Completed') {
    newStatus = (campaign.recurring_enabled && campaign.recurring_type !== 'once') ? 'Scheduled' : 'Draft';
  }
  db.prepare('UPDATE campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, id);

  logEvent('INFO', 'Kampanye', `Campaign #${id} "${campaign.name}" dihentikan. Status: ${newStatus}`);

  return { ok: true, stopped: anyStopped, streamId: lastStreamId };
}
