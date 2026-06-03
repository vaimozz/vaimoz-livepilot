/**
 * Shared YouTube utility functions
 * BUG-020 FIX: getChannelTokens dipindahkan ke sini agar tidak duplikat di 3 file
 */

import { db } from '../db/database.js';

/**
 * Ambil token OAuth dari tabel youtube_channels
 * @param {number|string} channelId - ID baris di tabel youtube_channels (bukan youtube_channel_id)
 */
export function getChannelTokens(channelId) {
  const row = db.prepare('SELECT * FROM youtube_channels WHERE id = ?').get(Number(channelId));
  if (!row) throw new Error('YouTube channel tidak ditemukan.');
  if (!row.access_token && !row.refresh_token) {
    throw new Error('Channel belum punya OAuth token. Sambungkan channel dulu via Settings.');
  }
  return {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: row.expires_at,
  };
}
