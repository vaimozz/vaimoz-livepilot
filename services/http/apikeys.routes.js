import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const apikeysRouter = Router();
apikeysRouter.use(requireAuth);

const VALID_PERMISSIONS = ['read', 'write'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function serializeApiKey(row, includePlainKey = null) {
  const obj = {
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    permissions: (() => { try { return JSON.parse(row.permissions_json); } catch { return ['read']; } })(),
    lastUsedAt: row.last_used_at || null,
    expiresAt: row.expires_at || null,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  // Key plaintext hanya dikembalikan saat pertama kali dibuat
  if (includePlainKey) {
    obj.key = includePlainKey;
    obj._warning = 'Simpan key ini sekarang. Key tidak bisa dilihat lagi setelah halaman ini ditutup.';
  }
  return obj;
}

// ── GET /api/apikeys ──────────────────────────────────────────────────────────
apikeysRouter.get('/', asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all();
  res.json({ ok: true, apiKeys: rows.map((r) => serializeApiKey(r)) });
}));

// ── POST /api/apikeys ─────────────────────────────────────────────────────────
apikeysRouter.post('/', asyncHandler(async (req, res) => {
  const { name, permissions = ['read'], expiresAt = null } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Nama API key wajib diisi.' });
  }
  const validPerms = permissions.filter((p) => VALID_PERMISSIONS.includes(p));
  if (validPerms.length === 0) {
    return res.status(400).json({ error: 'Pilih minimal satu permission: read atau write.' });
  }

  // Generate key: vaimoz_ + 32 hex chars
  const randomHex = crypto.randomBytes(16).toString('hex'); // 32 hex chars
  const plainKey = `vaimoz_${randomHex}`;
  const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');
  const keyPrefix = plainKey.slice(0, 15); // "vaimoz_" + 8 hex = 15 chars

  // Validasi expiresAt jika diberikan
  let expiresAtValue = null;
  if (expiresAt) {
    const d = new Date(expiresAt);
    if (isNaN(d.getTime())) return res.status(400).json({ error: 'Format tanggal kedaluwarsa tidak valid.' });
    if (d <= new Date()) return res.status(400).json({ error: 'Tanggal kedaluwarsa harus di masa depan.' });
    expiresAtValue = d.toISOString();
  }

  const result = db.prepare(`
    INSERT INTO api_keys (name, key_hash, key_prefix, permissions_json, expires_at, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(name.trim(), keyHash, keyPrefix, JSON.stringify(validPerms), expiresAtValue);

  const row = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ok: true, apiKey: serializeApiKey(row, plainKey) });
}));

// ── PATCH /api/apikeys/:id ────────────────────────────────────────────────────
apikeysRouter.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(Number(id));
  if (!existing) return res.status(404).json({ error: 'API key tidak ditemukan.' });

  const { name, permissions, isActive } = req.body;

  const newName = name !== undefined ? name.trim() : existing.name;
  if (!newName) return res.status(400).json({ error: 'Nama tidak boleh kosong.' });

  let permissionsJson = existing.permissions_json;
  if (permissions !== undefined) {
    const validPerms = permissions.filter((p) => VALID_PERMISSIONS.includes(p));
    if (validPerms.length === 0) return res.status(400).json({ error: 'Pilih minimal satu permission.' });
    permissionsJson = JSON.stringify(validPerms);
  }

  const newIsActive = isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active;

  db.prepare(`
    UPDATE api_keys SET name=?, permissions_json=?, is_active=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(newName, permissionsJson, newIsActive, Number(id));

  const row = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(Number(id));
  res.json({ ok: true, apiKey: serializeApiKey(row) });
}));

// ── DELETE /api/apikeys/:id (revoke) ─────────────────────────────────────────
apikeysRouter.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM api_keys WHERE id = ?').get(Number(id));
  if (!existing) return res.status(404).json({ error: 'API key tidak ditemukan.' });

  db.prepare('DELETE FROM api_keys WHERE id = ?').run(Number(id));
  res.json({ ok: true });
}));
