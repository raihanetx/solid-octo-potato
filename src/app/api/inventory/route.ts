import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { products, variants, categories } from '@/db/schema'
import { eq } from 'drizzle-orm'

// GET /api/inventory - Get all products with their variants for inventory management
export async function GET(request: NextRequest) {
  try {
    // Authentication disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session || !session.user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    // Fetch all products
    const allProducts = await db.select().from(products)
    
    // For each product, fetch its variants
    const inventoryData = await Promise.all(
      allProducts.map(async (product) => {
        // Get variants for this product
        const productVariants = await db.select()
          .from(variants)
          .where(eq(variants.productId, product.id))
        
        // Get category name
        const category = product.categoryId 
          ? await db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1)
          : null
        
        return {
          id: product.id,
          name: product.name,
          category: category?.[0]?.name || product.category || 'Uncategorized',
          image: product.image,
          variants: productVariants.map(v => ({
            id: v.id,
            name: v.name,
            stock: v.stock,
            initialStock: v.initialStock,
            label: v.name,
          })),
          lastEdited: product.updatedAt 
            ? new Date(product.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'N/A',
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      data: inventoryData,
      count: inventoryData.length
    })
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

// PUT /api/inventory - Update variant stock
export async function PUT(request: NextRequest) {
  try {
    // Authentication disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session || !session.user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const { variantId, stock } = body
    
    if (variantId === undefined || stock === undefined) {
      return NextResponse.json(
        { success: false, error: 'Variant ID and stock are required' },
        { status: 400 }
      )
    }
    
    const updated = await db.update(variants)
      .set({ stock: stock })
      .where(eq(variants.id, variantId))
      .returning()
    
    if (updated.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Variant not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: updated[0]
    })
  } catch (error) {
    console.error('Error updating inventory:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update inventory' },
      { status: 500 }
    )
  }
}
