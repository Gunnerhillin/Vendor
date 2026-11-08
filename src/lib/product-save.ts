import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function saveProduct(request: NextRequest, id: string | null) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid product data' }, { status: 400 }) }
  if (!body || Array.isArray(body) || typeof body !== 'object') return NextResponse.json({ error: 'Invalid product data' }, { status: 400 })
  const { data, error } = await supabase.rpc('save_vendor_product', { product_id_arg: id, payload: body })
  if (error) {
    const status = error.code === '42501' ? 403 : error.code === '40001' ? 409 :
      error.code === 'P0001' || error.code?.startsWith('22') || error.code === '23503' ? 400 : 500
    return NextResponse.json({ error: status === 500 ? 'Product could not be saved. Please try again.' : error.message }, { status })
  }
  return NextResponse.json({ product: data }, { status: id ? 200 : 201 })
}
