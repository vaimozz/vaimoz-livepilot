import { Router } from 'express';
import { db } from '../../db/database.js';
import { startProductionJob } from '../productionService.js';
// BUG-C1 FIX: Perbaiki import path — file adalah middleware/auth.js bukan middleware/requireAuth.js
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const productionRouter = Router();

productionRouter.use(requireAuth);

// BUG-C1 FIX: Gunakan asyncHandler agar unhandled promise rejection ter-forward ke Express error middleware
productionRouter.get('/jobs', asyncHandler(async (req, res) => {
  const jobs = db.prepare('SELECT * FROM production_jobs ORDER BY created_at DESC LIMIT 20').all();
  res.json({ jobs });
}));

productionRouter.post('/start', asyncHandler(async (req, res) => {
  const { name, backgrounds, audios, shuffleAudio, duration, resolution } = req.body;
  
  if (!name || !backgrounds || !backgrounds.length) {
    return res.status(400).json({ error: 'Nama dan setidaknya 1 background wajib diisi.' });
  }

  const jobConfig = JSON.stringify({ backgrounds, audios, shuffleAudio, duration, resolution, name });
  
  const insert = db.prepare(`
    INSERT INTO production_jobs (name, status, progress, config_json) 
    VALUES (?, 'Menunggu', 0, ?)
  `).run(name, jobConfig);
  
  const jobId = insert.lastInsertRowid;
  
  // Start job asynchronously
  setTimeout(() => startProductionJob(jobId), 100);
  
  res.json({ success: true, jobId });
}));

productionRouter.delete('/jobs/:id', asyncHandler(async (req, res) => {
  // BUG-M4 pattern: validasi id sebagai integer
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID job tidak valid.' });
  }
  const job = db.prepare('SELECT status FROM production_jobs WHERE id = ?').get(id);
  if (!job) return res.status(404).json({ error: 'Job tidak ditemukan' });
  if (job.status === 'Memproses') {
    return res.status(400).json({ error: 'Job sedang berjalan, tidak bisa dihapus.' });
  }
  
  db.prepare('DELETE FROM production_jobs WHERE id = ?').run(id);
  res.json({ success: true });
}));
