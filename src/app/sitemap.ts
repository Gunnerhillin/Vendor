import { MetadataRoute } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vendor-uiu3.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServiceRoleClient()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/refund-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  // Product pages
  const { data: products } = await supabase
    .from('products')
    .select('slug, updated_at')
    .eq('status', 'approved')

  const productPages: MetadataRoute.Sitemap = (products || []).map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Category pages
  const { data: categories } = await supabase
    .from('categories')
    .select('slug')

  const categoryPages: MetadataRoute.Sitemap = (categories || []).map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Vendor shop pages
  const { data: vendors } = await supabase
    .from('vendors')
    .select('slug, updated_at')
    .eq('status', 'approved')

  const vendorPages: MetadataRoute.Sitemap = (vendors || []).map((v) => ({
    url: `${SITE_URL}/shop/${v.slug}`,
    lastModified: new Date(v.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...productPages, ...categoryPages, ...vendorPages]
}
