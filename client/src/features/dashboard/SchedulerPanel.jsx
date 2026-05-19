import { CalendarClock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { StatusPill } from '@/components/shared/Badges.jsx';

export function SchedulerPanel({ campaigns = [] }) {
  const scheduled = campaigns.filter((item) => item.schedule && item.schedule !== 'Belum dijadwalkan').slice(0, 3);
  return (
    <Card className="rounded-3xl border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <CardContent className="p-5">
        <div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-bold text-white">Penjadwal</h3><p className="text-sm text-slate-400">Antrian live berikutnya dari campaign tersimpan.</p></div><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 ring-1 ring-cyan-400/20"><CalendarClock className="h-5 w-5 text-cyan-300" /></div></div>
        {scheduled.length ? (
          <div className="grid gap-3 lg:grid-cols-3">{scheduled.map((item, index) => <div key={`${item.id}-${item.name}`} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 transition hover:border-cyan-400/20"><div className="mb-3 flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{`Jadwal #${index + 1}`}</p><p className="mt-1 text-lg font-bold text-white">{item.schedule}</p></div><StatusPill status={item.status || 'Draft'} /></div><p className="truncate text-sm font-semibold text-slate-100">{item.name}</p><div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-500"><span>{item.platforms?.join(' + ') || item.niche}</span><span>Asia/Jakarta</span></div></div>)}</div>
        ) : (
          <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-slate-800 text-center text-sm text-slate-500">Belum ada jadwal. Buat dan simpan campaign terlebih dahulu.</div>
        )}
      </CardContent>
    </Card>
  );
}
