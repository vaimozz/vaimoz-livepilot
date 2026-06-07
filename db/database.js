import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { config } from '../utils/config.js';

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
fs.mkdirSync(config.uploadDir, { recursive: true });

export const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function run(sql) {
  db.exec(sql);
}

export function initDatabase() {
  run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      original_name TEXT,
      type TEXT NOT NULL,
      mime_type TEXT,
      source TEXT NOT NULL DEFAULT 'Lokal',
      path TEXT,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      used_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'Video',
      privacy TEXT NOT NULL DEFAULT 'Private',
      item_ids_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft',
      config_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS streams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      platform TEXT NOT NULL DEFAULT 'Manual RTMP',
      status TEXT NOT NULL DEFAULT 'Offline',
      pid INTEGER,
      rtmp_url TEXT,
      youtube_broadcast_id TEXT,
      youtube_stream_id TEXT,
      youtube_watch_url TEXT,
      started_at TEXT,
      stopped_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS youtube_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      youtube_channel_id TEXT,
      title TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      expires_at INTEGER,
      avatar TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL DEFAULT 'INFO',
      source TEXT NOT NULL DEFAULT 'Aplikasi',
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS production_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Menunggu',
      progress INTEGER NOT NULL DEFAULT 0,
      config_json TEXT NOT NULL DEFAULT '{}',
      error_message TEXT,
      result_asset_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (result_asset_id) REFERENCES assets(id) ON DELETE SET NULL
    );
  `);

  seedAdmin();
  seedInitialData();
  runMigrations();
}

// BUG-M7 FIX: Bungkus semua ALTER TABLE dalam satu transaction agar migrasi parsial tidak terjadi
// ── Migrasi aman: tambahkan kolom baru tanpa merusak data lama ────────────────
function runMigrations() {
  const migrate = db.transaction(() => {
    const streamCols = db.prepare("PRAGMA table_info(streams)").all().map((c) => c.name);

    if (!streamCols.includes('chosen_video_id')) {
      db.exec('ALTER TABLE streams ADD COLUMN chosen_video_id INTEGER');
    }
    if (!streamCols.includes('chosen_thumbnail_id')) {
      db.exec('ALTER TABLE streams ADD COLUMN chosen_thumbnail_id INTEGER');
    }
    if (!streamCols.includes('chosen_title')) {
      db.exec('ALTER TABLE streams ADD COLUMN chosen_title TEXT');
    }
    if (!streamCols.includes('youtube_broadcast_id')) {
      db.exec('ALTER TABLE streams ADD COLUMN youtube_broadcast_id TEXT');
    }
    if (!streamCols.includes('youtube_stream_id')) {
      db.exec('ALTER TABLE streams ADD COLUMN youtube_stream_id TEXT');
    }
    if (!streamCols.includes('youtube_watch_url')) {
      db.exec('ALTER TABLE streams ADD COLUMN youtube_watch_url TEXT');
    }
    
    // Chatbot columns
    if (!streamCols.includes('youtube_live_chat_id')) {
      db.exec('ALTER TABLE streams ADD COLUMN youtube_live_chat_id TEXT');
    }
    if (!streamCols.includes('chatbot_status')) {
      db.exec('ALTER TABLE streams ADD COLUMN chatbot_status TEXT DEFAULT "inactive"');
    }
    if (!streamCols.includes('chatbot_started_at')) {
      db.exec('ALTER TABLE streams ADD COLUMN chatbot_started_at TEXT');
    }
    if (!streamCols.includes('chatbot_stopped_at')) {
      db.exec('ALTER TABLE streams ADD COLUMN chatbot_stopped_at TEXT');
    }
    if (!streamCols.includes('chatbot_message_count')) {
      db.exec('ALTER TABLE streams ADD COLUMN chatbot_message_count INTEGER DEFAULT 0');
    }
    if (!streamCols.includes('chatbot_last_message')) {
      db.exec('ALTER TABLE streams ADD COLUMN chatbot_last_message TEXT');
    }
    
    // Analytics columns
    if (!streamCols.includes('youtube_concurrent_viewers')) {
      db.exec('ALTER TABLE streams ADD COLUMN youtube_concurrent_viewers INTEGER DEFAULT 0');
    }
    if (!streamCols.includes('youtube_total_views')) {
      db.exec('ALTER TABLE streams ADD COLUMN youtube_total_views INTEGER DEFAULT 0');
    }
    if (!streamCols.includes('youtube_likes')) {
      db.exec('ALTER TABLE streams ADD COLUMN youtube_likes INTEGER DEFAULT 0');
    }
    if (!streamCols.includes('youtube_comments')) {
      db.exec('ALTER TABLE streams ADD COLUMN youtube_comments INTEGER DEFAULT 0');
    }
    if (!streamCols.includes('youtube_stats_updated_at')) {
      db.exec('ALTER TABLE streams ADD COLUMN youtube_stats_updated_at TEXT');
    }
    
    // Smart stop columns
    if (!streamCols.includes('smart_stop_delayed_until')) {
      db.exec('ALTER TABLE streams ADD COLUMN smart_stop_delayed_until TEXT');
    }
    if (!streamCols.includes('smart_stop_reason')) {
      db.exec('ALTER TABLE streams ADD COLUMN smart_stop_reason TEXT');
    }

    // Recurring schedule columns for campaigns
    const campaignCols = db.prepare("PRAGMA table_info(campaigns)").all().map((c) => c.name);
    
    if (!campaignCols.includes('recurring_enabled')) {
      db.exec('ALTER TABLE campaigns ADD COLUMN recurring_enabled INTEGER DEFAULT 0');
    }
    if (!campaignCols.includes('recurring_type')) {
      db.exec('ALTER TABLE campaigns ADD COLUMN recurring_type TEXT DEFAULT "once"');
    }
    if (!campaignCols.includes('recurring_days_json')) {
      db.exec('ALTER TABLE campaigns ADD COLUMN recurring_days_json TEXT DEFAULT "[]"');
    }
    if (!campaignCols.includes('recurring_time')) {
      db.exec('ALTER TABLE campaigns ADD COLUMN recurring_time TEXT');
    }
    if (!campaignCols.includes('recurring_duration_mode')) {
      db.exec('ALTER TABLE campaigns ADD COLUMN recurring_duration_mode TEXT DEFAULT "fixed"');
    }
    if (!campaignCols.includes('recurring_duration_minutes')) {
      db.exec('ALTER TABLE campaigns ADD COLUMN recurring_duration_minutes INTEGER');
    }
    if (!campaignCols.includes('recurring_duration_min')) {
      db.exec('ALTER TABLE campaigns ADD COLUMN recurring_duration_min INTEGER');
    }
    if (!campaignCols.includes('recurring_duration_max')) {
      db.exec('ALTER TABLE campaigns ADD COLUMN recurring_duration_max INTEGER');
    }
    if (!campaignCols.includes('recurring_end_date')) {
      db.exec('ALTER TABLE campaigns ADD COLUMN recurring_end_date TEXT');
    }
    if (!campaignCols.includes('recurring_timezone')) {
      db.exec('ALTER TABLE campaigns ADD COLUMN recurring_timezone TEXT DEFAULT "Asia/Jakarta"');
    }
    if (!campaignCols.includes('last_executed_at')) {
      db.exec('ALTER TABLE campaigns ADD COLUMN last_executed_at TEXT');
    }
    if (!campaignCols.includes('next_execution_at')) {
      db.exec('ALTER TABLE campaigns ADD COLUMN next_execution_at TEXT');
    }
    if (!campaignCols.includes('execution_count')) {
      db.exec('ALTER TABLE campaigns ADD COLUMN execution_count INTEGER DEFAULT 0');
    }

    // Create recurring_history table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS recurring_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL,
        executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'success',
        duration_minutes INTEGER,
        error_message TEXT,
        stream_id INTEGER,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      );
    `);

    // Create production_jobs table if not exists (for migration of existing dbs)
    db.exec(`
      CREATE TABLE IF NOT EXISTS production_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Menunggu',
        progress INTEGER NOT NULL DEFAULT 0,
        config_json TEXT NOT NULL DEFAULT '{}',
        error_message TEXT,
        result_asset_id INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (result_asset_id) REFERENCES assets(id) ON DELETE SET NULL
      );
    `);
  });

  // Jalankan seluruh migrasi dalam satu transaction atomik
  migrate();
}

function seedAdmin() {
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(config.adminUsername);
  if (exists) return;
  const passwordHash = bcrypt.hashSync(config.adminPassword, 10);
  db.prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)')
    .run(config.adminUsername, passwordHash, config.adminDisplayName);
}

function seedInitialData() {
  // Tidak ada seed data dummy untuk aset, playlist, channel, atau campaign.
  // Admin default tetap dibuat oleh seedAdmin(), sedangkan data aplikasi wajib berasal dari upload/OAuth/API nyata.
  removeLegacySampleData();
}

function removeLegacySampleData() {
  const sampleAssetNames = [
    'rainy-night-thumb-01.png',
    'quran-live-thumb-04.jpg',
    'rainy-night-city-loop.mp4',
    'mulk-surah-loop.mp4',
  ];
  const samplePlaylistNames = [
    'Relaxing Live Collection',
    'Quran & Ambient Live',
    'Deep Night Confidence',
  ];

  const deleteSampleAsset = db.prepare("DELETE FROM assets WHERE name = ?");
  for (const name of sampleAssetNames) deleteSampleAsset.run(name);

  const deleteSamplePlaylist = db.prepare("DELETE FROM playlists WHERE name = ?");
  for (const name of samplePlaylistNames) deleteSamplePlaylist.run(name);

  const sampleCampaignNames = ['Quran Live Uzbekistan', 'Cinematic Rainy Night', 'Alba Soundscape Live'];
  const deleteSampleCampaign = db.prepare("DELETE FROM campaigns WHERE name = ?");
  for (const name of sampleCampaignNames) deleteSampleCampaign.run(name);

  db.prepare("DELETE FROM youtube_channels WHERE youtube_channel_id LIKE 'mock-%' OR title IN ('Safa Soundscape', 'INTIMATE BLISS STUDIO', 'ANC OldSoul', 'Vaimoz Channel 1')").run();
}

export function logEvent(level, source, message) {
  db.prepare('INSERT INTO logs (level, source, message) VALUES (?, ?, ?)').run(level, source, message);
}

export function readJson(value, fallback = {}) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(value) {
  return JSON.stringify(value ?? {});
}
