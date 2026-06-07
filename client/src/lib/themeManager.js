/**
 * Theme Manager
 * Handles theme initialization and application
 */

export const themes = {
  cyberpunk: {
    name: 'Set And Forget Dark',
    icon: '🌑',
    colors: {
      '--bg-primary': '#0A0A0A',
      '--bg-secondary': '#121212',
      '--bg-tertiary': '#1A1A1A',
      '--accent-primary': '#00E599',
      '--accent-secondary': '#00A3FF',
      '--accent-tertiary': '#7000FF',
      '--text-primary': '#FAFAFA',
      '--text-secondary': '#A1A1AA',
      '--text-muted': '#52525B',
      '--border-primary': '#27272A',
      '--border-accent': '#00E59933',
      '--success': '#00E599',
      '--warning': '#FFC800',
      '--error': '#FF4D4D',
      '--info': '#00A3FF',
    },
    gradient: 'radial-gradient(circle at 50% 0%, #151515 0%, #0A0A0A 80%)',
  },
  slate: {
    name: 'Classic Slate',
    icon: '🌊',
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
    icon: '☀️',
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
  tokyonight: {
    name: 'Tokyo Night',
    icon: '🗼',
    colors: {
      '--bg-primary': '#1a1b26',
      '--bg-secondary': '#16161e',
      '--bg-tertiary': '#24283b',
      '--accent-primary': '#7aa2f7',
      '--accent-secondary': '#bb9af7',
      '--accent-tertiary': '#2ac3de',
      '--text-primary': '#c0caf5',
      '--text-secondary': '#a9b1d6',
      '--text-muted': '#565f89',
      '--border-primary': '#414868',
      '--border-accent': '#7aa2f733',
      '--success': '#9ece6a',
      '--warning': '#e0af68',
      '--error': '#f7768e',
      '--info': '#7dcfff',
    },
    gradient: 'radial-gradient(ellipse at 50% 0%, #1f2040 0%, #1a1b26 60%)',
  },
  dracula: {
    name: 'Dracula',
    icon: '🧛',
    colors: {
      '--bg-primary': '#282a36',
      '--bg-secondary': '#21222c',
      '--bg-tertiary': '#343746',
      '--accent-primary': '#ff79c6',
      '--accent-secondary': '#bd93f9',
      '--accent-tertiary': '#8be9fd',
      '--text-primary': '#f8f8f2',
      '--text-secondary': '#cfd8e3',
      '--text-muted': '#6272a4',
      '--border-primary': '#44475a',
      '--border-accent': '#ff79c633',
      '--success': '#50fa7b',
      '--warning': '#f1fa8c',
      '--error': '#ff5555',
      '--info': '#8be9fd',
    },
    gradient: 'radial-gradient(ellipse at 80% 20%, #3a2a4a 0%, #282a36 70%)',
  },
  monokai: {
    name: 'Monokai Pro',
    icon: '🟨',
    colors: {
      '--bg-primary': '#2d2a2e',
      '--bg-secondary': '#221f22',
      '--bg-tertiary': '#3a3740',
      '--accent-primary': '#ffd866',
      '--accent-secondary': '#fc9867',
      '--accent-tertiary': '#ff6188',
      '--text-primary': '#fcfcfa',
      '--text-secondary': '#c1c0c0',
      '--text-muted': '#727072',
      '--border-primary': '#48444a',
      '--border-accent': '#ffd86633',
      '--success': '#a9dc76',
      '--warning': '#ffd866',
      '--error': '#ff6188',
      '--info': '#78dce8',
    },
    gradient: 'radial-gradient(ellipse at 30% 70%, #2a2540 0%, #2d2a2e 70%)',
  },
  nord: {
    name: 'Nord',
    icon: '🏔️',
    colors: {
      '--bg-primary': '#2e3440',
      '--bg-secondary': '#242933',
      '--bg-tertiary': '#3b4252',
      '--accent-primary': '#88c0d0',
      '--accent-secondary': '#81a1c1',
      '--accent-tertiary': '#5e81ac',
      '--text-primary': '#eceff4',
      '--text-secondary': '#d8dee9',
      '--text-muted': '#616e88',
      '--border-primary': '#4c566a',
      '--border-accent': '#88c0d033',
      '--success': '#a3be8c',
      '--warning': '#ebcb8b',
      '--error': '#bf616a',
      '--info': '#88c0d0',
    },
    gradient: 'linear-gradient(160deg, #2e3440 0%, #252b38 100%)',
  },
  solarized: {
    name: 'Solarized Dark',
    icon: '🌻',
    colors: {
      '--bg-primary': '#002b36',
      '--bg-secondary': '#073642',
      '--bg-tertiary': '#0d4455',
      '--accent-primary': '#2aa198',
      '--accent-secondary': '#268bd2',
      '--accent-tertiary': '#6c71c4',
      '--text-primary': '#fdf6e3',
      '--text-secondary': '#eee8d5',
      '--text-muted': '#586e75',
      '--border-primary': '#105068',
      '--border-accent': '#2aa19833',
      '--success': '#859900',
      '--warning': '#b58900',
      '--error': '#dc322f',
      '--info': '#268bd2',
    },
    gradient: 'linear-gradient(135deg, #002b36 0%, #073642 100%)',
  },
  rose: {
    name: 'Rose Pine',
    icon: '🌹',
    colors: {
      '--bg-primary': '#191724',
      '--bg-secondary': '#1f1d2e',
      '--bg-tertiary': '#26233a',
      '--accent-primary': '#eb6f92',
      '--accent-secondary': '#c4a7e7',
      '--accent-tertiary': '#9ccfd8',
      '--text-primary': '#e0def4',
      '--text-secondary': '#e0def4cc',
      '--text-muted': '#6e6a86',
      '--border-primary': '#403d52',
      '--border-accent': '#eb6f9233',
      '--success': '#31748f',
      '--warning': '#f6c177',
      '--error': '#eb6f92',
      '--info': '#9ccfd8',
    },
    gradient: 'radial-gradient(ellipse at 60% 10%, #2a1f3d 0%, #191724 65%)',
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
