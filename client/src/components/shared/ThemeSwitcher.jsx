import { useState } from 'react';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { themes, applyTheme as setGlobalTheme } from '@/lib/themeManager.js';

export function ThemeSwitcher({ isOpen, onClose }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'cyberpunk';
  });

  const applyTheme = (themeKey) => {
    setGlobalTheme(themeKey);
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
                backgroundColor: 'color-mix(in srgb, var(--accent-primary) 20%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent-primary) 40%, transparent)'
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
                  backgroundColor: currentTheme === key ? 'color-mix(in srgb, var(--accent-primary) 10%, transparent)' : 'var(--bg-tertiary)',
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
                
                <div className="text-4xl mb-3">{theme.icon || '🌌'}</div>
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
            backgroundColor: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-primary) 30%, transparent)'
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

