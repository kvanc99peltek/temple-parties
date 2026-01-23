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
          pink: '#FA4693',
          'pink-light': '#FB6BA8',
          'pink-dark': '#E83A82',
          green: '#10B981',
          'green-dark': '#059669',
          gold: '#FFD666',
          'gold-dark': '#E6C05C',
          card: '#202023',
        },
      },
      boxShadow: {
        'pink-glow': '0 4px 20px rgba(250, 70, 147, 0.3)',
        'pink-glow-lg': '0 8px 30px rgba(250, 70, 147, 0.4)',
        'green-glow': '0 4px 16px rgba(16, 185, 129, 0.4)',
        'gold-glow': '0 0 15px rgba(255, 214, 102, 0.5)',
      },
      fontFamily: {
        'bitcount': ['"Bitcount Prop Single"', 'sans-serif'],
        'basement': ['"Basement Grotesque"', 'sans-serif'],
        'montserrat-alt': ['"Montserrat Alternates"', 'sans-serif'],
        'montserrat': ['Montserrat', 'sans-serif'],
        'helvetica': ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        logo: ['Garamond', 'Georgia', 'Times New Roman', 'serif'],
        georgia: ['Georgia', 'Times New Roman', 'serif'],
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
          '0%, 100%': { boxShadow: '0 0 15px rgba(255, 214, 102, 0.4)' },
          '50%': { boxShadow: '0 0 25px rgba(255, 214, 102, 0.7)' },
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
