import { useEffect, useRef, useState } from 'react';
import { Bell, MonitorPlay, Palette, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card } from '@/components/ui/card.jsx';
import { ThemeSwitcher } from '@/components/shared/ThemeSwitcher.jsx';
import { formatTopbarDate, formatTopbarTime } from '@/lib/formatters.js';
import { canUpdateAccount } from '@/lib/validation.js';
import { api, setToken } from '@/lib/api.js';

export function AppTopBar({ now }) {
  const [isThemeSwitcherOpen, setIsThemeSwitcherOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [accountName, setAccountName] = useState('Akun');
  const [draftAccountName, setDraftAccountName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountMessage, setAccountMessage] = useState('Profil akun lokal siap diperbarui.');
  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const notifRef = useRef(null);

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

  const loadNotifications = async () => {
    try {
      const result = await api.monitor.logs({ limit: 20 });
      const logs = (result.logs || []).filter(
        (l) => l.level === 'ERROR' || l.level === 'WARN' || (l.level === 'INFO' && l.message?.includes('Stream'))
      ).slice(0, 10).map((l) => ({
        title: l.level === 'ERROR' ? '⛔ Error' : l.level === 'WARN' ? '⚠️ Peringatan' : 'ℹ️ Info',
        message: l.message || '-',
        time: l.timestamp ? new Date(l.timestamp).toLocaleTimeString('id-ID') : '-',
        type: l.level === 'ERROR' ? 'error' : l.level === 'WARN' ? 'warn' : 'info',
      }));
      setNotifications(logs);
      setNotifCount(logs.filter((l) => l.type === 'error' || l.type === 'warn').length);
    } catch {
      setNotifications([]);
    }
  };

  const handleLogout = () => {
    setToken(null);
    window.dispatchEvent(new CustomEvent('vaimoz:unauthorized'));
  };

  // Close notif panel when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isNotifOpen]);

  useEffect(() => {
    loadAccount();
    loadNotifications();
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
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 shadow-[0_0_15px_rgba(42,195,222,0.3)] ring-1 ring-cyan-500/30">
            <Radio className="h-5 w-5 text-cyan-400 drop-shadow-[0_0_5px_rgba(42,195,222,0.5)] animate-pulse" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              LIVE<span style={{ color: 'var(--accent-primary)' }}>PILOT</span>
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 opacity-80">
              Vaimoz Auto-Live System
            </p>
          </div>
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
          
          {/* Bell Notification Button */}
          <div className="relative" ref={notifRef}>
            <button 
              type="button" 
              onClick={() => setIsNotifOpen((v) => !v)}
              className="rounded-lg p-1.5 transition hover:scale-110 relative"
              style={{ color: isNotifOpen ? 'var(--accent-primary)' : 'var(--text-muted)' }}
              aria-label="Notifikasi"
            >
              <Bell className="h-4 w-4" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: 'var(--error)' }}>
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>
            {isNotifOpen && (
              <div className="absolute right-0 top-full z-[70] mt-2 w-80 rounded-2xl border shadow-2xl shadow-black/50 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border-primary)' }}>
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Notifikasi Sistem</span>
                  <button type="button" onClick={() => setIsNotifOpen(false)} className="text-lg hover:opacity-70" style={{ color: 'var(--text-muted)' }}>×</button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                      <Bell className="h-6 w-6 mx-auto mb-2 opacity-40" />
                      Tidak ada notifikasi baru
                    </div>
                  ) : notifications.map((n, i) => (
                    <div key={i} className="border-b px-4 py-3 last:border-0" style={{ borderColor: 'var(--border-primary)', backgroundColor: i === 0 ? 'color-mix(in srgb, var(--accent-primary) 5%, transparent)' : 'transparent' }}>
                      <p className="text-xs font-semibold" style={{ color: n.type === 'error' ? 'var(--error)' : n.type === 'warn' ? 'var(--warning)' : 'var(--text-primary)' }}>{n.title}</p>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{n.message}</p>
                      <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{n.time}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t px-4 py-2 text-center text-[10px]" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-muted)' }}>
                  Notifikasi dari log backend real-time
                </div>
              </div>
            )}
          </div>
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
            <div className="flex justify-between gap-3 border-t px-6 py-5" style={{ borderColor: 'var(--border-primary)' }}>
              <Button 
                variant="outline"
                onClick={handleLogout}
                style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
              >
                Keluar
              </Button>
              <div className="flex gap-3">
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
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
