/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        baby: '#BFE6FF',
        sky: '#91D5FF',
        mist: '#E7F5FF',
        cloud: '#F7FBFF',
        navy: '#17345C',
        deep: '#102541',
        lavender: '#E7E2FF',
        blush: '#FFDCE8',
        mint: '#D9F5E5',
        butter: '#FFF0B8',
        slate: '#71839B',
        border: '#DCEAF7',
      },
      fontFamily: {
        rounded: ['Nunito', 'Quicksand', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        cozy: '0 18px 50px rgba(23, 52, 92, 0.10)',
      },
    },
  },
  plugins: [],
}
