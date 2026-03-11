import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { categories, products } from '@/db/schema'
import { eq, sql, isNull } from 'drizzle-orm'

// GET /api/categories - Get all categories with product counts
export async function GET() {
  try {
    // Get all categories
    const allCategories = await db.select().from(categories)
    
    // Get product counts per category
    const productCounts = await db
      .select({
        categoryId: products.categoryId,
        count: sql<number>`count(*)`.as('count')
      })
      .from(products)
      .groupBy(products.categoryId)
    
    // Create a map of category ID to product count
    const countMap = new Map<string, number>()
    productCounts.forEach((pc: any) => {
      if (pc.categoryId) {
        countMap.set(pc.categoryId, pc.count)
      }
    })
    
    // Merge categories with actual product counts
    const categoriesWithCounts = allCategories.map((cat: any) => ({
      ...cat,
      items: countMap.get(cat.id) || 0
    }))
    
    return NextResponse.json({
      success: true,
      data: categoriesWithCounts,
      count: categoriesWithCounts.length
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST /api/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    // Authentication disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session || !session.user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    
    const newCategory = await db.insert(categories).values({
      id: body.id || `CAT-${Date.now()}`,
      name: body.name,
      type: body.type || 'icon',
      icon: body.icon || null,
      image: body.image || null,
      items: 0, // Always start with 0, calculated from products
      status: body.status || 'Active',
    }).returning()
    
    return NextResponse.json({
      success: true,
      data: { ...newCategory[0], items: 0 }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    )
  }
}

// PUT /api/categories - Update category
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
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      )
    }
    
    const updatedCategory = await db
      .update(categories)
      .set({
        name: updateData.name,
        type: updateData.type,
        icon: updateData.icon || null,
        image: updateData.image || null,
        status: updateData.status,
        // Don't update items - it's calculated from products
      })
      .where(eq(categories.id, id))
      .returning()
    
    if (updatedCategory.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: updatedCategory[0]
    })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

// DELETE /api/categories - Delete category
export async function DELETE(request: NextRequest) {
  try {
    // Authentication disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session || !session.user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    console.log('DELETE category request for ID:', id)
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      )
    }
    
    // First check if category exists
    const existingCategory = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1)
    
    if (existingCategory.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }
    
    // Unassign all products from this category (set categoryId to null)
    await db
      .update(products)
      .set({ categoryId: null })
      .where(eq(products.categoryId, id))
    
    console.log('Unassigned products from category:', id)
    
    // Now delete the category
    const deletedCategory = await db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning()
    
    console.log('Deleted category:', deletedCategory)
    
    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
      data: deletedCategory[0]
    })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete category: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
