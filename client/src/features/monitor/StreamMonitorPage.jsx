import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { SectionTitle } from '@/components/shared/SectionTitle.jsx';
import { cx } from '@/lib/cn.js';
import { getLogLevelClass } from '@/lib/styleUtils.js';
import { api } from '@/lib/api.js';

function formatLogTime(createdAt) {
  if (!createdAt) return '--:--:--';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return String(createdAt).slice(11, 19) || '--:--:--';
  return date.toLocaleTimeString('id-ID', { hour12: false });
}

function metricCards(metrics) {
  const streams = metrics?.streams || [];
  const memory = metrics?.memory || {};
  const cpu = metrics?.cpu || {};
  return [
    { label: 'FFmpeg Runner', value: streams.length ? 'Online' : 'Idle', note: `${streams.length} proses berjalan`, tone: streams.length ? 'text-emerald-300' : 'text-slate-300' },
    { label: 'CPU Load', value: String(Number(cpu.load1 || 0).toFixed(2)), note: `${cpu.cores || 0} core`, tone: 'text-cyan-300' },
    { label: 'Memori', value: `${memory.percent || 0}%`, note: 'pemakaian server', tone: 'text-blue-300' },
    { label: 'Uptime', value: `${Math.floor(Number(metrics?.uptime || 0) / 60)}m`, note: 'runtime backend', tone: 'text-emerald-300' },
  ];
}

export function StreamMonitorPage() {
  const [logFilter, setLogFilter] = useState('');
  const [lineLimit, setLineLimit] = useState('200');
  const [logSource, setLogSource] = useState('Semua Log');
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [monitorMessage, setMonitorMessage] = useState('Monitor membaca log asli dari backend.');

  const loadMonitor = async () => {
    setIsLoading(true);
    try {
      const params = { limit: lineLimit };
      if (logSource !== 'Semua Log') params.source = logSource;
      const [logResult, metricResult] = await Promise.all([api.monitor.logs(params), api.monitor.metrics()]);
      setLogs(logResult.logs || []);
      setMetrics(metricResult || null);
      setMonitorMessage(`Monitor diperbarui. ${logResult.logs?.length || 0} log dibaca dari SQLite.`);
    } catch (error) {
      setMonitorMessage(`Gagal membaca monitor: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMonitor();
  }, []);

  const filteredLogs = useMemo(() => logs.filter((log) => {
    const text = `${log.created_at || log.createdAt || ''} ${log.level} ${log.source} ${log.message}`.toLowerCase();
    return text.includes(logFilter.toLowerCase());
  }), [logs, logFilter]);

  const clearLogs = async () => {
    try {
      await api.monitor.clearLogs();
      setLogs([]);
      setMonitorMessage('Log backend berhasil dibersihkan dari SQLite.');
    } catch (error) {
      setMonitorMessage(`Gagal membersihkan log: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal.'}`);
    }
  };

  return (
    <>
      <header className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <SectionTitle eyebrow="Monitor Stream" title="Log Aplikasi & FFmpeg Server" description="Pantau log backend, proses FFmpeg, RTMP worker, dan status sistem secara real-time." />
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-2xl border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" onClick={loadMonitor} disabled={isLoading}>
            <RefreshCw className={cx('mr-2 h-4 w-4', isLoading && 'animate-spin')} /> Muat Ulang
          </Button>
          <Button variant="outline" className="rounded-2xl border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20" onClick={clearLogs}>
            <Trash2 className="mr-2 h-4 w-4" /> Bersihkan
          </Button>
        </div>
      </header>

      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards(metrics).map((stat) => (
          <Card key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
            <CardContent className="p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</p>
              <p className={cx('mt-3 text-2xl font-bold', stat.tone)}>{stat.value}</p>
              <p className="mt-2 text-xs text-slate-500">{stat.note}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="rounded-3xl border-slate-800 bg-slate-900/70">
        <CardContent className="p-5">
          <div className="mb-5 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400">Filter log...
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input value={logFilter} onChange={(e) => setLogFilter(e.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" placeholder="Cari INFO, FFMPEG, SERVER, ERROR, atau kata tertentu" />
                </div>
              </label>
            </div>
            <label className="text-xs text-slate-400">Sumber log
              <select value={logSource} onChange={(e) => setLogSource(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500">
                <option>Semua Log</option>
                <option>Aset</option>
                <option>Server</option>
                <option>FFmpeg</option>
                <option>YouTube</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">Baris terakhir
              <select value={lineLimit} onChange={(e) => setLineLimit(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500">
                <option value="200">200 baris terakhir</option>
                <option value="500">500 baris terakhir</option>
                <option value="1000">1000 baris terakhir</option>
              </select>
            </label>
          </div>

          <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">{monitorMessage}</div>

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-xs text-slate-500"><span>Log Backend</span><span>Menampilkan {filteredLogs.length} / {lineLimit} baris terakhir</span></div>
            <div className="max-h-[560px] space-y-1 overflow-auto p-4 font-mono text-xs">
              {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                <div key={log.id || `${log.created_at}-${log.message}`} className="grid gap-3 rounded-xl px-3 py-2 hover:bg-slate-900 md:grid-cols-12">
                  <span className="text-slate-500 md:col-span-2">{formatLogTime(log.created_at || log.createdAt)}</span>
                  <span className={cx('w-fit rounded-full px-2 py-0.5 text-[10px] md:col-span-2', getLogLevelClass(log.level))}>{log.level}</span>
                  <span className="text-slate-500 md:col-span-2">{log.source}</span>
                  <span className="text-slate-300 md:col-span-6">{log.message}</span>
                </div>
              )) : <div className="flex min-h-40 items-center justify-center text-center text-slate-500">Belum ada log backend.</div>}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
