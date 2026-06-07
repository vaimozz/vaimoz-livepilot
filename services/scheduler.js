import cron from 'node-cron';
import { db, logEvent, readJson, writeJson } from '../db/database.js';
import { startFfmpegStream } from './ffmpegRunner.js';
import { stopActiveCampaignStream } from './streamManager.js';

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
  if (!dateString) return `${Number(minute)} ${Number(hour)} * * *`;
  // BUG-002 FIX: Pakai tanggal + bulan spesifik agar 'sekali jalan' tidak jalan tiap hari
  const parts = String(dateString).split('-'); // YYYY-MM-DD
  const month = parts[1] ? parseInt(parts[1], 10) : null;
  const day = parts[2] ? parseInt(parts[2], 10) : null;
  if (month && day) {
    return `${Number(minute)} ${Number(hour)} ${day} ${month} *`;
  }
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
      // BUG-010 FIX: Gunakan ?? bukan || agar 0 (non-stop) tidak dioverride menjadi 60
      return campaign.recurring_duration_minutes ?? 60;
    
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
  
  const tz = campaign.recurring_timezone || 'Asia/Jakarta';
  try {
    // Get current YYYY-MM-DD in the target timezone (en-CA outputs YYYY-MM-DD)
    const formatter = new Intl.DateTimeFormat('en-CA', { 
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const currentTzDateStr = formatter.format(new Date());
    
    // Compare YYYY-MM-DD strings directly
    return currentTzDateStr <= campaign.recurring_end_date;
  } catch (e) {
    // Fallback if timezone is invalid
    const endDate = new Date(campaign.recurring_end_date);
    return new Date() <= endDate;
  }
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
 * BUG-M5 FIX: Kalkulasi waktu eksekusi berikutnya berdasarkan cron expression yang sebenarnya,
 * bukan selalu "+24 jam" yang tidak akurat.
 * Menggunakan logika parsing sederhana tanpa dependensi eksternal.
 */
function calculateNextExecution(campaign) {
  const expression = generateCronExpression(campaign);
  const tz = campaign.recurring_timezone || 'Asia/Jakarta';
  const now = new Date();

  try {
    // Parse cron expression: "minute hour dayOfMonth month dayOfWeek"
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }

    const [minutePart, hourPart, domPart, monthPart, dowPart] = parts;

    // Untuk 'once' dengan tanggal spesifik (format: min hour DOM MONTH *)
    const isSpecificDate = domPart !== '*' && monthPart !== '*';
    if (isSpecificDate) {
      const year = now.getFullYear();
      const month = parseInt(monthPart, 10);
      const day = parseInt(domPart, 10);
      const hour = parseInt(hourPart, 10);
      const minute = parseInt(minutePart, 10);
      // Coba tahun ini dulu, jika sudah lewat coba tahun depan
      let next = new Date(year, month - 1, day, hour, minute, 0, 0);
      if (next <= now) next = new Date(year + 1, month - 1, day, hour, minute, 0, 0);
      return next.toISOString();
    }

    const hour = parseInt(hourPart, 10);
    const minute = parseInt(minutePart, 10);

    // Untuk daily/weekly: cari tanggal berikutnya yang cocok
    const nextDate = new Date(now);
    nextDate.setSeconds(0, 0);
    nextDate.setHours(hour, minute);

    // Jika waktu hari ini sudah lewat, mulai dari besok
    if (nextDate <= now) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    // Untuk weekly: cari hari berikutnya yang cocok
    if (dowPart !== '*') {
      const targetDays = dowPart.split(',').map(Number);
      for (let i = 0; i < 8; i++) {
        const dayOfWeek = nextDate.getDay();
        if (targetDays.includes(dayOfWeek)) break;
        nextDate.setDate(nextDate.getDate() + 1);
      }
    }

    // Untuk monthly: cari bulan berikutnya jika tanggal sudah lewat
    if (domPart !== '*' && monthPart === '*') {
      const targetDay = parseInt(domPart, 10);
      nextDate.setDate(targetDay);
      if (nextDate <= now) {
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextDate.setDate(targetDay);
      }
    }

    return nextDate.toISOString();
  } catch (e) {
    // Fallback jika parsing gagal
    return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }
}

const executingCampaigns = new Set(); // Lock untuk mencegah eksekusi beruntun pada waktu bersamaan

/**
 * Execute campaign with recurring logic
 */
async function executeCampaign(campaignData) {
  // Always fetch fresh data from DB to get latest config
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignData.id) || campaignData;
  const config = readJson(campaign.config_json, {});
  
  // BUG-007 FIX: Prevent race condition (multiple cron triggers firing at once)
  if (executingCampaigns.has(campaign.id)) {
    logEvent('WARN', 'Scheduler', `Mencegah eksekusi berulang: Kampanye #${campaign.id} sedang dalam proses eksekusi (dikunci).`);
    return;
  }
  executingCampaigns.add(campaign.id);
  
  try {
    // Check if should still execute
    if (!shouldExecute(campaign)) {
      logEvent('INFO', 'Scheduler', `Kampanye #${campaign.id} telah melewati end date, menghentikan schedule`);
      stopScheduledCampaign(campaign.id);
      db.prepare("UPDATE campaigns SET status = 'Completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(campaign.id);
      return;
    }

    // --- SMART HUMANIZER START DELAY ---
    if (config.recurringHumanize) {
       const maxMins = config.recurringHumanizeMaxMins || 10;
       const randomDelayMins = Math.floor(Math.random() * maxMins) + 1;
       logEvent('INFO', 'Scheduler', `Smart Humanizer: Menunda start kampanye #${campaign.id} selama ${randomDelayMins} menit agar terlihat natural.`);
       await new Promise(resolve => setTimeout(resolve, randomDelayMins * 60000));
       
       // Re-fetch campaign after delay to ensure it wasn't paused/deleted
       const checkCampaign = db.prepare('SELECT status FROM campaigns WHERE id = ?').get(campaign.id);
       if (!checkCampaign || checkCampaign.status !== 'Scheduled') {
          logEvent('INFO', 'Scheduler', `Kampanye #${campaign.id} dibatalkan selama masa tunda Humanizer.`);
          return;
       }
    }
    // -----------------------------------

    logEvent('INFO', 'Scheduler', `Menjalankan kampanye #${campaign.id}: ${campaign.name}`);


    // Ensure we don't pile up multiple streams for the same campaign (stop stuck ones)
    try {
      await stopActiveCampaignStream(campaign.id);
    } catch (e) {
      logEvent('WARN', 'Scheduler', `Gagal menghentikan stream sebelumnya untuk kampanye #${campaign.id}: ${e.message}`);
    }
    
    // Get duration for this execution
    let durationMinutes = getExecutionDuration(campaign);
    
    // --- SMART HUMANIZER DURATION VARIANCE ---
    if (config.recurringHumanize && durationMinutes > 0) {
        const maxMins = config.recurringHumanizeMaxMins || 10;
        const variance = Math.floor(Math.random() * (maxMins * 2 + 1)) - maxMins; // e.g. -10 to +10
        durationMinutes += variance;
        if (durationMinutes < 1) durationMinutes = 1;
        logEvent('INFO', 'Scheduler', `Smart Humanizer: Durasi disesuaikan menjadi ${durationMinutes} menit (variasi: ${variance > 0 ? '+' : ''}${variance} menit).`);
    }
    // -----------------------------------------
    
    const isYouTubeAPI = campaign.mode === 'YouTube API' || config.mode === 'YouTube API';
    let streamResult = null;
    
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
      streamResult = await startYoutubeLiveCampaign(campaign.id, { durationMinutes });
      
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
      
      streamResult = await startFfmpegStream({
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
    
    if (campaign.recurring_type === 'once') {
      logEvent('INFO', 'Scheduler', `Kampanye #${campaign.id} bertipe sekali jalan. Menghentikan schedule setelah eksekusi ini.`);
      stopScheduledCampaign(campaign.id);
      db.prepare("UPDATE campaigns SET status = 'Completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(campaign.id);
    }
    
    // Schedule auto stop
    if (durationMinutes > 0 && streamResult?.streamId) {
      const ms = durationMinutes * 60 * 1000;
      const streamId = streamResult.streamId;
      
      const scheduleStopCheck = () => {
        try {
          const stream = db.prepare('SELECT smart_stop_delayed_until, status FROM streams WHERE id = ?').get(streamId);
          if (!stream || stream.status === 'Stopped' || stream.status === 'Error' || stream.status === 'Stopping') return;

          if (stream.smart_stop_delayed_until) {
            const stopTime = new Date(stream.smart_stop_delayed_until).getTime();
            const now = Date.now();
            if (now < stopTime) {
              const remainingMs = stopTime - now;
              setTimeout(scheduleStopCheck, remainingMs);
              logEvent('INFO', 'Scheduler', `Auto-stop ditunda untuk stream #${streamId} (Smart Stop). Cek lagi dalam ${Math.round(remainingMs/60000)} menit.`);
              return;
            }
          }
          
          logEvent('INFO', 'Scheduler', `Durasi kampanye #${campaign.id} (${durationMinutes} menit) telah habis. Menghentikan stream secara otomatis.`);
          stopActiveCampaignStream(campaign.id).catch(e => logEvent('ERROR', 'Scheduler', `Gagal menghentikan stream kampanye #${campaign.id}: ${e.message}`));
        } catch (e) {
          logEvent('ERROR', 'Scheduler', `Gagal mengecek jadwal auto-stop stream #${streamId}: ${e.message}`);
        }
      };

      setTimeout(scheduleStopCheck, ms);
      logEvent('INFO', 'Scheduler', `Auto-stop dijadwalkan dalam ${durationMinutes} menit untuk kampanye #${campaign.id}`);
    }
    
  } catch (error) {
    logEvent('ERROR', 'Scheduler', `Gagal menjalankan kampanye #${campaign.id}: ${error.message}`);
    recordExecution(campaign.id, 'failed', 0, error.message);
  } finally {
    executingCampaigns.delete(campaign.id);
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

export function setupAutoCleanup() {
  // Run everyday at midnight (00:00)
  cron.schedule('0 0 * * *', () => {
    try {
      logEvent('INFO', 'System', 'Menjalankan auto-cleanup riwayat stream lama...');
      // Delete streams older than 14 days that are not running
      const result = db.prepare(`
        DELETE FROM streams 
        WHERE created_at <= datetime('now', '-14 days') 
          AND status NOT IN ('Starting', 'Online')
      `).run();
      if (result.changes > 0) {
        logEvent('INFO', 'System', `Auto-cleanup: ${result.changes} riwayat stream (>14 hari) dihapus.`);
      }

      // BUG-016 FIX: Bersihkan log lama (>30 hari) agar database tidak membengkak
      const logResult = db.prepare(`
        DELETE FROM logs WHERE created_at <= datetime('now', '-30 days')
      `).run();
      if (logResult.changes > 0) {
        logEvent('INFO', 'System', `Auto-cleanup: ${logResult.changes} entri log (>30 hari) dihapus.`);
      }

      // Bersihkan riwayat eksekusi kampanye lama (>90 hari)
      const histResult = db.prepare(`
        DELETE FROM recurring_history WHERE executed_at <= datetime('now', '-90 days')
      `).run();
      if (histResult.changes > 0) {
        logEvent('INFO', 'System', `Auto-cleanup: ${histResult.changes} riwayat eksekusi kampanye (>90 hari) dihapus.`);
      }
    } catch (e) {
      logEvent('ERROR', 'System', `Gagal menjalankan auto-cleanup: ${e.message}`);
    }
  });
  logEvent('INFO', 'System', 'Auto-cleanup stream (>14 hari), log (>30 hari), dan history (>90 hari) dijadwalkan setiap tengah malam.');
}

export function loadScheduledCampaigns() {
  const rows = db.prepare("SELECT * FROM campaigns WHERE status = 'Scheduled'").all();
  const results = [];
  for (const row of rows) {
    try {
      const result = scheduleCampaign(row);
      logEvent('INFO', 'Scheduler', `Loaded: Campaign #${row.id} "${row.name}" → cron: ${result.expression}`);
      results.push(result);
    } catch (e) {
      logEvent('ERROR', 'Scheduler', `Failed to load campaign #${row.id}: ${e.message}`);
    }
  }
  return results;
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
