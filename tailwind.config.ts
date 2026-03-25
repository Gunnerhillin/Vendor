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
        primary: '#3D2C3E',
        accent: {
          DEFAULT: '#E8839C',
          light: '#F5C6D0',
          dark: '#C96B82',
        },
        warm: {
          bg: '#FDF7F9',
          50: '#FDF7F9',
          100: '#F9EDF1',
          200: '#F3DDE5',
          300: '#EBCFD9',
          400: '#D4A8B8',
          500: '#B08394',
          border: '#EBCFD9',
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
