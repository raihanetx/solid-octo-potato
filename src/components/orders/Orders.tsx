'use client'

import { ViewType, Order } from '@/types'

interface OrdersProps {
  orders: Order[]
  setView: (v: ViewType) => void
}

type OrderStatus = 'pending' | 'review' | 'shipping' | 'delivered' | 'cancelled'

interface StatusConfig {
  bg: string
  icon: string
  text: string
}

const getStatusConfig = (status: string): StatusConfig => {
  const configs: Record<OrderStatus, StatusConfig> = {
    pending: { bg: 'bg-yellow-500', icon: 'ri-time-line', text: 'Pending' },
    review: { bg: 'bg-blue-600', icon: 'ri-file-list-3-line', text: 'In Review' },
    shipping: { bg: 'bg-purple-600', icon: 'ri-truck-line', text: 'Shipping' },
    delivered: { bg: 'bg-green-600', icon: 'ri-check-line', text: 'Delivered' },
    cancelled: { bg: 'bg-red-600', icon: 'ri-close-line', text: 'Canceled' },
  }
  return configs[status as OrderStatus] || configs.pending
}

export default function Orders({ orders, setView }: OrdersProps) {
  if (orders.length === 0) {
    return (
      <div className="order-clean-wrapper">
        <div className="order-clean-container">
          <div className="order-clean-empty">
            <i className="ri-file-list-3-line" style={{ fontSize: '64px', color: '#d1d5db', display: 'block', marginBottom: '16px' }}></i>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111', marginBottom: '8px', fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>
              কোনো অর্ডার নেই
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px', fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>
              আপনার অর্ডার ইতিহাস এখানে দেখা যাবে
            </p>
            <button 
              onClick={() => setView('shop')}
              style={{
                padding: '12px 24px',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif"
              }}
            >
              শপিং করুন
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Calculate time ago
  const getTimeAgo = (dateStr: string, timeStr?: string) => {
    try {
      const orderDate = new Date(`${dateStr} ${timeStr || ''}`)
      const now = new Date()
      const diffMs = now.getTime() - orderDate.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)
      
      if (diffMins < 60) return `${diffMins} mins ago`
      if (diffHours < 24) return `${diffHours} hours ago`
      if (diffDays < 7) return `${diffDays} days ago`
      return dateStr
    } catch {
      return 'Just now'
    }
  }

  return (
    <div className="order-clean-wrapper">
      <div className="order-clean-container">
        <div className="order-clean-list">
          {orders.map((order) => {
            const statusConfig = getStatusConfig(order.status)
            
            // Calculate total discount (offer + coupon)
            const totalDiscount = (order.discount || 0) + (order.couponAmount || 0)

            return (
              <div 
                key={order.id} 
                className="w-full bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* 1. HEADER: DYNAMIC STATUS & META */}
                <div className={`${statusConfig.bg} text-white p-5 text-center transition-colors duration-300`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <i className={`${statusConfig.icon} text-xl`}></i>
                    <span className="text-lg font-bold uppercase tracking-wide">{statusConfig.text}</span>
                  </div>
                  {/* Order ID + Date + Time Ago */}
                  <p className="text-white/90 text-[11px] font-medium tracking-wide">
                    #{order.id} • {order.date} • {getTimeAgo(order.date, order.time)}
                  </p>
                </div>

                <div className="p-6">
                  {/* 2. CUSTOMER INFO (Name | Phone) */}
                  <div className="bg-gray-50 border border-gray-100 p-3 mb-5 rounded-md">
                    <div className="flex items-center text-sm text-gray-900 mb-1">
                      <span className="font-bold text-base">{order.customer}</span>
                      <span className="text-gray-300 mx-2">|</span>
                      <span className="font-semibold text-gray-700">{order.phone}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-xs text-gray-500">
                      <i className="ri-map-pin-fill text-gray-400 mt-0.5"></i>
                      <span>{order.address}</span>
                    </div>
                  </div>

                  {/* 3. ITEMS LIST (Product • Qty: X) */}
                  <div className="mb-5">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Items</h3>
                    <div className="space-y-2 text-sm">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-gray-700">
                          <span>
                            {item.name}
                            {item.variant && <span className="text-gray-400"> ({item.variant})</span>}
                            <span className="text-gray-300 mx-1">•</span> 
                            <span className="text-gray-400">Qty:</span>
                            <span className="text-gray-700">{item.qty}</span>
                          </span>
                          <span className="font-medium">TK {Math.round(item.basePrice * item.qty)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. TOTAL BREAKDOWN */}
                  <div className="border-t border-dashed border-gray-300 pt-3 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal</span>
                      <span>TK {Math.round(order.subtotal)}</span>
                    </div>
                    
                    <div className="flex justify-between text-gray-500">
                      <span>Delivery Charge</span>
                      <span>{order.delivery > 0 ? `TK ${Math.round(order.delivery)}` : 'FREE'}</span>
                    </div>

                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-red-500">
                        <span>Discount + Coupon</span>
                        <span>- TK {Math.round(totalDiscount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-200">
                      <span className="text-base font-bold text-gray-900">Total Amount</span>
                      <span className="text-xl font-bold text-green-700">TK {Math.round(order.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
