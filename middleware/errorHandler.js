import { logEvent } from '../db/database.js';

export function notFound(req, res) {
  res.status(404).json({ error: `Route tidak ditemukan: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  
  let status = parseInt(error.status || error.code, 10);
  if (isNaN(status) || status < 100 || status > 599) {
    status = 500;
  }

  // Mencegah API eksternal (spt YouTube) yang melempar 401 membuat user Vaimoz ter-logout.
  // Auth internal kita (middleware/auth.js) langsung me-return res.status(401) tanpa lewat errorHandler.
  if (status === 401) {
    status = 400;
  }

  logEvent('ERROR', 'Server', error.message || 'Unknown error');
  res.status(status).json({ error: error.message || 'Terjadi error server.' });
}
