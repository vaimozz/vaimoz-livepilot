import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../db/database.js';
import { signToken, requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { serializeUser } from '../../utils/serializers.js';

export const authRouter = Router();

function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

// BUG-L5 FIX: Validasi kekuatan password yang lebih ketat
// Password wajib minimal 8 karakter dan mengandung setidaknya 1 huruf + 1 angka.
const WEAK_PASSWORDS = new Set([
  'admin123', 'password', '12345678', 'password1', 'admin1234',
  'qwerty123', '11111111', 'abc12345', 'admin@123', 'adminadmin',
]);

function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return 'Password minimal 8 karakter.';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Password harus mengandung minimal 1 huruf.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password harus mengandung minimal 1 angka.';
  }
  if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    return 'Password terlalu umum dan mudah ditebak. Gunakan kombinasi yang lebih unik.';
  }
  return null; // valid
}

// BUG-015 FIX: Endpoint register dilindungi — hanya admin yang sudah login yang bisa buat akun baru
// Jika belum ada akun sama sekali (first install), izinkan daftar tanpa login
authRouter.post('/register', (req, res, next) => {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount === 0) return next();
  return requireAuth(req, res, next);
}, asyncHandler(async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const displayName = String(req.body.displayName || username || 'Admin Vaimoz').trim();

  if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi.' });

  // BUG-L5 FIX: Gunakan validasi kekuatan password yang lebih ketat
  const passwordError = validatePasswordStrength(password);
  if (passwordError) return res.status(400).json({ error: passwordError });

  // Validasi panjang dan karakter username
  if (username.length < 3) return res.status(400).json({ error: 'Username minimal 3 karakter.' });
  if (username.length > 50) return res.status(400).json({ error: 'Username maksimal 50 karakter.' });
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return res.status(400).json({ error: 'Username hanya boleh berisi huruf, angka, underscore, titik, dan tanda hubung.' });
  }

  if (getUserByUsername(username)) return res.status(409).json({ error: 'Username sudah terdaftar.' });

  const passwordHash = await bcrypt.hash(password, 12); // cost factor 12 lebih aman dari default 10
  const result = db.prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)').run(username, passwordHash, displayName);
  const user = db.prepare('SELECT id, username, display_name, created_at, updated_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = signToken(user);
  res.status(201).json({ token, user: serializeUser(user) });
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi.' });

  const user = getUserByUsername(username);
  if (!user) return res.status(401).json({ error: 'Username atau password salah.' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Username atau password salah.' });

  const token = signToken(user);
  res.json({ token, user: serializeUser(user) });
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: serializeUser(req.user) });
}));

authRouter.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const displayName = String(req.body.displayName || req.user.display_name || '').trim();
  const password = String(req.body.password || '');
  if (!displayName) return res.status(400).json({ error: 'Nama akun wajib diisi.' });

  if (password) {
    // BUG-L5 FIX: Validasi kekuatan password saat ganti password juga
    const passwordError = validatePasswordStrength(password);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const passwordHash = await bcrypt.hash(password, 12); // cost factor 12
    db.prepare('UPDATE users SET display_name = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(displayName, passwordHash, req.user.id);
  } else {
    db.prepare('UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(displayName, req.user.id);
  }

  const user = db.prepare('SELECT id, username, display_name, created_at, updated_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: serializeUser(user) });
}));
