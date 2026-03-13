import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { products, variants, productImages, productFaqs, relatedProducts, reviews, orderItems } from '@/db/schema'
import { eq, like, or, and, sql } from 'drizzle-orm'

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; timestamp: number }>()
const RATE_LIMIT = 100 // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  
  if (!record || now - record.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, timestamp: now })
    return true
  }
  
  if (record.count >= RATE_LIMIT) {
    return false
  }
  
  record.count++
  return true
}

// Input validation helpers
function sanitizeString(input: unknown, fieldName: string): string {
  if (typeof input !== 'string') {
    throw new Error(`${fieldName} must be a string`)
  }
  const sanitized = input.trim().slice(0, 500)
  return sanitized.replace(/[<>]/g, '')
}

function validateNumeric(input: unknown, fieldName: string, min = 0, max?: number): number {
  const num = Number(input)
  if (isNaN(num) || num < min || (max !== undefined && num > max)) {
    throw new Error(`${fieldName} must be a valid number${max ? ` between ${min} and ${max}` : ` >= ${min}`}`)
  }
  return num
}

// Helper function to parse discount string
function parseDiscount(discountStr: string | null): { discountType: 'pct' | 'fixed'; discountValue: number } {
  if (!discountStr || discountStr === '0%' || discountStr === '0') {
    return { discountType: 'pct', discountValue: 0 }
  }
  
  if (discountStr.includes('%')) {
    const value = parseInt(discountStr.replace('%', ''))
    return { discountType: 'pct', discountValue: value }
  }
  
  const value = parseInt(discountStr)
  return { discountType: 'fixed', discountValue: value }
}

// Helper function to add parsed discount to product
function addParsedDiscount(product: any) {
  if (product.discountValue !== null && product.discountValue !== undefined && product.discountValue > 0) {
    return {
      ...product,
      discountType: product.discountType || 'pct',
      discountValue: product.discountValue
    }
  }
  
  const { discountType, discountValue } = parseDiscount(product.discount)
  return {
    ...product,
    discountType,
    discountValue
  }
}

// GET /api/products - Get all products
export async function GET(request: NextRequest) {
  try {
    // Check rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
    
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const offer = searchParams.get('offer')
    const id = searchParams.get('id')
    
    // Get single product by ID
    if (id) {
      const productId = validateNumeric(id, 'Product ID', 1)
      const product = await db.select().from(products).where(eq(products.id, productId)).limit(1)
      if (product.length === 0) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true, data: addParsedDiscount(product[0]) })
    }
    
    // Use SQL WHERE for filtering (optimized)
    let query = db.select().from(products)
    
    // Build conditions
    const conditions = []
    if (category) {
      conditions.push(eq(products.category, category))
    }
    if (offer === 'true') {
      conditions.push(eq(products.offer, true))
    }
    
    // Execute query with conditions
    let result
    if (conditions.length > 0) {
      result = await query.where(and(...conditions))
    } else {
      result = await query
    }
    
    // Search filter (in memory for partial match)
    if (search) {
      const searchLower = search.toLowerCase().slice(0, 100)
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.category.toLowerCase().includes(searchLower)
      )
    }
    
    // Add parsed discount to each product
    const productsWithParsedDiscount = result.map(addParsedDiscount)
    
    return NextResponse.json({
      success: true,
      data: productsWithParsedDiscount,
      count: productsWithParsedDiscount.length
    })
  } catch (error: any) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch products' },
      { status: 400 }
    )
  }
}

// POST /api/products - Create new product
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Product name is required' },
        { status: 400 }
      )
    }
    
    if (!body.category || typeof body.category !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Product category is required' },
        { status: 400 }
      )
    }
    
    if (!body.image || typeof body.image !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Product image is required' },
        { status: 400 }
      )
    }
    
    // Validate price
    const price = validateNumeric(body.price, 'Price', 0, 9999999)
    const oldPrice = body.oldPrice ? validateNumeric(body.oldPrice, 'Old price', 0, 9999999) : null
    
    const newProduct = await db.insert(products).values({
      name: sanitizeString(body.name, 'Name'),
      category: sanitizeString(body.category, 'Category'),
      categoryId: body.categoryId ? sanitizeString(body.categoryId, 'Category ID') : null,
      image: sanitizeString(body.image, 'Image'),
      price: price,
      oldPrice: oldPrice,
      discount: body.discount || '0%',
      offer: body.offer || false,
      status: body.status || 'active',
      shortDesc: body.shortDesc ? sanitizeString(body.shortDesc, 'Short description') : null,
      longDesc: body.longDesc ? sanitizeString(body.longDesc, 'Long description') : null,
      weight: body.weight ? sanitizeString(body.weight, 'Weight') : null,
    }).returning()
    
    return NextResponse.json({
      success: true,
      data: newProduct[0]
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create product' },
      { status: 400 }
    )
  }
}

// PUT /api/products - Update product
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }
    
    const productId = validateNumeric(id, 'Product ID', 1)
    
    // Validate and sanitize update data
    const sanitizedUpdate: any = {}
    
    if (updateData.name !== undefined) sanitizedUpdate.name = sanitizeString(updateData.name, 'Name')
    if (updateData.category !== undefined) sanitizedUpdate.category = sanitizeString(updateData.category, 'Category')
    if (updateData.categoryId !== undefined) sanitizedUpdate.categoryId = sanitizeString(updateData.categoryId, 'Category ID')
    if (updateData.image !== undefined) sanitizedUpdate.image = sanitizeString(updateData.image, 'Image')
    if (updateData.price !== undefined) sanitizedUpdate.price = validateNumeric(updateData.price, 'Price', 0, 9999999)
    if (updateData.oldPrice !== undefined) sanitizedUpdate.oldPrice = validateNumeric(updateData.oldPrice, 'Old price', 0, 9999999)
    if (updateData.discount !== undefined) sanitizedUpdate.discount = sanitizeString(updateData.discount, 'Discount')
    if (updateData.offer !== undefined) sanitizedUpdate.offer = Boolean(updateData.offer)
    if (updateData.status !== undefined) sanitizedUpdate.status = sanitizeString(updateData.status, 'Status')
    if (updateData.shortDesc !== undefined) sanitizedUpdate.shortDesc = sanitizeString(updateData.shortDesc, 'Short description')
    if (updateData.longDesc !== undefined) sanitizedUpdate.longDesc = sanitizeString(updateData.longDesc, 'Long description')
    if (updateData.weight !== undefined) sanitizedUpdate.weight = sanitizeString(updateData.weight, 'Weight')
    
    sanitizedUpdate.updatedAt = sql`(unixepoch())`
    
    const updated = await db.update(products)
      .set(sanitizedUpdate)
      .where(eq(products.id, productId))
      .returning()
    
    if (updated.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: updated[0]
    })
  } catch (error: any) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update product' },
      { status: 400 }
    )
  }
}

// DELETE /api/products - Delete product
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }
    
    const productId = validateNumeric(id, 'Product ID', 1)
    
    // Delete all related records first (to avoid foreign key constraint errors)
    await db.delete(variants).where(eq(variants.productId, productId))
    await db.delete(productImages).where(eq(productImages.productId, productId))
    await db.delete(productFaqs).where(eq(productFaqs.productId, productId))
    await db.delete(relatedProducts).where(eq(relatedProducts.productId, productId))
    await db.delete(reviews).where(eq(reviews.productId, productId))
    
    // Delete from order_items (set productId to null to keep order history)
    await db.delete(orderItems).where(eq(orderItems.productId, productId))
    
    // Now delete the product
    const deleted = await db.delete(products)
      .where(eq(products.id, productId))
      .returning()
    
    if (deleted.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
      data: deleted[0]
    })
  } catch (error: any) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete product' },
      { status: 400 }
    )
  }
}

// PATCH /api/products - Partial update (for status toggle)
export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status } = body
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }
    
    const productId = validateNumeric(id, 'Product ID', 1)
    
    const updateData: Record<string, unknown> = {
      updatedAt: sql`(unixepoch())`,
    }
    
    if (status !== undefined) {
      updateData.status = sanitizeString(status, 'Status')
    }
    
    const updated = await db.update(products)
      .set(updateData)
      .where(eq(products.id, productId))
      .returning()
    
    if (updated.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: updated[0]
    })
  } catch (error: any) {
    console.error('Error patching product:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update product' },
      { status: 400 }
    )
  }
}
