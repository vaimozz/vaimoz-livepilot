import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search, Trash2, Radio, Square } from 'lucide-react';
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

function metricCards(metrics, runningCount) {
  const memory = metrics?.memory || {};
  const cpu    = metrics?.cpu    || {};
  return [
    { label: 'FFmpeg Runner', value: runningCount > 0 ? 'Online' : 'Idle', note: `${runningCount} proses berjalan`, tone: runningCount > 0 ? 'text-emerald-300' : 'text-slate-300' },
    { label: 'CPU Load',      value: String(Number(cpu.load1 || 0).toFixed(2)), note: `${cpu.cores || 0} core`, tone: 'text-cyan-300' },
    { label: 'Memori',        value: `${memory.percent || 0}%`, note: 'pemakaian server', tone: 'text-blue-300' },
    { label: 'Uptime',        value: `${Math.floor(Number(metrics?.uptime || 0) / 60)}m`, note: 'runtime backend', tone: 'text-emerald-300' },
  ];
}

const AUTO_REFRESH_MS = 5000; // 5 detik

export function StreamMonitorPage() {
  const [logFilter,      setLogFilter]      = useState('');
  const [lineLimit,      setLineLimit]      = useState('200');
  const [logSource,      setLogSource]      = useState('Semua Log');
  const [logs,           setLogs]           = useState([]);
  const [metrics,        setMetrics]        = useState(null);
  const [runningStreams,  setRunningStreams]  = useState([]);
  const [isLoading,      setIsLoading]      = useState(false);
  const [autoRefresh,    setAutoRefresh]    = useState(false);
  const [monitorMessage, setMonitorMessage] = useState('Monitor membaca log asli dari backend.');
  const intervalRef = useRef(null);

  const loadMonitor = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit: lineLimit };
      if (logSource !== 'Semua Log') params.source = logSource;
      const [logResult, metricResult, runningResult] = await Promise.all([
        api.monitor.logs(params),
        api.monitor.metrics(),
        api.streams.running(),
      ]);
      setLogs(logResult.logs || []);
      setMetrics(metricResult || null);
      setRunningStreams(runningResult.streams || []);
      setMonitorMessage(`Diperbarui ${new Date().toLocaleTimeString('id-ID')}. ${logResult.logs?.length || 0} log, ${runningResult.count || 0} stream aktif.`);
    } catch (error) {
      setMonitorMessage(`Gagal membaca monitor: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [lineLimit, logSource]);

  // Auto-refresh 5 detik
  useEffect(() => {
    if (autoRefresh) {
      loadMonitor();
      intervalRef.current = setInterval(loadMonitor, AUTO_REFRESH_MS);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, loadMonitor]);

  // Load pertama kali
  useEffect(() => { loadMonitor(); }, []);

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

  const stopStream = async (streamId, campaignId) => {
    try {
      if (campaignId) {
        await api.campaigns.stop(campaignId);
      } else {
        await api.streams.stop(streamId);
      }
      setMonitorMessage(`Stream #${streamId} berhasil dihentikan.`);
      loadMonitor();
    } catch (error) {
      setMonitorMessage(`Gagal menghentikan stream: ${error instanceof Error ? error.message : 'Kesalahan.'}`);
    }
  };

  const runningCount = runningStreams.length;

  return (
    <>
      <header className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <SectionTitle eyebrow="Monitor Stream" title="Log Aplikasi & FFmpeg Server" description="Pantau log backend, proses FFmpeg, RTMP worker, dan status sistem secara real-time." />
        <div className="flex flex-wrap gap-3">
          {/* Toggle Auto Refresh */}
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            className={cx(
              'flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold transition',
              autoRefresh
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
            )}
          >
            <Radio className={cx('h-4 w-4', autoRefresh && 'animate-pulse')} />
            {autoRefresh ? 'Auto (5s)' : 'Auto Refresh'}
          </button>
          <Button variant="outline" className="rounded-2xl border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" onClick={loadMonitor} disabled={isLoading}>
            <RefreshCw className={cx('mr-2 h-4 w-4', isLoading && 'animate-spin')} /> Muat Ulang
          </Button>
          <Button variant="outline" className="rounded-2xl border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20" onClick={clearLogs}>
            <Trash2 className="mr-2 h-4 w-4" /> Bersihkan
          </Button>
        </div>
      </header>

      {/* Metric Cards */}
      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards(metrics, runningCount).map((stat) => (
          <Card key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
            <CardContent className="p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</p>
              <p className={cx('mt-3 text-2xl font-bold', stat.tone)}>{stat.value}</p>
              <p className="mt-2 text-xs text-slate-500">{stat.note}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Running Streams Panel */}
      {runningStreams.length > 0 && (
        <Card className="mb-5 rounded-3xl border border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <p className="text-sm font-bold text-white">Stream Sedang Aktif ({runningStreams.length})</p>
            </div>
            <div className="space-y-3">
              {runningStreams.map((stream) => (
                <div key={stream.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">Stream #{stream.id}</p>
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">
                          {stream.platform}
                        </span>
                        {stream.youtubeBroadcastId && (
                          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-300">
                            🔴 LIVE
                          </span>
                        )}
                      </div>
                      {stream.chosenTitle && (
                        <p className="mt-1 truncate text-sm text-slate-300">📌 {stream.chosenTitle}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => stopStream(stream.id, stream.campaignId)}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500"
                    >
                      <Square className="h-3 w-3 fill-white" /> Stop
                    </button>
                  </div>

                  {/* YouTube Live Stats */}
                  {stream.youtubeBroadcastId && (
                    <div className="mb-3 grid gap-2 sm:grid-cols-4">
                      <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                        <p className="text-[10px] text-slate-500">Viewers</p>
                        <p className="text-lg font-bold text-red-300">
                          {stream.youtubeConcurrentViewers?.toLocaleString() || '0'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                        <p className="text-[10px] text-slate-500">Views</p>
                        <p className="text-lg font-bold text-blue-300">
                          {stream.youtubeTotalViews?.toLocaleString() || '0'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                        <p className="text-[10px] text-slate-500">Likes</p>
                        <p className="text-lg font-bold text-green-300">
                          {stream.youtubeLikes?.toLocaleString() || '0'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                        <p className="text-[10px] text-slate-500">Chatbot</p>
                        <p className="text-lg font-bold text-purple-300">
                          {stream.chatbotStatus === 'active' ? '✓ Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Stream Details */}
                  <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
                    {stream.startedAt && (
                      <span>⏱ Started: {new Date(stream.startedAt).toLocaleTimeString('id-ID')}</span>
                    )}
                    {stream.pid && <span>PID: {stream.pid}</span>}
                    {stream.youtubeWatchUrl && (
                      <a
                        href={stream.youtubeWatchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline"
                      >
                        🔗 Watch on YouTube
                      </a>
                    )}
                    {stream.chatbotMessageCount > 0 && (
                      <span>💬 {stream.chatbotMessageCount} messages sent</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Viewer */}
      <Card className="rounded-3xl border-slate-800 bg-slate-900/70">
        <CardContent className="p-5">
          <div className="mb-5 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400">Filter log...
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input value={logFilter} onChange={(e) => setLogFilter(e.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" placeholder="Cari INFO, FFMPEG, ERROR..." />
                </div>
              </label>
            </div>
            <label className="text-xs text-slate-400">Sumber log
              <select value={logSource} onChange={(e) => setLogSource(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500">
                <option>Semua Log</option>
                <option>Aset</option>
                <option>Server</option>
                <option>FFmpeg</option>
                <option>Kampanye</option>
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
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-xs text-slate-500">
              <span>Log Backend</span>
              <span>Menampilkan {filteredLogs.length} / {lineLimit} baris terakhir</span>
            </div>
            <div className="max-h-[560px] space-y-1 overflow-auto p-4 font-mono text-xs">
              {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                <div key={log.id || `${log.created_at}-${log.message}`} className="grid gap-3 rounded-xl px-3 py-2 hover:bg-slate-900 md:grid-cols-12">
                  <span className="text-slate-500 md:col-span-2">{formatLogTime(log.created_at || log.createdAt)}</span>
                  <span className={cx('w-fit rounded-full px-2 py-0.5 text-[10px] md:col-span-2', getLogLevelClass(log.level))}>{log.level}</span>
                  <span className="text-slate-500 md:col-span-2">{log.source}</span>
                  <span className={cx('md:col-span-6', log.level === 'ERROR' ? 'text-red-300' : log.source?.toLowerCase().includes('ffmpeg') ? 'text-cyan-300' : 'text-slate-300')}>{log.message}</span>
                </div>
              )) : <div className="flex min-h-40 items-center justify-center text-center text-slate-500">Belum ada log backend.</div>}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
