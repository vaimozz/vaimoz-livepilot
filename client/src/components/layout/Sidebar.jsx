import { Database, ShieldCheck } from 'lucide-react';
import { cx } from '@/lib/cn.js';
import { menuItems } from '@/data/navigation.jsx';

export function Sidebar({ activePage, setActivePage }) {
  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-950/95 p-5 lg:block">
      <nav className="space-y-2 rounded-3xl border border-slate-800 bg-slate-900/40 p-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.label;
          return (
            <button key={item.label} type="button" onClick={() => setActivePage(item.label)} className={cx('flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm transition', isActive ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100')}>
              <Icon className="h-4 w-4" />{item.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Status API</div>
        <div className="space-y-3 text-xs text-slate-400">
          <div className="flex justify-between"><span>YouTube API v3</span><span className="text-amber-400">Belum dicek</span></div>
          <div className="flex justify-between"><span>Facebook Live API</span><span className="text-amber-400">Belum dikonfigurasi</span></div>
          <div className="flex justify-between"><span>FFmpeg Runner</span><span className="text-slate-300">Idle</span></div>
        </div>
      </div>
      <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200"><Database className="h-4 w-4 text-cyan-300" /> Penyimpanan Lokal</div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full w-0 rounded-full bg-cyan-400" /></div>
        <p className="mt-2 text-xs text-slate-500">Belum ada aset tersimpan</p>
      </div>
    </aside>
  );
}
