import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shop Local Saint George Utah | CutieValley Marketplace',
  description: 'Discover products from local creators and small businesses in Saint George, Utah. Support your neighbors — shop handmade goods, artisan products, and local brands on CutieValley.',
  keywords: [
    'shop local saint george utah',
    'local marketplace saint george',
    'southern utah small business',
    'handmade goods saint george',
    'local artisans utah',
    'buy local st george',
    'saint george utah marketplace',
    'local vendors southern utah',
    'shop small saint george',
    'utah local products',
  ],
  openGraph: {
    title: 'Shop Local in Saint George, Utah | CutieValley',
    description: 'Support local creators and small businesses in Southern Utah. Handmade goods, artisan products, and more — all from your neighbors.',
    type: 'website',
    locale: 'en_US',
  },
}

export default function LocalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
