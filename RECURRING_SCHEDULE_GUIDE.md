# 🔄 Recurring Schedule Feature - Complete Guide

## 📋 Overview

Fitur Recurring Schedule memungkinkan Anda untuk mengatur jadwal berulang otomatis untuk campaign live streaming. Campaign akan dijalankan secara otomatis sesuai dengan jadwal yang telah ditentukan tanpa perlu intervensi manual.

## ✨ Fitur Utama

### 1. **Tipe Recurring Schedule**
- **Sekali Jalan (Once)**: Eksekusi satu kali pada tanggal dan waktu tertentu
- **Harian (Daily)**: Eksekusi setiap hari pada waktu yang sama
- **Mingguan (Weekly)**: Eksekusi pada hari-hari tertentu dalam seminggu
- **Bulanan (Monthly)**: Eksekusi setiap tanggal 1 setiap bulan

### 2. **Mode Durasi**
- **Tetap (Fixed)**: Durasi streaming tetap setiap eksekusi
- **Acak (Random)**: Durasi acak dalam rentang min-max yang ditentukan
- **Pola (Pattern)**: Durasi mengikuti pola berulang (30, 60, 90, 120 menit)

### 3. **Advanced Features**
- ✅ Timezone support (default: Asia/Jakarta)
- ✅ End date untuk membatasi recurring
- ✅ Execution history tracking
- ✅ Pause/Resume schedule
- ✅ Statistics dan analytics
- ✅ Preview jadwal sebelum disimpan

## 🗄️ Database Schema

### Tabel `campaigns` - Kolom Baru:
```sql
recurring_enabled INTEGER DEFAULT 0
recurring_type TEXT DEFAULT "once"
recurring_days_json TEXT DEFAULT "[]"
recurring_time TEXT
recurring_duration_mode TEXT DEFAULT "fixed"
recurring_duration_minutes INTEGER
recurring_duration_min INTEGER
recurring_duration_max INTEGER
recurring_end_date TEXT
recurring_timezone TEXT DEFAULT "Asia/Jakarta"
last_executed_at TEXT
next_execution_at TEXT
execution_count INTEGER DEFAULT 0
```

### Tabel Baru `recurring_history`:
```sql
CREATE TABLE recurring_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'success',
  duration_minutes INTEGER,
  error_message TEXT,
  stream_id INTEGER,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
```

## 🔌 API Endpoints

### 1. Schedule Campaign
```http
POST /api/scheduler/campaigns/:id/schedule
```
Mengaktifkan schedule untuk campaign.

### 2. Unschedule Campaign
```http
POST /api/scheduler/campaigns/:id/unschedule
```
Menonaktifkan schedule campaign.

### 3. Pause Schedule
```http
POST /api/scheduler/campaigns/:id/pause
```
Menjeda schedule sementara tanpa menghapus konfigurasi.

### 4. Resume Schedule
```http
POST /api/scheduler/campaigns/:id/resume
```
Melanjutkan schedule yang dijeda.

### 5. Update Recurring Settings
```http
PUT /api/scheduler/campaigns/:id/recurring
Body: {
  recurringEnabled: boolean,
  recurringType: "once" | "daily" | "weekly" | "monthly",
  recurringDays: string[],
  recurringTime: string,
  recurringDurationMode: "fixed" | "random" | "pattern",
  recurringDurationMinutes: number,
  recurringDurationMin: number,
  recurringDurationMax: number,
  recurringEndDate: string,
  recurringTimezone: string
}
```

### 6. Get Recurring History
```http
GET /api/scheduler/campaigns/:id/history?limit=50
```
Mendapatkan riwayat eksekusi campaign.

### 7. Get Schedule Statistics
```http
GET /api/scheduler/campaigns/:id/stats
```
Mendapatkan statistik eksekusi campaign.

### 8. Get All Scheduled Campaigns
```http
GET /api/scheduler/campaigns
```
Mendapatkan semua campaign yang dijadwalkan.

## 🎨 Frontend Components

### 1. **RecurringScheduleSettings.jsx**
Komponen form untuk mengatur recurring schedule:
- Tipe schedule selector
- Weekday picker untuk weekly schedule
- Time picker
- Duration mode selector
- End date picker
- Live preview

### 2. **RecurringHistory.jsx**
Komponen untuk menampilkan riwayat eksekusi:
- Execution history list
- Statistics cards
- Success/failure indicators
- Duration tracking

### 3. **RecurringSchedulePage.jsx**
Halaman dedicated untuk mengelola semua recurring schedules:
- List semua scheduled campaigns
- Pause/Resume controls
- Statistics overview
- Quick actions

## 📖 Cara Penggunaan

### A. Membuat Campaign dengan Recurring Schedule

1. **Buat Campaign Baru**
   - Buka halaman "Kampanye Live"
   - Pilih mode (Manual RTMP atau YouTube API)
   - Isi konfigurasi campaign

2. **Atur Recurring Schedule**
   - Scroll ke bagian "Recurring Schedule (Opsional)"
   - Klik untuk expand section
   - Aktifkan toggle "Aktifkan"

3. **Pilih Tipe Schedule**
   - Sekali Jalan: Untuk one-time execution
   - Harian: Untuk daily execution
   - Mingguan: Pilih hari-hari tertentu
   - Bulanan: Setiap tanggal 1

4. **Atur Waktu Eksekusi**
   - Pilih jam dan menit eksekusi
   - Timezone default: Asia/Jakarta

5. **Pilih Mode Durasi**
   - Tetap: Masukkan durasi dalam menit
   - Acak: Masukkan min dan max durasi
   - Pola: Otomatis cycle 30-60-90-120 menit

6. **Opsional: Set End Date**
   - Kosongkan untuk recurring tanpa batas
   - Isi untuk membatasi sampai tanggal tertentu

7. **Preview & Save**
   - Lihat preview jadwal di bagian bawah
   - Klik "Simpan Draft" untuk menyimpan

8. **Aktifkan Schedule**
   - Buka halaman "Recurring Schedule"
   - Klik tombol "Schedule" pada campaign
   - Campaign akan otomatis dijalankan sesuai jadwal

### B. Mengelola Recurring Schedule

1. **Melihat Semua Schedule**
   - Buka halaman "Recurring Schedule"
   - Lihat list semua campaign yang dijadwalkan
   - Cek next execution time

2. **Pause Schedule**
   - Klik tombol Pause (⏸) pada campaign
   - Schedule akan dijeda tanpa menghapus konfigurasi

3. **Resume Schedule**
   - Klik tombol Play (▶) pada campaign yang paused
   - Schedule akan aktif kembali

4. **Unschedule Campaign**
   - Klik tombol Delete (🗑) pada campaign
   - Konfirmasi untuk menghapus schedule

5. **Melihat History**
   - Buka campaign detail
   - Klik "Lihat Riwayat"
   - Lihat semua eksekusi sebelumnya

## 🔧 Backend Logic

### Cron Expression Generation

Scheduler menggunakan `node-cron` untuk menjalankan recurring tasks. Cron expression dihasilkan berdasarkan tipe recurring:

```javascript
// Daily: Setiap hari jam 09:00
"0 9 * * *"

// Weekly: Setiap Senin, Rabu, Jumat jam 09:00
"0 9 * * 1,3,5"

// Monthly: Setiap tanggal 1 jam 09:00
"0 9 1 * *"
```

### Execution Flow

1. **Cron Job Triggered**
   - Scheduler memeriksa apakah campaign masih valid
   - Cek end date (jika ada)

2. **Validate Configuration**
   - Pastikan RTMP URL dan input path tersedia
   - Validasi semua parameter

3. **Calculate Duration**
   - Fixed: Gunakan durasi tetap
   - Random: Generate random dalam range
   - Pattern: Ambil dari pattern cycle

4. **Start Stream**
   - Panggil FFmpeg dengan konfigurasi
   - Record stream ID

5. **Record Execution**
   - Simpan ke `recurring_history`
   - Update `execution_count`
   - Update `last_executed_at`
   - Calculate `next_execution_at`

6. **Handle Errors**
   - Log error message
   - Record failed execution
   - Continue schedule (tidak stop otomatis)

## 📊 Monitoring & Analytics

### Statistics Tracked:
- Total executions
- Successful executions
- Failed executions
- Average duration
- Last execution time
- Next execution time

### History Details:
- Execution timestamp
- Status (success/failed)
- Duration
- Error message (if failed)
- Stream ID (if success)

## ⚠️ Important Notes

1. **Server Harus Running**
   - Recurring schedule hanya berjalan saat server aktif
   - Gunakan process manager (PM2) untuk production

2. **Timezone**
   - Default timezone: Asia/Jakarta
   - Pastikan server timezone sesuai

3. **Resource Management**
   - Monitor resource usage untuk multiple concurrent streams
   - Set reasonable duration untuk menghindari overload

4. **Error Handling**
   - Failed execution tidak menghentikan schedule
   - Check history untuk troubleshooting

5. **End Date**
   - Campaign otomatis berhenti setelah end date
   - Status berubah menjadi "Completed"

## 🚀 Production Deployment

### Menggunakan PM2:

```bash
# Install PM2
npm install -g pm2

# Start server dengan PM2
pm2 start app.js --name vaimoz-livepilot

# Enable auto-restart on system reboot
pm2 startup
pm2 save

# Monitor logs
pm2 logs vaimoz-livepilot
```

### Environment Variables:

Pastikan `.env` sudah dikonfigurasi:
```env
PORT=8787
JWT_SECRET=your-secret-key
YOUTUBE_CLIENT_ID=your-client-id
YOUTUBE_CLIENT_SECRET=your-client-secret
```

## 🐛 Troubleshooting

### Schedule Tidak Berjalan
1. Cek apakah server running
2. Cek logs untuk error messages
3. Pastikan campaign status = "Scheduled"
4. Verify cron expression valid

### Execution Failed
1. Cek recurring history untuk error message
2. Verify RTMP URL dan stream key
3. Pastikan FFmpeg installed
4. Check file permissions untuk video files

### Wrong Timezone
1. Update `recurring_timezone` di campaign settings
2. Restart scheduler
3. Verify server system timezone

## 📝 Example Use Cases

### 1. Daily Morning Stream
```javascript
{
  recurringEnabled: true,
  recurringType: "daily",
  recurringTime: "06:00",
  recurringDurationMode: "fixed",
  recurringDurationMinutes: 120,
  recurringTimezone: "Asia/Jakarta"
}
```

### 2. Weekend Only Stream
```javascript
{
  recurringEnabled: true,
  recurringType: "weekly",
  recurringDays: ["Sabtu", "Minggu"],
  recurringTime: "19:00",
  recurringDurationMode: "random",
  recurringDurationMin: 60,
  recurringDurationMax: 180
}
```

### 3. Monthly Special Event
```javascript
{
  recurringEnabled: true,
  recurringType: "monthly",
  recurringTime: "20:00",
  recurringDurationMode: "fixed",
  recurringDurationMinutes: 240,
  recurringEndDate: "2026-12-31"
}
```

## 🎯 Best Practices

1. **Test First**: Test dengan "once" type sebelum set recurring
2. **Monitor Resources**: Check server resources untuk multiple streams
3. **Set End Dates**: Gunakan end date untuk campaign terbatas
4. **Review History**: Regularly check execution history
5. **Backup Config**: Backup campaign configuration
6. **Use Pause**: Gunakan pause instead of unschedule untuk temporary stop

## 📚 Additional Resources

- [node-cron Documentation](https://github.com/node-cron/node-cron)
- [FFmpeg Streaming Guide](https://trac.ffmpeg.org/wiki/StreamingGuide)
- [YouTube Live Streaming API](https://developers.google.com/youtube/v3/live)

---

**Version**: 1.0.0  
**Last Updated**: May 21, 2026  
**Author**: Vaimoz LivePilot Team
