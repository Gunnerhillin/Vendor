import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const productId = params.id

    // Verify product belongs to user's vendor
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, vendor_id, vendors(user_id)')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const vendor = Array.isArray(product.vendors) ? product.vendors[0] : product.vendors
    if (!vendor || vendor.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, price, compare_at_price, category_id, inventory_count, status, images, variants } = body

    // Build updates object
    const updates: any = {}
    if (title !== undefined) {
      updates.title = title
      updates.slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }
    if (description !== undefined) updates.description = description
    if (price !== undefined) updates.price = price
    if (compare_at_price !== undefined) updates.compare_at_price = compare_at_price
    if (category_id !== undefined) updates.category_id = category_id
    if (inventory_count !== undefined) updates.inventory_count = inventory_count
    if (status !== undefined) updates.status = status

    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select()
      .single()

    if (updateError) {
      console.error('Product update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Update images if provided
    if (images !== undefined) {
      await supabase.from('product_images').delete().eq('product_id', productId)
      if (Array.isArray(images) && images.length > 0) {
        const imageRecords = images.map((img: any, i: number) => ({
          product_id: productId,
          url: img.url,
          alt: img.alt || '',
          sort_order: i,
        }))
        await supabase.from('product_images').insert(imageRecords)
      }
    }

    // Update variants if provided
    if (variants !== undefined) {
      await supabase.from('product_variants').delete().eq('product_id', productId)
      if (Array.isArray(variants) && variants.length > 0) {
        const variantRecords = variants.map((v: any, i: number) => ({
          product_id: productId,
          name: v.name,
          type: v.type,
          value: v.value,
          price_adjustment: v.price_adjustment || 0,
          inventory_count: v.inventory_count || 0,
          sort_order: i,
        }))
        await supabase.from('product_variants').insert(variantRecords)
      }
    }

    return NextResponse.json({ product: updatedProduct })
  } catch (error: any) {
    console.error('PUT /api/products/[id] error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const productId = params.id

    // Verify product belongs to user's vendor
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, vendor_id, vendors(user_id)')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const vendor = Array.isArray(product.vendors) ? product.vendors[0] : product.vendors
    if (!vendor || vendor.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error: deleteError } = await supabase.from('products').delete().eq('id', productId)

    if (deleteError) {
      console.error('Product delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/products/[id] error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete product' }, { status: 500 })
  }
}
