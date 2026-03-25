export const SITE_NAME = 'CutieValley'
export const SITE_DESCRIPTION = 'Discover deals you\'ll love from independent brands'
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const DEFAULT_COMMISSION_RATE = 0.25 // 25% platform commission

export const PRODUCT_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export const VENDOR_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FROZEN: 'frozen',
} as const

export const ORDER_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const

export const PAYOUT_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
} as const

export const CATEGORIES = [
  { name: 'Clothing', slug: 'clothing', icon: '👗' },
  { name: 'Kids & Baby', slug: 'kids-baby', icon: '👶' },
  { name: 'Home Decor', slug: 'home-decor', icon: '🏠' },
  { name: 'Accessories', slug: 'accessories', icon: '👜' },
  { name: 'Health & Wellness', slug: 'health-wellness', icon: '🧘' },
  { name: 'Men', slug: 'men', icon: '👔' },
  { name: 'Beauty', slug: 'beauty', icon: '💄' },
] as const

export const ITEMS_PER_PAGE = 24
