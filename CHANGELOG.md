# Changelog

Semua perubahan signifikan pada proyek ini didokumentasikan di sini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.3.1] — 2026-06-07

### Fixed — Keamanan (Security)

- **[CRITICAL]** `production.routes.js` — import dari path yang tidak ada (`middleware/requireAuth.js`) diperbaiki ke `middleware/auth.js`. Sebelumnya menyebabkan crash `MODULE_NOT_FOUND` saat startup.
- **[CRITICAL]** `productionService.js` — `import os` dipindah ke atas file agar tersedia sebelum fungsi `startProductionJob()` dieksekusi (bug ESM).
- **[HIGH]** `utils/config.js` — `JWT_SECRET` default sekarang memicu peringatan di development dan melempar error di production, mencegah deployment dengan secret yang tidak aman.
- **[HIGH]** `utils/config.js` — `ADMIN_PASSWORD` default `admin123` memicu peringatan saat startup.
- **[HIGH]** `youtube.routes.js` — Callback OAuth sekarang memvalidasi parameter `state` (CSRF protection). State di-generate saat `/auth-url` dibuat dan diverifikasi dengan TTL 10 menit.
- **[HIGH]** `analytics.routes.js` — `JSON.parse(s.campaign_config)` dibungkus try/catch agar satu baris data malformed tidak crash seluruh endpoint analytics.
- **[HIGH]** `youtubeService.js` — Token refresh tidak lagi hilang saat Google merotasi refresh token; fallback ke lookup by `access_token` jika lookup by `refresh_token` tidak menemukan baris.

### Fixed — Fungsional (Medium)

- **[MEDIUM]** `assets.routes.js` — Fetch ke Google Drive sekarang menggunakan `AbortController` dengan timeout 30 detik, mencegah event loop hang.
- **[MEDIUM]** `assets.routes.js` — `getAvailablePath()` dibatasi maksimum 9.999 iterasi + fallback timestamp untuk mencegah infinite loop.
- **[MEDIUM]** `assets.routes.js` — Validasi ekstensi file di server-side via Multer `fileFilter` (tidak hanya MIME dari client).
- **[MEDIUM]** `streams.routes.js` — Array `ids` di `POST /streams/delete` divalidasi sebagai integer positif sebelum dikirim ke query SQLite.
- **[MEDIUM]** `scheduler.js` — `calculateNextExecution()` diimplementasi dengan benar berdasarkan cron expression aktual (daily, weekly, monthly, once), menggantikan stub `+24 jam`.
- **[MEDIUM]** `ffmpegRunner.js` — Race condition di `stopFfmpegStream()` diperbaiki: status DB di-set ke `Stopping` dan entry dihapus dari map sebelum `SIGTERM` dikirim.
- **[MEDIUM]** `db/database.js` — Semua `ALTER TABLE` dalam `runMigrations()` dibungkus dalam satu `db.transaction()` atomik.

### Fixed — Kualitas (Low)

- **[LOW]** `settings.routes.js` — `POST /api/settings` sekarang menggunakan allowlist key; key sensitif tidak bisa ditimpa via endpoint generik ini.
- **[LOW]** `client/src/lib/api.js` — Helper `api.get()` dan `api.post()` hanya strip prefix `/api/` (dengan trailing slash), mencegah korupsi path seperti `/api-docs/`.
- **[LOW]** `package.json` — Semua dependency di-pin ke versi eksak yang terinstall, menghilangkan `"latest"` yang tidak stabil.
- **[LOW]** `client/src/lib/api.js` — Token JWT sekarang menyimpan expiry terpisah (`vaimoz_token_exp`) dan dibersihkan proaktif sebelum request dikirim jika sudah expired.
- **[LOW]** `services/http/auth.routes.js` — Validasi password diperketat: minimal 8 karakter, harus ada huruf dan angka, menolak password umum. bcrypt cost factor dinaikkan ke 12. Username divalidasi format dan panjang.

---

## [0.3.0] — 2026

### Changed

- Restruktur project ke arsitektur service-based: `db/`, `middleware/`, `services/`, `utils/`, `public/`, `client/`.
- Backend: Node.js, SQLite (better-sqlite3), FFmpeg, YouTube API, Docker.
- Frontend: React 18, Vite, Tailwind CSS.

### Added

- YouTube Live integration (create broadcast, bind stream, transition to live).
- Recurring campaign scheduler dengan node-cron (harian, mingguan, bulanan, sekali).
- YouTube Live chatbot (sequential, random, scheduled messages).
- Real-time analytics: concurrent viewers, total views, likes, comments.
- Smart Stop: tunda auto-stop jika penonton di atas threshold.
- Smart Humanizer: delay acak sebelum start dan variasi durasi stream.
- Telegram notifications untuk 6 jenis event.
- Production mode: gabung video + audio menjadi satu file MP4.
- Google Drive import untuk aset.
- Server monitoring: CPU, RAM, disk, network via `/api/monitor/metrics`.

---

## [0.2.x] dan sebelumnya

Tidak terdokumentasi — lihat commit history Git untuk detail perubahan.
