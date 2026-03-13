import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { categories, products } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; timestamp: number }>()
const RATE_LIMIT = 100
const RATE_LIMIT_WINDOW = 60 * 1000

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

function sanitizeString(input: unknown, fieldName: string, maxLength = 100): string {
  if (typeof input !== 'string') {
    throw new Error(`${fieldName} must be a string`)
  }
  return input.trim().slice(0, maxLength).replace(/[<>]/g, '')
}

// GET /api/categories - Get all categories with product counts
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
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST /api/categories - Create new category
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
      return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 })
    }
    
    // Validate type
    if (body.type && !['icon', 'image'].includes(body.type)) {
      return NextResponse.json({ success: false, error: 'Invalid category type' }, { status: 400 })
    }
    
    const newCategory = await db.insert(categories).values({
      id: body.id || `CAT-${Date.now()}`,
      name: sanitizeString(body.name, 'Name', 50),
      type: body.type || 'icon',
      icon: body.icon ? sanitizeString(body.icon, 'Icon', 100) : null,
      image: body.image ? sanitizeString(body.image, 'Image', 500) : null,
      items: 0,
      status: body.status || 'Active',
    }).returning()
    
    return NextResponse.json({
      success: true,
      data: { ...newCategory[0], items: 0 }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create category' },
      { status: 400 }
    )
  }
}

// PUT /api/categories - Update category
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
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 })
    }
    
    // Validate type
    if (updateData.type && !['icon', 'image'].includes(updateData.type)) {
      return NextResponse.json({ success: false, error: 'Invalid category type' }, { status: 400 })
    }
    
    const sanitizedUpdate: any = {}
    if (updateData.name) sanitizedUpdate.name = sanitizeString(updateData.name, 'Name', 50)
    if (updateData.type) sanitizedUpdate.type = updateData.type
    if (updateData.icon !== undefined) sanitizedUpdate.icon = updateData.icon ? sanitizeString(updateData.icon, 'Icon', 100) : null
    if (updateData.image !== undefined) sanitizedUpdate.image = updateData.image ? sanitizeString(updateData.image, 'Image', 500) : null
    if (updateData.status) sanitizedUpdate.status = sanitizeString(updateData.status, 'Status', 20)
    
    const updated = await db.update(categories)
      .set(sanitizedUpdate)
      .where(eq(categories.id, id))
      .returning()
    
    if (updated.length === 0) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, data: updated[0] })
  } catch (error: any) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update category' },
      { status: 400 }
    )
  }
}

// DELETE /api/categories - Delete category
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
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 })
    }
    
    const deleted = await db.delete(categories).where(eq(categories.id, id)).returning()
    
    if (deleted.length === 0) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, message: 'Category deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete category' },
      { status: 400 }
    )
  }
}
