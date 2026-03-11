import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { customers } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

// GET /api/customers - Get all customers
export async function GET(request: NextRequest) {
  try {
    // Authentication disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session || !session.user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const searchParams = request.nextUrl.searchParams
    const phone = searchParams.get('phone')
    
    if (phone) {
      // Find customer by phone
      const customer = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1)
      
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
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

// POST /api/customers - Create new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if customer with this phone already exists
    const existing = await db.select().from(customers).where(eq(customers.phone, body.phone)).limit(1)
    
    if (existing.length > 0) {
      // Update existing customer's stats
      const updated = await db.update(customers)
        .set({
          name: body.name || existing[0].name,
          address: body.address || existing[0].address,
          totalOrders: sql`${customers.totalOrders} + 1`,
          totalSpent: sql`${customers.totalSpent} + ${body.totalSpent || 0}`,
        })
        .where(eq(customers.id, existing[0].id))
        .returning()
      
      return NextResponse.json({
        success: true,
        data: updated[0],
        isNew: false
      })
    }
    
    // Create new customer
    const newCustomer = await db.insert(customers).values({
      name: body.name,
      phone: body.phone,
      address: body.address,
      email: body.email,
      totalOrders: 1,
      totalSpent: body.totalSpent || 0,
    }).returning()
    
    return NextResponse.json({
      success: true,
      data: newCustomer[0],
      isNew: true
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}

// PUT /api/customers - Update customer
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
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      )
    }
    
    const updated = await db.update(customers)
      .set({
        name: updateData.name,
        address: updateData.address,
        email: updateData.email,
      })
      .where(eq(customers.id, id))
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
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}
