/**
 * Backup & Restore Routes — /api/backup
 */

import { Router } from 'express';
import { db, logEvent, readJson, writeJson } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import fs from 'node:fs';

export const backupRouter = Router();
backupRouter.use(requireAuth);

// Kunci settings sensitif yang TIDAK boleh di-export atau di-overwrite saat import
const SENSITIVE_SETTINGS = new Set([
  'telegram_bot_token',
  'google_client_secret',
  'gemini_api_key',
]);

// ── GET /api/backup/export — Download backup JSON ────────────────────────────
backupRouter.get('/export', asyncHandler(async (req, res) => {
  const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY id').all().map((row) => ({
    id: row.id,
    name: row.name,
    mode: row.mode,
    status: row.status,
    config: readJson(row.config_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const playlists = db.prepare('SELECT * FROM playlists ORDER BY id').all().map((row) => ({
    id: row.id,
    channelId: row.channel_id,
    name: row.name,
    type: row.type,
    privacy: row.privacy,
    itemIds: readJson(row.item_ids_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  // Settings: filter sensitif
  const settingsRows = db.prepare('SELECT key, value FROM settings ORDER BY key').all();
  const settings = settingsRows
    .filter((row) => !SENSITIVE_SETTINGS.has(row.key))
    .map((row) => ({ key: row.key, value: row.value }));

  // YouTube channels: tanpa token
  const youtubeChannels = db.prepare('SELECT id, youtube_channel_id, title, avatar, is_default FROM youtube_channels ORDER BY id').all().map((row) => ({
    id: row.id,
    youtubeChannelId: row.youtube_channel_id,
    title: row.title,
    avatar: row.avatar,
    isDefault: Boolean(row.is_default),
  }));

  const backup = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    app: 'Vaimoz LivePilot v0.3.1',
    data: {
      campaigns,
      playlists,
      settings,
      youtube_channels: youtubeChannels,
    },
    stats: {
      campaigns: campaigns.length,
      playlists: playlists.length,
      settings: settings.length,
    },
  };

  const dateStr = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Disposition', `attachment; filename=vaimoz-backup-${dateStr}.json`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(backup, null, 2));

  logEvent('INFO', 'Backup', `Backup berhasil diekspor: ${campaigns.length} campaign, ${playlists.length} playlist, ${settings.length} settings.`);
}));

// ── POST /api/backup/import — Upload & restore backup JSON ───────────────────
backupRouter.post('/import', asyncHandler(async (req, res) => {
  const backup = req.body;

  // Validasi struktur
  if (!backup || typeof backup !== 'object') {
    return res.status(400).json({ error: 'Body request harus berupa JSON backup yang valid.' });
  }
  if (!backup.version || !backup.data) {
    return res.status(400).json({ error: 'Format backup tidak valid. Pastikan file memiliki field "version" dan "data".' });
  }

  const { campaigns = [], playlists = [], settings = [], youtube_channels = [] } = backup.data;
  let imported = { campaigns: 0, playlists: 0, settings: 0 };

  const doImport = db.transaction(() => {
    // Import campaigns — dedup by name
    for (const c of campaigns) {
      if (!c.name) continue;
      const existing = db.prepare('SELECT id FROM campaigns WHERE name = ?').get(c.name);
      if (existing) {
        db.prepare('UPDATE campaigns SET mode = ?, status = ?, config_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(c.mode || 'YouTube API', c.status || 'Draft', writeJson(c.config || {}), existing.id);
      } else {
        db.prepare('INSERT INTO campaigns (name, mode, status, config_json) VALUES (?, ?, ?, ?)')
          .run(c.name, c.mode || 'YouTube API', c.status || 'Draft', writeJson(c.config || {}));
      }
      imported.campaigns++;
    }

    // Import playlists — dedup by name
    for (const p of playlists) {
      if (!p.name) continue;
      const existing = db.prepare('SELECT id FROM playlists WHERE name = ?').get(p.name);
      if (existing) {
        db.prepare('UPDATE playlists SET channel_id = ?, type = ?, privacy = ?, item_ids_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(p.channelId || null, p.type || 'Video', p.privacy || 'Private', JSON.stringify(p.itemIds || []), existing.id);
      } else {
        db.prepare('INSERT INTO playlists (channel_id, name, type, privacy, item_ids_json) VALUES (?, ?, ?, ?, ?)')
          .run(p.channelId || null, p.name, p.type || 'Video', p.privacy || 'Private', JSON.stringify(p.itemIds || []));
      }
      imported.playlists++;
    }

    // Import settings — skip sensitif, upsert yang lain
    for (const s of settings) {
      if (!s.key || SENSITIVE_SETTINGS.has(s.key)) continue;
      db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run(s.key, String(s.value ?? ''));
      imported.settings++;
    }
  });

  doImport();

  logEvent('INFO', 'Backup', `Import berhasil: ${imported.campaigns} campaign, ${imported.playlists} playlist, ${imported.settings} settings.`);
  res.json({
    ok: true,
    message: 'Backup berhasil dipulihkan.',
    imported,
  });
}));

// ── GET /api/backup/status — Info database ───────────────────────────────────
backupRouter.get('/status', asyncHandler(async (req, res) => {
  const campaignCount = db.prepare('SELECT COUNT(*) as count FROM campaigns').get().count;
  const playlistCount = db.prepare('SELECT COUNT(*) as count FROM playlists').get().count;
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get().count;
  const assetCount = db.prepare('SELECT COUNT(*) as count FROM assets').get().count;
  const streamCount = db.prepare('SELECT COUNT(*) as count FROM streams').get().count;

  // Ukuran file database
  let dbSizeBytes = 0;
  try {
    const { config } = await import('../../utils/config.js');
    const stat = fs.statSync(config.databasePath);
    dbSizeBytes = stat.size;
  } catch { /* ok */ }

  res.json({
    counts: {
      campaigns: campaignCount,
      playlists: playlistCount,
      settings: settingsCount,
      assets: assetCount,
      streams: streamCount,
    },
    dbSizeBytes,
    dbSizeMb: (dbSizeBytes / 1024 / 1024).toFixed(2),
  });
}));
