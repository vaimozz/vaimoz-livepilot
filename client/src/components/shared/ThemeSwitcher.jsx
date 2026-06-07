import { useState } from 'react';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { themes, applyTheme as setGlobalTheme } from '@/lib/themeManager.js';

// Deskripsi singkat per tema untuk UI
const themeDescriptions = {
  cyberpunk:  'Pure hitam, aksen hijau neon',
  slate:      'Dark navy, aksen biru cyan',
  light:      'Putih bersih, aksen biru',
  tokyonight: 'Biru gelap, aksen ungu lembut',
  dracula:    'Purple gelap, aksen pink',
  monokai:    'Cokelat tua, aksen kuning warm',
  nord:       'Abu arktik, aksen biru es',
  solarized:  'Hijau teal gelap, aksen kuning',
  rose:       'Ungu malam, aksen merah mawar',
};

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-3xl rounded-3xl border-2" style={{ 
        borderColor: 'var(--border-primary)',
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <CardContent className="p-6">
          {/* Header */}
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
                  {Object.keys(themes).length} tema tersedia — tersimpan otomatis
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              className="rounded-xl h-10 w-10 p-0 text-lg"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)'
              }}
            >
              ✕
            </Button>
          </div>

          {/* Theme Grid — 3 kolom */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => applyTheme(key)}
                className="relative p-4 rounded-2xl border-2 transition-all duration-200 text-left hover:scale-[1.03]"
                style={{
                  borderColor: currentTheme === key ? theme.colors['--accent-primary'] : 'var(--border-primary)',
                  backgroundColor: currentTheme === key
                    ? `color-mix(in srgb, ${theme.colors['--accent-primary']} 12%, ${theme.colors['--bg-tertiary']})`
                    : theme.colors['--bg-tertiary'],
                }}
              >
                {/* Centang aktif */}
                {currentTheme === key && (
                  <div
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: theme.colors['--accent-primary'],
                      color: theme.colors['--bg-primary'],
                    }}
                  >
                    ✓
                  </div>
                )}

                {/* Emoji + nama */}
                <div className="text-3xl mb-2 leading-none">{theme.icon || '🎨'}</div>
                <p
                  className="font-bold text-sm leading-tight mb-1"
                  style={{ color: theme.colors['--text-primary'] }}
                >
                  {theme.name}
                </p>
                <p
                  className="text-[11px] leading-tight mb-3"
                  style={{ color: theme.colors['--text-muted'] }}
                >
                  {themeDescriptions[key] || ''}
                </p>

                {/* Preview 3 warna aksen */}
                <div className="flex gap-1.5">
                  <div className="h-4 flex-1 rounded-md" style={{ backgroundColor: theme.colors['--accent-primary'] }} />
                  <div className="h-4 flex-1 rounded-md" style={{ backgroundColor: theme.colors['--accent-secondary'] }} />
                  <div className="h-4 flex-1 rounded-md" style={{ backgroundColor: theme.colors['--accent-tertiary'] }} />
                </div>
              </button>
            ))}
          </div>

          {/* Footer hint */}
          <div className="mt-5 p-3 rounded-2xl text-center" style={{
            backgroundColor: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-primary) 25%, transparent)'
          }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              💡 Tema diterapkan secara instan dan disimpan untuk sesi berikutnya
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

