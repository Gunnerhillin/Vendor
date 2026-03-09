import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('wishlists')
      .select(
        `
      id,
      product_id,
      created_at,
      product:products(
        id,
        vendor_id,
        category_id,
        title,
        slug,
        description,
        price,
        compare_at_price,
        status,
        inventory_count,
        sold_count,
        is_preorder,
        drop_date,
        rating_avg,
        rating_count,
        created_at,
        updated_at,
        images:product_images(id, url, alt, sort_order),
        vendor:vendors(id, business_name, slug, logo_url)
      )
    `
      )
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Wishlist query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: data || [] })
  } catch (error: any) {
    console.error('GET /api/wishlist error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch wishlist' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { product_id } = await request.json()

    if (!product_id) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
    }

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Toggle: if exists, remove; if not, add
    const { data: existing, error: checkError } = await supabase
      .from('wishlists')
      .select('id')
      .eq('customer_id', user.id)
      .eq('product_id', product_id)
      .single()

    if (existing) {
      // Remove from wishlist
      const { error: deleteError } = await supabase.from('wishlists').delete().eq('id', existing.id)

      if (deleteError) {
        console.error('Wishlist delete error:', deleteError)
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      return NextResponse.json({ added: false })
    } else {
      // Add to wishlist
      const { error: insertError } = await supabase
        .from('wishlists')
        .insert({ customer_id: user.id, product_id })

      if (insertError) {
        console.error('Wishlist insert error:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      return NextResponse.json({ added: true })
    }
  } catch (error: any) {
    console.error('POST /api/wishlist error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update wishlist' }, { status: 500 })
  }
}
