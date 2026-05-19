import { Router } from 'express';
import { db } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { serializeStream } from '../../utils/serializers.js';
import { listRunningStreams, startFfmpegStream, stopFfmpegStream } from '../ffmpegRunner.js';

export const streamsRouter = Router();
streamsRouter.use(requireAuth);

streamsRouter.get('/', asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT * FROM streams ORDER BY created_at DESC LIMIT 100').all();
  res.json({ streams: rows.map(serializeStream), running: listRunningStreams() });
}));

streamsRouter.post('/start', asyncHandler(async (req, res) => {
  const campaignId = req.body.campaignId ? Number(req.body.campaignId) : null;
  const platform = String(req.body.platform || 'Manual RTMP');
  const assetId = req.body.assetId ? Number(req.body.assetId) : null;
  const asset = assetId ? db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId) : null;
  const inputPath = String(req.body.inputPath || asset?.path || '').trim();
  const rtmpUrl = String(req.body.rtmpUrl || '').trim();
  const streamKey = String(req.body.streamKey || '').trim();
  const encoder = req.body.encoder || {};

  if (!inputPath) return res.status(400).json({ error: 'Pilih asset video atau isi inputPath.' });
  const started = startFfmpegStream({ campaignId, platform, inputPath, rtmpUrl, streamKey, encoder });
  res.status(201).json(started);
}));

// ── Mulai stream dari draft kampanye: pilih video acak dari asset pool ──────
streamsRouter.post('/start-campaign', asyncHandler(async (req, res) => {
  const campaignId = req.body.campaignId ? Number(req.body.campaignId) : null;
  if (!campaignId) return res.status(400).json({ error: 'campaignId wajib diisi.' });

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign) return res.status(404).json({ error: 'Kampanye tidak ditemukan.' });

  let cfg = {};
  try { cfg = JSON.parse(campaign.config_json || '{}'); } catch { cfg = {}; }

  const rtmpUrl = String(req.body.rtmpUrl || cfg.rtmpUrl || '').trim();
  const streamKey = String(req.body.streamKey || cfg.streamKey || '').trim();
  if (!rtmpUrl) return res.status(400).json({ error: 'RTMP URL wajib diisi untuk memulai stream.' });

  // Resolve video asset: gunakan videoAssetIds dari config, fallback ke semua video
  const videoIds = Array.isArray(cfg.videoAssetIds) && cfg.videoAssetIds.length > 0
    ? cfg.videoAssetIds.map(Number).filter(Boolean)
    : [];

  let inputPath = '';
  let chosenAsset = null;

  if (videoIds.length > 0) {
    // Ambil semua asset valid dari ID terpilih
    const placeholders = videoIds.map(() => '?').join(', ');
    const candidates = db.prepare(
      `SELECT * FROM assets WHERE id IN (${placeholders}) AND type = 'Video'`
    ).all(...videoIds);

    if (candidates.length === 0) {
      return res.status(400).json({ error: 'Tidak ada video valid dari asset yang dipilih di kampanye ini.' });
    }

    // Pilih acak dari pool
    chosenAsset = candidates[Math.floor(Math.random() * candidates.length)];
    inputPath = chosenAsset.path || '';
  } else {
    // Fallback: ambil video manapun dari SQLite secara acak
    const any = db.prepare("SELECT * FROM assets WHERE type = 'Video' ORDER BY RANDOM() LIMIT 1").get();
    if (!any) return res.status(400).json({ error: 'Tidak ada video di Pustaka Aset. Upload dulu sebelum live.' });
    chosenAsset = any;
    inputPath = any.path || '';
  }

  if (!inputPath) return res.status(400).json({ error: `File video tidak ditemukan di disk: ${chosenAsset?.name}` });

  const encoder = cfg.encoder || req.body.encoder || {};
  const platform = cfg.platform || 'YouTube API';

  const started = startFfmpegStream({ campaignId, platform, inputPath, rtmpUrl, streamKey, encoder });
  res.status(201).json({
    ...started,
    chosenVideo: { id: chosenAsset.id, name: chosenAsset.name, path: inputPath },
  });
}));

streamsRouter.post('/:id/stop', asyncHandler(async (req, res) => {
  res.json(stopFfmpegStream(req.params.id));
}));
