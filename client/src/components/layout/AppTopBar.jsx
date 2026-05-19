import { useEffect, useState } from 'react';
import { Bell, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { formatTopbarDate, formatTopbarTime } from '@/lib/formatters.js';
import { canUpdateAccount } from '@/lib/validation.js';
import { api } from '@/lib/api.js';

export function AppTopBar({ now }) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [accountName, setAccountName] = useState('Akun');
  const [draftAccountName, setDraftAccountName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountMessage, setAccountMessage] = useState('Profil akun lokal siap diperbarui.');

  const loadAccount = async () => {
    try {
      const result = await api.auth.me();
      const displayName = result.user?.displayName || result.user?.username || 'Akun';
      setAccountName(displayName);
      setDraftAccountName(displayName);
    } catch {
      setAccountName('Akun');
      setDraftAccountName('Akun');
    }
  };

  useEffect(() => {
    loadAccount();
  }, []);

  const openAccountModal = () => {
    setDraftAccountName(accountName);
    setNewPassword('');
    setConfirmPassword('');
    setAccountMessage('Ubah nama akun atau password admin lokal.');
    setIsAccountOpen(true);
  };

  const saveAccountProfile = async () => {
    if (!canUpdateAccount(draftAccountName, newPassword, confirmPassword)) {
      setAccountMessage('Nama akun wajib diisi. Jika ganti password, minimal 6 karakter dan konfirmasi harus sama.');
      return;
    }

    try {
      const payload = { displayName: draftAccountName.trim() };
      if (newPassword.trim()) payload.password = newPassword;
      const result = await api.auth.updateMe(payload);
      const nextName = result.user?.displayName || draftAccountName.trim();
      setAccountName(nextName);
      setDraftAccountName(nextName);
      setNewPassword('');
      setConfirmPassword('');
      setAccountMessage('Profil akun berhasil diperbarui.');
      setIsAccountOpen(false);
    } catch (error) {
      setAccountMessage(`Gagal memperbarui profil: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal.'}`);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-5 backdrop-blur lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20"><Radio className="h-5 w-5 text-white" /></div>
          <div><h1 className="text-sm font-bold tracking-tight text-white sm:text-base">Vaimoz LivePilot</h1><p className="text-[10px] text-slate-400 sm:text-xs">Pusat Kontrol Live Otomatis</p></div>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span>{formatTopbarDate(now)}</span><span className="text-slate-600">•</span><span className="tabular-nums">{formatTopbarTime(now)}</span>
          <span className="h-5 w-px bg-slate-600" />
          <button type="button" onClick={openAccountModal} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-slate-300 transition hover:bg-slate-800 hover:text-white" aria-label="Profil akun">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-slate-950">{accountName.slice(0, 1).toUpperCase()}</span>
            <span className="hidden max-w-32 truncate text-xs font-semibold md:inline">{accountName}</span>
          </button>
          <button type="button" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white" aria-label="Notifikasi"><Bell className="h-4 w-4" /></button>
        </div>
      </div>

      {isAccountOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500 text-sm font-bold text-slate-950">{accountName.slice(0, 1).toUpperCase()}</div><div><h3 className="text-xl font-bold text-white">Profil Akun</h3><p className="mt-1 text-xs text-slate-400">Ubah nama akun dan password lokal.</p></div></div>
              <button type="button" onClick={() => setIsAccountOpen(false)} className="text-2xl text-slate-300 hover:text-white">×</button>
            </div>
            <div className="space-y-4 p-6">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-300">Nama Akun<input value={draftAccountName} onChange={(e) => setDraftAccountName(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400" /></label>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-300">Password Baru<input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400" placeholder="Kosongkan jika tidak ingin ganti password" /></label>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-300">Konfirmasi Password<input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400" /></label>
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs leading-relaxed text-slate-300">{accountMessage}</div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-800 px-6 py-5"><Button variant="outline" className="rounded-xl border-slate-600 bg-slate-700 px-6 text-white hover:bg-slate-600" onClick={() => setIsAccountOpen(false)}>Batal</Button><Button className="rounded-xl bg-cyan-500 px-7 text-slate-950 hover:bg-cyan-400" onClick={saveAccountProfile}>Simpan</Button></div>
          </div>
        </div>
      ) : null}
    </>
  );
}
