import { CalendarClock, Clock3, Loader2, Play, Square, Video, Image } from 'lucide-react';
import { cx } from '@/lib/cn.js';
import { getEncoderPresetByResolution } from '@/lib/campaignUtils.js';

export function ManualRtmpForm({ state, setters, onSaveDraft, onStartLive, onStopLive, isSaving, isStarting, isLive, streamInfo }) {
  const updateEncoder = (nextMode) => {
    setters.setManualEncoderMode(nextMode);
    if (nextMode === 'Stream Copy (CPU ringan)') {
      setters.setManualResolution('Ikuti sumber');
      setters.setManualBitrate('Ikuti sumber');
      setters.setManualFps('Ikuti sumber');
      return;
    }
    const defaultResolution = state.manualResolution === 'Ikuti sumber' ? '1080p Full HD' : state.manualResolution;
    const preset = getEncoderPresetByResolution(defaultResolution);
    setters.setManualResolution(defaultResolution);
    setters.setManualBitrate(preset.bitrate);
    setters.setManualFps(preset.fps);
  };

  const updateResolution = (nextResolution) => {
    const preset = getEncoderPresetByResolution(nextResolution);
    setters.setManualResolution(nextResolution);
    setters.setManualBitrate(preset.bitrate);
    setters.setManualFps(preset.fps);
  };

  return (
    <div className="space-y-5">

      {/* ── Status Live Banner ──────────────────────────────────────────────── */}
      {isLive && streamInfo && (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-sm font-bold text-emerald-300">🔴 LIVE BERJALAN</span>
          </div>
          {streamInfo.chosenTitle && (
            <p className="text-xs font-semibold text-white">📌 {streamInfo.chosenTitle}</p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {streamInfo.chosenVideo && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
                <Video className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{streamInfo.chosenVideo.name}</span>
              </div>
            )}
            {streamInfo.chosenThumbnail && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
                <Image className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span className="truncate">{streamInfo.chosenThumbnail.name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nama & Platform */}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-400">
          Nama Kampanye
          <input
            className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
            placeholder="Contoh: Live Manual Facebook Page"
            value={state.manualCampaignName || ''}
            onChange={(e) => setters.setManualCampaignName?.(e.target.value)}
            disabled={isLive}
          />
        </label>
        <label className="block text-xs font-semibold text-slate-400">
          Platform Tujuan
          <select
            className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
            value={state.manualPlatform || 'YouTube Manual RTMP'}
            onChange={(e) => setters.setManualPlatform?.(e.target.value)}
            disabled={isLive}
          >
            <option>YouTube Manual RTMP</option>
            <option>Facebook Manual RTMP</option>
            <option>Custom RTMP</option>
          </select>
        </label>
      </div>

      {/* RTMP URL */}
      <label className="block text-xs font-semibold text-slate-400">
        RTMP URL
        <input
          className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
          placeholder="rtmp://a.rtmp.youtube.com/live2"
          value={state.manualRtmpUrl || ''}
          onChange={(e) => setters.setManualRtmpUrl?.(e.target.value)}
          disabled={isLive}
        />
      </label>

      {/* Stream Key */}
      <label className="block text-xs font-semibold text-slate-400">
        Stream Key
        <input
          type="password"
          className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
          placeholder="Masukkan stream key dari dashboard platform"
          value={state.manualStreamKey || ''}
          onChange={(e) => setters.setManualStreamKey?.(e.target.value)}
          disabled={isLive}
        />
        <p className="mt-2 text-[11px] text-slate-500">Stream Key tersimpan di config campaign SQLite.</p>
      </label>

      {/* Jadwal */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs font-semibold text-slate-400">
          <div className="mb-2 flex items-center gap-2"><CalendarClock className="h-4 w-4 text-cyan-300" />Jadwal Mulai</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input type="date" value={state.manualStartDate} onChange={(e) => setters.setManualStartDate(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" disabled={isLive} />
            <input type="time" value={state.manualStartTime} onChange={(e) => setters.setManualStartTime(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" disabled={isLive} />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Asia/Jakarta / WIB.</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs font-semibold text-slate-400">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-300" />Berhenti Otomatis</div>
            <label className="flex items-center gap-2 text-[11px] text-slate-300">
              <input type="checkbox" checked={state.autoStopEnabled} onChange={(e) => setters.setAutoStopEnabled(e.target.checked)} disabled={isLive} />Aktif
            </label>
          </div>
          <div className={cx('grid gap-2 sm:grid-cols-2', !state.autoStopEnabled && 'opacity-40')}>
            <input type="date" value={state.manualStopDate} onChange={(e) => setters.setManualStopDate(e.target.value)} disabled={!state.autoStopEnabled || isLive} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
            <input type="time" value={state.manualStopTime} onChange={(e) => setters.setManualStopTime(e.target.value)} disabled={!state.autoStopEnabled || isLive} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><p className="font-bold text-white">Smart Stop</p><p className="text-[11px] text-slate-400">Tunda stop jika penonton ramai.</p></div>
            <label className="flex items-center gap-2 text-[11px] text-slate-300"><input type="checkbox" checked={state.smartStopEnabled} onChange={(e) => setters.setSmartStopEnabled(e.target.checked)} disabled={isLive} />Aktif</label>
          </div>
          <div className={cx('grid gap-2 sm:grid-cols-2', !state.smartStopEnabled && 'opacity-40')}>
            <input type="number" value={state.smartStopViewerThreshold} onChange={(e) => setters.setSmartStopViewerThreshold(e.target.value)} disabled={!state.smartStopEnabled || isLive} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" placeholder="Penonton >" />
            <select value={state.smartStopDelayMinutes} onChange={(e) => setters.setSmartStopDelayMinutes(e.target.value)} disabled={!state.smartStopEnabled || isLive} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
              <option value="5">5 menit</option><option value="15">15 menit</option><option value="30">30 menit</option><option value="60">60 menit</option><option value="120">2 jam</option>
            </select>
          </div>
        </div>
      </div>

      {/* Encoder */}
      <div className="grid gap-4 xl:grid-cols-4">
        <label className="text-xs font-semibold text-slate-400">Mode Encoder<select value={state.manualEncoderMode} onChange={(e) => updateEncoder(e.target.value)} disabled={isLive} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white"><option>Stream Copy (CPU ringan)</option><option>Re-encode Manual</option></select></label>
        <label className="text-xs font-semibold text-slate-400">Resolusi<select value={state.manualResolution} onChange={(e) => updateResolution(e.target.value)} disabled={state.manualEncoderMode === 'Stream Copy (CPU ringan)' || isLive} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white"><option>Ikuti sumber</option><option>720p HD</option><option>1080p Full HD</option><option>1440p 2K</option><option>2160p 4K</option></select></label>
        <label className="text-xs font-semibold text-slate-400">Bitrate<select disabled className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white"><option>{state.manualBitrate}</option></select></label>
        <label className="text-xs font-semibold text-slate-400">FPS<select value={state.manualFps} onChange={(e) => setters.setManualFps(e.target.value)} disabled={state.manualEncoderMode === 'Stream Copy (CPU ringan)' || isLive} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white"><option>Ikuti sumber</option><option>24 FPS</option><option>25 FPS</option><option>30 FPS</option><option>50 FPS</option><option>60 FPS</option></select></label>
      </div>

      {/* Aksi */}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-5">
        {!isLive && (
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : '💾'} Simpan Draft
          </button>
        )}

        {isLive ? (
          <button
            type="button"
            onClick={onStopLive}
            className="flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500"
          >
            <Square className="h-4 w-4 fill-white" />
            Stop Live
          </button>
        ) : (
          <button
            type="button"
            onClick={onStartLive}
            disabled={isStarting || !state.manualRtmpUrl?.trim()}
            className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {isStarting ? 'Menghubungkan FFmpeg...' : 'Mulai Live Sekarang'}
          </button>
        )}

        {!isLive && !state.manualRtmpUrl?.trim() && (
          <p className="text-[11px] text-amber-400">⚠ Isi RTMP URL terlebih dahulu untuk mulai live.</p>
        )}
      </div>
    </div>
  );
}
