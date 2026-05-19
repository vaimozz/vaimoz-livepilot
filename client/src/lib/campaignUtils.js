export const youtubeScheduleTypes = ['Sekali Jalan', 'Harian', 'Mingguan'];
export const youtubeDurationModes = ['Tetap (Sesuai Jam Stop)', 'Acak (Random Range)', 'Pola (Berulang)'];
export const youtubeWeekdayOptions = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export const defaultYoutubeChatbotMessages = '';

export function shouldShowCampaignAssetRunner(mode) {
  return mode === 'YouTube API';
}

export function formatManualCampaignSchedule(startDate, startTime, stopDate, stopTime, autoStopEnabled) {
  const stopText = autoStopEnabled ? `${stopDate} pukul ${stopTime} WIB` : 'Auto stop nonaktif';
  return `Mulai ${startDate} pukul ${startTime} WIB • Berhenti ${stopText}`;
}

export function formatSmartStopRule(enabled, viewerThreshold, delayMinutes) {
  if (!enabled) return 'Smart Stop nonaktif';
  const threshold = Number(viewerThreshold) || 0;
  const delay = Number(delayMinutes) || 0;
  return `Smart Stop aktif: tunda stop ${delay} menit jika penonton > ${threshold}`;
}

export function getEncoderPresetByResolution(resolution) {
  const presets = {
    'Ikuti sumber': { bitrate: 'Ikuti sumber', fps: 'Ikuti sumber' },
    '720p HD': { bitrate: '3000 kbps', fps: '30 FPS' },
    '1080p Full HD': { bitrate: '4500 kbps', fps: '30 FPS' },
    '1440p 2K': { bitrate: '9000 kbps', fps: '60 FPS' },
    '2160p 4K': { bitrate: '18000 kbps', fps: '60 FPS' },
  };
  return presets[resolution] || presets['1080p Full HD'];
}

export function formatManualEncoderSettings(encoderMode, bitrate, fps, resolution) {
  if (encoderMode === 'Stream Copy (CPU ringan)') return 'Encoder Stream Copy: resolusi, bitrate, dan FPS mengikuti sumber video';
  const preset = getEncoderPresetByResolution(resolution);
  const selectedFps = fps === 'Ikuti sumber' ? preset.fps : fps;
  return `Encoder Re-encode: ${resolution}, ${preset.bitrate}, ${selectedFps}`;
}

export function countYoutubeTags(tags) {
  return tags.split(',').map((tag) => tag.trim()).filter(Boolean).length;
}

export function formatYouTubeCampaignSettings(monetizationEnabled, aiContentAnswer, tags) {
  const monetizationText = monetizationEnabled ? 'Aktif sesuai default channel' : 'Belum dicentang';
  const aiText = aiContentAnswer || 'Belum dipilih';
  return `Monetisasi: ${monetizationText} • Konten AI: ${aiText} • Tags: ${countYoutubeTags(tags)} tag`;
}

export function formatReplayPrivacy(replayPrivacy) {
  return `Replay setelah selesai: ${replayPrivacy}`;
}

export function formatYoutubeScheduleMode(scheduleType, durationMode) {
  return `Mode jadwal: ${scheduleType} • Mode durasi: ${durationMode}`;
}

export function countChatbotMessages(messages) {
  return String(messages || '').split(String.fromCharCode(10)).map((message) => message.trim()).filter(Boolean).length;
}

export function formatAutoChatbotSettings(enabled, mode, intervalMinutes, messages) {
  if (!enabled) return 'Chatbot otomatis: Nonaktif';
  return `Chatbot otomatis: ${mode}, interval ${intervalMinutes} menit, ${countChatbotMessages(messages)} pesan`;
}

export function toggleSelection(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function formatAssetRotation(label, selectedCount) {
  if (selectedCount === 0) return `${label}: belum dipilih`;
  if (selectedCount === 1) return `${label}: 1 dipilih`;
  return `${label}: ${selectedCount} dipilih, server memilih acak saat live`;
}

export function getYoutubePlaylistsForChannel(playlists, channelId) {
  return playlists.filter((playlist) => String(playlist.channelId) === String(channelId));
}

export function formatYoutubePlaylistSelection(playlist) {
  if (!playlist) return 'Playlist YouTube: belum dipilih';
  return `Playlist YouTube: ${playlist.name}`;
}
