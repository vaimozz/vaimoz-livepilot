# Vaimoz LivePilot

[![Version](https://img.shields.io/badge/version-0.3.0-blue.svg)](https://github.com/vaimozz/vaimoz-livepilot/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/vaimozz/vaimoz-livepilot/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/vaimozz/vaimoz-livepilot/blob/main/CONTRIBUTING.md)
[![GitHub Stars](https://img.shields.io/github/stars/vaimozz/vaimoz-livepilot?style=social)](https://github.com/vaimozz/vaimoz-livepilot/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/vaimozz/vaimoz-livepilot?style=social)](https://github.com/vaimozz/vaimoz-livepilot/network/members)

**Vaimoz LivePilot** adalah platform live streaming automation berbasis web yang powerful dan mudah digunakan. Streaming otomatis 24/7 ke YouTube dengan integrasi penuh YouTube API, chatbot automation, real-time analytics, dan Telegram notifications untuk pengalaman streaming yang profesional.

[🚀 Quick Start](#-quick-installation) • [📖 Documentation](#-manual-installation) • [🐳 Docker](#-docker-deployment) • [🪛 Troubleshooting](#-troubleshooting) • [💬 Community](https://github.com/vaimozz/vaimoz-livepilot/discussions)

---

## ✨ Fitur Utama

### 🎥 **Asset Management**
- **Upload Video & Thumbnail** - Upload dari local storage atau import langsung dari Google Drive
- **Asset Library** - Kelola koleksi video dan thumbnail dengan antarmuka yang intuitif
- **Playlist Management** - Organisir assets ke dalam playlist untuk streaming sequential
- **Asset Metadata** - Track usage count, file size, dan metadata lengkap

### 📡 **Campaign & Streaming**
- **YouTube Live Integration** - Start live broadcast otomatis via YouTube Data API v3
- **Manual RTMP Mode** - Streaming ke platform RTMP custom (Facebook, Twitch, dll)
- **Auto Video Selection** - Pilih video dan thumbnail secara otomatis atau manual
- **Smart Stop** - Hentikan stream otomatis berdasarkan jumlah penonton
- **FFmpeg Streaming** - Video processing dan streaming dengan FFmpeg

### 🤖 **Automation & Intelligence**
- **YouTube Live Chatbot** - Kirim pesan otomatis ke live chat dengan interval custom
- **Scheduled Streaming** - Jadwalkan campaign dengan pengaturan waktu fleksibel (node-cron)
- **Auto-Start Broadcast** - Buat dan start YouTube broadcast otomatis
- **Smart Stop Logic** - Tunda stop otomatis jika penonton di atas threshold

### 📊 **Analytics & Monitoring**
- **Real-time YouTube Stats** - Concurrent viewers, total views, likes, comments
- **Stream Monitor** - Monitor status FFmpeg, PID, duration, dan YouTube broadcast
- **Activity Logs** - Track semua event aplikasi dengan level (INFO, WARN, ERROR)
- **Dashboard Overview** - Lihat semua campaign aktif dan statistik real-time

### 🔔 **Notifications**
- **Telegram Integration** - 6 jenis notifikasi otomatis:
  - Stream Started
  - Stream Stopped
  - Stream Error
  - Broadcast Live
  - Viewer Milestone
  - Smart Stop Delayed
- **Notification Preferences** - Kontrol notifikasi mana yang aktif
- **Custom Threshold** - Set milestone viewer untuk notifikasi

### ⚙️ **Settings & Configuration**
- **YouTube OAuth** - Connect multiple YouTube channels
- **Default Channel** - Set channel default untuk streaming
- **Telegram Setup** - Configure bot token dan chat ID via UI
- **System Status** - Monitor status integrasi dan koneksi

---

## 💻 System Requirements

- **Node.js** v18 atau versi terbaru (recommended: v22)
- **FFmpeg** untuk video processing dan streaming
- **SQLite3** (sudah termasuk dalam package: better-sqlite3)
- **VPS/Server** dengan minimal 1 Core CPU & 2GB RAM
- **Port** 8787 (backend) dan 5173 (frontend dev) - dapat disesuaikan di `.env`
- **Google Cloud Console** - OAuth credentials untuk YouTube API
- **Telegram Bot** (optional) - Untuk notifikasi

---

## ⚡ Quick Installation

### 1. Clone Repository

```bash
git clone https://github.com/vaimozz/vaimoz-livepilot.git
cd vaimoz-livepilot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment

```bash
cp .env.example .env
node scripts/generate-secret.js
```

Edit `.env` dan isi:
- `JWT_SECRET` (dari generate-secret.js)
- `GOOGLE_CLIENT_ID` (dari Google Cloud Console)
- `GOOGLE_CLIENT_SECRET` (dari Google Cloud Console)

### 4. Run Development

```bash
npm run dev
```

Akses aplikasi:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8787

**Login Default:**
```
Username: admin
Password: admin123
```

---

## 📧 Manual Installation

### 1. Persiapan Server

Update sistem operasi:
```bash
sudo apt update && sudo apt upgrade -y
```

Install Node.js (v22):
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verifikasi instalasi Node.js:
```bash
node --version  # v22.x.x
npm --version   # 10.x.x
```

Install FFmpeg:
```bash
sudo apt install ffmpeg -y
```

Verifikasi instalasi FFmpeg:
```bash
ffmpeg -version
```

Install Git:
```bash
sudo apt install git -y
```

### 2. Setup Project Vaimoz LivePilot

Clone repository:
```bash
git clone https://github.com/vaimozz/vaimoz-livepilot.git
```

Masuk ke direktori project:
```bash
cd vaimoz-livepilot
```

Install dependencies:
```bash
npm install
```

Generate JWT Secret:
```bash
node scripts/generate-secret.js
```

Copy dan edit environment variables:
```bash
cp .env.example .env
nano .env
```

**Konfigurasi `.env` minimal:**
```env
# App
NODE_ENV=production
PORT=8787 # Ganti dengan port pilihan Anda jika diperlukan

# Frontend
CLIENT_ORIGIN=http://YOUR_SERVER_IP:8787
APP_BASE_URL=http://YOUR_SERVER_IP:8787

# Security
JWT_SECRET=your_generated_secret_here

# Google / YouTube OAuth
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://YOUR_SERVER_IP:8787/api/youtube/callback

# Telegram (optional)
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

Build frontend:
```bash
npm run build
```

### 3. Konfigurasi Nginx & Domain (Sangat Direkomendasikan)

Agar aplikasi dapat diakses secara profesional menggunakan HTTPS (wajib untuk integrasi Google), konfigurasikan Nginx sebagai reverse proxy.

1. Install Nginx dan Certbot:
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

2. Buat konfigurasi Nginx:
```bash
sudo nano /etc/nginx/sites-available/livepilot
```
Isi dengan konfigurasi berikut (ganti `domainanda.com` dengan domain asli Anda):
```nginx
server {
    listen 80;
    server_name domainanda.com;

    location / {
        proxy_pass http://localhost:8787; # Sesuaikan dengan PORT di file .env Anda
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Aktifkan konfigurasi:
```bash
sudo ln -s /etc/nginx/sites-available/livepilot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Konfigurasi Firewall

**PENTING: Buka port SSH terlebih dahulu untuk menghindari terputusnya koneksi!**

```bash
# Buka port SSH
sudo ufw allow ssh

# Buka port untuk Nginx (HTTP & HTTPS)
sudo ufw allow 'Nginx Full'

# (Opsional) Buka port aplikasi langsung jika tanpa Nginx
sudo ufw allow 8787 # Sesuaikan jika Anda mengubah port default

# Aktifkan firewall
sudo ufw enable
```
*(Catatan: Jika Anda menggunakan layanan cloud seperti AWS/Tencent/GCP, pastikan Anda juga membuka port 80 dan 443 di menu Security Group/Firewall pada dashboard penyedia cloud Anda).*

### 5. Install Process Manager (PM2)

Install PM2 untuk mengelola aplikasi di latar belakang:
```bash
sudo npm install -g pm2
```

### 6. Menjalankan Aplikasi

Jalankan aplikasi dengan PM2:
```bash
pm2 start app.js --name vaimoz-livepilot
```

Amankan domain Anda dengan SSL (HTTPS):
```bash
sudo certbot --nginx -d domainanda.com
```
*(Ikuti instruksi di layar, dan pilih opsi Redirect (2) agar semua trafik diarahkan ke HTTPS).*

**Setup Auto-Restart saat Server Reboot:**
```bash
# Simpan konfigurasi PM2 saat ini
pm2 save

# Setup PM2 untuk auto-start saat server restart
pm2 startup

# Ikuti instruksi yang muncul, biasanya berupa command yang harus dijalankan dengan sudo
# Contoh output: sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u username --hp /home/username

# Setelah menjalankan command startup, save kembali
pm2 save
```

**Perintah PM2 Berguna:**
```bash
# Lihat status aplikasi
pm2 status

# Restart aplikasi
pm2 restart vaimoz-livepilot

# Stop aplikasi
pm2 stop vaimoz-livepilot

# Lihat logs aplikasi
pm2 logs vaimoz-livepilot

# Monitor resource usage
pm2 monit

# Hapus aplikasi dari PM2
pm2 delete vaimoz-livepilot
```

Akses aplikasi melalui browser:
```
http://YOUR_SERVER_IP:8787
```

Contoh: `http://88.12.34.56:8787`

---

## 🐳 Docker Deployment

### 1. Persiapan Environment

Buat file `.env` di root project:
```bash
cp .env.example .env
nano .env
```

Edit minimal configuration:
```env
PORT=8787
NODE_ENV=production
JWT_SECRET=your_generated_secret_here
CLIENT_ORIGIN=http://localhost:8787
APP_BASE_URL=http://localhost:8787
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8787/api/youtube/callback
```

### 2. Build dan Jalankan

```bash
docker compose up --build -d
```

Akses aplikasi: [http://localhost:8787](http://localhost:8787)

### 3. Data Persistence

Data akan tersimpan secara otomatis di:
- **Database**: `./database.sqlite` (mounted ke container)
- **Uploads**: `./public/uploads/` (mounted ke container)

### 4. Docker Commands

```bash
# Lihat logs
docker compose logs -f

# Restart container
docker compose restart

# Stop container
docker compose down

# Rebuild dan restart
docker compose up --build -d

# Masuk ke container
docker compose exec vaimoz-livepilot sh
```

### 5. Reset Password (Docker)

```bash
docker compose exec vaimoz-livepilot node scripts/reset-password.js
```

---

## 🔑 Google Cloud Console Setup

### 1. Buat Project Baru

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Klik **Select a project** → **New Project**
3. Beri nama project (contoh: "Vaimoz LivePilot")
4. Klik **Create**

### 2. Enable YouTube Data API v3

1. Di sidebar, pilih **APIs & Services** → **Library**
2. Cari "YouTube Data API v3"
3. Klik **Enable**

### 3. Buat OAuth 2.0 Credentials

1. Di sidebar, pilih **APIs & Services** → **Credentials**
2. Klik **Create Credentials** → **OAuth client ID**
3. Jika diminta, configure OAuth consent screen:
   - User Type: **External**
   - App name: "Vaimoz LivePilot"
   - User support email: your email
   - Developer contact: your email
   - Scopes: Add `youtube`, `youtube.force-ssl`, `youtube.upload`
   - **Test users (SANGAT PENTING):** Tambahkan alamat email Google Anda sendiri. Jika aplikasi berstatus "Testing", Anda WAJIB menambahkan email Anda di sini agar tidak terkena error *403: access_denied*.
4. Application type: **Web application**
5. Name: "Vaimoz LivePilot Web Client"
6. **Authorized JavaScript origins**: 
   - Masukkan URL HTTPS domain Anda (contoh: `https://domainanda.com`)
   - *(Alternatif jika tidak punya domain, gunakan Ngrok)*
7. **Authorized redirect URIs**: 
   - Tambahkan `/api/youtube/callback` di belakang URL Anda.
   - Contoh: `https://domainanda.com/api/youtube/callback`
8. Klik **Create**
9. Copy **Client ID** dan **Client Secret** ke file `.env` di VPS Anda.

### 4. Test OAuth Flow

1. Login ke aplikasi
2. Buka **Settings** → **YouTube Integration**
3. Klik **Tambah Channel**
4. Authorize dengan Google account Anda
5. Channel akan muncul di list

---

## 🤖 Telegram Bot Setup

### 1. Buat Bot Baru

1. Buka Telegram dan cari **@BotFather**
2. Kirim `/newbot`
3. Ikuti instruksi untuk memberi nama bot
4. Copy **Bot Token** yang diberikan

### 2. Dapatkan Chat ID

1. Cari **@userinfobot** di Telegram
2. Kirim `/start`
3. Bot akan membalas dengan **Chat ID** Anda

### 3. Konfigurasi di Aplikasi

**Opsi 1: Via UI (Recommended)**
1. Login ke aplikasi
2. Buka **Settings** → **Telegram Notifications**
3. Masukkan **Bot Token** dan **Chat ID**
4. Klik **Test Notifikasi** untuk verifikasi
5. Klik **Simpan Credentials**
6. Atur **Notification Preferences** sesuai kebutuhan

**Opsi 2: Via .env**
```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

### 4. Jenis Notifikasi

- **Stream Started** - Saat FFmpeg mulai streaming
- **Stream Stopped** - Saat stream dihentikan
- **Stream Error** - Saat terjadi error pada stream
- **Broadcast Live** - Saat YouTube broadcast status menjadi "live"
- **Viewer Milestone** - Saat penonton mencapai kelipatan threshold (default: 100)
- **Smart Stop Delayed** - Saat auto-stop ditunda karena penonton tinggi

---

## 📝 Reset Password

Jika lupa password atau perlu reset akun:

```bash
cd vaimoz-livepilot
node scripts/reset-password.js
```

Ikuti prompt untuk memasukkan username dan password baru.

**Untuk Docker:**
```bash
docker compose exec vaimoz-livepilot node scripts/reset-password.js
```

---

## ⏰ Pengaturan Timezone Server

Untuk memastikan scheduled streaming berjalan dengan waktu yang akurat:

### Cek timezone saat ini:
```bash
timedatectl status
```

### Lihat daftar timezone tersedia:
```bash
timedatectl list-timezones | grep Asia
```

### Set timezone ke WIB (Jakarta):
```bash
sudo timedatectl set-timezone Asia/Jakarta
```

### Restart aplikasi setelah mengubah timezone:
```bash
pm2 restart vaimoz-livepilot
```

**Untuk Docker:**
```bash
docker compose restart
```

---

## 🛠️ Script Utilities

### Generate JWT Secret
```bash
node scripts/generate-secret.js
```

### Database Migration
```bash
node scripts/migrate.js
```

### Seed Admin User
```bash
node scripts/seed-admin.js
```

### Reset Password
```bash
node scripts/reset-password.js
```

### Reset All Data
```bash
# PERINGATAN: Akan menghapus semua campaigns, assets, streams, dan logs
node scripts/reset-data.js
```

### Smoke Test Server
```bash
npm run smoke:server
```

---

## 📚 API Documentation

### Authentication

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### Assets

```http
# List assets
GET /api/assets?type=Video

# Upload assets
POST /api/assets/upload
Content-Type: multipart/form-data

# Upload from Google Drive
POST /api/assets/gdrive
Content-Type: application/json

{
  "url": "https://drive.google.com/file/d/FILE_ID/view"
}

# Rename asset
PATCH /api/assets/:id
Content-Type: application/json

{
  "name": "New Name"
}

# Delete asset
DELETE /api/assets/:id
```

### Campaigns

```http
# List campaigns
GET /api/campaigns

# Create campaign
POST /api/campaigns
Content-Type: application/json

{
  "name": "My Campaign",
  "mode": "youtube-api",
  "config_json": {
    "videoIds": [1, 2, 3],
    "thumbnailIds": [4, 5],
    "autoStop": true,
    "autoStopMinutes": 60
  }
}

# Start YouTube Live
POST /api/campaigns/:id/start-youtube-live
Content-Type: application/json

{
  "channelId": 1,
  "title": "Live Stream Title",
  "description": "Stream description",
  "privacy": "public"
}

# Stop campaign
POST /api/campaigns/:id/stop
```

### YouTube

```http
# Get OAuth URL
GET /api/youtube/auth-url

# List connected channels
GET /api/youtube/channels

# Set default channel
POST /api/youtube/channels/:id/default

# Remove channel
DELETE /api/youtube/channels/:id
```

### Chatbot

```http
# Start chatbot
POST /api/campaigns/:id/chatbot/start
Content-Type: application/json

{
  "messages": ["Hello!", "Welcome to the stream!"],
  "intervalMinutes": 5
}

# Stop chatbot
POST /api/campaigns/:id/chatbot/stop

# Get chatbot status
GET /api/campaigns/:id/chatbot/status
```

### Monitor

```http
# Get metrics
GET /api/monitor/metrics

# Get logs
GET /api/monitor/logs?level=ERROR&limit=50

# Clear logs
DELETE /api/monitor/logs
```

### Settings

```http
# Get all settings
GET /api/settings

# Save settings
POST /api/settings
Content-Type: application/json

{
  "telegram_bot_token": "your_token",
  "telegram_chat_id": "your_chat_id"
}

# Test Telegram
POST /api/settings/telegram/test
Content-Type: application/json

{
  "botToken": "your_token",
  "chatId": "your_chat_id"
}
```

---

## 🪛 Troubleshooting

### Permission Error

```bash
chmod -R 755 public/uploads/
chmod 644 database.sqlite
```

### Port Already in Use

```bash
# Cek proses yang menggunakan port
sudo lsof -i :8787

# Kill proses jika diperlukan
sudo kill -9 <PID>

# Atau ubah PORT di .env
nano .env
# PORT=8788
```

### Database Error

```bash
# Backup database terlebih dahulu
cp database.sqlite database.sqlite.backup

# Reset database (PERINGATAN: akan menghapus semua data)
rm database.sqlite

# Restart aplikasi untuk membuat database baru
pm2 restart vaimoz-livepilot
```

### FFmpeg Not Found

```bash
# Install FFmpeg
sudo apt install ffmpeg -y

# Verifikasi instalasi
ffmpeg -version

# Jika FFmpeg di lokasi custom, set di .env
nano .env
# FFMPEG_PATH=/usr/local/bin/ffmpeg
```

### YouTube OAuth Error

**Error: redirect_uri_mismatch**
- Pastikan `GOOGLE_REDIRECT_URI` di `.env` sama persis dengan yang di Google Cloud Console
- Jangan lupa tambahkan `/api/youtube/callback` di akhir URL

**Error: invalid_client**
- Periksa `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di `.env`
- Pastikan credentials masih aktif di Google Cloud Console

**Error: access_denied**
- Pastikan user sudah ditambahkan sebagai Test User di OAuth consent screen
- Pastikan scopes YouTube sudah ditambahkan

### Telegram Notification Not Working

```bash
# Test manual via curl
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id":"<CHAT_ID>","text":"Test message"}'

# Periksa logs
pm2 logs vaimoz-livepilot --lines 100

# Atau untuk Docker
docker compose logs -f --tail=100
```

### Stream Not Starting

**Periksa FFmpeg:**
```bash
ffmpeg -version
```

**Periksa logs:**
```bash
pm2 logs vaimoz-livepilot --lines 50
```

**Periksa video file:**
```bash
ls -lh public/uploads/
```

**Test FFmpeg manual:**
```bash
ffmpeg -re -i public/uploads/your-video.mp4 -c copy -f flv rtmp://test-url
```

### Docker Troubleshooting

**Tidak bisa login:**
- Pastikan `JWT_SECRET` tidak berubah
- Periksa permission folder:
  ```bash
  sudo chmod -R 777 public/uploads/
  ```
- Clear browser cookies dan coba lagi

**Container restart terus:**
```bash
# Lihat logs error
docker compose logs vaimoz-livepilot

# Periksa .env configuration
cat .env
```

**Database locked:**
```bash
# Stop container
docker compose down

# Hapus database (PERINGATAN: data hilang)
rm database.sqlite

# Start ulang
docker compose up -d
```

---

## 🏗️ Project Structure

```
vaimoz-livepilot/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── app/              # Main app components
│   │   ├── components/       # Reusable UI components
│   │   ├── features/         # Feature-specific pages
│   │   ├── data/             # Mock data and navigation
│   │   ├── lib/              # Utilities and API client
│   │   └── index.css         # Global styles
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── db/                        # Database initialization
│   └── database.js
├── middleware/                # Express middleware
│   ├── auth.js
│   └── errorHandler.js
├── models/                    # Database models (future)
├── public/                    # Static assets
│   ├── frontend/             # Built React app
│   └── uploads/              # User uploaded files
├── scripts/                   # Utility scripts
│   ├── generate-secret.js
│   ├── migrate.js
│   ├── seed-admin.js
│   ├── reset-password.js
│   └── reset-data.js
├── services/                  # Business logic
│   ├── http/                 # API routes
│   │   ├── auth.routes.js
│   │   ├── assets.routes.js
│   │   ├── campaigns.routes.js
│   │   ├── streams.routes.js
│   │   ├── youtube.routes.js
│   │   ├── monitor.routes.js
│   │   ├── scheduler.routes.js
│   │   └── settings.routes.js
│   ├── scheduler.js          # Campaign scheduling
│   ├── telegramService.js    # Telegram notifications
│   └── youtubeAnalyticsService.js
├── utils/                     # Shared utilities
│   ├── config.js
│   ├── asyncHandler.js
│   └── serializers.js
├── views/                     # Server-side views (if any)
├── .env.example              # Environment template
├── .gitignore
├── app.js                    # Main Express server
├── database.sqlite           # SQLite database
├── docker-compose.yml        # Docker Compose config
├── Dockerfile                # Docker image config
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

---

## 🔧 Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **Framer Motion** - Animation library
- **Recharts** - Chart library

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **better-sqlite3** - SQLite database driver
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **multer** - File upload handling
- **googleapis** - YouTube Data API v3 client
- **node-cron** - Task scheduling

### DevOps
- **Docker** - Containerization
- **PM2** - Process manager
- **FFmpeg** - Video processing and streaming

---

## 📖 Usage Guide

### 1. Upload Assets

1. Login ke aplikasi
2. Buka **Asset Library**
3. Klik **Upload** atau **Import from Google Drive**
4. Pilih file video (MP4, MKV, AVI) atau thumbnail (JPG, PNG)
5. Tunggu upload selesai

### 2. Create Campaign

1. Buka **Dashboard**
2. Klik **Create Campaign**
3. Pilih mode:
   - **YouTube API** - Untuk YouTube Live otomatis
   - **Manual RTMP** - Untuk platform custom
4. Isi nama campaign
5. Pilih video dan thumbnail
6. Atur konfigurasi (auto stop, duration, dll)
7. Klik **Save**

### 3. Start YouTube Live

1. Pastikan sudah connect YouTube channel di **Settings**
2. Buka campaign yang sudah dibuat
3. Klik **Start YouTube Live**
4. Isi:
   - **Title** - Judul live stream
   - **Description** - Deskripsi stream
   - **Privacy** - Public, Unlisted, atau Private
5. Klik **Start**
6. Aplikasi akan:
   - Membuat YouTube broadcast
   - Membuat YouTube stream
   - Start FFmpeg streaming
   - Transition broadcast ke "live"

### 4. Monitor Stream

1. Buka **Stream Monitor**
2. Lihat informasi:
   - Stream status (Online/Offline)
   - YouTube broadcast ID
   - Watch URL
   - Concurrent viewers
   - Duration
   - FFmpeg PID
3. Klik **Stop** untuk menghentikan stream

### 5. Enable Chatbot

1. Saat stream sedang berjalan
2. Buka **Campaign** → **Chatbot**
3. Isi pesan-pesan yang akan dikirim
4. Atur interval (menit)
5. Klik **Start Chatbot**
6. Bot akan mengirim pesan ke live chat secara otomatis

### 6. View Analytics

1. Buka **Analytics**
2. Pilih campaign
3. Lihat statistik:
   - Total views
   - Concurrent viewers
   - Likes
   - Comments
   - Watch time

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [FFmpeg](https://ffmpeg.org/) - Video processing
- [YouTube Data API v3](https://developers.google.com/youtube/v3) - YouTube integration
- [React](https://react.dev/) - UI library
- [Express.js](https://expressjs.com/) - Web framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/vaimozz/vaimoz-livepilot/issues)
- **Discussions**: [Ask questions or share ideas](https://github.com/vaimozz/vaimoz-livepilot/discussions)
- **Email**: support@vaimoz.com

---

**Made with ❤️ by Vaimoz Team**

© 2026 Vaimoz LivePilot. All rights reserved.
