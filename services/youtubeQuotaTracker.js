import { db, logEvent, readJson } from '../db/database.js';

const DAILY_LIMIT = 10000;
const SAFE_LIMIT = 9800; // Leave 200 quota margin to be safe

function getTodayDateString() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

export function consumeQuota(clientId, amount) {
  if (!clientId || amount <= 0) return;
  const date = getTodayDateString();
  
  try {
    db.prepare(`
      INSERT INTO youtube_quota_usage (client_id, date, quota_used)
      VALUES (?, ?, ?)
      ON CONFLICT(client_id, date) DO UPDATE SET
        quota_used = quota_used + ?,
        updated_at = CURRENT_TIMESTAMP
    `).run(clientId, date, amount, amount);
  } catch (error) {
    logEvent('WARN', 'YouTube Quota', `Gagal mencatat kuota: ${error.message}`);
  }
}

export function getQuotaUsage(clientId) {
  const date = getTodayDateString();
  try {
    const row = db.prepare('SELECT quota_used FROM youtube_quota_usage WHERE client_id = ? AND date = ?').get(clientId, date);
    return row ? row.quota_used : 0;
  } catch {
    return 0;
  }
}

export function getAllConfiguredProjects() {
  const projects = [];
  
  // 1. Get primary from settings
  try {
    const mainClientId = db.prepare("SELECT value FROM settings WHERE key = 'google_client_id'").get()?.value;
    const mainSecret = db.prepare("SELECT value FROM settings WHERE key = 'google_client_secret'").get()?.value;
    if (mainClientId && mainSecret) {
      projects.push({
        clientId: mainClientId,
        clientSecret: mainSecret,
        redirectUri: db.prepare("SELECT value FROM settings WHERE key = 'google_redirect_uri'").get()?.value || 'http://localhost:3000/api/youtube/callback',
        isPrimary: true,
        name: 'Primary Project'
      });
    }
  } catch (e) {}

  // 2. Get fallback from settings
  try {
    const fallbacksStr = db.prepare("SELECT value FROM settings WHERE key = 'google_fallback_projects'").get()?.value;
    const fallbacks = readJson(fallbacksStr, []);
    fallbacks.forEach((f, i) => {
      if (f.clientId && f.clientSecret) {
        projects.push({
          clientId: f.clientId,
          clientSecret: f.clientSecret,
          redirectUri: f.redirectUri || 'http://localhost:3000/api/youtube/callback',
          isPrimary: false,
          name: f.name || `Fallback Project ${i + 1}`
        });
      }
    });
  } catch (e) {}

  return projects;
}

export function getActiveProject(channelId = null) {
  const projects = getAllConfiguredProjects();
  if (projects.length === 0) return null;

  // If a specific channelId is given, we should only consider projects that the channel has tokens for!
  let availableTokens = {};
  if (channelId) {
    try {
      const channel = db.prepare('SELECT access_token, refresh_token, fallback_tokens_json FROM youtube_channels WHERE youtube_channel_id = ?').get(channelId);
      if (channel) {
        const fallbacks = readJson(channel.fallback_tokens_json, {});
        // Primary project token
        if (channel.refresh_token && projects[0]) {
           availableTokens[projects[0].clientId] = { refresh_token: channel.refresh_token, access_token: channel.access_token };
        }
        Object.assign(availableTokens, fallbacks);
      }
    } catch(e) {}
  }

  for (const proj of projects) {
    // If channelId is provided, skip projects that don't have a valid refresh token for this channel
    if (channelId && !availableTokens[proj.clientId]?.refresh_token) {
      continue;
    }

    const used = getQuotaUsage(proj.clientId);
    if (used < SAFE_LIMIT) {
      return proj;
    }
  }
  
  // If all exhausted (or no tokens available), just return the primary project and hope for the best
  return projects[0];
}

export function getProjectByClientId(clientId) {
  return getAllConfiguredProjects().find(p => p.clientId === clientId);
}

// Helper to manually mark quota as exhausted immediately (when 403 occurs)
export function markQuotaExhausted(clientId) {
  const date = getTodayDateString();
  try {
    db.prepare(`
      INSERT INTO youtube_quota_usage (client_id, date, quota_used)
      VALUES (?, ?, ?)
      ON CONFLICT(client_id, date) DO UPDATE SET
        quota_used = ?,
        updated_at = CURRENT_TIMESTAMP
    `).run(clientId, date, DAILY_LIMIT, DAILY_LIMIT);
    logEvent('WARN', 'YouTube Quota', `Project ${clientId} ditandai Quota Exhausted (10000)`);
  } catch (e) {}
}
