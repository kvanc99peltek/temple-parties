import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Legacy cherry colors (keeping for backwards compatibility)
        cherry: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // New Temple color system
        temple: {
          purple: '#A855F7',
          'purple-light': '#B869F8',
          'purple-dark': '#9333EA',
          green: '#10B981',
          'green-dark': '#059669',
          gold: '#F59E0B',
          'gold-dark': '#D97706',
          orange: '#F97316',
          pink: '#EC4899',
          'pink-dark': '#DB2777',
        },
      },
      boxShadow: {
        'purple-glow': '0 4px 20px rgba(168, 85, 247, 0.3)',
        'purple-glow-lg': '0 8px 30px rgba(168, 85, 247, 0.4)',
        'green-glow': '0 4px 16px rgba(16, 185, 129, 0.4)',
        'gold-glow': '0 0 15px rgba(245, 158, 11, 0.5)',
      },
      fontFamily: {
        logo: ['Garamond', 'Georgia', 'Times New Roman', 'serif'],
        georgia: ['Georgia', 'Times New Roman', 'serif'],  // Add this
        sans: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translate(-50%, 20px)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)' },
          '50%': { boxShadow: '0 0 25px rgba(245, 158, 11, 0.7)' },
        },
        'slide-up-fade': {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'number-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        'going-click': {
          '0%': { transform: 'scale(0.95)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up-fade': 'slide-up-fade 400ms ease-out',
        'number-pop': 'number-pop 300ms ease-out',
        'going-click': 'going-click 300ms ease-out',
      },
    },
  },
  plugins: [],
};
export default config;
