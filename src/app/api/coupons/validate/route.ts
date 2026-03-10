import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { code, subtotal } = await req.json()

    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .single()

    if (!coupon) {
      return NextResponse.json({ error: 'Invalid or expired coupon code' }, { status: 404 })
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 })
    }

    // Check usage limit
    if (coupon.max_uses && coupon.times_used >= coupon.max_uses) {
      return NextResponse.json({ error: 'This coupon has reached its usage limit' }, { status: 400 })
    }

    // Check minimum order
    if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
      return NextResponse.json({
        error: `Minimum order of $${coupon.min_order_amount.toFixed(2)} required for this coupon`,
      }, { status: 400 })
    }

    // Calculate discount
    let discount = 0
    if (coupon.type === 'percentage') {
      discount = subtotal * (coupon.value / 100)
      if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount)
    } else if (coupon.type === 'fixed') {
      discount = Math.min(coupon.value, subtotal)
    }

    discount = Math.round(discount * 100) / 100

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount,
        description: coupon.type === 'percentage'
          ? `${coupon.value}% off`
          : `$${coupon.value.toFixed(2)} off`,
      },
    })
  } catch (err) {
    console.error('Coupon validation error:', err)
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 })
  }
}
