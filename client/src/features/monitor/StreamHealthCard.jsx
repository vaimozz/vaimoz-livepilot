import { useEffect, useRef, useState } from 'react';
import { Activity, CircleAlert, CircleCheck, CircleX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { cx } from '@/lib/cn.js';
import { api } from '@/lib/api.js';

const TARGET_FPS = 30;

function statusConfig(status) {
  switch (status) {
    case 'healthy':
      return { label: 'HEALTHY', icon: CircleCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400' };
    case 'degraded':
      return { label: 'DEGRADED', icon: CircleAlert, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-400' };
    default:
      return { label: 'CRITICAL', icon: CircleX, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500' };
  }
}

function relativeTime(isoString) {
  if (!isoString) return 'Tidak ada data';
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 5) return 'Baru saja';
  if (seconds < 60) return `${seconds} detik lalu`;
  return `${Math.floor(seconds / 60)} menit lalu`;
}

/**
 * Komponen card yang menampilkan metrik kesehatan stream secara realtime via SSE.
 * @param {number} streamId
 * @param {string} campaignName
 * @param {string} platform
 */
export function StreamHealthCard({ streamId, campaignName, platform }) {
  const [health, setHealth] = useState(null);
  const [connected, setConnected] = useState(false);
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!streamId) return;

    setConnected(false);

    const cancel = api.streamHealth.subscribe(
      streamId,
      (data) => {
        setHealth(data);
        setConnected(true);
      },
      () => {
        setConnected(false);
      }
    );

    cancelRef.current = cancel;
    return () => {
      cancel?.();
    };
  }, [streamId]);

  const cfg = statusConfig(health?.status ?? 'critical');
  const StatusIcon = cfg.icon;
  const fpsPct = Math.min(100, ((health?.fps ?? 0) / TARGET_FPS) * 100);

  return (
    <Card className="rounded-2xl border bg-slate-900/70 shadow-xl overflow-hidden" style={{ borderColor: 'var(--border-primary)' }}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="h-4 w-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{campaignName || `Stream #${streamId}`}</p>
              <p className="text-[10px] text-slate-500">{platform} • #{streamId}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className={cx('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider', cfg.bg, cfg.border, cfg.color)}>
            <span className={cx('h-1.5 w-1.5 rounded-full animate-pulse', cfg.dot)} />
            {cfg.label}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* FPS */}
          <div className="rounded-xl bg-slate-800/60 p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">FPS</p>
            <p className="text-lg font-bold text-white tabular-nums">{(health?.fps ?? 0).toFixed(1)}</p>
            <div className="mt-1.5 h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${fpsPct}%`, backgroundColor: fpsPct >= 80 ? '#10b981' : fpsPct >= 40 ? '#f59e0b' : '#ef4444' }}
              />
            </div>
            <p className="text-[10px] text-slate-600 mt-0.5">target {TARGET_FPS} fps</p>
          </div>

          {/* Bitrate */}
          <div className="rounded-xl bg-slate-800/60 p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Bitrate</p>
            <p className="text-lg font-bold text-white tabular-nums">
              {health?.bitrate ? (health.bitrate >= 1000 ? `${(health.bitrate / 1000).toFixed(1)}M` : `${health.bitrate.toFixed(0)}k`) : '0'}
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">kbits/s</p>
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-3 gap-2">
          {/* Frame */}
          <div className="rounded-xl bg-slate-800/40 p-2 text-center">
            <p className="text-[9px] uppercase text-slate-500">Frame</p>
            <p className="text-xs font-bold text-slate-200 tabular-nums">
              {(health?.frame ?? 0).toLocaleString('id-ID')}
            </p>
          </div>

          {/* Drop Frames */}
          <div className="rounded-xl bg-slate-800/40 p-2 text-center">
            <p className="text-[9px] uppercase text-slate-500">Drop</p>
            <p className={cx('text-xs font-bold tabular-nums', (health?.dropFrames ?? 0) > 0 ? 'text-red-400' : 'text-slate-200')}>
              {health?.dropFrames ?? 0}
            </p>
          </div>

          {/* Speed */}
          <div className="rounded-xl bg-slate-800/40 p-2 text-center">
            <p className="text-[9px] uppercase text-slate-500">Speed</p>
            <p className="text-xs font-bold text-slate-200 tabular-nums">
              {health?.speed || '–'}
            </p>
          </div>
        </div>

        {/* Update time */}
        <p className="mt-2 text-[10px] text-slate-600 text-right">
          {connected ? `⟳ ${relativeTime(health?.updatedAt)}` : 'Menunggu data...'}
        </p>
      </CardContent>
    </Card>
  );
}
