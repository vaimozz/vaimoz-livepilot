#!/usr/bin/env node

/**
 * YouTube OAuth Setup Helper
 * 
 * Script ini membantu setup YouTube OAuth credentials
 * dan memverifikasi konfigurasi yang diperlukan.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });
  return env;
}

function writeEnvFile(filePath, env) {
  const lines = [];
  for (const [key, value] of Object.entries(env)) {
    lines.push(`${key}=${value}`);
  }
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

async function main() {
  console.clear();
  log('═══════════════════════════════════════════════════════', 'info');
  log('   YouTube OAuth Setup Helper - Vaimoz LivePilot', 'info');
  log('═══════════════════════════════════════════════════════', 'info');
  console.log();

  // Check if .env exists
  let env = {};
  if (fs.existsSync(envPath)) {
    log('✓ File .env ditemukan', 'success');
    env = readEnvFile(envPath);
  } else {
    log('✗ File .env tidak ditemukan', 'warning');
    if (fs.existsSync(envExamplePath)) {
      log('→ Copying .env.example to .env...', 'info');
      fs.copyFileSync(envExamplePath, envPath);
      env = readEnvFile(envPath);
      log('✓ File .env berhasil dibuat', 'success');
    } else {
      log('✗ File .env.example tidak ditemukan', 'error');
      process.exit(1);
    }
  }
  console.log();

  // Check current configuration
  log('Current Configuration:', 'info');
  log('─────────────────────────────────────────────────────', 'info');
  console.log(`GOOGLE_CLIENT_ID:     ${env.GOOGLE_CLIENT_ID || '(not set)'}`);
  console.log(`GOOGLE_CLIENT_SECRET: ${env.GOOGLE_CLIENT_SECRET ? '(set)' : '(not set)'}`);
  console.log(`GOOGLE_REDIRECT_URI:  ${env.GOOGLE_REDIRECT_URI || '(not set)'}`);
  console.log();

  // Ask if user wants to update
  const shouldUpdate = await question('Apakah Anda ingin mengupdate OAuth credentials? (y/n): ');
  if (shouldUpdate.toLowerCase() !== 'y') {
    log('Setup dibatalkan.', 'warning');
    rl.close();
    return;
  }
  console.log();

  // Instructions
  log('Instruksi:', 'info');
  log('─────────────────────────────────────────────────────', 'info');
  console.log('1. Buka Google Cloud Console: https://console.cloud.google.com/');
  console.log('2. Buat project baru atau pilih existing project');
  console.log('3. Enable "YouTube Data API v3"');
  console.log('4. Buat OAuth 2.0 credentials (Web application)');
  console.log('5. Tambahkan Authorized Redirect URI:');
  console.log('   → http://localhost:8787/api/youtube/callback');
  console.log('6. Copy Client ID dan Client Secret');
  console.log();

  // Get Client ID
  const clientId = await question('Masukkan GOOGLE_CLIENT_ID: ');
  if (!clientId.trim()) {
    log('✗ Client ID tidak boleh kosong', 'error');
    rl.close();
    return;
  }
  env.GOOGLE_CLIENT_ID = clientId.trim();

  // Get Client Secret
  const clientSecret = await question('Masukkan GOOGLE_CLIENT_SECRET: ');
  if (!clientSecret.trim()) {
    log('✗ Client Secret tidak boleh kosong', 'error');
    rl.close();
    return;
  }
  env.GOOGLE_CLIENT_SECRET = clientSecret.trim();

  // Get Redirect URI (with default)
  const defaultRedirectUri = 'http://localhost:8787/api/youtube/callback';
  const redirectUri = await question(`Masukkan GOOGLE_REDIRECT_URI [${defaultRedirectUri}]: `);
  env.GOOGLE_REDIRECT_URI = redirectUri.trim() || defaultRedirectUri;

  console.log();

  // Save to .env
  log('Menyimpan konfigurasi ke .env...', 'info');
  
  // Read full .env content to preserve other settings
  let envContent = fs.readFileSync(envPath, 'utf-8');
  
  // Update only Google OAuth settings
  envContent = envContent.replace(
    /GOOGLE_CLIENT_ID=.*/,
    `GOOGLE_CLIENT_ID=${env.GOOGLE_CLIENT_ID}`
  );
  envContent = envContent.replace(
    /GOOGLE_CLIENT_SECRET=.*/,
    `GOOGLE_CLIENT_SECRET=${env.GOOGLE_CLIENT_SECRET}`
  );
  envContent = envContent.replace(
    /GOOGLE_REDIRECT_URI=.*/,
    `GOOGLE_REDIRECT_URI=${env.GOOGLE_REDIRECT_URI}`
  );
  
  fs.writeFileSync(envPath, envContent, 'utf-8');
  log('✓ Konfigurasi berhasil disimpan', 'success');
  console.log();

  // Verification
  log('Verifikasi:', 'info');
  log('─────────────────────────────────────────────────────', 'info');
  console.log(`✓ GOOGLE_CLIENT_ID:     ${env.GOOGLE_CLIENT_ID}`);
  console.log(`✓ GOOGLE_CLIENT_SECRET: ${env.GOOGLE_CLIENT_SECRET.substring(0, 10)}...`);
  console.log(`✓ GOOGLE_REDIRECT_URI:  ${env.GOOGLE_REDIRECT_URI}`);
  console.log();

  // Next steps
  log('Next Steps:', 'success');
  log('─────────────────────────────────────────────────────', 'success');
  console.log('1. Restart server: npm run dev');
  console.log('2. Buka aplikasi: http://localhost:5173');
  console.log('3. Login dengan admin/admin123');
  console.log('4. Buka Settings page');
  console.log('5. Klik "Add Channel" untuk connect YouTube channel');
  console.log();

  log('✓ Setup selesai!', 'success');
  log('═══════════════════════════════════════════════════════', 'info');

  rl.close();
}

main().catch(error => {
  log(`Error: ${error.message}`, 'error');
  rl.close();
  process.exit(1);
});
