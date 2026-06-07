// BUG-C2 FIX: Pindahkan import os ke atas file agar tersedia sebelum startProductionJob() dipanggil.
// Dalam ESM, import harus dideklarasikan di atas sebelum digunakan.
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { db, logEvent } from '../db/database.js';
import { config } from '../utils/config.js';

export function startProductionJob(jobId) {
  const job = db.prepare('SELECT * FROM production_jobs WHERE id = ?').get(jobId);
  if (!job) return;

  try {
    const parsedConfig = JSON.parse(job.config_json);
    const { backgrounds = [], audios = [], shuffleAudio = false, duration = 60, resolution = '1080p Full HD', name = 'Album Output' } = parsedConfig;

    if (!backgrounds.length) throw new Error('Minimal 1 background (Video/Gambar) harus dipilih.');
    
    // Get assets
    const bgAssets = backgrounds.map(id => db.prepare('SELECT * FROM assets WHERE id = ?').get(id)).filter(Boolean);
    const audioAssets = audios.map(id => db.prepare('SELECT * FROM assets WHERE id = ?').get(id)).filter(Boolean);

    if (!bgAssets.length) throw new Error('Background terpilih tidak ditemukan di database.');

    db.prepare('UPDATE production_jobs SET status = ?, progress = ? WHERE id = ?').run('Memproses', 0, jobId);

    // Create temp files for concat demuxer
    const tempDir = path.join(os.tmpdir() || '/tmp', `livepilot_prod_${jobId}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const videoListPath = path.join(tempDir, 'videos.txt');
    let videoListContent = '';
    for (const bg of bgAssets) {
        // Konversi backslash Windows ke forward slash agar FFmpeg concat demuxer bisa membaca path
        const safePath = bg.path.replace(/\\/g, '/').replace(/'/g, "'\\''");
        videoListContent += `file '${safePath}'\n`;
    }
    fs.writeFileSync(videoListPath, videoListContent);

    let audioListPath = null;
    if (audioAssets.length > 0) {
        audioListPath = path.join(tempDir, 'audios.txt');
        let audioListToUse = [...audioAssets];
        if (shuffleAudio) {
            audioListToUse = audioListToUse.sort(() => Math.random() - 0.5);
        }
        let audioListContent = '';
        for (const au of audioListToUse) {
            // Konversi backslash Windows ke forward slash agar FFmpeg concat demuxer bisa membaca path
            const safePath = au.path.replace(/\\/g, '/').replace(/'/g, "'\\''");
            audioListContent += `file '${safePath}'\n`;
        }
        fs.writeFileSync(audioListPath, audioListContent);
    }

    const outputFileName = `prod_${Date.now()}_${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
    const outputPath = path.join(config.uploadDir, outputFileName);
    // Konversi ke forward slash untuk kompatibilitas FFmpeg di Windows
    const outputPathFFmpeg = outputPath.replace(/\\/g, '/');

    const args = [];
    
    // Video input (looped)
    args.push('-stream_loop', '-1', '-f', 'concat', '-safe', '0', '-i', videoListPath);
    
    // Audio input (looped, if exists)
    if (audioListPath) {
        args.push('-stream_loop', '-1', '-f', 'concat', '-safe', '0', '-i', audioListPath);
    }

    // Duration limit
    const totalSeconds = duration * 60;
    args.push('-t', totalSeconds.toString());

    // Mapping
    args.push('-map', '0:v');
    if (audioListPath) {
        args.push('-map', '1:a');
    }

    // Encoder settings
    const presetByResolution = {
      '720p HD': { scale: '1280:720', bitrate: '3000k' },
      '1080p Full HD': { scale: '1920:1080', bitrate: '4500k' },
      '1440p 2K': { scale: '2560:1440', bitrate: '9000k' },
      '2160p 4K': { scale: '3840:2160', bitrate: '18000k' },
    };

    if (resolution === 'Original' || !presetByResolution[resolution]) {
        // If original, we might need to re-encode if we map multiple things, but let's try copy if no audio?
        // Actually, if combining audio and video from different sources, re-encoding audio is safer.
        args.push('-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p');
    } else {
        const selected = presetByResolution[resolution];
        args.push('-vf', `scale=${selected.scale}`);
        args.push('-c:v', 'libx264', '-preset', 'fast', '-b:v', selected.bitrate, '-pix_fmt', 'yuv420p');
    }

    if (audioListPath) {
        args.push('-c:a', 'aac', '-b:a', '128k', '-ar', '44100');
    }

    // Output format — gunakan path FFmpeg (forward slash) sebagai output
    args.push('-y', outputPathFFmpeg);

    logEvent('INFO', 'Production', `Memulai FFmpeg untuk job #${jobId}: ffmpeg ${args.join(' ')}`);

    const ffmpegProcess = spawn(config.ffmpegPath, args);

    ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString();
        // Parse time=00:00:00.00
        const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})/);
        if (timeMatch) {
            const h = parseInt(timeMatch[1], 10);
            const m = parseInt(timeMatch[2], 10);
            const s = parseInt(timeMatch[3], 10);
            const currentSeconds = (h * 3600) + (m * 60) + s;
            
            let progress = Math.round((currentSeconds / totalSeconds) * 100);
            if (progress > 100) progress = 100;
            
            // Limit DB updates to avoid locking
            db.prepare('UPDATE production_jobs SET progress = ? WHERE id = ?').run(progress, jobId);
        }
    });

    ffmpegProcess.on('close', (code) => {
        fs.rmSync(tempDir, { recursive: true, force: true });
        
        if (code === 0) {
            // Success, insert into assets
            const stats = fs.statSync(outputPath);
            const insertAsset = db.prepare(`
                INSERT INTO assets (name, original_name, type, mime_type, source, path, size_bytes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(name, name + '.mp4', 'Video', 'video/mp4', 'Produksi', outputPath, stats.size);
            
            db.prepare('UPDATE production_jobs SET status = ?, progress = ?, result_asset_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run('Selesai', 100, insertAsset.lastInsertRowid, jobId);
              
            logEvent('INFO', 'Production', `Job #${jobId} selesai. Asset baru: ${name}`);
        } else {
            db.prepare('UPDATE production_jobs SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run('Gagal', `FFmpeg exit code ${code}`, jobId);
            logEvent('ERROR', 'Production', `Job #${jobId} gagal dengan kode ${code}`);
        }
    });

  } catch (error) {
    db.prepare('UPDATE production_jobs SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('Gagal', error.message, jobId);
    logEvent('ERROR', 'Production', `Gagal memulai job #${jobId}: ${error.message}`);
  }
}
