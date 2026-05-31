import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search, Trash2, Radio, Square } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { SectionTitle } from '@/components/shared/SectionTitle.jsx';
import { ActiveLiveStreamsWidget } from '@/components/shared/ActiveLiveStreamsWidget.jsx';
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

const formatDuration = (minutes) => {
  if (!minutes) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}j ${mins}m`;
};

const AUTO_REFRESH_MS = 5000; // 5 detik

export function StreamMonitorPage() {
  const [logFilter,      setLogFilter]      = useState('');
  const [lineLimit,      setLineLimit]      = useState('200');
  const [logSource,      setLogSource]      = useState('Semua Log');
  const [logs,           setLogs]           = useState([]);
  const [metrics,        setMetrics]        = useState(null);
  const [runningStreams,  setRunningStreams]  = useState([]);
  const [streamsHistory, setStreamsHistory] = useState([]);
  const [selectedStreams, setSelectedStreams] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('logs');
  const [isLoading,      setIsLoading]      = useState(false);
  const [autoRefresh,    setAutoRefresh]    = useState(false);
  const [monitorMessage, setMonitorMessage] = useState('Monitor membaca log asli dari backend.');
  const intervalRef = useRef(null);

  const loadMonitor = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit: lineLimit };
      if (logSource !== 'Semua Log') params.source = logSource;
      const [logResult, metricResult, runningResult, analyticsResult] = await Promise.all([
        api.monitor.logs(params),
        api.monitor.metrics(),
        api.streams.running(),
        api.analytics.getGlobal({}),
      ]);
      setLogs(logResult.logs || []);
      setMetrics(metricResult || null);
      setRunningStreams(runningResult.streams || []);
      setStreamsHistory(analyticsResult.streams || []);
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

  const handleDeleteStreams = async () => {
    if (selectedStreams.length === 0) return;
    if (!window.confirm(`Yakin ingin menghapus ${selectedStreams.length} riwayat stream ini?`)) return;
    
    setIsDeleting(true);
    try {
      await api.streams.delete(selectedStreams);
      setSelectedStreams([]);
      loadMonitor();
    } catch (err) {
      alert(err.message || 'Gagal menghapus riwayat stream');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSyncStreams = async () => {
    if (selectedStreams.length === 0) return;
    setIsSyncing(true);
    try {
      const res = await api.streams.sync(selectedStreams);
      alert(res.message || 'Sinkronisasi berhasil.');
      loadMonitor();
    } catch (err) {
      alert(err.message || 'Gagal menyinkronkan data dengan YouTube.');
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedStreams.length === streamsHistory.length) {
      setSelectedStreams([]);
    } else {
      setSelectedStreams(streamsHistory.map(s => s.id));
    }
  };

  const toggleSelectStream = (id) => {
    if (selectedStreams.includes(id)) {
      setSelectedStreams(prev => prev.filter(streamId => streamId !== id));
    } else {
      setSelectedStreams(prev => [...prev, id]);
    }
  };

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

      {/* Tabs */}
      <div className="mb-6 flex space-x-1 rounded-xl bg-slate-900/50 p-1 border border-slate-800">
        <button
          onClick={() => setActiveTab('logs')}
          className={cx(
            'flex-1 rounded-lg py-2.5 text-sm font-bold transition-all',
            activeTab === 'logs' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          )}
        >
          Monitor Sistem
        </button>
        <button
          onClick={() => setActiveTab('streams')}
          className={cx(
            'flex-1 rounded-lg py-2.5 text-sm font-bold transition-all',
            activeTab === 'streams' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          )}
        >
          Sesi Stream ({runningCount})
        </button>
      </div>

      {activeTab === 'logs' && (
        <>
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
      )}

      {activeTab === 'streams' && (
        <div className="space-y-8">
          <ActiveLiveStreamsWidget />
          
          <Card className="rounded-3xl border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
            <CardContent className="p-5">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-block h-5 w-1.5 rounded-full bg-sky-400" />
                  <h3 className="text-lg font-bold text-slate-100">Riwayat Lengkap Sesi Stream</h3>
                </div>
                {selectedStreams.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSyncStreams}
                      disabled={isSyncing || isDeleting}
                      className="bg-slate-900 border-slate-700 text-slate-300 hover:text-sky-400 font-bold rounded-xl"
                    >
                      {isSyncing ? 'Menyinkronkan...' : `Sinkronkan (${selectedStreams.length})`}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleDeleteStreams}
                      disabled={isDeleting || isSyncing}
                      className="bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 hover:text-rose-300 font-bold border border-rose-500/20 rounded-xl"
                    >
                      Hapus ({selectedStreams.length})
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-4 w-12 text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-700 bg-slate-900" 
                          checked={streamsHistory.length > 0 && selectedStreams.length === streamsHistory.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-5 py-4">Kampanye / Judul</th>
                      <th className="px-4 py-4">Platform</th>
                      <th className="px-4 py-4">Waktu Mulai</th>
                      <th className="px-4 py-4">Durasi</th>
                      <th className="px-4 py-4 text-center">Views</th>
                      <th className="px-4 py-4 text-center">Puncak Penonton</th>
                      <th className="px-4 py-4 text-center">Likes/Comments</th>
                      <th className="px-5 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {streamsHistory.length > 0 ? (
                      Object.entries(
                        streamsHistory.reduce((acc, s) => {
                          const ch = s.channelName || 'Platform Lain';
                          if (!acc[ch]) acc[ch] = [];
                          acc[ch].push(s);
                          return acc;
                        }, {})
                      ).map(([channelName, streams]) => (
                        <React.Fragment key={channelName}>
                          <tr className="bg-slate-900 border-b border-slate-800">
                            <td colSpan="9" className="px-5 py-3 text-xs font-bold text-sky-400 uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <Radio className="h-3.5 w-3.5" />
                                {channelName}
                              </div>
                            </td>
                          </tr>
                          {streams.map((s) => {
                            const durationText = s.startedAt ? formatDuration(
                              Math.round(((s.stoppedAt ? new Date(s.stoppedAt).getTime() : Date.now()) - new Date(s.startedAt).getTime()) / 60000)
                            ) : '-';
                            const isOnline = ['Online', 'Starting'].includes(s.status);
                            return (
                              <tr key={s.id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="px-5 py-4 text-center">
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-slate-700 bg-slate-900" 
                                    checked={selectedStreams.includes(s.id)}
                                    onChange={() => toggleSelectStream(s.id)}
                                  />
                                </td>
                                <td className="px-5 py-4">
                                  <p className="font-extrabold text-slate-100">{s.chosenTitle || 'Stream Tanpa Judul'}</p>
                                  <p className="text-2xs text-slate-500 mt-0.5">{s.campaignName || 'Sesi Manual'}</p>
                                </td>
                                <td className="px-4 py-4">
                                  <span className="rounded-full bg-slate-900 border border-slate-700 px-2 py-0.5 text-2xs font-semibold">
                                    {s.platform}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-2xs">
                                  {s.startedAt ? new Date(s.startedAt).toLocaleString('id-ID') : '-'}
                                </td>
                                <td className="px-4 py-4 text-xs font-bold">
                                  {durationText}
                                </td>
                                <td className="px-4 py-4 text-center font-extrabold text-slate-100">
                                  {(s.youtubeTotalViews || 0).toLocaleString('id-ID')}
                                </td>
                                <td className="px-4 py-4 text-center font-extrabold text-rose-400">
                                  {(s.youtubeConcurrentViewers || 0).toLocaleString('id-ID')}
                                </td>
                                <td className="px-4 py-4 text-center text-xs">
                                  <span className="text-emerald-400 font-semibold">{s.youtubeLikes || 0}</span>
                                  <span className="text-slate-600 mx-1">/</span>
                                  <span className="text-purple-400 font-semibold">{s.youtubeComments || 0}</span>
                                </td>
                                <td className="px-5 py-4 text-center">
                                  <span className={cx(
                                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider",
                                    s.status === 'Online' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse" :
                                    s.status === 'Starting' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                    "bg-slate-800 text-slate-400 border border-slate-700"
                                  )}>
                                    {isOnline && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                                    {s.status === 'Online' ? 'LIVE' : s.status === 'Starting' ? 'STARTING' : 'OFFLINE'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="px-5 py-8 text-center text-slate-500 bg-slate-900/50">
                          Belum ada riwayat sesi streaming yang tersimpan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
