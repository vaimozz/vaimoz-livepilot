/**
 * Migrasi: Perbaiki config_json campaign yang menyimpan channelId → youtubeChannelId
 * Jalankan sekali di VPS: node scripts/fix-campaign-config.js
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

const Database = require('better-sqlite3');
const db = new Database(DB_PATH);

const rows = db.prepare('SELECT id, name, config_json FROM campaigns').all();
let fixed = 0;

for (const row of rows) {
  let cfg = {};
  try { cfg = JSON.parse(row.config_json || '{}'); } catch { continue; }

  let changed = false;

  // Fix: channelId → youtubeChannelId
  if (cfg.channelId && !cfg.youtubeChannelId) {
    cfg.youtubeChannelId = cfg.channelId;
    changed = true;
    console.log(`[Campaign #${row.id} "${row.name}"] channelId "${cfg.channelId}" → youtubeChannelId`);
  }

  // Fix: playlist → youtubePlaylist + youtubePlaylistId
  if (cfg.playlist && !cfg.youtubePlaylist) {
    cfg.youtubePlaylist = cfg.playlist;
    cfg.youtubePlaylistId = cfg.playlist?.id || cfg.youtubePlaylistId || '';
    changed = true;
    console.log(`[Campaign #${row.id} "${row.name}"] playlist → youtubePlaylist`);
  }

  // Fix: liveTitles → youtubeLiveTitles
  if (cfg.liveTitles && !cfg.youtubeLiveTitles) {
    cfg.youtubeLiveTitles = cfg.liveTitles;
    changed = true;
    console.log(`[Campaign #${row.id} "${row.name}"] liveTitles → youtubeLiveTitles`);
  }

  if (changed) {
    db.prepare('UPDATE campaigns SET config_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(cfg), row.id);
    fixed++;
  }
}

console.log(`\n✅ Selesai. ${fixed} dari ${rows.length} kampanye diperbaiki.`);

// Juga re-register semua scheduled campaigns
const scheduled = db.prepare("SELECT id, name FROM campaigns WHERE status = 'Scheduled'").all();
console.log(`\n📅 Campaign terjadwal ditemukan: ${scheduled.length}`);
scheduled.forEach(c => console.log(`  - #${c.id} ${c.name}`));
console.log('\nJalankan "pm2 restart vaimoz-livepilot" setelah script ini selesai.\n');

db.close();
