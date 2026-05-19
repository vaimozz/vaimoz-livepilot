import { logEvent } from '../db/database.js';

export function notFound(req, res) {
  res.status(404).json({ error: `Route tidak ditemukan: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.status || 500;
  logEvent('ERROR', 'Server', error.message || 'Unknown error');
  res.status(status).json({ error: error.message || 'Terjadi error server.' });
}
