import crypto from 'node:crypto';
import { db } from '../db/database.js';

/**
 * Middleware opsional: autentikasi via API Key (header X-Api-Key atau query ?api_key=).
 * Jika key tidak ada → next() (lanjut ke JWT check).
 * Jika key ada tapi invalid → 401.
 * Jika key valid → set req.user dan req.apiKey, lanjut next().
 */
export async function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  // Tidak ada API key → lewati, biarkan middleware JWT berikutnya yang menangani
  if (!apiKey) return next();

  // Hash key dan cari di database
  const hash = crypto.createHash('sha256').update(String(apiKey)).digest('hex');

  let keyRow;
  try {
    keyRow = db.prepare('SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1').get(hash);
  } catch {
    // Tabel belum ada (migrasi belum jalan) → lewati
    return next();
  }

  if (!keyRow) {
    return res.status(401).json({ error: 'API key tidak valid.' });
  }

  // Cek expiry
  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
    return res.status(401).json({ error: 'API key sudah kedaluwarsa.' });
  }

  // Update last_used_at (fire-and-forget)
  try {
    db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(keyRow.id);
  } catch { /* abaikan */ }

  // Inject minimal user context
  req.user = { id: 1, username: 'api', display_name: 'API Key Auth' };
  req.apiKey = keyRow;

  next();
}
