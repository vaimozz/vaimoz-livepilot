/**
 * Theme Manager
 * Handles theme initialization and application
 */

export const themes = {
  cyberpunk: {
    name: 'Cyberpunk Neon',
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

/**
 * Apply theme to document
 */
export function applyTheme(themeKey) {
  const theme = themes[themeKey];
  if (!theme) {
    console.warn(`Theme "${themeKey}" not found, using default`);
    return applyTheme('cyberpunk');
  }

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
  
  return theme;
}

/**
 * Get current theme from localStorage or default
 */
export function getCurrentTheme() {
  return localStorage.getItem('theme') || 'cyberpunk';
}

/**
 * Initialize theme on app load
 */
export function initializeTheme() {
  const savedTheme = getCurrentTheme();
  applyTheme(savedTheme);
  return savedTheme;
}

/**
 * Get theme by key
 */
export function getTheme(themeKey) {
  return themes[themeKey];
}

/**
 * Get all available themes
 */
export function getAllThemes() {
  return themes;
}
