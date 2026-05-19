import { Trash2 } from 'lucide-react';
import { cx } from '@/lib/cn.js';
import { getStreamingRows } from '@/lib/dashboardUtils.js';
import { StreamPreview } from '@/components/shared/Previews.jsx';

export function CampaignTable({ visibleCampaigns, selectedPlatform }) {
  const streamingRows = getStreamingRows(visibleCampaigns, selectedPlatform);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
      <div className="overflow-x-auto">
        <div className="min-w-[1080px]">
          <div className="grid grid-cols-12 border-b border-slate-800 bg-slate-900 px-7 py-4 text-[12px] font-semibold uppercase tracking-wide text-slate-300">
            <div className="col-span-4">Stream Name</div><div className="col-span-1">Dashboard</div><div className="col-span-1">Platform</div><div className="col-span-2">Schedule</div><div className="col-span-2">Status</div><div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y divide-slate-800">
            {streamingRows.length === 0 ? (
              <div className="flex min-h-40 items-center justify-center text-center text-sm text-slate-500">Belum ada streaming/campaign. Buat campaign baru di menu Kampanye Live.</div>
            ) : null}
            {streamingRows.map((row) => {
              const isOnline = row.status === 'Sedang Live';
              const streamTitle = row.name;
              const streamMeta = `${row.niche} • ${row.video}`;
              const isYouTube = row.platform === 'YouTube';
              const platformIconClass = isYouTube ? 'border-red-500 text-red-400' : 'border-blue-500 text-blue-400';
              const channelAvatarClass = isYouTube ? 'bg-orange-600' : 'bg-blue-600';
              return (
                <div key={row.rowId} className="grid grid-cols-12 items-center px-7 py-5 text-sm transition hover:bg-slate-800/70">
                  <div className="col-span-4"><div className="flex items-center gap-4"><StreamPreview title={streamTitle} platform={row.platform} isOnline={isOnline} /><div className="min-w-0"><p className="truncate font-bold text-white">{streamTitle}</p><div className="mt-1 flex min-w-0 items-center gap-2"><span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white', channelAvatarClass)}>{row.channelInitial}</span><span className="truncate text-xs font-semibold text-slate-300">{row.channel}</span></div><p className="mt-1 truncate text-xs text-slate-400">{streamMeta}</p></div></div></div>
                  <div className="col-span-1"><div className="flex items-center gap-2 font-semibold text-white"><span className={cx('flex h-5 w-5 items-center justify-center rounded-full border text-[10px]', platformIconClass)}>{isYouTube ? '◎' : 'f'}</span><span className="truncate">{row.dashboard}</span></div></div>
                  <div className="col-span-1"><div className="flex items-center gap-2 font-semibold text-white"><span className={cx('flex h-4 w-4 items-center justify-center rounded border text-[9px]', platformIconClass)}>{isYouTube ? '▶' : 'f'}</span><span>{row.platform}</span></div></div>
                  <div className="col-span-2"><div className="space-y-1 text-xs"><p className="font-semibold text-slate-200">{row.scheduleInfo.label}</p><p className="text-slate-400">{row.scheduleInfo.time}</p><p className="text-[11px] text-slate-500">{row.scheduleInfo.timezone}</p></div></div>
                  <div className="col-span-2"><div className="space-y-2"><span className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs', isOnline ? 'bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20' : 'bg-slate-800 text-slate-300 ring-1 ring-white/5')}><span className={cx('h-2 w-2 rounded-full', isOnline ? 'bg-emerald-400' : 'bg-slate-400')} />{isOnline ? 'Online' : 'Offline'}</span>{isOnline ? <div className="space-y-1 text-[11px] text-slate-400"><div className="flex justify-between"><span>Mulai</span><span className="font-semibold text-slate-200">{row.startedAt}</span></div><div className="flex justify-between"><span>Server</span><span className="font-semibold text-emerald-300">{row.serverCondition}</span></div><div className="flex justify-between"><span>Penonton</span><span className="font-semibold text-cyan-300">{row.viewers}</span></div></div> : <div className="text-[11px] text-slate-500">Belum berjalan</div>}</div></div>
                  <div className="col-span-2 flex items-center justify-end gap-4"><button type="button" className={cx('rounded-md px-4 py-2 text-sm font-semibold text-white transition', isOnline ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500')}>{isOnline ? 'Stop' : 'Start'}</button><button type="button" className="text-slate-300 transition hover:text-cyan-300">✎</button><button type="button" className="text-slate-300 transition hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
