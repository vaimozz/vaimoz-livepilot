import { Button } from '@/components/ui/button.jsx';

export function YoutubePlaylistModal({ open, onClose, value, setValue, onCreate, channelName = 'Channel YouTube' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5"><div><h3 className="text-xl font-bold text-white">Buat Playlist YouTube Baru</h3><p className="mt-1 text-xs text-slate-400">Playlist akan dibuat untuk channel yang sedang dipilih.</p></div><button type="button" onClick={onClose} className="text-2xl text-slate-300 hover:text-white">×</button></div>
        <div className="space-y-5 p-6"><label className="block text-xs font-bold uppercase tracking-wide text-slate-300">Nama Playlist<input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onCreate(); }} className="mt-3 w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-cyan-400" placeholder="Contoh: Playlist Live Harian" autoFocus /></label><div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-xs leading-relaxed text-slate-300">Channel tujuan: <span className="font-bold text-cyan-300">{channelName}</span>. Setelah dibuat, playlist ini langsung dipilih di form kampanye.</div></div>
        <div className="flex justify-end gap-3 border-t border-slate-800 px-6 py-5"><Button variant="outline" className="rounded-xl border-slate-600 bg-slate-700 px-6 text-white hover:bg-slate-600" onClick={onClose}>Batal</Button><Button className="rounded-xl bg-cyan-500 px-7 text-slate-950 hover:bg-cyan-400" onClick={onCreate}>Buat Playlist</Button></div>
      </div>
    </div>
  );
}
