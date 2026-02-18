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
          100: '#F7F2ED',
          200: '#EDE4DA',
          border: '#E8E2DC',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
