/**
 * Shared YouTube utility functions
 * BUG-020 FIX: getChannelTokens dipindahkan ke sini agar tidak duplikat di 3 file
 */

import { db, readJson } from '../db/database.js';
import { getActiveProject } from './youtubeQuotaTracker.js';

/**
 * Ambil token OAuth dan project credentials aktif dari tabel youtube_channels
 * @param {number|string} channelId - ID baris di tabel youtube_channels
 */
export function getChannelTokens(channelId) {
  const row = db.prepare('SELECT * FROM youtube_channels WHERE id = ?').get(Number(channelId));
  if (!row) throw new Error('YouTube channel tidak ditemukan.');

  const activeProj = getActiveProject(row.id);
  if (!activeProj) {
    throw new Error('Tidak ada Google Cloud Project yang dikonfigurasi atau sisa kuotanya habis.');
  }

  let tokenToUse = null;

  // Jika ini adalah primary project
  if (activeProj.isPrimary) {
    if (row.refresh_token) {
      tokenToUse = {
        access_token: row.access_token,
        refresh_token: row.refresh_token,
        expiry_date: row.expires_at,
        clientId: activeProj.clientId
      };
    }
  } else {
    // Cari di fallback_tokens_json
    const fallbacks = readJson(row.fallback_tokens_json, {});
    const fToken = fallbacks[activeProj.clientId];
    if (fToken && fToken.refresh_token) {
      tokenToUse = {
        access_token: fToken.access_token,
        refresh_token: fToken.refresh_token,
        expiry_date: fToken.expires_at,
        clientId: activeProj.clientId
      };
    }
  }

  if (!tokenToUse) {
    throw new Error(`Channel belum login untuk Project aktif (${activeProj.name}). Harap Otorisasi ulang channel ini di menu Settings.`);
  }

  return {
    ...tokenToUse,
    project: activeProj
  };
}
