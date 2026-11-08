import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { saveProduct } from '@/lib/product-save'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return saveProduct(request, params.id)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  const { data: vendor } = await supabase.from('vendors').select('id').eq('user_id', user.id).single()
  if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })
  const { data, error } = await supabase.from('products').delete().eq('id', params.id)
    .eq('vendor_id', vendor.id).eq('status', 'draft').select('id').maybeSingle()
  if (error) return NextResponse.json({ error: 'This product could not be deleted. Products linked to orders must be kept.' }, { status: 409 })
  if (!data) return NextResponse.json({ error: 'Only your own draft products can be deleted. Move this listing to draft first.' }, { status: 409 })
  return NextResponse.json({ success: true })
}
