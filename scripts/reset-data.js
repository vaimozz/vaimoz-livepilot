import fs from 'node:fs';
import path from 'node:path';
import { db, initDatabase } from '../db/database.js';
import { config } from '../utils/config.js';

initDatabase();

const tables = [
  'assets',
  'playlists',
  'campaigns',
  'streams',
  'youtube_channels',
  'settings',
  'logs',
  'notifications',
  'webhooks',
  'api_keys',
  'campaign_templates',
  'recurring_history',
  'production_jobs',
];

const transaction = db.transaction(() => {
  for (const table of tables) db.prepare(`DELETE FROM ${table}`).run();
});
transaction();

if (fs.existsSync(config.uploadDir)) {
  for (const entry of fs.readdirSync(config.uploadDir)) {
    if (entry === '.gitkeep') continue;
    fs.rmSync(path.join(config.uploadDir, entry), { recursive: true, force: true });
  }
}

console.log('Data aplikasi berhasil dibersihkan. User/admin tetap dipertahankan.');
