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
        ink:    '#E8EAED',
        muted:  '#9AA0A6',
        subtle: '#5F6368',
        border: '#272730',
        canvas: '#0B0B0E',
        surface:'#111115',
        'gem-blue':   '#4285F4',
        'gem-purple': '#9334E6',
        'gem-pink':   '#E8437B',
        'gem-teal':   '#34A8EB',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.4)',
        pop:  '0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.6)',
        glow: '0 0 0 2px rgba(66,133,244,0.4), 0 0 20px rgba(66,133,244,0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
