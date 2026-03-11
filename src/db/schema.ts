import { pgTable, text, integer, timestamp, boolean, numeric } from 'drizzle-orm/pg-core'

// ============================================
// CATEGORIES
// ============================================
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').default('icon'), // 'icon' or 'image'
  icon: text('icon'),
  image: text('image'),
  items: integer('items').default(0),
  status: text('status').default('Active'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// PRODUCTS
// ============================================
export const products = pgTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  categoryId: text('category_id').references(() => categories.id),
  image: text('image').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  oldPrice: numeric('old_price', { precision: 10, scale: 2 }),
  discount: text('discount').default('0%'), // Legacy field - kept for backward compatibility
  discountType: text('discount_type').default('pct'), // 'pct' for percentage, 'fixed' for fixed amount
  discountValue: numeric('discount_value', { precision: 10, scale: 2 }).default('0'), // Numeric value: 10 for 10% or 50 for 50 TK
  offer: boolean('offer').default(false),
  status: text('status').default('active'),
  shortDesc: text('short_desc'),
  longDesc: text('long_desc'),
  weight: text('weight'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const variants = pgTable('variants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  stock: integer('stock').notNull(),
  initialStock: integer('initial_stock').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).default('0'),
  discount: text('discount').default('0%'), // Legacy field - kept for backward compatibility
  discountType: text('discount_type').default('pct'), // 'pct' for percentage, 'fixed' for fixed amount
  discountValue: numeric('discount_value', { precision: 10, scale: 2 }).default('0'), // Numeric value: 10 for 10% or 50 for 50 TK
  productId: integer('product_id').references(() => products.id).notNull(),
})

export const productImages = pgTable('product_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull(),
  sortOrder: integer('sort_order').default(0),
  productId: integer('product_id').references(() => products.id).notNull(),
})

export const productFaqs = pgTable('product_faqs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  sortOrder: integer('sort_order').default(0),
  productId: integer('product_id').references(() => products.id).notNull(),
})

export const relatedProducts = pgTable('related_products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  relatedProductId: integer('related_product_id').references(() => products.id).notNull(),
  sortOrder: integer('sort_order').default(0),
  productId: integer('product_id').references(() => products.id).notNull(),
})

// ============================================
// CUSTOMERS
// ============================================
export const customers = pgTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  address: text('address'),
  email: text('email'),
  totalSpent: numeric('total_spent', { precision: 10, scale: 2 }).default('0'),
  totalOrders: integer('total_orders').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// REVIEWS
// ============================================
export const reviews = pgTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  initials: text('initials').notNull(),
  name: text('name').notNull(),
  rating: integer('rating').notNull(),
  text: text('text').notNull(),
  date: text('date').notNull(),
  productId: integer('product_id').references(() => products.id),
  customerId: integer('customer_id').references(() => customers.id),
})

// ============================================
// ORDERS
// ============================================
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id),
  customerName: text('customer_name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  note: text('note'), // Customer note for delivery instructions
  date: text('date').notNull(),
  time: text('time').notNull(),
  paymentMethod: text('payment_method').notNull(),
  status: text('status').default('pending'), // pending, approved, canceled
  courierStatus: text('courier_status'), // in_review, pending, delivered, partial_delivered, cancelled, hold, unknown
  // Steadfast Courier Integration Fields
  consignmentId: integer('consignment_id'), // Steadfast consignment ID
  trackingCode: text('tracking_code'), // Steadfast tracking code
  courierDeliveredAt: text('courier_delivered_at'), // When delivered
  // Order totals
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  delivery: numeric('delivery', { precision: 10, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 10, scale: 2 }).default('0'),
  couponCodes: text('coupon_codes').default('[]'),
  couponAmount: numeric('coupon_amount', { precision: 10, scale: 2 }).default('0'),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  canceledBy: text('canceled_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const orderItems = pgTable('order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  variant: text('variant'),
  qty: integer('qty').notNull(),
  basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  offerText: text('offer_text'),
  offerDiscount: numeric('offer_discount', { precision: 10, scale: 2 }).default('0'),
  couponCode: text('coupon_code'),
  couponDiscount: numeric('coupon_discount', { precision: 10, scale: 2 }).default('0'),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: integer('product_id').references(() => products.id),
})

// ============================================
// COUPONS
// ============================================
export const coupons = pgTable('coupons', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  type: text('type').notNull(), // 'pct' or 'fixed'
  value: numeric('value', { precision: 10, scale: 2 }).notNull(),
  scope: text('scope').notNull(), // 'all', 'products', 'categories'
  expiry: text('expiry'),
  selectedProducts: text('selected_products'), // JSON array of product IDs
  selectedCategories: text('selected_categories'), // JSON array of category IDs
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// ABANDONED CHECKOUTS
// ============================================
export const abandonedCheckouts = pgTable('abandoned_checkouts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull(),
  visitNumber: integer('visit_number').default(1),
  name: text('name'),
  phone: text('phone'),
  address: text('address'),
  items: text('items').notNull(), // JSON
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).default('0'),
  delivery: numeric('delivery', { precision: 10, scale: 2 }).default('0'),
  total: numeric('total', { precision: 10, scale: 2 }).default('0'),
  status: text('status').default('abandoned'), // 'abandoned' or 'completed'
  completedOrderId: text('completed_order_id'),
  visitTime: text('visit_time').notNull(),
  visitDate: text('visit_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// SETTINGS
// ============================================
export const settings = pgTable('settings', {
  id: integer('id').primaryKey().default(1),
  websiteName: text('website_name').default('EcoMart'),
  slogan: text('slogan'),
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  heroImages: text('hero_images'), // JSON array of image URLs
  insideDhakaDelivery: numeric('inside_dhaka_delivery', { precision: 10, scale: 2 }).default('60'),
  outsideDhakaDelivery: numeric('outside_dhaka_delivery', { precision: 10, scale: 2 }).default('120'),
  freeDeliveryMin: numeric('free_delivery_min', { precision: 10, scale: 2 }).default('500'),
  universalDelivery: boolean('universal_delivery').default(false),
  universalDeliveryCharge: numeric('universal_delivery_charge', { precision: 10, scale: 2 }).default('60'),
  whatsappNumber: text('whatsapp_number'),
  phoneNumber: text('phone_number'),
  facebookUrl: text('facebook_url'),
  messengerUsername: text('messenger_username'),
  aboutUs: text('about_us'),
  termsConditions: text('terms_conditions'),
  refundPolicy: text('refund_policy'),
  privacyPolicy: text('privacy_policy'),
  // Offer section settings
  offerTitle: text('offer_title').default('Offers'),
  offerSlogan: text('offer_slogan').default('Exclusive deals just for you'),
  // Courier settings (for UI display only - actual credentials in .env)
  courierEnabled: boolean('courier_enabled').default(false),
})

// ============================================
// ANALYTICS
// ============================================
export const productViews = pgTable('product_views', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => products.id).notNull(),
  viewCount: integer('view_count').default(1),
  date: text('date').notNull(), // YYYY-MM-DD format for daily tracking
  createdAt: timestamp('created_at').defaultNow(),
})

export const cartEvents = pgTable('cart_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => products.id).notNull(),
  action: text('action').notNull(), // 'add' or 'remove'
  date: text('date').notNull(), // YYYY-MM-DD format
  createdAt: timestamp('created_at').defaultNow(),
})
