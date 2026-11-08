import { saveProduct } from '@/lib/product-save'
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
  return saveProduct(request, null)
}
