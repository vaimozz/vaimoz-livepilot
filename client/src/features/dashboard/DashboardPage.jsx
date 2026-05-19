import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Clapperboard, Cpu, HardDrive, ListVideo, MemoryStick, Radio, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { SectionLabel } from '@/components/shared/SectionTitle.jsx';
import { StatCard, SystemStatCard, InternetSpeedCard } from '@/components/shared/StatCards.jsx';
import { CampaignTable } from './CampaignTable.jsx';
import { SchedulerPanel } from './SchedulerPanel.jsx';
import { getVisibleCampaigns, normalizeDashboardCampaign } from '@/lib/dashboardUtils.js';
import { cx } from '@/lib/cn.js';
import { api } from '@/lib/api.js';

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 100 ? 0 : size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function buildSystemMetrics(metrics) {
  const memory = metrics?.memory || {};
  const cpu = metrics?.cpu || {};
  const memPercent = Math.max(0, Math.min(Number(memory.percent || 0), 100));
  const cpuPercent = Math.max(0, Math.min(Math.round((Number(cpu.load1 || 0) / Math.max(Number(cpu.cores || 1), 1)) * 100), 100));

  return [
    { title: 'Penggunaan CPU', value: `${cpuPercent}%`, subValue: cpu.cores ? `/ ${cpu.cores} core` : '', icon: Cpu, progress: cpuPercent },
    { title: 'Memori', value: formatBytes(memory.used), subValue: `/ ${formatBytes(memory.total)}`, icon: MemoryStick, progress: memPercent },
    { title: 'Penyimpanan Upload', value: metrics?.disk?.available ? 'Aktif' : 'Belum terbaca', subValue: '', icon: HardDrive, progress: metrics?.disk?.available ? 15 : 0 },
  ];
}

export function DashboardPage({ selectedPlatform, setSelectedPlatform }) {
  const [campaigns, setCampaigns] = useState([]);
  const [assets, setAssets] = useState([]);
  const [streams, setStreams] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [dashboardMessage, setDashboardMessage] = useState('Dashboard membaca data asli dari SQLite dan backend.');
  const [isLoading, setIsLoading] = useState(false);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [campaignResult, assetResult, streamResult, metricResult] = await Promise.all([
        api.campaigns.list(),
        api.assets.list(),
        api.streams.list(),
        api.monitor.metrics(),
      ]);
      setCampaigns((campaignResult.campaigns || []).map(normalizeDashboardCampaign));
      setAssets(assetResult.assets || []);
      setStreams(streamResult.streams || []);
      setMetrics(metricResult || null);
      setDashboardMessage('Dashboard berhasil dimuat dari SQLite dan backend.');
    } catch (error) {
      setDashboardMessage(`Gagal memuat dashboard: ${getErrorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const visibleCampaigns = useMemo(() => getVisibleCampaigns(campaigns, selectedPlatform), [campaigns, selectedPlatform]);
  const liveCount = streams.filter((stream) => ['Online', 'Starting'].includes(stream.status)).length;
  const todayCount = campaigns.filter((item) => item.schedule && item.schedule !== 'Belum dijadwalkan').length;
  const systemMetrics = buildSystemMetrics(metrics);

  const dashboardStats = [
    { title: 'Live Aktif', value: String(liveCount), note: liveCount ? 'Stream sedang berjalan dari backend' : 'Belum ada live aktif', icon: Radio },
    { title: 'Kampanye', value: String(campaigns.length), note: campaigns.length ? 'Data campaign tersimpan di SQLite' : 'Belum ada kampanye tersimpan', icon: ListVideo },
    { title: 'Jadwal Hari Ini', value: String(todayCount), note: todayCount ? 'Ada campaign dengan jadwal' : 'Belum ada jadwal aktif', icon: CalendarClock },
    { title: 'Aset Siap', value: String(assets.length), note: assets.length ? 'Video, audio, thumbnail dari SQLite' : 'Upload aset terlebih dahulu', icon: Clapperboard },
  ];

  return (
    <>
      <section className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
        <span>{dashboardMessage}</span>
        <Button variant="outline" onClick={loadDashboardData} disabled={isLoading} className="rounded-xl border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800 disabled:opacity-50">
          <RefreshCw className={cx('mr-2 h-4 w-4', isLoading && 'animate-spin')} /> Refresh
        </Button>
      </section>

      <section className="mb-6">
        <SectionLabel title="Statistik Utama" description="Ringkasan cepat aktivitas live dan aset dari database lokal." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{dashboardStats.map((stat, index) => <StatCard key={stat.title} {...stat} index={index} />)}</div>
      </section>

      <section className="mb-6">
        <SectionLabel title="Statistik Server" description="Pantau resource server berdasarkan endpoint monitor backend." />
        <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-4">
          {systemMetrics.map((metric, index) => <SystemStatCard key={metric.title} {...metric} index={index} />)}
          <InternetSpeedCard upload="-" download="-" index={systemMetrics.length} />
        </div>
      </section>

      <section className="mb-6">
        <Card className="rounded-3xl border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
          <CardContent className="p-5">
            <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Streaming Status</h3>
                <p className="text-sm text-slate-400">Kelola dan pantau seluruh campaign dari SQLite.</p>
              </div>
              <div className="flex rounded-2xl bg-slate-950 p-1 text-xs ring-1 ring-slate-800">
                {['Semua', 'YouTube', 'Facebook'].map((platform) => (
                  <button key={platform} type="button" onClick={() => setSelectedPlatform(platform)} className={cx('rounded-xl px-3 py-2 transition', selectedPlatform === platform ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white')}>{platform}</button>
                ))}
              </div>
            </div>
            <CampaignTable visibleCampaigns={visibleCampaigns} selectedPlatform={selectedPlatform} />
          </CardContent>
        </Card>
      </section>

      <section><SchedulerPanel campaigns={campaigns} /></section>
    </>
  );
}
