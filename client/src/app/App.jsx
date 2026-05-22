import { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { AppTopBar } from '@/components/layout/AppTopBar.jsx';
import { Sidebar } from '@/components/layout/Sidebar.jsx';
import { MobileNav } from '@/components/layout/MobileNav.jsx';
import { LoginPage } from '@/components/auth/LoginPage.jsx';
import { defaultActivePage } from '@/data/navigation.jsx';
import { api, getToken, setToken } from '@/lib/api.js';
import { renderPage } from './AppRouter.jsx';
import { initializeTheme } from '@/lib/themeManager.js';
import { ThemeProvider } from '@/contexts/ThemeContext.jsx';


export default function VaimozLivePilotApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getToken()));
  const [activePage, setActivePage] = useState(defaultActivePage);
  const [selectedPlatform, setSelectedPlatform] = useState('Semua');
  const [now, setNow] = useState(() => new Date());
  const [editCampaign, setEditCampaign] = useState(null);

  // Initialize theme on mount
  useEffect(() => {
    initializeTheme();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleLogin = async (username, password) => {
    const result = await api.auth.login(username, password);
    setToken(result.token);
    setIsAuthenticated(true);
  };

  const handleRegister = async (username, password) => {
    const result = await api.auth.register(username, password, username);
    setToken(result.token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setToken(null);
    setIsAuthenticated(false);
  };

  // Auto-logout saat token expired (401 dari server)
  useEffect(() => {
    const onUnauthorized = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener('vaimoz:unauthorized', onUnauthorized);
    return () => window.removeEventListener('vaimoz:unauthorized', onUnauthorized);
  }, []);

  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <LoginPage onLogin={handleLogin} onRegister={handleRegister} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen text-[var(--text-primary)] transition-all duration-300" style={{ backgroundColor: 'transparent' }}>
        <AppTopBar now={now} />
        <div className="flex min-h-[calc(100vh-4rem)]">
          <Sidebar activePage={activePage} setActivePage={setActivePage} />
          <main className="min-w-0 flex-1 p-5 pb-24 lg:p-8 lg:pb-8">
            <div className="mb-5 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500"><Radio className="h-5 w-5 text-white dark:text-slate-950" /></div><div><p className="font-bold">Vaimoz LivePilot</p><p className="text-xs text-gray-500 dark:text-slate-500">Pratinjau mobile</p></div></div>
            </div>
            {renderPage(activePage, selectedPlatform, setSelectedPlatform, setActivePage, editCampaign, setEditCampaign)}
            <div 
              className="mt-5 rounded-3xl border p-5 text-xs transition-all duration-300"
              style={{
                borderColor: 'var(--border-primary)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-muted)'
              }}
            >
              Vaimoz LivePilot • Backend Node.js + SQLite + FFmpeg + YouTube API • Data aset dan campaign dibaca dari database lokal.
            </div>
          </main>
        </div>
        <MobileNav activePage={activePage} setActivePage={setActivePage} />
      </div>
    </ThemeProvider>
  );
}
