import cron from 'node-cron';
import { db, logEvent, readJson } from '../db/database.js';
import { startFfmpegStream } from './ffmpegRunner.js';

const jobs = new Map();

function toCronTime(dateString, timeString) {
  const [hour = '0', minute = '0'] = String(timeString || '00:00').split(':');
  return `${Number(minute)} ${Number(hour)} * * *`;
}

export function scheduleCampaign(campaign) {
  const config = readJson(campaign.config_json, {});
  const expression = config.cron || toCronTime(config.startDate, config.startTime);
  if (jobs.has(campaign.id)) jobs.get(campaign.id).stop();
  const job = cron.schedule(expression, () => {
    logEvent('INFO', 'Scheduler', `Menjalankan kampanye #${campaign.id}: ${campaign.name}`);
    if (!config.rtmpUrl || !config.inputPath) {
      logEvent('WARN', 'Scheduler', `Kampanye #${campaign.id} belum punya inputPath atau RTMP URL.`);
      return;
    }
    startFfmpegStream({ campaignId: campaign.id, platform: campaign.mode, inputPath: config.inputPath, rtmpUrl: config.rtmpUrl, streamKey: config.streamKey, encoder: config.encoder });
  }, { scheduled: true });
  jobs.set(campaign.id, job);
  return { id: campaign.id, expression };
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
  return true;
}
