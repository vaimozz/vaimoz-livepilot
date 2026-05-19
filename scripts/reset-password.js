import bcrypt from 'bcryptjs';
import { db, initDatabase } from '../db/database.js';

initDatabase();
const username = process.argv[2] || process.env.ADMIN_USERNAME || 'admin';
const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'admin123';
if (password.length < 6) throw new Error('Password minimal 6 karakter.');
const hash = await bcrypt.hash(password, 10);
const result = db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?').run(hash, username);
if (result.changes === 0) throw new Error(`User ${username} tidak ditemukan.`);
console.log(`Password user ${username} berhasil direset.`);
