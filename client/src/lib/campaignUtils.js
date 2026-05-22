export const youtubeScheduleTypes = ['Sekali Jalan', 'Harian', 'Mingguan', 'Bulanan'];
export const youtubeDurationModes = ['Tetap (Pilih Durasi Jam)', 'Acak (Random Range)', 'Pola (Berulang)'];
export const youtubeWeekdayOptions = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
export const recurringTypes = [
  { value: 'once', label: 'Sekali Jalan' },
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' }
];
export const durationModes = [
  { value: 'fixed', label: 'Tetap (Fixed Duration)' },
  { value: 'random', label: 'Acak (Random Range)' },
  { value: 'pattern', label: 'Pola (Pattern Cycle)' }
];

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

// ========== RECURRING SCHEDULE UTILITIES ==========

/**
 * Format recurring schedule display text
 */
export function formatRecurringSchedule(recurringEnabled, recurringType, recurringTime, recurringDays = []) {
  if (!recurringEnabled) return 'Belum dijadwalkan';
  
  const time = recurringTime || '00:00';
  
  switch (recurringType) {
    case 'once':
      return `Sekali jalan pada ${time} WIB`;
    case 'daily':
      return `Setiap hari pada ${time} WIB`;
    case 'weekly': {
      if (recurringDays.length === 0) return `Setiap minggu pada ${time} WIB`;
      if (recurringDays.length === 7) return `Setiap hari pada ${time} WIB`;
      const dayStr = recurringDays.join(', ');
      return `Setiap ${dayStr} pada ${time} WIB`;
    }
    case 'monthly':
      return `Setiap tanggal 1 pada ${time} WIB`;
    default:
      return 'Belum dijadwalkan';
  }
}

/**
 * Format duration mode display text
 */
export function formatDurationMode(mode, fixedMinutes, minMinutes, maxMinutes) {
  switch (mode) {
    case 'fixed':
      return `Durasi tetap: ${fixedMinutes || 60} menit`;
    case 'random':
      return `Durasi acak: ${minMinutes || 30}-${maxMinutes || 120} menit`;
    case 'pattern':
      return 'Durasi pola: 30, 60, 90, 120 menit (berulang)';
    default:
      return 'Durasi belum diatur';
  }
}

/**
 * Format recurring end date
 */
export function formatRecurringEndDate(endDate) {
  if (!endDate) return 'Tanpa batas waktu';
  return `Berakhir pada ${endDate}`;
}

/**
 * Get recurring type label from value
 */
export function getRecurringTypeLabel(value) {
  const type = recurringTypes.find(t => t.value === value);
  return type ? type.label : value;
}

/**
 * Get duration mode label from value
 */
export function getDurationModeLabel(value) {
  const mode = durationModes.find(m => m.value === value);
  return mode ? mode.label : value;
}

/**
 * Validate recurring settings
 */
export function validateRecurringSettings(settings) {
  const errors = [];
  
  if (!settings.recurringTime) {
    errors.push('Waktu eksekusi harus diisi');
  }
  
  if (settings.recurringType === 'weekly' && (!settings.recurringDays || settings.recurringDays.length === 0)) {
    errors.push('Pilih minimal 1 hari untuk jadwal mingguan');
  }
  
  if (settings.recurringDurationMode === 'fixed' && !settings.recurringDurationMinutes) {
    errors.push('Durasi tetap harus diisi');
  }
  
  if (settings.recurringDurationMode === 'random') {
    if (!settings.recurringDurationMin || !settings.recurringDurationMax) {
      errors.push('Durasi minimum dan maksimum harus diisi');
    } else if (settings.recurringDurationMin >= settings.recurringDurationMax) {
      errors.push('Durasi minimum harus lebih kecil dari maksimum');
    }
  }
  
  return errors;
}

/**
 * Format execution history status
 */
export function formatExecutionStatus(status) {
  const statusMap = {
    success: { label: 'Berhasil', color: 'text-green-400' },
    failed: { label: 'Gagal', color: 'text-red-400' },
    running: { label: 'Berjalan', color: 'text-blue-400' }
  };
  return statusMap[status] || { label: status, color: 'text-gray-400' };
}

/**
 * Calculate next execution preview
 */
export function getNextExecutionPreview(recurringType, recurringTime, recurringDays = []) {
  const now = new Date();
  const [hour, minute] = (recurringTime || '00:00').split(':');
  
  switch (recurringType) {
    case 'once':
      return 'Akan dijalankan sekali sesuai tanggal yang dipilih';
    
    case 'daily': {
      const next = new Date(now);
      next.setHours(parseInt(hour), parseInt(minute), 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      return `Eksekusi berikutnya: ${next.toLocaleDateString('id-ID')} ${recurringTime}`;
    }
    
    case 'weekly': {
      if (recurringDays.length === 0) return 'Pilih hari untuk melihat preview';
      return `Akan dijalankan setiap ${recurringDays.join(', ')} pada ${recurringTime}`;
    }
    
    case 'monthly': {
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      next.setHours(parseInt(hour), parseInt(minute), 0, 0);
      return `Eksekusi berikutnya: ${next.toLocaleDateString('id-ID')} ${recurringTime}`;
    }
    
    default:
      return 'Preview tidak tersedia';
  }
}
