import { useEffect, useRef } from 'react';
import { X, Film, Music, Image as ImageIcon } from 'lucide-react';

/**
 * Modal full-screen preview untuk aset media.
 * Mendukung Video, Audio, dan Gambar.
 */
export function AssetPreviewModal({ item, onClose }) {
  const overlayRef = useRef(null);

  // Tutup dengan tombol ESC
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Cegah scroll body saat modal terbuka
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Klik di luar konten → tutup
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const typeBadgeColor = {
    Video: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    Audio: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    Images: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  }[item.type] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';

  const TypeIcon = item.type === 'Video' ? Film : item.type === 'Audio' ? Music : ImageIcon;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div className="relative flex w-full max-w-4xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/70 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <TypeIcon className="h-5 w-5 shrink-0 text-slate-400" />
            <p className="truncate text-sm font-bold text-white">{item.name}</p>
            <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${typeBadgeColor}`}>
              {item.type}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-400 transition hover:border-slate-500 hover:bg-slate-700 hover:text-white"
            aria-label="Tutup preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — konten media */}
        <div className="flex flex-1 items-center justify-center overflow-hidden bg-slate-950 min-h-[240px]">
          {item.type === 'Video' && item.url ? (
            <video
              src={item.url}
              controls
              autoPlay
              loop
              className="max-h-[60vh] w-full object-contain"
            />
          ) : item.type === 'Audio' && item.url ? (
            <div className="flex w-full flex-col items-center justify-center gap-6 px-8 py-10">
              {/* Visualisasi waveform statis */}
              <div className="flex items-end gap-1 h-16">
                {[4, 7, 5, 9, 6, 11, 8, 13, 9, 11, 7, 14, 10, 12, 8, 10, 6, 9, 5, 7, 4, 8, 6, 10, 7].map((h, i) => (
                  <span
                    key={i}
                    className="w-1.5 rounded-full bg-gradient-to-t from-purple-600 to-purple-300"
                    style={{ height: `${h * 4}px`, opacity: 0.5 + (i % 5) * 0.1 }}
                  />
                ))}
              </div>
              <audio
                src={item.url}
                controls
                autoPlay
                loop
                className="w-full max-w-md"
              />
            </div>
          ) : item.type === 'Images' && item.url ? (
            <img
              src={item.url}
              alt={item.name}
              className="max-h-[60vh] max-w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
              <TypeIcon className="h-16 w-16 opacity-40" />
              <p className="text-sm">Preview tidak tersedia</p>
            </div>
          )}
        </div>

        {/* Footer — info file */}
        <div className="shrink-0 border-t border-slate-800 bg-slate-950/70 px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-400">
            {item.size && (
              <span>
                <span className="text-slate-500">Ukuran:</span> {item.size}
              </span>
            )}
            {(item.resolution || item.duration) && (
              <span>
                <span className="text-slate-500">{item.type === 'Video' || item.type === 'Audio' ? 'Durasi' : 'Resolusi'}:</span>{' '}
                {item.resolution || item.duration}
              </span>
            )}
            {item.source && (
              <span>
                <span className="text-slate-500">Sumber:</span> {item.source}
              </span>
            )}
            <span className="ml-auto text-slate-600 text-[10px]">ESC untuk menutup</span>
          </div>
        </div>
      </div>
    </div>
  );
}
