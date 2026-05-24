import { useRef, useState } from 'react';
import { Cloud, FileVideo, Image as ImageIcon, Loader2, Music2, RefreshCw, Save, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { GDriveModal } from '@/features/assets/GDriveModal.jsx';
import { api } from '@/lib/api.js';
import { cx } from '@/lib/cn.js';
import {
  countChatbotMessages,
  formatAssetRotation,
  formatAutoChatbotSettings,
  formatManualEncoderSettings,
  getEncoderPresetByResolution,
  toggleSelection,
} from '@/lib/campaignUtils.js';

// ─── Mini video preview card ──────────────────────────────────────────────────
function VideoCard({ asset, isSelected, onToggle }) {
  const videoRef = useRef(null);
  const key = String(asset.id || asset.name);

  return (
    <label
      className={cx(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border transition',
        isSelected
          ? 'border-cyan-400 bg-cyan-500/10 ring-1 ring-cyan-500/30'
          : 'border-slate-700 bg-slate-900 hover:border-slate-500'
      )}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggle(key)}
        className="sr-only"
      />

      {/* Preview area */}
      <div className="relative h-24 w-full overflow-hidden bg-slate-800">
        {asset.url ? (
          <video
            ref={videoRef}
            src={asset.url}
            className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
            muted
            playsInline
            preload="metadata"
            onMouseEnter={() => videoRef.current?.play()}
            onMouseLeave={() => {
              if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
              }
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FileVideo className="h-8 w-8 text-slate-600" />
          </div>
        )}
        {/* Gradient overlay bawah */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

        {/* Checkmark */}
        <div
          className={cx(
            'absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded border transition',
            isSelected
              ? 'border-cyan-400 bg-cyan-500 text-white shadow shadow-cyan-500/40'
              : 'border-slate-500 bg-black/40 text-transparent'
          )}
        >
          <span className="text-[10px] font-black leading-none">✓</span>
        </div>

        {/* Ukuran badge */}
        {asset.size && (
          <span className="absolute bottom-1.5 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-slate-300">
            {asset.size}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="px-2.5 py-2">
        <p className={cx('truncate text-[11px] font-bold', isSelected ? 'text-cyan-200' : 'text-slate-200')}>
          {asset.name}
        </p>
        <p className="mt-0.5 truncate text-[9px] text-slate-500">
          {asset.source || 'Lokal'}{asset.duration ? ` • ${asset.duration}` : ''}
        </p>
      </div>
    </label>
  );
}

// ─── Thumbnail picker card ────────────────────────────────────────────────────
function ThumbnailCard({ asset, isSelected, onToggle }) {
  const id = String(asset.id || asset.name);

  return (
    <label
      className={cx(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border transition',
        isSelected
          ? 'border-pink-400 bg-pink-500/10 ring-1 ring-pink-500/30'
          : 'border-slate-700 bg-slate-900 hover:border-slate-500'
      )}
    >
      <input type="checkbox" checked={isSelected} onChange={() => onToggle(id)} className="sr-only" />

      {/* Preview gambar — 16:9 */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <div className="absolute inset-0 bg-slate-800">
          {asset.url ? (
            <img
              src={asset.url}
              alt={asset.name}
              className="h-full w-full object-cover transition group-hover:scale-105"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageIcon className="h-7 w-7 text-slate-600" />
            </div>
          )}
          {/* Overlay gradient */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Checkmark pojok kanan atas */}
          <div
            className={cx(
              'absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded border-2 transition',
              isSelected
                ? 'border-pink-400 bg-pink-500 text-white shadow shadow-pink-500/50'
                : 'border-white/60 bg-black/30 text-transparent backdrop-blur-sm'
            )}
          >
            <span className="text-[10px] font-black leading-none">✓</span>
          </div>

          {/* Badge ukuran pojok kiri bawah */}
          {asset.size && (
            <span className="absolute bottom-1.5 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-slate-300">
              {asset.size}
            </span>
          )}
        </div>
      </div>

      {/* Nama file */}
      <div className="px-2.5 py-2">
        <p className={cx('truncate text-[11px] font-bold leading-tight', isSelected ? 'text-pink-200' : 'text-slate-200')}>
          {asset.name}
        </p>
        <p className="mt-0.5 truncate text-[9px] text-slate-500">{asset.source || 'Lokal'}</p>
      </div>
    </label>
  );
}

function AssetEmptyState({ label }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-4 py-8 text-center text-xs text-slate-400">
      Belum ada {label} dari SQLite. Upload dulu di{' '}
      <span className="font-bold text-cyan-300">Pustaka Aset</span>, lalu klik Refresh.
    </div>
  );
}

export function AssetSelectorPanel({
  state,
  setters,
  campaignVideoAssets,
  campaignThumbnailAssets,
  saveCampaignDraft,
  isLoadingAssets = false,
  onRefreshAssets,
  campaignId = null,
}) {
  const fileInputRef = useRef(null);
  const [showGdriveModal, setShowGdriveModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  // Upload lokal inline
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setIsUploading(true);
    setUploadMsg(`Mengupload ${files.length} file...`);
    try {
      await api.assets.upload(files);
      setUploadMsg(`${files.length} file berhasil diupload ke Pustaka Aset.`);
      onRefreshAssets?.();
    } catch (err) {
      setUploadMsg(`Upload gagal: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const selectedVideoIds = state.youtubeSelectedVideoNames; // field ini sekarang berisi id string
  const selectedThumbnailIds = state.youtubeSelectedThumbnailNames;

  const toggleVideo = (id) =>
    setters.setYoutubeSelectedVideoNames((items) => toggleSelection(items, id));
  const toggleThumbnail = (id) =>
    setters.setYoutubeSelectedThumbnailNames((items) => toggleSelection(items, id));

  const updateEncoder = (nextMode) => {
    setters.setYoutubeEncoderMode(nextMode);
    if (nextMode === 'Stream Copy (CPU ringan)') {
      setters.setYoutubeResolution('Ikuti sumber');
      setters.setYoutubeBitrate('Ikuti sumber');
      setters.setYoutubeFps('Ikuti sumber');
      return;
    }
    const defaultResolution =
      state.youtubeResolution === 'Ikuti sumber' ? '1080p Full HD' : state.youtubeResolution;
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
      {/* input file tersembunyi */}
      <input ref={fileInputRef} type="file" multiple accept="video/*,audio/*,image/*" className="hidden" onChange={handleFileChange} />

      {/* GDrive Modal */}
      {showGdriveModal && (
        <GDriveModal
          onClose={() => setShowGdriveModal(false)}
          onAssetAdded={(asset) => {
            setShowGdriveModal(false);
            setUploadMsg(`${asset.name} berhasil diunduh dari Google Drive.`);
            onRefreshAssets?.();
          }}
        />
      )}

      {/* Header info aset + tombol upload */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">Aset dari SQLite</p>
            <p className="mt-1 text-xs text-slate-500">
              {campaignVideoAssets.length} Video • {campaignThumbnailAssets.length} Thumbnail
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

        {/* Tombol upload inline */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-slate-200 transition hover:border-cyan-500/40 hover:bg-slate-800 disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 text-cyan-400" />}
            Upload Lokal
          </button>
          <button
            type="button"
            onClick={() => setShowGdriveModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-slate-200 transition hover:border-blue-500/40 hover:bg-slate-800"
          >
            <Cloud className="h-3.5 w-3.5 text-blue-400" />
            Google Drive
          </button>
        </div>

        {/* Pesan upload status */}
        {uploadMsg && (
          <p className="mt-2 text-[11px] text-emerald-400">{uploadMsg}</p>
        )}
      </div>

      {/* ── Sumber Video ──────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">Sumber Video</p>
            <p className="mt-1 text-xs text-slate-500">
              Pilih video dari Pustaka Aset. Server memutar secara acak saat live dimulai.
            </p>
          </div>
          <span className="flex-shrink-0 rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold text-cyan-300">
            {selectedVideoIds.length} dipilih
          </span>
        </div>

        {isLoadingAssets ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-8 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat video dari SQLite...
          </div>
        ) : campaignVideoAssets.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {campaignVideoAssets.map((asset) => {
              const id = String(asset.id || asset.name);
              return (
                <VideoCard
                  key={id}
                  asset={asset}
                  isSelected={selectedVideoIds.includes(id)}
                  onToggle={toggleVideo}
                />
              );
            })}
          </div>
        ) : (
          <AssetEmptyState label="video" />
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setters.setYoutubeSelectedVideoNames(
                campaignVideoAssets.map((a) => String(a.id || a.name))
              )
            }
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
          {formatAssetRotation('Video', selectedVideoIds.length)}
        </p>
      </div>

      {/* ── Thumbnail ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">Thumbnail</p>
            <p className="mt-1 text-xs text-slate-500">
              Pilih thumbnail dari Pustaka Aset untuk rotasi acak saat live dibuat.
            </p>
          </div>
          <span className="flex-shrink-0 rounded-full bg-pink-500/10 px-2.5 py-1 text-[10px] font-bold text-pink-300">
            {selectedThumbnailIds.length} dipilih
          </span>
        </div>

        {isLoadingAssets ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-8 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat thumbnail dari SQLite...
          </div>
        ) : campaignThumbnailAssets.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
            {campaignThumbnailAssets.map((asset) => {
              const id = String(asset.id || asset.name);
              return (
                <ThumbnailCard
                  key={id}
                  asset={asset}
                  isSelected={selectedThumbnailIds.includes(id)}
                  onToggle={toggleThumbnail}
                />
              );
            })}
          </div>
        ) : (
          <AssetEmptyState label="thumbnail / gambar" />
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setters.setYoutubeSelectedThumbnailNames(
                campaignThumbnailAssets.map((a) => String(a.id || a.name))
              )
            }
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
          {formatAssetRotation('Thumbnail', selectedThumbnailIds.length)}
        </p>
      </div>

          </div>
  );
}

export function EncoderPanel({ state, setters, saveCampaignDraft }) {
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
      {/* ── Encoder YouTube ───────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <button
          type="button"
          onClick={() => setters.setIsYoutubeEncoderOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-slate-900"
        >
          <div>
            <p className="text-sm font-bold text-white">Encoder YouTube</p>
            <p className="mt-1 text-xs text-slate-500">
              {formatManualEncoderSettings(
                state.youtubeEncoderMode,
                state.youtubeBitrate,
                state.youtubeFps,
                state.youtubeResolution
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
              CPU ringan
            </span>
            <span className="text-lg font-bold text-slate-400">
              {state.isYoutubeEncoderOpen ? '⌃' : '⌄'}
            </span>
          </div>
        </button>
        {state.isYoutubeEncoderOpen && (
          <div className="space-y-3 border-t border-slate-800 p-4">
            <label className="block text-xs font-semibold text-slate-400">
              Mode Encoder
              <select
                value={state.youtubeEncoderMode}
                onChange={(e) => updateEncoder(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
              >
                <option>Stream Copy (CPU ringan)</option>
                <option>Re-encode Manual</option>
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-400">
                Resolusi
                <select
                  value={state.youtubeResolution}
                  onChange={(e) => updateResolution(e.target.value)}
                  disabled={state.youtubeEncoderMode === 'Stream Copy (CPU ringan)'}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option>Ikuti sumber</option>
                  <option>720p HD</option>
                  <option>1080p Full HD</option>
                  <option>1440p 2K</option>
                  <option>2160p 4K</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-400">
                Bitrate
                <select
                  disabled
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option>{state.youtubeBitrate}</option>
                </select>
              </label>
            </div>
            <label className="block text-xs font-semibold text-slate-400">
              FPS
              <select
                value={state.youtubeFps}
                onChange={(e) => setters.setYoutubeFps(e.target.value)}
                disabled={state.youtubeEncoderMode === 'Stream Copy (CPU ringan)'}
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option>Ikuti sumber</option>
                <option>24 FPS</option>
                <option>25 FPS</option>
                <option>30 FPS</option>
                <option>50 FPS</option>
                <option>60 FPS</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {/* ── Chatbot Otomatis ──────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-cyan-500/10">
        <button
          type="button"
          onClick={() => setters.setIsYoutubeChatbotOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-cyan-500/5"
        >
          <div>
            <p className="text-sm font-bold text-white">Chatbot Otomatis</p>
            <p className="mt-1 text-xs text-slate-400">
              {formatAutoChatbotSettings(
                state.youtubeChatbotEnabled,
                state.youtubeChatbotMode,
                state.youtubeChatbotInterval,
                state.youtubeChatbotMessages
              )}
            </p>
          </div>
          <span className="text-lg font-bold text-slate-300">
            {state.isYoutubeChatbotOpen ? '⌃' : '⌄'}
          </span>
        </button>
        {state.isYoutubeChatbotOpen && (
          <div className="space-y-3 border-t border-cyan-500/20 p-4">
            <div className="flex justify-end">
              <label className="flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 ring-1 ring-slate-800">
                <input
                  type="checkbox"
                  checked={state.youtubeChatbotEnabled}
                  onChange={(e) => setters.setYoutubeChatbotEnabled(e.target.checked)}
                />
                Aktif
              </label>
            </div>
            <div className={cx('space-y-3', !state.youtubeChatbotEnabled && 'opacity-40')}>
              <label className="block text-xs font-semibold text-slate-400">
                Mode Chatbot
                <select
                  value={state.youtubeChatbotMode}
                  onChange={(e) => setters.setYoutubeChatbotMode(e.target.value)}
                  disabled={!state.youtubeChatbotEnabled}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white"
                >
                  <option>Pesan berkala</option>
                  <option>Pesan terjadwal (Jam tertentu)</option>
                  <option>Balas keyword</option>
                  <option>Sapaan penonton</option>
                  <option>Promosi subscribe</option>
                </select>
              </label>
              {state.youtubeChatbotMode !== 'Pesan terjadwal (Jam tertentu)' && (
                <label className="block text-xs font-semibold text-slate-400">
                  Interval Kirim Pesan
                  <select
                    value={state.youtubeChatbotInterval}
                    onChange={(e) => setters.setYoutubeChatbotInterval(e.target.value)}
                    disabled={!state.youtubeChatbotEnabled}
                    className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white"
                  >
                    <option value="5">Setiap 5 menit</option>
                    <option value="10">Setiap 10 menit</option>
                    <option value="15">Setiap 15 menit</option>
                    <option value="30">Setiap 30 menit</option>
                    <option value="60">Setiap 60 menit</option>
                  </select>
                </label>
              )}
              <label className="block text-xs font-semibold text-slate-400">
                Daftar Pesan Otomatis
                {state.youtubeChatbotMode === 'Pesan terjadwal (Jam tertentu)' && (
                  <span className="block mt-1 font-normal text-cyan-400">
                    Format: HH:MM | Pesan Anda (contoh: 19:30 | Selamat datang di live stream!)
                  </span>
                )}
                <textarea
                  value={state.youtubeChatbotMessages}
                  onChange={(e) => setters.setYoutubeChatbotMessages(e.target.value)}
                  disabled={!state.youtubeChatbotEnabled}
                  className="mt-2 min-h-28 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white"
                />
              </label>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-300">
                {countChatbotMessages(state.youtubeChatbotMessages)} pesan siap dikirim.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── FFmpeg Runner info ────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <p className="text-sm font-bold text-white">FFmpeg Runner</p>
        <div className="mt-3 space-y-2 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Status</span>
            <span className="text-emerald-300">Online</span>
          </div>
          <div className="flex justify-between">
            <span>Mode</span>
            <span className="text-cyan-300">YouTube API + RTMP</span>
          </div>
          <div className="flex justify-between">
            <span>Loop Video</span>
            <span className="text-emerald-300">Aktif</span>
          </div>
        </div>
      </div>

      <Button
        className="w-full rounded-2xl bg-cyan-500 text-slate-950 hover:bg-cyan-400"
        onClick={saveCampaignDraft}
      >
        <Save className="mr-2 h-4 w-4" /> Simpan Draft Kampanye
      </Button>
    </div>
  );
}
