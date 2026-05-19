# Vaimoz LivePilot

Starter full-stack untuk aplikasi live streaming otomatis: React Vite + Node.js + SQLite + FFmpeg + YouTube API + Docker.

## Struktur folder

```txt
vaimoz-livepilot/
  .github/
  db/
  middleware/
  models/
  public/
  scripts/
  services/
  utils/
  views/
  client/
  app.js
  database.sqlite
  docker-compose.yml
  Dockerfile
  package.json
```

## Jalankan lokal

```bash
cp .env.example .env
npm install
npm run dev
```

Frontend dev: `http://localhost:5173`  
Backend API: `http://localhost:8787`

Login default:

```txt
username: admin
password: admin123
```

## Build production

```bash
npm run build
npm start
```

Setelah build, frontend React masuk ke `public/frontend/` dan disajikan oleh `app.js`.

## Jalankan Docker

```bash
cp .env.example .env
docker compose up --build -d
```

Buka:

```txt
http://localhost:8787
```

## Script penting

```bash
npm run generate-secret
npm run migrate
npm run seed:admin
npm run reset-password -- admin passwordbaru
npm run smoke:server
```

## API utama

```txt
GET  /api/health
POST /api/auth/login
POST /api/auth/register
GET  /api/assets
POST /api/assets/upload
POST /api/assets/gdrive
GET  /api/playlists
POST /api/playlists
GET  /api/campaigns
POST /api/campaigns
POST /api/streams/start
POST /api/streams/:id/stop
GET  /api/youtube/auth-url
GET  /api/monitor/logs
```

## Catatan

- FFmpeg harus tersedia di server atau container.
- YouTube API membutuhkan OAuth Client ID/Secret valid dari Google Cloud Console.
- SQLite default: `./database.sqlite`.
- Upload default: `./public/uploads`.
