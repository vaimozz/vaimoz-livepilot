# Vaimoz LivePilot

[![Version](https://img.shields.io/badge/version-0.3.0-blue.svg)](https://github.com/vaimozz/vaimoz-livepilot/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/vaimozz/vaimoz-livepilot/pulls)

Platform live streaming automation berbasis web untuk konten creator. Streaming otomatis 24/7 ke YouTube dengan FFmpeg, integrasi YouTube Data API v3, chatbot otomatis, real-time analytics, penjadwalan fleksibel, dan notifikasi Telegram.

**[⚡ Quick Start](#-quick-start) · [🐳 Docker](#-docker) · [📡 API](#-api-reference) · [🔧 Troubleshooting](#-troubleshooting)**

---

## Fitur

| Kategori | Fitur |
|---|---|
| **Streaming** | FFmpeg streaming, YouTube Live API, Manual RTMP, auto-reconnect (3x retry) |
| **Aset** | Upload lokal, import Google Drive, library management, metadata otomatis |
| **Campaign** | YouTube API mode, Manual RTMP mode, rotasi video/thumbnail acak |
| **Otomasi** | Scheduler recurring (harian/mingguan/bulanan), Smart Stop, Smart Humanizer |
| **Chatbot** | Kirim pesan ke live chat otomatis, interval custom, mode sequential/random |
| **Analytics** | Concurrent viewers, total views, likes, comments, grafik harian |
| **Notifikasi** | Telegram: stream start/stop/error, broadcast live, viewer milestone |
| **Produksi** | Gabung video + audio jadi satu file MP4 dengan FFmpeg |
| **Monitoring** | Server metrics (CPU, RAM, disk, network), activity logs real-time |

---

## Persyaratan Sistem

- **Node.js** v18+ (disarankan v22 LTS)
- **FFmpeg** di PATH sistem atau path custom via `FFMPEG_PATH`
- RAM minimal **1 GB**, disarankan 2 GB untuk streaming aktif
- **Google Cloud Project** dengan YouTube Data API v3 diaktifkan (untuk mode YouTube API)
- **Telegram Bot** opsional, untuk notifikasi

---

## Quick Start

### 1. Clone dan Install

```bash
git clone https://github.com/vaimozz/vaimoz-livepilot.git
cd vaimoz-livepilot
npm install
```

### 2. Konfigurasi Environment

```bash
cp .env.example .env
node scripts/generate-secret.js   # generate JWT_SECRET
```

Edit `.env` — minimal yang harus diisi:

```env
JWT_SECRET=hasil_dari_generate_secret_di_atas
ADMIN_PASSWORD=passwordkuat123   # ganti dari default!

# Untuk mode YouTube API (opsional jika hanya pakai Manual RTMP)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8787/api/youtube/callback
```

> **Penting:** Jangan gunakan password default `admin123` — server akan menampilkan peringatan saat startup.

### 3. Jalankan

```bash
# Development (frontend + backend berjalan bersamaan)
npm run dev
```

| URL | Keterangan |
|---|---|
| http://localhost:5173 | Frontend (Vite dev server) |
| http://localhost:8787 | Backend API |

Login pertama: username `admin`, password sesuai `ADMIN_PASSWORD` di `.env`.

### 4. Build Production

```bash
npm run build   # build frontend ke public/frontend/
npm start       # jalankan server production
```

---

## Instalasi di VPS/Server

### Install Dependencies

```bash
# Node.js v22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# FFmpeg
sudo apt install ffmpeg -y

# Verifikasi
node --version && ffmpeg -version
```

### Setup Project

```bash
git clone https://github.com/vaimozz/vaimoz-livepilot.git
cd vaimoz-livepilot
npm install
cp .env.example .env
node scripts/generate-secret.js
nano .env   # isi JWT_SECRET, ADMIN_PASSWORD, Google OAuth, dll
npm run build
```

### Konfigurasi `.env` untuk Production

```env
NODE_ENV=production
PORT=8787
CLIENT_ORIGIN=https://domainanda.com
APP_BASE_URL=https://domainanda.com

JWT_SECRET=secret_panjang_yang_aman_minimal_32_karakter
ADMIN_USERNAME=admin
ADMIN_PASSWORD=passwordkuatanda

GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=https://domainanda.com/api/youtube/callback

# Opsional
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
FFMPEG_PATH=ffmpeg
```

### Jalankan dengan PM2

```bash
sudo npm install -g pm2

pm2 start app.js --name vaimoz-livepilot
pm2 save
pm2 startup   # ikuti instruksi yang muncul untuk auto-start saat reboot
```

Perintah PM2 yang sering dipakai:

```bash
pm2 status                        # lihat status
pm2 logs vaimoz-livepilot         # lihat logs real-time
pm2 restart vaimoz-livepilot      # restart
pm2 stop vaimoz-livepilot         # stop
```

### Nginx Reverse Proxy (disarankan)

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
sudo nano /etc/nginx/sites-available/livepilot
```

```nginx
server {
    listen 80;
    server_name domainanda.com;

    client_max_body_size 5G;   # izinkan upload file besar

    location / {
        proxy_pass http://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/livepilot /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
sudo certbot --nginx -d domainanda.com   # pasang SSL (HTTPS)
```

### Firewall

```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Docker

### Jalankan dengan Docker Compose

```bash
cp .env.example .env
nano .env   # isi konfigurasi

docker compose up --build -d
```

Akses: http://localhost:8787

### Perintah Docker

```bash
docker compose logs -f              # lihat logs
docker compose restart              # restart
docker compose down                 # stop dan hapus container
docker compose up --build -d        # rebuild dan jalankan ulang
docker compose exec vaimoz-livepilot sh   # masuk ke container
```

### Reset Password (Docker)

```bash
docker compose exec vaimoz-livepilot node scripts/reset-password.js
```

### Data Persistence

Data disimpan di host dan di-mount ke container:

| Path di Host | Isi |
|---|---|
| `./database.sqlite` | Database SQLite |
| `./public/uploads/` | File yang diupload |

---

## Google Cloud Console Setup

### 1. Aktifkan YouTube Data API v3

1. Buka [Google Cloud Console](https://console.cloud.google.com) → buat project baru
2. **APIs & Services** → **Library** → cari dan aktifkan **YouTube Data API v3**
3. (Opsional tapi disarankan) aktifkan juga **YouTube Analytics API** untuk data revenue

### 2. Buat OAuth 2.0 Credentials

1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
2. Configure **OAuth consent screen** terlebih dahulu:
   - User Type: **External**
   - Scopes: tambahkan `youtube`, `youtube.force-ssl`, `youtube.upload`, `yt-analytics.readonly`
   - **Test users:** tambahkan email Google Anda — wajib jika app masih berstatus "Testing"
3. Application type: **Web application**
4. Authorized redirect URIs: `https://domainanda.com/api/youtube/callback`
5. Copy **Client ID** dan **Client Secret** ke `.env`

### 3. Troubleshoot OAuth

| Error | Penyebab | Solusi |
|---|---|---|
| `redirect_uri_mismatch` | URI tidak cocok | Samakan `GOOGLE_REDIRECT_URI` di `.env` dengan yang di Console |
| `access_denied` | Email tidak di Test Users | Tambahkan email di OAuth consent screen → Test users |
| `invalid_client` | Credentials salah | Periksa Client ID dan Secret di `.env` |

---

## Telegram Bot Setup

1. Buka Telegram → cari **@BotFather** → kirim `/newbot` → ikuti instruksi → copy **Bot Token**
2. Cari **@userinfobot** → kirim `/start` → catat **Chat ID**
3. Di aplikasi: **Settings** → **Telegram Notifications** → masukkan token dan chat ID → **Test** → **Simpan**

Atau isi langsung di `.env`:

```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdef...
TELEGRAM_CHAT_ID=123456789
```

**Jenis notifikasi yang tersedia:**

- Stream dimulai / dihentikan / error
- YouTube broadcast berhasil live
- Penonton mencapai milestone (threshold dapat diatur)
- Auto-stop ditunda karena penonton tinggi

---

## Scripts Utility

| Perintah | Fungsi |
|---|---|
| `node scripts/generate-secret.js` | Generate JWT_SECRET acak |
| `node scripts/migrate.js` | Jalankan migrasi database |
| `node scripts/seed-admin.js` | Buat ulang akun admin default |
| `node scripts/reset-password.js` | Reset password user |
| `node scripts/reset-data.js` | **Hapus semua data** (campaigns, assets, streams, logs) |
| `npm run smoke:server` | Smoke test syntax aplikasi |

---

## Variabel Environment

Semua variabel lengkap tersedia di `.env.example`. Berikut ringkasannya:

| Variabel | Wajib | Default | Keterangan |
|---|---|---|---|
| `NODE_ENV` | — | `development` | `production` untuk server |
| `PORT` | — | `8787` | Port backend |
| `CLIENT_ORIGIN` | — | `http://localhost:5173` | URL frontend untuk CORS |
| `APP_BASE_URL` | — | `http://localhost:8787` | URL base aplikasi |
| `JWT_SECRET` | ✅ | — | Minimal 32 karakter acak |
| `ADMIN_USERNAME` | — | `admin` | Username admin default |
| `ADMIN_PASSWORD` | ✅ | `admin123` | **Wajib diganti!** |
| `DATABASE_PATH` | — | `./database.sqlite` | Path file database |
| `UPLOAD_DIR` | — | `./public/uploads` | Direktori upload |
| `FFMPEG_PATH` | — | `ffmpeg` | Path binary FFmpeg |
| `GOOGLE_CLIENT_ID` | ✅* | — | *Wajib untuk YouTube API mode |
| `GOOGLE_CLIENT_SECRET` | ✅* | — | *Wajib untuk YouTube API mode |
| `GOOGLE_REDIRECT_URI` | ✅* | — | *Wajib untuk YouTube API mode |
| `TELEGRAM_BOT_TOKEN` | — | — | Opsional, untuk notifikasi |
| `TELEGRAM_CHAT_ID` | — | — | Opsional, untuk notifikasi |

---

## Struktur Proyek

```
vaimoz-livepilot/
├── client/                     # Frontend React + Vite
│   ├── src/
│   │   ├── app/                # Routing dan root component
│   │   ├── components/         # Komponen UI reusable
│   │   │   ├── auth/           # Halaman login
│   │   │   ├── layout/         # Sidebar, TopBar, navigasi
│   │   │   ├── shared/         # Widget dan card bersama
│   │   │   └── ui/             # Primitif (button, card)
│   │   ├── features/           # Halaman per fitur
│   │   │   ├── analytics/      # Halaman analytics
│   │   │   ├── assets/         # Asset library
│   │   │   ├── campaign/       # Manajemen campaign
│   │   │   ├── dashboard/      # Dashboard utama
│   │   │   ├── monitor/        # Stream monitor
│   │   │   ├── production/     # Video production
│   │   │   └── settings/       # Pengaturan
│   │   ├── data/               # Konfigurasi navigasi, data statis
│   │   └── lib/                # API client, utilities
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
├── db/
│   └── database.js             # Inisialisasi SQLite + migrasi
├── middleware/
│   ├── auth.js                 # JWT authentication
│   └── errorHandler.js         # Global error handler
├── public/
│   ├── frontend/               # Output build React
│   └── uploads/                # File yang diupload user
├── scripts/                    # Script utilitas
├── services/
│   ├── http/                   # Express route handlers
│   │   ├── analytics.routes.js
│   │   ├── assets.routes.js
│   │   ├── auth.routes.js
│   │   ├── campaigns.routes.js
│   │   ├── monitor.routes.js
│   │   ├── playlists.routes.js
│   │   ├── production.routes.js
│   │   ├── scheduler.routes.js
│   │   ├── settings.routes.js
│   │   ├── streams.routes.js
│   │   └── youtube.routes.js
│   ├── ffmpegRunner.js         # Manajemen proses FFmpeg
│   ├── geminiService.js        # Integrasi Gemini AI
│   ├── productionService.js    # Video production jobs
│   ├── scheduler.js            # node-cron scheduling
│   ├── streamManager.js        # Stop/cleanup stream
│   ├── telegramService.js      # Notifikasi Telegram
│   ├── youtubeAnalyticsService.js
│   ├── youtubeChatService.js   # Live chat chatbot
│   ├── youtubeLiveService.js   # Broadcast lifecycle
│   ├── youtubeService.js       # OAuth + YouTube API
│   └── youtubeTokenUtils.js
├── utils/
│   ├── asyncHandler.js         # Wrapper async route
│   ├── config.js               # Konfigurasi env
│   └── serializers.js          # Serialisasi response
├── .env.example
├── app.js                      # Entry point Express
├── docker-compose.yml
├── Dockerfile
└── package.json
```

---

## API Reference

Semua endpoint di-prefix `/api/` dan memerlukan header `Authorization: Bearer <token>` kecuali yang ditandai **publik**.

### Auth

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| `POST` | `/api/auth/login` | publik | Login, returns `{ token, user }` |
| `POST` | `/api/auth/register` | publik* | *Hanya jika belum ada user; setelahnya butuh auth |
| `GET` | `/api/auth/me` | ✅ | Info user yang login |
| `PATCH` | `/api/auth/me` | ✅ | Update nama/password |

**Login:**
```json
POST /api/auth/login
{ "username": "admin", "password": "passwordanda" }
```

### Assets

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/assets` | List semua aset; `?type=Video` untuk filter |
| `POST` | `/api/assets/upload` | Upload file (multipart/form-data, field: `files[]`) |
| `POST` | `/api/assets/gdrive` | Import dari Google Drive: `{ "url": "..." }` |
| `GET` | `/api/assets/gdrive/progress/:jobId` | Cek progress download GDrive |
| `PATCH` | `/api/assets/:id` | Rename: `{ "name": "nama-baru.mp4" }` |
| `DELETE` | `/api/assets/:id` | Hapus aset |

### Campaigns

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/campaigns` | List semua campaign |
| `POST` | `/api/campaigns` | Buat campaign baru |
| `GET` | `/api/campaigns/:id` | Detail campaign |
| `PATCH` | `/api/campaigns/:id` | Update campaign |
| `DELETE` | `/api/campaigns/:id` | Hapus campaign |
| `POST` | `/api/campaigns/:id/start` | Start stream Manual RTMP |
| `POST` | `/api/campaigns/:id/start-youtube-live` | Start YouTube Live |
| `POST` | `/api/campaigns/:id/stop` | Stop stream aktif |
| `GET` | `/api/campaigns/:id/analytics` | Analytics stream aktif |
| `POST` | `/api/campaigns/:id/chatbot/start` | Start chatbot |
| `POST` | `/api/campaigns/:id/chatbot/stop` | Stop chatbot |
| `GET` | `/api/campaigns/:id/chatbot/status` | Status chatbot |
| `POST` | `/api/campaigns/:id/chatbot/send` | Kirim pesan manual |

### Streams

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/streams` | List history stream (paginasi) |
| `GET` | `/api/streams/running` | Stream yang sedang aktif |
| `POST` | `/api/streams/:id/stop` | Stop stream by ID |
| `POST` | `/api/streams/delete` | Hapus history: `{ "ids": [1,2,3] }` |
| `POST` | `/api/streams/sync` | Sync stats YouTube: `{ "ids": [1,2] }` |

### YouTube

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/youtube/auth-url` | URL OAuth Google |
| `GET` | `/api/youtube/callback` | Callback OAuth (redirect dari Google) |
| `GET` | `/api/youtube/channels` | List channel yang terhubung |
| `DELETE` | `/api/youtube/channels/:id` | Cabut channel |
| `POST` | `/api/youtube/channels/:id/default` | Set sebagai channel default |
| `GET` | `/api/youtube/channels/:id/playlists` | List playlist channel |
| `POST` | `/api/youtube/channels/:id/playlists` | Buat playlist baru |
| `GET` | `/api/youtube/channels/:id/analytics` | Analytics channel (atau `all`) |

### Scheduler

| Method | Endpoint | Keterangan |
|---|---|---|
| `POST` | `/api/scheduler/campaigns/:id/schedule` | Jadwalkan campaign |
| `POST` | `/api/scheduler/campaigns/:id/unschedule` | Hapus jadwal |
| `POST` | `/api/scheduler/campaigns/:id/pause` | Jeda jadwal |
| `POST` | `/api/scheduler/campaigns/:id/resume` | Lanjutkan jadwal |
| `PUT` | `/api/scheduler/campaigns/:id/recurring` | Update pengaturan recurring |
| `GET` | `/api/scheduler/campaigns/:id/history` | Riwayat eksekusi |
| `GET` | `/api/scheduler/campaigns` | Semua campaign terjadwal |

### Monitor & Settings

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/monitor/metrics` | CPU, RAM, disk, network, active streams |
| `GET` | `/api/monitor/logs` | Logs: `?limit=200&source=FFmpeg` |
| `DELETE` | `/api/monitor/logs` | Bersihkan semua log |
| `GET` | `/api/settings` | Baca semua settings |
| `POST` | `/api/settings` | Simpan settings (key yang diizinkan saja) |
| `POST` | `/api/settings/telegram/test` | Test koneksi Telegram |
| `POST` | `/api/settings/telegram/save` | Simpan Telegram credentials |
| `GET` | `/api/settings/notifications/prefs` | Baca preferensi notifikasi |
| `POST` | `/api/settings/notifications` | Simpan preferensi notifikasi |

---

## Tech Stack

**Frontend:** React 19 · Vite 8 · Tailwind CSS 4 · Framer Motion · Recharts · Lucide React

**Backend:** Node.js · Express 5 · better-sqlite3 · bcryptjs · jsonwebtoken · multer · googleapis · node-cron

**Infrastruktur:** FFmpeg · Docker · PM2 · SQLite

---

## Troubleshooting

### Stream tidak mau start

```bash
# Cek FFmpeg tersedia
ffmpeg -version

# Cek logs server
pm2 logs vaimoz-livepilot --lines 50

# Test FFmpeg manual
ffmpeg -re -i public/uploads/video.mp4 -c copy -f flv rtmp://url-stream-anda
```

### Port sudah dipakai

```bash
sudo lsof -i :8787      # cari proses yang pakai port
sudo kill -9 <PID>      # kill proses
# atau ganti PORT di .env
```

### Error saat upload besar

Tambahkan di Nginx config:
```nginx
client_max_body_size 5G;
```

Restart Nginx: `sudo systemctl restart nginx`

### Password lupa / ingin reset

```bash
node scripts/reset-password.js
# Docker:
docker compose exec vaimoz-livepilot node scripts/reset-password.js
```

### Database rusak atau locked

```bash
cp database.sqlite database.sqlite.backup   # backup dulu!
rm database.sqlite
pm2 restart vaimoz-livepilot               # database baru dibuat otomatis
```

### Timezone tidak sesuai (jadwal tidak akurat)

```bash
# Cek timezone saat ini
timedatectl status

# Set ke WIB
sudo timedatectl set-timezone Asia/Jakarta

# Restart aplikasi
pm2 restart vaimoz-livepilot
```

### YouTube OAuth error

| Error | Solusi |
|---|---|
| `redirect_uri_mismatch` | Samakan `GOOGLE_REDIRECT_URI` di `.env` dengan yang di Google Console |
| `access_denied` | Tambahkan email Anda di OAuth consent screen → Test users |
| `invalid_client` | Periksa Client ID dan Secret |
| Token expired | Re-connect channel dari Settings → YouTube Integration |

### Telegram tidak kirim notifikasi

```bash
# Test manual
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id":"<CHAT_ID>","text":"Test"}'

# Cek logs
pm2 logs vaimoz-livepilot | grep Telegram
```

---

## Keamanan

- **JWT_SECRET** wajib diganti dari nilai default sebelum deploy ke production — server akan menolak startup jika masih default di `NODE_ENV=production`
- **ADMIN_PASSWORD** wajib diganti — minimal 8 karakter, kombinasi huruf dan angka
- Password di-hash dengan **bcrypt cost factor 12**
- Upload file divalidasi ekstensi di server-side (bukan hanya MIME dari client)
- OAuth state parameter divalidasi untuk mencegah CSRF attack
- Semua route kecuali `/api/auth/login` memerlukan JWT yang valid

---

## Berkontribusi

1. Fork repository
2. Buat branch: `git checkout -b feature/nama-fitur`
3. Commit: `git commit -m 'feat: deskripsi singkat'`
4. Push: `git push origin feature/nama-fitur`
5. Buka Pull Request

---

## Lisensi

[MIT License](LICENSE) — bebas digunakan, dimodifikasi, dan didistribusikan.

---

## Dukungan

- **Bug / Feature Request:** [GitHub Issues](https://github.com/vaimozz/vaimoz-livepilot/issues)
- **Diskusi:** [GitHub Discussions](https://github.com/vaimozz/vaimoz-livepilot/discussions)

---

*Vaimoz LivePilot v0.3.0 · © 2026 Vaimoz Team*
