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
  `);

  seedAdmin();
  seedInitialData();
  runMigrations();
}

// ── Migrasi aman: tambahkan kolom baru tanpa merusak data lama ────────────────
function runMigrations() {
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
