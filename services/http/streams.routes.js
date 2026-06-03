import { Router } from 'express';
import { db } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { serializeStream } from '../../utils/serializers.js';
import { listRunningStreams, startFfmpegStream, stopFfmpegStream } from '../ffmpegRunner.js';
import { getLiveStreamStats } from '../youtubeAnalyticsService.js';

export const streamsRouter = Router();
streamsRouter.use(requireAuth);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Pilih 1 aset secara acak dari daftar ID yang diberikan.
 * Jika daftar kosong, fallback ke semua aset dengan tipe tersebut.
 * @returns {{ asset: object|null, error: string|null }}
 */
function pickRandomAsset(ids = [], type = 'Video') {
  if (ids.length > 0) {
    const validIds = ids.map(Number).filter(Boolean);
    const placeholders = validIds.map(() => '?').join(', ');
    const candidates = db.prepare(
      `SELECT * FROM assets WHERE id IN (${placeholders}) AND type = ?`
    ).all(...validIds, type);

    if (candidates.length === 0) {
      return { asset: null, error: `Tidak ada ${type} valid dari ID yang dipilih di kampanye.` };
    }
    return { asset: candidates[Math.floor(Math.random() * candidates.length)], error: null };
  }

  // Fallback: ambil acak dari seluruh pustaka
  const fallback = db.prepare(
    `SELECT * FROM assets WHERE type = ? ORDER BY RANDOM() LIMIT 1`
  ).get(type);

  if (!fallback) {
    return { asset: null, error: `Tidak ada ${type} di Pustaka Aset. Upload dulu sebelum live.` };
  }
  return { asset: fallback, error: null };
}

// ── GET /streams ──────────────────────────────────────────────────────────────
streamsRouter.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const totalRow = db.prepare('SELECT COUNT(*) as total FROM streams').get();
  const rows = db.prepare('SELECT * FROM streams ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
  
  res.json({ 
    streams: rows.map(serializeStream), 
    running: listRunningStreams(),
    pagination: {
      page,
      limit,
      total: totalRow.total,
      totalPages: Math.ceil(totalRow.total / limit)
    }
  });
}));

// ── GET /streams/running — hanya stream yang sedang Online ───────────────────
streamsRouter.get('/running', asyncHandler(async (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM streams WHERE status IN ('Online','Starting') ORDER BY created_at DESC"
  ).all();
  const running = listRunningStreams();
  res.json({
    streams: rows.map(serializeStream),
    processes: running,
    count: rows.length,
  });
}));

// ── POST /streams/start  (start langsung dengan inputPath / assetId) ─────────
streamsRouter.post('/start', asyncHandler(async (req, res) => {
  const campaignId = req.body.campaignId ? Number(req.body.campaignId) : null;
  const platform   = String(req.body.platform || 'Manual RTMP');
  const assetId    = req.body.assetId ? Number(req.body.assetId) : null;
  const asset      = assetId ? db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId) : null;
  const inputPath  = String(req.body.inputPath || asset?.path || '').trim();
  const rtmpUrl    = String(req.body.rtmpUrl   || '').trim();
  const streamKey  = String(req.body.streamKey || '').trim();
  const encoder    = req.body.encoder || {};

  if (!inputPath) return res.status(400).json({ error: 'Pilih asset video atau isi inputPath.' });

  const started = startFfmpegStream({ campaignId, platform, inputPath, rtmpUrl, streamKey, encoder });
  res.status(201).json({
    ...started,
    chosenVideo: asset ? { id: asset.id, name: asset.name, path: inputPath } : { path: inputPath },
  });
}));

// ── POST /streams/start-campaign ─────────────────────────────────────────────
// Baca campaign dari SQLite → pilih video & thumbnail acak → jalankan FFmpeg
// ─────────────────────────────────────────────────────────────────────────────
streamsRouter.post('/start-campaign', asyncHandler(async (req, res) => {
  const campaignId = req.body.campaignId ? Number(req.body.campaignId) : null;
  if (!campaignId) return res.status(400).json({ error: 'campaignId wajib diisi.' });

  // 1. Ambil campaign dari SQLite
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign) return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });

  let cfg = {};
  try { cfg = JSON.parse(campaign.config_json || '{}'); } catch { cfg = {}; }

  // 2. Resolve RTMP URL (dari request atau config)
  const rtmpUrl   = String(req.body.rtmpUrl   || cfg.rtmpUrl   || '').trim();
  const streamKey = String(req.body.streamKey || cfg.streamKey || '').trim();
  if (!rtmpUrl) {
    return res.status(400).json({ error: 'RTMP URL wajib diisi untuk memulai stream.' });
  }

  // 3. Pilih VIDEO acak dari pool videoAssetIds
  const videoIds = Array.isArray(cfg.videoAssetIds) ? cfg.videoAssetIds : [];
  const { asset: chosenVideo, error: videoError } = pickRandomAsset(videoIds, 'Video');
  if (videoError) return res.status(400).json({ error: videoError });
  if (!chosenVideo.path) {
    return res.status(400).json({ error: `File video tidak ditemukan di disk: ${chosenVideo.name}` });
  }

  // 4. Pilih THUMBNAIL acak dari pool thumbnailAssetIds (tidak wajib)
  const thumbIds = Array.isArray(cfg.thumbnailAssetIds) ? cfg.thumbnailAssetIds : [];
  let chosenThumbnail = null;
  if (thumbIds.length > 0) {
    const validThumbIds = thumbIds.map(Number).filter(Boolean);
    const placeholders  = validThumbIds.map(() => '?').join(', ');
    // BUG-008 FIX: Filter tipe agar hanya Images/Thumbnail yang dikembalikan
    const thumbCandidates = db.prepare(
      `SELECT * FROM assets WHERE id IN (${placeholders}) AND type IN ('Images', 'Thumbnail')`
    ).all(...validThumbIds);
    if (thumbCandidates.length > 0) {
      chosenThumbnail = thumbCandidates[Math.floor(Math.random() * thumbCandidates.length)];
    }
  }
  // Fallback thumbnail: ambil gambar acak dari pustaka (opsional)
  if (!chosenThumbnail && cfg.thumbnailMode !== 'Tanpa thumbnail') {
    const fallbackThumb = db.prepare(
      `SELECT * FROM assets WHERE type IN ('Images', 'Thumbnail') ORDER BY RANDOM() LIMIT 1`
    ).get();
    if (fallbackThumb) chosenThumbnail = fallbackThumb;
  }

  // 5. Pilih JUDUL acak dari daftar liveTitles
  const titles     = String(cfg.liveTitles || '').split('\n').map((t) => t.trim()).filter(Boolean);
  const chosenTitle = titles.length > 0
    ? titles[Math.floor(Math.random() * titles.length)]
    : campaign.name;

  // 6. Update status campaign → Aktif
  db.prepare('UPDATE campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('Aktif', campaignId);

  // 7. Jalankan FFmpeg
  const encoder  = cfg.encoder || req.body.encoder || {};
  const platform = cfg.platform || 'YouTube API';

  const started = startFfmpegStream({
    campaignId,
    platform,
    inputPath: chosenVideo.path,
    rtmpUrl,
    streamKey,
    encoder,
  });

  // 8. Simpan info sesi ke DB stream (chosenVideo, chosenThumbnail, chosenTitle)
  db.prepare(
    `UPDATE streams SET chosen_video_id = ?, chosen_thumbnail_id = ?, chosen_title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(
    chosenVideo.id ?? null,
    chosenThumbnail?.id ?? null,
    chosenTitle,
    started.streamId
  );

  res.status(201).json({
    ...started,
    chosenVideo:     { id: chosenVideo.id, name: chosenVideo.name, path: chosenVideo.path },
    chosenThumbnail: chosenThumbnail
      ? { id: chosenThumbnail.id, name: chosenThumbnail.name, url: chosenThumbnail.url }
      : null,
    chosenTitle,
  });
}));

// ── POST /streams/:id/stop ────────────────────────────────────────────────────
streamsRouter.post('/:id/stop', asyncHandler(async (req, res) => {
  const result = stopFfmpegStream(req.params.id);
  // Update status campaign terkait
  const stream = db.prepare('SELECT campaign_id FROM streams WHERE id = ?').get(Number(req.params.id));
  if (stream?.campaign_id) {
    const campaign = db.prepare('SELECT status, recurring_enabled, recurring_type FROM campaigns WHERE id = ?').get(stream.campaign_id);
    if (campaign) {
      let newStatus = campaign.status;
      if (campaign.status !== 'Completed') {
        newStatus = (campaign.recurring_enabled && campaign.recurring_type !== 'once') ? 'Scheduled' : 'Draft';
      }
      db.prepare('UPDATE campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newStatus, stream.campaign_id);
    }
  }
  res.json(result);
}));

// ── POST /streams/delete ──────────────────────────────────────────────────────
streamsRouter.post('/delete', asyncHandler(async (req, res) => {
  const ids = req.body.ids || [];
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Berikan array id stream yang ingin dihapus.' });
  }
  const placeholders = ids.map(() => '?').join(', ');
  const info = db.prepare(`DELETE FROM streams WHERE id IN (${placeholders})`).run(...ids);
  res.json({ message: `${info.changes} riwayat stream berhasil dihapus.` });
}));

// ── POST /streams/sync ────────────────────────────────────────────────────────
streamsRouter.post('/sync', asyncHandler(async (req, res) => {
  const ids = req.body.ids || [];
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Berikan array id stream yang ingin disinkronkan.' });
  }

  let syncedCount = 0;
  for (const streamId of ids) {
    const stream = db.prepare('SELECT * FROM streams WHERE id = ?').get(streamId);
    if (!stream || !stream.youtube_broadcast_id || !stream.campaign_id) continue;

    const campaign = db.prepare('SELECT config_json FROM campaigns WHERE id = ?').get(stream.campaign_id);
    if (!campaign) continue;

    let cfg = {};
    try { cfg = JSON.parse(campaign.config_json || '{}'); } catch { continue; }
    if (!cfg.youtubeChannelId) continue;

    try {
      const stats = await getLiveStreamStats(cfg.youtubeChannelId, stream.youtube_broadcast_id);
      if (stats) {
        db.prepare(`
          UPDATE streams 
          SET youtube_total_views = ?,
              youtube_likes = ?,
              youtube_comments = ?,
              youtube_stats_updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(stats.viewCount, stats.likeCount, stats.commentCount, streamId);
        syncedCount++;
      }
    } catch (err) {
      console.warn(`Gagal sinkronisasi stream #${streamId}:`, err.message);
    }
  }

  res.json({ message: `${syncedCount} dari ${ids.length} stream berhasil disinkronkan dengan YouTube Studio.` });
}));
