import { Router } from 'express';
import { db } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { scheduleCampaign, stopScheduledCampaign } from '../scheduler.js';

export const schedulerRouter = Router();
schedulerRouter.use(requireAuth);

schedulerRouter.post('/campaigns/:id/schedule', asyncHandler(async (req, res) => {
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });
  db.prepare("UPDATE campaigns SET status = 'Scheduled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.id);
  res.json(scheduleCampaign({ ...row, status: 'Scheduled' }));
}));

schedulerRouter.post('/campaigns/:id/unschedule', asyncHandler(async (req, res) => {
  const stopped = stopScheduledCampaign(req.params.id);
  db.prepare("UPDATE campaigns SET status = 'Draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(Number(req.params.id));
  res.json({ stopped });
}));
