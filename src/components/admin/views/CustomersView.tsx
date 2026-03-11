'use client'

import React from 'react'
import { useAdmin } from '@/components/admin/context/AdminContext'
import type { AbandonedProduct } from '@/types'

const CustomersView: React.FC = () => {
  const { customerProfiles, expandedCustomer, setExpandedCustomer, showToastMsg } = useAdmin()

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

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"]
    const v = n % 100
    return s[(v - 20) % 10] || s[v] || s[0]
  }

  const copyToClipboardLocal = (text: string) => {
    navigator.clipboard.writeText(text)
    showToastMsg('Number copied!')
  }

  const toggleCustomerExpand = (id: number) => {
    setExpandedCustomer(expandedCustomer === id ? null : id)
  }

  return (
    <div className="p-4 md:p-8 bg-white min-h-[calc(100vh-80px)]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1c2333]">Customer Profiles</h1>
          <p className="text-[#8a96a8] text-sm mt-1">Overview of customer orders and spending</p>
        </div>
        <span className="px-4 py-1.5 bg-[#16a34a]/10 text-[#16a34a] text-[13px] font-bold rounded-[5px]">
          {customerProfiles.length} Active
        </span>
      </div>

      {/* Table */}
      <div className="flex flex-col gap-2">
        {/* Header Row - Darker background */}
        <div className="grid grid-cols-4 bg-[#374151] rounded-[5px]">
          <div className="px-4 py-3 border-r border-[#4b5563] flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-white">Customer</div>
          <div className="px-4 py-3 border-r border-[#4b5563] flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-white">Address</div>
          <div className="px-4 py-3 border-r border-[#4b5563] flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-white">Overview</div>
          <div className="px-4 py-3 flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-white">Actions</div>
        </div>

        {/* Data Rows */}
        {customerProfiles.map((cust) => (
          <React.Fragment key={cust.id}>
            {/* Main Row */}
            <div 
              className="grid grid-cols-4 bg-white rounded-[5px] border border-[#d1d5db] overflow-hidden hover:border-[#9ca3af] transition-colors cursor-pointer"
              onClick={() => toggleCustomerExpand(cust.id)}
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
                }}>{getInitials(cust.name)}</div>
                <div className="text-center">
                  <div className="text-[13px] font-medium text-[#1c2333]">{cust.name}</div>
                  <div className="text-[11px] text-[#6b7280]">{cust.phone}</div>
                </div>
              </div>
              
              {/* Address */}
              <div className="px-4 py-3.5 border-r border-[#d1d5db] flex items-center justify-center">
                <span className="text-[12px] text-[#6b7280] truncate max-w-[200px]">{cust.address}</span>
              </div>
              
              {/* Overview */}
              <div className="px-4 py-3.5 border-r border-[#d1d5db] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-[13px] font-medium text-[#1c2333]">Total {cust.totalOrders || 0} Orders</div>
                  <div className="text-[11px] text-[#6b7280]">Spent TK {parseFloat(String(cust.totalSpent || 0)).toFixed(2)}</div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="px-4 py-3.5 flex items-center justify-center gap-2">
                {/* Action Buttons */}
                <button 
                  onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${cust.phone}`; }} 
                  className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[14px] text-[#6b7280] bg-white hover:bg-[#d1fae5] hover:text-[#16a34a] transition-colors"
                >
                  <i className="ri-phone-line"></i>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); copyToClipboardLocal(cust.phone); }}
                  className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[14px] text-[#6b7280] bg-white hover:bg-[#e2e8f0] hover:text-[#1c2333] transition-colors"
                >
                  <i className="ri-file-copy-line"></i>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${cust.phone.replace('+', '')}`, '_blank'); }}
                  className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[14px] text-[#6b7280] bg-white hover:bg-[#dcfce7] hover:text-[#16a34a] transition-colors"
                >
                  <i className="ri-whatsapp-line"></i>
                </button>
                <i className="ri-arrow-down-s-line text-[16px] text-[#6b7280] ml-2 transition-transform" style={{
                  transform: expandedCustomer === cust.id ? 'rotate(180deg)' : 'rotate(0deg)'
                }}></i>
              </div>
            </div>
            
            {/* Expand Row */}
            {expandedCustomer === cust.id && (
              <div className="bg-white rounded-[5px] border border-[#d1d5db] p-4 ml-4">
                {/* Nested Table Header */}
                <div className="grid grid-cols-3 bg-[#f3f4f6] rounded-[5px] mb-2">
                  <div className="px-3 py-2 border-r border-[#e5e7eb] flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Date</div>
                  <div className="px-3 py-2 border-r border-[#e5e7eb] flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Products</div>
                  <div className="px-3 py-2 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Total</div>
                </div>
                
                {/* Nested Data Rows */}
                {(cust.orders || []).map((o, idx) => {
                  const entries = buildEntries(o.products || [])
                  const totalItems = entries.reduce((acc, e) => acc + e.qty, 0)
                  
                  return (
                    <div key={idx} className="grid grid-cols-3 bg-white rounded-[5px] border border-[#e5e7eb] mb-1 hover:border-[#d1d5db] transition-colors">
                      {/* Date */}
                      <div className="px-3 py-2.5 border-r border-[#e5e7eb] flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-[12px] font-medium text-[#1c2333]">{o.date}</div>
                          <div className="text-[10px] text-[#6b7280]">
                            Placed on <span className="text-[#16a34a] font-semibold">{o.visitCount}{getOrdinal(o.visitCount)}</span> visit
                          </div>
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
                      <div className="px-3 py-2.5 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-[13px] font-bold text-[#16a34a]">TK {parseFloat(String(o.total || 0)).toFixed(2)}</div>
                          <div className="text-[10px] text-[#6b7280]">(Total {totalItems} items)</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export default CustomersView
