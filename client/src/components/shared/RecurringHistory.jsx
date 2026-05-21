import { useState, useEffect } from 'react';
import { History, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { formatExecutionStatus } from '@/lib/campaignUtils.js';
import api from '@/lib/api.js';

export function RecurringHistory({ campaignId }) {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (campaignId) {
      loadHistory();
      loadStats();
    }
  }, [campaignId]);

  const loadHistory = async () => {
    try {
      const response = await api.get(`/api/scheduler/campaigns/${campaignId}/history?limit=20`);
      setHistory(response.data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get(`/api/scheduler/campaigns/${campaignId}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="rounded-3xl border-slate-800 bg-slate-900/70">
        <CardContent className="p-6">
          <div className="text-center py-8 text-slate-500">
            <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p>Memuat riwayat...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-slate-800 bg-slate-900/70 shadow-xl">
      <CardContent className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="h-5 w-5 text-cyan-400" />
              Riwayat Eksekusi
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Histori recurring schedule campaign
            </p>
          </div>
        </div>

        {/* Statistics */}
        {stats && stats.stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700">
              <div className="text-xs text-slate-500 mb-1">Total Eksekusi</div>
              <div className="text-2xl font-bold text-white">
                {stats.stats.total_executions || 0}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
              <div className="text-xs text-green-400 mb-1">Berhasil</div>
              <div className="text-2xl font-bold text-green-300">
                {stats.stats.successful_executions || 0}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
              <div className="text-xs text-red-400 mb-1">Gagal</div>
              <div className="text-2xl font-bold text-red-300">
                {stats.stats.failed_executions || 0}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <div className="text-xs text-blue-400 mb-1">Rata-rata Durasi</div>
              <div className="text-2xl font-bold text-blue-300">
                {stats.stats.avg_duration ? Math.round(stats.stats.avg_duration) : 0}m
              </div>
            </div>
          </div>
        )}

        {/* History List */}
        {history.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history.map((item) => {
              const statusInfo = formatExecutionStatus(item.status);
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-700 bg-slate-800/50 hover:border-slate-600 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {item.status === 'success' ? (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-semibold ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(item.executed_at)}
                          </span>
                        </div>
                        {item.duration_minutes && (
                          <div className="text-xs text-slate-400">
                            Durasi: {item.duration_minutes} menit
                          </div>
                        )}
                        {item.error_message && (
                          <div className="text-xs text-red-400 mt-1">
                            Error: {item.error_message}
                          </div>
                        )}
                        {item.stream_id && (
                          <div className="text-xs text-cyan-400 mt-1">
                            Stream ID: #{item.stream_id}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Belum ada riwayat eksekusi</p>
            <p className="text-sm mt-1">Campaign akan muncul di sini setelah dijalankan</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
