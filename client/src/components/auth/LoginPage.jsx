import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { canLogin } from '@/lib/validation.js';

export function LoginPage({ onLogin, onRegister }) {
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginMessage, setLoginMessage] = useState('Masukkan username dan password untuk masuk.');
  const isRegisterMode = authMode === 'register';

  const switchAuthMode = (nextMode) => {
    setAuthMode(nextMode);
    setPassword('');
    setConfirmPassword('');
    setLoginMessage(nextMode === 'register' ? 'Buat akun admin lokal untuk Live Pilot.' : 'Masukkan username dan password untuk masuk.');
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (isRegisterMode) {
        if (!username.trim() || !password.trim()) {
          setLoginMessage('Username dan password wajib diisi untuk registrasi.');
          return;
        }
        if (password.length < 6) {
          setLoginMessage('Password minimal 6 karakter.');
          return;
        }
        if (password !== confirmPassword) {
          setLoginMessage('Konfirmasi password belum sama.');
          return;
        }
        await onRegister(username.trim(), password);
        setLoginMessage(`Akun ${username.trim()} berhasil dibuat dan login.`);
        return;
      }
      if (!canLogin(username, password)) {
        setLoginMessage('Username dan password wajib diisi.');
        return;
      }
      await onLogin(username.trim(), password);
    } catch (error) {
      setLoginMessage(error.message || 'Autentikasi gagal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{
      background: 'radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.4) 100%)'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 18, scale: 0.98 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        transition={{ duration: 0.25 }} 
        className="w-full max-w-md rounded-3xl border p-8 backdrop-blur-md shadow-2xl transition-all duration-300"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 85%, transparent)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex items-center justify-center gap-3">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/20" style={{
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              boxShadow: '0 8px 24px color-mix(in srgb, var(--accent-primary) 40%, transparent)'
            }}>
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }}></div>
              <MonitorPlay className="relative z-10 h-7 w-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" strokeWidth={2.5} />
            </div>
            <div className="text-left leading-none">
              <p className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Live Pilot</p>
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-widest opacity-80" style={{ color: 'var(--accent-secondary)' }}>Kontrol Live Otomatis</p>
            </div>
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Autentikasi</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{isRegisterMode ? 'Register' : 'Login'}</p>
        </div>
        <form onSubmit={submitAuth} className="space-y-5">
          <label className="block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Username
            <input 
              value={username} 
              onChange={(event) => setUsername(event.target.value)} 
              className="mt-2 h-12 w-full rounded-xl px-4 text-sm outline-none" 
              autoComplete="username" 
            />
          </label>
          <label className="block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Password
            <div 
              className="mt-2 flex h-12 items-center rounded-xl border px-4 transition-all duration-200 focus-within:ring-2 focus-within:ring-offset-2" 
              style={{
                borderColor: 'var(--border-primary)',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                '--tw-ring-color': 'var(--accent-primary)',
                '--tw-ring-offset-color': 'var(--bg-secondary)'
              }}
            >
              <input 
                value={password} 
                onChange={(event) => setPassword(event.target.value)} 
                type={showPassword ? 'text' : 'password'} 
                className="min-w-0 flex-1 bg-transparent text-sm outline-none" 
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword((value) => !value)} 
                className="ml-3 rounded-lg p-1.5 transition hover:scale-105" 
                style={{ color: 'var(--text-muted)' }}
                aria-label="Tampilkan password"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </label>
          {isRegisterMode ? (
            <label className="block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Confirm Password
              <input 
                value={confirmPassword} 
                onChange={(event) => setConfirmPassword(event.target.value)} 
                type={showPassword ? 'text' : 'password'} 
                className="mt-2 h-12 w-full rounded-xl px-4 text-sm outline-none" 
                autoComplete="new-password" 
              />
            </label>
          ) : null}
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="h-12 w-full text-base font-bold"
          >
            {isSubmitting ? 'Memproses...' : isRegisterMode ? '↪ Register' : '↪ Login'}
          </Button>
        </form>
        <p 
          className="mt-5 rounded-2xl px-4 py-3 text-center text-xs leading-relaxed"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-primary)',
            color: 'var(--text-secondary)'
          }}
        >
          {loginMessage}
        </p>
        <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          {isRegisterMode ? (
            <>
              <p>Already have an account?</p>
              <button 
                type="button" 
                onClick={() => switchAuthMode('login')} 
                className="mt-1 font-semibold transition hover:underline"
                style={{ color: 'var(--accent-primary)' }}
              >
                Login here
              </button>
            </>
          ) : (
            <>
              <p>Don't have an account?</p>
              <button 
                type="button" 
                onClick={() => switchAuthMode('register')} 
                className="mt-1 font-semibold transition hover:underline"
                style={{ color: 'var(--accent-primary)' }}
              >
                Register here
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

