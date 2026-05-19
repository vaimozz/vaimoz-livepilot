import fs from 'node:fs';
import assert from 'node:assert/strict';

const requiredFiles = [
  'app.js',
  'db/database.js',
  'middleware/auth.js',
  'middleware/errorHandler.js',
  'services/http/auth.routes.js',
  'services/http/assets.routes.js',
  'services/http/youtube.routes.js',
  'services/ffmpegRunner.js',
  'services/youtubeService.js',
  'utils/config.js',
  'client/src/main.jsx',
  'Dockerfile',
  'docker-compose.yml',
];

for (const file of requiredFiles) {
  assert.ok(fs.existsSync(file), `${file} harus tersedia`);
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert.ok(packageJson.dependencies.express, 'Express harus terpasang');
assert.ok(packageJson.dependencies['better-sqlite3'], 'SQLite dependency harus terpasang');
assert.ok(packageJson.dependencies.googleapis, 'YouTube API dependency harus terpasang');
assert.ok(packageJson.dependencies['node-cron'], 'Scheduler dependency harus terpasang');
assert.equal(packageJson.scripts.start, 'node app.js', 'start script harus menjalankan app.js');

console.log('Server smoke tests passed.');
