/**
 * EasyPost Shipping API Integration
 *
 * SETUP REQUIRED:
 * 1. Sign up at https://www.easypost.com
 * 2. Get your API keys from the dashboard
 * 3. Add EASYPOST_API_KEY to .env.local (use test key for development)
 * 4. Enable carriers in EasyPost dashboard (USPS, UPS, FedEx, etc.)
 *
 * Docs: https://docs.easypost.com/
 * Node SDK: https://www.easypost.com/docs/api/node
 */

const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY || ''
const EASYPOST_BASE_URL = 'https://api.easypost.com/v2'

// ─── TYPES ──────────────────────────────────────────────

export interface EasyPostAddress {
  name: string
  street1: string
  street2?: string
  city: string
  state: string
  zip: string
  country: string
  phone?: string
  email?: string
}

export interface EasyPostParcel {
  length: number  // inches
  width: number   // inches
  height: number  // inches
  weight: number  // ounces
}

export interface ShippingRate {
  id: string
  carrier: string
  service: string
  rate: string
  currency: string
  delivery_days: number | null
  est_delivery_date: string | null
  carrier_account_id: string
}

export interface ShipmentResult {
  id: string
  rates: ShippingRate[]
  from_address: any
  to_address: any
}

export interface LabelResult {
  id: string
  tracking_code: string
  label_url: string
  rate: ShippingRate
  tracker: {
    id: string
    public_url: string
  }
}

export interface TrackingResult {
  id: string
  tracking_code: string
  status: string
  status_detail: string
  carrier: string
  est_delivery_date: string | null
  tracking_details: {
    message: string
    status: string
    datetime: string
    source: string
    city: string
    state: string
    country: string
  }[]
  public_url: string
}

// ─── HELPERS ────────────────────────────────────────────

async function easyPostRequest(endpoint: string, method: string = 'GET', body?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${Buffer.from(EASYPOST_API_KEY + ':').toString('base64')}`,
  }

  const res = await fetch(`${EASYPOST_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(err.error?.message || `EasyPost API error: ${res.status}`)
  }

  return res.json()
}

// ─── DEFAULT ORIGIN ADDRESS ─────────────────────────────
// ADMIN REMINDER: Update this with your actual warehouse/fulfillment address
const DEFAULT_FROM_ADDRESS: EasyPostAddress = {
  name: 'CutieValley Fulfillment',
  street1: '123 Commerce St',
  city: 'New York',
  state: 'NY',
  zip: '10001',
  country: 'US',
  phone: '5555555555',
}

// Default parcel for rate estimates (vendors can override per-product)
// ADMIN REMINDER: Adjust default parcel dimensions based on your typical product sizes
const DEFAULT_PARCEL: EasyPostParcel = {
  length: 12,
  width: 8,
  height: 6,
  weight: 16, // 1 lb
}

// ─── PUBLIC API ─────────────────────────────────────────

/**
 * Get shipping rates for an order
 */
export async function getShippingRates(
  toAddress: EasyPostAddress,
  fromAddress?: EasyPostAddress,
  parcel?: EasyPostParcel
): Promise<{ shipmentId: string; rates: ShippingRate[] }> {
  // If EasyPost isn't configured, return fallback rates
  if (!EASYPOST_API_KEY) {
    return getFallbackRates()
  }

  const shipment = await easyPostRequest('/shipments', 'POST', {
    shipment: {
      from_address: fromAddress || DEFAULT_FROM_ADDRESS,
      to_address: toAddress,
      parcel: parcel || DEFAULT_PARCEL,
    },
  })

  // Sort rates by price
  const sortedRates = (shipment.rates || [])
    .sort((a: ShippingRate, b: ShippingRate) => parseFloat(a.rate) - parseFloat(b.rate))

  return {
    shipmentId: shipment.id,
    rates: sortedRates,
  }
}

/**
 * Purchase a shipping label for a shipment
 */
export async function purchaseLabel(
  shipmentId: string,
  rateId: string
): Promise<LabelResult> {
  if (!EASYPOST_API_KEY) {
    throw new Error('EasyPost API key not configured. Add EASYPOST_API_KEY to environment variables.')
  }

  const result = await easyPostRequest(`/shipments/${shipmentId}/buy`, 'POST', {
    rate: { id: rateId },
  })

  return {
    id: result.id,
    tracking_code: result.tracking_code,
    label_url: result.postage_label?.label_url || '',
    rate: result.selected_rate,
    tracker: {
      id: result.tracker?.id || '',
      public_url: result.tracker?.public_url || '',
    },
  }
}

/**
 * Track a shipment by tracking code
 */
export async function trackShipment(
  trackingCode: string,
  carrier?: string
): Promise<TrackingResult> {
  if (!EASYPOST_API_KEY) {
    throw new Error('EasyPost API key not configured.')
  }

  const body: any = { tracker: { tracking_code: trackingCode } }
  if (carrier) body.tracker.carrier = carrier

  const tracker = await easyPostRequest('/trackers', 'POST', body)

  return {
    id: tracker.id,
    tracking_code: tracker.tracking_code,
    status: tracker.status,
    status_detail: tracker.status_detail,
    carrier: tracker.carrier,
    est_delivery_date: tracker.est_delivery_date,
    tracking_details: tracker.tracking_details || [],
    public_url: tracker.public_url,
  }
}

/**
 * Verify / validate an address
 */
export async function verifyAddress(address: EasyPostAddress): Promise<{
  verified: boolean
  address: EasyPostAddress
  messages: string[]
}> {
  if (!EASYPOST_API_KEY) {
    return { verified: true, address, messages: ['Address verification unavailable — EasyPost not configured'] }
  }

  const result = await easyPostRequest('/addresses/create_and_verify', 'POST', {
    address: {
      name: address.name,
      street1: address.street1,
      street2: address.street2,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country,
    },
  })

  const verifications = result.verifications?.delivery
  const isVerified = verifications?.success === true
  const messages = (verifications?.errors || []).map((e: any) => e.message)

  return {
    verified: isVerified,
    address: {
      name: result.name,
      street1: result.street1,
      street2: result.street2,
      city: result.city,
      state: result.state,
      zip: result.zip,
      country: result.country,
    },
    messages,
  }
}

// ─── FALLBACK RATES (when EasyPost is not configured) ───

function getFallbackRates(): { shipmentId: string; rates: ShippingRate[] } {
  return {
    shipmentId: 'fallback_no_api',
    rates: [
      {
        id: 'fallback_standard',
        carrier: 'USPS',
        service: 'Standard Shipping',
        rate: '5.99',
        currency: 'USD',
        delivery_days: 5,
        est_delivery_date: null,
        carrier_account_id: '',
      },
      {
        id: 'fallback_priority',
        carrier: 'USPS',
        service: 'Priority Mail',
        rate: '9.99',
        currency: 'USD',
        delivery_days: 3,
        est_delivery_date: null,
        carrier_account_id: '',
      },
      {
        id: 'fallback_express',
        carrier: 'UPS',
        service: 'Express Shipping',
        rate: '19.99',
        currency: 'USD',
        delivery_days: 1,
        est_delivery_date: null,
        carrier_account_id: '',
      },
    ],
  }
}
