import { useState } from 'react';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';

const themes = {
  cyberpunk: {
    name: 'Cyberpunk Neon',
    icon: '🌃',
    colors: {
      '--bg-primary': '#0a0e27',
      '--bg-secondary': '#0f1729',
      '--bg-tertiary': '#1a1f3a',
      '--accent-primary': '#00d9ff',
      '--accent-secondary': '#ff00ff',
      '--accent-tertiary': '#7000ff',
      '--text-primary': '#ffffff',
      '--text-secondary': '#b4c6fc',
      '--text-muted': '#6b7ba8',
      '--border-primary': '#1e2a4a',
      '--border-accent': '#00d9ff33',
      '--success': '#00ff88',
      '--warning': '#ffaa00',
      '--error': '#ff0055',
      '--info': '#00d9ff',
    },
    gradient: 'linear-gradient(135deg, #0a0e27 0%, #0f1729 50%, #1a1f3a 100%)',
  },
  purple: {
    name: 'Modern Purple',
    icon: '💜',
    colors: {
      '--bg-primary': '#0f0520',
      '--bg-secondary': '#1a0b2e',
      '--bg-tertiary': '#2d1b4e',
      '--accent-primary': '#a855f7',
      '--accent-secondary': '#ec4899',
      '--accent-tertiary': '#8b5cf6',
      '--text-primary': '#ffffff',
      '--text-secondary': '#e9d5ff',
      '--text-muted': '#a78bfa',
      '--border-primary': '#4c1d95',
      '--border-accent': '#a855f733',
      '--success': '#10b981',
      '--warning': '#f59e0b',
      '--error': '#ef4444',
      '--info': '#a855f7',
    },
    gradient: 'linear-gradient(135deg, #0f0520 0%, #1a0b2e 50%, #2d1b4e 100%)',
  },
  ocean: {
    name: 'Ocean Blue',
    icon: '🌊',
    colors: {
      '--bg-primary': '#020420',
      '--bg-secondary': '#0a1628',
      '--bg-tertiary': '#0f2744',
      '--accent-primary': '#0ea5e9',
      '--accent-secondary': '#06b6d4',
      '--accent-tertiary': '#3b82f6',
      '--text-primary': '#ffffff',
      '--text-secondary': '#bae6fd',
      '--text-muted': '#7dd3fc',
      '--border-primary': '#1e3a5f',
      '--border-accent': '#0ea5e933',
      '--success': '#10b981',
      '--warning': '#f59e0b',
      '--error': '#ef4444',
      '--info': '#0ea5e9',
    },
    gradient: 'linear-gradient(135deg, #020420 0%, #0a1628 50%, #0f2744 100%)',
  },
  warm: {
    name: 'Warm Dark',
    icon: '🔥',
    colors: {
      '--bg-primary': '#1a0f0a',
      '--bg-secondary': '#2d1810',
      '--bg-tertiary': '#3d2415',
      '--accent-primary': '#f97316',
      '--accent-secondary': '#fb923c',
      '--accent-tertiary': '#ea580c',
      '--text-primary': '#ffffff',
      '--text-secondary': '#fed7aa',
      '--text-muted': '#fdba74',
      '--border-primary': '#57341a',
      '--border-accent': '#f9731633',
      '--success': '#10b981',
      '--warning': '#fbbf24',
      '--error': '#ef4444',
      '--info': '#f97316',
    },
    gradient: 'linear-gradient(135deg, #1a0f0a 0%, #2d1810 50%, #3d2415 100%)',
  },
  slate: {
    name: 'Classic Slate',
    icon: '⚫',
    colors: {
      '--bg-primary': '#020617',
      '--bg-secondary': '#0f172a',
      '--bg-tertiary': '#1e293b',
      '--accent-primary': '#06b6d4',
      '--accent-secondary': '#0ea5e9',
      '--accent-tertiary': '#3b82f6',
      '--text-primary': '#ffffff',
      '--text-secondary': '#cbd5e1',
      '--text-muted': '#94a3b8',
      '--border-primary': '#334155',
      '--border-accent': '#06b6d433',
      '--success': '#10b981',
      '--warning': '#f59e0b',
      '--error': '#ef4444',
      '--info': '#06b6d4',
    },
    gradient: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%)',
  },
};

export function ThemeSwitcher({ isOpen, onClose }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'cyberpunk';
  });

  const applyTheme = (themeKey) => {
    const theme = themes[themeKey];
    const root = document.documentElement;
    
    // Apply CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // Apply gradient background
    document.body.style.background = theme.gradient;
    document.body.style.backgroundAttachment = 'fixed';
    
    // Save to localStorage
    localStorage.setItem('theme', themeKey);
    setCurrentTheme(themeKey);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl mx-4 rounded-3xl border-2" style={{ 
        borderColor: 'var(--border-primary)',
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{
                backgroundColor: 'var(--accent-primary)20',
                border: '1px solid var(--accent-primary)40'
              }}>
                <Palette className="h-6 w-6" style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Pilih Tema
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Sesuaikan tampilan aplikasi sesuai selera Anda
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              className="rounded-xl"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)'
              }}
            >
              ✕
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => applyTheme(key)}
                className="relative p-4 rounded-2xl border-2 transition-all hover:scale-105"
                style={{
                  borderColor: currentTheme === key ? 'var(--accent-primary)' : 'var(--border-primary)',
                  backgroundColor: currentTheme === key ? 'var(--accent-primary)10' : 'var(--bg-tertiary)',
                }}
              >
                {currentTheme === key && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--bg-primary)'
                  }}>
                    ✓
                  </div>
                )}
                
                <div className="text-4xl mb-3">{theme.icon}</div>
                <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                  {theme.name}
                </h3>
                
                {/* Color Preview */}
                <div className="flex gap-2 justify-center">
                  <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: theme.colors['--accent-primary'] }} />
                  <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: theme.colors['--accent-secondary'] }} />
                  <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: theme.colors['--accent-tertiary'] }} />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-2xl" style={{
            backgroundColor: 'var(--accent-primary)10',
            border: '1px solid var(--accent-primary)30'
          }}>
            <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              💡 Tema akan tersimpan otomatis dan diterapkan setiap kali Anda membuka aplikasi
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
