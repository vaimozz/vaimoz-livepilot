/**
 * Campaign Templates Routes — /api/templates
 */

import { Router } from 'express';
import { db, logEvent } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { serializeCampaign } from '../../utils/serializers.js';

export const templatesRouter = Router();
templatesRouter.use(requireAuth);

function serializeTemplate(row) {
  if (!row) return null;
  let config = {};
  try { config = JSON.parse(row.config_json || '{}'); } catch { config = {}; }
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    mode: row.mode,
    config,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── GET /api/templates ────────────────────────────────────────────────────────
templatesRouter.get('/', asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT * FROM campaign_templates ORDER BY is_default DESC, updated_at DESC').all();
  res.json({ templates: rows.map(serializeTemplate) });
}));

// ── POST /api/templates ───────────────────────────────────────────────────────
templatesRouter.post('/', asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Nama template wajib diisi.' });
  const description = String(req.body.description || '').trim();
  const mode = String(req.body.mode || 'YouTube API').trim();
  const config = req.body.config || {};
  const isDefault = req.body.isDefault ? 1 : 0;

  const result = db.prepare(`
    INSERT INTO campaign_templates (name, description, mode, config_json, is_default)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, description, mode, JSON.stringify(config), isDefault);

  const row = db.prepare('SELECT * FROM campaign_templates WHERE id = ?').get(result.lastInsertRowid);
  logEvent('INFO', 'Template', `Template "${name}" dibuat.`);
  res.status(201).json({ template: serializeTemplate(row) });
}));

// ── GET /api/templates/:id ────────────────────────────────────────────────────
templatesRouter.get('/:id', asyncHandler(async (req, res) => {
  const row = db.prepare('SELECT * FROM campaign_templates WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Template tidak ditemukan.' });
  res.json({ template: serializeTemplate(row) });
}));

// ── PATCH /api/templates/:id ──────────────────────────────────────────────────
templatesRouter.patch('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare('SELECT * FROM campaign_templates WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'Template tidak ditemukan.' });

  const name = String(req.body.name || current.name).trim();
  const description = req.body.description !== undefined ? String(req.body.description).trim() : current.description;
  const mode = String(req.body.mode || current.mode).trim();
  const config = req.body.config !== undefined ? req.body.config : JSON.parse(current.config_json || '{}');
  const isDefault = req.body.isDefault !== undefined ? (req.body.isDefault ? 1 : 0) : current.is_default;

  db.prepare(`
    UPDATE campaign_templates
    SET name = ?, description = ?, mode = ?, config_json = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, description, mode, JSON.stringify(config), isDefault, id);

  const row = db.prepare('SELECT * FROM campaign_templates WHERE id = ?').get(id);
  res.json({ template: serializeTemplate(row) });
}));

// ── DELETE /api/templates/:id ─────────────────────────────────────────────────
templatesRouter.delete('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM campaign_templates WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Template tidak ditemukan.' });
  db.prepare('DELETE FROM campaign_templates WHERE id = ?').run(id);
  logEvent('INFO', 'Template', `Template "${row.name}" dihapus.`);
  res.json({ ok: true });
}));

// ── POST /api/templates/:id/apply — Buat campaign baru dari template ──────────
templatesRouter.post('/:id/apply', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const template = db.prepare('SELECT * FROM campaign_templates WHERE id = ?').get(id);
  if (!template) return res.status(404).json({ error: 'Template tidak ditemukan.' });

  const nameBase = String(req.body.name || `${template.name} (dari template)`).trim();

  const result = db.prepare(`
    INSERT INTO campaigns (name, mode, status, config_json)
    VALUES (?, ?, 'Draft', ?)
  `).run(nameBase, template.mode, template.config_json);

  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(result.lastInsertRowid);
  logEvent('INFO', 'Template', `Campaign "${nameBase}" dibuat dari template "${template.name}".`);
  res.status(201).json({ campaign: serializeCampaign(row) });
}));
