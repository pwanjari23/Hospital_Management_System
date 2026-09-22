/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060D1A',
          900: '#0A192F',
          800: '#112240',
          700: '#1E3A8A',
        },
        brand: {
          blue: '#3B82F6',
          light: '#E0F2FE',
          accent: '#2563EB',
        },
        surface: {
          subtle: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(10, 25, 47, 0.06), 0 2px 6px -1px rgba(10, 25, 47, 0.04)',
        elevated: '0 20px 35px -8px rgba(10, 25, 47, 0.08), 0 8px 16px -4px rgba(10, 25, 47, 0.04)',
      },
    },
  },
  plugins: [],
};
