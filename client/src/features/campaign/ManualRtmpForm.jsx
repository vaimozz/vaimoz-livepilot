import { CalendarClock, Clock3, Users } from 'lucide-react';
import { cx } from '@/lib/cn.js';
import { getEncoderPresetByResolution } from '@/lib/campaignUtils.js';

export function ManualRtmpForm({ state, setters }) {
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
      <div className="grid gap-4 md:grid-cols-2"><label className="block text-xs font-semibold text-slate-400">Nama Kampanye<input className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500" placeholder="Contoh: Live Manual Facebook Page" /></label><label className="block text-xs font-semibold text-slate-400">Platform Tujuan<select className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"><option>YouTube Manual RTMP</option><option>Facebook Manual RTMP</option><option>Custom RTMP</option></select></label></div>
      <label className="block text-xs font-semibold text-slate-400">RTMP URL<input className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500" placeholder="rtmp://a.rtmp.youtube.com/live2" /></label>
      <label className="block text-xs font-semibold text-slate-400">Stream Key<input className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500" placeholder="Masukkan stream key dari dashboard platform" /><p className="mt-2 text-[11px] text-slate-500">Stream Key sebaiknya disimpan terenkripsi di backend.</p></label>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs font-semibold text-slate-400"><div className="mb-2 flex items-center gap-2"><CalendarClock className="h-4 w-4 text-cyan-300" />Jadwal Mulai</div><div className="grid gap-2 sm:grid-cols-2"><input type="date" value={state.manualStartDate} onChange={(e) => setters.setManualStartDate(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" /><input type="time" value={state.manualStartTime} onChange={(e) => setters.setManualStartTime(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" /></div><p className="mt-2 text-[11px] text-slate-500">Asia/Jakarta / WIB.</p></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs font-semibold text-slate-400"><div className="mb-2 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-300" />Berhenti Otomatis</div><label className="flex items-center gap-2 text-[11px] text-slate-300"><input type="checkbox" checked={state.autoStopEnabled} onChange={(e) => setters.setAutoStopEnabled(e.target.checked)} />Aktif</label></div><div className={cx('grid gap-2 sm:grid-cols-2', !state.autoStopEnabled && 'opacity-40')}><input type="date" value={state.manualStopDate} onChange={(e) => setters.setManualStopDate(e.target.value)} disabled={!state.autoStopEnabled} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" /><input type="time" value={state.manualStopTime} onChange={(e) => setters.setManualStopTime(e.target.value)} disabled={!state.autoStopEnabled} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" /></div></div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4"><div className="mb-3 flex items-start justify-between gap-3"><div><p className="font-bold text-white">Smart Stop</p><p className="text-[11px] text-slate-400">Tunda stop jika penonton ramai.</p></div><label className="flex items-center gap-2 text-[11px] text-slate-300"><input type="checkbox" checked={state.smartStopEnabled} onChange={(e) => setters.setSmartStopEnabled(e.target.checked)} />Aktif</label></div><div className={cx('grid gap-2 sm:grid-cols-2', !state.smartStopEnabled && 'opacity-40')}><input type="number" value={state.smartStopViewerThreshold} onChange={(e) => setters.setSmartStopViewerThreshold(e.target.value)} disabled={!state.smartStopEnabled} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" placeholder="Penonton >" /><select value={state.smartStopDelayMinutes} onChange={(e) => setters.setSmartStopDelayMinutes(e.target.value)} disabled={!state.smartStopEnabled} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none"><option value="5">5 menit</option><option value="15">15 menit</option><option value="30">30 menit</option><option value="60">60 menit</option><option value="120">2 jam</option></select></div></div>
      </div>
      <div className="grid gap-4 xl:grid-cols-4"><label className="text-xs font-semibold text-slate-400">Mode Encoder<select value={state.manualEncoderMode} onChange={(e) => updateEncoder(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white"><option>Stream Copy (CPU ringan)</option><option>Re-encode Manual</option></select></label><label className="text-xs font-semibold text-slate-400">Resolusi<select value={state.manualResolution} onChange={(e) => updateResolution(e.target.value)} disabled={state.manualEncoderMode === 'Stream Copy (CPU ringan)'} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white"><option>Ikuti sumber</option><option>720p HD</option><option>1080p Full HD</option><option>1440p 2K</option><option>2160p 4K</option></select></label><label className="text-xs font-semibold text-slate-400">Bitrate<select disabled className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white"><option>{state.manualBitrate}</option></select></label><label className="text-xs font-semibold text-slate-400">FPS<select value={state.manualFps} onChange={(e) => setters.setManualFps(e.target.value)} disabled={state.manualEncoderMode === 'Stream Copy (CPU ringan)'} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white"><option>Ikuti sumber</option><option>24 FPS</option><option>25 FPS</option><option>30 FPS</option><option>50 FPS</option><option>60 FPS</option></select></label></div>
    </div>
  );
}
