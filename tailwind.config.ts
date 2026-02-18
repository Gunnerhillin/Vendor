import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2D2926',
        accent: {
          DEFAULT: '#C4956A',
          light: '#E8D5C0',
          dark: '#A67B52',
        },
        warm: {
          bg: '#FDFBF9',
          50: '#FDFBF9',
          100: '#F7F2ED',
          200: '#EDE4DA',
          300: '#E8E2DC',
          400: '#C4BAAF',
          500: '#9E9189',
          border: '#E8E2DC',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
export default config
