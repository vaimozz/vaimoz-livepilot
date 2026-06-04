import { campaigns, schedules, campaignPublishModes } from '@/data/mockCampaigns.js';
import { systemMetrics, internetSpeed } from '@/data/system.js';
import { initialYoutubeChannels, initialYoutubePlaylists, youtubeCategoryOptions } from '@/data/integrations.js';
import { analyticsBaseData } from '@/data/mockAnalytics.js';
import { appLogs, ffmpegServerLogs } from '@/data/logs.js';
import { menuItems, defaultActivePage } from '@/data/navigation.jsx';
import { getVisibleCampaigns, getStreamingRows } from '@/lib/dashboardUtils.js';
import { getLogLevelClass, getPlatformBadgeClass, getStatusClass } from '@/lib/styleUtils.js';
import { getMonitorLogs } from '@/lib/monitorUtils.js';
import { filterAssetItems, getAssetCounts, renameAssetItems, sortAssetItems } from '@/lib/assetUtils.js';
import { getAnalyticsData, getAnalyticsSummary } from '@/lib/analyticsUtils.js';
import { canLogin, canRegister, canUpdateAccount } from '@/lib/validation.js';
import { formatTopbarDate, formatTopbarTime } from '@/lib/formatters.js';
import {
  countChatbotMessages,
  countYoutubeTags,
  formatAssetRotation,
  formatAutoChatbotSettings,
  formatManualCampaignSchedule,
  formatManualEncoderSettings,
  formatReplayPrivacy,
  formatSmartStopRule,
  formatYouTubeCampaignSettings,
  formatYoutubePlaylistSelection,
  formatYoutubeScheduleMode,
  getEncoderPresetByResolution,
  shouldShowCampaignAssetRunner,
  toggleSelection,
  youtubeDurationModes,
  youtubeScheduleTypes,
} from '@/lib/campaignUtils.js';

export function runUiSmokeTests() {
  console.assert(defaultActivePage === 'Dasbor', 'Halaman default aplikasi harus Dasbor');
  console.assert(menuItems.length === 7, 'Sidebar harus berisi 7 halaman');
  console.assert(campaigns.length === 0, 'Tidak boleh ada campaign dummy di frontend');
  console.assert(schedules.length === 0, 'Tidak boleh ada schedule dummy di frontend');
  console.assert(initialYoutubeChannels.length === 0, 'Tidak boleh ada channel YouTube palsu');
  console.assert(initialYoutubePlaylists.length === 0, 'Tidak boleh ada playlist YouTube palsu');
  console.assert(analyticsBaseData.length === 0, 'Tidak boleh ada analytics palsu');
  console.assert(appLogs.length === 0 && ffmpegServerLogs.length === 0, 'Tidak boleh ada log palsu');
  console.assert(getVisibleCampaigns([], 'Semua').length === 0, 'Filter campaign kosong harus aman');
  console.assert(getStreamingRows([], 'Semua').length === 0, 'Streaming rows kosong harus aman');
  console.assert(getLogLevelClass('WARN').includes('amber'), 'Log WARN harus memakai gaya amber');
  console.assert(getMonitorLogs('Semua Log').length === 0, 'Monitor utility default tidak boleh berisi log palsu');
  console.assert(getStatusClass('Tidak dikenal').includes('bg-slate-800'), 'Status tidak dikenal harus memakai gaya fallback');
  console.assert(getPlatformBadgeClass('Facebook').includes('blue'), 'Badge Facebook harus memakai gaya biru');
  console.assert(systemMetrics.length === 3, 'Fallback Statistik Server harus punya 3 kartu metrik sistem');
  console.assert(internetSpeed.upload === '-', 'Kartu Kecepatan Internet fallback tidak boleh memakai angka palsu');
  console.assert(getAssetCounts([{ type: 'Video' }, { type: 'Audio' }, { type: 'Images' }]).Video === 1, 'Counter aset harus menghitung video');
  console.assert(filterAssetItems([{ name: 'demo.mp4', type: 'Video' }], 'Video', 'demo').length === 1, 'Filter aset harus mencari berdasarkan nama file');
  console.assert(sortAssetItems([{ name: 'b.mp4', sizeMb: 1, createdAt: 1 }, { name: 'a.mp4', sizeMb: 2, createdAt: 2 }], 'Nama File')[0].name === 'a.mp4', 'Sortir nama file harus berurutan alfabetis');
  console.assert(renameAssetItems([{ id: 1, name: 'lama.mp4' }], 1, 'baru.mp4')[0].name === 'baru.mp4', 'Rename aset harus mengubah nama file berdasarkan ID');
  console.assert(campaignPublishModes.length === 2, 'Kampanye Live harus punya 2 mode');
  console.assert(!shouldShowCampaignAssetRunner('Manual (RTMP)'), 'Aset & Runner tidak boleh tampil di mode Manual RTMP');
  console.assert(shouldShowCampaignAssetRunner('YouTube API'), 'Aset & Runner harus tampil di mode YouTube API');
  console.assert(formatManualCampaignSchedule('2026-05-18', '20:00', '2026-05-18', '23:59', true).includes('Berhenti 2026-05-18 pukul 23:59 WIB'), 'Manual RTMP harus punya waktu berhenti otomatis');
  console.assert(formatSmartStopRule(true, '25', '120').includes('120 menit'), 'Smart Stop harus mendukung durasi tunda sampai 2 jam');
  console.assert(formatManualEncoderSettings('Stream Copy (CPU ringan)', 'Ikuti sumber', 'Ikuti sumber', 'Ikuti sumber').includes('mengikuti sumber video'), 'Manual RTMP default harus Stream Copy');
  console.assert(getEncoderPresetByResolution('720p HD').bitrate === '3000 kbps', '720p harus otomatis memakai bitrate 3000 kbps');
  console.assert(countYoutubeTags('live, music, ambience') === 3, 'Tags YouTube harus dihitung berdasarkan koma');
  console.assert(formatYouTubeCampaignSettings(false, '', '').includes('Belum dipilih'), 'Konten AI default harus belum dipilih');
  console.assert(formatReplayPrivacy('Unlisted').includes('Unlisted'), 'YouTube API harus punya dropdown replay Unlisted');
  console.assert(countChatbotMessages(['halo', 'subscribe', ''].join(String.fromCharCode(10))) === 2, 'Chatbot otomatis harus menghitung pesan per baris');
  console.assert(formatAutoChatbotSettings(false, 'Pesan berkala', '10', 'halo') === 'Chatbot otomatis: Nonaktif', 'Chatbot otomatis default harus nonaktif');
  console.assert(toggleSelection(['a'], 'b').includes('b'), 'Multi select aset harus bisa menambah item');
  console.assert(formatAssetRotation('Video', 2).includes('acak'), 'Sumber Video multi select harus memakai rotasi acak');
  console.assert(formatYoutubePlaylistSelection(null).includes('belum dipilih'), 'Playlist YouTube harus punya fallback belum dipilih');
  console.assert(canLogin('admin', 'password'), 'Login harus menerima username dan password yang terisi');
  console.assert(!canRegister('admin', 'password', 'beda'), 'Register harus menolak konfirmasi password berbeda');
  console.assert(canUpdateAccount('Admin', 'secret1', 'secret1'), 'Profil akun harus bisa ganti password valid');
  console.assert(youtubeCategoryOptions.some((category) => category.id === '10' && category.label === 'Music'), 'Kategori Music harus tersedia dengan ID 10');
  console.assert(youtubeScheduleTypes.length === 4, 'YouTube API harus punya 4 tipe jadwal');
  console.assert(youtubeDurationModes.includes('Acak (Random Range)'), 'YouTube API harus punya mode durasi acak');
  console.assert(formatYoutubeScheduleMode('Harian', 'Tetap (Sesuai Jam Stop)').includes('Harian'), 'Ringkasan YouTube harus memuat tipe jadwal');
  console.assert(getAnalyticsData().length === 0, 'Analytics default harus kosong sampai API asli tersedia');
  console.assert(getAnalyticsSummary([{ revenue: 1, watchHours: 2, subscribers: 3, views: 4 }]).views === 4, 'Ringkasan Analytics harus menghitung total views');
  console.assert(formatTopbarDate(new Date('2026-05-18T18:55:56')).includes('2026'), 'Top bar harus menampilkan tanggal lengkap');
  console.assert(formatTopbarTime(new Date('2026-05-18T18:55:56')).includes('18'), 'Top bar harus menampilkan jam live');
}
