export type UserRole = 'customer' | 'vendor' | 'admin'

export type VendorStatus = 'pending' | 'approved' | 'rejected' | 'frozen'
export type ProductStatus = 'draft' | 'pending' | 'approved' | 'rejected'
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  created_at: string
}

export interface Vendor {
  id: string
  user_id: string
  business_name: string
  slug: string
  description: string | null
  logo_url: string | null
  banner_url: string | null
  status: VendorStatus
  commission_rate: number
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean
  applied_at: string
  approved_at: string | null
  total_sales: number
  total_revenue: number
  product_count: number
  city: string | null
  state: string | null
  is_local: boolean
  offers_local_pickup: boolean
  pickup_address: string | null
  pickup_instructions: string | null
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string
  description: string | null
  sort_order: number
  product_count: number
}

export interface Product {
  id: string
  vendor_id: string
  vendor?: Vendor
  category_id: string
  category?: Category
  title: string
  slug: string
  description: string
  price: number
  compare_at_price: number | null
  status: ProductStatus
  inventory_count: number
  sold_count: number
  is_preorder: boolean
  drop_date: string | null
  images: ProductImage[]
  variants: ProductVariant[]
  rating_avg: number
  rating_count: number
  created_at: string
  updated_at: string
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
  alt: string | null
  sort_order: number
}

export interface ProductVariant {
  id: string
  product_id: string
  name: string
  type: 'size' | 'color'
  value: string
  price_adjustment: number
  inventory_count: number
  sort_order: number
}

export interface Order {
  id: string
  customer_id: string
  customer?: Profile
  status: OrderStatus
  subtotal: number
  tax: number
  shipping: number
  total: number
  stripe_payment_id: string | null
  shipping_address: ShippingAddress
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product?: Product
  variant_id: string | null
  variant?: ProductVariant
  vendor_id: string
  vendor?: Vendor
  quantity: number
  unit_price: number
  status: OrderStatus
}

export interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postal_code: string
  country: string
}

export interface Payout {
  id: string
  vendor_id: string
  vendor?: Vendor
  amount: number
  status: PayoutStatus
  stripe_payout_id: string | null
  period_start: string
  period_end: string
  created_at: string
  paid_at: string | null
}

export interface Review {
  id: string
  product_id: string
  customer_id: string
  customer?: Profile
  rating: number
  comment: string | null
  created_at: string
}

export interface WishlistItem {
  id: string
  customer_id: string
  product_id: string
  product?: Product
  created_at: string
}

export interface Deal {
  id: string
  product_id: string
  product?: Product
  discount_percent: number
  starts_at: string
  ends_at: string
  is_active: boolean
}

export interface CartItem {
  product: Product
  variant: ProductVariant | null
  quantity: number
}

export interface DashboardStats {
  totalRevenue: number
  revenueChange: number
  totalOrders: number
  ordersChange: number
  activeProducts: number
  pendingProducts: number
  nextPayoutAmount: number
  nextPayoutDate: string
}

export interface AdminStats {
  platformRevenue: number
  revenueChange: number
  activeVendors: number
  newVendors: number
  totalOrders: number
  ordersGrowth: number
  pendingPayouts: number
  nextPayoutDate: string
}
