import { useEffect, useRef, useState } from 'react';
import { Radio } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { SectionTitle } from '@/components/shared/SectionTitle.jsx';
import { RecurringScheduleSettings } from '@/components/shared/RecurringScheduleSettings.jsx';
import { RecurringHistory } from '@/components/shared/RecurringHistory.jsx';
import { cx } from '@/lib/cn.js';
import { api, apiRequest } from '@/lib/api.js';
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
import { AssetSelectorPanel, EncoderPanel } from './AssetRunnerPanel.jsx';
import { YoutubePlaylistModal } from './YoutubePlaylistModal.jsx';
import { YoutubeLiveControls } from './YoutubeLiveControls.jsx';
import { YoutubeLiveStats } from './YoutubeLiveStats.jsx';
import { SimulcastPanel } from './SimulcastPanel.jsx';
import { TemplateModal } from './TemplateModal.jsx';

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

export function CampaignPage({ editCampaign, setEditCampaign }) {
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
  const [manualCampaignName, setManualCampaignName] = useState('');
  const [manualPlatform, setManualPlatform] = useState('YouTube Manual RTMP');
  const [manualRtmpUrl, setManualRtmpUrl] = useState('');
  const [manualStreamKey, setManualStreamKey] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isStartingLive, setIsStartingLive] = useState(false);
  const [isStartingYoutubeLive, setIsStartingYoutubeLive] = useState(false);
  const [activeStreamId, setActiveStreamId] = useState(null);
  const [streamInfo, setStreamInfo] = useState(null); // { chosenVideo, chosenThumbnail, chosenTitle }
  const lastCampaignIdRef = useRef(null);

  const [youtubeCampaignName, setYoutubeCampaignName] = useState('');
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
  const [youtubeDurationMode, setYoutubeDurationMode] = useState('Tetap (Pilih Durasi Jam)');
  const [youtubeRandomStopMin, setYoutubeRandomStopMin] = useState('1');
  const [youtubeRandomStopMax, setYoutubeRandomStopMax] = useState('3');
  const [youtubeRepeatLiveDuration, setYoutubeRepeatLiveDuration] = useState('60');
  const [youtubeRepeatBreakDuration, setYoutubeRepeatBreakDuration] = useState('10');
  const [youtubeRepeatCount, setYoutubeRepeatCount] = useState('3');
  const [youtubeWeeklyDays, setYoutubeWeeklyDays] = useState(['Senin']);
  const [youtubeStartDate, setYoutubeStartDate] = useState(todayString());
  const [youtubeStartTime, setYoutubeStartTime] = useState(timeString(10));
  const [youtubeStopDate, setYoutubeStopDate] = useState(todayString());
  const [youtubeStopTime, setYoutubeStopTime] = useState('1');
  const [youtubeAutoStopEnabled, setYoutubeAutoStopEnabled] = useState(true);
  const [youtubeSmartStopEnabled, setYoutubeSmartStopEnabled] = useState(true);
  const [youtubeSmartStopViewerThreshold, setYoutubeSmartStopViewerThreshold] = useState('25');
  const [youtubeSmartStopDelayMinutes, setYoutubeSmartStopDelayMinutes] = useState('15');
  const [youtubeSmartHumanizeEnabled, setYoutubeSmartHumanizeEnabled] = useState(false);
  const [youtubeSmartHumanizeMaxMins, setYoutubeSmartHumanizeMaxMins] = useState('10');

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
  // Judul, deskripsi, privasi, thumbnail mode
  const [youtubeLiveTitles, setYoutubeLiveTitles] = useState('');
  const [youtubeDescription, setYoutubeDescription] = useState('');
  const [youtubePrivacy, setYoutubePrivacy] = useState('Publik');
  const [youtubeThumbnailMode, setYoutubeThumbnailMode] = useState('Rotasi otomatis');
  
  // Recurring Schedule Settings
  const [recurringSettings, setRecurringSettings] = useState({
    recurringEnabled: false,
    recurringType: 'once',
    recurringDays: [],
    recurringTime: '09:00',
    recurringDurationMode: 'fixed',
    recurringDurationMinutes: 60,
    recurringDurationMin: 30,
    recurringDurationMax: 120,
    recurringEndDate: '',
    recurringTimezone: 'Asia/Jakarta'
  });
  const [showRecurringSettings, setShowRecurringSettings] = useState(false);
  const [showRecurringHistory, setShowRecurringHistory] = useState(false);

  const isManualMode = campaignMode === 'Manual (RTMP)';
  const showAssetRunner = shouldShowCampaignAssetRunner(campaignMode);
  const campaignVideoAssets = campaignAssets.filter((item) => item.type === 'Video');
  const campaignThumbnailAssets = campaignAssets.filter((item) => item.type === 'Images' || item.type === 'Thumbnail');
  const availableYoutubePlaylists = youtubePlaylists.filter((playlist) => String(playlist.channelId) === String(youtubeChannelId));
  const selectedYoutubePlaylist = availableYoutubePlaylists.find((playlist) => String(playlist.id) === String(youtubePlaylistId)) || availableYoutubePlaylists[0] || null;

  // Fitur 4: Template Modal state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);



  const loadYoutubeChannels = async (preserveChannelId = null) => {
    try {
      const result = await api.youtube.channels();
      const channels = (result.channels || []).map(normalizeYoutubeChannel);
      setYoutubeChannels(channels);
      // BUG-011 FIX: Jangan timpa channel yang sedang diedit dari editCampaign
      if (preserveChannelId) {
        await loadYoutubePlaylists(preserveChannelId);
        return;
      }
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
      setYoutubeSelectedVideoNames((items) => items.filter((idOrName) => normalized.some((asset) => (String(asset.id) === String(idOrName) || asset.name === idOrName) && asset.type === 'Video')));
      setYoutubeSelectedThumbnailNames((items) => items.filter((idOrName) => normalized.some((asset) => (String(asset.id) === String(idOrName) || asset.name === idOrName) && (asset.type === 'Images' || asset.type === 'Thumbnail'))));
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
    // BUG-011: Channels akan dimuat ulang di useEffect editCampaign jika ada data edit
    loadYoutubeChannels();
  }, []);

  useEffect(() => {
    if (!editCampaign) return;
    const { mode, config } = editCampaign;
    setCampaignMode(mode);
    if (mode === 'Manual (RTMP)') {
      setManualCampaignName(editCampaign.name || '');
      setManualPlatform(config.platform || 'YouTube Manual RTMP');
      setManualRtmpUrl(config.rtmpUrl || '');
      setManualStreamKey(config.streamKey || '');
      setManualStartDate(config.startDate || todayString());
      setManualStartTime(config.startTime || timeString(10));
      setManualStopDate(config.stopDate || todayString());
      setManualStopTime(config.stopTime || timeString(130));
      setAutoStopEnabled(config.autoStopEnabled ?? true);
      setSmartStopEnabled(config.smartStopEnabled ?? true);
      setSmartStopViewerThreshold(config.smartStopViewerThreshold || '25');
      setSmartStopDelayMinutes(config.smartStopDelayMinutes || '15');
      if (config.encoder) {
        setManualEncoderMode(config.encoder.mode || 'Stream Copy (CPU ringan)');
        setManualResolution(config.encoder.resolution || 'Ikuti sumber');
        setManualBitrate(config.encoder.bitrate || 'Ikuti sumber');
        setManualFps(config.encoder.fps || 'Ikuti sumber');
      }
    } else {
      // BUG-005 FIX: Baca kedua key (liveTitles dan youtubeLiveTitles) untuk kompatibilitas
      setYoutubeLiveTitles(config.youtubeLiveTitles || config.liveTitles || '');
      setYoutubeDescription(config.youtubeDescription || config.description || '');
      setYoutubePrivacy(config.youtubePrivacy || config.privacy || 'Publik');
      setYoutubeThumbnailMode(config.youtubeThumbnailMode || config.thumbnailMode || 'Rotasi otomatis');
      setYoutubeTags(config.youtubeTags || config.tags || '');
      setYoutubeCategoryId(config.youtubeCategoryId || config.categoryId || '10');
      setYoutubeReplayPrivacy(config.replayPrivacy || 'Unlisted');
      // BUG-011 FIX: Load channels dan preserve channel yang dipilih dari config
      const savedChannelId = config.youtubeChannelId || config.channelId || '';
      if (savedChannelId) {
        setYoutubeChannelId(savedChannelId);
        loadYoutubeChannels(savedChannelId);
      }
      if (config.playlist?.id) setYoutubePlaylistId(config.playlist.id);
      if (config.youtubePlaylistId) setYoutubePlaylistId(config.youtubePlaylistId);
      
      setYoutubeSelectedVideoNames(config.videoAssetIds ? config.videoAssetIds.map(String) : (config.videoNames || []));
      setYoutubeSelectedThumbnailNames(config.thumbnailAssetIds ? config.thumbnailAssetIds.map(String) : (config.thumbnailNames || []));
      
      setYoutubeScheduleType(config.scheduleType || 'Harian');
      setYoutubeWeeklyDays(config.weeklyDays || ['Senin']);
      setYoutubeStartDate(config.startDate || todayString());
      setYoutubeStartTime(config.startTime || timeString(10));
      setYoutubeStopDate(config.stopDate || todayString());
      setYoutubeStopTime(config.stopTime || '1');
      
      setYoutubeDurationMode(config.durationMode === 'Tetap (Sesuai Jam Stop)' ? 'Tetap (Pilih Durasi Jam)' : (config.durationMode || 'Tetap (Pilih Durasi Jam)'));
      setYoutubeAutoStopEnabled(config.autoStopEnabled ?? true);
      setYoutubeRandomStopMin(config.randomStopMin || '1');
      setYoutubeRandomStopMax(config.randomStopMax || '3');
      setYoutubeRepeatLiveDuration(config.repeatLiveDuration || '60');
      setYoutubeRepeatBreakDuration(config.repeatBreakDuration || '10');
      setYoutubeRepeatCount(config.repeatCount || '3');
      
      setYoutubeSmartStopEnabled(config.smartStopEnabled ?? true);
      setYoutubeSmartStopViewerThreshold(config.smartStopViewerThreshold || '25');
      setYoutubeSmartStopDelayMinutes(config.smartStopDelayMinutes || '15');
      setYoutubeSmartHumanizeEnabled(config.recurringHumanize ?? false);
      setYoutubeSmartHumanizeMaxMins(config.recurringHumanizeMaxMins || '10');
      
      if (config.encoder) {
        setYoutubeEncoderMode(config.encoder.mode || 'Stream Copy (CPU ringan)');
        setYoutubeResolution(config.encoder.resolution || 'Ikuti sumber');
        setYoutubeBitrate(config.encoder.bitrate || 'Ikuti sumber');
        setYoutubeFps(config.encoder.fps || 'Ikuti sumber');
      }
      if (config.chatbot) {
        setYoutubeChatbotEnabled(config.chatbot.enabled ?? false);
        setYoutubeChatbotMode(config.chatbot.mode || 'Pesan berkala');
        setYoutubeChatbotInterval(config.chatbot.interval || '10');
        setYoutubeChatbotMessages(config.chatbot.messages || defaultYoutubeChatbotMessages);
      }
      setYoutubeCampaignName(config.name || editCampaign.name || '');
      setYoutubeMonetizationEnabled(config.monetizationEnabled || false);
      setYoutubeAiContentAnswer(config.aiContentAnswer || '');
    }
    
    lastCampaignIdRef.current = editCampaign.id;
    setCampaignMessage(`Mode Edit Aktif: Mengedit kampanye "${editCampaign.name}". Anda bisa "Simpan Draft Kampanye" untuk memperbarui.`);
    
    // Clear edit campaign so it doesn't get reloaded infinitely
    if (setEditCampaign) setEditCampaign(null);
  }, [editCampaign, setEditCampaign]);

  const manualState = { manualCampaignName, manualPlatform, manualRtmpUrl, manualStreamKey, manualStartDate, manualStartTime, manualStopDate, manualStopTime, autoStopEnabled, smartStopEnabled, smartStopViewerThreshold, smartStopDelayMinutes, youtubeSmartHumanizeEnabled, youtubeSmartHumanizeMaxMins, manualEncoderMode, manualResolution, manualBitrate, manualFps };
  const youtubeState = { youtubeCampaignName, youtubeChannels, youtubeMonetizationEnabled, youtubeAiContentAnswer, youtubeChannelId, youtubeTags, youtubeReplayPrivacy, youtubeCategoryId, youtubeScheduleType, youtubeDurationMode, youtubeRandomStopMin, youtubeRandomStopMax, youtubeRepeatLiveDuration, youtubeRepeatBreakDuration, youtubeRepeatCount, youtubeWeeklyDays, youtubeStartDate, youtubeStartTime, youtubeStopDate, youtubeStopTime, youtubeAutoStopEnabled, youtubeSmartStopEnabled, youtubeSmartStopViewerThreshold, youtubeSmartStopDelayMinutes, youtubeSmartHumanizeEnabled, youtubeSmartHumanizeMaxMins, youtubeEncoderMode, youtubeResolution, youtubeBitrate, youtubeFps, isYoutubeEncoderOpen, isYoutubeChatbotOpen, youtubeChatbotEnabled, youtubeChatbotMode, youtubeChatbotInterval, youtubeChatbotMessages, youtubeSelectedVideoNames, youtubeSelectedThumbnailNames, youtubeLiveTitles, youtubeDescription, youtubePrivacy, youtubeThumbnailMode };
  const setters = { setManualCampaignName, setManualPlatform, setManualRtmpUrl, setManualStreamKey, setManualStartDate, setManualStartTime, setManualStopDate, setManualStopTime, setAutoStopEnabled, setSmartStopEnabled, setSmartStopViewerThreshold, setSmartStopDelayMinutes, setManualEncoderMode, setManualResolution, setManualBitrate, setManualFps, setYoutubeCampaignName, setYoutubeMonetizationEnabled, setYoutubeAiContentAnswer, setYoutubeChannelId, setYoutubeTags, setYoutubeReplayPrivacy, setYoutubeCategoryId, setYoutubeScheduleType, setYoutubeDurationMode, setYoutubeRandomStopMin, setYoutubeRandomStopMax, setYoutubeRepeatLiveDuration, setYoutubeRepeatBreakDuration, setYoutubeRepeatCount, setYoutubeWeeklyDays, setYoutubeStartDate, setYoutubeStartTime, setYoutubeStopDate, setYoutubeStopTime, setYoutubeAutoStopEnabled, setYoutubeSmartStopEnabled, setYoutubeSmartStopViewerThreshold, setYoutubeSmartStopDelayMinutes, setYoutubeSmartHumanizeEnabled, setYoutubeSmartHumanizeMaxMins, setYoutubeEncoderMode, setYoutubeResolution, setYoutubeBitrate, setYoutubeFps, setIsYoutubeEncoderOpen, setIsYoutubeChatbotOpen, setYoutubeChatbotEnabled, setYoutubeChatbotMode, setYoutubeChatbotInterval, setYoutubeChatbotMessages, setYoutubeSelectedVideoNames, setYoutubeSelectedThumbnailNames, setYoutubePlaylistId, setIsYoutubePlaylistModalOpen, setYoutubeLiveTitles, setYoutubeDescription, setYoutubePrivacy, setYoutubeThumbnailMode };

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

  // ── Simpan draft Manual RTMP ──────────────────────────────────────────────
  const saveManualDraft = async () => {
    setIsSavingDraft(true);
    try {
      const payload = {
        name: manualCampaignName.trim() || `Manual RTMP ${new Date().toLocaleString('id-ID')}`,
        mode: 'Manual (RTMP)',
        status: 'Draft',
        config: {
          platform: manualPlatform,
          rtmpUrl: manualRtmpUrl,
          streamKey: manualStreamKey,
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
      };

      // BUG-003 FIX: Update jika kampanye sudah ada, baru buat jika belum
      let result;
      if (lastCampaignIdRef.current) {
        result = await api.campaigns.update(lastCampaignIdRef.current, payload);
      } else {
        result = await api.campaigns.create(payload);
      }
      
      const isScheduled = !!manualStartTime;
      const autoRecurringSettings = {
        recurringEnabled: isScheduled,
        recurringType: 'once',
        recurringDays: [],
        recurringTime: manualStartTime || '00:00',
        recurringDurationMode: 'fixed',
        recurringDurationMinutes: autoStopEnabled ? 60 : 0,
        recurringDurationMin: 30,
        recurringDurationMax: 120,
        recurringEndDate: manualStopDate || '',
        recurringTimezone: 'Asia/Jakarta'
      };

      if (autoRecurringSettings.recurringEnabled && result.campaign?.id) {
        await apiRequest(`/scheduler/campaigns/${result.campaign.id}/recurring`, { 
          method: 'PUT', 
          body: JSON.stringify(autoRecurringSettings) 
        });
        await apiRequest(`/scheduler/campaigns/${result.campaign.id}/schedule`, { method: 'POST' });
        setCampaignMessage(`Kampanye berhasil disimpan dan otomatis dijadwalkan: ${result.campaign?.name}.`);
      } else {
        setCampaignMessage(`Draft disimpan ke SQLite: ${result.campaign?.name}.`);
      }
      
      lastCampaignIdRef.current = result.campaign?.id || null;
      return result.campaign;
    } catch (error) {
      setCampaignMessage(`Gagal menyimpan draft: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal.'}`);
      return null;
    } finally {
      setIsSavingDraft(false);
    }
  };

  // ── Start Manual Live via backend campaigns/:id/start ──────────────────────
  const startManualLive = async () => {
    if (!manualRtmpUrl.trim()) return setCampaignMessage('⚠ RTMP URL wajib diisi sebelum mulai live.');
    setIsStartingLive(true);
    setCampaignMessage('Menyimpan draft dan menghubungkan FFmpeg...');
    try {
      // 1. Pastikan campaign sudah tersimpan
      let campaign = null;
      if (lastCampaignIdRef.current) {
        campaign = { id: lastCampaignIdRef.current };
      } else {
        campaign = await saveManualDraft();
      }
      if (!campaign?.id) {
        setCampaignMessage('⚠ Gagal menyimpan draft campaign. Coba lagi.');
        return;
      }

      // 2. Panggil endpoint campaign/:id/start — backend yang urus semua
      const result = await api.campaigns.start(campaign.id, {
        rtmpUrl: manualRtmpUrl,
        streamKey: manualStreamKey,
      });

      setActiveStreamId(result.streamId);
      setStreamInfo({
        chosenVideo:     result.chosenVideo,
        chosenThumbnail: result.chosenThumbnail,
        chosenTitle:     result.chosenTitle,
      });
      setCampaignMessage(
        `🔴 Live dimulai! Video: ${result.chosenVideo?.name} | Judul: ${result.chosenTitle}`
      );
    } catch (error) {
      setCampaignMessage(`Gagal memulai live: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal.'}`);
    } finally {
      setIsStartingLive(false);
    }
  };

  // ── Stop Manual Live ────────────────────────────────────────────────
  const stopManualLive = async () => {
    if (!lastCampaignIdRef.current) return setCampaignMessage('⚠ Tidak ada campaign aktif.');
    try {
      await api.campaigns.stop(lastCampaignIdRef.current);
      setActiveStreamId(null);
      setStreamInfo(null);
      setCampaignMessage('⏹ Stream berhasil dihentikan.');
    } catch (error) {
      setCampaignMessage(`Gagal menghentikan stream: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal.'}`);
    }
  };

  // ── Start YouTube Live ───────────────────────────────────────────────
  const startYoutubeLive = async () => {
    if (!youtubeChannelId) {
      return setCampaignMessage('⚠ Pilih YouTube channel terlebih dahulu.');
    }

    setIsStartingYoutubeLive(true);
    setCampaignMessage('Menyimpan draft dan membuat YouTube broadcast...');

    try {
      // 1. Save draft first
      let campaign = null;
      if (lastCampaignIdRef.current) {
        campaign = { id: lastCampaignIdRef.current };
      } else {
        campaign = await saveCampaignDraft();
      }

      if (!campaign?.id) {
        setCampaignMessage('⚠ Gagal menyimpan draft campaign. Coba lagi.');
        return;
      }

      // 2. Start YouTube Live
      const result = await api.campaigns.startYoutubeLive(campaign.id, {
        youtubeChannelId,
      });

      setActiveStreamId(result.streamId);
      setStreamInfo({
        chosenVideo: result.chosenVideo,
        chosenThumbnail: result.chosenThumbnail,
        chosenTitle: result.chosenTitle,
        youtubeWatchUrl: result.youtube?.watchUrl,
        youtubeBroadcastId: result.youtube?.broadcastId,
        youtubeLiveChatId: result.youtube?.liveChatId,
        sendMessage: async (message) => {
          await api.chatbot.send(campaign.id, message);
        },
      });

      setCampaignMessage(
        `🔴 YouTube Live started! Video: ${result.chosenVideo?.name} | Watch: ${result.youtube?.watchUrl}`
      );
    } catch (error) {
      setCampaignMessage(
        `Gagal memulai YouTube Live: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal.'}`
      );
    } finally {
      setIsStartingYoutubeLive(false);
    }
  };

  // ── Stop YouTube Live ────────────────────────────────────────────────
  const stopYoutubeLive = async () => {
    if (!lastCampaignIdRef.current) return setCampaignMessage('⚠ Tidak ada campaign aktif.');
    try {
      await api.campaigns.stop(lastCampaignIdRef.current);
      setActiveStreamId(null);
      setStreamInfo(null);
      setCampaignMessage('⏹ YouTube Live berhasil dihentikan.');
    } catch (error) {
      setCampaignMessage(`Gagal menghentikan YouTube Live: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal.'}`);
    }
  };

  // ── Simpan draft YouTube API ─────────────────────────────────────────────
  const saveCampaignDraft = async () => {
    const selectedVideos = campaignAssets.filter((a) =>
      (youtubeSelectedVideoNames.includes(String(a.id)) || youtubeSelectedVideoNames.includes(a.name)) && a.type === 'Video'
    );
    const selectedThumbnails = campaignAssets.filter((a) =>
      (youtubeSelectedThumbnailNames.includes(String(a.id)) || youtubeSelectedThumbnailNames.includes(a.name)) &&
      (a.type === 'Images' || a.type === 'Thumbnail')
    );

    try {
      if (isManualMode) {
        const summary = `Draft kampanye ${campaignMode} berhasil disiapkan. ${formatManualCampaignSchedule(manualStartDate, manualStartTime, manualStopDate, manualStopTime, autoStopEnabled)}. ${formatSmartStopRule(smartStopEnabled, smartStopViewerThreshold, smartStopDelayMinutes)}. ${formatManualEncoderSettings(manualEncoderMode, manualBitrate, manualFps, manualResolution)}.`;
        
        const payload = {
          name: manualCampaignName.trim() || (editCampaign?.name) || `Manual RTMP ${new Date().toLocaleString('id-ID')}`,
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
            recurringHumanize: youtubeSmartHumanizeEnabled,
            recurringHumanizeMaxMins: youtubeSmartHumanizeMaxMins,
            encoder: { mode: manualEncoderMode, resolution: manualResolution, bitrate: manualBitrate, fps: manualFps },
          },
        };
        
        let result;
        if (lastCampaignIdRef.current) {
          result = await api.campaigns.update(lastCampaignIdRef.current, payload);
        } else {
          result = await api.campaigns.create(payload);
        }
        
        // Save recurring settings if enabled and auto-schedule
        if (recurringSettings.recurringEnabled && result.campaign?.id) {
          await apiRequest(`/scheduler/campaigns/${result.campaign.id}/recurring`, { 
            method: 'PUT', 
            body: JSON.stringify(recurringSettings) 
          });
          await apiRequest(`/scheduler/campaigns/${result.campaign.id}/schedule`, { method: 'POST' });
          setCampaignMessage(`${summary} Data tersimpan dan kampanye dijadwalkan otomatis.`);
        } else {
          setCampaignMessage(`${summary} Data tersimpan ke SQLite.`);
        }
        
        lastCampaignIdRef.current = result.campaign?.id || null;
        return result.campaign;
      }

      const summary = `Draft kampanye ${campaignMode} berhasil disiapkan. ${formatYoutubeScheduleMode(youtubeScheduleType, youtubeDurationMode)}. ${formatYoutubePlaylistSelection(selectedYoutubePlaylist)}. ${formatAssetRotation('Video', selectedVideos.length)}. ${formatAssetRotation('Thumbnail', selectedThumbnails.length)}. ${formatManualCampaignSchedule(youtubeStartDate, youtubeStartTime, youtubeStopDate, youtubeStopTime, youtubeAutoStopEnabled)}. ${formatSmartStopRule(youtubeSmartStopEnabled, youtubeSmartStopViewerThreshold, youtubeSmartStopDelayMinutes)}. ${formatManualEncoderSettings(youtubeEncoderMode, youtubeBitrate, youtubeFps, youtubeResolution)}. ${formatReplayPrivacy(youtubeReplayPrivacy)}. ${formatAutoChatbotSettings(youtubeChatbotEnabled, youtubeChatbotMode, youtubeChatbotInterval, youtubeChatbotMessages)}. ${formatYouTubeCampaignSettings(youtubeMonetizationEnabled, youtubeAiContentAnswer, youtubeTags)}.`;
      
      const payload = {
        name: youtubeCampaignName.trim() || (editCampaign?.name) || `YouTube API ${new Date().toLocaleString('id-ID')}`,
        mode: campaignMode,
        status: 'Draft',
        config: {
          platform: 'YouTube',
          // Judul & konten
          liveTitles: youtubeLiveTitles,
          description: youtubeDescription,
          privacy: youtubePrivacy,
          thumbnailMode: youtubeThumbnailMode,
          tags: youtubeTags,
          categoryId: youtubeCategoryId,
          replayPrivacy: youtubeReplayPrivacy,
          // Playlist & channel
          youtubeChannelId: youtubeChannelId,
          youtubePlaylist: selectedYoutubePlaylist,
          youtubePlaylistId: selectedYoutubePlaylist?.id || '',
          // Asset IDs + paths
          videoAssetIds: selectedVideos.map((a) => a.id),
          videoNames: selectedVideos.map((a) => a.name),
          videoPaths: selectedVideos.map((a) => a.path || a.url || a.name),
          thumbnailAssetIds: selectedThumbnails.map((a) => a.id),
          thumbnailNames: selectedThumbnails.map((a) => a.name),
          thumbnailPaths: selectedThumbnails.map((a) => a.path || a.url || a.name),
          // Jadwal
          scheduleType: youtubeScheduleType,
          weeklyDays: youtubeWeeklyDays,
          startDate: youtubeStartDate,
          startTime: youtubeStartTime,
          stopDate: youtubeStopDate,
          stopTime: youtubeStopTime,
          scheduleText: `${youtubeScheduleType} ${youtubeStartTime}`,
          // Durasi & stop
          durationMode: youtubeDurationMode,
          autoStopEnabled: youtubeAutoStopEnabled,
          randomStopMin: youtubeRandomStopMin,
          randomStopMax: youtubeRandomStopMax,
          repeatLiveDuration: youtubeRepeatLiveDuration,
          repeatBreakDuration: youtubeRepeatBreakDuration,
          repeatCount: youtubeRepeatCount,
          // Smart stop
          smartStopEnabled: youtubeSmartStopEnabled,
          smartStopViewerThreshold: youtubeSmartStopViewerThreshold,
          smartStopDelayMinutes: youtubeSmartStopDelayMinutes,
          recurringHumanize: youtubeSmartHumanizeEnabled,
          recurringHumanizeMaxMins: youtubeSmartHumanizeMaxMins,
          // Encoder
          encoder: { mode: youtubeEncoderMode, resolution: youtubeResolution, bitrate: youtubeBitrate, fps: youtubeFps },
          // Chatbot
          chatbot: { enabled: youtubeChatbotEnabled, mode: youtubeChatbotMode, interval: youtubeChatbotInterval, messages: youtubeChatbotMessages },
          // Monetisasi & AI
          monetizationEnabled: youtubeMonetizationEnabled,
          aiContentAnswer: youtubeAiContentAnswer,
        },
      };

      let result;
      if (lastCampaignIdRef.current) {
        result = await api.campaigns.update(lastCampaignIdRef.current, payload);
      } else {
        result = await api.campaigns.create(payload);
      }
      
      const isScheduled = youtubeScheduleType !== 'Segera';
      const autoRecurringSettings = {
        recurringEnabled: isScheduled,
        recurringType: youtubeScheduleType === 'Sekali Jalan' ? 'once' :
                       youtubeScheduleType === 'Harian' ? 'daily' :
                       youtubeScheduleType === 'Mingguan' ? 'weekly' :
                       youtubeScheduleType === 'Bulanan' ? 'monthly' : 'once',
        recurringDays: youtubeWeeklyDays || [],
        recurringTime: youtubeStartTime || '00:00',
        recurringDurationMode: youtubeDurationMode === 'Tetap (Pilih Durasi Jam)' ? 'fixed' :
                               youtubeDurationMode === 'Acak (Random Range)' ? 'random' : 'pattern',
        // BUG-013 FIX: Baca nilai state yang benar untuk setiap mode durasi
        recurringDurationMinutes: !youtubeAutoStopEnabled ? 0 :
          youtubeDurationMode === 'Tetap (Pilih Durasi Jam)' ? (parseInt(youtubeStopTime) || 1) * 60 :
          youtubeDurationMode === 'Acak (Random Range)' ? Math.floor((parseFloat(youtubeRandomStopMin) + parseFloat(youtubeRandomStopMax)) / 2 * 60) :
          parseInt(youtubeRepeatLiveDuration) || 60,
        recurringDurationMin: !youtubeAutoStopEnabled ? 0 : Math.floor(parseFloat(youtubeRandomStopMin || '1') * 60),
        recurringDurationMax: !youtubeAutoStopEnabled ? 0 : Math.floor(parseFloat(youtubeRandomStopMax || '3') * 60),
        recurringEndDate: '', // Force empty so it repeats forever without expiring
        recurringTimezone: 'Asia/Jakarta'
      };

      // Save recurring settings if enabled and auto-schedule
      if (autoRecurringSettings.recurringEnabled && result.campaign?.id) {
        await apiRequest(`/scheduler/campaigns/${result.campaign.id}/recurring`, { 
          method: 'PUT', 
          body: JSON.stringify(autoRecurringSettings) 
        });
        await apiRequest(`/scheduler/campaigns/${result.campaign.id}/schedule`, { method: 'POST' });
        setCampaignMessage(`${summary} Data tersimpan dan kampanye otomatis dijadwalkan.`);
      } else {
        setCampaignMessage(`${summary} Data tersimpan sebagai Draft.`);
      }
      
      lastCampaignIdRef.current = result.campaign?.id || null;
      return result.campaign;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
      setCampaignMessage(`Gagal menyimpan campaign ke SQLite: ${message}`);
      return null;
    }
  };

  return (
    <>
      <header className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <SectionTitle eyebrow="Kampanye Live" title="Form Kampanye Baru" description="Pilih mode live: Manual RTMP atau YouTube API otomatis penuh." />
        {/* Fitur 4: Tombol Template */}
        <button
          type="button"
          onClick={() => setIsTemplateModalOpen(true)}
          className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition"
        >
          <Radio className="h-4 w-4" />
          Template Kampanye
        </button>
      </header>
      <CampaignModeSelector campaignMode={campaignMode} setCampaignMode={setCampaignMode} setCampaignMessage={setCampaignMessage} />
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">{campaignMessage}</section>
      
      {/* YouTube Live Controls & Stats */}
      {!isManualMode && (
        <div className="mb-6 grid gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <YoutubeLiveControls
              campaignId={lastCampaignIdRef.current}
              youtubeChannelId={youtubeChannelId}
              isStarting={isStartingYoutubeLive}
              isLive={!!activeStreamId && !isManualMode}
              streamInfo={streamInfo}
              onStartYoutubeLive={startYoutubeLive}
              onStopLive={stopYoutubeLive}
              onSaveDraft={saveCampaignDraft}
            />
          </div>
          <div>
            <YoutubeLiveStats
              campaignId={lastCampaignIdRef.current}
              isLive={!!activeStreamId && !isManualMode}
            />
          </div>
        </div>
      )}

      <section className="flex flex-col gap-5">
         <Card className="rounded-3xl border-slate-800 bg-slate-900/70">
           <CardContent className="p-5">
             <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
               <div>
                 <h3 className="text-lg font-bold text-white">{isManualMode ? 'Manual RTMP Stream' : 'YouTube API Broadcast'}</h3>
                 <p className="mt-1 text-sm text-slate-400">{isManualMode ? 'Masukkan data RTMP dari platform tujuan.' : 'Buat live otomatis menggunakan channel YouTube yang sudah terhubung.'}</p>
               </div>
               <span className={cx('w-fit rounded-full px-3 py-1 text-xs font-bold', isManualMode ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300')}>{isManualMode ? 'RTMP Manual' : 'YouTube API v3'}</span>
             </div>
             {isManualMode ? <ManualRtmpForm state={manualState} setters={setters} onSaveDraft={saveManualDraft} onStartLive={startManualLive} onStopLive={stopManualLive} isSaving={isSavingDraft} isStarting={isStartingLive} isLive={!!activeStreamId} streamInfo={streamInfo} /> : <YoutubeApiForm state={youtubeState} setters={setters} youtubeChannels={youtubeChannels} availableYoutubePlaylists={availableYoutubePlaylists} selectedYoutubePlaylist={selectedYoutubePlaylist} changeYoutubeChannel={changeYoutubeChannel} />}
             {showAssetRunner && (
               <div className="mt-8 border-t border-slate-800 pt-8">
                 <h3 className="mb-1 text-lg font-bold text-white">Aset Visual</h3>
                 <p className="mb-5 text-sm text-slate-400">Pilih sumber video dan thumbnail untuk kampanye ini.</p>
                 <AssetSelectorPanel state={youtubeState} setters={setters} campaignVideoAssets={campaignVideoAssets} campaignThumbnailAssets={campaignThumbnailAssets} saveCampaignDraft={saveCampaignDraft} isLoadingAssets={isLoadingCampaignAssets} onRefreshAssets={() => loadCampaignAssets('Aset kampanye dimuat ulang dari SQLite.')} />
               </div>
             )}
           </CardContent>
         </Card>
        {showAssetRunner ? <Card className="rounded-3xl border-slate-800 bg-slate-900/70"><CardContent className="p-5"><h3 className="mb-1 text-lg font-bold text-white">FFmpeg Runner</h3><p className="mb-5 text-sm text-slate-400">Pengaturan proses encoding.</p><EncoderPanel state={youtubeState} setters={setters} saveCampaignDraft={saveCampaignDraft} /></CardContent></Card> : null}

        {/* Fitur 3: Simulcast Panel */}
        <SimulcastPanel
          campaignId={lastCampaignIdRef.current}
          onMessage={setCampaignMessage}
        />
      </section>
      
      {showRecurringHistory && lastCampaignIdRef.current && (
        <div className="mt-4">
          <RecurringHistory campaignId={lastCampaignIdRef.current} />
        </div>
      )}
      
      <YoutubePlaylistModal open={isYoutubePlaylistModalOpen} onClose={() => setIsYoutubePlaylistModalOpen(false)} value={newYoutubePlaylistName} setValue={setNewYoutubePlaylistName} onCreate={createYoutubePlaylist} channelName={youtubeChannels.find((channel) => String(channel.id) === String(youtubeChannelId))?.name || 'Channel YouTube'} />

      {/* Fitur 4: Template Modal */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onApply={(campaign) => {
          setCampaignMessage(`✅ Kampanye "${campaign.name}" dibuat dari template. Silakan edit dan mulai live.`);
        }}
        currentCampaignId={lastCampaignIdRef.current}
        currentCampaignName={isManualMode ? manualCampaignName : youtubeCampaignName}
      />
    </>
  );
}