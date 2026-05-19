import jwt from 'jsonwebtoken';
import { config } from '../utils/config.js';
import { db } from '../db/database.js';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, displayName: user.display_name || user.displayName },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Token tidak ditemukan.' });

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = db.prepare('SELECT id, username, display_name FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'User tidak valid.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token tidak valid atau sudah expired.' });
  }
}
