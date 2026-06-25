/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Official Mantle Network Brand Colors
        mantle: {
          black: '#000000',
          white: '#FFFFFF',
          primary: '#000000',
          accent: '#00D4AA',
          teal: '#00D4AA',
          cyan: '#00D4AA',
          secondary: '#1A1A1A',
          dark: '#0A0A0A',
          gray: {
            50: '#F5F5F5',
            100: '#E5E5E5',
            200: '#CCCCCC',
            300: '#B3B3B3',
            400: '#999999',
            500: '#808080',
            600: '#666666',
            700: '#4D4D4D',
            800: '#333333',
            900: '#1A1A1A',
          }
        },
        // AI Agent specific colors (Mantle themed)
        ai: {
          primary: '#00D4AA',
          secondary: '#00A896',
          glow: 'rgba(0, 212, 170, 0.3)',
        },
        // Keep compatibility with existing code
        primary: {
          50: '#e6faf6',
          100: '#ccf5ed',
          200: '#99eadb',
          300: '#66e0c9',
          400: '#33d5b7',
          500: '#00D4AA',
          600: '#00a088',
          700: '#007866',
          800: '#005044',
          900: '#002822',
        },
        success: {
          50: '#e6faf6',
          500: '#00D4AA',
          600: '#00a088',
        },
        danger: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        },
        // Trading specific colors (Mantle themed)
        'bull-green': '#00D4AA',
        'bear-red': '#ff3366',
        'neon-blue': '#00D4AA',
        'neon-purple': '#a855f7',
        'dark-bg': '#000000',
        'dark-surface': '#1A1A1A',
        'dark-border': '#2A2A2A',
      },
      backgroundImage: {
        'mantle-gradient': 'linear-gradient(135deg, #00D4AA 0%, #00A896 100%)',
        'mantle-gradient-dark': 'linear-gradient(135deg, #000000 0%, #1A1A1A 100%)',
        'mantle-radial': 'radial-gradient(circle at center, rgba(0, 212, 170, 0.1) 0%, transparent 70%)',
      },
      boxShadow: {
        'mantle-glow': '0 0 20px rgba(0, 212, 170, 0.3)',
        'mantle-glow-strong': '0 0 30px rgba(0, 212, 170, 0.5)',
        'mantle-glow-intense': '0 0 40px rgba(0, 212, 170, 0.7)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['Consolas', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      fontSize: {
        xs: ['13px', { lineHeight: '1.45' }],
        sm: ['14px', { lineHeight: '1.45' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'pulse-mantle': 'pulseMantle 2s ease-in-out infinite',
        'countdown': 'countdown 1s ease-in-out',
        'price-up': 'priceUp 0.6s ease-out',
        'price-down': 'priceDown 0.6s ease-out',
        'glow-mantle': 'glowMantle 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 212, 170, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 212, 170, 0.8)' },
        },
        pulseMantle: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 212, 170, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 212, 170, 0.6)' },
        },
        glowMantle: {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(0, 212, 170, 0.3)',
            borderColor: 'rgba(0, 212, 170, 0.5)'
          },
          '50%': {
            boxShadow: '0 0 40px rgba(0, 212, 170, 0.6)',
            borderColor: 'rgba(0, 212, 170, 1)'
          },
        },
        countdown: {
          '0%': { transform: 'scale(1.2)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        priceUp: {
          '0%': { transform: 'scale(1)', color: '#ffffff' },
          '50%': { transform: 'scale(1.1)', color: '#00D4AA' },
          '100%': { transform: 'scale(1)', color: '#00D4AA' },
        },
        priceDown: {
          '0%': { transform: 'scale(1)', color: '#ffffff' },
          '50%': { transform: 'scale(1.1)', color: '#ff3366' },
          '100%': { transform: 'scale(1)', color: '#ff3366' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
