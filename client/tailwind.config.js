/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Cyberpunk Neon Theme
        cyber: {
          bg: {
            primary: '#0a0e27',
            secondary: '#0f1729',
            tertiary: '#1a1f3a',
          },
          accent: {
            cyan: '#00d9ff',
            magenta: '#ff00ff',
            purple: '#7000ff',
          },
          text: {
            primary: '#ffffff',
            secondary: '#b4c6fc',
            muted: '#6b7ba8',
          },
          border: {
            primary: '#1e2a4a',
            accent: '#00d9ff33',
          },
          status: {
            success: '#00ff88',
            warning: '#ffaa00',
            error: '#ff0055',
            info: '#00d9ff',
          }
        }
      },
      backgroundImage: {
        'gradient-cyber': 'linear-gradient(135deg, #0a0e27 0%, #0f1729 50%, #1a1f3a 100%)',
        'gradient-neon': 'linear-gradient(90deg, #00d9ff, #ff00ff, #7000ff)',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 217, 255, 0.3)',
        'glow-magenta': '0 0 20px rgba(255, 0, 255, 0.3)',
        'glow-purple': '0 0 20px rgba(112, 0, 255, 0.3)',
      },
      animation: {
        'gradient': 'gradient 3s ease infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 217, 255, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 217, 255, 0.6)' },
        }
      }
    },
  },
  plugins: [],
};
