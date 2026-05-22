import os from 'node:os';
import fs from 'node:fs';
import { Router } from 'express';
import { db } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { listRunningStreams } from '../ffmpegRunner.js';
import { config } from '../../utils/config.js';

export const monitorRouter = Router();
monitorRouter.use(requireAuth);

function getDiskUsage() {
  try {
    const stat = fs.statSync(config.uploadDir);
    const row = db.prepare('SELECT SUM(size_bytes) as totalSize FROM assets').get();
    return { 
      uploadDir: config.uploadDir, 
      available: true, 
      inode: stat.ino,
      usedBytes: Number(row?.totalSize || 0)
    };
  } catch {
    return { uploadDir: config.uploadDir, available: false, usedBytes: 0 };
  }
}

monitorRouter.get('/metrics', asyncHandler(async (req, res) => {
  const memoryTotal = os.totalmem();
  const memoryFree = os.freemem();
  const memoryUsed = memoryTotal - memoryFree;
  const load = os.loadavg();
  const hasYoutube = db.prepare('SELECT COUNT(id) as count FROM youtube_channels WHERE refresh_token IS NOT NULL AND refresh_token != ""').get().count > 0;
  
  res.json({
    cpu: { cores: os.cpus().length, load1: load[0], load5: load[1], load15: load[2] },
    memory: { total: memoryTotal, free: memoryFree, used: memoryUsed, percent: Math.round((memoryUsed / memoryTotal) * 100) },
    disk: getDiskUsage(),
    streams: listRunningStreams(),
    uptime: process.uptime(),
    apiStatus: {
      youtube: hasYoutube,
      facebook: false
    }
  });
}));

monitorRouter.get('/logs', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 200), 1000);
  const source = req.query.source ? String(req.query.source) : '';
  const rows = source
    ? db.prepare('SELECT * FROM logs WHERE source = ? ORDER BY id DESC LIMIT ?').all(source, limit)
    : db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT ?').all(limit);
  res.json({ logs: rows.reverse() });
}));

monitorRouter.delete('/logs', asyncHandler(async (req, res) => {
  db.prepare('DELETE FROM logs').run();
  res.json({ ok: true });
}));
