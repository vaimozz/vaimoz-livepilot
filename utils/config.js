import 'dotenv/config';
import path from 'node:path';

const rootDir = process.cwd();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8787),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:8787',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  databasePath: path.resolve(rootDir, process.env.DATABASE_PATH || './database.sqlite'),
  uploadDir: path.resolve(rootDir, process.env.UPLOAD_DIR || './public/uploads'),
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  adminDisplayName: process.env.ADMIN_DISPLAY_NAME || 'Admin Vaimoz',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8787/api/youtube/callback',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
};
