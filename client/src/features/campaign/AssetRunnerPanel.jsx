import { FileVideo, Loader2, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { ThumbnailAssetPreview } from '@/components/shared/Previews.jsx';
import { cx } from '@/lib/cn.js';
import {
  countChatbotMessages,
  formatAssetRotation,
  formatAutoChatbotSettings,
  formatManualEncoderSettings,
  getEncoderPresetByResolution,
  toggleSelection,
} from '@/lib/campaignUtils.js';

function AssetEmptyState({ label }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-4 py-8 text-center text-xs text-slate-400">
      Belum ada {label} dari SQLite. Upload dulu di <span className="font-bold text-cyan-300">Pustaka Aset</span>, lalu klik Refresh.
    </div>
  );
}

export function AssetRunnerPanel({
  state,
  setters,
  campaignVideoAssets,
  campaignThumbnailAssets,
  saveCampaignDraft,
  isLoadingAssets = false,
  onRefreshAssets,
}) {
  const updateEncoder = (nextMode) => {
    setters.setYoutubeEncoderMode(nextMode);
    if (nextMode === 'Stream Copy (CPU ringan)') {
      setters.setYoutubeResolution('Ikuti sumber');
      setters.setYoutubeBitrate('Ikuti sumber');
      setters.setYoutubeFps('Ikuti sumber');
      return;
    }
    const defaultResolution = state.youtubeResolution === 'Ikuti sumber' ? '1080p Full HD' : state.youtubeResolution;
    const preset = getEncoderPresetByResolution(defaultResolution);
    setters.setYoutubeResolution(defaultResolution);
    setters.setYoutubeBitrate(preset.bitrate);
    setters.setYoutubeFps(preset.fps);
  };

  const updateResolution = (nextResolution) => {
    const preset = getEncoderPresetByResolution(nextResolution);
    setters.setYoutubeResolution(nextResolution);
    setters.setYoutubeBitrate(preset.bitrate);
    setters.setYoutubeFps(preset.fps);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-white">Data Aset SQLite</p>
          <p className="mt-1 text-xs text-slate-500">
            Video {campaignVideoAssets.length} • Thumbnail {campaignThumbnailAssets.length}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onRefreshAssets}
          disabled={isLoadingAssets}
          className="rounded-xl border-slate-700 bg-slate-900 px-3 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoadingAssets ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">Sumber Video</p>
            <p className="mt-1 text-xs text-slate-500">Pilih beberapa video dari SQLite. Server memilih acak ketika live dimulai.</p>
          </div>
          <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold text-cyan-300">
            {state.youtubeSelectedVideoNames.length} dipilih
          </span>
        </div>

        {isLoadingAssets ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-8 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat video dari SQLite...
          </div>
        ) : campaignVideoAssets.length > 0 ? (
          <div className="space-y-2">
            {campaignVideoAssets.map((asset) => (
              <label
                key={asset.id || asset.name}
                className={cx(
                  'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-xs transition',
                  state.youtubeSelectedVideoNames.includes(asset.name)
                    ? 'border-cyan-400 bg-cyan-500/10 text-cyan-200'
                    : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
                )}
              >
                <input
                  type="checkbox"
                  checked={state.youtubeSelectedVideoNames.includes(asset.name)}
                  onChange={() => setters.setYoutubeSelectedVideoNames((items) => toggleSelection(items, asset.name))}
                  className="h-4 w-4"
                />
                <FileVideo className="h-4 w-4 shrink-0 text-cyan-300" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{asset.name}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{asset.source} • {asset.size || '-'}</p>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <AssetEmptyState label="video" />
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setters.setYoutubeSelectedVideoNames(campaignVideoAssets.map((asset) => asset.name))}
            disabled={campaignVideoAssets.length === 0}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Pilih Semua
          </button>
          <button
            type="button"
            onClick={() => setters.setYoutubeSelectedVideoNames([])}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-slate-700"
          >
            Reset
          </button>
        </div>
        <p className="mt-3 rounded-xl bg-slate-900 px-3 py-2 text-[11px] text-slate-400">
          {formatAssetRotation('Video', state.youtubeSelectedVideoNames.length)}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">Thumbnail</p>
            <p className="mt-1 text-xs text-slate-500">Pilih beberapa thumbnail dari SQLite untuk rotasi acak saat live dibuat.</p>
          </div>
          <span className="rounded-full bg-pink-500/10 px-2.5 py-1 text-[10px] font-bold text-pink-300">
            {state.youtubeSelectedThumbnailNames.length} dipilih
          </span>
        </div>

        {isLoadingAssets ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-8 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat thumbnail dari SQLite...
          </div>
        ) : campaignThumbnailAssets.length > 0 ? (
          <div className="space-y-2">
            {campaignThumbnailAssets.map((asset) => {
              const isSelected = state.youtubeSelectedThumbnailNames.includes(asset.name);
              return (
                <label
                  key={asset.id || asset.name}
                  className={cx(
                    'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-xs transition',
                    isSelected ? 'border-pink-400 bg-pink-500/10 text-pink-200' : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => setters.setYoutubeSelectedThumbnailNames((items) => toggleSelection(items, asset.name))}
                    className="h-4 w-4"
                  />
                  {asset.url ? (
                    <img src={asset.url} alt={asset.name} className="h-14 w-24 shrink-0 rounded-xl border border-slate-700 object-cover" />
                  ) : (
                    <ThumbnailAssetPreview name={asset.name} selected={isSelected} url={asset.url} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{asset.name}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{asset.source} • {asset.size || '-'}</p>
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <AssetEmptyState label="thumbnail / gambar" />
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setters.setYoutubeSelectedThumbnailNames(campaignThumbnailAssets.map((asset) => asset.name))}
            disabled={campaignThumbnailAssets.length === 0}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Pilih Semua
          </button>
          <button
            type="button"
            onClick={() => setters.setYoutubeSelectedThumbnailNames([])}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-slate-700"
          >
            Reset
          </button>
        </div>
        <p className="mt-3 rounded-xl bg-slate-900 px-3 py-2 text-[11px] text-slate-400">
          {formatAssetRotation('Thumbnail', state.youtubeSelectedThumbnailNames.length)}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <button
          type="button"
          onClick={() => setters.setIsYoutubeEncoderOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-slate-900"
        >
          <div>
            <p className="text-sm font-bold text-white">Encoder YouTube</p>
            <p className="mt-1 text-xs text-slate-500">{formatManualEncoderSettings(state.youtubeEncoderMode, state.youtubeBitrate, state.youtubeFps, state.youtubeResolution)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">CPU ringan</span>
            <span className="text-lg font-bold text-slate-400">{state.isYoutubeEncoderOpen ? '⌃' : '⌄'}</span>
          </div>
        </button>
        {state.isYoutubeEncoderOpen ? (
          <div className="space-y-3 border-t border-slate-800 p-4">
            <label className="block text-xs font-semibold text-slate-400">
              Mode Encoder
              <select value={state.youtubeEncoderMode} onChange={(e) => updateEncoder(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500">
                <option>Stream Copy (CPU ringan)</option>
                <option>Re-encode Manual</option>
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-400">
                Resolusi
                <select value={state.youtubeResolution} onChange={(e) => updateResolution(e.target.value)} disabled={state.youtubeEncoderMode === 'Stream Copy (CPU ringan)'} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50">
                  <option>Ikuti sumber</option>
                  <option>720p HD</option>
                  <option>1080p Full HD</option>
                  <option>1440p 2K</option>
                  <option>2160p 4K</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-400">
                Bitrate
                <select disabled className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60">
                  <option>{state.youtubeBitrate}</option>
                </select>
              </label>
            </div>
            <label className="block text-xs font-semibold text-slate-400">
              FPS
              <select value={state.youtubeFps} onChange={(e) => setters.setYoutubeFps(e.target.value)} disabled={state.youtubeEncoderMode === 'Stream Copy (CPU ringan)'} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60">
                <option>Ikuti sumber</option>
                <option>24 FPS</option>
                <option>25 FPS</option>
                <option>30 FPS</option>
                <option>50 FPS</option>
                <option>60 FPS</option>
              </select>
            </label>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-cyan-500/10">
        <button type="button" onClick={() => setters.setIsYoutubeChatbotOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-cyan-500/5">
          <div>
            <p className="text-sm font-bold text-white">Chatbot Otomatis</p>
            <p className="mt-1 text-xs text-slate-400">{formatAutoChatbotSettings(state.youtubeChatbotEnabled, state.youtubeChatbotMode, state.youtubeChatbotInterval, state.youtubeChatbotMessages)}</p>
          </div>
          <span className="text-lg font-bold text-slate-300">{state.isYoutubeChatbotOpen ? '⌃' : '⌄'}</span>
        </button>
        {state.isYoutubeChatbotOpen ? (
          <div className="space-y-3 border-t border-cyan-500/20 p-4">
            <div className="flex justify-end">
              <label className="flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 ring-1 ring-slate-800">
                <input type="checkbox" checked={state.youtubeChatbotEnabled} onChange={(e) => setters.setYoutubeChatbotEnabled(e.target.checked)} />
                Aktif
              </label>
            </div>
            <div className={cx('space-y-3', !state.youtubeChatbotEnabled && 'opacity-40')}>
              <label className="block text-xs font-semibold text-slate-400">
                Mode Chatbot
                <select value={state.youtubeChatbotMode} onChange={(e) => setters.setYoutubeChatbotMode(e.target.value)} disabled={!state.youtubeChatbotEnabled} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white">
                  <option>Pesan berkala</option>
                  <option>Balas keyword</option>
                  <option>Sapaan penonton</option>
                  <option>Promosi subscribe</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-400">
                Interval Kirim Pesan
                <select value={state.youtubeChatbotInterval} onChange={(e) => setters.setYoutubeChatbotInterval(e.target.value)} disabled={!state.youtubeChatbotEnabled} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white">
                  <option value="5">Setiap 5 menit</option>
                  <option value="10">Setiap 10 menit</option>
                  <option value="15">Setiap 15 menit</option>
                  <option value="30">Setiap 30 menit</option>
                  <option value="60">Setiap 60 menit</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-400">
                Daftar Pesan Otomatis
                <textarea value={state.youtubeChatbotMessages} onChange={(e) => setters.setYoutubeChatbotMessages(e.target.value)} disabled={!state.youtubeChatbotEnabled} className="mt-2 min-h-28 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white" />
              </label>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-300">
                {countChatbotMessages(state.youtubeChatbotMessages)} pesan siap dikirim.
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <p className="text-sm font-bold text-white">FFmpeg Runner</p>
        <div className="mt-3 space-y-2 text-xs text-slate-400">
          <div className="flex justify-between"><span>Status</span><span className="text-emerald-300">Online</span></div>
          <div className="flex justify-between"><span>Mode</span><span className="text-cyan-300">YouTube API + RTMP</span></div>
          <div className="flex justify-between"><span>Loop Video</span><span className="text-emerald-300">Aktif</span></div>
        </div>
      </div>
      <Button className="w-full rounded-2xl bg-cyan-500 text-slate-950 hover:bg-cyan-400" onClick={saveCampaignDraft}>
        <Save className="mr-2 h-4 w-4" /> Simpan Draft Kampanye
      </Button>
    </div>
  );
}
