import { useState } from 'react';
import { Loader2, Trash2, Edit } from 'lucide-react';
import { cx } from '@/lib/cn.js';
import { getStreamingRows } from '@/lib/dashboardUtils.js';
import { StreamPreview } from '@/components/shared/Previews.jsx';
import { api } from '@/lib/api.js';

export function CampaignTable({ streamingRows, onRefresh, onEdit, viewMode = 'list', groupByChannel = false }) {
  const [actionLoading, setActionLoading] = useState({}); // { [rowId]: true }
  const [actionMsg, setActionMsg] = useState('');

  const handleStart = async (row) => {
    setActionLoading((prev) => ({ ...prev, [row.rowId]: true }));
    setActionMsg(`Memulai stream untuk ${row.name}...`);
    try {
      const mode = row.niche; // mode is mapped to niche in dashboardUtils.js
      let result;
      
      if (mode === 'YouTube API') {
        result = await api.campaigns.startYoutubeLive(row.id);
      } else {
        const rtmpUrl = row.rtmpUrl || row.config?.rtmpUrl || '';
        const streamKey = row.config?.streamKey || '';
        if (!rtmpUrl) {
          setActionMsg(`⚠ ${row.name}: RTMP URL tidak ditemukan di config kampanye.`);
          setActionLoading((prev) => ({ ...prev, [row.rowId]: false }));
          return;
        }
        result = await api.campaigns.start(row.id, { rtmpUrl, streamKey });
      }
      
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

  const groups = groupByChannel 
    ? streamingRows.reduce((acc, row) => {
        const channel = row.channel || 'Tanpa Channel';
        if (!acc[channel]) acc[channel] = [];
        acc[channel].push(row);
        return acc;
      }, {})
    : { 'Semua Kampanye': streamingRows };

  if (viewMode === 'grid') {
    return (
      <div className="space-y-6">
        {actionMsg && (
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs text-slate-300">
            {actionMsg}
          </div>
        )}
        {Object.entries(groups).map(([groupName, rows]) => (
          <div key={groupName} className="space-y-3">
            {groupByChannel && (
              <h3 className="text-sm font-bold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                <span>{groupName}</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">{rows.length}</span>
              </h3>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rows.length === 0 && !groupByChannel ? (
            <div className="col-span-full flex min-h-40 items-center justify-center text-center text-sm text-slate-500 border border-slate-800 rounded-2xl">
              Belum ada streaming/campaign. Buat campaign baru di menu Kampanye Live.
            </div>
          ) : null}
          {rows.map((row) => {
            const isOnline = row.status === 'Sedang Live' || row.status === 'Online' || row.status === 'Aktif';
            const isReconnecting = row.status === 'Reconnecting';
            const isError = row.status === 'Error';
            const isLoading = actionLoading[row.rowId];
            const streamTitle = row.name;
            const isYouTube = row.platform === 'YouTube';
            const platformIconClass = isYouTube ? 'border-red-500 text-red-400' : 'border-blue-500 text-blue-400';

            return (
              <div key={row.rowId} className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl transition hover:bg-slate-800/60">
                <div className="relative h-36 w-full shrink-0">
                  {row.thumbnailUrl ? (
                    <img src={row.thumbnailUrl} alt={streamTitle} className="h-full w-full object-cover" />
                  ) : (
                    <div className={cx('absolute inset-0 bg-gradient-to-br', isYouTube ? 'from-red-500/30 to-slate-950' : 'from-blue-500/30 to-slate-950')} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  {isOnline && <div className="absolute left-3 top-3 rounded bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">LIVE</div>}
                  <div className={cx('absolute right-3 top-3 rounded px-2 py-0.5 text-[10px] font-bold text-white shadow-lg', platformIconClass, 'border bg-slate-900/80')}>{isYouTube ? '▶ YT' : 'f FB'}</div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="line-clamp-2 text-sm font-bold text-white" title={streamTitle}>{streamTitle}</p>
                  <p className="mt-1 truncate text-xs text-slate-400">{row.channel}</p>
                  
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{row.scheduleInfo.label}</span>
                    <span className={cx('font-semibold', isOnline ? 'text-emerald-400' : isError ? 'text-red-400' : 'text-slate-500')}>{isOnline ? 'Online' : row.status}</span>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-3">
                    <button onClick={() => isOnline ? handleStop(row) : handleStart(row)} disabled={isLoading} className={cx('flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-white transition disabled:opacity-50', isOnline ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500')}>
                      {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {isOnline ? 'Stop' : 'Start'}
                    </button>
                    <button onClick={() => onEdit && onEdit(row)} className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:text-cyan-400"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(row)} className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (viewMode === 'detail') {
    return (
      <div className="space-y-6">
        {actionMsg && (
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs text-slate-300">
            {actionMsg}
          </div>
        )}
        {Object.entries(groups).map(([groupName, rows]) => (
          <div key={groupName} className="space-y-3">
            {groupByChannel && (
              <h3 className="text-sm font-bold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                <span>{groupName}</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">{rows.length}</span>
              </h3>
            )}
            <div className="grid gap-4">
              {rows.length === 0 && !groupByChannel ? (
            <div className="flex min-h-40 items-center justify-center text-center text-sm text-slate-500 border border-slate-800 rounded-2xl">
              Belum ada streaming/campaign. Buat campaign baru di menu Kampanye Live.
            </div>
          ) : null}
          {rows.map((row) => {
            const isOnline = row.status === 'Sedang Live' || row.status === 'Online' || row.status === 'Aktif';
            const isReconnecting = row.status === 'Reconnecting';
            const isError = row.status === 'Error';
            const isLoading = actionLoading[row.rowId];
            const streamTitle = row.name;
            const isYouTube = row.platform === 'YouTube';
            const channelAvatarClass = isYouTube ? 'bg-orange-600' : 'bg-blue-600';

            return (
              <div key={row.rowId} className="flex flex-col sm:flex-row overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl transition hover:bg-slate-800/60">
                <div className="relative h-48 sm:w-72 shrink-0">
                  {row.thumbnailUrl ? (
                    <img src={row.thumbnailUrl} alt={streamTitle} className="h-full w-full object-cover" />
                  ) : (
                    <div className={cx('absolute inset-0 bg-gradient-to-br', isYouTube ? 'from-red-500/30 to-slate-950' : 'from-blue-500/30 to-slate-950')} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  {isOnline && <div className="absolute left-3 top-3 rounded bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">LIVE</div>}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-base font-bold text-white line-clamp-2">{streamTitle}</h4>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={cx('flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white', channelAvatarClass)}>{row.channelInitial}</span>
                        <span className="text-sm font-semibold text-slate-300">{row.channel}</span>
                        <span className="text-sm text-slate-500">• {row.platform}</span>
                      </div>
                    </div>
                    <span className={cx('shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1', isOnline ? 'bg-emerald-400/10 text-emerald-400 ring-emerald-400/20' : isError ? 'bg-red-500/10 text-red-400 ring-red-500/20' : 'bg-slate-800 text-slate-300 ring-white/5')}>{isOnline ? 'Online' : row.status}</span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4 text-xs text-slate-400 sm:grid-cols-4">
                    <div><p className="font-semibold text-slate-200">Jadwal</p><p className="mt-0.5">{row.scheduleInfo.label} {row.scheduleInfo.time}</p></div>
                    <div><p className="font-semibold text-slate-200">Mode</p><p className="mt-0.5">{row.niche}</p></div>
                    <div><p className="font-semibold text-slate-200">Video Asset</p><p className="mt-0.5 truncate" title={row.video}>{row.video}</p></div>
                    <div><p className="font-semibold text-slate-200">Waktu Live</p><p className="mt-0.5">{isOnline ? `${row.startedAt} - ${row.stopAt}` : '--'}</p></div>
                  </div>

                  <div className="mt-auto flex items-center gap-3 pt-5 border-t border-slate-800">
                    <button onClick={() => isOnline ? handleStop(row) : handleStart(row)} disabled={isLoading} className={cx('flex items-center justify-center gap-2 rounded-xl px-6 py-2 text-sm font-semibold text-white transition disabled:opacity-50', isOnline ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500')}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {isOnline ? 'Stop Stream' : 'Start Stream'}
                    </button>
                    <button onClick={() => onEdit && onEdit(row)} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:text-cyan-400"><Edit className="h-4 w-4" /> Edit</button>
                    <button onClick={() => handleDelete(row)} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:text-red-400"><Trash2 className="h-4 w-4" /> Hapus</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actionMsg && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs text-slate-300">
          {actionMsg}
        </div>
      )}
      
      {Object.entries(groups).map(([groupName, rows]) => (
        <div key={groupName} className="space-y-3">
          {groupByChannel && (
            <h3 className="text-sm font-bold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-2">
              <span>{groupName}</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">{rows.length}</span>
            </h3>
          )}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
        <div className="overflow-x-auto">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-12 border-b border-slate-800 bg-slate-900 px-7 py-4 text-[12px] font-semibold uppercase tracking-wide text-slate-300">
              <div className="col-span-4">Stream Name</div>
              <div className="col-span-2">Platform</div>
              <div className="col-span-2">Schedule</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
              <div className="divide-y divide-slate-800">
                {rows.length === 0 && !groupByChannel ? (
                  <div className="flex min-h-40 items-center justify-center text-center text-sm text-slate-500">
                    Belum ada streaming/campaign. Buat campaign baru di menu Kampanye Live.
                  </div>
                ) : null}
                {rows.map((row) => {
                const isOnline = row.status === 'Sedang Live' || row.status === 'Online' || row.status === 'Aktif';
                const isReconnecting = row.status === 'Reconnecting';
                const isError = row.status === 'Error';
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
                        <StreamPreview title={streamTitle} platform={row.platform} isOnline={isOnline} thumbnailUrl={row.thumbnailUrl} />
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
                    <div className="col-span-2">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 font-semibold text-white">
                          <span className={cx('flex h-4 w-4 items-center justify-center rounded border text-[9px]', platformIconClass)}>
                            {isYouTube ? '▶' : 'f'}
                          </span>
                          <span>{row.platform}</span>
                        </div>
                        {isYouTube ? (
                          <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[11px] font-medium text-slate-400 transition hover:text-red-400">
                            <span>Buka {row.dashboard}</span>
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </a>
                        ) : (
                          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
                            <span>Buka {row.dashboard}</span>
                          </div>
                        )}
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
                        <div className="flex items-center gap-2">
                          <span className={cx(
                            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs',
                            isOnline ? 'bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20'
                            : isReconnecting ? 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20 animate-pulse'
                            : isError ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
                            : 'bg-slate-800 text-slate-300 ring-1 ring-white/5'
                          )}>
                            <span className={cx(
                              'h-2 w-2 rounded-full',
                              isOnline ? 'bg-emerald-400'
                              : isReconnecting ? 'bg-amber-400'
                              : isError ? 'bg-red-500'
                              : 'bg-slate-400'
                            )} />
                            {isOnline ? 'Online' : row.status || 'Draft'}
                          </span>
                          {isOnline && isYouTube && (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400" title="Penonton Aktif">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              {row.viewers}
                            </span>
                          )}
                        </div>
                        {isOnline ? (
                          <div className="space-y-1 text-[11px] text-slate-400">
                            <div className="flex justify-between"><span>Mulai</span><span className="font-semibold text-slate-200">{row.startedAt}</span></div>
                            <div className="flex justify-between"><span>Selesai</span><span className="font-semibold text-slate-200">{row.stopAt}</span></div>
                          </div>
                        ) : isReconnecting ? (
                          <div className="text-[11px] text-amber-500/70">Mencoba kembali...</div>
                        ) : isError ? (
                          <div className="text-[11px] text-red-500/70">Terjadi kesalahan</div>
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
                        onClick={() => onEdit && onEdit(row)}
                        title="Edit Kampanye"
                        className="text-slate-400 transition hover:text-cyan-400"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        title="Hapus Kampanye"
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
      ))}
    </div>
  );
}
