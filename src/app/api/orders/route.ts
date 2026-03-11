import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { orders, orderItems, customers, variants, settings } from '@/db/schema'
import { eq, sql, and } from 'drizzle-orm'

// Steadfast Courier configuration
const STEADFAST_BASE_URL = 'https://portal.packzy.com/api/v1'

// Helper to get courier credentials and send order
async function sendToSteadfastCourier(order: any): Promise<{ success: boolean; consignmentId?: number; trackingCode?: string; error?: string }> {
  try {
    // Get courier credentials from settings
    const settingsResult = await db.select().from(settings).where(eq(settings.id, 1)).limit(1)
    
    if (settingsResult.length === 0) {
      return { success: false, error: 'Settings not found' }
    }
    
    const courierSettings = settingsResult[0]
    
    // Check if courier integration is enabled
    if (!courierSettings.courierEnabled || !courierSettings.courierApiKey || !courierSettings.courierSecretKey) {
      console.log('Courier integration not configured, skipping auto-send')
      return { success: false, error: 'Courier not configured' }
    }
    
    // Validate phone number (must be 11 digits)
    let phone = order.phone.replace(/[^0-9]/g, '')
    if (phone.length > 11) {
      phone = phone.slice(-11)
    } else if (phone.length < 11) {
      phone = phone.padStart(11, '0')
    }
    
    // Prepare order data for Steadfast
    const steadfastOrder = {
      invoice: order.id,
      recipient_name: order.customerName,
      recipient_phone: phone,
      recipient_address: order.address,
      cod_amount: order.total,
      note: `Payment: ${order.paymentMethod}`,
    }
    
    // Send to Steadfast API
    const response = await fetch(`${STEADFAST_BASE_URL}/create_order`, {
      method: 'POST',
      headers: {
        'Api-Key': courierSettings.courierApiKey,
        'Secret-Key': courierSettings.courierSecretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(steadfastOrder),
    })
    
    const result = await response.json()
    
    if (response.ok && result.consignment) {
      return {
        success: true,
        consignmentId: result.consignment.consignment_id,
        trackingCode: result.consignment.tracking_code,
      }
    }
    
    console.error('Steadfast API error:', result)
    return { success: false, error: result.message || 'Failed to create consignment' }
  } catch (error) {
    console.error('Error sending to Steadfast:', error)
    return { success: false, error: 'Failed to connect to courier service' }
  }
}

// GET /api/orders - Get all orders with items
// Protected: Requires authentication for full access
// Public: Can access own orders by customerId parameter
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    
    // Check authentication - DISABLED FOR DEVELOPMENT
    // const session = await getServerSession(authOptions)
    
    // If not authenticated and no customerId provided, reject
    // This allows customers to see their own orders while protecting full order list
    // DISABLED FOR DEVELOPMENT: Allow all requests
    
    let result = await db.select().from(orders)
    
    // Apply filters
    if (status) {
      result = result.filter(o => o.status === status)
    }
    if (customerId) {
      result = result.filter(o => o.customerId === parseInt(customerId))
    }
    
    // Sort by createdAt descending (newest first)
    result.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return timeB - timeA
    })
    
    // Fetch order items for each order
    const ordersWithItems = await Promise.all(
      result.map(async (order) => {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id))
        return {
          ...order,
          items: items.map(item => ({
            name: item.name,
            variant: item.variant,
            qty: item.qty,
            basePrice: item.basePrice,
            offerText: item.offerText,
            offerDiscount: item.offerDiscount || 0,
            couponCode: item.couponCode,
            couponDiscount: item.couponDiscount || 0,
            productId: item.productId,
          }))
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      data: ordersWithItems,
      count: ordersWithItems.length
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Auto-create or update customer
    let customerId: number | undefined = undefined
    
    if (body.phone) {
      // Check if customer exists
      const existingCustomer = await db.select().from(customers).where(eq(customers.phone, body.phone)).limit(1)
      
      if (existingCustomer.length > 0) {
        // Update existing customer's stats
        customerId = existingCustomer[0].id
        await db.update(customers)
          .set({
            name: body.customerName || existingCustomer[0].name,
            address: body.address || existingCustomer[0].address,
            totalOrders: sql`${customers.totalOrders} + 1`,
            totalSpent: sql`${customers.totalSpent} + ${body.total || 0}`,
          })
          .where(eq(customers.id, customerId))
      } else {
        // Create new customer
        const newCustomer = await db.insert(customers).values({
          name: body.customerName,
          phone: body.phone,
          address: body.address,
          totalOrders: 1,
          totalSpent: body.total || 0,
        }).returning()
        customerId = newCustomer[0].id
      }
    }
    
    // Create order
    const newOrder = await db.insert(orders).values({
      id: body.id || `ORD-${Date.now().toString().slice(-6)}`,
      customerId: customerId,
      customerName: body.customerName,
      phone: body.phone,
      address: body.address,
      note: body.note || null,
      date: body.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: body.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      paymentMethod: body.paymentMethod || 'Cash on Delivery',
      status: body.status || 'pending',
      subtotal: body.subtotal,
      delivery: body.delivery,
      discount: body.discount || 0,
      couponAmount: body.couponAmount || 0,
      total: body.total,
      couponCodes: JSON.stringify(body.couponCodes || []),
    }).returning()
    
    // Create order items
    if (body.items && body.items.length > 0) {
      await db.insert(orderItems).values(
        body.items.map((item: any) => ({
          name: item.name,
          variant: item.variant,
          qty: item.qty,
          basePrice: item.basePrice,
          offerText: item.offerText,
          offerDiscount: item.offerDiscount || 0,
          couponCode: item.couponCode,
          couponDiscount: item.couponDiscount || 0,
          orderId: newOrder[0].id,
          productId: item.productId,
        }))
      )
      
      // Decrement stock for each variant
      for (const item of body.items) {
        if (item.productId && item.variant) {
          // Find variant by productId and variant name
          const variantRecord = await db.select()
            .from(variants)
            .where(and(
              eq(variants.productId, item.productId),
              eq(variants.name, item.variant)
            ))
            .limit(1)
          
          if (variantRecord.length > 0) {
            // Decrement stock
            await db.update(variants)
              .set({
                stock: sql`${variants.stock} - ${item.qty}`
              })
              .where(eq(variants.id, variantRecord[0].id))
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      data: newOrder[0]
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    )
  }
}

// PUT /api/orders - Update order items (Engineer Mode)
export async function PUT(request: NextRequest) {
  try {
    // Authentication disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session || !session.user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const { id, items, subtotal, discount, couponAmount, total, delivery, customer, phone, address } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Start a transaction-like update
    // 1. Update order totals and customer info
    const updateData: any = {
      updatedAt: new Date(),
    }
    if (subtotal !== undefined) updateData.subtotal = subtotal
    if (discount !== undefined) updateData.discount = discount
    if (couponAmount !== undefined) updateData.couponAmount = couponAmount
    if (total !== undefined) updateData.total = total
    if (delivery !== undefined) updateData.delivery = delivery
    if (customer !== undefined) updateData.customerName = customer
    if (phone !== undefined) updateData.phone = phone
    if (address !== undefined) updateData.address = address
    
    await db.update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
    
    // 2. If items provided, delete old items and insert new ones
    if (items && Array.isArray(items)) {
      // Get old items to restore stock
      const oldItems = await db.select().from(orderItems).where(eq(orderItems.orderId, id))
      
      // Restore stock for old items
      for (const oldItem of oldItems) {
        if (oldItem.productId && oldItem.variant) {
          const variantRecord = await db.select()
            .from(variants)
            .where(and(
              eq(variants.productId, oldItem.productId),
              eq(variants.name, oldItem.variant)
            ))
            .limit(1)
          
          if (variantRecord.length > 0) {
            await db.update(variants)
              .set({
                stock: sql`${variants.stock} + ${oldItem.qty}`
              })
              .where(eq(variants.id, variantRecord[0].id))
          }
        }
      }
      
      // Delete old items
      await db.delete(orderItems).where(eq(orderItems.orderId, id))
      
      // Insert new items
      if (items.length > 0) {
        await db.insert(orderItems).values(
          items.map((item: any) => ({
            name: item.name,
            variant: item.variant,
            qty: item.qty,
            basePrice: item.basePrice,
            offerText: item.offerText,
            offerDiscount: item.offerDiscount || 0,
            couponCode: item.couponCode,
            couponDiscount: item.couponDiscount || 0,
            orderId: id,
            productId: item.productId,
          }))
        )
        
        // Decrement stock for new items
        for (const item of items) {
          if (item.productId && item.variant) {
            const variantRecord = await db.select()
              .from(variants)
              .where(and(
                eq(variants.productId, item.productId),
                eq(variants.name, item.variant)
              ))
              .limit(1)
            
            if (variantRecord.length > 0) {
              await db.update(variants)
                .set({
                  stock: sql`${variants.stock} - ${item.qty}`
                })
                .where(eq(variants.id, variantRecord[0].id))
            }
          }
        }
      }
    }
    
    // Fetch the updated order with items
    const updatedOrder = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
    const updatedItems = await db.select().from(orderItems).where(eq(orderItems.orderId, id))
    
    return NextResponse.json({
      success: true,
      data: {
        ...updatedOrder[0],
        items: updatedItems.map(item => ({
          name: item.name,
          variant: item.variant,
          qty: item.qty,
          basePrice: item.basePrice,
          offerText: item.offerText,
          offerDiscount: item.offerDiscount || 0,
          couponCode: item.couponCode,
          couponDiscount: item.couponDiscount || 0,
        }))
      }
    })
  } catch (error) {
    console.error('Error updating order items:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update order items' },
      { status: 500 }
    )
  }
}

// PATCH /api/orders - Update order status
export async function PATCH(request: NextRequest) {
  try {
    // Authentication disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session || !session.user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const { id, status, courierStatus, canceledBy } = body
    
    const updateData: any = {
      updatedAt: new Date(),
    }
    if (status) updateData.status = status
    if (courierStatus) updateData.courierStatus = courierStatus
    if (canceledBy) updateData.canceledBy = canceledBy
    
    // If order is being approved, auto-send to Steadfast Courier
    if (status === 'approved') {
      // Get the order first
      const orderResult = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
      
      if (orderResult.length > 0) {
        const order = orderResult[0]
        
        // Only send if not already sent (no consignmentId)
        if (!order.consignmentId) {
          const courierResult = await sendToSteadfastCourier(order)
          
          if (courierResult.success) {
            updateData.consignmentId = courierResult.consignmentId
            updateData.trackingCode = courierResult.trackingCode
            updateData.courierStatus = 'in_review'
            console.log(`Order ${id} sent to Steadfast Courier: Consignment ${courierResult.consignmentId}`)
          } else {
            // Log but don't fail the approval if courier fails
            console.log(`Failed to send order ${id} to courier: ${courierResult.error}`)
          }
        }
      }
    }
    
    const updated = await db.update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning()
    
    return NextResponse.json({
      success: true,
      data: updated[0]
    })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    )
  }
}
