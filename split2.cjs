const fs = require('fs');
let c = fs.readFileSync('client/src/features/campaign/CampaignPage.jsx', 'utf8');
c = c.replace(/Tetap \(Sesuai Jam Stop\)/g, 'Tetap (Pilih Durasi Jam)');
// Also handle fallback in config load:
c = c.replace(/config\.durationMode \|\| 'Tetap \(Pilih Durasi Jam\)'/, "config.durationMode === 'Tetap (Sesuai Jam Stop)' ? 'Tetap (Pilih Durasi Jam)' : (config.durationMode || 'Tetap (Pilih Durasi Jam)')");
fs.writeFileSync('client/src/features/campaign/CampaignPage.jsx', c);

let c2 = fs.readFileSync('client/src/features/campaign/YoutubeApiForm.jsx', 'utf8');
c2 = c2.replace(/Tetap \(Sesuai Jam Stop\)/g, 'Tetap (Pilih Durasi Jam)');
fs.writeFileSync('client/src/features/campaign/YoutubeApiForm.jsx', c2);

let c3 = fs.readFileSync('client/src/lib/campaignUtils.js', 'utf8');
c3 = c3.replace(/Tetap \(Sesuai Jam Stop\)/g, 'Tetap (Pilih Durasi Jam)');
fs.writeFileSync('client/src/lib/campaignUtils.js', c3);
