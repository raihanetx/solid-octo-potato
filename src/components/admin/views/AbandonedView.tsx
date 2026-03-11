'use client'

import React from 'react'
import { useAdmin } from '@/components/admin/context/AdminContext'
import type { AbandonedProduct } from '@/types'

const AbandonedView: React.FC = () => {
  const { abandonedCheckouts, expandedAbandoned, setExpandedAbandoned } = useAdmin()

  const getInitials = (name: string) => {
    if (!name || name === 'Unknown') return '?'
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  const buildEntries = (products: AbandonedProduct[]) => {
    if (!products || !Array.isArray(products)) return []
    const entries: { name: string; variant: string | null; qty: number }[] = []
    products.forEach(p => {
      if (p && p.variants && Array.isArray(p.variants)) {
        p.variants.forEach(v => entries.push({ name: p.name, variant: v.label, qty: v.qty }))
      }
    })
    return entries
  }

  const toggleAbandonedExpand = (id: number) => {
    setExpandedAbandoned(expandedAbandoned === id ? null : id)
  }

  return (
    <div className="p-4 md:p-8 bg-white min-h-[calc(100vh-80px)]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1c2333]">Abandoned Checkouts</h1>
          <p className="text-[#8a96a8] text-sm mt-1">Customers who visited but didn&apos;t complete checkout</p>
        </div>
        <span className="px-4 py-1.5 bg-[#f59e0b]/10 text-[#f59e0b] text-[13px] font-bold rounded-[5px]">
          {abandonedCheckouts.length} Active
        </span>
      </div>

      {/* Table */}
      <div className="flex flex-col gap-2">
        {/* Header Row - Darker background */}
        <div className="grid grid-cols-4 bg-[#374151] rounded-[5px]">
          <div className="px-4 py-3 border-r border-[#4b5563] flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-white">Customer</div>
          <div className="px-4 py-3 border-r border-[#4b5563] flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-white">Address</div>
          <div className="px-4 py-3 border-r border-[#4b5563] flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-white">Last Visit</div>
          <div className="px-4 py-3 flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-white">Visits</div>
        </div>

        {/* Data Rows */}
        {abandonedCheckouts.length === 0 ? (
          <div className="bg-white rounded-[5px] border border-[#d1d5db] p-12 text-center">
            <i className="ri-shopping-cart-line text-[2.5rem] text-[#d1d5db] block mb-2"></i>
            <div className="text-[0.9rem] font-medium text-[#6b7280]">No abandoned checkouts yet</div>
            <div className="text-[0.75rem] text-[#9ca3af] mt-1">When customers visit checkout without completing, they will appear here</div>
          </div>
        ) : (
          abandonedCheckouts.map((ab) => (
            <React.Fragment key={ab.id}>
              {/* Main Row */}
              <div 
                className="grid grid-cols-4 bg-white rounded-[5px] border border-[#d1d5db] overflow-hidden hover:border-[#9ca3af] transition-colors cursor-pointer"
                onClick={() => toggleAbandonedExpand(ab.id)}
              >
                {/* Customer */}
                <div className="px-4 py-3.5 border-r border-[#d1d5db] flex items-center justify-center gap-2">
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: '#d1fae5',
                    border: '1.5px solid #16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: '#16a34a'
                  }}>{getInitials(ab.name)}</div>
                  <div className="text-center">
                    <div className="text-[13px] font-medium text-[#1c2333]">{ab.name || 'Unknown'}</div>
                    <div className="text-[11px] text-[#6b7280]">{ab.phone || 'No phone'}</div>
                  </div>
                </div>
                
                {/* Address */}
                <div className="px-4 py-3.5 border-r border-[#d1d5db] flex items-center justify-center">
                  <span className="text-[12px] text-[#6b7280] truncate max-w-[200px]">{ab.address || 'No address'}</span>
                </div>
                
                {/* Last Visit */}
                <div className="px-4 py-3.5 border-r border-[#d1d5db] flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-[13px] font-medium text-[#1c2333]">{ab.visitTime}</div>
                    <div className="text-[11px] text-[#6b7280]">{ab.visitDate}</div>
                  </div>
                </div>
                
                {/* Visits */}
                <div className="px-4 py-3.5 flex items-center justify-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-[#1c2333]">{ab.totalVisits}</span>
                    <span className="text-[11px] text-[#6b7280]">visits</span>
                    <span className="w-px h-3 bg-[#d1d5db] mx-1"></span>
                    <span className="text-[13px] font-bold text-[#16a34a]">{ab.completedOrders}</span>
                    <span className="text-[11px] text-[#6b7280]">done</span>
                  </div>
                  <i className="ri-arrow-down-s-line text-[16px] text-[#6b7280] transition-transform" style={{
                    transform: expandedAbandoned === ab.id ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}></i>
                </div>
              </div>
              
              {/* Expand Row - History */}
              {expandedAbandoned === ab.id && (
                <div className="bg-white rounded-[5px] border border-[#d1d5db] p-4 ml-4">
                  {/* Nested Table Header */}
                  <div className="grid grid-cols-5 bg-[#f3f4f6] rounded-[5px] mb-2">
                    <div className="px-3 py-2 border-r border-[#e5e7eb] flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Visit #</div>
                    <div className="px-3 py-2 border-r border-[#e5e7eb] flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Date & Time</div>
                    <div className="px-3 py-2 border-r border-[#e5e7eb] flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Products</div>
                    <div className="px-3 py-2 border-r border-[#e5e7eb] flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Total</div>
                    <div className="px-3 py-2 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Status</div>
                  </div>
                  
                  {/* Nested Data Rows */}
                  {(ab.history || []).map((h, idx) => {
                    const isComp = h.status === 'completed'
                    const entries = buildEntries(h.products || [])
                    const totalItems = entries.reduce((acc, e) => acc + e.qty, 0)
                    
                    return (
                      <div key={idx} className="grid grid-cols-5 bg-white rounded-[5px] border border-[#e5e7eb] mb-1 hover:border-[#d1d5db] transition-colors">
                        {/* Visit # */}
                        <div className="px-3 py-2.5 border-r border-[#e5e7eb] flex items-center justify-center">
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: isComp ? '#dcfce7' : '#fee2e2',
                            color: isComp ? '#16a34a' : '#ef4444',
                            fontWeight: 700,
                            fontSize: '0.7rem'
                          }}>#{h.visitNumber || idx + 1}</span>
                        </div>
                        
                        {/* Date & Time */}
                        <div className="px-3 py-2.5 border-r border-[#e5e7eb] flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-[12px] font-medium text-[#1c2333]">{h.date}</div>
                            <div className="text-[10px] text-[#6b7280]">{h.time} · {h.timeAgo}</div>
                          </div>
                        </div>
                        
                        {/* Products */}
                        <div className="px-3 py-2.5 border-r border-[#e5e7eb] flex items-center">
                          <div className="flex flex-wrap gap-0.5 text-[11px]">
                            {entries.map((e, i) => {
                              const isLast = i === entries.length - 1
                              return (
                                <span key={i} className="text-[#475569]">
                                  <span className="font-medium text-[#1c2333]">{e.name}</span>
                                  {e.variant && <span className="text-[#6b7280]"> ({e.variant})</span>}
                                  <span className="text-[#16a34a] font-bold"> ×{e.qty}</span>
                                  {!isLast && <span className="text-[#d1d5db] mx-1">|</span>}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                        
                        {/* Total */}
                        <div className="px-3 py-2.5 border-r border-[#e5e7eb] flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-[13px] font-bold text-[#16a34a]">TK {parseFloat(String(h.total || 0)).toFixed(2)}</div>
                            <div className="text-[10px] text-[#6b7280]">({totalItems} items)</div>
                          </div>
                        </div>
                        
                        {/* Status */}
                        <div className="px-3 py-2.5 flex items-center justify-center">
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            borderRadius: '12px',
                            textTransform: 'uppercase',
                            background: isComp ? '#dcfce7' : '#fee2e2',
                            color: isComp ? '#16a34a' : '#ef4444'
                          }}>
                            {isComp ? <i className="ri-check-line"></i> : <i className="ri-close-line"></i>}
                            {isComp ? 'Done' : 'Left'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  )
}

export default AbandonedView
