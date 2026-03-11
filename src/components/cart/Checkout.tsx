'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { ViewType, CartItem } from '@/types'

interface DeliverySettings {
  insideDhaka: number
  outsideDhaka: number
  freeDeliveryMin: number
  universal: boolean
  universalCharge: number
}

interface CheckoutProps {
  setView: (v: ViewType) => void
  onConfirm: (customerInfo: { name: string; phone: string; address: string; note?: string }, couponCode?: string) => void
  cartItems?: CartItem[]
  deliveryCharge?: number
  deliverySettings?: DeliverySettings
  onCheckoutSession?: (sessionId: string) => void
  onRemoveItem?: (id: number) => void
}

interface ValidatedCoupon {
  code: string
  type: 'pct' | 'fixed'
  value: number
  scope: string
  applicableProductIds?: number[]
}

// Dhaka area keywords for auto-detection
const dhakaKeywords = ['dhaka', 'dhanmondi', 'gulshan', 'uttara', 'mirpur', 'mohammadpur', 'banani', 'badda', 'tejgaon', 'motijheel', 'ramna', 'sabujbagh', 'khilgaon', 'kadamtali', 'demra', 'hazaribagh', 'lalbagh', 'kotwali', 'sutrapur', 'wari', 'chawkbazar', 'bangsal', 'shahbagh', 'paltan', 'jatrabari', 'shyampur', 'cantonment', 'turag', 'darussalam', 'kafrul', 'adabor', 'pallabi', 'sher-e-bangla nagar']

// Persistent session storage key - ONE key for the entire customer journey
const SESSION_KEY = 'ecomart_customer_session'
const DELIVERY_LOCATION_KEY = 'ecomart_delivery_location'

export default function Checkout({ setView, onConfirm, cartItems = [], deliveryCharge = 60, deliverySettings, onCheckoutSession, onRemoveItem }: CheckoutProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [validatedCoupon, setValidatedCoupon] = useState<ValidatedCoupon | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({show: false, message: '', type: 'success'})
  
  // Show toast message
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({show: true, message, type})
    setTimeout(() => {
      setToast({show: false, message: '', type: 'success'})
    }, 2500)
  }
  
  // Track if we already recorded the visit
  const visitRecordedRef = useRef(false)

  // Calculate totals from cart items
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0)
  
  // Calculate dynamic delivery charge based on address and settings
  const calculatedDelivery = useMemo(() => {
    if (!deliverySettings) return deliveryCharge
    
    if (subtotal >= deliverySettings.freeDeliveryMin) {
      return 0
    }
    
    if (deliverySettings.universal) {
      return deliverySettings.universalCharge
    }
    
    const addressLower = address.toLowerCase()
    const isInsideDhaka = dhakaKeywords.some(keyword => addressLower.includes(keyword))
    
    return isInsideDhaka ? deliverySettings.insideDhaka : deliverySettings.outsideDhaka
  }, [address, subtotal, deliverySettings, deliveryCharge])
  
  const discount = validatedCoupon 
    ? (validatedCoupon.type === 'pct' 
        ? Math.round(subtotal * (validatedCoupon.value / 100))
        : Math.min(validatedCoupon.value, subtotal))
    : 0
  
  const total = subtotal - discount + calculatedDelivery

  // Get or create PERSISTENT session ID
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    let existingSession = localStorage.getItem(SESSION_KEY)
    
    if (!existingSession) {
      existingSession = `customer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      localStorage.setItem(SESSION_KEY, existingSession)
    }
    
    setSessionId(existingSession)
    if (onCheckoutSession) {
      onCheckoutSession(existingSession)
    }
    
    visitRecordedRef.current = false
  }, [onCheckoutSession])

  // Load saved delivery location
  // Removed - don't auto-fill address

  // Track NEW checkout visit
  useEffect(() => {
    if (!sessionId || cartItems.length === 0) return
    if (visitRecordedRef.current) return

    const trackVisit = async () => {
      try {
        const items = cartItems.map(item => ({
          name: item.name,
          variants: [{
            label: item.weight,
            qty: item.quantity || 1
          }]
        }))

        await fetch('/api/abandoned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            items,
            subtotal,
            delivery: calculatedDelivery,
            total: subtotal + calculatedDelivery,
            isNewVisit: true
          })
        })
        
        visitRecordedRef.current = true
      } catch (error) {
        console.error('Error tracking visit:', error)
      }
    }

    trackVisit()
  }, [sessionId, cartItems.length])

  // Update customer info IMMEDIATELY
  useEffect(() => {
    if (!sessionId || cartItems.length === 0 || !visitRecordedRef.current) return
    if (!name && !phone && !address) return

    const updateInfo = async () => {
      try {
        const items = cartItems.map(item => ({
          name: item.name,
          variants: [{ label: item.weight, qty: item.quantity || 1 }]
        }))

        await fetch('/api/abandoned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            name,
            phone,
            address,
            items,
            subtotal,
            delivery: calculatedDelivery,
            total: subtotal + calculatedDelivery,
            isNewVisit: false
          })
        })
      } catch (error) {
        console.error('Error updating info:', error)
      }
    }

    updateInfo()
  }, [sessionId, name, phone, address, cartItems.length])

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('অনুগ্রহ করে কুপন কোড লিখুন')
      return
    }
    
    setIsValidatingCoupon(true)
    setCouponError(null)
    setValidatedCoupon(null)
    
    try {
      const cartItemsForCoupon = cartItems.map(item => ({
        productId: item.id,
        id: item.id,
        category: item.category || '',
        categoryId: item.categoryId,
        name: item.name
      }))
      
      const response = await fetch(`/api/coupons?code=${encodeURIComponent(couponCode.trim().toUpperCase())}&cartItems=${encodeURIComponent(JSON.stringify(cartItemsForCoupon))}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        setValidatedCoupon({
          code: result.data.code,
          type: result.data.type,
          value: result.data.value,
          scope: result.data.scope,
          applicableProductIds: result.applicableItems || cartItems.map(i => i.id),
        })
        showToast('কুপন সফলভাবে প্রয়োগ হয়েছে!', 'success')
      } else {
        showToast(result.error || 'অবৈধ কুপন কোড', 'error')
      }
    } catch (error) {
      showToast('কুপন যাচাই করতে ব্যর্থ হয়েছে', 'error')
    } finally {
      setIsValidatingCoupon(false)
    }
  }

  const handleConfirm = () => {
    if (!name || !phone || !address) {
      showToast('অনুগ্রহ করে সকল তথ্য পূরণ করুন', 'error')
      return
    }
    
    onConfirm({ name, phone, address, note }, validatedCoupon?.code || undefined)
  }

  return (
    <div className="chk-bg">
      {/* Toast Notification */}
      <div className={`chk-toast-msg ${toast.show ? 'show' : ''} ${toast.type}`}>
        <span>{toast.message}</span>
      </div>
      <div className="chk-container">
        {/* Customer Information */}
        <div className="chk-section-header" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>
          <i className="ri-user-line"></i> গ্রাহক তথ্য
        </div>
        <div className="chk-input-wrapper">
          <i className="ri-user-3-line chk-input-icon"></i>
          <input type="text" id="fullname" className="chk-clean-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setFocusedField('fullname')}
            onBlur={() => setFocusedField(null)} />
          <label htmlFor="fullname" className={`chk-input-label ${focusedField === 'fullname' || name ? 'active-label' : ''}`} style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>পুরো নাম</label>
        </div>
        <div className="chk-input-wrapper">
          <i className="ri-smartphone-line chk-input-icon"></i>
          <input type="tel" id="phone" className="chk-clean-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField(null)} />
          <label htmlFor="phone" className={`chk-input-label ${focusedField === 'phone' || phone ? 'active-label' : ''}`} style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>মোবাইল নম্বর</label>
        </div>
        <div className="chk-input-wrapper">
          <i className="ri-map-pin-2-line chk-input-icon"></i>
          <input type="text" id="address" className="chk-clean-input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onFocus={() => setFocusedField('address')}
            onBlur={() => setFocusedField(null)} />
          <label htmlFor="address" className={`chk-input-label ${focusedField === 'address' || address ? 'active-label' : ''}`} style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>সম্পূর্ণ ঠিকানা</label>
        </div>
        <div className="chk-input-wrapper">
          <i className="ri-sticky-note-line chk-input-icon"></i>
          <textarea id="note" className="chk-clean-input chk-textarea-input" 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onFocus={() => setFocusedField('note')}
            onBlur={() => setFocusedField(null)} />
          <label htmlFor="note" className={`chk-input-label ${focusedField === 'note' || note ? 'active-label' : ''}`} style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>অর্ডার নোট (Optional)</label>
        </div>

        <hr className="chk-divider" />

        {/* Order Summary */}
        <div className="chk-section-header" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>
          <i className="ri-shopping-bag-3-line"></i> অর্ডার সারসংক্ষেপ
        </div>
        
        {cartItems.length > 0 ? (
          cartItems.map((item, index) => {
            const couponApplies = validatedCoupon && (
              validatedCoupon.scope === 'all' ||
              validatedCoupon.applicableProductIds?.includes(item.id)
            )
            
            return (
              <div key={index} className="chk-product-row">
                <img src={item.img} alt={item.name} className="chk-prod-img" />
                <div className="chk-prod-info">
                  <h4>
                    {item.name} ({item.weight})
                    {couponApplies && (
                      <span style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        background: '#16a34a',
                        borderRadius: '50%',
                        marginLeft: '6px',
                        verticalAlign: 'middle'
                      }}></span>
                    )}
                  </h4>
                  <span style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>পরিমাণ: {item.quantity || 1}</span>
                </div>
                <div className="chk-prod-price">TK {item.price * (item.quantity || 1)}</div>
                {onRemoveItem && (
                  <button 
                    onClick={() => onRemoveItem(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      cursor: 'pointer',
                      padding: '4px',
                      marginLeft: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <i className="ri-delete-bin-line" style={{fontSize: '16px'}}></i>
                  </button>
                )}
              </div>
            )
          })
        ) : (
          <div className="chk-product-row" style={{justifyContent: 'center', padding: '20px', color: '#9ca3af'}}>
            <div className="chk-prod-info" style={{textAlign: 'center'}}>
              <i className="ri-shopping-cart-line" style={{fontSize: '24px', display: 'block', marginBottom: '8px'}}></i>
              <h4 style={{color: '#64748b', fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif"}}>কার্টে কোনো পণ্য নেই</h4>
              <span style={{fontSize: '12px', fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif"}}>শপ থেকে পণ্য যোগ করুন</span>
            </div>
          </div>
        )}
        
        <div className="border-t border-dashed border-gray-300 pt-3 space-y-2 text-sm">
          <div className="flex justify-between text-gray-500">
            <span style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>Subtotal</span>
            <span>TK {Math.round(subtotal)}</span>
          </div>
          
          <div className="flex justify-between text-gray-500">
            <span style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>Delivery Charge</span>
            <span>{calculatedDelivery > 0 ? `TK ${Math.round(calculatedDelivery)}` : 'FREE'}</span>
          </div>

          {validatedCoupon && discount > 0 && (
            <div className="flex justify-between text-red-500">
              <span style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>Coupon ({validatedCoupon.code})</span>
              <span>- TK {Math.round(discount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-200">
            <span className="text-base font-bold text-gray-900" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>Total Amount</span>
            <span className="text-xl font-bold text-green-700">TK {Math.round(total)}</span>
          </div>
        </div>
        
        <div className="chk-coupon-wrapper">
          <div className="chk-input-wrapper">
            <i className="ri-ticket-2-line chk-input-icon"></i>
            <input type="text" id="coupon" className="chk-clean-input"
              value={couponCode}
              onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setValidatedCoupon(null); setCouponError(null); }}
              onFocus={() => setFocusedField('coupon')}
              onBlur={() => setFocusedField(null)} />
            <label htmlFor="coupon" className={`chk-input-label ${focusedField === 'coupon' || couponCode ? 'active-label' : ''}`} style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>কুপন কোড (Optional)</label>
          </div>
          <button 
            className="chk-btn-apply" 
            onClick={handleApplyCoupon} 
            disabled={isValidatingCoupon} 
            style={{ 
              fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
              background: 'transparent',
              color: validatedCoupon ? '#16a34a' : '#9ca3af',
              border: validatedCoupon ? '2px solid #16a34a' : '1px solid #9ca3af',
              cursor: 'pointer'
            }}
          >
            {isValidatingCoupon ? '...' : 'Apply'}
          </button>
        </div>

        <hr className="chk-divider" />

        <div className="chk-section-header" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif", fontWeight: 700 }}>
          <i className="ri-secure-payment-line"></i> পেমেন্ট পদ্ধতি
        </div>
        <div className="mt-4">
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.8, fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif", fontWeight: 500 }}>
            এটি ক্যাশ অন ডেলিভারি অর্ডার। অনুগ্রহ করে পন্য হাতে পেয়ে রাইডারকে <b style={{ color: '#16a34a' }}>TK {Math.round(total)}</b> পরিশোধ করবেন।
          </p>
        </div>

        <hr className="chk-divider" />

        {/* Order Button */}
        <button 
          className="chk-btn-main chk-btn-confirm chk-btn-full" 
          onClick={handleConfirm}
          style={{ 
            fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif", 
            background: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <i className="ri-check-double-line" style={{ fontSize: '18px' }}></i> অর্ডার কনফার্ম করুন (TK {Math.round(total)})
        </button>
      </div>
    </div>
  )
}
