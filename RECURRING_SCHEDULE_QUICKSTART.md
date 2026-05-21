# 🚀 Recurring Schedule - Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Verify Installation ✅

Database migration sudah dijalankan. Verifikasi dengan:

```bash
# Check if server runs without errors
npm run dev
```

Buka browser dan pastikan menu "Recurring Schedule" muncul di sidebar.

---

### Step 2: Create Your First Recurring Campaign

#### A. Buat Campaign Baru

1. Klik **"Kampanye Live"** di sidebar
2. Pilih mode: **YouTube API** atau **Manual RTMP**
3. Isi konfigurasi dasar campaign

#### B. Atur Recurring Schedule

1. Scroll ke bawah ke section **"Recurring Schedule (Opsional)"**
2. Klik untuk expand
3. **Aktifkan** toggle di kanan atas
4. Pilih pengaturan:

**Contoh: Stream Harian Pagi**
```
Tipe Schedule: Harian
Waktu Eksekusi: 06:00
Mode Durasi: Tetap
Durasi: 120 menit
```

**Contoh: Stream Weekend**
```
Tipe Schedule: Mingguan
Hari: Sabtu, Minggu
Waktu Eksekusi: 19:00
Mode Durasi: Acak
Min: 60 menit
Max: 180 menit
```

5. Lihat **preview** di bagian bawah
6. Klik **"Simpan Draft"**

---

### Step 3: Activate Schedule

1. Klik **"Recurring Schedule"** di sidebar
2. Temukan campaign yang baru dibuat
3. Klik tombol **"Schedule"** atau ikon Play
4. Campaign sekarang aktif! ✅

---

## 📊 Monitor Your Schedules

### View All Schedules
- Buka halaman **"Recurring Schedule"**
- Lihat semua campaign yang dijadwalkan
- Check **"Next Execution"** untuk waktu berikutnya

### View History
- Klik campaign di halaman Recurring Schedule
- Atau buka campaign di "Kampanye Live"
- Klik **"Lihat Riwayat"**
- Lihat semua eksekusi sebelumnya

### View Statistics
- Total executions
- Success rate
- Average duration
- Last execution time

---

## 🎮 Quick Actions

### Pause Schedule
```
Recurring Schedule → Campaign → Pause Button (⏸)
```
Schedule dijeda tanpa menghapus konfigurasi.

### Resume Schedule
```
Recurring Schedule → Campaign → Play Button (▶)
```
Schedule aktif kembali.

### Unschedule
```
Recurring Schedule → Campaign → Delete Button (🗑)
```
Hapus schedule (campaign tetap ada sebagai draft).

---

## 💡 Common Use Cases

### 1. Daily Morning Stream (6 AM - 8 AM)
```javascript
Tipe: Harian
Waktu: 06:00
Durasi: Tetap - 120 menit
End Date: (kosongkan untuk unlimited)
```

### 2. Weekend Night Stream (Random Duration)
```javascript
Tipe: Mingguan
Hari: Sabtu, Minggu
Waktu: 20:00
Durasi: Acak - 90 sampai 180 menit
```

### 3. Monthly Special Event
```javascript
Tipe: Bulanan
Waktu: 19:00
Durasi: Tetap - 240 menit
End Date: 2026-12-31
```

### 4. Weekday Morning Routine
```javascript
Tipe: Mingguan
Hari: Senin, Selasa, Rabu, Kamis, Jumat
Waktu: 07:00
Durasi: Pola (30-60-90-120 cycle)
```

---

## ⚠️ Important Notes

### Server Must Be Running
Recurring schedules hanya berjalan saat server aktif. Untuk production:

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start app.js --name vaimoz-livepilot

# Enable auto-start on reboot
pm2 startup
pm2 save
```

### Timezone
Default timezone: **Asia/Jakarta (WIB)**

Pastikan waktu server sesuai dengan timezone yang diinginkan.

### Resource Management
- Monitor CPU/RAM usage untuk multiple concurrent streams
- Set reasonable duration untuk menghindari overload
- Test dengan 1-2 campaign dulu sebelum scale up

---

## 🐛 Troubleshooting

### Schedule Tidak Berjalan
1. ✅ Pastikan server running
2. ✅ Check campaign status = "Scheduled"
3. ✅ Verify waktu eksekusi sudah benar
4. ✅ Check logs: `npm run dev` atau `pm2 logs`

### Execution Failed
1. ✅ Buka "Recurring Schedule"
2. ✅ Klik campaign → Lihat Riwayat
3. ✅ Check error message
4. ✅ Verify RTMP URL / YouTube settings
5. ✅ Pastikan FFmpeg installed

### Wrong Time
1. ✅ Check timezone setting
2. ✅ Verify server system time
3. ✅ Update recurring_time jika perlu

---

## 📱 Quick Reference

### Schedule Types
| Type | Description | Example |
|------|-------------|---------|
| Sekali Jalan | One-time execution | Event khusus |
| Harian | Every day | Morning show |
| Mingguan | Specific days | Weekend stream |
| Bulanan | Every 1st of month | Monthly special |

### Duration Modes
| Mode | Description | Use Case |
|------|-------------|----------|
| Tetap | Fixed duration | Consistent schedule |
| Acak | Random range | Variety |
| Pola | Pattern cycle | Automated rotation |

### Status Indicators
| Status | Meaning | Action |
|--------|---------|--------|
| Scheduled | Active, will run | Monitor |
| Paused | Temporarily stopped | Resume when ready |
| Draft | Not scheduled | Schedule to activate |
| Completed | Past end date | Archive or reschedule |

---

## 🎯 Best Practices

1. **Start Small**: Test dengan 1 campaign dulu
2. **Monitor First Week**: Check history dan statistics
3. **Set End Dates**: Untuk campaign terbatas waktu
4. **Use Pause**: Instead of unschedule untuk temporary stop
5. **Check History**: Regularly review execution history
6. **Backup Config**: Save campaign configuration

---

## 📚 Next Steps

### Learn More
- Read full guide: `RECURRING_SCHEDULE_GUIDE.md`
- Check changelog: `RECURRING_SCHEDULE_CHANGELOG.md`
- Review implementation: `IMPLEMENTATION_SUMMARY.md`

### Advanced Features
- Multiple campaigns scheduling
- Conflict detection
- Custom patterns
- Analytics integration

### Get Help
- Check execution history for errors
- Review server logs
- Verify configuration
- Test with simple schedule first

---

## ✅ Checklist

Before going live:
- [ ] Server running (PM2 recommended)
- [ ] Campaign configured correctly
- [ ] Recurring settings validated
- [ ] Test execution successful
- [ ] History tracking working
- [ ] Monitoring in place

---

## 🎉 You're Ready!

Selamat! Anda sekarang bisa menggunakan Recurring Schedule untuk mengotomatisasi live streaming.

**Tips**: Mulai dengan schedule sederhana (daily atau weekly) dan monitor hasilnya selama beberapa hari sebelum menambah kompleksitas.

**Happy Streaming! 🚀📺**

---

**Quick Start Version**: 1.0  
**Last Updated**: May 21, 2026  
**Estimated Setup Time**: 5 minutes
