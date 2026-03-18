/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/popup/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: '#2E75B6',
        safe: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        'text-primary': '#1a1a2e',
        'text-secondary': '#6B7280',
        border: '#E5E7EB',
      },
    },
  },
  plugins: [],
};
