export function normalizeDashboardCampaign(campaign) {
  const config = campaign.config || {};
  const platform = config.platform || (campaign.mode === 'YouTube API' ? 'YouTube' : 'Manual RTMP');
  const schedule = config.scheduleText || config.startTime || 'Belum dijadwalkan';
  return {
    id: campaign.id,
    name: campaign.name || 'Kampanye Tanpa Nama',
    niche: campaign.mode || 'Live',
    platforms: platform === 'YouTube + Facebook' ? ['YouTube', 'Facebook'] : [platform === 'Manual RTMP' ? 'Custom RTMP' : platform],
    schedule,
    status: campaign.status || 'Draft',
    titles: 0,
    thumbnails: 0,
    video: config.videoNames?.[0] || config.inputAssetNames?.[0] || 'Belum dipilih',
    privacy: config.privacy || 'Private',
    // Data tambahan untuk Start/Stop dari CampaignTable
    rtmpUrl: config.rtmpUrl || '',
    streamKey: config.streamKey || '',
    streamId: campaign.streamId || null,
    config,
  };
}

export function getVisibleCampaigns(items, selectedPlatform) {
  if (selectedPlatform === 'Semua') return items;
  return items.filter((item) => item.platforms?.includes(selectedPlatform));
}

export function getScheduleInfo(schedule = '') {
  const text = String(schedule || 'Belum dijadwalkan');
  if (text.includes('Setiap hari')) return { label: 'Setiap hari', time: text.replace('Setiap hari', '').trim(), timezone: 'Asia/Jakarta' };
  if (text.includes('Senin')) return { label: 'Senin, Rabu, Jumat', time: text.replace('Senin, Rabu, Jumat', '').trim(), timezone: 'Asia/Jakarta' };
  if (text.includes('Mingguan')) return { label: 'Mingguan', time: text.replace('Mingguan,', '').trim(), timezone: 'Asia/Jakarta' };
  if (text.includes(':')) return { label: 'Terjadwal', time: text, timezone: 'Asia/Jakarta' };
  return { label: text, time: '--', timezone: 'Asia/Jakarta' };
}

export function getStreamingRows(items, selectedPlatform, youtubeChannels = []) {
  return items
    .flatMap((campaign) =>
      (campaign.platforms || []).map((platform) => {
        let channelName = platform === 'YouTube' ? 'YouTube Channel' : platform === 'Facebook' ? 'Facebook Page' : 'Custom RTMP';
        if (platform === 'YouTube' && campaign.config?.channelId) {
          const ch = Array.isArray(youtubeChannels) ? youtubeChannels.find(c => String(c.id) === String(campaign.config.channelId)) : null;
          if (ch) channelName = ch.name || ch.title || channelName;
        }

        const isOnline = campaign.status === 'Sedang Live' || campaign.status === 'Online' || campaign.status === 'Aktif';

        return {
          ...campaign,
          rowId: `${campaign.id}-${platform}`,
          platform,
          dashboard: platform === 'YouTube' ? 'YT Studio' : platform === 'Facebook' ? 'FB Live' : 'RTMP',
          channel: channelName,
          channelInitial: platform === 'YouTube' ? 'YT' : platform === 'Facebook' ? 'FB' : 'RT',
          startedAt: isOnline ? 'Berjalan' : '--',
          serverCondition: isOnline ? 'Server stabil' : 'Menunggu',
          viewers: '0',
          scheduleInfo: getScheduleInfo(campaign.schedule),
        };
      })
    )
    .filter((row) => selectedPlatform === 'Semua' || row.platform === selectedPlatform);
}
