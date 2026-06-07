import crypto from 'node:crypto';
import { db, logEvent } from '../db/database.js';

/**
 * Daftar event yang didukung oleh webhook outbound.
 */
export const SUPPORTED_EVENTS = [
  'stream.start',
  'stream.stop',
  'stream.error',
  'broadcast.live',
  'viewer.milestone',
  'campaign.scheduled',
  'campaign.completed',
];

/**
 * Kirim payload ke semua webhook aktif yang subscribe ke eventType.
 * Fire-and-forget — tidak memblok pemanggil.
 *
 * @param {string} eventType - Salah satu dari SUPPORTED_EVENTS
 * @param {object} data      - Data tambahan yang dikirim bersama payload
 */
export function triggerWebhooks(eventType, data = {}) {
  // Jalankan secara async tanpa blok pemanggil
  _dispatchWebhooks(eventType, data).catch((err) => {
    logEvent('ERROR', 'Webhook', `triggerWebhooks error [${eventType}]: ${err.message}`);
  });
}

async function _dispatchWebhooks(eventType, data) {
  let webhooks;
  try {
    webhooks = db
      .prepare("SELECT * FROM webhooks WHERE is_active = 1")
      .all();
  } catch (err) {
    // Tabel mungkin belum ada (migrasi belum jalan)
    return;
  }

  // Filter webhook yang subscribe ke eventType ini
  const targets = webhooks.filter((wh) => {
    try {
      const events = JSON.parse(wh.events_json || '[]');
      return Array.isArray(events) && (events.includes('*') || events.includes(eventType));
    } catch {
      return false;
    }
  });

  if (targets.length === 0) return;

  const payload = JSON.stringify({
    event: eventType,
    timestamp: new Date().toISOString(),
    data,
  });

  const fetchPromises = targets.map(async (wh) => {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Vaimoz-LivePilot-Webhook/1.0',
    };

    // Tambahkan signature HMAC jika ada secret
    if (wh.secret) {
      const hmac = crypto.createHmac('sha256', wh.secret).update(payload).digest('hex');
      headers['X-Vaimoz-Signature'] = `sha256=${hmac}`;
    }

    let httpStatus = null;
    try {
      const { default: nodeFetch } = await import('node-fetch');
      const res = await nodeFetch(wh.url, {
        method: 'POST',
        headers,
        body: payload,
        timeout: 10000,
      });
      httpStatus = res.status;
      logEvent('INFO', 'Webhook', `Webhook #${wh.id} "${wh.name}" → ${wh.url} [${httpStatus}]`);
    } catch (err) {
      httpStatus = 0;
      logEvent('WARN', 'Webhook', `Webhook #${wh.id} "${wh.name}" gagal: ${err.message}`);
    }

    // Update last_triggered_at dan last_status
    try {
      db.prepare(
        'UPDATE webhooks SET last_triggered_at = CURRENT_TIMESTAMP, last_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(httpStatus, wh.id);
    } catch (dbErr) {
      // Abaikan error DB agar tidak mengganggu alur utama
    }
  });

  await Promise.allSettled(fetchPromises);
}
