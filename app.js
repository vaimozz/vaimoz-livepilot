import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { config } from './utils/config.js';
import { initDatabase, logEvent } from './db/database.js';
import { authRouter } from './services/http/auth.routes.js';
import { assetsRouter } from './services/http/assets.routes.js';
import { playlistsRouter } from './services/http/playlists.routes.js';
import { campaignsRouter } from './services/http/campaigns.routes.js';
import { streamsRouter } from './services/http/streams.routes.js';
import { youtubeRouter } from './services/http/youtube.routes.js';
import { monitorRouter } from './services/http/monitor.routes.js';
import { schedulerRouter } from './services/http/scheduler.routes.js';
import { settingsRouter } from './services/http/settings.routes.js';
import { analyticsRouter } from './services/http/analytics.routes.js';
import { loadScheduledCampaigns, setupAutoCleanup } from './services/scheduler.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

initDatabase();
import { db } from './db/database.js';
try {
  // Kill orphaned FFmpeg processes to prevent zombie streams
  const activeStreams = db.prepare(`SELECT id, pid FROM streams WHERE status IN ('Online', 'Starting')`).all();
  for (const stream of activeStreams) {
    if (stream.pid) {
      try {
        process.kill(stream.pid, 'SIGTERM');
        logEvent('INFO', 'Server', `Menghentikan stream yatim (orphan) PID ${stream.pid} saat startup.`);
      } catch (e) {
        // Process might already be dead
      }
    }
  }

  const result = db.prepare(`UPDATE streams SET status = 'Error', stopped_at = CURRENT_TIMESTAMP WHERE status IN ('Online', 'Starting')`).run();
  
  // Restore campaign statuses so scheduled campaigns survive restarts
  const campResult = db.prepare(`UPDATE campaigns SET status = 'Scheduled' WHERE recurring_enabled = 1 AND recurring_type != 'once' AND status NOT IN ('Paused', 'Completed')`).run();
  
  if (result.changes > 0 || campResult.changes > 0) {
    logEvent('INFO', 'Server', `Memperbaiki ${result.changes} stream yatim dan merestore ${campResult.changes} kampanye ke status Scheduled saat startup.`);
  }
} catch (e) {
  console.error("Gagal membersihkan orphan streams:", e);
}
fs.mkdirSync(config.uploadDir, { recursive: true });

const app = express();

app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(config.uploadDir));
app.use('/public', express.static(path.resolve(process.cwd(), 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'Vaimoz LivePilot', env: config.env, time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/streams', streamsRouter);
app.use('/api/youtube', youtubeRouter);
app.use('/api/monitor', monitorRouter);
app.use('/api/scheduler', schedulerRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/analytics', analyticsRouter);

const frontendDir = path.resolve(process.cwd(), 'public/frontend');
if (fs.existsSync(path.join(frontendDir, 'index.html'))) {
  app.use(express.static(frontendDir));
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDir, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  const scheduled = loadScheduledCampaigns();
  setupAutoCleanup();
  logEvent('SERVER', 'Server', `Vaimoz LivePilot backend online pada port ${config.port}`);
  console.log(`Vaimoz LivePilot backend: http://localhost:${config.port}`);
  if (scheduled.length) console.log(`Loaded ${scheduled.length} scheduled campaign(s).`);
});
