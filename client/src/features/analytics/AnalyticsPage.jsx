import { useMemo, useState } from 'react';
import { Clock3, DollarSign, Eye, RefreshCw, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { cx } from '@/lib/cn.js';
import { getAnalyticsData, getAnalyticsSummary } from '@/lib/analyticsUtils.js';
import { formatRupiah } from '@/lib/formatters.js';

function AnalyticsStatCard({ title, value, note, icon: Icon, accentClass = 'text-white' }) {
  return <Card className="rounded-3xl border-slate-700 bg-slate-900/80 shadow-xl shadow-black/10"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-white">{title}</p><p className={cx('mt-5 text-3xl font-bold', accentClass)}>{value}</p><p className="mt-3 text-xs text-slate-300">{note}</p></div><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800/70 opacity-60"><Icon className="h-8 w-8 text-slate-500" /></div></div></CardContent></Card>;
}

export function AnalyticsPage() {
  const [selectedChannel, setSelectedChannel] = useState('Semua Channel');
  const [selectedPeriod, setSelectedPeriod] = useState('28 Hari Terakhir');
  const [analyticsMessage, setAnalyticsMessage] = useState('Belum ada data analytics asli. Hubungkan YouTube/Facebook API untuk menampilkan metrik.');
  const normalizedChannel = selectedChannel === 'Semua Channel' ? 'Semua' : selectedChannel;
  const analyticsData = useMemo(() => getAnalyticsData(normalizedChannel, selectedPeriod), [normalizedChannel, selectedPeriod]);
  const summary = useMemo(() => getAnalyticsSummary(analyticsData), [analyticsData]);
  const channels = ['Semua Channel', 'YouTube', 'Facebook'];
  const periods = ['7 Hari Terakhir', '28 Hari Terakhir', '90 Hari Terakhir', '12 Bulan Terakhir'];
  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-slate-700 bg-slate-900/80 shadow-xl shadow-black/10"><CardContent className="p-5"><div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div className="grid gap-4 md:grid-cols-2"><label className="block text-xs font-bold uppercase tracking-widest text-white">Channel<select value={selectedChannel} onChange={(e) => setSelectedChannel(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 text-sm font-semibold text-white outline-none">{channels.map((channel) => <option key={channel}>{channel}</option>)}</select></label><label className="block text-xs font-bold uppercase tracking-widest text-white">Periode<select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 text-sm font-semibold text-white outline-none">{periods.map((period) => <option key={period}>{period}</option>)}</select></label></div><Button variant="outline" className="h-12 rounded-xl border-slate-600 bg-slate-800 px-5 text-sm font-bold text-white hover:bg-slate-700" onClick={() => setAnalyticsMessage(`Belum ada data analytics asli untuk ${selectedChannel} • ${selectedPeriod}.`)}><RefreshCw className="mr-2 h-4 w-4" /> Refresh Data</Button></div></CardContent></Card>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><AnalyticsStatCard title="Estimasi Pendapatan" value={formatRupiah(summary.revenue)} note="~ USD 0" icon={DollarSign} accentClass="text-emerald-400" /><AnalyticsStatCard title="Jam Tayang" value={String(summary.watchHours)} note="Total Jam" icon={Clock3} accentClass="text-rose-400" /><AnalyticsStatCard title="Subscribers" value={String(summary.subscribers)} note="Penambahan Baru" icon={Users} /><AnalyticsStatCard title="Total Views" value={String(summary.views)} note="Kali Ditonton" icon={Eye} accentClass="text-blue-400" /></div>
      <Card className="rounded-3xl border-slate-700 bg-slate-900/80 shadow-xl shadow-black/10"><CardContent className="p-5"><div className="mb-5 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="inline-block h-5 w-1.5 rounded-full bg-rose-400" /><h3 className="text-lg font-bold text-white">Grafik Performa</h3></div><p className="text-xs text-slate-500">Views • Jam Tayang • Subscribers</p></div><div className="h-[360px] rounded-2xl border border-slate-800 bg-slate-950/30 p-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={analyticsData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}><defs><linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} /><stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} /></linearGradient><linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fb7185" stopOpacity={0.25} /><stop offset="95%" stopColor="#fb7185" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" /><XAxis dataKey="day" stroke="#64748b" tickLine={false} axisLine={false} fontSize={12} /><YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={12} /><Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '14px', color: '#fff' }} labelStyle={{ color: '#cbd5e1' }} /><Area type="monotone" dataKey="views" name="Views" stroke="#38bdf8" fill="url(#viewsGradient)" strokeWidth={3} /><Area type="monotone" dataKey="watchHours" name="Jam Tayang" stroke="#fb7185" fill="url(#hoursGradient)" strokeWidth={2} /><Area type="monotone" dataKey="subscribers" name="Subscribers" stroke="#a78bfa" fill="transparent" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></CardContent></Card>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">{analyticsMessage}</div>
    </div>
  );
}
