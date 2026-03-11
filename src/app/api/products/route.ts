import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { products, variants, productImages, productFaqs, relatedProducts, reviews, orderItems } from '@/db/schema'
import { eq, like, or, and, sql } from 'drizzle-orm'

// Helper function to parse discount string
function parseDiscount(discountStr: string | null): { discountType: 'pct' | 'fixed'; discountValue: number } {
  if (!discountStr || discountStr === '0%' || discountStr === '0') {
    return { discountType: 'pct', discountValue: 0 }
  }
  
  // Check if it's a percentage (e.g., "5%", "10%")
  if (discountStr.includes('%')) {
    const value = parseInt(discountStr.replace('%', ''))
    return { discountType: 'pct', discountValue: value }
  }
  
  // Otherwise it's a fixed amount (e.g., "50", "100")
  const value = parseInt(discountStr)
  return { discountType: 'fixed', discountValue: value }
}

// Helper function to add parsed discount to product
// Uses DB values if available, otherwise parses from discount string
function addParsedDiscount(product: any) {
  // Use DB values if discountValue is set and > 0
  if (product.discountValue !== null && product.discountValue !== undefined && product.discountValue > 0) {
    return {
      ...product,
      discountType: product.discountType || 'pct',
      discountValue: product.discountValue
    }
  }
  
  // Otherwise parse from discount string
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
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const offer = searchParams.get('offer')
    const id = searchParams.get('id')
    
    // Get single product by ID
    if (id) {
      const product = await db.select().from(products).where(eq(products.id, parseInt(id))).limit(1)
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
      const searchLower = search.toLowerCase()
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
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST /api/products - Create new product
export async function POST(request: NextRequest) {
  try {
    // Authentication disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session || !session.user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    
    const newProduct = await db.insert(products).values({
      name: body.name,
      category: body.category,
      categoryId: body.categoryId,
      image: body.image,
      price: body.price,
      oldPrice: body.oldPrice,
      discount: body.discount || '0%',
      offer: body.offer || false,
      status: body.status || 'active',
      shortDesc: body.shortDesc,
      longDesc: body.longDesc,
      weight: body.weight,
    }).returning()
    
    return NextResponse.json({
      success: true,
      data: newProduct[0]
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    )
  }
}

// PUT /api/products - Update product
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
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }
    
    const updated = await db.update(products)
      .set({
        name: updateData.name,
        category: updateData.category,
        categoryId: updateData.categoryId,
        image: updateData.image,
        price: updateData.price,
        oldPrice: updateData.oldPrice,
        discount: updateData.discount,
        offer: updateData.offer,
        status: updateData.status,
        shortDesc: updateData.shortDesc,
        longDesc: updateData.longDesc,
        weight: updateData.weight,
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(products.id, id))
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
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE /api/products - Delete product
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
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }
    
    const productId = parseInt(id)
    
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
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}

// PATCH /api/products - Partial update (for status toggle)
export async function PATCH(request: NextRequest) {
  try {
    // Authentication disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session || !session.user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const { id, status } = body
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }
    
    const updateData: Record<string, unknown> = {
      updatedAt: sql`(unixepoch())`,
    }
    
    if (status !== undefined) {
      updateData.status = status
    }
    
    const updated = await db.update(products)
      .set(updateData)
      .where(eq(products.id, id))
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
  } catch (error) {
    console.error('Error patching product:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    )
  }
}
