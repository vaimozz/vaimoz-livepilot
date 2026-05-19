import { useRef } from 'react';
import { Activity, FileVideo, Image as ImageIcon, Trash2, Music2 } from 'lucide-react';
import { AssetNameEditor } from './AssetNameEditor.jsx';
import { cx } from '@/lib/cn.js';

function MediaPreview({ item }) {
  const videoRef = useRef(null);
  const { url, type, name } = item;

  if (type === 'Images' && url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-full w-full object-cover"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }

  if (type === 'Video' && url) {
    return (
      <video
        ref={videoRef}
        src={url}
        className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
        muted
        playsInline
        preload="metadata"
        onMouseEnter={() => videoRef.current?.play()}
        onMouseLeave={() => { if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; } }}
      />
    );
  }

  if (type === 'Audio') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-end gap-0.5 h-8">
          {[3, 6, 4, 8, 5, 7, 3, 6].map((h, i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-gradient-to-t from-cyan-600 to-cyan-300"
              style={{ height: `${h * 4}px`, opacity: 0.7 + i * 0.03 }}
            />
          ))}
        </div>
      </div>
    );
  }

  const TypeIcon = type === 'Images' ? ImageIcon : type === 'Video' ? FileVideo : Music2;
  return (
    <div className="flex h-full items-center justify-center">
      <TypeIcon className="h-9 w-9 text-slate-500" />
    </div>
  );
}

export function AssetMediaCard({ item, isSelected, onToggleSelect, onDelete, viewMode, isEditing, editName, onStartEdit, onEditNameChange, onSaveRename, onCancelRename }) {
  const isVideo = item.type === 'Video';
  const isAudio = item.type === 'Audio';
  const isImage = item.type === 'Images';
  const TypeIcon = isImage ? ImageIcon : isVideo ? FileVideo : Activity;

  if (viewMode === 'list') {
    return (
      <div className="grid grid-cols-12 items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm transition hover:border-cyan-400/40">
        <div className="col-span-5 flex items-center gap-3">
          <button type="button" onClick={() => onToggleSelect(item.id)} className={cx('h-5 w-5 flex-shrink-0 rounded border transition', isSelected ? 'border-emerald-400 bg-emerald-500' : 'border-slate-500 bg-slate-800')} />
          <div className="relative h-10 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
            <MediaPreview item={item} />
          </div>
          <div className="min-w-0 flex-1">
            {isEditing
              ? <AssetNameEditor value={editName} onChange={onEditNameChange} onSave={onSaveRename} onCancel={onCancelRename} compact />
              : <><p className="truncate font-bold text-white">{item.name}</p><p className="text-xs text-slate-500">{item.source}</p></>
            }
          </div>
        </div>
        <div className="col-span-2 text-slate-300">{item.type}</div>
        <div className="col-span-2 text-slate-300">{item.size}</div>
        <div className="col-span-2 text-slate-300">{item.resolution || item.duration || '-'}</div>
        <div className="col-span-1 flex justify-end gap-2">
          <button type="button" onClick={() => onStartEdit(item)} className="rounded-lg p-2 text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-300">✎</button>
          <button type="button" onClick={() => onDelete(item.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="group overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/80 shadow-xl shadow-black/10 transition hover:border-cyan-400/40">
      {/* Thumbnail / preview */}
      <div className="relative h-32 overflow-hidden border-b border-slate-800 bg-slate-900">
        <MediaPreview item={item} />
        {/* Overlay gradient untuk video */}
        {isVideo && item.url && (
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent pointer-events-none" />
        )}
        {item.isLive && (
          <div className="absolute left-2 top-2 rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">LIVE</div>
        )}
        <button
          type="button"
          onClick={() => onToggleSelect(item.id)}
          className={cx('absolute right-2 top-2 h-5 w-5 rounded border transition', isSelected ? 'border-emerald-400 bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'border-slate-400 bg-white/10 backdrop-blur-sm hover:bg-white/20')}
        />
        {/* Type badge */}
        <div className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-300 backdrop-blur-sm">
          {isAudio ? 'Audio' : isImage ? 'Image' : 'Video'}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          {isEditing
            ? <AssetNameEditor value={editName} onChange={onEditNameChange} onSave={onSaveRename} onCancel={onCancelRename} />
            : <p className="truncate text-sm font-bold text-white">{item.name}</p>
          }
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button type="button" onClick={() => onStartEdit(item)} className="rounded-lg p-1 text-slate-500 hover:bg-cyan-500/10 hover:text-cyan-300">✎</button>
            <button type="button" onClick={() => onDelete(item.id)} className="rounded-lg p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Sumber: {item.source}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
          <div className="rounded bg-slate-800 px-2 py-1 font-semibold text-slate-200">{item.size}</div>
          <div className="rounded bg-slate-800 px-2 py-1 text-right font-semibold text-slate-200">{item.resolution || item.duration || '-'}</div>
        </div>
      </div>
    </div>
  );
}
