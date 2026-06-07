/**
 * Stream Health Routes — /api/health
 * Server-Sent Events (SSE) untuk push realtime metrics per stream.
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getStreamHealth, getAllStreamHealth } from '../ffmpegRunner.js';
import { db } from '../../db/database.js';

export const healthRouter = Router();
healthRouter.use(requireAuth);

// ── Helpers ───────────────────────────────────────────────────────────────────
function computeHealthStatus(metrics) {
  if (!metrics) return 'critical';
  const { fps, bitrate, updatedAt } = metrics;

  // Periksa staleness — tidak ada update > 10 detik = critical
  if (updatedAt) {
    const secondsAgo = (Date.now() - new Date(updatedAt).getTime()) / 1000;
    if (secondsAgo > 10) return 'critical';
  }

  if (fps >= 20 && bitrate >= 1000) return 'healthy';
  if (fps >= 10 || bitrate >= 500) return 'degraded';
  return 'critical';
}

// ── GET /api/health/stream/:streamId — SSE endpoint ──────────────────────────
healthRouter.get('/stream/:streamId', (req, res) => {
  const streamId = Number(req.params.streamId);

  // Pastikan stream ada dan sedang Online/Starting
  const streamRow = db.prepare("SELECT id, status FROM streams WHERE id = ?").get(streamId);
  if (!streamRow) {
    return res.status(404).json({ error: 'Stream tidak ditemukan.' });
  }

  // Setup SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nonaktifkan buffering Nginx
  res.flushHeaders();

  // Kirim initial data
  function sendHealth() {
    const metrics = getStreamHealth(streamId);
    const status = computeHealthStatus(metrics);

    const payload = {
      streamId,
      fps: metrics?.fps ?? 0,
      bitrate: metrics?.bitrate ?? 0,
      frame: metrics?.frame ?? 0,
      speed: metrics?.speed ?? '',
      dropFrames: metrics?.dropFrames ?? 0,
      dupFrames: metrics?.dupFrames ?? 0,
      status,
      updatedAt: metrics?.updatedAt ?? null,
    };

    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  sendHealth();
  const interval = setInterval(sendHealth, 2000);

  // Bersihkan saat koneksi tutup
  req.on('close', () => {
    clearInterval(interval);
  });
});

// ── GET /api/health/streams — snapshot semua stream aktif ────────────────────
healthRouter.get('/streams', asyncHandler(async (req, res) => {
  const allHealth = getAllStreamHealth();

  // Tambahkan status ke setiap entry
  const result = {};
  for (const [id, metrics] of Object.entries(allHealth)) {
    result[id] = {
      ...metrics,
      status: computeHealthStatus(metrics),
    };
  }

  // Ambil info stream aktif dari database
  const activeStreams = db.prepare("SELECT id, campaign_id, platform, status FROM streams WHERE status IN ('Online', 'Starting')").all();

  res.json({
    streams: activeStreams.map((s) => ({
      streamId: s.id,
      campaignId: s.campaign_id,
      platform: s.platform,
      dbStatus: s.status,
      health: result[s.id] ?? null,
      healthStatus: computeHealthStatus(result[s.id] ?? null),
    })),
  });
}));
