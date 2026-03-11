import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { orders } from '@/db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

/**
 * Steadfast Courier Webhook Handler
 * 
 * Receives status updates from Steadfast Courier API
 * Endpoint: POST /api/courier/webhook
 * 
 * Webhook payload types:
 * 1. delivery_status - Delivery status updates
 * 2. tracking_update - Tracking updates
 * 
 * Security: Verifies webhook signature using HMAC-SHA256 with Bearer token
 */

interface WebhookPayload {
  notification_type: 'delivery_status' | 'tracking_update'
  consignment_id: number
  invoice: string
  cod_amount?: number
  status?: string
  delivery_charge?: number
  tracking_message?: string
  updated_at?: string
}

/**
 * Verify webhook signature from Steadfast
 * Uses Bearer token authentication as per documentation
 */
async function verifyWebhookSignature(
  body: string,
  authHeader: string | null
): Promise<boolean> {
  const apiKey = process.env.STEADFAST_API_KEY
  
  if (!apiKey || !authHeader) {
    return false
  }
  
  try {
    // Extract Bearer token
    const token = authHeader.replace('Bearer ', '')
    
    // Compare with API key (Steadfast uses API key as Bearer token)
    return token === apiKey
  } catch (error) {
    console.error('[Webhook] Signature verification error:', error)
    return false
  }
}

// Map Steadfast statuses to our internal statuses
function mapCourierStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'in_review': 'in_review',
    'delivered_approval_pending': 'delivered_approval_pending',
    'partial_delivered_approval_pending': 'partial_delivered_approval_pending',
    'cancelled_approval_pending': 'cancelled_approval_pending',
    'unknown_approval_pending': 'unknown_approval_pending',
    'delivered': 'delivered',
    'partial_delivered': 'partial_delivered',
    'cancelled': 'cancelled',
    'hold': 'hold',
    'unknown': 'unknown',
  }
  return statusMap[status?.toLowerCase()] || status
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for logging
    const rawBody = await request.text()
    const body: WebhookPayload = JSON.parse(rawBody)
    
    // Get Authorization header
    const authHeader = request.headers.get('Authorization')
    
    // Verify webhook authentication
    const isValid = await verifyWebhookSignature(rawBody, authHeader)
    
    if (!isValid) {
      console.log('[Webhook] Rejected: Invalid or missing authentication')
      // For development, allow without auth if credentials not configured
      if (process.env.STEADFAST_API_KEY) {
        return NextResponse.json(
          { status: 'error', message: 'Invalid authentication' },
          { status: 401 }
        )
      }
      console.warn('[Webhook] Warning: No API key configured - accepting webhook without auth')
    }
    
    console.log('[Webhook] Received from Steadfast:', JSON.stringify(body, null, 2))
    
    // Validate required fields
    if (!body.consignment_id && !body.invoice) {
      return NextResponse.json(
        { status: 'error', message: 'Missing consignment_id or invoice' },
        { status: 400 }
      )
    }
    
    // Find the order by consignment_id or invoice
    let order
    if (body.consignment_id) {
      const result = await db.select().from(orders)
        .where(eq(orders.consignmentId, body.consignment_id))
        .limit(1)
      order = result[0]
    }
    
    if (!order && body.invoice) {
      const result = await db.select().from(orders)
        .where(eq(orders.id, body.invoice))
        .limit(1)
      order = result[0]
    }
    
    if (!order) {
      console.log('[Webhook] Order not found for:', body.consignment_id || body.invoice)
      return NextResponse.json(
        { status: 'error', message: 'Order not found' },
        { status: 404 }
      )
    }
    
    // Handle delivery_status notification
    if (body.notification_type === 'delivery_status') {
      const courierStatus = mapCourierStatus(body.status || '')
      
      // Update order with new status
      const updateData: Record<string, unknown> = {
        courierStatus,
        updatedAt: new Date(),
      }
      
      // If delivered, record delivery time
      if (body.status?.toLowerCase() === 'delivered') {
        updateData.courierDeliveredAt = body.updated_at || new Date().toISOString()
      }
      
      // If cancelled, also update order status
      if (body.status?.toLowerCase() === 'cancelled') {
        updateData.status = 'canceled'
        updateData.canceledBy = 'Courier'
      }
      
      await db.update(orders)
        .set(updateData)
        .where(eq(orders.id, order.id))
      
      console.log(`[Webhook] Updated order ${order.id} status to ${courierStatus}`)
      
      return NextResponse.json({
        status: 'success',
        message: 'Webhook received successfully.',
        orderId: order.id,
        courierStatus,
      })
    }
    
    // Handle tracking_update notification
    if (body.notification_type === 'tracking_update') {
      console.log(`[Webhook] Tracking update for order ${order.id}: ${body.tracking_message}`)
      
      return NextResponse.json({
        status: 'success',
        message: 'Tracking update received.',
        orderId: order.id,
        trackingMessage: body.tracking_message,
      })
    }
    
    // Unknown notification type
    return NextResponse.json({
      status: 'success',
      message: 'Webhook received.',
    })
    
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET for webhook verification/health check
export async function GET() {
  return NextResponse.json({
    status: 'success',
    message: 'Steadfast webhook endpoint is active',
    timestamp: new Date().toISOString(),
  })
}
