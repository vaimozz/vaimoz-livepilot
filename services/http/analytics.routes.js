import { Router } from 'express';
import { db } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { serializeStream } from '../../utils/serializers.js';

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

// GET /api/analytics
analyticsRouter.get('/', asyncHandler(async (req, res) => {
  const campaignId = req.query.campaignId ? Number(req.query.campaignId) : null;
  const platform = req.query.platform ? String(req.query.platform).trim() : '';
  const period = req.query.period ? String(req.query.period).trim() : '';

  let sql = `
    SELECT s.*, c.name as campaign_name, c.config_json as campaign_config
    FROM streams s 
    LEFT JOIN campaigns c ON s.campaign_id = c.id
  `;
  
  const conditions = [];
  const queryParams = [];

  if (campaignId) {
    conditions.push('s.campaign_id = ?');
    queryParams.push(campaignId);
  }
  
  if (platform && platform !== 'Semua Platform') {
    conditions.push('s.platform = ?');
    queryParams.push(platform);
  }

  if (period) {
    if (period === '7 Hari Terakhir') {
      conditions.push("s.created_at >= datetime('now', '-7 days')");
    } else if (period === '28 Hari Terakhir') {
      conditions.push("s.created_at >= datetime('now', '-28 days')");
    } else if (period === '90 Hari Terakhir') {
      conditions.push("s.created_at >= datetime('now', '-90 days')");
    } else if (period === '12 Bulan Terakhir') {
      conditions.push("s.created_at >= datetime('now', '-1 year')");
    }
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  sql += ' ORDER BY s.created_at DESC';

  const rows = db.prepare(sql).all(...queryParams);

  // Ambil list campaign untuk filter dropdown
  const campaignsList = db.prepare('SELECT id, name FROM campaigns ORDER BY name ASC').all();

  // Mapping channel name
  const channelsList = db.prepare('SELECT youtube_channel_id, title FROM youtube_channels').all();
  const channelMap = {};
  channelsList.forEach(ch => channelMap[ch.youtube_channel_id] = ch.title);

  // 1. Hitung Ringkasan (Summary)
  let totalViews = 0;
  let peakViewers = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalDurationMinutes = 0;
  let completedStreamsCount = 0;

  rows.forEach(s => {
    totalViews += s.youtube_total_views || 0;
    peakViewers = Math.max(peakViewers, s.youtube_concurrent_viewers || 0);
    totalLikes += s.youtube_likes || 0;
    totalComments += s.youtube_comments || 0;

    if (s.started_at) {
      const start = new Date(s.started_at).getTime();
      const end = s.stopped_at ? new Date(s.stopped_at).getTime() : Date.now();
      const durationMin = Math.round((end - start) / 60000);
      if (durationMin >= 0) {
        totalDurationMinutes += durationMin;
        completedStreamsCount++;
      }
    }

    const config = s.campaign_config ? JSON.parse(s.campaign_config) : {};
    s.channelName = config.youtubeChannelId ? channelMap[config.youtubeChannelId] || 'Channel Tidak Dikenal' : 'Platform Lain';
  });

  const summary = {
    totalStreams: rows.length,
    totalViews,
    peakViewers,
    totalInteractions: totalLikes + totalComments,
    averageDurationMinutes: completedStreamsCount > 0 ? Math.round(totalDurationMinutes / completedStreamsCount) : 0,
  };

  // 2. Data Grafik Harian
  const dailyGroups = {};
  rows.forEach(s => {
    // Format YYYY-MM-DD
    const dateStr = s.created_at ? s.created_at.substring(0, 10) : new Date().toISOString().substring(0, 10);
    if (!dailyGroups[dateStr]) {
      dailyGroups[dateStr] = {
        day: dateStr,
        views: 0,
        viewers: 0,
        likes: 0,
        comments: 0,
        watchHours: 0,
        streamsCount: 0,
      };
    }
    const group = dailyGroups[dateStr];
    group.views += s.youtube_total_views || 0;
    group.viewers = Math.max(group.viewers, s.youtube_concurrent_viewers || 0);
    group.likes += s.youtube_likes || 0;
    group.comments += s.youtube_comments || 0;
    group.streamsCount += 1;

    if (s.started_at) {
      const start = new Date(s.started_at).getTime();
      const end = s.stopped_at ? new Date(s.stopped_at).getTime() : Date.now();
      const durationHours = (end - start) / 3600000;
      if (durationHours > 0) {
        group.watchHours += Number(durationHours.toFixed(2));
      }
    }
  });

  // Urutkan berdasarkan tanggal menaik untuk grafik
  const chartData = Object.values(dailyGroups).sort((a, b) => a.day.localeCompare(b.day));

  // 3. Performa Kampanye
  const campaignGroups = {};
  rows.forEach(s => {
    const name = s.campaign_name || 'Stream Manual';
    if (!campaignGroups[name]) {
      campaignGroups[name] = {
        name,
        views: 0,
        viewers: 0,
        likes: 0,
        comments: 0,
        streamsCount: 0,
      };
    }
    const group = campaignGroups[name];
    group.views += s.youtube_total_views || 0;
    group.viewers = Math.max(group.viewers, s.youtube_concurrent_viewers || 0);
    group.likes += s.youtube_likes || 0;
    group.comments += s.youtube_comments || 0;
    group.streamsCount += 1;
  });

  const campaignPerformance = Object.values(campaignGroups).sort((a, b) => b.views - a.views);

  // 4. Distribusi Platform
  const platformGroups = {};
  rows.forEach(s => {
    const plat = s.platform || 'Manual RTMP';
    if (!platformGroups[plat]) {
      platformGroups[plat] = {
        name: plat,
        value: 0,
        views: 0,
      };
    }
    platformGroups[plat].value += 1;
    platformGroups[plat].views += s.youtube_total_views || 0;
  });

  const platformShare = Object.values(platformGroups);

  res.json({
    ok: true,
    campaignsList,
    summary,
    chartData,
    campaignPerformance,
    platformShare,
    streams: rows.map(serializeStream),
  });
}));
