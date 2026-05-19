import { useEffect, useRef, useState } from 'react';
import { CloudDownload, Link2, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api.js';
import { normalizeAssetFromApi } from '@/lib/assetUtils.js';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function GDriveModal({ onClose, onAssetAdded }) {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState('input'); // input | downloading | done | error
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [filename, setFilename] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  useEffect(() => () => stopPolling(), []);

  const startDownload = async () => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    setPhase('downloading');
    try {
      const { jobId } = await api.assets.gdriveStart(cleanUrl);
      pollRef.current = setInterval(async () => {
        try {
          const job = await api.assets.gdriveProgress(jobId);
          if (job.filename) setFilename(job.filename);
          setProgress(job.progress || 0);
          setTotal(job.total || 0);
          if (job.status === 'done') {
            stopPolling();
            setPhase('done');
            // Panggil callback segera, lalu auto-tutup setelah 1.5 detik
            if (job.asset) {
              onAssetAdded(normalizeAssetFromApi(job.asset));
            }
          } else if (job.status === 'error') {
            stopPolling();
            setErrorMsg(job.error || 'Download gagal.');
            setPhase('error');
          }
        } catch (err) {
          stopPolling();
          setErrorMsg(err.message);
          setPhase('error');
        }
      }, 600);
    } catch (err) {
      setErrorMsg(err.message);
      setPhase('error');
    }
  };

  const percentage = total > 0 ? Math.min(100, Math.round((progress / total) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-[480px] rounded-2xl border border-slate-700/80 bg-[#0f172a] shadow-2xl shadow-black/40">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/30">
              <CloudDownload className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-base font-bold text-white">Unduh Video dari GDrive</h2>
          </div>
          <button
            onClick={onClose}
            disabled={phase === 'downloading'}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">

          {/* Phase: input */}
          {phase === 'input' && (
            <>
              <div className="mb-5">
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  URL/ID GDRIVE
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-slate-600 bg-slate-800/70 px-4 py-3 focus-within:border-blue-500 transition">
                  <Link2 className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  <input
                    autoFocus
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && startDownload()}
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    placeholder="Masukkan URL atau ID Google Drive"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Pastikan link GDrive berstatus{' '}
                  <strong className="text-slate-200">"Anyone with the link"</strong>{' '}
                  (Publik) agar server bisa mengunduhnya.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-slate-600 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-300 hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  onClick={startDownload}
                  disabled={!url.trim()}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-blue-500 disabled:opacity-40 transition shadow-lg shadow-blue-600/20"
                >
                  Unduh
                </button>
              </div>
            </>
          )}

          {/* Phase: downloading */}
          {phase === 'downloading' && (
            <div className="space-y-4 py-1">
              <div className="flex items-start gap-3">
                <Loader2 className="mt-0.5 h-5 w-5 flex-shrink-0 animate-spin text-blue-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {filename || 'Menghubungkan ke Google Drive...'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {total > 0 ? `${formatBytes(progress)} / ${formatBytes(total)}` : 'Menginisialisasi...'}
                  </p>
                </div>
                {total > 0 && (
                  <span className="flex-shrink-0 text-sm font-bold text-blue-400">{percentage}%</span>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500 ease-out"
                  style={{ width: total > 0 ? `${percentage}%` : '15%', animation: total === 0 ? 'pulse 1.5s ease-in-out infinite' : 'none' }}
                />
              </div>

              <p className="text-center text-[11px] text-slate-500">
                Jangan tutup modal ini selama proses unduh berlangsung.
              </p>
            </div>
          )}

          {/* Phase: done */}
          {phase === 'done' && (
            <div className="space-y-4 py-1">
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-emerald-300">Berhasil diunduh!</p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">{filename}</p>
                  <p className="mt-1 text-[11px] text-emerald-500">Menutup dan memperbarui pustaka...</p>
                </div>
              </div>
            </div>
          )}

          {/* Phase: error */}
          {phase === 'error' && (
            <div className="space-y-4 py-1">
              <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-red-300">Unduh Gagal</p>
                  <p className="mt-0.5 text-xs text-slate-400">{errorMsg}</p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-slate-600 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-300 hover:bg-slate-800 transition"
                >
                  Tutup
                </button>
                <button
                  onClick={() => { setPhase('input'); setErrorMsg(''); setProgress(0); setTotal(0); setFilename(''); }}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-blue-500 transition"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
