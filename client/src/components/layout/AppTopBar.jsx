import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, MonitorPlay, Palette, Radio, Trash2, X } from 'lucide-react';
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
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);
  const notifIntervalRef = useRef(null);

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
      const result = await api.notifications.list({ limit: 20 });
      setNotifications(result.notifications || []);
    } catch {
      setNotifications([]);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const result = await api.notifications.count();
      setUnreadCount(result.unread || 0);
    } catch {
      setUnreadCount(0);
    }
  };

  const markRead = async (id) => {
    try {
      await api.notifications.markRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount((v) => Math.max(0, v - 1));
    } catch { /* ok */ }
  };

  const markAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* ok */ }
  };

  const removeNotif = async (id) => {
    try {
      await api.notifications.remove(id);
      const n = notifications.find((x) => x.id === id);
      setNotifications((prev) => prev.filter((x) => x.id !== id));
      if (n && !n.isRead) setUnreadCount((v) => Math.max(0, v - 1));
    } catch { /* ok */ }
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
    loadUnreadCount();
    // Poll unread count setiap 30 detik
    notifIntervalRef.current = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(notifIntervalRef.current);
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
              onClick={() => { setIsNotifOpen((v) => !v); if (!isNotifOpen) loadNotifications(); }}
              className="rounded-lg p-1.5 transition hover:scale-110 relative"
              style={{ color: isNotifOpen ? 'var(--accent-primary)' : 'var(--text-muted)' }}
              aria-label="Notifikasi"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white" style={{ backgroundColor: 'var(--error)' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {isNotifOpen && (
              <div className="absolute right-0 top-full z-[70] mt-2 w-80 rounded-2xl border shadow-2xl shadow-black/50 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Notifikasi</span>
                    {unreadCount > 0 && (
                      <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ backgroundColor: 'var(--error)' }}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="rounded p-1 transition hover:opacity-70"
                        style={{ color: 'var(--accent-primary)' }}
                        title="Tandai semua dibaca"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button type="button" onClick={() => setIsNotifOpen(false)} className="text-lg hover:opacity-70" style={{ color: 'var(--text-muted)' }}>×</button>
                  </div>
                </div>

                {/* Notification list */}
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                      <Bell className="h-6 w-6 mx-auto mb-2 opacity-40" />
                      Tidak ada notifikasi baru
                    </div>
                  ) : notifications.map((n) => {
                    const typeColor = {
                      stream_start: 'var(--accent-primary)',
                      stream_stop: 'var(--text-muted)',
                      stream_error: 'var(--error)',
                      broadcast_live: '#10b981',
                      viewer_milestone: '#f59e0b',
                      smart_stop: '#a78bfa',
                      system: 'var(--text-secondary)',
                    }[n.type] || 'var(--text-secondary)';

                    const typeIcon = {
                      stream_start: '🔴',
                      stream_stop: '⏹',
                      stream_error: '⚠️',
                      broadcast_live: '🟢',
                      viewer_milestone: '👥',
                      smart_stop: '🛑',
                      system: 'ℹ️',
                    }[n.type] || 'ℹ️';

                    const relTime = (() => {
                      const s = Math.floor((Date.now() - new Date(n.createdAt).getTime()) / 1000);
                      if (s < 60) return `${s} dtk lalu`;
                      if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
                      if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
                      return `${Math.floor(s / 86400)} hari lalu`;
                    })();

                    return (
                      <div
                        key={n.id}
                        onClick={() => !n.isRead && markRead(n.id)}
                        className="group flex items-start gap-3 border-b px-4 py-3 last:border-0 cursor-pointer transition-colors"
                        style={{
                          borderColor: 'var(--border-primary)',
                          backgroundColor: n.isRead ? 'transparent' : 'color-mix(in srgb, var(--accent-primary) 5%, transparent)',
                        }}
                      >
                        <span className="mt-0.5 text-sm shrink-0">{typeIcon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: n.isRead ? 'var(--text-secondary)' : typeColor }}>
                            {n.title}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{n.message}</p>
                          <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{relTime}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeNotif(n.id); }}
                          className="shrink-0 opacity-0 group-hover:opacity-100 rounded p-0.5 transition"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="border-t px-4 py-2 flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {notifications.length} notifikasi
                  </span>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={async () => { await api.notifications.clear(); setNotifications([]); setUnreadCount(0); }}
                      className="flex items-center gap-1 text-[10px] transition hover:opacity-70"
                      style={{ color: 'var(--error)' }}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                      Hapus semua
                    </button>
                  )}
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
