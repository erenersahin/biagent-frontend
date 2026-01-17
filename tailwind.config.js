/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // JIRA status colors
    'bg-gray-400',
    'bg-gray-500',
    'bg-red-600',
    'bg-blue-600',
    'bg-amber-500',
    'bg-cyan-600',
    'bg-purple-600',
    'bg-emerald-600',
    'bg-green-600',
    'text-white',
    'text-black',
    // Epic badge
    'bg-purple-100',
    'text-purple-700',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Palette
        primary: {
          DEFAULT: '#F0FB29',
          dark: '#202020',
        },
        secondary: '#AEE3FD',

        // Backgrounds
        'bg-page': '#F5F5F5',
        'bg-card': '#FFFFFF',
        'bg-card-accent': '#F0FB29',
        'bg-reasoning': '#F5F5F5',

        // Text Colors
        'text-heading': '#202020',
        'text-body': '#333333',
        'text-muted': '#9CA3AF',

        // State Colors
        success: '#22C55E',
        error: '#EF4444',
        warning: '#F0FB29',
        info: '#AEE3FD',
        pending: '#9CA3AF',

        // Diff Colors
        'diff-removed': '#AEE3FD',
        'diff-added': '#D1FAE5',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Arial', '"Helvetica Neue"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"Courier New"', 'monospace'],
      },
      borderRadius: {
        'pill': '100px',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(240, 251, 41, 0.7)' },
          '50%': { boxShadow: '0 0 0 4px rgba(240, 251, 41, 0)' },
        },
        tokenFadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pulse: 'pulse 1.5s infinite',
        token: 'tokenFadeIn 50ms ease',
        blink: 'blink 1s infinite',
        slideDown: 'slideDown 300ms ease-out',
      },
    },
  },
  plugins: [],
}
