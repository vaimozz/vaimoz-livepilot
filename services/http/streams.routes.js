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

streamsRouter.post('/:id/stop', asyncHandler(async (req, res) => {
  res.json(stopFfmpegStream(req.params.id));
}));
