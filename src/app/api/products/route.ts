import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const vendor = searchParams.get('vendor')
    const search = searchParams.get('q')
    const sort = searchParams.get('sort') || 'newest'
    const limit = parseInt(searchParams.get('limit') || '24')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('products')
      .select(
        `
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
      vendor:vendors(id, business_name, slug, logo_url),
      category:categories(id, name, slug, icon),
      images:product_images(id, url, alt, sort_order),
      variants:product_variants(id, name, type, value, price_adjustment, inventory_count, sort_order)
    `,
        { count: 'exact' }
      )
      .eq('status', 'approved')

    // Filter by category
    if (category) {
      // Get category ID from slug
      const { data: categoryData } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .single()

      if (categoryData) {
        query = query.eq('category_id', categoryData.id)
      }
    }

    // Filter by vendor
    if (vendor) {
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('id')
        .eq('slug', vendor)
        .single()

      if (vendorData) {
        query = query.eq('vendor_id', vendorData.id)
      }
    }

    // Full-text search
    if (search) {
      const searchQuery = search.split(' ').join(' & ')
      query = query.textSearch('search_vector', searchQuery)
    }

    // Sort
    switch (sort) {
      case 'price_asc':
        query = query.order('price', { ascending: true })
        break
      case 'price_desc':
        query = query.order('price', { ascending: false })
        break
      case 'popular':
        query = query.order('sold_count', { ascending: false })
        break
      case 'rating':
        query = query.order('rating_avg', { ascending: false })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Products query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ products: data || [], total: count || 0 })
  } catch (error: any) {
    console.error('GET /api/products error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get vendor
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id, status')
      .eq('user_id', user.id)
      .single()

    if (vendorError || !vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    if (vendor.status !== 'approved') {
      return NextResponse.json({ error: 'Not an approved vendor' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, price, compare_at_price, category_id, inventory_count, is_preorder, drop_date, images, variants } = body

    // Validation
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!price || typeof price !== 'number') {
      return NextResponse.json({ error: 'Price is required and must be a number' }, { status: 400 })
    }

    if (!category_id) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    // Create slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Insert product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        vendor_id: vendor.id,
        category_id,
        title,
        slug,
        description: description || '',
        price,
        compare_at_price: compare_at_price || null,
        status: 'pending', // needs admin approval
        inventory_count: inventory_count || 0,
        is_preorder: is_preorder || false,
        drop_date: drop_date || null,
      })
      .select()
      .single()

    if (productError || !product) {
      console.error('Product creation error:', productError)
      return NextResponse.json({ error: productError?.message || 'Failed to create product' }, { status: 500 })
    }

    // Insert images
    if (images && Array.isArray(images) && images.length > 0) {
      const imageRecords = images.map((img: any, i: number) => ({
        product_id: product.id,
        url: img.url,
        alt: img.alt || title,
        sort_order: i,
      }))
      await supabase.from('product_images').insert(imageRecords)
    }

    // Insert variants
    if (variants && Array.isArray(variants) && variants.length > 0) {
      const variantRecords = variants.map((v: any, i: number) => ({
        product_id: product.id,
        name: v.name,
        type: v.type,
        value: v.value,
        price_adjustment: v.price_adjustment || 0,
        inventory_count: v.inventory_count || 0,
        sort_order: i,
      }))
      await supabase.from('product_variants').insert(variantRecords)
    }

    return NextResponse.json({ product })
  } catch (error: any) {
    console.error('POST /api/products error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 500 })
  }
}
