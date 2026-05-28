import { useEffect, useState, useMemo } from 'react';
import { 
  BarChart3, 
  Clock3, 
  Eye, 
  Flame, 
  MessageSquare, 
  Radio, 
  RefreshCw, 
  ThumbsUp, 
  Video,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Share2,
  Users
} from 'lucide-react';
import { 
  Area, 
  AreaChart, 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Cell, 
  Legend, 
  Pie, 
  PieChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from 'recharts';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { ActiveLiveStreamsWidget } from '@/components/shared/ActiveLiveStreamsWidget.jsx';
import { cx } from '@/lib/cn.js';
import { api } from '@/lib/api.js';

function AnalyticsStatCard({ title, value, note, icon: Icon, accentClass = 'text-white' }) {
  return (
    <Card className="rounded-3xl border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 shadow-xl shadow-black/10 transition-all duration-200 hover:-translate-y-1">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">{title}</p>
            <p className={cx('mt-4 text-3xl font-extrabold tracking-tight', accentClass)}>{value}</p>
            <p className="mt-2 text-xs text-[var(--text-tertiary)]">{note}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)]/70">
            <Icon className="h-5 w-5 text-[var(--text-secondary)]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState('Semua Kampanye');
  const [selectedPlatform, setSelectedPlatform] = useState('Semua Platform');
  const [selectedPeriod, setSelectedPeriod] = useState('Semua Waktu');
  
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [youtubeChannels, setYoutubeChannels] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [channelAnalytics, setChannelAnalytics] = useState(null);
  const [isLoadingChannelAnalytics, setIsLoadingChannelAnalytics] = useState(false);

  const [selectedStreams, setSelectedStreams] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Fetch data analitik dari backend
  const fetchAnalytics = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const params = {};
      if (selectedCampaign !== 'Semua Kampanye') {
        // Cari ID campaign
        const found = analyticsData?.campaignsList?.find(c => c.name === selectedCampaign);
        if (found) params.campaignId = found.id;
      }
      if (selectedPlatform !== 'Semua Platform') {
        params.platform = selectedPlatform;
      }
      if (selectedPeriod !== 'Semua Waktu') {
        params.period = selectedPeriod;
      }

      const result = await api.analytics.getGlobal(params);
      setAnalyticsData(result);
      
      setSelectedStreams([]); // Reset selection when data changes
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal mengambil data analitik.');
    } finally {
      setIsLoading(false);
    }
  };

  // Panggil fetch setiap kali filter berubah
  useEffect(() => {
    fetchAnalytics();
  }, [selectedCampaign, selectedPlatform, selectedPeriod]);

  // Load YouTube Channels
  useEffect(() => {
    api.youtube.channels().then(result => {
      setYoutubeChannels(result.channels || []);
    }).catch(console.error);
  }, []);

  // Load Channel Analytics
  useEffect(() => {
    if (!selectedChannelId) {
      setChannelAnalytics(null);
      return;
    }
    const fetchChannelAnalytics = async () => {
      setIsLoadingChannelAnalytics(true);
      try {
        const data = await api.youtube.analytics(selectedChannelId);
        setChannelAnalytics(data);
      } catch (err) {
        console.error('Failed to fetch channel analytics', err);
      } finally {
        setIsLoadingChannelAnalytics(false);
      }
    };
    fetchChannelAnalytics();
  }, [selectedChannelId]);

  const campaigns = useMemo(() => {
    if (!analyticsData?.campaignsList) return ['Semua Kampanye'];
    return ['Semua Kampanye', ...analyticsData.campaignsList.map(c => c.name)];
  }, [analyticsData]);

  const platforms = ['Semua Platform', 'YouTube API', 'Manual RTMP'];
  const periods = ['7 Hari Terakhir', '28 Hari Terakhir', '90 Hari Terakhir', '12 Bulan Terakhir', 'Semua Waktu'];

  const summary = analyticsData?.summary || {
    totalStreams: 0,
    totalViews: 0,
    peakViewers: 0,
    totalInteractions: 0,
    averageDurationMinutes: 0
  };

  const chartData = analyticsData?.chartData || [];
  const campaignPerformance = analyticsData?.campaignPerformance || [];
  const platformShare = analyticsData?.platformShare || [];
  const streamsHistory = analyticsData?.streams || [];

  // Warna-warni grafik
  const COLORS = ['#38bdf8', '#fb7185', '#a78bfa', '#34d399', '#fbbf24'];

  const formatDuration = (minutes) => {
    if (!minutes) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}j ${mins}m`;
  };

  const handleDeleteStreams = async () => {
    if (selectedStreams.length === 0) return;
    if (!window.confirm(`Yakin ingin menghapus ${selectedStreams.length} riwayat stream ini?`)) return;
    
    setIsDeleting(true);
    try {
      await api.streams.delete(selectedStreams);
      setSelectedStreams([]);
      fetchAnalytics();
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
      fetchAnalytics();
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
    <div className="space-y-6">
      {/* ── Panel Filter ── */}
      <Card className="rounded-3xl border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 shadow-xl shadow-black/10">
        <CardContent className="p-5">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div className="grid gap-4 sm:grid-cols-3 w-full xl:max-w-4xl">
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Kampanye
                <select 
                  value={selectedCampaign} 
                  onChange={(e) => setSelectedCampaign(e.target.value)} 
                  className="mt-2 h-12 w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-4 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                >
                  {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Platform
                <select 
                  value={selectedPlatform} 
                  onChange={(e) => setSelectedPlatform(e.target.value)} 
                  className="mt-2 h-12 w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-4 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                >
                  {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Periode
                <select 
                  value={selectedPeriod} 
                  onChange={(e) => setSelectedPeriod(e.target.value)} 
                  className="mt-2 h-12 w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-4 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                >
                  {periods.map((pe) => <option key={pe} value={pe}>{pe}</option>)}
                </select>
              </label>
            </div>
            
            <Button 
              variant="outline" 
              onClick={fetchAnalytics} 
              disabled={isLoading} 
              className="h-12 w-full xl:w-auto rounded-xl border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-6 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            >
              <RefreshCw className={cx("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Segarkan Data
            </Button>
          </div>
          {errorMessage && (
            <p className="mt-3 text-sm font-semibold text-rose-400">{errorMessage}</p>
          )}
        </CardContent>
      </Card>

      {/* ── Analitik Channel YouTube ── */}
      <Card className="rounded-3xl border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 shadow-xl shadow-black/10">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="inline-block h-5 w-1.5 rounded-full bg-red-500" />
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Analitik Channel YouTube</h3>
            </div>
            <div className="w-full md:w-64">
              <select 
                value={selectedChannelId} 
                onChange={(e) => setSelectedChannelId(e.target.value)} 
                className="h-10 w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-4 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
              >
                <option value="">Pilih Channel YouTube...</option>
                {youtubeChannels.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>
          
          {selectedChannelId ? (
            isLoadingChannelAnalytics ? (
              <div className="flex justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
              </div>
            ) : channelAnalytics ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <AnalyticsStatCard 
                  title="Estimasi Pendapatan" 
                  value={`$${channelAnalytics.estimatedRevenue.toFixed(2)}`} 
                  note="28 Hari Terakhir" 
                  icon={TrendingUp} 
                  accentClass="text-emerald-400" 
                />
                <AnalyticsStatCard 
                  title="Jam Tayang" 
                  value={channelAnalytics.estimatedMinutesWatched.toLocaleString('id-ID')} 
                  note="Menit (28 Hari Terakhir)" 
                  icon={Clock3} 
                  accentClass="text-purple-400" 
                />
                <AnalyticsStatCard 
                  title="Total Subscribers" 
                  value={channelAnalytics.subscribers.toLocaleString('id-ID')} 
                  note="Keseluruhan" 
                  icon={Users} 
                  accentClass="text-sky-400" 
                />
                <AnalyticsStatCard 
                  title="Total Views" 
                  value={channelAnalytics.totalViews.toLocaleString('id-ID')} 
                  note="Keseluruhan" 
                  icon={Video} 
                  accentClass="text-rose-400" 
                />
              </div>
            ) : null
          ) : (
            <div className="text-center text-sm text-[var(--text-tertiary)] p-8 border-2 border-dashed border-[var(--border-primary)] rounded-2xl">
              Pilih channel YouTube dari dropdown di atas untuk melihat analitik (Estimasi Pendapatan, Jam Tayang, Subscribers, dan Views).
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Statistik Utama ── */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <AnalyticsStatCard 
          title="Total Siaran" 
          value={String(summary.totalStreams)} 
          note="Sesi stream tersimpan" 
          icon={Radio} 
        />
        <AnalyticsStatCard 
          title="Total Penonton" 
          value={summary.totalViews.toLocaleString('id-ID')} 
          note="Kali ditonton akumulatif" 
          icon={Eye} 
          accentClass="text-sky-400" 
        />
        <AnalyticsStatCard 
          title="Puncak Penonton" 
          value={summary.peakViewers.toLocaleString('id-ID')} 
          note="Penonton serentak tertinggi" 
          icon={Flame} 
          accentClass="text-rose-400" 
        />
        <AnalyticsStatCard 
          title="Total Interaksi" 
          value={summary.totalInteractions.toLocaleString('id-ID')} 
          note="Jumlah Like & Komentar" 
          icon={ThumbsUp} 
          accentClass="text-emerald-400" 
        />
        <AnalyticsStatCard 
          title="Rata-rata Durasi" 
          value={formatDuration(summary.averageDurationMinutes)} 
          note="Per sesi live" 
          icon={Clock3} 
          accentClass="text-purple-400" 
        />
      </div>

      {/* ── Grafik Penonton & Views Harian ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Grafik Tren Harian */}
        <Card className="rounded-3xl border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 shadow-xl shadow-black/10 lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-block h-5 w-1.5 rounded-full bg-sky-400" />
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Tren Kinerja Harian</h3>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">Views • Puncak Penonton</p>
            </div>
            
            <div className="flex h-[360px] w-full items-center justify-center rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)]/20 p-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="viewersGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb7185" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#fb7185" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                    <XAxis dataKey="day" stroke="var(--text-tertiary)" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis stroke="var(--text-tertiary)" tickLine={false} axisLine={false} fontSize={11} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-primary)', 
                        borderRadius: '14px', 
                        color: 'var(--text-primary)' 
                      }} 
                      labelStyle={{ color: 'var(--text-secondary)', fontWeight: 'bold' }} 
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area type="monotone" dataKey="views" name="Total Views" stroke="#38bdf8" fill="url(#viewsGradient)" strokeWidth={3} />
                    <Area type="monotone" dataKey="viewers" name="Puncak Penonton" stroke="#fb7185" fill="url(#viewersGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-sm text-[var(--text-tertiary)]">Tidak ada data untuk periode ini</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Distribusi Platform */}
        <Card className="rounded-3xl border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 shadow-xl shadow-black/10">
          <CardContent className="p-5">
            <div className="mb-5 flex items-center gap-3">
              <span className="inline-block h-5 w-1.5 rounded-full bg-purple-400" />
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Pembagian Platform</h3>
            </div>
            
            <div className="flex h-[360px] flex-col items-center justify-center rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)]/20 p-4">
              {platformShare.length > 0 ? (
                <>
                  <div className="relative h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={platformShare}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {platformShare.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ 
                            background: 'var(--bg-secondary)', 
                            border: '1px solid var(--border-primary)', 
                            borderRadius: '12px' 
                          }}
                          itemStyle={{ color: '#f8fafc' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black text-[var(--text-primary)]">{summary.totalStreams}</span>
                      <span className="text-3xs font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Total Stream</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 justify-center text-xs font-semibold">
                    {platformShare.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-[var(--text-secondary)]">{entry.name}</span>
                        <span className="text-[var(--text-tertiary)]">({entry.value}x)</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center text-sm text-[var(--text-tertiary)]">Tidak ada data platform</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Performa per Kampanye & Ringkasan Detail ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Performa Kampanye */}
        <Card className="rounded-3xl border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 shadow-xl shadow-black/10 lg:col-span-1">
          <CardContent className="p-5">
            <div className="mb-5 flex items-center gap-3">
              <span className="inline-block h-5 w-1.5 rounded-full bg-emerald-400" />
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Kinerja per Kampanye</h3>
            </div>
            
            <div className="h-[360px] overflow-y-auto rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)]/20 p-4 space-y-4">
              {campaignPerformance.length > 0 ? (
                campaignPerformance.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between gap-4 border-b border-[var(--border-primary)] pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[var(--text-primary)]">{c.name}</p>
                      <p className="mt-1 text-2xs text-[var(--text-tertiary)]">{c.streamsCount}x Siaran</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-sky-400">{c.views.toLocaleString('id-ID')} Views</p>
                      <p className="mt-1 text-2xs text-[var(--text-tertiary)]">Puncak: {c.viewers} Penonton</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[var(--text-tertiary)]">Tidak ada data kampanye</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Interaksi Like vs Komentar */}
        <Card className="rounded-3xl border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 shadow-xl shadow-black/10 lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-block h-5 w-1.5 rounded-full bg-amber-400" />
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Analisis Interaksi Penonton</h3>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">Suka • Komentar</p>
            </div>
            
            <div className="flex h-[360px] w-full items-center justify-center rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)]/20 p-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                    <XAxis dataKey="day" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-primary)', 
                        borderRadius: '12px' 
                      }} 
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Bar dataKey="likes" name="Suka" fill="#34d399" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="comments" name="Komentar" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-sm text-[var(--text-tertiary)]">Tidak ada data interaksi</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabel Riwayat Stream Lengkap ── */}
      <Card className="rounded-3xl border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 shadow-xl shadow-black/10">
        <CardContent className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-block h-5 w-1.5 rounded-full bg-sky-400" />
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Riwayat Lengkap Sesi Stream</h3>
            </div>
            {selectedStreams.length > 0 && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSyncStreams}
                  disabled={isSyncing || isDeleting}
                  className="bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-sky-400 font-bold rounded-xl"
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
          
          <div className="overflow-x-auto rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)]/10">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]/40 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="px-5 py-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-[var(--border-primary)] bg-[var(--bg-tertiary)]" 
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
              <tbody className="divide-y divide-[var(--border-primary)] text-[var(--text-secondary)]">
                {streamsHistory.length > 0 ? (
                  streamsHistory.map((s) => {
                    const durationText = s.startedAt ? formatDuration(
                      Math.round(((s.stoppedAt ? new Date(s.stoppedAt).getTime() : Date.now()) - new Date(s.startedAt).getTime()) / 60000)
                    ) : '-';
                    const isOnline = ['Online', 'Starting'].includes(s.status);
                    return (
                      <tr key={s.id} className="hover:bg-[var(--bg-secondary)]/40 transition-colors">
                        <td className="px-5 py-4 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-[var(--border-primary)] bg-[var(--bg-tertiary)]" 
                            checked={selectedStreams.includes(s.id)}
                            onChange={() => toggleSelectStream(s.id)}
                          />
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-extrabold text-[var(--text-primary)]">{s.chosenTitle || 'Stream Tanpa Judul'}</p>
                          <p className="text-2xs text-[var(--text-tertiary)] mt-0.5">{s.campaignName || 'Sesi Manual'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] px-2 py-0.5 text-2xs font-semibold">
                            {s.platform}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-2xs">
                          {s.startedAt ? new Date(s.startedAt).toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="px-4 py-4 text-xs font-bold">
                          {durationText}
                        </td>
                        <td className="px-4 py-4 text-center font-extrabold text-[var(--text-primary)]">
                          {(s.youtubeTotalViews || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-4 text-center font-extrabold text-rose-400">
                          {(s.youtubeConcurrentViewers || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-4 text-center text-xs">
                          <span className="text-emerald-400 font-semibold">{s.youtubeLikes || 0}</span>
                          <span className="text-[var(--text-tertiary)] mx-1">/</span>
                          <span className="text-purple-400 font-semibold">{s.youtubeComments || 0}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={cx(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider",
                            s.status === 'Online' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse" :
                            s.status === 'Starting' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] border border-[var(--border-primary)]"
                          )}>
                            {isOnline && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                            {s.status === 'Online' ? 'LIVE' : s.status === 'Starting' ? 'STARTING' : 'OFFLINE'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="px-5 py-8 text-center text-[var(--text-tertiary)] bg-[var(--bg-secondary)]/10">
                      Belum ada riwayat sesi streaming yang tersimpan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Unified Active Live Streams Widget ── */}
      <ActiveLiveStreamsWidget />
    </div>
  );
}
