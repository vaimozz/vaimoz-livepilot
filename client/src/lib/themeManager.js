/**
 * Theme Manager
 * Handles theme initialization and application
 */

export const themes = {
  cyberpunk: {
    name: 'Set And Forget Dark',
    colors: {
      '--bg-primary': '#0b0e14',
      '--bg-secondary': '#161a23',
      '--bg-tertiary': '#1e222e',
      '--accent-primary': '#f213a4',
      '--accent-secondary': '#7000ff',
      '--accent-tertiary': '#00d9ff',
      '--text-primary': '#ffffff',
      '--text-secondary': '#8b92a5',
      '--text-muted': '#5e6473',
      '--border-primary': '#222736',
      '--border-accent': '#f213a433',
      '--success': '#00c853',
      '--warning': '#ffaa00',
      '--error': '#ff0055',
      '--info': '#00d9ff',
    },
    gradient: 'none',
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
  light: {
    name: 'Clean White',
    colors: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f8fafc',
      '--bg-tertiary': '#f1f5f9',
      '--accent-primary': '#3b82f6',
      '--accent-secondary': '#8b5cf6',
      '--accent-tertiary': '#ec4899',
      '--text-primary': '#0f172a',
      '--text-secondary': '#475569',
      '--text-muted': '#64748b',
      '--border-primary': '#e2e8f0',
      '--border-accent': '#3b82f633',
      '--success': '#10b981',
      '--warning': '#f59e0b',
      '--error': '#ef4444',
      '--info': '#0ea5e9',
    },
    gradient: 'none',
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
  document.body.style.background = theme.gradient !== 'none' ? theme.gradient : theme.colors['--bg-primary'];
  document.body.style.backgroundAttachment = 'fixed';
  
  // Set color scheme for native elements (scrollbars, inputs)
  if (themeKey === 'light') {
    document.documentElement.style.colorScheme = 'light';
    root.classList.remove('dark');
  } else {
    document.documentElement.style.colorScheme = 'dark';
    root.classList.add('dark');
  }
  
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
