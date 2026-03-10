import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/deals - List deals
 * Vendors see their own, admins see all
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const status = searchParams.get('status')

    let query = supabase
      .from('deals')
      .select('*, product:products(id, title, slug, price, compare_at_price, images:product_images(url)), vendor:vendors(id, business_name)')
      .order('created_at', { ascending: false })

    if (role === 'vendor') {
      const { data: vendor } = await supabase.from('vendors').select('id').eq('user_id', user.id).single()
      if (vendor) query = query.eq('vendor_id', vendor.id)
    }

    if (status && status !== 'all') query = query.eq('status', status)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ deals: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/deals - Vendor creates a flash deal request
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { product_id, discount_percent, sale_price, starts_at, ends_at } = await request.json()

    if (!product_id || !discount_percent || !starts_at || !ends_at) {
      return NextResponse.json({ error: 'product_id, discount_percent, starts_at, and ends_at are required' }, { status: 400 })
    }

    // Validate deal duration: 3-6 days
    const start = new Date(starts_at)
    const end = new Date(ends_at)
    const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)

    if (durationDays < 3 || durationDays > 6) {
      return NextResponse.json({ error: 'Flash deals must run for 3-6 days' }, { status: 400 })
    }

    if (discount_percent < 5 || discount_percent > 80) {
      return NextResponse.json({ error: 'Discount must be between 5% and 80%' }, { status: 400 })
    }

    // Get vendor
    const { data: vendor } = await supabase.from('vendors').select('id').eq('user_id', user.id).single()
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })

    // Verify product belongs to vendor
    const { data: product } = await supabase
      .from('products')
      .select('id, price, vendor_id')
      .eq('id', product_id)
      .eq('vendor_id', vendor.id)
      .single()

    if (!product) return NextResponse.json({ error: 'Product not found or not yours' }, { status: 404 })

    // Calculate sale price if not provided
    const calculatedSalePrice = sale_price || Math.round(product.price * (1 - discount_percent / 100) * 100) / 100

    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        product_id,
        vendor_id: vendor.id,
        discount_percent,
        sale_price: calculatedSalePrice,
        starts_at,
        ends_at,
        is_active: false, // Not active until admin approves
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ deal })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/deals - Admin approves/rejects deal, or vendor updates pending deal
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deal_id, status, admin_notes } = await request.json()
    if (!deal_id) return NextResponse.json({ error: 'deal_id required' }, { status: 400 })

    // Check if admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile?.role === 'admin'

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can approve/reject deals' }, { status: 403 })
    }

    const updateData: any = {}

    if (status === 'approved') {
      updateData.status = 'approved'
      updateData.is_active = true
      updateData.approved_by = user.id
      updateData.approved_at = new Date().toISOString()

      // When approved, update the product's compare_at_price to the original price
      // and set price to the sale price
      const { data: deal } = await supabase.from('deals').select('product_id, sale_price, discount_percent').eq('id', deal_id).single()
      if (deal) {
        const { data: product } = await supabase.from('products').select('price').eq('id', deal.product_id).single()
        if (product && deal.sale_price) {
          await supabase
            .from('products')
            .update({
              compare_at_price: product.price, // Store original as compare_at
              price: deal.sale_price,           // Set new sale price
            })
            .eq('id', deal.product_id)
        }
      }
    } else if (status === 'rejected') {
      updateData.status = 'rejected'
      updateData.is_active = false
    }

    if (admin_notes) updateData.admin_notes = admin_notes

    const { error } = await supabase.from('deals').update(updateData).eq('id', deal_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
