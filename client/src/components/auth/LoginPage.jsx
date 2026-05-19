import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Radio } from 'lucide-react';
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
    setLoginMessage(nextMode === 'register' ? 'Buat akun admin lokal untuk Vaimoz LivePilot.' : 'Masukkan username dan password untuk masuk.');
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-700 p-4 text-slate-950">
      <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.25 }} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl shadow-black/20">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex items-center justify-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-blue-500/25"><Radio className="h-7 w-7 text-white" /></div><div className="text-left leading-none"><p className="text-2xl font-extrabold tracking-tight text-slate-900">Vaimoz</p><p className="text-xl font-bold italic text-red-500">LivePilot</p></div></div>
          <h1 className="text-2xl font-extrabold text-slate-950">Vaimoz LivePilot</h1>
          <p className="mt-1 text-sm text-slate-700">{isRegisterMode ? 'Register' : 'Login'}</p>
        </div>
        <form onSubmit={submitAuth} className="space-y-5">
          <label className="block text-sm font-semibold text-slate-950">Username<input value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" autoComplete="username" /></label>
          <label className="block text-sm font-semibold text-slate-950">Password<div className="mt-2 flex h-12 items-center rounded-xl border border-slate-300 bg-white px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10"><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none" autoComplete={isRegisterMode ? 'new-password' : 'current-password'} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="ml-3 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Tampilkan password"><Eye className="h-4 w-4" /></button></div></label>
          {isRegisterMode ? <label className="block text-sm font-semibold text-slate-950">Confirm Password<input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type={showPassword ? 'text' : 'password'} className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" autoComplete="new-password" /></label> : null}
          <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl bg-blue-500 text-base font-bold text-white hover:bg-blue-600 disabled:opacity-60">{isSubmitting ? 'Memproses...' : isRegisterMode ? '↪ Register' : '↪ Login'}</Button>
        </form>
        <p className="mt-5 rounded-xl bg-slate-100 px-3 py-2 text-center text-xs text-slate-600">{loginMessage}</p>
        <div className="mt-6 text-center text-sm text-slate-700">{isRegisterMode ? <><p>Already have an account?</p><button type="button" onClick={() => switchAuthMode('login')} className="mt-1 font-semibold text-blue-600 hover:text-blue-700">Login here</button></> : <><p>Don't have an account?</p><button type="button" onClick={() => switchAuthMode('register')} className="mt-1 font-semibold text-blue-600 hover:text-blue-700">Register here</button></>}</div>
      </motion.div>
    </div>
  );
}
