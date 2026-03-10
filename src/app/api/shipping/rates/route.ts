import { NextRequest, NextResponse } from 'next/server'
import { getShippingRates } from '@/lib/easypost'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, parcel } = body

    if (!address || !address.street1 || !address.city || !address.state || !address.zip) {
      return NextResponse.json({ error: 'Valid shipping address is required' }, { status: 400 })
    }

    const result = await getShippingRates(
      {
        name: address.name || 'Customer',
        street1: address.street1,
        street2: address.street2,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country || 'US',
      },
      undefined, // use default from address
      parcel,    // optional custom parcel
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Shipping rates error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get shipping rates' }, { status: 500 })
  }
}
