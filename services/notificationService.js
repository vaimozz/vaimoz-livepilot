/**
 * Notification Service — Simpan notifikasi in-app ke database.
 * Dipanggil dari ffmpegRunner.js, youtubeLiveService.js, youtubeAnalyticsService.js
 */

import { db, logEvent } from '../db/database.js';

/**
 * Buat notifikasi baru di tabel notifications.
 * @param {string} type - 'stream_start'|'stream_stop'|'stream_error'|'broadcast_live'|'viewer_milestone'|'smart_stop'|'system'
 * @param {string} title
 * @param {string} message
 * @param {object} data - extra data (streamId, campaignName, dll)
 */
export function createNotification(type, title, message, data = {}) {
  try {
    db.prepare(`
      INSERT INTO notifications (type, title, message, data_json)
      VALUES (?, ?, ?, ?)
    `).run(type, title, message, JSON.stringify(data));
  } catch (err) {
    logEvent('WARN', 'NotificationService', `Gagal membuat notifikasi: ${err.message}`);
  }
}

/**
 * Bersihkan notifikasi lama (lebih dari 30 hari) agar database tidak membengkak.
 */
export function pruneOldNotifications() {
  try {
    db.prepare(`
      DELETE FROM notifications
      WHERE created_at < datetime('now', '-30 days')
    `).run();
  } catch (err) {
    logEvent('WARN', 'NotificationService', `Gagal pruning notifikasi lama: ${err.message}`);
  }
}
