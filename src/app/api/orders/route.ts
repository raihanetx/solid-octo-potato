import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { orders, orderItems, customers, variants, settings } from '@/db/schema'
import { eq, sql, and } from 'drizzle-orm'

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
  const sanitized = input.trim().slice(0, 500) // Limit length
  // Basic XSS prevention
  return sanitized.replace(/[<>]/g, '')
}

function sanitizePhone(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('Phone must be a string')
  }
  // Only allow digits, +, and -
  return input.replace(/[^\d+]/g, '').slice(0, 15)
}

function validateNumeric(input: unknown, fieldName: string, min = 0, max?: number): number {
  const num = Number(input)
  if (isNaN(num) || num < min || (max !== undefined && num > max)) {
    throw new Error(`${fieldName} must be a valid number${max ? ` between ${min} and ${max}` : ` >= ${min}`}`)
  }
  return num
}

function validateOrderInput(body: any, isUpdate = false) {
  const errors: string[] = []
  
  if (!isUpdate) {
    // Validate required fields for new order
    if (!body.customerName) errors.push('Customer name is required')
    if (!body.phone) errors.push('Phone is required')
    if (!body.address) errors.push('Address is required')
    if (!body.subtotal) errors.push('Subtotal is required')
    if (!body.total) errors.push('Total is required')
  }
  
  // Validate optional fields if provided
  if (body.phone) {
    try {
      sanitizePhone(body.phone)
    } catch (e: any) {
      errors.push(e.message)
    }
  }
  
  if (body.subtotal) {
    try {
      validateNumeric(body.subtotal, 'Subtotal', 0)
    } catch (e: any) {
      errors.push(e.message)
    }
  }
  
  if (body.total) {
    try {
      validateNumeric(body.total, 'Total', 0)
    } catch (e: any) {
      errors.push(e.message)
    }
  }
  
  if (body.delivery !== undefined) {
    try {
      validateNumeric(body.delivery, 'Delivery', 0)
    } catch (e: any) {
      errors.push(e.message)
    }
  }
  
  if (body.discount !== undefined) {
    try {
      validateNumeric(body.discount, 'Discount', 0)
    } catch (e: any) {
      errors.push(e.message)
    }
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join(', '))
  }
}

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
    // Check rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
    
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    
    // Check authentication for full access
    const session = await getServerSession(authOptions)
    
    // If not authenticated and no customerId provided, reject
    // This allows customers to see their own orders while protecting full order list
    if (!session && !customerId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    let result = await db.select().from(orders)
    
    // Apply filters
    if (status) {
      // Sanitize status input
      const validStatuses = ['pending', 'approved', 'canceled']
      if (validStatuses.includes(status)) {
        result = result.filter(o => o.status === status)
      }
    }
    if (customerId) {
      const parsedId = parseInt(customerId)
      if (!isNaN(parsedId)) {
        result = result.filter(o => o.customerId === parsedId)
      }
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
    // Check rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
    
    const body = await request.json()
    
    // Validate input
    validateOrderInput(body)
    
    // Sanitize inputs
    const sanitizedBody = {
      customerName: sanitizeString(body.customerName, 'Customer name'),
      phone: sanitizePhone(body.phone),
      address: sanitizeString(body.address, 'Address'),
      note: body.note ? sanitizeString(body.note, 'Note') : null,
      paymentMethod: sanitizeString(body.paymentMethod || 'Cash on Delivery', 'Payment method'),
      subtotal: validateNumeric(body.subtotal, 'Subtotal', 0),
      delivery: validateNumeric(body.delivery || 0, 'Delivery', 0),
      discount: validateNumeric(body.discount || 0, 'Discount', 0),
      couponAmount: validateNumeric(body.couponAmount || 0, 'Coupon amount', 0),
      total: validateNumeric(body.total, 'Total', 0),
    }
    
    // Auto-create or update customer
    let customerId: number | undefined = undefined
    
    if (sanitizedBody.phone) {
      // Check if customer exists
      const existingCustomer = await db.select().from(customers).where(eq(customers.phone, sanitizedBody.phone)).limit(1)
      
      if (existingCustomer.length > 0) {
        // Update existing customer's stats
        customerId = existingCustomer[0].id
        await db.update(customers)
          .set({
            name: sanitizedBody.customerName || existingCustomer[0].name,
            address: sanitizedBody.address || existingCustomer[0].address,
            totalOrders: sql`${customers.totalOrders} + 1`,
            totalSpent: sql`${customers.totalSpent} + ${sanitizedBody.total || 0}`,
          })
          .where(eq(customers.id, customerId))
      } else {
        // Create new customer
        const newCustomer = await db.insert(customers).values({
          name: sanitizedBody.customerName,
          phone: sanitizedBody.phone,
          address: sanitizedBody.address,
          totalOrders: 1,
          totalSpent: sanitizedBody.total || 0,
        }).returning()
        customerId = newCustomer[0].id
      }
    }
    
    // Create order
    const newOrder = await db.insert(orders).values({
      id: body.id || `ORD-${Date.now().toString().slice(-6)}`,
      customerId: customerId,
      customerName: sanitizedBody.customerName,
      phone: sanitizedBody.phone,
      address: sanitizedBody.address,
      note: sanitizedBody.note,
      date: body.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: body.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      paymentMethod: sanitizedBody.paymentMethod,
      status: body.status || 'pending',
      subtotal: sanitizedBody.subtotal,
      delivery: sanitizedBody.delivery,
      discount: sanitizedBody.discount,
      couponAmount: sanitizedBody.couponAmount,
      total: sanitizedBody.total,
      couponCodes: JSON.stringify(body.couponCodes || []),
    }).returning()
    
    // Create order items
    if (body.items && body.items.length > 0) {
      // Validate items array
      if (!Array.isArray(body.items)) {
        throw new Error('Items must be an array')
      }
      
      await db.insert(orderItems).values(
        body.items.slice(0, 100).map((item: any) => ({
          name: sanitizeString(item.name, 'Item name'),
          variant: item.variant ? sanitizeString(item.variant, 'Variant') : null,
          qty: validateNumeric(item.qty, 'Quantity', 1, 999),
          basePrice: validateNumeric(item.basePrice, 'Base price', 0),
          offerText: item.offerText ? sanitizeString(item.offerText, 'Offer text') : null,
          offerDiscount: validateNumeric(item.offerDiscount || 0, 'Offer discount', 0),
          couponCode: item.couponCode ? sanitizeString(item.couponCode, 'Coupon code') : null,
          couponDiscount: validateNumeric(item.couponDiscount || 0, 'Coupon discount', 0),
          orderId: newOrder[0].id,
          productId: item.productId ? validateNumeric(item.productId, 'Product ID', 1) : null,
        }))
      )
      
      // Decrement stock for each variant (with stock validation)
      for (const item of body.items) {
        if (item.productId && item.variant) {
          const variantRecord = await db.select()
            .from(variants)
            .where(and(
              eq(variants.productId, item.productId),
              eq(variants.name, item.variant)
            ))
            .limit(1)
          
          if (variantRecord.length > 0) {
            const currentStock = variantRecord[0].stock
            const qtyToDecrement = Math.min(item.qty, currentStock) // Don't go below 0
            
            if (currentStock > 0) {
              await db.update(variants)
                .set({
                  stock: sql`GREATEST(${variants.stock} - ${qtyToDecrement}, 0)` // Prevent negative stock
                })
                .where(eq(variants.id, variantRecord[0].id))
            }
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      data: newOrder[0]
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create order' },
      { status: 400 }
    )
  }
}

// PUT /api/orders - Update order items (Engineer Mode)
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, items, subtotal, discount, couponAmount, total, delivery, customer, phone, address } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Sanitize order ID
    const sanitizedId = sanitizeString(id, 'Order ID')
    
    // Start a transaction-like update
    // 1. Update order totals and customer info
    const updateData: any = {
      updatedAt: new Date(),
    }
    if (subtotal !== undefined) updateData.subtotal = validateNumeric(subtotal, 'Subtotal', 0)
    if (discount !== undefined) updateData.discount = validateNumeric(discount, 'Discount', 0)
    if (couponAmount !== undefined) updateData.couponAmount = validateNumeric(couponAmount, 'Coupon amount', 0)
    if (total !== undefined) updateData.total = validateNumeric(total, 'Total', 0)
    if (delivery !== undefined) updateData.delivery = validateNumeric(delivery, 'Delivery', 0)
    if (customer !== undefined) updateData.customerName = sanitizeString(customer, 'Customer')
    if (phone !== undefined) updateData.phone = sanitizePhone(phone)
    if (address !== undefined) updateData.address = sanitizeString(address, 'Address')
    
    await db.update(orders)
      .set(updateData)
      .where(eq(orders.id, sanitizedId))
    
    // 2. If items provided, delete old items and insert new ones
    if (items && Array.isArray(items)) {
      // Get old items to restore stock
      const oldItems = await db.select().from(orderItems).where(eq(orderItems.orderId, sanitizedId))
      
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
      await db.delete(orderItems).where(eq(orderItems.orderId, sanitizedId))
      
      // Insert new items
      if (items.length > 0) {
        await db.insert(orderItems).values(
          items.slice(0, 100).map((item: any) => ({
            name: sanitizeString(item.name, 'Item name'),
            variant: item.variant ? sanitizeString(item.variant, 'Variant') : null,
            qty: validateNumeric(item.qty, 'Quantity', 1, 999),
            basePrice: validateNumeric(item.basePrice, 'Base price', 0),
            offerText: item.offerText ? sanitizeString(item.offerText, 'Offer text') : null,
            offerDiscount: validateNumeric(item.offerDiscount || 0, 'Offer discount', 0),
            couponCode: item.couponCode ? sanitizeString(item.couponCode, 'Coupon code') : null,
            couponDiscount: validateNumeric(item.couponDiscount || 0, 'Coupon discount', 0),
            orderId: sanitizedId,
            productId: item.productId ? validateNumeric(item.productId, 'Product ID', 1) : null,
          }))
        )
        
        // Decrement stock for new items (with validation)
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
              const currentStock = variantRecord[0].stock
              const qtyToDecrement = Math.min(item.qty, currentStock)
              
              if (currentStock > 0) {
                await db.update(variants)
                  .set({
                    stock: sql`GREATEST(${variants.stock} - ${qtyToDecrement}, 0)`
                  })
                  .where(eq(variants.id, variantRecord[0].id))
              }
            }
          }
        }
      }
    }
    
    // Fetch the updated order with items
    const updatedOrder = await db.select().from(orders).where(eq(orders.id, sanitizedId)).limit(1)
    const updatedItems = await db.select().from(orderItems).where(eq(orderItems.orderId, sanitizedId))
    
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
  } catch (error: any) {
    console.error('Error updating order items:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update order items' },
      { status: 400 }
    )
  }
}

// PATCH /api/orders - Update order status
export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, courierStatus, canceledBy } = body
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }
    
    // Validate status
    const validStatuses = ['pending', 'approved', 'canceled']
    const validCourierStatuses = ['in_review', 'pending', 'delivered', 'partial_delivered', 'cancelled', 'hold', 'unknown']
    
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      )
    }
    
    if (courierStatus && !validCourierStatuses.includes(courierStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid courier status value' },
        { status: 400 }
      )
    }
    
    const updateData: any = {
      updatedAt: new Date(),
    }
    if (status) updateData.status = status
    if (courierStatus) updateData.courierStatus = courierStatus
    if (canceledBy) updateData.canceledBy = sanitizeString(canceledBy, 'Canceled by')
    
    // Sanitize order ID
    const sanitizedId = sanitizeString(id, 'Order ID')
    
    // If order is being approved, auto-send to Steadfast Courier
    if (status === 'approved') {
      // Get the order first
      const orderResult = await db.select().from(orders).where(eq(orders.id, sanitizedId)).limit(1)
      
      if (orderResult.length > 0) {
        const order = orderResult[0]
        
        // Only send if not already sent (no consignmentId)
        if (!order.consignmentId) {
          const courierResult = await sendToSteadfastCourier(order)
          
          if (courierResult.success) {
            updateData.consignmentId = courierResult.consignmentId
            updateData.trackingCode = courierResult.trackingCode
            updateData.courierStatus = 'in_review'
            console.log(`Order ${sanitizedId} sent to Steadfast Courier: Consignment ${courierResult.consignmentId}`)
          } else {
            // Log but don't fail the approval if courier fails
            console.log(`Failed to send order ${sanitizedId} to courier: ${courierResult.error}`)
          }
        }
      }
    }
    
    const updated = await db.update(orders)
      .set(updateData)
      .where(eq(orders.id, sanitizedId))
      .returning()
    
    return NextResponse.json({
      success: true,
      data: updated[0]
    })
  } catch (error: any) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update order' },
      { status: 400 }
    )
  }
}
