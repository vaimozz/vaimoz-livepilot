import React, { useState, useEffect } from 'react';
import { BarChart2, RefreshCw, AlertTriangle } from 'lucide-react';

export default function ApiMonitorWidget() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonitor();
    const interval = setInterval(fetchMonitor, 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchMonitor = async () => {
    try {
      const res = await fetch('/api/youtube/monitor');
      const data = await res.json();
      if (data.projects) {
        setStats(data.projects);
      }
    } catch (e) {
      console.error('Gagal mengambil data monitor:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-5 w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-indigo-400" /> Monitor YouTube API Quota
        </h3>
        <button onClick={fetchMonitor} className="text-gray-400 hover:text-white p-1">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {stats.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Belum ada project API yang dikonfigurasi.</p>
        ) : (
          stats.map((proj, idx) => {
            const pct = Math.min(100, (proj.quotaUsed / proj.quotaLimit) * 100);
            const isDanger = pct > 90;
            const isWarning = pct > 75;
            
            let colorClass = 'bg-emerald-500';
            if (isDanger) colorClass = 'bg-red-500';
            else if (isWarning) colorClass = 'bg-amber-500';

            return (
              <div key={idx} className={`p-3 rounded-xl border ${proj.isActive ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-black/20 border-white/5'}`}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">{proj.name}</span>
                    {proj.isActive && (
                      <span className="text-[10px] uppercase font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-full">Aktif</span>
                    )}
                    {proj.isPrimary && !proj.isActive && (
                      <span className="text-[10px] uppercase font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">Utama</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 font-mono">
                    {proj.quotaUsed.toLocaleString()} / {proj.quotaLimit.toLocaleString()}
                  </span>
                </div>
                
                <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full ${colorClass} transition-all duration-1000`} 
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
                
                {isDanger && (
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Kuota hampir habis!
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
      
      <p className="text-[11px] text-gray-500 mt-4 text-center">
        *Estimasi mandiri sistem Vaimoz. Mereset setiap hari pada 00:00 UTC.
      </p>
    </div>
  );
}
