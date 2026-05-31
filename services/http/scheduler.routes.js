import { Router } from 'express';
import { db, readJson, writeJson } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { 
  scheduleCampaign, 
  stopScheduledCampaign,
  pauseScheduledCampaign,
  resumeScheduledCampaign,
  getRecurringHistory,
  getScheduledCampaignsInfo
} from '../scheduler.js';

export const schedulerRouter = Router();
schedulerRouter.use(requireAuth);

// Schedule a campaign
schedulerRouter.post('/campaigns/:id/schedule', asyncHandler(async (req, res) => {
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });
  
  db.prepare("UPDATE campaigns SET status = 'Scheduled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.id);
  const result = scheduleCampaign({ ...row, status: 'Scheduled' });
  
  res.json(result);
}));

// Unschedule a campaign
schedulerRouter.post('/campaigns/:id/unschedule', asyncHandler(async (req, res) => {
  const stopped = stopScheduledCampaign(req.params.id);
  db.prepare("UPDATE campaigns SET status = 'Draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(Number(req.params.id));
  res.json({ stopped });
}));

// Pause a scheduled campaign
schedulerRouter.post('/campaigns/:id/pause', asyncHandler(async (req, res) => {
  const paused = pauseScheduledCampaign(Number(req.params.id));
  res.json({ paused });
}));

// Resume a paused campaign
schedulerRouter.post('/campaigns/:id/resume', asyncHandler(async (req, res) => {
  const resumed = resumeScheduledCampaign(Number(req.params.id));
  res.json({ resumed });
}));

// Update recurring settings for a campaign
schedulerRouter.put('/campaigns/:id/recurring', asyncHandler(async (req, res) => {
  const campaignId = Number(req.params.id);
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  
  if (!campaign) {
    return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });
  }
  
  const {
    recurringEnabled,
    recurringType,
    recurringDays,
    recurringTime,
    recurringDurationMode,
    recurringDurationMinutes,
    recurringDurationMax,
    recurringEndDate,
    recurringTimezone,
    recurringHumanize,
    recurringHumanizeMaxMins
  } = req.body;

  let config = {};
  try {
    config = JSON.parse(campaign.config_json || '{}');
  } catch (e) {
    config = {};
  }
  
  // Update humanize config
  config.recurringHumanize = !!recurringHumanize;
  config.recurringHumanizeMaxMins = Number(recurringHumanizeMaxMins) || 10;
  
  
  // Update recurring settings
  db.prepare(`
    UPDATE campaigns 
    SET 
      recurring_enabled = ?,
      recurring_type = ?,
      recurring_days_json = ?,
      recurring_time = ?,
      recurring_duration_mode = ?,
      recurring_duration_minutes = ?,
      recurring_duration_min = ?,
      recurring_duration_max = ?,
      recurring_end_date = ?,
      recurring_timezone = ?,
      config_json = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    recurringEnabled ? 1 : 0,
    recurringType || 'once',
    writeJson(recurringDays || []),
    recurringTime,
    recurringDurationMode || 'fixed',
    recurringDurationMinutes,
    recurringDurationMin,
    recurringDurationMax,
    recurringEndDate,
    recurringTimezone || 'Asia/Jakarta',
    writeJson(config),
    campaignId
  );
  
  // If campaign is scheduled, reschedule with new settings
  if (campaign.status === 'Scheduled') {
    stopScheduledCampaign(campaignId);
    const updatedCampaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
    scheduleCampaign(updatedCampaign);
  }
  
  res.json({ 
    success: true,
    message: 'Pengaturan recurring berhasil diperbarui'
  });
}));

// Get recurring history for a campaign
schedulerRouter.get('/campaigns/:id/history', asyncHandler(async (req, res) => {
  const campaignId = Number(req.params.id);
  const limit = Number(req.query.limit) || 50;
  
  const history = getRecurringHistory(campaignId, limit);
  res.json(history);
}));

// Get all scheduled campaigns info
schedulerRouter.get('/campaigns', asyncHandler(async (req, res) => {
  const campaigns = getScheduledCampaignsInfo();
  res.json(campaigns);
}));

// Get recurring statistics for a campaign
schedulerRouter.get('/campaigns/:id/stats', asyncHandler(async (req, res) => {
  const campaignId = Number(req.params.id);
  
  const campaign = db.prepare(`
    SELECT 
      id, name, execution_count, last_executed_at, next_execution_at,
      recurring_enabled, recurring_type, recurring_end_date
    FROM campaigns 
    WHERE id = ?
  `).get(campaignId);
  
  if (!campaign) {
    return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });
  }
  
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_executions,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_executions,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_executions,
      AVG(duration_minutes) as avg_duration,
      MAX(executed_at) as last_execution
    FROM recurring_history
    WHERE campaign_id = ?
  `).get(campaignId);
  
  res.json({
    campaign,
    stats
  });
}));
