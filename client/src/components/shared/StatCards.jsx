import { motion } from 'framer-motion';
import { Wifi } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.jsx';

export function StatCard({ title, value, note, icon: Icon, status = 'Sehat', index = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card className="rounded-2xl border-slate-800 bg-slate-900/70 shadow-lg shadow-black/10 transition hover:border-cyan-400/30 hover:bg-slate-900">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 ring-1 ring-slate-700/70">
              <Icon className="h-4 w-4 text-cyan-300" />
            </div>
            <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-300 ring-1 ring-emerald-400/10">{status}</span>
          </div>
          <p className="text-xs font-medium text-slate-400">{title}</p>
          <h3 className="mt-1 text-2xl font-bold leading-none text-white">{value}</h3>
          <p className="mt-2 line-clamp-1 border-t border-slate-800 pt-2 text-[11px] leading-relaxed text-slate-500">{note}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function SystemStatCard({ title, value, subValue, icon: Icon, progress = 0, index = 0 }) {
  const safeProgress = Math.max(0, Math.min(progress, 100));
  return (
    <motion.div className="h-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card className="h-full rounded-2xl border-slate-800 bg-slate-900/70 shadow-lg shadow-black/10 transition hover:border-cyan-400/30">
        <CardContent className="flex min-h-[140px] h-full flex-col justify-between p-4">
          <div className="mb-3 flex items-start justify-between gap-4">
            <h3 className="text-xs font-semibold text-slate-300">{title}</h3>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 ring-1 ring-slate-700/70">
              <Icon className="h-4 w-4 text-cyan-300" />
            </div>
          </div>
          <div className="mb-3 flex items-end gap-2">
            <span className="text-2xl font-bold leading-none text-white">{value}</span>
            {subValue ? <span className="pb-0.5 text-[11px] font-semibold text-slate-500">{subValue}</span> : null}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
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
      <Card className="h-full rounded-2xl border-slate-800 bg-slate-900/70 shadow-lg shadow-black/10 transition hover:border-cyan-400/30">
        <CardContent className="flex min-h-[140px] h-full flex-col justify-between p-4">
          <div className="mb-3 flex items-start justify-between gap-4">
            <h3 className="text-xs font-semibold text-slate-300">Kecepatan Internet</h3>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 ring-1 ring-slate-700/70">
              <Wifi className="h-4 w-4 text-cyan-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-950/70 px-2 py-2"><p className="text-[10px] text-slate-500">Upload</p><p className="mt-0.5 text-xs font-bold text-blue-400">↑ {upload}</p></div>
            <div className="rounded-lg bg-slate-950/70 px-2 py-2"><p className="text-[10px] text-slate-500">Download</p><p className="mt-0.5 text-xs font-bold text-emerald-400">↓ {download}</p></div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full w-[18%] rounded-full bg-cyan-500" /></div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
