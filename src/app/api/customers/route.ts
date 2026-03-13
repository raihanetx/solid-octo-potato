import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { customers } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

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

function sanitizePhone(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('Phone must be a string')
  }
  return input.replace(/[^\d+]/g, '').slice(0, 15)
}

function validateNumeric(input: unknown, fieldName: string, min = 0, max?: number): number {
  const num = Number(input)
  if (isNaN(num) || num < min || (max !== undefined && num > max)) {
    throw new Error(`${fieldName} must be a valid number${max ? ` between ${min} and ${max}` : ` >= ${min}`}`)
  }
  return num
}

// GET /api/customers - Get all customers
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const phone = searchParams.get('phone')
    
    if (phone) {
      // Sanitize and validate phone
      const sanitizedPhone = sanitizePhone(phone)
      
      // Find customer by phone
      const customer = await db.select().from(customers).where(eq(customers.phone, sanitizedPhone)).limit(1)
      
      if (customer.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Customer not found'
        }, { status: 404 })
      }
      
      return NextResponse.json({
        success: true,
        data: customer[0]
      })
    }
    
    // Get all customers ordered by most recent
    const allCustomers = await db.select().from(customers).orderBy(sql`${customers.createdAt} DESC`)
    
    return NextResponse.json({
      success: true,
      data: allCustomers,
      count: allCustomers.length
    })
  } catch (error: any) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch customers' },
      { status: 400 }
    )
  }
}

// POST /api/customers - Create new customer
export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
    
    const body = await request.json()
    
    // Validate phone
    if (!body.phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      )
    }
    
    const sanitizedPhone = sanitizePhone(body.phone)
    
    if (sanitizedPhone.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number' },
        { status: 400 }
      )
    }
    
    // Check if customer with this phone already exists
    const existing = await db.select().from(customers).where(eq(customers.phone, sanitizedPhone)).limit(1)
    
    if (existing.length > 0) {
      // Update existing customer's stats
      const updated = await db.update(customers)
        .set({
          name: body.name ? sanitizeString(body.name, 'Name') : existing[0].name,
          address: body.address ? sanitizeString(body.address, 'Address') : existing[0].address,
          totalOrders: sql`${customers.totalOrders} + 1`,
          totalSpent: sql`${customers.totalSpent} + ${validateNumeric(body.totalSpent, 'Total spent', 0)}`,
        })
        .where(eq(customers.id, existing[0].id))
        .returning()
      
      return NextResponse.json({
        success: true,
        data: updated[0],
        isNew: false
      })
    }
    
    // Validate name if provided
    const sanitizedName = body.name ? sanitizeString(body.name, 'Name') : 'Unknown'
    
    // Create new customer
    const newCustomer = await db.insert(customers).values({
      name: sanitizedName,
      phone: sanitizedPhone,
      address: body.address ? sanitizeString(body.address, 'Address') : null,
      email: body.email ? sanitizeString(body.email, 'Email').slice(0, 100) : null,
      totalOrders: 1,
      totalSpent: validateNumeric(body.totalSpent || 0, 'Total spent', 0),
    }).returning()
    
    return NextResponse.json({
      success: true,
      data: newCustomer[0],
      isNew: true
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create customer' },
      { status: 400 }
    )
  }
}

// PUT /api/customers - Update customer
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
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      )
    }
    
    const customerId = validateNumeric(id, 'Customer ID', 1)
    
    // Validate and sanitize update data
    const sanitizedUpdate: any = {}
    
    if (updateData.name !== undefined) {
      sanitizedUpdate.name = sanitizeString(updateData.name, 'Name')
    }
    if (updateData.address !== undefined) {
      sanitizedUpdate.address = sanitizeString(updateData.address, 'Address')
    }
    if (updateData.email !== undefined) {
      sanitizedUpdate.email = sanitizeString(updateData.email, 'Email').slice(0, 100)
    }
    
    const updated = await db.update(customers)
      .set(sanitizedUpdate)
      .where(eq(customers.id, customerId))
      .returning()
    
    if (updated.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: updated[0]
    })
  } catch (error: any) {
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update customer' },
      { status: 400 }
    )
  }
}
