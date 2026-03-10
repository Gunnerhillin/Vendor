import { NextRequest, NextResponse } from 'next/server'
import { verifyAddress } from '@/lib/easypost'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = body

    if (!address || !address.street1) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    const result = await verifyAddress({
      name: address.name || '',
      street1: address.street1,
      street2: address.street2,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country || 'US',
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Address verify error:', error)
    return NextResponse.json({ error: error.message || 'Failed to verify address' }, { status: 500 })
  }
}
