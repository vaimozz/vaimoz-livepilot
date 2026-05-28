import { useEffect, useState, useCallback, useRef } from 'react';
import { Square, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { api } from '@/lib/api.js';

export function ActiveLiveStreamsWidget() {
  const [activeStreams, setActiveStreams] = useState([]);
  const [activeStreamStats, setActiveStreamStats] = useState({});
  const [isStopping, setIsStopping] = useState(false);
  const intervalRef = useRef(null);

  const fetchActiveStreams = useCallback(async () => {
    try {
      const res = await api.streams.running();
      const streams = res.streams || [];
      setActiveStreams(streams);

      // Fetch analytics for YouTube API streams
      if (streams.length > 0) {
        const statsPromises = streams.map(async (stream) => {
          if (stream.campaignId && stream.platform === 'YouTube API') {
            try {
              const analyticsRes = await api.analytics.get(stream.campaignId);
              return { streamId: stream.id, stats: analyticsRes.analytics };
            } catch (err) {
              return null;
            }
          }
          return null;
        });

        const results = await Promise.all(statsPromises);
        const newStats = {};
        results.forEach((r) => {
          if (r && r.stats) {
            newStats[r.streamId] = r.stats;
          }
        });
        setActiveStreamStats(newStats);
      }
    } catch (error) {
      console.error('Gagal mengambil stream aktif:', error);
    }
  }, []);

  useEffect(() => {
    fetchActiveStreams();
    intervalRef.current = setInterval(fetchActiveStreams, 10000);
    return () => clearInterval(intervalRef.current);
  }, [fetchActiveStreams]);

  const handleStopStream = async (streamId, campaignId) => {
    if (!window.confirm(`Yakin ingin menghentikan stream ini?`)) return;
    setIsStopping(true);
    try {
      if (campaignId) {
        await api.campaigns.stop(campaignId);
      } else {
        await api.streams.stop(streamId);
      }
      fetchActiveStreams();
    } catch (error) {
      alert(`Gagal menghentikan stream: ${error.message}`);
    } finally {
      setIsStopping(false);
    }
  };

  if (activeStreams.length === 0) return null;

  return (
    <div className="space-y-2 pt-4">
      <div className="grid gap-2">
        {activeStreams.map((stream) => {
          const stats = activeStreamStats[stream.id] || {
            concurrentViewers: stream.youtubeConcurrentViewers || 0,
            totalViews: stream.youtubeTotalViews || 0,
            likes: stream.youtubeLikes || 0,
            comments: stream.youtubeComments || 0,
          };
          
          return (
            <Card
              key={stream.id}
              className="relative overflow-hidden rounded-xl border-rose-500/20 bg-rose-500/5 shadow-sm hover:border-rose-500/40 transition-colors"
            >
              <CardContent className="p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1.5 min-w-0 flex-1 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400">
                        SIARAN LANGSUNG AKTIF
                      </span>
                      <span className="rounded-full bg-[var(--bg-tertiary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)] border border-[var(--border-primary)]">
                        {stream.platform}
                      </span>
                      {stream.pid && (
                        <span className="text-[10px] font-mono text-cyan-400 ml-2">PID: {stream.pid}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-extrabold text-[var(--text-primary)] truncate">
                      {stream.chosenTitle || 'Siaran Langsung Tanpa Judul'}
                    </h3>
                    <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
                      <span>Mulai sejak: {stream.startedAt ? new Date(stream.startedAt).toLocaleString('id-ID') : '-'}</span>
                      {stream.youtubeWatchUrl && (
                        <a
                          href={stream.youtubeWatchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" /> Buka YT
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:min-w-[420px] justify-between">
                    <div className="flex gap-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)]/40 p-2.5 flex-1 justify-between">
                      <div className="text-center flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                          Penonton
                        </p>
                        <p className="mt-0.5 text-sm font-black text-rose-400">
                          {(stats.concurrentViewers || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="text-center flex-1 border-l border-[var(--border-primary)] pl-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                          Tayangan
                        </p>
                        <p className="mt-0.5 text-sm font-black text-sky-400">
                          {(stats.totalViews || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="text-center flex-1 border-l border-[var(--border-primary)] pl-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                          Suka
                        </p>
                        <p className="mt-0.5 text-sm font-black text-emerald-400">
                          {(stats.likes || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="text-center flex-1 border-l border-[var(--border-primary)] pl-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                          Komen
                        </p>
                        <p className="mt-0.5 text-sm font-black text-purple-400">
                          {(stats.comments || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleStopStream(stream.id, stream.campaignId)}
                      disabled={isStopping}
                      className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition-colors h-[54px] sm:h-auto sm:self-stretch disabled:opacity-50"
                    >
                      <Square className="h-3 w-3 fill-white" /> Stop
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
