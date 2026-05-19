import { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { SectionTitle } from '@/components/shared/SectionTitle.jsx';
import { cx } from '@/lib/cn.js';
import { api } from '@/lib/api.js';
import { normalizeAssetFromApi } from '@/lib/assetUtils.js';
import {
  defaultYoutubeChatbotMessages,
  formatAssetRotation,
  formatAutoChatbotSettings,
  formatManualCampaignSchedule,
  formatManualEncoderSettings,
  formatReplayPrivacy,
  formatSmartStopRule,
  formatYouTubeCampaignSettings,
  formatYoutubePlaylistSelection,
  formatYoutubeScheduleMode,
  shouldShowCampaignAssetRunner,
} from '@/lib/campaignUtils.js';
import { CampaignModeSelector } from './CampaignModeSelector.jsx';
import { ManualRtmpForm } from './ManualRtmpForm.jsx';
import { YoutubeApiForm } from './YoutubeApiForm.jsx';
import { AssetRunnerPanel } from './AssetRunnerPanel.jsx';
import { YoutubePlaylistModal } from './YoutubePlaylistModal.jsx';

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function timeString(offsetMinutes = 0) {
  const date = new Date(Date.now() + offsetMinutes * 60 * 1000);
  return date.toTimeString().slice(0, 5);
}

function normalizeYoutubeChannel(channel) {
  return {
    id: String(channel.id),
    name: channel.title || channel.name || 'YouTube Channel',
    title: channel.title || channel.name || 'YouTube Channel',
    isDefault: Boolean(channel.isDefault),
    avatar: channel.avatar || 'YT',
  };
}

function normalizeYoutubePlaylist(playlist, channelId) {
  return {
    id: String(playlist.id),
    channelId: String(playlist.channelId || channelId || ''),
    name: playlist.name || playlist.title || 'Playlist YouTube',
    title: playlist.title || playlist.name || 'Playlist YouTube',
    privacy: playlist.privacy || playlist.privacyStatus || 'Private',
  };
}

export function CampaignPage() {
  const [campaignMode, setCampaignMode] = useState('YouTube API');
  const [campaignMessage, setCampaignMessage] = useState('Pilih mode kampanye live terlebih dahulu.');
  const [manualStartDate, setManualStartDate] = useState(todayString());
  const [manualStartTime, setManualStartTime] = useState(timeString(10));
  const [manualStopDate, setManualStopDate] = useState(todayString());
  const [manualStopTime, setManualStopTime] = useState(timeString(130));
  const [autoStopEnabled, setAutoStopEnabled] = useState(true);
  const [smartStopEnabled, setSmartStopEnabled] = useState(true);
  const [smartStopViewerThreshold, setSmartStopViewerThreshold] = useState('25');
  const [smartStopDelayMinutes, setSmartStopDelayMinutes] = useState('15');
  const [manualEncoderMode, setManualEncoderMode] = useState('Stream Copy (CPU ringan)');
  const [manualResolution, setManualResolution] = useState('Ikuti sumber');
  const [manualBitrate, setManualBitrate] = useState('Ikuti sumber');
  const [manualFps, setManualFps] = useState('Ikuti sumber');

  const [youtubeMonetizationEnabled, setYoutubeMonetizationEnabled] = useState(false);
  const [youtubeAiContentAnswer, setYoutubeAiContentAnswer] = useState('');
  const [youtubeChannels, setYoutubeChannels] = useState([]);
  const [youtubeChannelId, setYoutubeChannelId] = useState('');
  const [youtubePlaylists, setYoutubePlaylists] = useState([]);
  const [youtubePlaylistId, setYoutubePlaylistId] = useState('');
  const [isYoutubePlaylistModalOpen, setIsYoutubePlaylistModalOpen] = useState(false);
  const [newYoutubePlaylistName, setNewYoutubePlaylistName] = useState('');
  const [youtubeSelectedVideoNames, setYoutubeSelectedVideoNames] = useState([]);
  const [youtubeSelectedThumbnailNames, setYoutubeSelectedThumbnailNames] = useState([]);
  const [campaignAssets, setCampaignAssets] = useState([]);
  const [isLoadingCampaignAssets, setIsLoadingCampaignAssets] = useState(false);
  const [youtubeTags, setYoutubeTags] = useState('');
  const [youtubeReplayPrivacy, setYoutubeReplayPrivacy] = useState('Unlisted');
  const [youtubeCategoryId, setYoutubeCategoryId] = useState('10');
  const [youtubeScheduleType, setYoutubeScheduleType] = useState('Harian');
  const [youtubeDurationMode, setYoutubeDurationMode] = useState('Tetap (Sesuai Jam Stop)');
  const [youtubeRandomStopMin, setYoutubeRandomStopMin] = useState('19:00');
  const [youtubeRandomStopMax, setYoutubeRandomStopMax] = useState('22:00');
  const [youtubeRepeatLiveDuration, setYoutubeRepeatLiveDuration] = useState('60');
  const [youtubeRepeatBreakDuration, setYoutubeRepeatBreakDuration] = useState('10');
  const [youtubeRepeatCount, setYoutubeRepeatCount] = useState('3');
  const [youtubeWeeklyDays, setYoutubeWeeklyDays] = useState(['Senin']);
  const [youtubeStartDate, setYoutubeStartDate] = useState(todayString());
  const [youtubeStartTime, setYoutubeStartTime] = useState(timeString(10));
  const [youtubeStopDate, setYoutubeStopDate] = useState(todayString());
  const [youtubeStopTime, setYoutubeStopTime] = useState(timeString(130));
  const [youtubeAutoStopEnabled, setYoutubeAutoStopEnabled] = useState(true);
  const [youtubeSmartStopEnabled, setYoutubeSmartStopEnabled] = useState(true);
  const [youtubeSmartStopViewerThreshold, setYoutubeSmartStopViewerThreshold] = useState('25');
  const [youtubeSmartStopDelayMinutes, setYoutubeSmartStopDelayMinutes] = useState('15');
  const [youtubeEncoderMode, setYoutubeEncoderMode] = useState('Stream Copy (CPU ringan)');
  const [youtubeResolution, setYoutubeResolution] = useState('Ikuti sumber');
  const [youtubeBitrate, setYoutubeBitrate] = useState('Ikuti sumber');
  const [youtubeFps, setYoutubeFps] = useState('Ikuti sumber');
  const [isYoutubeEncoderOpen, setIsYoutubeEncoderOpen] = useState(false);
  const [isYoutubeChatbotOpen, setIsYoutubeChatbotOpen] = useState(false);
  const [youtubeChatbotEnabled, setYoutubeChatbotEnabled] = useState(false);
  const [youtubeChatbotMode, setYoutubeChatbotMode] = useState('Pesan berkala');
  const [youtubeChatbotInterval, setYoutubeChatbotInterval] = useState('10');
  const [youtubeChatbotMessages, setYoutubeChatbotMessages] = useState(defaultYoutubeChatbotMessages);

  const isManualMode = campaignMode === 'Manual (RTMP)';
  const showAssetRunner = shouldShowCampaignAssetRunner(campaignMode);
  const campaignVideoAssets = campaignAssets.filter((item) => item.type === 'Video');
  const campaignThumbnailAssets = campaignAssets.filter((item) => item.type === 'Images' || item.type === 'Thumbnail');
  const availableYoutubePlaylists = youtubePlaylists.filter((playlist) => String(playlist.channelId) === String(youtubeChannelId));
  const selectedYoutubePlaylist = availableYoutubePlaylists.find((playlist) => String(playlist.id) === String(youtubePlaylistId)) || availableYoutubePlaylists[0] || null;



  const loadYoutubeChannels = async () => {
    try {
      const result = await api.youtube.channels();
      const channels = (result.channels || []).map(normalizeYoutubeChannel);
      setYoutubeChannels(channels);
      const defaultChannel = channels.find((channel) => channel.isDefault) || channels[0];
      if (defaultChannel) {
        setYoutubeChannelId(String(defaultChannel.id));
        await loadYoutubePlaylists(String(defaultChannel.id));
      } else {
        setYoutubeChannelId('');
        setYoutubePlaylists([]);
        setYoutubePlaylistId('');
      }
    } catch (error) {
      setCampaignMessage(`Gagal membaca channel YouTube: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal.'}`);
    }
  };

  const loadYoutubePlaylists = async (channelId) => {
    if (!channelId) {
      setYoutubePlaylists([]);
      setYoutubePlaylistId('');
      return;
    }
    try {
      const result = await api.youtube.playlists(channelId);
      const playlists = (result.playlists || []).map((playlist) => normalizeYoutubePlaylist(playlist, channelId));
      setYoutubePlaylists((items) => [
        ...items.filter((playlist) => String(playlist.channelId) !== String(channelId)),
        ...playlists,
      ]);
      setYoutubePlaylistId(playlists[0]?.id || '');
    } catch (error) {
      setYoutubePlaylists((items) => items.filter((playlist) => String(playlist.channelId) !== String(channelId)));
      setYoutubePlaylistId('');
      setCampaignMessage(`Gagal membaca playlist YouTube: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal.'}`);
    }
  };


  const loadCampaignAssets = async (nextMessage = '') => {
    setIsLoadingCampaignAssets(true);
    try {
      const result = await api.assets.list();
      const normalized = (result.assets || []).map(normalizeAssetFromApi);
      setCampaignAssets(normalized);
      setYoutubeSelectedVideoNames((items) => items.filter((name) => normalized.some((asset) => asset.name === name && asset.type === 'Video')));
      setYoutubeSelectedThumbnailNames((items) => items.filter((name) => normalized.some((asset) => asset.name === name && (asset.type === 'Images' || asset.type === 'Thumbnail'))));
      if (nextMessage) setCampaignMessage(nextMessage);
      else setCampaignMessage(`Aset & Runner tersambung ke SQLite. ${normalized.length} aset tersedia.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
      setCampaignMessage(`Gagal memuat aset dari SQLite: ${message}`);
    } finally {
      setIsLoadingCampaignAssets(false);
    }
  };

  useEffect(() => {
    loadCampaignAssets();
    loadYoutubeChannels();
  }, []);

  const manualState = { manualStartDate, manualStartTime, manualStopDate, manualStopTime, autoStopEnabled, smartStopEnabled, smartStopViewerThreshold, smartStopDelayMinutes, manualEncoderMode, manualResolution, manualBitrate, manualFps };
  const youtubeState = { youtubeChannels, youtubeMonetizationEnabled, youtubeAiContentAnswer, youtubeChannelId, youtubeTags, youtubeReplayPrivacy, youtubeCategoryId, youtubeScheduleType, youtubeDurationMode, youtubeRandomStopMin, youtubeRandomStopMax, youtubeRepeatLiveDuration, youtubeRepeatBreakDuration, youtubeRepeatCount, youtubeWeeklyDays, youtubeStartDate, youtubeStartTime, youtubeStopDate, youtubeStopTime, youtubeAutoStopEnabled, youtubeSmartStopEnabled, youtubeSmartStopViewerThreshold, youtubeSmartStopDelayMinutes, youtubeEncoderMode, youtubeResolution, youtubeBitrate, youtubeFps, isYoutubeEncoderOpen, isYoutubeChatbotOpen, youtubeChatbotEnabled, youtubeChatbotMode, youtubeChatbotInterval, youtubeChatbotMessages, youtubeSelectedVideoNames, youtubeSelectedThumbnailNames };
  const setters = { setManualStartDate, setManualStartTime, setManualStopDate, setManualStopTime, setAutoStopEnabled, setSmartStopEnabled, setSmartStopViewerThreshold, setSmartStopDelayMinutes, setManualEncoderMode, setManualResolution, setManualBitrate, setManualFps, setYoutubeMonetizationEnabled, setYoutubeAiContentAnswer, setYoutubeChannelId, setYoutubeTags, setYoutubeReplayPrivacy, setYoutubeCategoryId, setYoutubeScheduleType, setYoutubeDurationMode, setYoutubeRandomStopMin, setYoutubeRandomStopMax, setYoutubeRepeatLiveDuration, setYoutubeRepeatBreakDuration, setYoutubeRepeatCount, setYoutubeWeeklyDays, setYoutubeStartDate, setYoutubeStartTime, setYoutubeStopDate, setYoutubeStopTime, setYoutubeAutoStopEnabled, setYoutubeSmartStopEnabled, setYoutubeSmartStopViewerThreshold, setYoutubeSmartStopDelayMinutes, setYoutubeEncoderMode, setYoutubeResolution, setYoutubeBitrate, setYoutubeFps, setIsYoutubeEncoderOpen, setIsYoutubeChatbotOpen, setYoutubeChatbotEnabled, setYoutubeChatbotMode, setYoutubeChatbotInterval, setYoutubeChatbotMessages, setYoutubeSelectedVideoNames, setYoutubeSelectedThumbnailNames, setYoutubePlaylistId, setIsYoutubePlaylistModalOpen };

  const changeYoutubeChannel = async (nextChannelId) => {
    setYoutubeChannelId(nextChannelId);
    await loadYoutubePlaylists(nextChannelId);
  };

  const createYoutubePlaylist = async () => {
    const cleanName = newYoutubePlaylistName.trim();
    if (!cleanName) return setCampaignMessage('Nama playlist YouTube wajib diisi.');
    if (!youtubeChannelId) return setCampaignMessage('Sambungkan channel YouTube asli terlebih dahulu sebelum membuat playlist.');
    try {
      const result = await api.youtube.createPlaylist(youtubeChannelId, { title: cleanName, privacyStatus: 'private' });
      const newPlaylist = normalizeYoutubePlaylist(result.playlist || { title: cleanName }, youtubeChannelId);
      setYoutubePlaylists((items) => [newPlaylist, ...items.filter((item) => String(item.id) !== String(newPlaylist.id))]);
      setYoutubePlaylistId(newPlaylist.id);
      setNewYoutubePlaylistName('');
      setIsYoutubePlaylistModalOpen(false);
      setCampaignMessage(`Playlist ${newPlaylist.name} berhasil dibuat untuk channel YouTube terpilih.`);
    } catch (error) {
      setCampaignMessage(`Gagal membuat playlist YouTube: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal.'}`);
    }
  };

  const saveCampaignDraft = async () => {
    // Resolve selected asset details dari ID (AssetRunnerPanel kini pakai ID)
    const selectedVideos = campaignAssets.filter((a) =>
      youtubeSelectedVideoNames.includes(String(a.id || a.name)) && a.type === 'Video'
    );
    const selectedThumbnails = campaignAssets.filter((a) =>
      youtubeSelectedThumbnailNames.includes(String(a.id || a.name)) &&
      (a.type === 'Images' || a.type === 'Thumbnail')
    );

    try {
      if (isManualMode) {
        const summary = `Draft kampanye ${campaignMode} berhasil disiapkan. ${formatManualCampaignSchedule(manualStartDate, manualStartTime, manualStopDate, manualStopTime, autoStopEnabled)}. ${formatSmartStopRule(smartStopEnabled, smartStopViewerThreshold, smartStopDelayMinutes)}. ${formatManualEncoderSettings(manualEncoderMode, manualBitrate, manualFps, manualResolution)}.`;
        await api.campaigns.create({
          name: `Manual RTMP ${new Date().toLocaleString('id-ID')}`,
          mode: campaignMode,
          status: 'Draft',
          config: {
            platform: 'Manual RTMP',
            startDate: manualStartDate,
            startTime: manualStartTime,
            stopDate: manualStopDate,
            stopTime: manualStopTime,
            scheduleText: `${manualStartDate} ${manualStartTime}`,
            autoStopEnabled,
            smartStopEnabled,
            smartStopViewerThreshold,
            smartStopDelayMinutes,
            encoder: { mode: manualEncoderMode, resolution: manualResolution, bitrate: manualBitrate, fps: manualFps },
          },
        });
        setCampaignMessage(`${summary} Data tersimpan ke SQLite.`);
        return;
      }

      const summary = `Draft kampanye ${campaignMode} berhasil disiapkan. ${formatYoutubeScheduleMode(youtubeScheduleType, youtubeDurationMode)}. ${formatYoutubePlaylistSelection(selectedYoutubePlaylist)}. ${formatAssetRotation('Video', selectedVideos.length)}. ${formatAssetRotation('Thumbnail', selectedThumbnails.length)}. ${formatManualCampaignSchedule(youtubeStartDate, youtubeStartTime, youtubeStopDate, youtubeStopTime, youtubeAutoStopEnabled)}. ${formatSmartStopRule(youtubeSmartStopEnabled, youtubeSmartStopViewerThreshold, youtubeSmartStopDelayMinutes)}. ${formatManualEncoderSettings(youtubeEncoderMode, youtubeBitrate, youtubeFps, youtubeResolution)}. ${formatReplayPrivacy(youtubeReplayPrivacy)}. ${formatAutoChatbotSettings(youtubeChatbotEnabled, youtubeChatbotMode, youtubeChatbotInterval, youtubeChatbotMessages)}. ${formatYouTubeCampaignSettings(youtubeMonetizationEnabled, youtubeAiContentAnswer, youtubeTags)}.`;
      await api.campaigns.create({
        name: `YouTube API ${new Date().toLocaleString('id-ID')}`,
        mode: campaignMode,
        status: 'Draft',
        config: {
          platform: 'YouTube',
          // Asset IDs + paths agar backend bisa langsung pakai
          videoAssetIds: selectedVideos.map((a) => a.id),
          videoNames: selectedVideos.map((a) => a.name),
          videoPaths: selectedVideos.map((a) => a.path || a.url || a.name),
          thumbnailAssetIds: selectedThumbnails.map((a) => a.id),
          thumbnailNames: selectedThumbnails.map((a) => a.name),
          thumbnailPaths: selectedThumbnails.map((a) => a.path || a.url || a.name),
          playlist: selectedYoutubePlaylist,
          tags: youtubeTags,
          categoryId: youtubeCategoryId,
          replayPrivacy: youtubeReplayPrivacy,
          startDate: youtubeStartDate,
          startTime: youtubeStartTime,
          stopDate: youtubeStopDate,
          stopTime: youtubeStopTime,
          scheduleText: `${youtubeScheduleType} ${youtubeStartTime}`,
          durationMode: youtubeDurationMode,
          autoStopEnabled: youtubeAutoStopEnabled,
          smartStopEnabled: youtubeSmartStopEnabled,
          smartStopViewerThreshold: youtubeSmartStopViewerThreshold,
          smartStopDelayMinutes: youtubeSmartStopDelayMinutes,
          encoder: { mode: youtubeEncoderMode, resolution: youtubeResolution, bitrate: youtubeBitrate, fps: youtubeFps },
          chatbot: { enabled: youtubeChatbotEnabled, mode: youtubeChatbotMode, interval: youtubeChatbotInterval, messages: youtubeChatbotMessages },
          monetizationEnabled: youtubeMonetizationEnabled,
          aiContentAnswer: youtubeAiContentAnswer,
        },
      });
      setCampaignMessage(`${summary} Data tersimpan ke SQLite.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
      setCampaignMessage(`Gagal menyimpan campaign ke SQLite: ${message}`);
    }
  };

  return (
    <>
      <header className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><SectionTitle eyebrow="Kampanye Live" title="Form Kampanye Baru" description="Pilih mode live: Manual RTMP atau YouTube API otomatis penuh." /></header>
      <CampaignModeSelector campaignMode={campaignMode} setCampaignMode={setCampaignMode} setCampaignMessage={setCampaignMessage} />
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">{campaignMessage}</section>
      <section className={cx('grid gap-5', showAssetRunner ? 'xl:grid-cols-3' : 'xl:grid-cols-1')}>
        <Card className={cx('rounded-3xl border-slate-800 bg-slate-900/70', showAssetRunner ? 'xl:col-span-2' : 'xl:col-span-1')}><CardContent className="p-5"><div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><h3 className="text-lg font-bold text-white">{isManualMode ? 'Manual RTMP Stream' : 'YouTube API Broadcast'}</h3><p className="mt-1 text-sm text-slate-400">{isManualMode ? 'Masukkan data RTMP dari platform tujuan.' : 'Buat live otomatis menggunakan channel YouTube yang sudah terhubung.'}</p></div><span className={cx('w-fit rounded-full px-3 py-1 text-xs font-bold', isManualMode ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300')}>{isManualMode ? 'RTMP Manual' : 'YouTube API v3'}</span></div>{isManualMode ? <ManualRtmpForm state={manualState} setters={setters} /> : <YoutubeApiForm state={youtubeState} setters={setters} youtubeChannels={youtubeChannels} availableYoutubePlaylists={availableYoutubePlaylists} selectedYoutubePlaylist={selectedYoutubePlaylist} changeYoutubeChannel={changeYoutubeChannel} />}</CardContent></Card>
        {showAssetRunner ? <Card className="rounded-3xl border-slate-800 bg-slate-900/70"><CardContent className="p-5"><h3 className="mb-1 text-lg font-bold text-white">Aset & Runner</h3><p className="mb-5 text-sm text-slate-400">Pilih sumber video dan pengaturan proses FFmpeg.</p><AssetRunnerPanel state={youtubeState} setters={setters} campaignVideoAssets={campaignVideoAssets} campaignThumbnailAssets={campaignThumbnailAssets} saveCampaignDraft={saveCampaignDraft} isLoadingAssets={isLoadingCampaignAssets} onRefreshAssets={() => loadCampaignAssets('Aset kampanye dimuat ulang dari SQLite.')} /></CardContent></Card> : null}
      </section>
      <YoutubePlaylistModal open={isYoutubePlaylistModalOpen} onClose={() => setIsYoutubePlaylistModalOpen(false)} value={newYoutubePlaylistName} setValue={setNewYoutubePlaylistName} onCreate={createYoutubePlaylist} channelName={youtubeChannels.find((channel) => String(channel.id) === String(youtubeChannelId))?.name || 'Channel YouTube'} />
    </>
  );
}
