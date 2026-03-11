'use client'

import React, { useState, useEffect } from 'react'
import { useAdmin } from '@/components/admin/context/AdminContext'
import type { Order } from '@/types'

interface OverviewViewProps {
  setDashView: (view: string) => void
}

interface AnalyticsData {
  mostViewed: Array<{ id: number; name: string; category: string; image: string; views: number }>
  mostInCart: Array<{ id: number; name: string; category: string; image: string; adds: number }>
  salesChart: Array<{ day: string; revenue: number; orders: number }>
  revenueByCategory: Array<{ category: string; revenue: number; percentage: number }>
  totalRevenue: number
}

const OverviewView: React.FC<OverviewViewProps> = ({ setDashView }) => {
  const { orders, setOrders, showToastMsg, products, customerProfiles } = useAdmin()
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    mostViewed: [],
    mostInCart: [],
    salesChart: [],
    revenueByCategory: [],
    totalRevenue: 0,
  })

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [viewedRes, cartRes, chartRes, categoryRes] = await Promise.all([
          fetch('/api/analytics?action=most-viewed&limit=3'),
          fetch('/api/analytics?action=most-in-cart&limit=3'),
          fetch('/api/analytics?action=sales-chart'),
          fetch('/api/analytics?action=revenue-by-category'),
        ])
        
        const viewedData = await viewedRes.json()
        const cartData = await cartRes.json()
        const chartData = await chartRes.json()
        const categoryData = await categoryRes.json()
        
        setAnalytics({
          mostViewed: viewedData.success ? viewedData.data : [],
          mostInCart: cartData.success ? cartData.data : [],
          salesChart: chartData.success ? chartData.data : [],
          revenueByCategory: categoryData.success ? categoryData.data : [],
          totalRevenue: categoryData.success ? categoryData.totalRevenue : 0,
        })
      } catch (error) {
        console.error('Error fetching analytics:', error)
      }
    }
    
    fetchAnalytics()
  }, [])

  // Calculate real metrics from orders
  const totalRevenue = orders.filter(o => o.status === 'approved').reduce((sum, o) => sum + o.total, 0)
  const totalOrders = orders.length
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const approvedOrders = orders.filter(o => o.status === 'approved').length
  const totalCustomers = customerProfiles.length

  // Aggregate product sales from order items
  const productSales = new Map<string, { name: string; category: string; count: number; img: string }>()
  orders.forEach(order => {
    order.items.forEach(item => {
      const existing = productSales.get(item.name)
      if (existing) {
        existing.count += item.qty
      } else {
        // Find product info from products list
        const product = products.find(p => p.name === item.name)
        productSales.set(item.name, {
          name: item.name,
          category: product?.category || 'Other',
          count: item.qty,
          img: product?.image || 'https://via.placeholder.com/36'
        })
      }
    })
  })

  // Get top selling products
  const topSellingProducts = Array.from(productSales.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  // Helper function to update order status via API
  const updateOrderStatus = async (id: string, status: 'approved' | 'canceled') => {
    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          canceledBy: status === 'canceled' ? 'Admin' : null
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        setOrders(orders.map((o: Order) => o.id === id ? {...o, status, canceledBy: status === 'canceled' ? 'Admin' : null} : o))
        showToastMsg(status === 'approved' ? 'Order approved!' : 'Order rejected!')
      } else {
        showToastMsg('Failed to update order')
      }
    } catch (error) {
      console.error('Error updating order:', error)
      showToastMsg('Error updating order')
    }
  }

  // Calculate chart height percentage based on max revenue
  const maxRevenue = Math.max(...analytics.salesChart.map(d => d.revenue), 1)
  const chartData = analytics.salesChart.map(d => ({
    day: d.day,
    height: `${Math.max((d.revenue / maxRevenue) * 100, 10)}%`,
    revenue: d.revenue,
    orders: d.orders
  }))

  return (
    <>
      <section className="metrics">
        <div className="metric-card"><div className="metric-label">Revenue</div><div className="metric-value">TK{totalRevenue.toLocaleString()}</div><div className="metric-change trend-pos">↑ {totalOrders > 0 ? 'Active' : '0'} <span style={{color: 'var(--admin-text-tertiary)', fontWeight: 400}}>from {approvedOrders} orders</span></div></div>
        <div className="metric-card"><div className="metric-label">Orders</div><div className="metric-value">{totalOrders}</div><div className="metric-change trend-pos">↑ {pendingOrders} <span style={{color: 'var(--admin-text-tertiary)', fontWeight: 400}}>pending</span></div></div>
        <div className="metric-card"><div className="metric-label">Avg. Order</div><div className="metric-value">TK{avgOrderValue}</div><div className="metric-change trend-pos">— <span style={{color: 'var(--admin-text-tertiary)', fontWeight: 400}}>per order</span></div></div>
        <div className="metric-card"><div className="metric-label">Waste</div><div className="metric-value">0 kg</div><div className="metric-change trend-pos">↓ 0% <span style={{color: 'var(--admin-text-tertiary)', fontWeight: 400}}>no data</span></div></div>
      </section>
      
      {/* Recent Orders - Full Width */}
      <section style={{marginBottom: '24px'}}>
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Recent Orders</div>
            <div style={{fontSize: '12px', color: 'var(--admin-primary)', cursor: 'pointer', fontWeight: 500}} onClick={() => setDashView('orders')}>View All →</div>
          </div>
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', fontSize: '13px'}}>
              <thead style={{background: '#ffffff', borderBottom: '1px solid #e2e8f0'}}>
                <tr>
                  <th style={{textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Order</th>
                  <th style={{textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Customer</th>
                  <th style={{textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Items</th>
                  <th style={{textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Payment</th>
                  <th style={{textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Total</th>
                  <th style={{textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Status</th>
                  <th style={{textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order: Order) => (
                  <tr key={order.id} style={{borderBottom: '1px solid #f1f5f9'}} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{padding: '12px 16px', verticalAlign: 'middle'}}>
                      <span style={{fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: '#0f172a'}}>{order.id}</span>
                      <div style={{fontSize: '11px', color: '#94a3b8', marginTop: '2px'}}>{order.time}</div>
                    </td>
                    <td style={{padding: '12px 16px', verticalAlign: 'middle'}}>
                      <div style={{fontWeight: 500, color: '#0f172a'}}>{order.customer}</div>
                      <div style={{fontSize: '11px', color: '#94a3b8'}}>{order.phone}</div>
                    </td>
                    <td style={{padding: '12px 16px', verticalAlign: 'middle'}}>
                      <div style={{fontSize: '12px', color: '#0f172a'}}>{order.items.length} items</div>
                    </td>
                    <td style={{padding: '12px 16px', verticalAlign: 'middle'}}>
                      <div style={{fontSize: '11px', fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.02em'}}>{order.paymentMethod}</div>
                    </td>
                    <td style={{padding: '12px 16px', verticalAlign: 'middle'}}>
                      <span style={{fontSize: '13px', fontWeight: 600, color: '#16a34a'}}>TK{order.total.toLocaleString()}</span>
                    </td>
                    <td style={{padding: '12px 16px', verticalAlign: 'middle'}}>
                      {order.status === 'pending' && (
                        <span style={{display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: '#fef3c7', color: '#d97706'}}>
                          <span style={{width: '6px', height: '6px', borderRadius: '50%', background: '#d97706'}}></span>
                          Pending
                        </span>
                      )}
                      {order.status === 'approved' && (
                        <span style={{display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: '#d1fae5', color: '#16a34a'}}>
                          <span style={{width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a'}}></span>
                          Approved
                        </span>
                      )}
                      {order.status === 'canceled' && (
                        <span style={{display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: '#fee2e2', color: '#dc2626'}}>
                          <span style={{width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626'}}></span>
                          Canceled
                        </span>
                      )}
                    </td>
                    <td style={{padding: '12px 16px', verticalAlign: 'middle'}}>
                      {order.status === 'pending' && (
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <span 
                            onClick={() => updateOrderStatus(order.id, 'approved')} 
                            style={{color: '#16a34a', fontWeight: 700, fontSize: '11px', cursor: 'pointer'}}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                          >Approve</span>
                          <span style={{color: '#cbd5e1', fontSize: '10px'}}>|</span>
                          <span 
                            onClick={() => updateOrderStatus(order.id, 'canceled')} 
                            style={{color: '#dc2626', fontWeight: 700, fontSize: '11px', cursor: 'pointer'}}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                          >Reject</span>
                        </div>
                      )}
                      {order.status === 'approved' && (
                        <div>
                          <div style={{color: '#16a34a', fontWeight: 700, fontSize: '11px'}}>Approved</div>
                          <div style={{fontSize: '10px', color: '#94a3b8'}}>by Admin</div>
                        </div>
                      )}
                      {order.status === 'canceled' && (
                        <div>
                          <div style={{color: '#dc2626', fontWeight: 700, fontSize: '11px'}}>Canceled</div>
                          <div style={{fontSize: '10px', color: '#94a3b8'}}>by Admin</div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      
      {/* Product Stats Sections */}
      <section style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px'}}>
        {/* Most Selling Products */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <i className="ri-fire-line" style={{color: '#ef4444'}}></i>
              Most Selling
            </div>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
            {topSellingProducts.length > 0 ? topSellingProducts.map((item, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', transition: 'background 0.15s'}} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <img src={item.img} alt={item.name} style={{width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain', background: '#ffffff'}} />
                <div style={{flex: 1}}>
                  <div style={{fontSize: '12px', fontWeight: 600, color: '#0f172a'}}>{item.name}</div>
                  <div style={{fontSize: '10px', color: '#94a3b8'}}>{item.category}</div>
                </div>
                <span style={{fontSize: '13px', fontWeight: 700, color: '#ef4444'}}>{item.count}</span>
              </div>
            )) : [
              { name: 'Fresh Carrots', category: 'Vegetables', amount: '0', img: 'https://i.postimg.cc/B6sD1hKt/1000020579-removebg-preview.png' },
              { name: 'Red Apples', category: 'Fruits', amount: '0', img: 'https://i.postimg.cc/x1wL9jTV/IMG-20260228-163137.png' },
              { name: 'Fresh Bananas', category: 'Fruits', amount: '0', img: 'https://i.postimg.cc/bw71qYYK/IMG-20260228-163147.png' },
            ].map((item, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', transition: 'background 0.15s'}} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <img src={item.img} alt={item.name} style={{width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain', background: '#ffffff'}} />
                <div style={{flex: 1}}>
                  <div style={{fontSize: '12px', fontWeight: 600, color: '#0f172a'}}>{item.name}</div>
                  <div style={{fontSize: '10px', color: '#94a3b8'}}>{item.category}</div>
                </div>
                <span style={{fontSize: '13px', fontWeight: 700, color: '#ef4444'}}>{item.amount}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Most Visited Products */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <i className="ri-eye-line" style={{color: '#16a34a'}}></i>
              Most Visited
            </div>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
            {analytics.mostViewed.length > 0 ? analytics.mostViewed.map((item, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', transition: 'background 0.15s'}} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <img src={item.image} alt={item.name} style={{width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain', background: '#ffffff'}} />
                <div style={{flex: 1}}>
                  <div style={{fontSize: '12px', fontWeight: 600, color: '#0f172a'}}>{item.name}</div>
                  <div style={{fontSize: '10px', color: '#94a3b8'}}>{item.category}</div>
                </div>
                <span style={{fontSize: '13px', fontWeight: 700, color: '#16a34a'}}>{item.views}</span>
              </div>
            )) : [
              { name: 'Premium Potatoes', category: 'Vegetables', amount: '0', img: 'https://i.postimg.cc/d1vdTWyL/1000020583-removebg-preview.png' },
              { name: 'Sweet Oranges', category: 'Fruits', amount: '0', img: 'https://i.postimg.cc/mr7Ckxtx/IMG-20260228-163156.png' },
              { name: 'Mango Fresh', category: 'Fruits', amount: '0', img: 'https://i.postimg.cc/Z5G6JYKm/IMG-20260228-163217.png' },
            ].map((item, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', transition: 'background 0.15s'}} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <img src={item.img} alt={item.name} style={{width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain', background: '#ffffff'}} />
                <div style={{flex: 1}}>
                  <div style={{fontSize: '12px', fontWeight: 600, color: '#0f172a'}}>{item.name}</div>
                  <div style={{fontSize: '10px', color: '#94a3b8'}}>{item.category}</div>
                </div>
                <span style={{fontSize: '13px', fontWeight: 700, color: '#16a34a'}}>{item.amount}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Most Added to Cart */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <i className="ri-shopping-cart-2-line" style={{color: '#f59e0b'}}></i>
              Most in Cart
            </div>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
            {analytics.mostInCart.length > 0 ? analytics.mostInCart.map((item, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', transition: 'background 0.15s'}} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <img src={item.image} alt={item.name} style={{width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain', background: '#ffffff'}} />
                <div style={{flex: 1}}>
                  <div style={{fontSize: '12px', fontWeight: 600, color: '#0f172a'}}>{item.name}</div>
                  <div style={{fontSize: '10px', color: '#94a3b8'}}>{item.category}</div>
                </div>
                <span style={{fontSize: '13px', fontWeight: 700, color: '#f59e0b'}}>{item.adds}</span>
              </div>
            )) : [
              { name: 'Fresh Tomatoes', category: 'Vegetables', amount: '0', img: 'https://i.postimg.cc/mr7CkxtQ/1000020584-removebg-preview.png' },
              { name: 'Grapes Green', category: 'Fruits', amount: '0', img: 'https://i.postimg.cc/htkVK4PD/IMG-20260228-163208.png' },
              { name: 'Fresh Broccoli', category: 'Vegetables', amount: '0', img: 'https://i.postimg.cc/qR0nCm36/1000020611-removebg-preview.png' },
            ].map((item, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', transition: 'background 0.15s'}} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <img src={item.img} alt={item.name} style={{width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain', background: '#ffffff'}} />
                <div style={{flex: 1}}>
                  <div style={{fontSize: '12px', fontWeight: 600, color: '#0f172a'}}>{item.name}</div>
                  <div style={{fontSize: '10px', color: '#94a3b8'}}>{item.category}</div>
                </div>
                <span style={{fontSize: '13px', fontWeight: 700, color: '#f59e0b'}}>{item.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Store Insights Dashboard */}
      <section style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px'}}>
        {/* Sales Performance Chart */}
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Sales Performance (7 Days)</div></div>
          <div className="chart-area">
            {chartData.map((bar, i) => (
              <div key={i} className="bar-group">
                <div className={`bar ${bar.active ? 'active' : ''}`} style={{height: bar.height}}></div>
                <span className="bar-label">{bar.day}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Revenue Breakdown */}
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Revenue by Category</div></div>
          <div style={{padding: '16px'}}>
            {/* Donut Chart - Dynamic */}
            <div style={{display: 'flex', justifyContent: 'center', marginBottom: '20px'}}>
              <div style={{width: '140px', height: '140px', position: 'relative'}}>
                <svg viewBox="0 0 36 36" style={{width: '100%', height: '100%', transform: 'rotate(-90deg)'}}>
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="4"></circle>
                  {analytics.revenueByCategory.length > 0 ? analytics.revenueByCategory.map((cat, i) => {
                    const colors = ['#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
                    const prevOffset = analytics.revenueByCategory.slice(0, i).reduce((sum, c) => sum + c.percentage, 0)
                    return (
                      <circle 
                        key={i}
                        cx="18" cy="18" r="15.5" 
                        fill="none" 
                        stroke={colors[i % colors.length]} 
                        strokeWidth="4" 
                        strokeDasharray={`${cat.percentage} ${100 - cat.percentage}`}
                        strokeDashoffset={-prevOffset}
                        strokeLinecap="round"
                      />
                    )
                  }) : (
                    <>
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#16a34a" strokeWidth="4" strokeDasharray="35 65" strokeLinecap="round"></circle>
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="-35" strokeLinecap="round"></circle>
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray="20 80" strokeDashoffset="-60" strokeLinecap="round"></circle>
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#8b5cf6" strokeWidth="4" strokeDasharray="15 85" strokeDashoffset="-80" strokeLinecap="round"></circle>
                    </>
                  )}
                </svg>
                <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center'}}>
                  <div style={{fontSize: '18px', fontWeight: 700, color: '#0f172a'}}>TK{(analytics.totalRevenue || totalRevenue).toLocaleString()}</div>
                  <div style={{fontSize: '10px', color: '#94a3b8'}}>Total</div>
                </div>
              </div>
            </div>
            {/* Legend - Dynamic */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {analytics.revenueByCategory.length > 0 ? analytics.revenueByCategory.map((item, i) => {
                const colors = ['#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
                return (
                  <div key={i} style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <div style={{width: '10px', height: '10px', borderRadius: '2px', background: colors[i % colors.length]}}></div>
                    <div style={{flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span style={{fontSize: '12px', color: '#475569'}}>{item.category}</span>
                      <span style={{fontSize: '11px', fontWeight: 600, color: '#0f172a'}}>{item.percentage}%</span>
                    </div>
                  </div>
                )
              }) : [
                { name: 'Vegetables', percent: '35%', color: '#16a34a' },
                { name: 'Fruits', percent: '25%', color: '#f59e0b' },
                { name: 'Dairy', percent: '20%', color: '#ef4444' },
                { name: 'Others', percent: '20%', color: '#8b5cf6' },
              ].map((item, i) => (
                <div key={i} style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <div style={{width: '10px', height: '10px', borderRadius: '2px', background: item.color}}></div>
                  <div style={{flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span style={{fontSize: '12px', color: '#475569'}}>{item.name}</span>
                    <span style={{fontSize: '11px', fontWeight: 600, color: '#0f172a'}}>{item.percent}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Key Metrics Cards */}
      <section style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px'}}>
        {[
          { label: 'Total Orders Today', value: totalOrders.toString(), change: `${pendingOrders} pending`, positive: true, icon: 'ri-shopping-bag-line', color: '#16a34a' },
          { label: 'Avg. Order Value', value: `TK${avgOrderValue}`, change: 'per order', positive: true, icon: 'ri-money-dollar-circle-line', color: '#f59e0b' },
          { label: 'New Customers', value: totalCustomers.toString(), change: 'total', positive: true, icon: 'ri-user-add-line', color: '#16a34a' },
          { label: 'Pending Orders', value: pendingOrders.toString(), change: 'awaiting', positive: pendingOrders === 0, icon: 'ri-time-line', color: '#ef4444' },
        ].map((metric, i) => (
          <div key={i} className="panel" style={{padding: '20px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
              <div style={{width: '40px', height: '40px', borderRadius: '10px', background: `${metric.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <i className={metric.icon} style={{fontSize: '20px', color: metric.color}}></i>
              </div>
              <span style={{fontSize: '11px', fontWeight: 600, color: metric.positive ? '#10b981' : '#ef4444', background: metric.positive ? '#d1fae5' : '#fee2e2', padding: '2px 8px', borderRadius: '12px'}}>{metric.change}</span>
            </div>
            <div style={{fontSize: '22px', fontWeight: 700, color: '#0f172a', marginBottom: '4px'}}>{metric.value}</div>
            <div style={{fontSize: '12px', color: '#94a3b8'}}>{metric.label}</div>
          </div>
        ))}
      </section>
    </>
  )
}

export default OverviewView
