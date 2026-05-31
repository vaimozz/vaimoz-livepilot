import { useEffect, useState } from 'react';
import { Database, ShieldCheck } from 'lucide-react';
import { cx } from '@/lib/cn.js';
import { menuItems } from '@/data/navigation.jsx';
import { api } from '@/lib/api.js';

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

export function Sidebar({ activePage, setActivePage }) {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await api.monitor.metrics();
        setMetrics(data);
      } catch (error) {
        // Abaikan error jaringan saat unmounted atau offline
      }
    };
    fetchMetrics();
    const timer = setInterval(fetchMetrics, 5000);
    return () => clearInterval(timer);
  }, []);

  const youtubeActive = metrics?.apiStatus?.youtube || false;
  const isFfmpegRunning = (metrics?.streams?.length || 0) > 0;
  
  const usedBytes = metrics?.disk?.usedBytes || 0;
  const capacityBytes = 50 * 1024 * 1024 * 1024; // Asumsi kapasitas 50GB
  const storagePercent = Math.min(100, Math.max(0, (usedBytes / capacityBytes) * 100));

  return (
    <aside className="glass-panel sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 overflow-y-auto border-r p-5 lg:block transition-all duration-300">
      <nav className="space-y-2 rounded-3xl bg-slate-900/40 p-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.label;
          return (
            <button 
              key={item.label} 
              type="button" 
              onClick={() => setActivePage(item.label)} 
              className={cx(
                'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all duration-200 hover:scale-[1.02]',
                isActive ? 'bg-slate-800 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              )}
            >
              <Icon className="h-4 w-4" style={{ color: isActive ? '#ffffff' : 'var(--text-muted)' }} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-5 rounded-3xl bg-slate-900/40 p-4 transition-all duration-300 ring-1 ring-white/5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          <ShieldCheck className="h-4 w-4" style={{ color: 'var(--success)' }} /> Status API
        </div>
        <div className="space-y-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex justify-between">
            <span>YouTube API v3</span>
            <span style={{ color: youtubeActive ? 'var(--success)' : 'var(--warning)' }}>
              {youtubeActive ? 'Terkoneksi' : 'Belum dikonfigurasi'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Facebook Live API</span>
            <span style={{ color: 'var(--text-muted)' }}>Belum Didukung</span>
          </div>
          <div className="flex justify-between">
            <span>FFmpeg Runner</span>
            <span style={{ color: isFfmpegRunning ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
              {isFfmpegRunning ? 'Sedang Berjalan' : 'Idle'}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-3xl bg-slate-900/40 p-4 transition-all duration-300 ring-1 ring-white/5">
        <div className="mb-3 flex items-center justify-between text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} /> Penyimpanan Lokal
          </div>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {formatBytes(usedBytes)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(2, storagePercent)}%`, backgroundColor: 'var(--accent-primary)' }} />
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          {usedBytes > 0 ? `${formatBytes(usedBytes)} terpakai` : 'Belum ada aset tersimpan'}
        </p>
      </div>
    </aside>
  );
}

