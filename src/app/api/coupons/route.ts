import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { coupons, products } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'

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
  return input.trim().slice(0, 100).replace(/[<>]/g, '')
}

function validateNumeric(input: unknown, fieldName: string, min = 0, max?: number): number {
  const num = Number(input)
  if (isNaN(num) || num < min || (max !== undefined && num > max)) {
    throw new Error(`${fieldName} must be a valid number`)
  }
  return num
}
// Public: Can validate a specific coupon code (for checkout) or get active coupons (public=true)
// Protected: Listing all coupons requires authentication
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const publicList = searchParams.get('public')
    const cartItems = searchParams.get('cartItems') // JSON string of cart items with productId and category
    
    // PUBLIC: Get active coupons for offers page
    if (publicList === 'true') {
      const allCoupons = await db.select().from(coupons)
      
      // Filter active coupons (not expired)
      const activeCoupons = allCoupons.filter(coupon => {
        if (!coupon.expiry) return true
        return new Date(coupon.expiry) >= new Date()
      })
      
      return NextResponse.json({
        success: true,
        coupons: activeCoupons.map(c => ({
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.value,
          scope: c.scope,
          expiry: c.expiry
        }))
      })
    }
    
    if (code) {
      // PUBLIC: Validate coupon code (needed for checkout flow)
      const coupon = await db.select().from(coupons).where(eq(coupons.code, code))
      
      if (coupon.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Invalid coupon code'
        }, { status: 404 })
      }
      
      const foundCoupon = coupon[0]
      
      // Check expiry
      if (foundCoupon.expiry) {
        const expiryDate = new Date(foundCoupon.expiry)
        if (expiryDate < new Date()) {
          return NextResponse.json({
            success: false,
            error: 'Coupon has expired'
          }, { status: 400 })
        }
      }
      
      // If cart items provided, validate scope
      if (cartItems && foundCoupon.scope !== 'all') {
        try {
          const items = JSON.parse(cartItems)
          const selectedProducts = foundCoupon.selectedProducts ? JSON.parse(foundCoupon.selectedProducts) : []
          const selectedCategories = foundCoupon.selectedCategories ? JSON.parse(foundCoupon.selectedCategories) : []
          
          // Check if any cart item matches the coupon scope
          let isValidForCart = false
          
          if (foundCoupon.scope === 'products') {
            // Check if any cart item productId is in selectedProducts
            isValidForCart = items.some((item: any) => 
              selectedProducts.includes(item.productId) || selectedProducts.includes(item.id)
            )
          } else if (foundCoupon.scope === 'categories') {
            // Check if any cart item category is in selectedCategories
            isValidForCart = items.some((item: any) => 
              selectedCategories.includes(item.category)
            )
          }
          
          if (!isValidForCart) {
            return NextResponse.json({
              success: false,
              error: 'Coupon not applicable to items in cart'
            }, { status: 400 })
          }
          
          // Return applicable items for discount calculation
          const applicableItems = items.filter((item: any) => {
            if (foundCoupon.scope === 'products') {
              return selectedProducts.includes(item.productId) || selectedProducts.includes(item.id)
            } else if (foundCoupon.scope === 'categories') {
              return selectedCategories.includes(item.category)
            }
            return true
          })
          
          return NextResponse.json({
            success: true,
            data: foundCoupon,
            applicableItems: applicableItems.map((i: any) => i.productId || i.id)
          })
        } catch (e) {
          console.error('Error parsing cart items for coupon validation:', e)
        }
      }
      
      return NextResponse.json({
        success: true,
        data: foundCoupon
      })
    }
    
    // PROTECTED: List all coupons (admin only)
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    const allCoupons = await db.select().from(coupons)
    
    return NextResponse.json({
      success: true,
      data: allCoupons,
      count: allCoupons.length
    })
  } catch (error) {
    console.error('Error fetching coupons:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch coupons' },
      { status: 500 }
    )
  }
}

// POST /api/coupons - Create new coupon
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
    if (!body.code || typeof body.code !== 'string') {
      return NextResponse.json({ success: false, error: 'Coupon code is required' }, { status: 400 })
    }
    
    if (!body.type || !['pct', 'fixed'].includes(body.type)) {
      return NextResponse.json({ success: false, error: 'Coupon type must be "pct" or "fixed"' }, { status: 400 })
    }
    
    if (!body.value || typeof body.value !== 'number') {
      return NextResponse.json({ success: false, error: 'Coupon value is required' }, { status: 400 })
    }
    
    if (!body.scope || !['all', 'products', 'categories'].includes(body.scope)) {
      return NextResponse.json({ success: false, error: 'Coupon scope must be "all", "products", or "categories"' }, { status: 400 })
    }
    
    const newCoupon = await db.insert(coupons).values({
      id: body.id || `coupon-${Date.now()}`,
      code: sanitizeString(body.code, 'Code').toUpperCase(),
      type: body.type,
      value: validateNumeric(body.value, 'Value', 0, 100),
      scope: body.scope,
      expiry: body.expiry || null,
      selectedProducts: body.selectedProducts ? JSON.stringify(body.selectedProducts.slice(0, 100)) : null,
      selectedCategories: body.selectedCategories ? JSON.stringify(body.selectedCategories.slice(0, 100)) : null,
    }).returning()
    
    return NextResponse.json({
      success: true,
      data: newCoupon[0]
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating coupon:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create coupon' },
      { status: 400 }
    )
  }
}

// PUT /api/coupons - Update coupon
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
        { success: false, error: 'Coupon ID is required' },
        { status: 400 }
      )
    }
    
    // Validate fields
    if (updateData.type && !['pct', 'fixed'].includes(updateData.type)) {
      return NextResponse.json({ success: false, error: 'Invalid coupon type' }, { status: 400 })
    }
    
    if (updateData.scope && !['all', 'products', 'categories'].includes(updateData.scope)) {
      return NextResponse.json({ success: false, error: 'Invalid coupon scope' }, { status: 400 })
    }
    
    const updated = await db.update(coupons)
      .set({
        code: updateData.code ? sanitizeString(updateData.code, 'Code').toUpperCase() : undefined,
        type: updateData.type,
        value: updateData.value ? validateNumeric(updateData.value, 'Value', 0, 100) : undefined,
        scope: updateData.scope,
        expiry: updateData.expiry || null,
        selectedProducts: updateData.selectedProducts ? JSON.stringify(updateData.selectedProducts.slice(0, 100)) : undefined,
        selectedCategories: updateData.selectedCategories ? JSON.stringify(updateData.selectedCategories.slice(0, 100)) : undefined,
      })
      .where(eq(coupons.id, id))
      .returning()
    
    if (updated.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: updated[0]
    })
  } catch (error: any) {
    console.error('Error updating coupon:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update coupon' },
      { status: 400 }
    )
  }
}

// DELETE /api/coupons - Delete coupon
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
        { success: false, error: 'Coupon ID is required' },
        { status: 400 }
      )
    }
    
    const deleted = await db.delete(coupons).where(eq(coupons.id, id)).returning()
    
    if (deleted.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Coupon deleted successfully',
      data: deleted[0]
    })
  } catch (error: any) {
    console.error('Error deleting coupon:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete coupon' },
      { status: 400 }
    )
  }
}
