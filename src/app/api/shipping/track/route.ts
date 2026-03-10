import { NextRequest, NextResponse } from 'next/server'
import { trackShipment } from '@/lib/easypost'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackingCode = searchParams.get('code')
    const carrier = searchParams.get('carrier') || undefined

    if (!trackingCode) {
      return NextResponse.json({ error: 'Tracking code is required' }, { status: 400 })
    }

    const tracking = await trackShipment(trackingCode, carrier)

    return NextResponse.json(tracking)
  } catch (error: any) {
    console.error('Tracking error:', error)
    return NextResponse.json({ error: error.message || 'Failed to track shipment' }, { status: 500 })
  }
}
