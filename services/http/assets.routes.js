import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../../utils/config.js';
import { db, readJson, writeJson, logEvent } from '../../db/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { serializeAsset } from '../../utils/serializers.js';

export const assetsRouter = Router();

// ── In-memory job store untuk tracking progress download GDrive ──
const downloadJobs = new Map();
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of downloadJobs.entries()) {
    if (job.createdAt < cutoff) downloadJobs.delete(id);
  }
}, 5 * 60 * 1000);

async function runGdriveDownload(jobId, fileId, urlOrId) {
  const job = downloadJobs.get(jobId);
  if (!job) return;
  try {
    job.status = 'connecting';
    const response = await fetchGoogleDrivePublicFile(fileId);
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    const mimeType = response.headers.get('content-type') || 'application/octet-stream';
    const fallbackName = `gdrive-${fileId}.mp4`;
    const filename = getFilenameFromDisposition(response.headers.get('content-disposition'), fallbackName) || fallbackName;
    job.filename = filename;
    job.total = contentLength;
    job.status = 'downloading';
    fs.mkdirSync(config.uploadDir, { recursive: true });
    const finalPath = getAvailablePath(config.uploadDir, filename);
    let downloaded = 0;
    const counter = new Transform({
      transform(chunk, _enc, cb) {
        downloaded += chunk.length;
        job.progress = downloaded;
        cb(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(response.body), counter, fs.createWriteStream(finalPath));
    const stat = fs.statSync(finalPath);
    if (stat.size === 0) {
      fs.unlinkSync(finalPath);
      job.status = 'error';
      job.error = 'File Google Drive kosong atau gagal diunduh.';
      return;
    }
    const asset = insertAsset({
      name: filename,
      originalName: filename,
      type: detectTypeFromMime(mimeType),
      mimeType,
      source: 'Google Drive',
      filePath: finalPath,
      sizeBytes: stat.size,
      metadata: { url: urlOrId, fileId, storageName: path.basename(finalPath), downloadedAt: new Date().toISOString() },
    });
    job.status = 'done';
    job.progress = stat.size;
    job.total = stat.size;
    job.asset = asset;
    logEvent('INFO', 'Aset', `${filename} berhasil diunduh dari Google Drive.`);
  } catch (err) {
    const j = downloadJobs.get(jobId);
    if (j) { j.status = 'error'; j.error = err.message || 'Gagal mengunduh.'; }
  }
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;

const storage = multer.diskStorage({
  destination(req, file, cb) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
    cb(null, config.uploadDir);
  },
  filename(req, file, cb) {
    const safeOriginal = sanitizeFileName(file.originalname || 'upload.bin') || 'upload.bin';
    cb(null, `${Date.now()}-${safeOriginal}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 20 },
});

function sanitizeFileName(name) {
  return String(name || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^\.+/, '')
    .slice(0, 180);
}

function detectTypeFromMime(mime = '') {
  if (mime.startsWith('image/')) return 'Thumbnail';
  if (mime.startsWith('audio/')) return 'Audio';
  return 'Video';
}

function detectType(file) {
  return detectTypeFromMime(file.mimetype || '');
}

function getAvailablePath(directory, filename) {
  const safeName = sanitizeFileName(filename) || `asset-${Date.now()}`;
  const parsed = path.parse(safeName);
  let candidate = path.join(directory, safeName);
  let counter = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(directory, `${parsed.name}-${counter}${parsed.ext}`);
    counter += 1;
  }
  return candidate;
}

function parseGoogleDriveFileId(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  const filePathMatch = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (filePathMatch?.[1]) return filePathMatch[1];
  const idParamMatch = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch?.[1]) return idParamMatch[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw)) return raw;
  return '';
}

function getFilenameFromDisposition(header, fallback) {
  const value = String(header || '');
  const utfMatch = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return sanitizeFileName(decodeURIComponent(utfMatch[1]));
  const match = value.match(/filename="?([^";]+)"?/i);
  if (match?.[1]) return sanitizeFileName(match[1]);
  return fallback;
}

async function fetchGoogleDrivePublicFile(fileId) {
  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
  };

  // URL baru resmi Google Drive (lebih andal untuk file publik)
  const primaryUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&authuser=0&confirm=t`;
  let response = await fetch(primaryUrl, { redirect: 'follow', headers: HEADERS });
  let contentType = response.headers.get('content-type') || '';

  // Jika sudah berhasil mendapat file langsung, kembalikan
  if (response.ok && !contentType.includes('text/html')) {
    return response;
  }

  // Fallback: coba URL lama dengan confirm=t (bypass virus-scan warning)
  const fallbackUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${encodeURIComponent(fileId)}`;
  response = await fetch(fallbackUrl, { redirect: 'follow', headers: HEADERS });
  contentType = response.headers.get('content-type') || '';

  // Jika masih HTML, coba parsing token konfirmasi dari halaman
  if (contentType.includes('text/html')) {
    const html = await response.text();

    // Berbagai pola token konfirmasi dari Google Drive (format lama & baru)
    const confirmPatterns = [
      /[?&]confirm=([0-9A-Za-z_-]+)/,
      /confirm=([0-9A-Za-z_-]{4,})/,
      /"confirm":"([^"]+)"/,
      /confirm%3D([0-9A-Za-z_-]+)/,
    ];
    let confirmToken = '';
    for (const pattern of confirmPatterns) {
      const match = html.match(pattern);
      if (match?.[1] && match[1] !== 't') { confirmToken = match[1]; break; }
    }

    const uuidMatch = html.match(/[?&"']uuid=([0-9A-Za-z_-]+)/) || html.match(/"uuid":"([^"]+)"/);
    const uuid = uuidMatch?.[1] || '';

    if (confirmToken) {
      const confirmUrl = `https://drive.google.com/uc?export=download&confirm=${encodeURIComponent(confirmToken)}&id=${encodeURIComponent(fileId)}${uuid ? `&uuid=${encodeURIComponent(uuid)}` : ''}`;
      response = await fetch(confirmUrl, { redirect: 'follow', headers: HEADERS });
      contentType = response.headers.get('content-type') || '';
    }

    // Masih HTML berarti file benar-benar tidak publik
    if (contentType.includes('text/html')) {
      const error = new Error('File Google Drive tidak bisa diunduh. Pastikan pengaturan berbagi diset ke "Anyone with the link" dan coba lagi.');
      error.status = 400;
      throw error;
    }
  }

  if (!response.ok) {
    const error = new Error(`Gagal download Google Drive. HTTP ${response.status}`);
    error.status = 400;
    throw error;
  }

  return response;
}

function insertAsset({ name, originalName, type, mimeType, source, filePath, sizeBytes, metadata }) {
  const result = db.prepare(`
    INSERT INTO assets (name, original_name, type, mime_type, source, path, size_bytes, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, originalName, type, mimeType, source, filePath, sizeBytes, writeJson(metadata || {}));
  return serializeAsset(db.prepare('SELECT * FROM assets WHERE id = ?').get(result.lastInsertRowid));
}

assetsRouter.use(requireAuth);

assetsRouter.get('/', asyncHandler(async (req, res) => {
  const type = req.query.type ? String(req.query.type) : '';
  const rows = type
    ? db.prepare('SELECT * FROM assets WHERE type = ? ORDER BY created_at DESC').all(type)
    : db.prepare('SELECT * FROM assets ORDER BY created_at DESC').all();
  res.json({ assets: rows.map(serializeAsset) });
}));

assetsRouter.post('/upload', upload.array('files', 20), asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (files.length === 0) return res.status(400).json({ error: 'Pilih file terlebih dahulu.' });

  const created = [];
  for (const file of files) {
    try {
      const asset = insertAsset({
        name: file.originalname,
        originalName: file.originalname,
        type: detectType(file),
        mimeType: file.mimetype,
        source: 'Lokal',
        filePath: file.path,
        sizeBytes: file.size,
        metadata: { storageName: file.filename },
      });
      created.push(asset);
    } catch (err) {
      // BUG-021 FIX: Hapus file dari disk jika gagal insert ke database
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      logEvent('ERROR', 'Aset', `Gagal menyimpan metadata file upload: ${err.message}`);
    }
  }

  if (created.length === 0) {
    return res.status(500).json({ error: 'Semua file gagal disimpan ke database.' });
  }

  logEvent('INFO', 'Aset', `${created.length} file berhasil diupload dari perangkat.`);
  res.status(201).json({ assets: created });
}));

// Mulai download GDrive secara async, kembalikan jobId
assetsRouter.post('/gdrive', asyncHandler(async (req, res) => {
  const urlOrId = String(req.body.url || '').trim();
  const fileId = parseGoogleDriveFileId(urlOrId);
  if (!fileId) return res.status(400).json({ error: 'URL atau ID Google Drive tidak valid.' });
  const jobId = `gdrive-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  downloadJobs.set(jobId, { status: 'connecting', progress: 0, total: 0, filename: '', error: null, asset: null, createdAt: Date.now() });
  runGdriveDownload(jobId, fileId, urlOrId).catch(() => {});
  res.status(202).json({ jobId });
}));

// Polling progress download GDrive
assetsRouter.get('/gdrive/progress/:jobId', asyncHandler(async (req, res) => {
  const job = downloadJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job tidak ditemukan atau sudah selesai.' });
  res.json({ status: job.status, progress: job.progress, total: job.total, filename: job.filename, error: job.error, asset: job.asset });
}));

assetsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const name = sanitizeFileName(req.body.name);
  if (!name) return res.status(400).json({ error: 'Nama file wajib diisi.' });

  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Aset tidak ditemukan.' });

  let nextPath = row.path;
  let metadata = readJson(row.metadata_json, {});
  let renamedOnDisk = false;

  try {
    if (row.path && row.path.startsWith(config.uploadDir) && fs.existsSync(row.path)) {
      const directory = path.dirname(row.path);
      const currentExt = path.extname(row.path);
      const requestedExt = path.extname(name);
      const safeFileName = requestedExt ? name : `${name}${currentExt}`;
      nextPath = getAvailablePath(directory, safeFileName);
      if (nextPath !== row.path) {
        fs.renameSync(row.path, nextPath);
        renamedOnDisk = true;
      }
      metadata = { ...metadata, storageName: path.basename(nextPath), renamedFrom: row.name };
    }

    db.prepare('UPDATE assets SET name = ?, path = ?, metadata_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(name, nextPath, writeJson(metadata), id);
      
  } catch (err) {
    // Rollback rename if DB fails
    if (renamedOnDisk && fs.existsSync(nextPath)) {
      fs.renameSync(nextPath, row.path);
    }
    return res.status(500).json({ error: `Gagal memperbarui aset: ${err.message}` });
  }

  const updated = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
  res.json({ asset: serializeAsset(updated) });
}));

assetsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Aset tidak ditemukan.' });

  // Delete from DB first, then from disk
  db.prepare('DELETE FROM assets WHERE id = ?').run(id);

  if (row.path && row.path.startsWith(config.uploadDir) && fs.existsSync(row.path)) {
    try {
      fs.unlinkSync(row.path);
    } catch (e) {
      logEvent('WARN', 'Aset', `Gagal menghapus file fisik ${row.path}: ${e.message}`);
    }
  }
  
  res.json({ ok: true });
}));
