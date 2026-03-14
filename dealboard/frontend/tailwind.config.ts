import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0F172A',
        muted: '#64748B',
        subtle: '#94A3B8',
        border: '#E2E8F0',
        canvas: '#F7F8FC',
        surface: '#FFFFFF',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(0,0,0,0.05), 0 4px 20px rgba(0,0,0,0.06)',
        pop:  '0 4px 6px rgba(0,0,0,0.07), 0 12px 40px rgba(0,0,0,0.1)',
        glow: '0 0 0 3px rgba(99,102,241,0.2)',
      },
    },
  },
  plugins: [],
};

export default config;
