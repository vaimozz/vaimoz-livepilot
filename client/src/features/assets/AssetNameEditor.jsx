import { cx } from '@/lib/cn.js';

export function AssetNameEditor({ value, onChange, onSave, onCancel, compact = false }) {
  return (
    <div className={cx('flex items-center gap-2', compact ? 'mt-1' : '')}>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-cyan-500/40 bg-slate-950 px-2 py-1 text-xs font-semibold text-white outline-none focus:border-cyan-400" placeholder="Nama file baru" autoFocus />
      <button type="button" onClick={onSave} className="rounded-lg bg-emerald-500 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-400">Simpan</button>
      <button type="button" onClick={onCancel} className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-700">Batal</button>
    </div>
  );
}
