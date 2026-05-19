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

export function getStreamingRows(items, selectedPlatform) {
  return items
    .flatMap((campaign) =>
      (campaign.platforms || []).map((platform) => ({
        ...campaign,
        rowId: `${campaign.id}-${platform}`,
        platform,
        dashboard: platform === 'YouTube' ? 'YT Studio' : platform === 'Facebook' ? 'FB Live' : 'RTMP',
        channel: platform === 'YouTube' ? 'YouTube Channel' : platform === 'Facebook' ? 'Facebook Page' : 'Custom RTMP',
        channelInitial: platform === 'YouTube' ? 'YT' : platform === 'Facebook' ? 'FB' : 'RT',
        startedAt: campaign.status === 'Sedang Live' || campaign.status === 'Online' ? 'Berjalan' : '--',
        serverCondition: campaign.status === 'Sedang Live' || campaign.status === 'Online' ? 'Server stabil' : 'Menunggu',
        viewers: '0',
        scheduleInfo: getScheduleInfo(campaign.schedule),
      }))
    )
    .filter((row) => selectedPlatform === 'Semua' || row.platform === selectedPlatform);
}
