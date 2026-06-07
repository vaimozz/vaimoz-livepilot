import { spawn } from 'node:child_process';
import { config } from '../utils/config.js';
import { db, logEvent } from '../db/database.js';
import os from 'node:os';

const runningProcesses = new Map();

// ── Fitur 1: Stream Health Metrics ───────────────────────────────────────────
// Map<streamId, { fps, bitrate, frame, speed, dropFrames, dupFrames, updatedAt }>
const streamHealth = new Map();

/**
 * Parse baris progress FFmpeg stderr, misalnya:
 * frame=  120 fps= 30 q=28.0 size=    2048kB time=00:00:04.00 bitrate=4194.3kbits/s speed=1.00x drop_frames=0 dup_frames=0
 */
function parseHealthFromStderr(line) {
  const frame       = parseInt(line.match(/frame=\s*(\d+)/)?.[1] ?? '-1');
  const fps         = parseFloat(line.match(/fps=\s*([\d.]+)/)?.[1] ?? '-1');
  const bitrateStr  = line.match(/bitrate=\s*([\d.]+)kbits\/s/)?.[1];
  const bitrate     = bitrateStr ? parseFloat(bitrateStr) : -1;
  const speed       = line.match(/speed=\s*([\d.]+x)/)?.[1] ?? '';
  const dropFrames  = parseInt(line.match(/drop_frames=\s*(\d+)/)?.[1] ?? '0');
  const dupFrames   = parseInt(line.match(/dup_frames=\s*(\d+)/)?.[1] ?? '0');

  // Hanya kembalikan jika kita berhasil parse frame (minimal ada 'frame=')
  if (frame < 0 && fps < 0) return null;

  return { frame: frame >= 0 ? frame : 0, fps: fps >= 0 ? fps : 0, bitrate: bitrate >= 0 ? bitrate : 0, speed, dropFrames, dupFrames };
}

export function getStreamHealth(streamId) {
  return streamHealth.get(Number(streamId)) ?? null;
}

export function getAllStreamHealth() {
  const result = {};
  for (const [id, metrics] of streamHealth.entries()) {
    result[id] = metrics;
  }
  return result;
}

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
import { createNotification } from './notificationService.js';
import { triggerWebhooks } from './webhookService.js';

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

      // Fitur 5: Notifikasi in-app
      createNotification('stream_start', 'Stream Dimulai', `Campaign "${campaignName}" mulai live di ${platform}.`, { streamId, campaignName, platform });
      // Fitur 7: Webhook outbound
      triggerWebhooks('stream.start', { streamId, campaignName, platform });
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
      // Fitur 1: Parse health metrics dari progress line FFmpeg
      if (line.startsWith('frame=') || (line.includes('frame=') && line.includes('fps='))) {
        const parsed = parseHealthFromStderr(line);
        if (parsed) {
          streamHealth.set(streamId, { ...parsed, updatedAt: new Date().toISOString() });
        }
        return; // Jangan log progress lines ke database
      }
      // FFmpeg sends progress to stderr by default. Filter it out.
      if (line && !line.includes('bitrate=')) {
        logEvent('FFMPEG', 'FFmpeg Server', line.slice(0, 500));
      }
    });
    
    child.on('exit', async (code, signal) => {
      runningProcesses.delete(streamId);
      // Fitur 1: Hapus health data saat stream berhenti
      streamHealth.delete(streamId);
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
        // Fitur 5: Notifikasi in-app stream stop
        createNotification('stream_stop', 'Stream Dihentikan', `Campaign "${campaignName}" telah selesai streaming.`, { streamId, campaignName });
        // Fitur 7: Webhook outbound
        triggerWebhooks('stream.stop', { streamId, campaignName });
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
        
        // Fitur 5: Notifikasi in-app reconnecting
        createNotification('stream_error', 'Stream Terputus - Reconnecting', `Campaign "${campaignName}" terputus. Mencoba reconnect ${attempt}/${maxRetries}...`, { streamId, campaignName, attempt, maxRetries });
        
        // BUG-009 FIX: Stop chatbot dan monitoring sebelum reconnect agar tidak kirim ke broadcast invalid
        try {
          const { stopChatbot } = await import('./youtubeChatService.js');
          const { stopStreamMonitoring } = await import('./youtubeAnalyticsService.js');
          stopChatbot(streamId);
          stopStreamMonitoring(streamId);
        } catch (err) {
          logEvent('WARN', 'FFmpeg Server', `Gagal membersihkan service sebelum reconnect #${streamId}: ${err.message}`);
        }

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

        // Fitur 5: Notifikasi in-app stream error
        createNotification('stream_error', 'Stream Error', `Campaign "${campaignName}" gagal reconnect setelah ${maxRetries} percobaan.`, { streamId, campaignName, code, signal });
        // Fitur 7: Webhook outbound
        triggerWebhooks('stream.error', { streamId, campaignName, code, signal });
      }
    });

    return child.pid;
  }

  const initialPid = spawnProcess();
  return { streamId, pid: initialPid, args };
}

/**
 * Fitur 3: Simulcast — kirim satu input ke banyak RTMP target sekaligus.
 * targets = [{ name, rtmpUrl, streamKey }, ...]
 */
export function startSimulcastStream({ campaignId = null, platform = 'Simulcast', inputPath, targets, encoder, durationMinutes }) {
  if (!targets || targets.length < 2) throw new Error('Simulcast membutuhkan minimal 2 target.');
  if (targets.length > 5) throw new Error('Simulcast maksimal 5 target.');
  if (!inputPath) throw new Error('Path video input wajib diisi.');

  const startedAt = new Date().toISOString();
  const plannedStopTime = durationMinutes ? new Date(Date.now() + durationMinutes * 60000).toISOString() : null;

  let campaignName = `Campaign #${campaignId || 'Unknown'}`;
  if (campaignId) {
    const campRow = db.prepare('SELECT name FROM campaigns WHERE id = ?').get(campaignId);
    if (campRow) campaignName = campRow.name;
  }

  // Build output URLs
  const outputUrls = targets.map(({ rtmpUrl, streamKey }) => {
    const base = String(rtmpUrl || '').trim();
    const key = String(streamKey || '').trim();
    if (!base) throw new Error('RTMP URL target wajib diisi.');
    return key ? (base.endsWith('/') ? `${base}${key}` : `${base}/${key}`) : base;
  });

  const mode = encoder?.mode || 'Stream Copy (CPU ringan)';
  const isStreamCopy = mode === 'Stream Copy (CPU ringan)';

  // Bangun argumen FFmpeg dengan -f tee untuk efisiensi
  const args = ['-re', '-stream_loop', '-1', '-i', inputPath];

  if (isStreamCopy) {
    // Copy mode: -c copy -f tee
    args.push('-c', 'copy');
    const teeTargets = outputUrls.map((url) => `[f=flv]${url}`).join('|');
    args.push('-f', 'tee', teeTargets);
  } else {
    // Re-encode mode
    const presetByResolution = {
      '720p HD': { scale: '1280:720', bitrate: '3000k', maxrate: '3500k', bufsize: '6000k' },
      '1080p Full HD': { scale: '1920:1080', bitrate: '4500k', maxrate: '5000k', bufsize: '9000k' },
    };
    const selected = presetByResolution[encoder?.resolution] || presetByResolution['1080p Full HD'];
    const fps = String(encoder?.fps || '30 FPS').replace(/[^0-9]/g, '') || '30';
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
    const teeTargets = outputUrls.map((url) => `[f=flv]${url}`).join('|');
    args.push('-f', 'tee', teeTargets);
  }

  const insert = db.prepare(`
    INSERT INTO streams (campaign_id, platform, status, rtmp_url, started_at, smart_stop_delayed_until, simulcast_targets_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    campaignId,
    platform,
    'Starting',
    outputUrls[0].replace(/\/[^/]+$/, '/***'), // Sembunyikan stream key
    startedAt,
    plannedStopTime,
    JSON.stringify(targets.map(({ name, rtmpUrl }) => ({ name, rtmpUrl })))
  );

  const streamId = Number(insert.lastInsertRowid);

  const child = spawn(config.ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  runningProcesses.set(streamId, { process: child, startedAt, args, campaignName });
  db.prepare('UPDATE streams SET status = ?, pid = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('Online', child.pid, streamId);
  logEvent('FFMPEG', 'FFmpeg Server', `Simulcast #${streamId} dimulai dengan PID ${child.pid} — ${targets.length} target: ${targets.map((t) => t.name).join(', ')}`);

  // Fitur 5: Notifikasi in-app
  createNotification('stream_start', 'Simulcast Dimulai', `Campaign "${campaignName}" mulai simulcast ke ${targets.length} platform: ${targets.map((t) => t.name).join(', ')}.`, { streamId, campaignName, targets: targets.map((t) => t.name) });

  child.stdout.on('data', (buffer) => {
    const line = buffer.toString().trim();
    if (line && !line.startsWith('frame=') && !line.includes('bitrate=')) {
      logEvent('FFMPEG', 'FFmpeg Server', line.slice(0, 500));
    }
  });
  child.stderr.on('data', (buffer) => {
    const line = buffer.toString().trim();
    if (line.startsWith('frame=') || (line.includes('frame=') && line.includes('fps='))) {
      const parsed = parseHealthFromStderr(line);
      if (parsed) streamHealth.set(streamId, { ...parsed, updatedAt: new Date().toISOString() });
      return;
    }
    if (line && !line.includes('bitrate=')) {
      logEvent('FFMPEG', 'FFmpeg Server', line.slice(0, 500));
    }
  });

  child.on('exit', (code, signal) => {
    runningProcesses.delete(streamId);
    streamHealth.delete(streamId);
    const isStopped = code === 0 || signal === 'SIGTERM' || signal === 'SIGKILL';
    const status = isStopped ? 'Stopped' : 'Error';
    db.prepare('UPDATE streams SET status = ?, stopped_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, new Date().toISOString(), streamId);
    logEvent(isStopped ? 'INFO' : 'ERROR', 'FFmpeg Server', `Simulcast #${streamId} selesai (kode: ${code}, signal: ${signal})`);
    if (!isStopped) {
      createNotification('stream_error', 'Simulcast Error', `Simulcast "${campaignName}" berhenti dengan error.`, { streamId, campaignName });
    }
  });

  return { streamId, pid: child.pid, args };
}

export function stopFfmpegStream(streamId) {
  const numericId = Number(streamId);
  const item = runningProcesses.get(numericId);
  if (!item) {
    db.prepare('UPDATE streams SET status = ?, stopped_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('Stopped', new Date().toISOString(), numericId);
    return { stopped: false, message: 'Process tidak aktif, status database diset berhenti.' };
  }

  // BUG-M6 FIX: Tandai stream sebagai 'Stopping' di DB SEBELUM mengirim SIGTERM.
  // Ini memastikan bahwa saat handler exit berjalan, pengecekan status DB menunjukkan
  // 'Stopping' sehingga logika reconnect tidak akan melanjutkan spawn process baru.
  db.prepare('UPDATE streams SET status = ?, stopped_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('Stopping', new Date().toISOString(), numericId);
  
  // Hapus dari map SEBELUM kill agar handler exit tidak menemukan entry di runningProcesses
  runningProcesses.delete(numericId);
  
  // Kirim sinyal stop
  try {
    item.process.kill('SIGTERM');
  } catch (e) {
    // Process mungkin sudah mati — abaikan error ini
    logEvent('WARN', 'FFmpeg Server', `Gagal mengirim SIGTERM ke stream #${numericId}: ${e.message}`);
  }
  
  logEvent('INFO', 'FFmpeg Server', `Perintah stop dikirim ke stream #${numericId}`);
  return { stopped: true };
}
