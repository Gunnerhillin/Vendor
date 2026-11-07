import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { assetUrl } from '@/lib/media'

export async function GET(request: NextRequest) {
  const bucket = request.nextUrl.searchParams.get('bucket') || 'vendor-assets'
  const path = request.nextUrl.searchParams.get('path') || ''
  if (!['vendor-assets', 'avatars'].includes(bucket) || !path || path.includes('..') || !/^[a-zA-Z0-9/_ .-]+$/.test(path)) {
    return new NextResponse(null, { status: 400 })
  }
  const session = await createServerSupabaseClient()
  const { data: { user } } = await session.auth.getUser()
  const { data: profile } = user ? await session.from('profiles').select('role').eq('id', user.id).single() : { data: null }
  const segments = path.split('/')
  let allowed = profile?.role === 'admin' || !!user && (bucket === 'avatars' ? segments[0] === user.id : segments[1] === user.id)
  const url = assetUrl(path, bucket)
  if (!allowed && bucket === 'vendor-assets' && segments[0] === 'products') {
    const { data } = await session.from('product_images')
      .select('id, product:products!inner(status, vendor:vendors!inner(status))')
      .eq('url', url).eq('product.status', 'approved').eq('product.vendor.status', 'approved').limit(1)
    allowed = !!data?.length
  }
  if (!allowed && bucket === 'vendor-assets' && ['vendor-logo', 'vendor-banner'].includes(segments[0])) {
    const field = segments[0] === 'vendor-logo' ? 'logo_url' : 'banner_url'
    const { data } = await session.from('vendors').select('id').eq(field, url).eq('status', 'approved').limit(1)
    allowed = !!data?.length
  }
  if (!allowed) return new NextResponse(null, { status: 404 })
  const service = await createServiceRoleClient()
  const { data, error } = await service.storage.from(bucket).download(path)
  if (error || !data || !['image/jpeg', 'image/png', 'image/webp'].includes(data.type)) return new NextResponse(null, { status: 404 })
  return new NextResponse(data, { headers: { 'Content-Type': data.type, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
}
