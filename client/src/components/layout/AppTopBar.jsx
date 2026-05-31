import { useEffect, useState } from 'react';
import { Bell, MonitorPlay, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { ThemeSwitcher } from '@/components/shared/ThemeSwitcher.jsx';
import { formatTopbarDate, formatTopbarTime } from '@/lib/formatters.js';
import { canUpdateAccount } from '@/lib/validation.js';
import { api } from '@/lib/api.js';

export function AppTopBar({ now }) {
  const [isThemeSwitcherOpen, setIsThemeSwitcherOpen] = useState(false);
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
      <ThemeSwitcher isOpen={isThemeSwitcherOpen} onClose={() => setIsThemeSwitcherOpen(false)} />
      
      <div className="glass-header sticky top-0 z-50 flex h-16 items-center justify-between px-5 lg:px-8 transition-all duration-300">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800/50 ring-1 ring-white/10">
            <MonitorPlay className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} strokeWidth={2} />
          </div>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Vaimoz<span className="font-light opacity-80">Live</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span>{formatTopbarDate(now)}</span>
          <span style={{ color: 'var(--border-primary)' }}>•</span>
          <span className="tabular-nums">{formatTopbarTime(now)}</span>
          <span className="h-5 w-px" style={{ backgroundColor: 'var(--border-primary)' }} />
          
          {/* Theme Switcher Button */}
          <button 
            type="button" 
            onClick={() => setIsThemeSwitcherOpen(true)}
            className="rounded-lg p-1.5 transition hover:scale-110" 
            style={{
              color: 'var(--accent-primary)',
            }}
            aria-label="Change theme"
            title="Ganti Tema"
          >
            <Palette className="h-4 w-4" />
          </button>
          
          <button 
            type="button" 
            onClick={openAccountModal} 
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition" 
            style={{
              color: 'var(--text-secondary)',
            }}
            aria-label="Profil akun"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{
              backgroundColor: 'var(--accent-primary)'
            }}>
              {accountName.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden max-w-32 truncate text-xs font-semibold md:inline">
              {accountName}
            </span>
          </button>
          
          <button 
            type="button" 
            className="rounded-lg p-1.5 transition" 
            style={{ color: 'var(--text-muted)' }}
            aria-label="Notifikasi"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isAccountOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <Card className="glass-panel w-full max-w-md overflow-hidden rounded-3xl shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between border-b px-6 py-5" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{
                  backgroundColor: 'var(--accent-primary)'
                }}>
                  {accountName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Profil Akun</h3>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Ubah nama akun dan password lokal.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAccountOpen(false)} 
                className="text-2xl hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
              >
                ×
              </button>
            </div>
            <div className="space-y-4 p-6">
              <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Nama Akun
                <input 
                  value={draftAccountName} 
                  onChange={(e) => setDraftAccountName(e.target.value)} 
                  className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none" 
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Password Baru
                <input 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  type="password" 
                  className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none" 
                  placeholder="Kosongkan jika tidak ingin ganti password" 
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Konfirmasi Password
                <input 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  type="password" 
                  className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none" 
                />
              </label>
              <div className="rounded-2xl p-3 text-xs leading-relaxed" style={{
                backgroundColor: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent-primary) 20%, transparent)',
                color: 'var(--text-secondary)'
              }}>
                {accountMessage}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t px-6 py-5" style={{ borderColor: 'var(--border-primary)' }}>
              <Button 
                variant="outline" 
                onClick={() => setIsAccountOpen(false)}
              >
                Batal
              </Button>
              <Button 
                onClick={saveAccountProfile}
              >
                Simpan
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
