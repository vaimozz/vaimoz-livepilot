import { spawn } from 'node:child_process';
import { config } from '../utils/config.js';
import { db, logEvent } from '../db/database.js';
import os from 'node:os';

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

import { notifyStreamStarted, notifyStreamStopped, notifyStreamError, notifyStreamReconnecting } from './telegramService.js';

export function listRunningStreams() {
  return [...runningProcesses.entries()].map(([streamId, item]) => ({ streamId, pid: item.process.pid, startedAt: item.startedAt }));
}

export function startFfmpegStream({ campaignId = null, platform = 'Manual RTMP', inputPath, rtmpUrl, streamKey, encoder, durationMinutes }) {
  const outputUrl = buildOutputUrl({ rtmpUrl, streamKey });
  const args = buildFfmpegArgs({ inputPath, outputUrl, encoder });
  const startedAt = new Date().toISOString();
  const plannedStopTime = durationMinutes ? new Date(Date.now() + durationMinutes * 60000).toISOString() : null;

  let campaignName = `Campaign #${campaignId || 'Unknown'}`;
  if (campaignId) {
    const campRow = db.prepare('SELECT name FROM campaigns WHERE id = ?').get(campaignId);
    if (campRow) campaignName = campRow.name;
  }

  const insert = db.prepare(`
    INSERT INTO streams (campaign_id, platform, status, rtmp_url, started_at, smart_stop_delayed_until)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(campaignId, platform, 'Starting', outputUrl.replace(streamKey || '', '***'), startedAt, plannedStopTime);

  const streamId = Number(insert.lastInsertRowid);
  
  let attempt = 1;
  const maxRetries = 3;
  const delaySeconds = 10;

  function spawnProcess() {
    const child = spawn(config.ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    runningProcesses.set(streamId, { process: child, startedAt, args, campaignName });
    db.prepare('UPDATE streams SET status = ?, pid = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('Online', child.pid, streamId);
    logEvent('FFMPEG', 'FFmpeg Server', `Stream #${streamId} dimulai dengan PID ${child.pid} (Attempt ${attempt})`);

    if (attempt === 1) {
      const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
      const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
      const isStreamCopy = (!encoder || !encoder.mode || encoder.mode === 'Stream Copy (CPU ringan)');

      notifyStreamStarted({
        campaignName,
        platform,
        chosenVideo: inputPath.split(/[\/\\]/).pop(),
        pid: child.pid,
        streamId: streamId,
        resolution: isStreamCopy ? 'Original (Copy)' : (encoder?.resolution || '1080p Full HD'),
        targetDuration: durationMinutes ? `${durationMinutes} Menit` : 'Non-stop (Loop)',
        serverMem: `${freeMem}GB / ${totalMem}GB`
      }).catch(e => logEvent('ERROR', 'Telegram', e.message));
    }

    child.stdout.on('data', (buffer) => {
      const line = buffer.toString().trim();
      // Ignore routine progress lines to prevent database bloat
      if (line && !line.startsWith('frame=') && !line.includes('bitrate=')) {
        logEvent('FFMPEG', 'FFmpeg Server', line.slice(0, 500));
      }
    });
    child.stderr.on('data', (buffer) => {
      const line = buffer.toString().trim();
      // FFmpeg sends progress to stderr by default. Filter it out.
      if (line && !line.startsWith('frame=') && !line.includes('bitrate=')) {
        logEvent('FFMPEG', 'FFmpeg Server', line.slice(0, 500));
      }
    });
    
    child.on('exit', async (code, signal) => {
      runningProcesses.delete(streamId);
      const isError = code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGKILL';
      
      // Cleanup associated services to prevent memory/API quota leaks
      try {
        const { stopChatbot } = await import('./youtubeChatService.js');
        const { stopStreamMonitoring } = await import('./youtubeAnalyticsService.js');
        stopChatbot(streamId);
        stopStreamMonitoring(streamId);
      } catch (err) {
        logEvent('WARN', 'FFmpeg Server', `Gagal membersihkan service terkait stream #${streamId}: ${err.message}`);
      }
      
      if (!isError) {
        db.prepare('UPDATE streams SET status = ?, stopped_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('Stopped', new Date().toISOString(), streamId);
        logEvent('INFO', 'FFmpeg Server', `Stream #${streamId} berhenti normal (kode: ${code}, signal: ${signal})`);
        notifyStreamStopped({ campaignName, streamId }).catch(e => logEvent('ERROR', 'Telegram', e.message));
        return;
      }

      if (attempt <= maxRetries) {
        // Cek apakah waktu jadwal sudah habis dan tidak ada delay Smart Stop
        const streamRow = db.prepare('SELECT smart_stop_delayed_until FROM streams WHERE id = ?').get(streamId);
        if (streamRow && streamRow.smart_stop_delayed_until) {
          const stopTime = new Date(streamRow.smart_stop_delayed_until).getTime();
          if (Date.now() >= stopTime) {
            db.prepare('UPDATE streams SET status = ?, stopped_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run('Stopped', new Date().toISOString(), streamId);
            logEvent('INFO', 'FFmpeg Server', `Stream #${streamId} terputus setelah batas waktu. Tidak auto-reconnect.`);
            notifyStreamStopped({ campaignName, streamId }).catch(e => logEvent('ERROR', 'Telegram', e.message));
            return;
          }
        }

        db.prepare('UPDATE streams SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('Reconnecting', streamId);
        logEvent('WARN', 'FFmpeg Server', `Stream #${streamId} terputus. Mencoba reconnect ${attempt}/${maxRetries} dalam ${delaySeconds} detik...`);
        
        notifyStreamReconnecting({ campaignName, attempt, maxRetries, delaySeconds })
          .catch(e => logEvent('ERROR', 'Telegram', e.message));
        
        setTimeout(() => {
           const currentStatus = db.prepare('SELECT status FROM streams WHERE id = ?').get(streamId);
           if (!currentStatus || currentStatus.status === 'Stopped' || currentStatus.status === 'Stopping') {
               return; // aborted by user
           }
           attempt++;
           spawnProcess();
        }, delaySeconds * 1000);
      } else {
        db.prepare('UPDATE streams SET status = ?, stopped_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('Error', new Date().toISOString(), streamId);
        logEvent('ERROR', 'FFmpeg Server', `Stream #${streamId} gagal reconnect setelah ${maxRetries} kali percobaan.`);
        
        notifyStreamError({
          campaignName,
          error: `FFmpeg gagal reconnect setelah ${maxRetries} percobaan. (kode: ${code}, signal: ${signal})`
        }).catch(e => logEvent('ERROR', 'Telegram', e.message));
      }
    });

    return child.pid;
  }

  const initialPid = spawnProcess();
  return { streamId, pid: initialPid, args };
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
