import 'dotenv/config';
import path from 'node:path';

const rootDir = process.cwd();

// BUG-H1 FIX: Beri peringatan keras jika JWT_SECRET belum diset di production
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret === 'dev-only-change-me') {
  if (process.env.NODE_ENV === 'production') {
    // Di production, tolak startup dengan secret default — ini adalah celah keamanan kritis
    throw new Error(
      '[SECURITY] JWT_SECRET belum diset atau masih memakai nilai default "dev-only-change-me". ' +
      'Set JWT_SECRET di file .env sebelum menjalankan di production. ' +
      'Gunakan: npm run generate-secret'
    );
  } else {
    console.warn(
      '\x1b[33m[SECURITY WARNING]\x1b[0m JWT_SECRET menggunakan nilai default "dev-only-change-me". ' +
      'Ini TIDAK AMAN untuk production. Set JWT_SECRET di file .env.'
    );
  }
}

// BUG-H2 FIX: Beri peringatan jika admin password masih default
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
if (adminPassword === 'admin123' && process.env.NODE_ENV !== 'test') {
  console.warn(
    '\x1b[33m[SECURITY WARNING]\x1b[0m ADMIN_PASSWORD menggunakan nilai default "admin123". ' +
    'Set ADMIN_PASSWORD di file .env dan jalankan ulang untuk keamanan.'
  );
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8787),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:8787',
  // BUG-H1 FIX: Gunakan secret yang sudah divalidasi di atas
  jwtSecret: jwtSecret || 'dev-only-change-me',
  databasePath: path.resolve(rootDir, process.env.DATABASE_PATH || './database.sqlite'),
  uploadDir: path.resolve(rootDir, process.env.UPLOAD_DIR || './public/uploads'),
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  // BUG-H2 FIX: Gunakan password yang sudah divalidasi di atas
  adminPassword,
  adminDisplayName: process.env.ADMIN_DISPLAY_NAME || 'Admin Vaimoz',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8787/api/youtube/callback',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
};
