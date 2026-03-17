import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0b',
        gold: '#d4af37',
        ember: '#b6862c'
      }
    }
  },
  plugins: []
};

export default config;
