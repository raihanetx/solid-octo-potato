'use client'

import { useState, useEffect } from 'react'
import { ViewType, Coupon } from '@/types'

interface OffersProps {
  setView: (v: ViewType) => void
}

interface OfferSettings {
  freeDeliveryMin: number
  insideDhakaDelivery: number
  outsideDhakaDelivery: number
  universalDelivery: boolean
  universalDeliveryCharge: number
  offerTitle: string
  offerSlogan: string
}

export default function Offers({ setView }: OffersProps) {
  const [settings, setSettings] = useState<OfferSettings>({
    freeDeliveryMin: 500,
    insideDhakaDelivery: 60,
    outsideDhakaDelivery: 120,
    universalDelivery: false,
    universalDeliveryCharge: 60,
    offerTitle: 'Offers',
    offerSlogan: 'Exclusive deals just for you'
  })
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        const data = await response.json()
        if (data.success && data.data) {
          setSettings({
            freeDeliveryMin: data.data.free_delivery_min || 500,
            insideDhakaDelivery: data.data.inside_dhaka_delivery || 60,
            outsideDhakaDelivery: data.data.outside_dhaka_delivery || 120,
            universalDelivery: data.data.universal_delivery || false,
            universalDeliveryCharge: data.data.universal_delivery_charge || 60,
            offerTitle: data.data.offer_title || 'Offers',
            offerSlogan: data.data.offer_slogan || 'Exclusive deals just for you'
          })
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
      }
    }
    fetchSettings()
  }, [])

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const response = await fetch('/api/coupons?public=true')
        const data = await response.json()
        if (data.success && data.coupons) {
          setCoupons(data.coupons)
        }
      } catch (error) {
        console.error('Error fetching coupons:', error)
      }
    }
    fetchCoupons()
  }, [])

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-center text-gray-900">{settings.offerTitle}</h1>
          <p className="text-xs text-gray-500 text-center mt-0.5">{settings.offerSlogan}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Free Delivery Offer - Cart Style Design */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Delivery Header with Green Gradient */}
          <div className="offers-delivery-header">
            <div className="offers-delivery-icon">
              <i className="ri-truck-line"></i>
            </div>
            <div>
              <h2 className="offers-delivery-title">Free Delivery</h2>
              <p className="offers-delivery-subtitle">On orders above TK {settings.freeDeliveryMin}</p>
            </div>
          </div>
          
          {/* Delivery Charges - Same as Cart Design */}
          <div className="offers-delivery-charges">
            <div className="offers-charge-row">
              <span><i className="ri-map-pin-2-line" style={{ marginRight: '6px', color: '#16a34a' }}></i>Inside Dhaka</span>
              <span className="offers-charge-value">TK {settings.insideDhakaDelivery}</span>
            </div>
            {!settings.universalDelivery && (
              <div className="offers-charge-row">
                <span><i className="ri-global-line" style={{ marginRight: '6px', color: '#16a34a' }}></i>Outside Dhaka</span>
                <span className="offers-charge-value">TK {settings.outsideDhakaDelivery}</span>
              </div>
            )}
            {settings.universalDelivery && (
              <div className="offers-charge-row">
                <span><i className="ri-global-line" style={{ marginRight: '6px', color: '#16a34a' }}></i>All Locations</span>
                <span className="offers-charge-value">TK {settings.universalDeliveryCharge}</span>
              </div>
            )}
          </div>
          
          {/* Free Delivery Progress Bar */}
          <div className="offers-free-delivery-banner">
            <div className="offers-free-icon">🎉</div>
            <div className="offers-free-text">
              Order above <strong>TK {settings.freeDeliveryMin}</strong> to get <strong>FREE delivery!</strong>
            </div>
          </div>
        </div>

        {/* Coupon Codes */}
        {coupons.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="ri-coupon-3-line text-green-600 text-lg"></i>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Coupon Codes</h2>
                  <p className="text-xs text-gray-500">Copy & use at checkout</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900 truncate">{coupon.code}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                          {coupon.type === 'pct' ? `${coupon.value}% OFF` : `TK ${coupon.value}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>
                          {coupon.scope === 'all' && 'All products'}
                          {coupon.scope === 'products' && 'Selected products'}
                          {coupon.scope === 'categories' && 'Selected categories'}
                        </span>
                        {coupon.expiry && (
                          <>
                            <span>•</span>
                            <span>Until {formatDate(coupon.expiry)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(coupon.code)}
                      className={`shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        copiedCode === coupon.code
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {copiedCode === coupon.code ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Coupons */}
        {coupons.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <i className="ri-coupon-line text-gray-400 text-xl"></i>
            </div>
            <p className="text-gray-500 text-sm">No active coupons available</p>
            <p className="text-gray-400 text-xs mt-1">Check back later for new offers</p>
          </div>
        )}

        {/* Shop Now Button */}
        <button
          onClick={() => setView('shop')}
          className="w-full bg-[#16a34a] text-white py-3.5 rounded-lg font-semibold hover:bg-[#15803d] transition-colors mt-4"
        >
          Shop Now
        </button>
      </div>
    </div>
  )
}
