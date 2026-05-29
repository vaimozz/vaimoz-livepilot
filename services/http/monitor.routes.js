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

// --- Network Speed Monitor (Linux /proc/net/dev) ---
let currentNetworkSpeed = { uploadBytesPerSec: 0, downloadBytesPerSec: 0 };
let lastNetStats = { rx: 0, tx: 0, time: 0 };

function readProcNetDev() {
  try {
    const data = fs.readFileSync('/proc/net/dev', 'utf8');
    const lines = data.split('\n').slice(2);
    let rx = 0;
    let tx = 0;
    for (const line of lines) {
      if (!line.trim() || line.includes('lo:')) continue;
      const match = line.match(/^\s*[a-zA-Z0-9_]+:\s*(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)/);
      if (match) {
        rx += parseInt(match[1], 10);
        tx += parseInt(match[2], 10);
      }
    }
    return { rx, tx, time: Date.now() };
  } catch (err) {
    return null; // Not on Linux or file inaccessible
  }
}

if (os.platform() === 'linux') {
  lastNetStats = readProcNetDev() || { rx: 0, tx: 0, time: Date.now() };
  setInterval(() => {
    const currentStats = readProcNetDev();
    if (currentStats && lastNetStats.time > 0) {
      const dt = (currentStats.time - lastNetStats.time) / 1000;
      if (dt > 0) {
        currentNetworkSpeed.downloadBytesPerSec = Math.max(0, (currentStats.rx - lastNetStats.rx) / dt);
        currentNetworkSpeed.uploadBytesPerSec = Math.max(0, (currentStats.tx - lastNetStats.tx) / dt);
      }
    }
    if (currentStats) {
      lastNetStats = currentStats;
    }
  }, 2000).unref();
}
// ---------------------------------------------------

function getDiskUsage() {
  try {
    const stat = fs.statSync(config.uploadDir);
    const row = db.prepare('SELECT SUM(size_bytes) as totalSize FROM assets').get();
    let totalSpace = 0;
    let freeSpace = 0;
    let diskUsed = Number(row?.totalSize || 0);

    try {
      if (typeof fs.statfsSync === 'function') {
        const fsStat = fs.statfsSync(config.uploadDir);
        totalSpace = fsStat.blocks * fsStat.bsize;
        freeSpace = fsStat.bavail * fsStat.bsize;
        diskUsed = totalSpace - freeSpace;
      }
    } catch (e) {
      // Ignore if statfsSync fails
    }

    return { 
      uploadDir: config.uploadDir, 
      available: true, 
      inode: stat.ino,
      usedBytes: diskUsed,
      totalBytes: totalSpace,
      freeBytes: freeSpace
    };
  } catch {
    return { uploadDir: config.uploadDir, available: false, usedBytes: 0, totalBytes: 0, freeBytes: 0 };
  }
}

monitorRouter.get('/metrics', asyncHandler(async (req, res) => {
  const memoryTotal = os.totalmem();
  const memoryFree = os.freemem();
  const memoryUsed = memoryTotal - memoryFree;
  const load = os.loadavg();
  const hasYoutube = db.prepare('SELECT COUNT(id) as count FROM youtube_channels').get().count > 0;
  
  res.json({
    cpu: { cores: os.cpus().length, load1: load[0], load5: load[1], load15: load[2] },
    memory: { total: memoryTotal, free: memoryFree, used: memoryUsed, percent: Math.round((memoryUsed / memoryTotal) * 100) },
    disk: getDiskUsage(),
    network: currentNetworkSpeed,
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
