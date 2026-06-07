import { Router } from 'express';
import { db } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { SUPPORTED_EVENTS } from '../webhookService.js';

export const webhooksRouter = Router();
webhooksRouter.use(requireAuth);

// ── Helpers ───────────────────────────────────────────────────────────────────
function serializeWebhook(row) {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    events: (() => { try { return JSON.parse(row.events_json); } catch { return []; } })(),
    hasSecret: Boolean(row.secret),
    isActive: row.is_active === 1,
    lastTriggeredAt: row.last_triggered_at || null,
    lastStatus: row.last_status ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateWebhookPayload({ name, url, events }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'Nama webhook wajib diisi.';
  }
  if (!url || typeof url !== 'string' || !url.trim()) {
    return 'URL webhook wajib diisi.';
  }
  try { new URL(url); } catch { return 'URL webhook tidak valid.'; }
  if (!Array.isArray(events) || events.length === 0) {
    return 'Pilih minimal satu event untuk webhook.';
  }
  const invalid = events.filter((e) => !SUPPORTED_EVENTS.includes(e) && e !== '*');
  if (invalid.length > 0) {
    return `Event tidak dikenal: ${invalid.join(', ')}`;
  }
  return null;
}

// ── GET /api/webhooks ─────────────────────────────────────────────────────────
webhooksRouter.get('/', asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT * FROM webhooks ORDER BY created_at DESC').all();
  res.json({ ok: true, webhooks: rows.map(serializeWebhook), supportedEvents: SUPPORTED_EVENTS });
}));

// ── POST /api/webhooks ────────────────────────────────────────────────────────
webhooksRouter.post('/', asyncHandler(async (req, res) => {
  const { name, url, events = [], secret = '', isActive = true } = req.body;

  const error = validateWebhookPayload({ name, url, events });
  if (error) return res.status(400).json({ error });

  const result = db.prepare(`
    INSERT INTO webhooks (name, url, events_json, secret, is_active)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    name.trim(),
    url.trim(),
    JSON.stringify(events),
    secret ? secret.trim() : null,
    isActive ? 1 : 0,
  );

  const row = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ok: true, webhook: serializeWebhook(row) });
}));

// ── PATCH /api/webhooks/:id ───────────────────────────────────────────────────
webhooksRouter.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(Number(id));
  if (!existing) return res.status(404).json({ error: 'Webhook tidak ditemukan.' });

  const {
    name = existing.name,
    url = existing.url,
    events,
    secret,
    isActive,
  } = req.body;

  const parsedEvents = events ?? (() => { try { return JSON.parse(existing.events_json); } catch { return []; } })();

  const error = validateWebhookPayload({ name, url, events: parsedEvents });
  if (error) return res.status(400).json({ error });

  db.prepare(`
    UPDATE webhooks SET name=?, url=?, events_json=?, secret=?, is_active=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(
    name.trim(),
    url.trim(),
    JSON.stringify(parsedEvents),
    secret !== undefined ? (secret ? secret.trim() : null) : existing.secret,
    isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active,
    Number(id),
  );

  const row = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(Number(id));
  res.json({ ok: true, webhook: serializeWebhook(row) });
}));

// ── DELETE /api/webhooks/:id ──────────────────────────────────────────────────
webhooksRouter.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM webhooks WHERE id = ?').get(Number(id));
  if (!existing) return res.status(404).json({ error: 'Webhook tidak ditemukan.' });

  db.prepare('DELETE FROM webhooks WHERE id = ?').run(Number(id));
  res.json({ ok: true });
}));

// ── POST /api/webhooks/:id/test ───────────────────────────────────────────────
webhooksRouter.post('/:id/test', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const wh = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(Number(id));
  if (!wh) return res.status(404).json({ error: 'Webhook tidak ditemukan.' });

  const payload = JSON.stringify({
    event: 'webhook.test',
    timestamp: new Date().toISOString(),
    data: { message: 'Ini adalah test payload dari Vaimoz LivePilot.', webhookId: wh.id, webhookName: wh.name },
  });

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Vaimoz-LivePilot-Webhook/1.0',
  };

  if (wh.secret) {
    const crypto = await import('node:crypto');
    const hmac = crypto.default.createHmac('sha256', wh.secret).update(payload).digest('hex');
    headers['X-Vaimoz-Signature'] = `sha256=${hmac}`;
  }

  let httpStatus = null;
  let errorMessage = null;
  try {
    const { default: nodeFetch } = await import('node-fetch');
    const response = await nodeFetch(wh.url, { method: 'POST', headers, body: payload, timeout: 10000 });
    httpStatus = response.status;
  } catch (err) {
    errorMessage = err.message;
    httpStatus = 0;
  }

  // Update status
  db.prepare('UPDATE webhooks SET last_triggered_at=CURRENT_TIMESTAMP, last_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(httpStatus, Number(id));

  if (errorMessage) {
    return res.status(502).json({ ok: false, error: `Gagal menghubungi URL webhook: ${errorMessage}`, status: httpStatus });
  }

  res.json({ ok: true, status: httpStatus, message: `Test berhasil dikirim. HTTP ${httpStatus}.` });
}));
