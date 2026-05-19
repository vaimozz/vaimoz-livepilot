import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { cx } from '@/lib/cn.js';
import { getStreamingRows } from '@/lib/dashboardUtils.js';
import { StreamPreview } from '@/components/shared/Previews.jsx';
import { api } from '@/lib/api.js';

export function CampaignTable({ visibleCampaigns, selectedPlatform, onRefresh }) {
  const streamingRows = getStreamingRows(visibleCampaigns, selectedPlatform);
  const [actionLoading, setActionLoading] = useState({}); // { [rowId]: true }
  const [actionMsg, setActionMsg] = useState('');

  const handleStart = async (row) => {
    const rtmpUrl = row.rtmpUrl || row.config?.rtmpUrl || '';
    const streamKey = row.config?.streamKey || '';
    if (!rtmpUrl) {
      setActionMsg(`⚠ ${row.name}: RTMP URL tidak ditemukan di config kampanye.`);
      return;
    }
    setActionLoading((prev) => ({ ...prev, [row.rowId]: true }));
    setActionMsg(`Memulai stream untuk ${row.name}...`);
    try {
      const result = await api.streams.startCampaign(row.id, { rtmpUrl, streamKey });
      setActionMsg(`🔴 ${row.name} dimulai! Video: ${result.chosenVideo?.name || '-'} (PID ${result.pid || '-'})`);
      onRefresh?.();
    } catch (err) {
      setActionMsg(`Gagal start ${row.name}: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [row.rowId]: false }));
    }
  };

  const handleStop = async (row) => {
    if (!row.streamId) {
      setActionMsg(`⚠ ${row.name}: Tidak ada stream aktif yang ditemukan.`);
      return;
    }
    setActionLoading((prev) => ({ ...prev, [row.rowId]: true }));
    setActionMsg(`Menghentikan stream ${row.name}...`);
    try {
      await api.streams.stop(row.streamId);
      setActionMsg(`⬛ ${row.name} berhasil dihentikan.`);
      onRefresh?.();
    } catch (err) {
      setActionMsg(`Gagal stop ${row.name}: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [row.rowId]: false }));
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus kampanye "${row.name}"?`)) return;
    try {
      await api.campaigns.remove(row.id);
      setActionMsg(`${row.name} dihapus dari SQLite.`);
      onRefresh?.();
    } catch (err) {
      setActionMsg(`Gagal hapus: ${err.message}`);
    }
  };

  return (
    <div className="space-y-3">
      {actionMsg && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs text-slate-300">
          {actionMsg}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
        <div className="overflow-x-auto">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-12 border-b border-slate-800 bg-slate-900 px-7 py-4 text-[12px] font-semibold uppercase tracking-wide text-slate-300">
              <div className="col-span-4">Stream Name</div>
              <div className="col-span-1">Dashboard</div>
              <div className="col-span-1">Platform</div>
              <div className="col-span-2">Schedule</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            <div className="divide-y divide-slate-800">
              {streamingRows.length === 0 ? (
                <div className="flex min-h-40 items-center justify-center text-center text-sm text-slate-500">
                  Belum ada streaming/campaign. Buat campaign baru di menu Kampanye Live.
                </div>
              ) : null}
              {streamingRows.map((row) => {
                const isOnline = row.status === 'Sedang Live' || row.status === 'Online';
                const isLoading = actionLoading[row.rowId];
                const streamTitle = row.name;
                const streamMeta = `${row.niche} • ${row.video}`;
                const isYouTube = row.platform === 'YouTube';
                const platformIconClass = isYouTube ? 'border-red-500 text-red-400' : 'border-blue-500 text-blue-400';
                const channelAvatarClass = isYouTube ? 'bg-orange-600' : 'bg-blue-600';
                return (
                  <div key={row.rowId} className="grid grid-cols-12 items-center px-7 py-5 text-sm transition hover:bg-slate-800/70">
                    <div className="col-span-4">
                      <div className="flex items-center gap-4">
                        <StreamPreview title={streamTitle} platform={row.platform} isOnline={isOnline} />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">{streamTitle}</p>
                          <div className="mt-1 flex min-w-0 items-center gap-2">
                            <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white', channelAvatarClass)}>
                              {row.channelInitial}
                            </span>
                            <span className="truncate text-xs font-semibold text-slate-300">{row.channel}</span>
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-400">{streamMeta}</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="flex items-center gap-2 font-semibold text-white">
                        <span className={cx('flex h-5 w-5 items-center justify-center rounded-full border text-[10px]', platformIconClass)}>
                          {isYouTube ? '◎' : 'f'}
                        </span>
                        <span className="truncate">{row.dashboard}</span>
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="flex items-center gap-2 font-semibold text-white">
                        <span className={cx('flex h-4 w-4 items-center justify-center rounded border text-[9px]', platformIconClass)}>
                          {isYouTube ? '▶' : 'f'}
                        </span>
                        <span>{row.platform}</span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold text-slate-200">{row.scheduleInfo.label}</p>
                        <p className="text-slate-400">{row.scheduleInfo.time}</p>
                        <p className="text-[11px] text-slate-500">{row.scheduleInfo.timezone}</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="space-y-2">
                        <span className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs', isOnline ? 'bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20' : 'bg-slate-800 text-slate-300 ring-1 ring-white/5')}>
                          <span className={cx('h-2 w-2 rounded-full', isOnline ? 'bg-emerald-400' : 'bg-slate-400')} />
                          {isOnline ? 'Online' : row.status || 'Draft'}
                        </span>
                        {isOnline ? (
                          <div className="space-y-1 text-[11px] text-slate-400">
                            <div className="flex justify-between"><span>Mulai</span><span className="font-semibold text-slate-200">{row.startedAt}</span></div>
                            <div className="flex justify-between"><span>Server</span><span className="font-semibold text-emerald-300">{row.serverCondition}</span></div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500">Belum berjalan</div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => isOnline ? handleStop(row) : handleStart(row)}
                        className={cx(
                          'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50',
                          isOnline ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
                        )}
                      >
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {isOnline ? 'Stop' : 'Start'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="text-slate-400 transition hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
