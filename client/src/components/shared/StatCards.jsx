import { motion } from 'framer-motion';
import { Wifi } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.jsx';

export function StatCard({ title, value, note, icon: Icon, status = 'Sehat', index = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card className="rounded-2xl border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10 transition hover:border-cyan-400/30 hover:bg-slate-900">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 ring-1 ring-slate-700/70">
              <Icon className="h-5 w-5 text-cyan-300" />
            </div>
            <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-400/10">{status}</span>
          </div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <h3 className="mt-2 text-3xl font-bold leading-none text-white">{value}</h3>
          <p className="mt-3 line-clamp-2 border-t border-slate-800 pt-3 text-xs leading-relaxed text-slate-500">{note}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function SystemStatCard({ title, value, subValue, icon: Icon, progress = 0, index = 0 }) {
  const safeProgress = Math.max(0, Math.min(progress, 100));
  return (
    <motion.div className="h-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card className="h-full rounded-2xl border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10 transition hover:border-cyan-400/30">
        <CardContent className="flex min-h-[176px] h-full flex-col justify-between p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 ring-1 ring-slate-700/70">
              <Icon className="h-5 w-5 text-cyan-300" />
            </div>
          </div>
          <div className="mb-4 flex items-end gap-2">
            <span className="text-3xl font-bold leading-none text-white">{value}</span>
            {subValue ? <span className="pb-1 text-xs font-semibold text-slate-500">{subValue}</span> : null}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-cyan-500" style={{ width: `${safeProgress}%` }} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function InternetSpeedCard({ upload, download, index = 0 }) {
  return (
    <motion.div className="h-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card className="h-full rounded-2xl border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10 transition hover:border-cyan-400/30">
        <CardContent className="flex min-h-[176px] h-full flex-col justify-between p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h3 className="text-sm font-semibold text-slate-300">Kecepatan Internet</h3>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 ring-1 ring-slate-700/70">
              <Wifi className="h-5 w-5 text-cyan-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-950/70 px-3 py-3"><p className="text-[11px] text-slate-500">Upload</p><p className="mt-1 text-sm font-bold text-blue-400">↑ {upload}</p></div>
            <div className="rounded-xl bg-slate-950/70 px-3 py-3"><p className="text-[11px] text-slate-500">Download</p><p className="mt-1 text-sm font-bold text-emerald-400">↓ {download}</p></div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full w-[18%] rounded-full bg-cyan-500" /></div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
