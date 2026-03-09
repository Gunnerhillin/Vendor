import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')

    if (!productId) {
      return NextResponse.json({ error: 'product_id required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('reviews')
      .select('id, product_id, customer_id, rating, comment, created_at, customer:profiles(full_name, avatar_url)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Reviews query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reviews: data || [] })
  } catch (error: any) {
    console.error('GET /api/reviews error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch reviews' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { product_id, rating, comment } = await request.json()

    // Validation
    if (!product_id) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
    }

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
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

    // Check if user already reviewed this product
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('product_id', product_id)
      .eq('customer_id', user.id)
      .single()

    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 409 })
    }

    // Insert review
    const { data: review, error: insertError } = await supabase
      .from('reviews')
      .insert({
        product_id,
        customer_id: user.id,
        rating,
        comment: comment || null,
      })
      .select('id, product_id, customer_id, rating, comment, created_at')
      .single()

    if (insertError) {
      console.error('Review insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Update product rating
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', product_id)

    if (!reviewsError && reviews && reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      const roundedAvg = Math.round(avg * 100) / 100

      await supabase
        .from('products')
        .update({ rating_avg: roundedAvg, rating_count: reviews.length })
        .eq('id', product_id)
    }

    return NextResponse.json({ review })
  } catch (error: any) {
    console.error('POST /api/reviews error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create review' }, { status: 500 })
  }
}
