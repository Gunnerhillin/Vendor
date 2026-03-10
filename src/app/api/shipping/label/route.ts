import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { purchaseLabel } from '@/lib/easypost'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { shipmentId, rateId, orderItemId } = body

    if (!shipmentId || !rateId) {
      return NextResponse.json({ error: 'shipmentId and rateId are required' }, { status: 400 })
    }

    // Purchase the label via EasyPost
    const label = await purchaseLabel(shipmentId, rateId)

    // If an orderItemId is provided, update the order item with tracking info
    if (orderItemId) {
      await supabase
        .from('order_items')
        .update({
          tracking_number: label.tracking_code,
          shipping_carrier: label.rate?.carrier || 'unknown',
          status: 'shipped',
          shipped_at: new Date().toISOString(),
        })
        .eq('id', orderItemId)
    }

    return NextResponse.json({
      tracking_code: label.tracking_code,
      label_url: label.label_url,
      carrier: label.rate?.carrier,
      service: label.rate?.service,
      public_tracking_url: label.tracker?.public_url,
    })
  } catch (error: any) {
    console.error('Label purchase error:', error)
    return NextResponse.json({ error: error.message || 'Failed to purchase label' }, { status: 500 })
  }
}
