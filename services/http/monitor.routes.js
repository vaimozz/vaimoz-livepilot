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
    return { uploadDir: config.uploadDir, available: true, inode: stat.ino };
  } catch {
    return { uploadDir: config.uploadDir, available: false };
  }
}

monitorRouter.get('/metrics', asyncHandler(async (req, res) => {
  const memoryTotal = os.totalmem();
  const memoryFree = os.freemem();
  const memoryUsed = memoryTotal - memoryFree;
  const load = os.loadavg();
  res.json({
    cpu: { cores: os.cpus().length, load1: load[0], load5: load[1], load15: load[2] },
    memory: { total: memoryTotal, free: memoryFree, used: memoryUsed, percent: Math.round((memoryUsed / memoryTotal) * 100) },
    disk: getDiskUsage(),
    streams: listRunningStreams(),
    uptime: process.uptime(),
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
