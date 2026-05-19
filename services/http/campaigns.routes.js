import { Router } from 'express';
import { db, writeJson } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { serializeCampaign } from '../../utils/serializers.js';

export const campaignsRouter = Router();
campaignsRouter.use(requireAuth);

campaignsRouter.get('/', asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
  res.json({ campaigns: rows.map(serializeCampaign) });
}));

campaignsRouter.post('/', asyncHandler(async (req, res) => {
  const name = String(req.body.name || 'Kampanye Baru').trim();
  const mode = String(req.body.mode || 'YouTube API').trim();
  const status = String(req.body.status || 'Draft').trim();
  const config = req.body.config || {};
  const result = db.prepare('INSERT INTO campaigns (name, mode, status, config_json) VALUES (?, ?, ?, ?)')
    .run(name, mode, status, writeJson(config));
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ campaign: serializeCampaign(row) });
}));

campaignsRouter.get('/:id', asyncHandler(async (req, res) => {
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });
  res.json({ campaign: serializeCampaign(row) });
}));

campaignsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });
  const name = String(req.body.name || current.name).trim();
  const mode = String(req.body.mode || current.mode).trim();
  const status = String(req.body.status || current.status).trim();
  const config = req.body.config || JSON.parse(current.config_json || '{}');
  db.prepare('UPDATE campaigns SET name = ?, mode = ?, status = ?, config_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(name, mode, status, writeJson(config), id);
  res.json({ campaign: serializeCampaign(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id)) });
}));

campaignsRouter.delete('/:id', asyncHandler(async (req, res) => {
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
}));
