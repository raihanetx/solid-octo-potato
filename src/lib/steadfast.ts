/**
 * Steadfast Courier API Integration Service
 * Documentation: https://portal.packzy.com/api/v1
 * 
 * All credentials are stored in environment variables:
 * - STEADFAST_API_KEY
 * - STEADFAST_SECRET_KEY
 */

interface CreateOrderParams {
  invoice: string
  recipient_name: string
  recipient_phone: string
  recipient_address: string
  cod_amount: number
  alternative_phone?: string
  recipient_email?: string
  note?: string
  item_description?: string
  total_lot?: number
  delivery_type?: 0 | 1 // 0 = home delivery, 1 = point delivery
}

interface BulkOrderItem {
  invoice: string
  recipient_name: string
  recipient_phone: string
  recipient_address: string
  cod_amount: number
  note?: string
}

interface ConsignmentResponse {
  status: number
  message: string
  consignment?: {
    consignment_id: number
    invoice: string
    tracking_code: string
    recipient_name: string
    recipient_phone: string
    recipient_address: string
    cod_amount: number
    status: string
    note: string | null
    created_at: string
    updated_at: string
  }
}

interface BulkOrderResponse {
  invoice: string
  recipient_name: string
  recipient_address: string
  recipient_phone: string
  cod_amount: string
  note: string | null
  consignment_id: number | null
  tracking_code: string | null
  status: 'success' | 'error'
}

class SteadfastService {
  private baseUrl: string
  private apiKey: string
  private secretKey: string

  constructor() {
    this.baseUrl = (process.env.STEADFAST_BASE_URL || 'https://portal.packzy.com/api/v1').trim()
    this.apiKey = (process.env.STEADFAST_API_KEY || '').trim()
    this.secretKey = (process.env.STEADFAST_SECRET_KEY || '').trim()
  }

  private getHeaders(): HeadersInit {
    return {
      'Api-Key': this.apiKey,
      'Secret-Key': this.secretKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }

  /**
   * Check if API credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.secretKey)
  }

  /**
   * Async check if API credentials are configured
   */
  async isConfiguredAsync(): Promise<boolean> {
    return !!(this.apiKey && this.secretKey)
  }

  /**
   * Safely parse API response - handles both JSON and plain text responses
   */
  private async parseResponse(response: Response): Promise<{ data: any; error: string | null }> {
    try {
      const text = await response.text()
      
      // Try to parse as JSON
      try {
        const data = JSON.parse(text)
        return { data, error: null }
      } catch {
        // Not JSON - return the text as error message
        return { data: null, error: text }
      }
    } catch (err) {
      return { data: null, error: 'Failed to read response' }
    }
  }

  /**
   * Verify API credentials by checking balance
   */
  async verifyCredentials(): Promise<{ valid: boolean; message: string; balance?: number }> {
    try {
      if (!this.isConfigured()) {
        return {
          valid: false,
          message: 'Steadfast API credentials not configured. Please set STEADFAST_API_KEY and STEADFAST_SECRET_KEY in .env file.'
        }
      }

      const response = await fetch(`${this.baseUrl}/get_balance`, {
        method: 'GET',
        headers: this.getHeaders()
      })

      const { data, error } = await this.parseResponse(response)
      
      if (error) {
        return {
          valid: false,
          message: error.includes('inactive') || error.includes('not active')
            ? 'Your Steadfast account is NOT ACTIVE. Please: 1) Login to Steadfast dashboard, 2) Go to API Settings, 3) Enable/Activate API access.'
            : error.includes('Invalid') || error.includes('unauthorized')
            ? 'Invalid API credentials. Please check your STEADFAST_API_KEY and STEADFAST_SECRET_KEY in .env file.'
            : `Steadfast API Error: ${error}`
        }
      }
      
      if (data && data.status === 200) {
        return {
          valid: true,
          message: 'Credentials verified successfully',
          balance: data.current_balance
        }
      }
      
      return {
        valid: false,
        message: data?.message || 'Unknown error from Steadfast API'
      }
    } catch (error) {
      return {
        valid: false,
        message: 'Failed to connect to Steadfast. Please check your internet connection.'
      }
    }
  }

  /**
   * Create a single order/consignment
   */
  async createOrder(params: CreateOrderParams): Promise<ConsignmentResponse> {
    try {
      if (!this.isConfigured()) {
        return {
          status: 500,
          message: 'Steadfast API credentials not configured in .env file.'
        }
      }

      const response = await fetch(`${this.baseUrl}/create_order`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(params)
      })

      const rawText = await response.text()
      
      try {
        const parsed = JSON.parse(rawText)
        
        if (parsed.status === 200 && parsed.consignment) {
          return parsed
        }
        
        return {
          status: parsed.status || response.status,
          message: parsed.message || 'Failed to create order'
        }
      } catch {
        return {
          status: response.status,
          message: rawText || 'Unknown error'
        }
      }
    } catch (error) {
      return {
        status: 500,
        message: 'Failed to connect to Steadfast. Please check your internet connection.'
      }
    }
  }

  /**
   * Create bulk orders (max 500 items)
   */
  async createBulkOrders(orders: BulkOrderItem[]): Promise<BulkOrderResponse[]> {
    try {
      if (!this.isConfigured()) {
        return []
      }

      const response = await fetch(`${this.baseUrl}/create_order/bulk-order`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ data: JSON.stringify(orders) })
      })

      const { data } = await this.parseResponse(response)
      return data || []
    } catch (error) {
      console.error('[Steadfast] Bulk order error:', error)
      return []
    }
  }

  /**
   * Check delivery status by consignment ID
   */
  async getStatusByConsignmentId(consignmentId: number): Promise<any> {
    try {
      if (!this.isConfigured()) return null

      const response = await fetch(`${this.baseUrl}/status_by_cid/${consignmentId}`, {
        method: 'GET',
        headers: this.getHeaders()
      })

      const { data } = await this.parseResponse(response)
      return data
    } catch (error) {
      console.error('[Steadfast] Get status error:', error)
      return null
    }
  }

  /**
   * Check delivery status by invoice ID
   */
  async getStatusByInvoice(invoice: string): Promise<any> {
    try {
      if (!this.isConfigured()) return null

      const response = await fetch(`${this.baseUrl}/status_by_invoice/${invoice}`, {
        method: 'GET',
        headers: this.getHeaders()
      })

      const { data } = await this.parseResponse(response)
      return data
    } catch (error) {
      console.error('[Steadfast] Get status by invoice error:', error)
      return null
    }
  }

  /**
   * Check delivery status by tracking code
   */
  async getStatusByTrackingCode(trackingCode: string): Promise<any> {
    try {
      if (!this.isConfigured()) return null

      const response = await fetch(`${this.baseUrl}/status_by_trackingcode/${trackingCode}`, {
        method: 'GET',
        headers: this.getHeaders()
      })

      const { data } = await this.parseResponse(response)
      return data
    } catch (error) {
      console.error('[Steadfast] Get status by tracking code error:', error)
      return null
    }
  }

  /**
   * Get current balance
   */
  async getBalance(): Promise<{ status: number; current_balance: number } | null> {
    try {
      if (!this.isConfigured()) return null

      const response = await fetch(`${this.baseUrl}/get_balance`, {
        method: 'GET',
        headers: this.getHeaders()
      })

      const { data } = await this.parseResponse(response)
      return data
    } catch (error) {
      console.error('[Steadfast] Get balance error:', error)
      return null
    }
  }
}

// Export singleton instance
export const steadfastService = new SteadfastService()

// Export class for testing
export { SteadfastService }

// Export types
export type { CreateOrderParams, BulkOrderItem, ConsignmentResponse, BulkOrderResponse }
