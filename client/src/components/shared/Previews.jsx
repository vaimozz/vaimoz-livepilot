import { cx } from '@/lib/cn.js';

export function StreamPreview({ title, platform, isOnline, thumbnailUrl }) {
  const isYouTube = platform === 'YouTube';
  const accentClass = isYouTube ? 'from-red-500/30 to-slate-950' : 'from-blue-500/30 to-slate-950';
  const badgeClass = isYouTube ? 'bg-red-600' : 'bg-blue-600';
  const platformLabel = isYouTube ? 'YT' : platform === 'Facebook' ? 'FB' : 'RTMP';
  return (
    <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg shadow-black/20">
      {thumbnailUrl ? (
        <>
          <img src={thumbnailUrl} alt="Thumbnail" className="absolute inset-0 h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        </>
      ) : (
        <>
          <div className={cx('absolute inset-0 bg-gradient-to-br', accentClass)} />
          <div className="absolute inset-0 opacity-40"><div className="absolute left-3 top-3 h-8 w-16 rounded bg-white/10" /><div className="absolute bottom-4 left-3 h-1.5 w-16 rounded bg-white/20" /><div className="absolute bottom-2 left-3 h-1.5 w-10 rounded bg-white/10" /></div>
        </>
      )}
      <div className="absolute inset-0 flex items-center justify-center"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-xs text-white ring-1 ring-white/20">▶</div></div>
      <div className={cx('absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold text-white', badgeClass)}>{platformLabel}</div>
      {isOnline ? <div className="absolute right-1.5 top-1.5 rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">LIVE</div> : null}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4"><p className="truncate text-[10px] font-semibold text-white">{title}</p></div>
    </div>
  );
}

export function ThumbnailAssetPreview({ name, selected = false, url = '' }) {
  if (url) {
    return (
      <div className={cx('relative h-14 w-24 shrink-0 overflow-hidden rounded-xl border bg-slate-900 shadow-lg shadow-black/20', selected ? 'border-pink-300 ring-2 ring-pink-400/40' : 'border-slate-700')}>
        <img src={url} alt={name || 'Thumbnail preview'} className="h-full w-full object-cover" />
        {selected ? <div className="absolute right-1.5 top-1.5 rounded-full bg-pink-500 px-1.5 py-0.5 text-[9px] font-bold text-white">✓</div> : null}
      </div>
    );
  }

  return (
    <div className={cx('relative h-14 w-24 shrink-0 overflow-hidden rounded-xl border bg-gradient-to-br from-pink-500/30 via-purple-500/20 to-slate-950 shadow-lg shadow-black/20', selected ? 'border-pink-300 ring-2 ring-pink-400/40' : 'border-slate-700')}>
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
      <div className="absolute left-2 top-2 rounded-md bg-black/35 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white/90">Preview</div>
      <div className="absolute inset-x-2 bottom-2"><p className="truncate text-[10px] font-bold text-white drop-shadow">Thumbnail</p><div className="mt-1 h-1 w-10 rounded-full bg-white/35" /></div>
      {selected ? <div className="absolute right-1.5 top-1.5 rounded-full bg-pink-500 px-1.5 py-0.5 text-[9px] font-bold text-white">✓</div> : null}
    </div>
  );
}
