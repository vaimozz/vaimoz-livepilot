import { useState, useEffect } from 'react';
import { Calendar, Play, Pause, Trash2, Plus, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { StatusPill } from '@/components/shared/Badges.jsx';
import { 
  formatRecurringSchedule, 
  formatDurationMode,
  getRecurringTypeLabel 
} from '@/lib/campaignUtils.js';
import api from '@/lib/api.js';

export function RecurringSchedulePage({ setActivePage }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadScheduledCampaigns();
  }, []);

  const loadScheduledCampaigns = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/api/scheduler/campaigns');
      setCampaigns(response.data);
    } catch (error) {
      console.error('Failed to load scheduled campaigns:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePause = async (campaignId) => {
    try {
      await api.post(`/api/scheduler/campaigns/${campaignId}/pause`);
      loadScheduledCampaigns();
    } catch (error) {
      console.error('Failed to pause campaign:', error);
      alert('Gagal menjeda campaign');
    }
  };

  const handleResume = async (campaignId) => {
    try {
      await api.post(`/api/scheduler/campaigns/${campaignId}/resume`);
      loadScheduledCampaigns();
    } catch (error) {
      console.error('Failed to resume campaign:', error);
      alert('Gagal melanjutkan campaign');
    }
  };

  const handleUnschedule = async (campaignId) => {
    if (!confirm('Yakin ingin menghapus jadwal campaign ini?')) return;
    
    try {
      await api.post(`/api/scheduler/campaigns/${campaignId}/unschedule`);
      loadScheduledCampaigns();
    } catch (error) {
      console.error('Failed to unschedule campaign:', error);
      alert('Gagal menghapus jadwal');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12 text-slate-500">
          <RefreshCw className="h-12 w-12 mx-auto mb-3 animate-spin" />
          <p>Memuat jadwal campaign...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Calendar className="h-8 w-8 text-cyan-400" />
              Recurring Schedule
            </h1>
            <p className="text-slate-400 mt-2">
              Kelola jadwal berulang untuk campaign otomatis
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={loadScheduledCampaigns}
              disabled={refreshing}
              className="bg-slate-800 hover:bg-slate-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setActivePage?.('Kampanye Live')}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Buat Campaign Baru
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card className="rounded-3xl border-slate-800 bg-slate-900/70">
          <CardContent className="p-6">
            <div className="text-sm text-slate-400 mb-2">Total Scheduled</div>
            <div className="text-3xl font-bold text-white">
              {campaigns.length}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-slate-800 bg-slate-900/70">
          <CardContent className="p-6">
            <div className="text-sm text-slate-400 mb-2">Active</div>
            <div className="text-3xl font-bold text-green-400">
              {campaigns.filter(c => c.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-slate-800 bg-slate-900/70">
          <CardContent className="p-6">
            <div className="text-sm text-slate-400 mb-2">Paused</div>
            <div className="text-3xl font-bold text-yellow-400">
              {campaigns.filter(c => c.status === 'Paused').length}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-slate-800 bg-slate-900/70">
          <CardContent className="p-6">
            <div className="text-sm text-slate-400 mb-2">Total Executions</div>
            <div className="text-3xl font-bold text-cyan-400">
              {campaigns.reduce((sum, c) => sum + (c.execution_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      {campaigns.length > 0 ? (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="rounded-3xl border-slate-800 bg-slate-900/70 hover:border-slate-700 transition">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-white">{campaign.name}</h3>
                      <StatusPill status={campaign.status} />
                      {campaign.isActive && (
                        <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
                          Running
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Tipe Jadwal</div>
                        <div className="text-sm text-slate-300">
                          {getRecurringTypeLabel(campaign.recurring_type)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Jadwal</div>
                        <div className="text-sm text-slate-300">
                          {formatRecurringSchedule(
                            campaign.recurring_enabled,
                            campaign.recurring_type,
                            campaign.recurring_time,
                            campaign.recurring_days
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Eksekusi Terakhir</div>
                        <div className="text-sm text-slate-300">
                          {formatDate(campaign.last_executed_at)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Eksekusi Berikutnya</div>
                        <div className="text-sm text-cyan-400">
                          {formatDate(campaign.next_execution_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>Mode: {campaign.mode}</span>
                      <span>•</span>
                      <span>Total Eksekusi: {campaign.execution_count || 0}</span>
                      {campaign.recurring_end_date && (
                        <>
                          <span>•</span>
                          <span>Berakhir: {campaign.recurring_end_date}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    {campaign.status === 'Scheduled' && (
                      <Button
                        onClick={() => handlePause(campaign.id)}
                        className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20"
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    {campaign.status === 'Paused' && (
                      <Button
                        onClick={() => handleResume(campaign.id)}
                        className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      onClick={() => handleUnschedule(campaign.id)}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="rounded-3xl border-slate-800 bg-slate-900/70">
          <CardContent className="p-12">
            <div className="text-center text-slate-500">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Belum Ada Jadwal</h3>
              <p className="mb-6">
                Buat campaign baru dan atur recurring schedule untuk memulai
              </p>
              <Button
                onClick={() => setActivePage?.('Kampanye Live')}
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Buat Campaign Baru
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
