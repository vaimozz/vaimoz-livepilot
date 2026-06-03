import { useEffect, useState } from 'react';
import { MonitorPlay } from 'lucide-react';
import { AppTopBar } from '@/components/layout/AppTopBar.jsx';
import { Sidebar } from '@/components/layout/Sidebar.jsx';
import { MobileNav } from '@/components/layout/MobileNav.jsx';
import { LoginPage } from '@/components/auth/LoginPage.jsx';
import { defaultActivePage } from '@/data/navigation.jsx';
import { api, getToken, setToken } from '@/lib/api.js';
import { renderPage } from './AppRouter.jsx';
import { initializeTheme } from '@/lib/themeManager.js';

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
    return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <div className="min-h-screen transition-all duration-300" style={{ 
      color: 'var(--text-primary)',
      backgroundColor: 'transparent' 
    }}>
      <AppTopBar now={now} />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <main className="min-w-0 flex-1 p-5 pb-24 lg:p-8 lg:pb-8">
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{
                backgroundColor: 'var(--accent-primary)'
              }}>
                <MonitorPlay className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Live Pilot</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pratinjau mobile</p>
              </div>
            </div>
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
            Live Pilot • Backend Node.js + SQLite + FFmpeg + YouTube API • Data aset dan campaign dibaca dari database lokal.
          </div>
        </main>
      </div>
      <MobileNav activePage={activePage} setActivePage={setActivePage} />
    </div>
  );
}
