import cron from 'node-cron';
import { db, logEvent, readJson, writeJson } from '../db/database.js';
import { startFfmpegStream } from './ffmpegRunner.js';

const jobs = new Map();

/**
 * Generate cron expression based on recurring configuration
 * @param {Object} campaign - Campaign object with recurring settings
 * @returns {string} - Cron expression
 */
function generateCronExpression(campaign) {
  const config = readJson(campaign.config_json, {});
  
  // If custom cron is provided, use it
  if (config.cron) return config.cron;
  
  // If recurring is enabled, generate based on recurring settings
  if (campaign.recurring_enabled) {
    const time = campaign.recurring_time || '00:00';
    const [hour = '0', minute = '0'] = time.split(':');
    
    switch (campaign.recurring_type) {
      case 'once': {
        // One-time execution at specific date and time
        const startDate = config.startDate || new Date().toISOString().split('T')[0];
        const startTime = config.startTime || time;
        return toCronTime(startDate, startTime);
      }
      
      case 'daily': {
        // Every day at specified time
        return `${Number(minute)} ${Number(hour)} * * *`;
      }
      
      case 'weekly': {
        // Specific days of week at specified time
        const days = readJson(campaign.recurring_days_json, []);
        if (days.length === 0) {
          // Default to all days if none specified
          return `${Number(minute)} ${Number(hour)} * * *`;
        }
        // Convert day names to cron day numbers (0=Sunday, 1=Monday, etc.)
        const dayMap = {
          'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3,
          'Kamis': 4, 'Jumat': 5, 'Sabtu': 6
        };
        const cronDays = days.map(day => dayMap[day]).filter(d => d !== undefined).join(',');
        return `${Number(minute)} ${Number(hour)} * * ${cronDays}`;
      }
      
      case 'monthly': {
        // First day of every month at specified time
        return `${Number(minute)} ${Number(hour)} 1 * *`;
      }
      
      default:
        return `${Number(minute)} ${Number(hour)} * * *`;
    }
  }
  
  // Fallback to old format
  return toCronTime(config.startDate, config.startTime);
}

function toCronTime(dateString, timeString) {
  const [hour = '0', minute = '0'] = String(timeString || '00:00').split(':');
  return `${Number(minute)} ${Number(hour)} * * *`;
}

/**
 * Calculate random duration within min-max range
 */
function getRandomDuration(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get duration for this execution based on duration mode
 */
function getExecutionDuration(campaign) {
  const mode = campaign.recurring_duration_mode || 'fixed';
  
  switch (mode) {
    case 'fixed':
      return campaign.recurring_duration_minutes || 60;
    
    case 'random': {
      const min = campaign.recurring_duration_min || 30;
      const max = campaign.recurring_duration_max || 120;
      return getRandomDuration(min, max);
    }
    
    case 'pattern': {
      // Pattern mode: cycle through different durations
      const count = campaign.execution_count || 0;
      const patterns = [30, 60, 90, 120]; // Example pattern
      return patterns[count % patterns.length];
    }
    
    default:
      return 60;
  }
}

/**
 * Check if campaign should still execute (not past end date)
 */
function shouldExecute(campaign) {
  if (!campaign.recurring_end_date) return true;
  
  const endDate = new Date(campaign.recurring_end_date);
  const now = new Date();
  
  return now <= endDate;
}

/**
 * Record execution in history
 */
function recordExecution(campaignId, status, durationMinutes, errorMessage = null, streamId = null) {
  try {
    db.prepare(`
      INSERT INTO recurring_history 
      (campaign_id, status, duration_minutes, error_message, stream_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(campaignId, status, durationMinutes, errorMessage, streamId);
    
    // Update campaign execution stats
    db.prepare(`
      UPDATE campaigns 
      SET execution_count = execution_count + 1,
          last_executed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(campaignId);
  } catch (error) {
    logEvent('ERROR', 'Scheduler', `Failed to record execution for campaign #${campaignId}: ${error.message}`);
  }
}

/**
 * Calculate next execution time
 */
function calculateNextExecution(campaign) {
  const expression = generateCronExpression(campaign);
  // This is a simplified calculation - in production you'd use a proper cron parser
  const now = new Date();
  const next = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Simplified: next day
  return next.toISOString();
}

/**
 * Execute campaign with recurring logic
 */
async function executeCampaign(campaignData) {
  // Always fetch fresh data from DB to get latest config
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignData.id) || campaignData;
  const config = readJson(campaign.config_json, {});
  
  logEvent('INFO', 'Scheduler', `Menjalankan kampanye #${campaign.id}: ${campaign.name}`);
  
  // Check if should still execute
  if (!shouldExecute(campaign)) {
    logEvent('INFO', 'Scheduler', `Kampanye #${campaign.id} telah melewati end date, menghentikan schedule`);
    stopScheduledCampaign(campaign.id);
    db.prepare("UPDATE campaigns SET status = 'Completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(campaign.id);
    return;
  }
  
  // Get duration for this execution
  const durationMinutes = getExecutionDuration(campaign);
  
  try {
    const isYouTubeAPI = campaign.mode === 'YouTube API' || config.mode === 'YouTube API';
    
    if (isYouTubeAPI) {
      // ── YouTube API mode: call the full start-youtube-live logic ─────────────
      if (!config.youtubeChannelId) {
        const errorMsg = `Kampanye #${campaign.id} belum punya youtubeChannelId di config.`;
        logEvent('WARN', 'Scheduler', errorMsg);
        recordExecution(campaign.id, 'failed', 0, errorMsg);
        return;
      }
      
      // Import startYoutubeLive dynamically to avoid circular deps
      const { startYoutubeLiveCampaign } = await import('./youtubeLiveService.js');
      const streamResult = await startYoutubeLiveCampaign(campaign.id, { durationMinutes });
      
      recordExecution(campaign.id, 'success', durationMinutes, null, streamResult?.streamId);
      logEvent('INFO', 'Scheduler', `Kampanye YouTube #${campaign.id} berhasil dimulai oleh scheduler.`);
    } else {
      // ── Manual RTMP mode ──────────────────────────────────────────────────────
      if (!config.rtmpUrl || !config.inputPath) {
        const errorMsg = `Kampanye #${campaign.id} belum punya inputPath atau RTMP URL.`;
        logEvent('WARN', 'Scheduler', errorMsg);
        recordExecution(campaign.id, 'failed', 0, errorMsg);
        return;
      }
      
      const streamResult = await startFfmpegStream({
        campaignId: campaign.id,
        platform: campaign.mode,
        inputPath: config.inputPath,
        rtmpUrl: config.rtmpUrl,
        streamKey: config.streamKey,
        encoder: config.encoder,
        durationMinutes: durationMinutes
      });
      
      recordExecution(campaign.id, 'success', durationMinutes, null, streamResult?.streamId);
      logEvent('INFO', 'Scheduler', `Kampanye RTMP #${campaign.id} berhasil dimulai. Durasi: ${durationMinutes} menit.`);
    }
    
    // Update next execution time
    const nextExecution = calculateNextExecution(campaign);
    db.prepare('UPDATE campaigns SET next_execution_at = ? WHERE id = ?').run(nextExecution, campaign.id);
    
  } catch (error) {
    logEvent('ERROR', 'Scheduler', `Gagal menjalankan kampanye #${campaign.id}: ${error.message}`);
    recordExecution(campaign.id, 'failed', 0, error.message);
  }
}

export function scheduleCampaign(campaign) {
  const expression = generateCronExpression(campaign);
  
  // Stop existing job if any
  if (jobs.has(campaign.id)) {
    jobs.get(campaign.id).stop();
  }
  
  // Validate cron expression
  if (!cron.validate(expression)) {
    logEvent('ERROR', 'Scheduler', `Invalid cron expression for campaign #${campaign.id}: ${expression}`);
    return { id: campaign.id, expression, error: 'Invalid cron expression' };
  }
  
  // Create new cron job
  const job = cron.schedule(expression, () => {
    executeCampaign(campaign);
  }, { 
    scheduled: true,
    timezone: campaign.recurring_timezone || 'Asia/Jakarta'
  });
  
  jobs.set(campaign.id, job);
  
  logEvent('INFO', 'Scheduler', `Kampanye #${campaign.id} dijadwalkan dengan cron: ${expression}`);
  
  return { 
    id: campaign.id, 
    expression,
    recurringType: campaign.recurring_type,
    recurringEnabled: campaign.recurring_enabled,
    timezone: campaign.recurring_timezone || 'Asia/Jakarta'
  };
}

export function loadScheduledCampaigns() {
  const rows = db.prepare("SELECT * FROM campaigns WHERE status = 'Scheduled'").all();
  return rows.map(scheduleCampaign);
}

export function stopScheduledCampaign(id) {
  const job = jobs.get(Number(id));
  if (!job) return false;
  job.stop();
  jobs.delete(Number(id));
  logEvent('INFO', 'Scheduler', `Kampanye #${id} dihentikan dari schedule`);
  return true;
}

/**
 * Get recurring history for a campaign
 */
export function getRecurringHistory(campaignId, limit = 50) {
  return db.prepare(`
    SELECT * FROM recurring_history 
    WHERE campaign_id = ? 
    ORDER BY executed_at DESC 
    LIMIT ?
  `).all(campaignId, limit);
}

/**
 * Get all active scheduled campaigns with their next execution time
 */
export function getScheduledCampaignsInfo() {
  const rows = db.prepare(`
    SELECT 
      id, name, mode, status, 
      recurring_enabled, recurring_type, recurring_time,
      recurring_days_json, recurring_end_date,
      last_executed_at, next_execution_at, execution_count
    FROM campaigns 
    WHERE status = 'Scheduled'
    ORDER BY next_execution_at ASC
  `).all();
  
  return rows.map(row => ({
    ...row,
    recurring_days: readJson(row.recurring_days_json, []),
    isActive: jobs.has(row.id)
  }));
}

/**
 * Pause a scheduled campaign (keep in Scheduled status but stop the job)
 */
export function pauseScheduledCampaign(id) {
  const stopped = stopScheduledCampaign(id);
  if (stopped) {
    db.prepare("UPDATE campaigns SET status = 'Paused', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    logEvent('INFO', 'Scheduler', `Kampanye #${id} dijeda`);
  }
  return stopped;
}

/**
 * Resume a paused campaign
 */
export function resumeScheduledCampaign(id) {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  if (!campaign) return false;
  
  db.prepare("UPDATE campaigns SET status = 'Scheduled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  scheduleCampaign(campaign);
  logEvent('INFO', 'Scheduler', `Kampanye #${id} dilanjutkan`);
  return true;
}
