import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { coupons, products } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'

// GET /api/coupons - Get all coupons or validate a specific code
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
    
    // PROTECTED: List all coupons (admin only) - Authentication disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session || !session.user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }
    
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
    // Authentication disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session || !session.user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    
    const newCoupon = await db.insert(coupons).values({
      id: body.id || `coupon-${Date.now()}`,
      code: body.code.toUpperCase(),
      type: body.type,
      value: body.value,
      scope: body.scope,
      expiry: body.expiry || null,
      selectedProducts: body.selectedProducts ? JSON.stringify(body.selectedProducts) : null,
      selectedCategories: body.selectedCategories ? JSON.stringify(body.selectedCategories) : null,
    }).returning()
    
    return NextResponse.json({
      success: true,
      data: newCoupon[0]
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating coupon:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create coupon' },
      { status: 500 }
    )
  }
}

// PUT /api/coupons - Update coupon
export async function PUT(request: NextRequest) {
  try {
    // Authentication disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session || !session.user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Coupon ID is required' },
        { status: 400 }
      )
    }
    
    const updated = await db.update(coupons)
      .set({
        code: updateData.code?.toUpperCase(),
        type: updateData.type,
        value: updateData.value,
        scope: updateData.scope,
        expiry: updateData.expiry || null,
        selectedProducts: updateData.selectedProducts ? JSON.stringify(updateData.selectedProducts) : null,
        selectedCategories: updateData.selectedCategories ? JSON.stringify(updateData.selectedCategories) : null,
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
  } catch (error) {
    console.error('Error updating coupon:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update coupon' },
      { status: 500 }
    )
  }
}

// DELETE /api/coupons - Delete coupon
export async function DELETE(request: NextRequest) {
  try {
    // Authentication disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session || !session.user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

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
  } catch (error) {
    console.error('Error deleting coupon:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete coupon' },
      { status: 500 }
    )
  }
}
