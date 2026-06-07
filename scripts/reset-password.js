import bcrypt from 'bcryptjs';
import { db, initDatabase } from '../db/database.js';

initDatabase();
const username = process.argv[2] || process.env.ADMIN_USERNAME || 'admin';
const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'admin123';

// Validasi password — minimal 8 karakter dengan huruf dan angka (konsisten dengan auth.routes.js)
if (password.length < 8) throw new Error('Password minimal 8 karakter.');
if (!/[a-zA-Z]/.test(password)) throw new Error('Password harus mengandung minimal 1 huruf.');
if (!/[0-9]/.test(password)) throw new Error('Password harus mengandung minimal 1 angka.');

const hash = await bcrypt.hash(password, 12);
const result = db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?').run(hash, username);
if (result.changes === 0) throw new Error(`User "${username}" tidak ditemukan.`);
console.log(`Password user ${username} berhasil direset.`);
