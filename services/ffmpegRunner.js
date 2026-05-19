import { spawn } from 'node:child_process';
import { config } from '../utils/config.js';
import { db, logEvent } from '../db/database.js';

const runningProcesses = new Map();

function buildOutputUrl({ rtmpUrl, streamKey }) {
  const base = String(rtmpUrl || '').trim();
  const key = String(streamKey || '').trim();
  if (!base) throw new Error('RTMP URL wajib diisi.');
  if (!key) return base;
  return base.endsWith('/') ? `${base}${key}` : `${base}/${key}`;
}

function buildFfmpegArgs({ inputPath, outputUrl, encoder = {} }) {
  if (!inputPath) throw new Error('Path video input wajib diisi.');
  const mode = encoder.mode || 'Stream Copy (CPU ringan)';
  const args = ['-re', '-stream_loop', '-1', '-i', inputPath];

  if (mode === 'Stream Copy (CPU ringan)') {
    args.push('-c', 'copy');
  } else {
    const presetByResolution = {
      '720p HD': { scale: '1280:720', bitrate: '3000k', maxrate: '3500k', bufsize: '6000k' },
      '1080p Full HD': { scale: '1920:1080', bitrate: '4500k', maxrate: '5000k', bufsize: '9000k' },
      '1440p 2K': { scale: '2560:1440', bitrate: '9000k', maxrate: '10000k', bufsize: '18000k' },
      '2160p 4K': { scale: '3840:2160', bitrate: '18000k', maxrate: '20000k', bufsize: '36000k' },
    };
    const selected = presetByResolution[encoder.resolution] || presetByResolution['1080p Full HD'];
    const fps = String(encoder.fps || '30 FPS').replace(/[^0-9]/g, '') || '30';
    args.push(
      '-vf', `scale=${selected.scale}`,
      '-r', fps,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-b:v', selected.bitrate,
      '-maxrate', selected.maxrate,
      '-bufsize', selected.bufsize,
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100'
    );
  }

  args.push('-f', 'flv', outputUrl);
  return args;
}

export function listRunningStreams() {
  return [...runningProcesses.entries()].map(([streamId, item]) => ({ streamId, pid: item.process.pid, startedAt: item.startedAt }));
}

export function startFfmpegStream({ campaignId = null, platform = 'Manual RTMP', inputPath, rtmpUrl, streamKey, encoder }) {
  const outputUrl = buildOutputUrl({ rtmpUrl, streamKey });
  const args = buildFfmpegArgs({ inputPath, outputUrl, encoder });
  const startedAt = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO streams (campaign_id, platform, status, rtmp_url, started_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(campaignId, platform, 'Starting', outputUrl.replace(streamKey || '', '***'), startedAt);

  const streamId = Number(insert.lastInsertRowid);
  const child = spawn(config.ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  runningProcesses.set(streamId, { process: child, startedAt, args });
  db.prepare('UPDATE streams SET status = ?, pid = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('Online', child.pid, streamId);
  logEvent('FFMPEG', 'FFmpeg Server', `Stream #${streamId} dimulai dengan PID ${child.pid}`);

  child.stdout.on('data', (buffer) => logEvent('FFMPEG', 'FFmpeg Server', buffer.toString().slice(0, 500)));
  child.stderr.on('data', (buffer) => {
    const line = buffer.toString().trim();
    if (line) logEvent('FFMPEG', 'FFmpeg Server', line.slice(0, 500));
  });
  child.on('exit', (code) => {
    runningProcesses.delete(streamId);
    const status = code === 0 ? 'Stopped' : 'Error';
    db.prepare('UPDATE streams SET status = ?, stopped_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, new Date().toISOString(), streamId);
    logEvent(code === 0 ? 'INFO' : 'ERROR', 'FFmpeg Server', `Stream #${streamId} berhenti dengan kode ${code}`);
  });

  return { streamId, pid: child.pid, args };
}

export function stopFfmpegStream(streamId) {
  const item = runningProcesses.get(Number(streamId));
  if (!item) {
    db.prepare('UPDATE streams SET status = ?, stopped_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('Stopped', new Date().toISOString(), Number(streamId));
    return { stopped: false, message: 'Process tidak aktif, status database diset berhenti.' };
  }

  item.process.kill('SIGTERM');
  runningProcesses.delete(Number(streamId));
  db.prepare('UPDATE streams SET status = ?, stopped_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('Stopping', new Date().toISOString(), Number(streamId));
  logEvent('INFO', 'FFmpeg Server', `Perintah stop dikirim ke stream #${streamId}`);
  return { stopped: true };
}
