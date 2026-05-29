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
  YAxis,
  LineChart,
  Line
} from 'recharts';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';

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
  const [selectedChannelId, setSelectedChannelId] = useState('all');
  const [channelAnalytics, setChannelAnalytics] = useState(null);
  const [isLoadingChannelAnalytics, setIsLoadingChannelAnalytics] = useState(false);

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

  const fetchChannelAnalytics = async (channelId = selectedChannelId) => {
    if (!channelId) {
      setChannelAnalytics(null);
      return;
    }
    setIsLoadingChannelAnalytics(true);
    try {
      const data = await api.youtube.analytics(channelId);
      setChannelAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch channel analytics', err);
    } finally {
      setIsLoadingChannelAnalytics(false);
    }
  };

  // Load Channel Analytics
  useEffect(() => {
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
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 rounded-2xl bg-[var(--bg-secondary)]/80 p-4 border border-[var(--border-primary)] shadow-sm">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="flex-1 md:flex-none">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Channel</label>
              <select 
                value={selectedChannelId} 
                onChange={(e) => setSelectedChannelId(e.target.value)} 
                className="h-10 w-full md:w-56 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-4 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              >
                <option value="all">Semua Channel</option>
                {youtubeChannels.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 md:flex-none">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Periode</label>
              <select 
                className="h-10 w-full md:w-48 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-4 text-sm font-semibold text-[var(--text-secondary)] outline-none"
                disabled
              >
                <option>28 Hari Terakhir</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <span className="text-xs font-semibold text-[var(--text-tertiary)]">Update: {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
            <Button variant="outline" size="sm" onClick={() => fetchChannelAnalytics(selectedChannelId)} disabled={isLoadingChannelAnalytics} className="rounded-xl border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] font-bold">
              <RefreshCw className={cx("mr-2 h-4 w-4", isLoadingChannelAnalytics && "animate-spin")} /> Refresh Data
            </Button>
          </div>
        </div>

        {selectedChannelId ? (
          isLoadingChannelAnalytics ? (
            <div className="flex justify-center p-12">
              <RefreshCw className="h-10 w-10 animate-spin text-cyan-400" />
            </div>
          ) : channelAnalytics ? (
            <>
              <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="rounded-2xl border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 shadow-sm hover:border-cyan-500/30 transition-colors">
                  <CardContent className="p-5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Estimasi Pendapatan</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <h3 className="text-3xl font-extrabold text-emerald-400">Rp {(channelAnalytics.estimatedRevenue * 16000 || 0).toLocaleString('id-ID')}</h3>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)] font-medium">~ USD {channelAnalytics.estimatedRevenue?.toFixed(2) || '0.00'}</p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 shadow-sm hover:border-cyan-500/30 transition-colors">
                  <CardContent className="p-5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Jam Tayang</p>
                    <div className="mt-2">
                      <h3 className="text-3xl font-extrabold text-rose-400">{(Math.round((channelAnalytics.estimatedMinutesWatched || 0) / 60)).toLocaleString('id-ID')}</h3>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)] font-medium">Total Jam (28 Hari)</p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 shadow-sm hover:border-cyan-500/30 transition-colors">
                  <CardContent className="p-5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Subscribers</p>
                    <div className="mt-2">
                      <h3 className="text-3xl font-extrabold text-[var(--text-primary)]">{(channelAnalytics.subscribers || 0).toLocaleString('id-ID')}</h3>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)] font-medium">Keseluruhan</p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 shadow-sm hover:border-cyan-500/30 transition-colors">
                  <CardContent className="p-5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Total Views</p>
                    <div className="mt-2">
                      <h3 className="text-3xl font-extrabold text-sky-400">{(channelAnalytics.totalViews || 0).toLocaleString('id-ID')}</h3>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)] font-medium">Kali Ditonton</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-3xl border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 shadow-xl shadow-black/10">
                <CardContent className="p-5">
                  <div className="mb-6 flex items-center gap-3">
                    <span className="inline-block h-5 w-1.5 rounded-full bg-rose-500" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Grafik Performa</h3>
                  </div>
                  
                  <div className="h-[300px] w-full">
                    {channelAnalytics.dailyData && channelAnalytics.dailyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={channelAnalytics.dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                          <XAxis 
                            dataKey="day" 
                            stroke="var(--text-tertiary)" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(val) => {
                              const date = new Date(val);
                              return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                            }}
                          />
                          <YAxis 
                            yAxisId="left"
                            stroke="var(--text-tertiary)" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            stroke="var(--text-tertiary)" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                          />
                          <Tooltip 
                            contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '8px', color: 'var(--text-primary)' }}
                            labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 'bold' }}
                            formatter={(value, name) => [name === 'Pendapatan (USD)' ? `$${Number(value).toFixed(2)}` : value, name]}
                          />
                          <Legend verticalAlign="top" height={36} iconType="plainline" wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }} />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="estimatedRevenue" 
                            name="Pendapatan (USD)" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                            activeDot={{ r: 5 }}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="views" 
                            name="Views" 
                            stroke="#38bdf8" 
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={{ r: 3, fill: '#38bdf8', strokeWidth: 0 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-semibold text-[var(--text-tertiary)] border border-dashed border-[var(--border-primary)] rounded-2xl">
                        Tidak ada data grafik harian (28 Hari Terakhir)
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null
        ) : (
          <div className="text-center text-sm font-semibold text-[var(--text-tertiary)] p-8 border-2 border-dashed border-[var(--border-primary)] rounded-2xl">
            Pilih channel YouTube dari dropdown di atas untuk melihat analitik.
          </div>
        )}
      </div>

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
  );
}
