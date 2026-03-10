import { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vendor-uiu3.vercel.app'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = await createServiceRoleClient()

  const { data: products } = await supabase
    .from('products')
    .select('title, description, price, images:product_images(url, alt, sort_order), vendor:vendors(business_name)')
    .eq('slug', params.slug)
    .eq('status', 'approved')
    .limit(1)

  if (!products || products.length === 0) {
    return { title: 'Product Not Found' }
  }

  const product = products[0] as any
  const images = (product.images || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
  const mainImage = images[0]?.url || '/og-image.png'
  const vendorName = product.vendor?.business_name || 'Vender'
  const priceStr = `$${(product.price / 1).toFixed(2)}`

  return {
    title: product.title,
    description: product.description?.slice(0, 160) || `${product.title} by ${vendorName} — ${priceStr} on Vender`,
    openGraph: {
      title: `${product.title} — ${priceStr}`,
      description: product.description?.slice(0, 160) || `Shop ${product.title} by ${vendorName} on Vender`,
      type: 'website',
      url: `${SITE_URL}/products/${params.slug}`,
      siteName: 'Vender',
      images: [{ url: mainImage, width: 800, height: 800, alt: product.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.title} — ${priceStr}`,
      description: product.description?.slice(0, 160) || `Shop ${product.title} on Vender`,
      images: [mainImage],
    },
  }
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
