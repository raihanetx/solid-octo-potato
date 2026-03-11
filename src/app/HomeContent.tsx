'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ViewType } from '@/types'
import { useCartStore, useOrderStore, useShopStore } from '@/store'

// Layout Components
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import HelpCenter from '@/components/layout/HelpCenter'

// Shop Components
import Shop from '@/components/shop/Shop'
import ProductDetail from '@/components/shop/ProductDetail'
import ThankYou from '@/components/shop/ThankYou'
import CategoryProducts from '@/components/shop/CategoryProducts'

// Cart Components
import Cart from '@/components/cart/Cart'
import Checkout from '@/components/cart/Checkout'

// Orders Components
import Orders from '@/components/orders/Orders'

// Profile Components
import Profile from '@/components/profile/Profile'

// Offers Components
import Offers from '@/components/offers/Offers'

// Content Pages
import ContentPage from '@/components/content/ContentPage'

export default function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get initial values from URL - using useMemo to avoid recalculation
  const initialView = useMemo(() => {
    const page = searchParams.get('page')
    const category = searchParams.get('category')
    const order = searchParams.get('order')
    const product = searchParams.get('product')
    
    if (order) return 'thankyou'
    if (category) return 'category'
    if (product) return 'product'
    if (page && ['cart', 'checkout', 'orders', 'profile', 'offers', 'about', 'terms', 'refund', 'privacy'].includes(page)) {
      return page as ViewType
    }
    return 'shop'
  }, [searchParams])
  
  const initialCategory = useMemo(() => {
    const category = searchParams.get('category')
    return category ? decodeURIComponent(category) : ''
  }, [searchParams])
  
  const initialOrder = useMemo(() => {
    return searchParams.get('order') || ''
  }, [searchParams])
  
  const initialProduct = useMemo(() => {
    const product = searchParams.get('product')
    return product ? parseInt(product) : null
  }, [searchParams])
  
  const [view, setView] = useState<ViewType>(initialView)
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>(initialCategory)
  const [checkoutSessionId, setCheckoutSessionId] = useState<string>('')
  const [lastOrderNumber, setLastOrderNumber] = useState<string>(initialOrder)
  const [deliverySettings, setDeliverySettings] = useState<{
    insideDhaka: number
    outsideDhaka: number
    freeDeliveryMin: number
    universal: boolean
    universalCharge: number
  }>({
    insideDhaka: 60,
    outsideDhaka: 120,
    freeDeliveryMin: 500,
    universal: false,
    universalCharge: 60
  })
  
  const { items: cartItems, addItem: addToCart, removeItem, updateQuantity, clearCart } = useCartStore()
  const { orders, addOrder } = useOrderStore()
  const { setSelectedProduct } = useShopStore()

  // Set product on mount if from URL
  useEffect(() => {
    if (initialProduct) {
      setSelectedProduct(initialProduct)
    }
  }, [initialProduct, setSelectedProduct])

  // Fetch delivery settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        const data = await response.json()
        if (data.success) {
          setDeliverySettings({
            insideDhaka: data.data.inside_dhaka_delivery ?? 60,
            outsideDhaka: data.data.outside_dhaka_delivery ?? 120,
            freeDeliveryMin: data.data.free_delivery_min ?? 500,
            universal: data.data.universal_delivery ?? false,
            universalCharge: data.data.universal_delivery_charge ?? 60
          })
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
      }
    }
    fetchSettings()
  }, [])

  // Navigate and update URL - professional clean URLs
  const handleNavigate = useCallback((newView: ViewType, params?: Record<string, string>) => {
    setView(newView)
    window.scrollTo(0, 0)
    
    // Build clean URL
    if (newView === 'shop') {
      router.push('/', { scroll: false })
      return
    }
    
    const urlParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        urlParams.set(key, value)
      })
    }
    
    urlParams.set('page', newView)
    
    const queryString = urlParams.toString()
    router.push(`?${queryString}`, { scroll: false })
  }, [router])

  // Handle category click
  const handleCategoryClick = useCallback((categoryName: string) => {
    setSelectedCategoryName(categoryName)
    setView('category')
    window.scrollTo(0, 0)
    router.push(`?page=category&category=${encodeURIComponent(categoryName)}`, { scroll: false })
  }, [router])

  // Handle checkout session
  const handleCheckoutSession = useCallback((sessionId: string) => {
    setCheckoutSessionId(sessionId)
  }, [])

  // Calculate delivery charge based on address
  const calculateDeliveryCharge = useCallback((address: string, subtotal: number): number => {
    if (subtotal >= deliverySettings.freeDeliveryMin) return 0
    if (deliverySettings.universal) return deliverySettings.universalCharge
    
    const addressLower = address.toLowerCase()
    const dhakaKeywords = ['dhaka', 'dhanmondi', 'gulshan', 'uttara', 'mirpur', 'mohammadpur', 'banani', 'badda', 'tejgaon', 'motijheel']
    
    const isInsideDhaka = dhakaKeywords.some(keyword => addressLower.includes(keyword))
    
    return isInsideDhaka ? deliverySettings.insideDhaka : deliverySettings.outsideDhaka
  }, [deliverySettings])

  const calculateOfferDiscount = useCallback((item: { price: number; quantity: number; discountType?: 'pct' | 'fixed'; discountValue?: number }): { offerText: string | null; offerDiscount: number } => {
    if (!item.discountValue || item.discountValue <= 0) {
      return { offerText: null, offerDiscount: 0 }
    }
    
    const totalPrice = item.price * item.quantity
    
    if (item.discountType === 'pct') {
      const discount = Math.round(totalPrice * (item.discountValue / 100))
      return { offerText: `${item.discountValue}% OFF`, offerDiscount: discount }
    } else {
      const discount = Math.round(item.discountValue * item.quantity)
      return { offerText: `TK ${item.discountValue} OFF`, offerDiscount: Math.min(discount, totalPrice) }
    }
  }, [])

  const handleConfirmOrder = useCallback(async (customerInfo: { name: string; phone: string; address: string; note?: string }, couponCode?: string) => {
    try {
      const itemsWithOfferDiscount = cartItems.map(item => {
        const { offerText, offerDiscount } = calculateOfferDiscount(item)
        return { ...item, offerText, offerDiscount }
      })
      
      const subtotalBeforeOffer = cartItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0)
      const totalOfferDiscount = itemsWithOfferDiscount.reduce((sum, item) => sum + item.offerDiscount, 0)
      const subtotalAfterOffer = subtotalBeforeOffer - totalOfferDiscount
      
      const delivery = calculateDeliveryCharge(customerInfo.address, subtotalAfterOffer)
      
      let couponDiscount = 0
      let couponAmount = 0
      
      const total = subtotalAfterOffer - couponDiscount + delivery
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`
      
      const orderItemsData = itemsWithOfferDiscount.map(item => ({
        name: item.name,
        variant: item.weight,
        qty: item.quantity || 1,
        basePrice: item.price,
        offerText: item.offerText,
        offerDiscount: item.offerDiscount,
        productId: item.id,
      }))
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderNumber,
          orderNumber,
          customerName: customerInfo.name,
          phone: customerInfo.phone,
          address: customerInfo.address,
          note: customerInfo.note || '',
          subtotal: subtotalBeforeOffer,
          delivery,
          discount: totalOfferDiscount,
          couponAmount,
          total,
          paymentMethod: 'Cash on Delivery',
          status: 'pending',
          couponCodes: couponCode ? [couponCode.toUpperCase()] : [],
          items: orderItemsData,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        const newOrder = {
          id: orderNumber,
          customer: customerInfo.name,
          phone: customerInfo.phone,
          address: customerInfo.address,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          paymentMethod: 'Cash on Delivery',
          status: 'pending' as const,
          courierStatus: 'Processing',
          subtotal: subtotalBeforeOffer,
          delivery,
          discount: totalOfferDiscount,
          couponCodes: couponCode ? [couponCode.toUpperCase()] : [],
          couponAmount,
          total,
          canceledBy: null,
          items: orderItemsData,
        }
        
        addOrder(newOrder)
        clearCart()
        setLastOrderNumber(orderNumber)
        
        // Navigate to thank you with clean URL
        setView('thankyou')
        window.scrollTo(0, 0)
        router.push(`?page=thankyou&order=${orderNumber}`, { scroll: false })
      } else {
        alert('Failed to place order. Please try again.')
      }
    } catch (error) {
      console.error('Order error:', error)
      alert('An error occurred. Please try again.')
    }
  }, [cartItems, calculateOfferDiscount, calculateDeliveryCharge, addOrder, clearCart, router])

  const cartItemsForDisplay = cartItems.map(item => ({
    ...item,
    oldPrice: item.oldPrice || item.price,
  }))

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const showHeader = view !== 'thankyou'
  const showFooter = view !== 'thankyou'

  return (
    <div className="flex flex-col min-h-screen relative pb-16 md:pb-0">
      {showHeader && <Header view={view} setView={handleNavigate} cartCount={cartCount} />}
      <div className="flex-grow w-full">
        {view === 'shop' && <Shop setView={handleNavigate} addToCart={addToCart} onCategoryClick={handleCategoryClick} />}
        {view === 'category' && <CategoryProducts setView={handleNavigate} addToCart={addToCart} categoryName={selectedCategoryName} />}
        {view === 'product' && <ProductDetail setView={handleNavigate} addToCart={addToCart} />}
        {view === 'cart' && (
          <Cart 
            setView={handleNavigate}
            cartItems={cartItemsForDisplay}
            setCartItems={(items) => {
              clearCart()
              items.forEach(item => addToCart(item))
            }}
            onUpdateQuantity={(id, qty) => updateQuantity(id, qty)}
            onRemoveItem={(id) => removeItem(id)}
            freeDeliveryMin={deliverySettings.freeDeliveryMin}
          />
        )}
        {view === 'checkout' && (
          <Checkout 
            setView={handleNavigate}
            cartItems={cartItemsForDisplay}
            deliverySettings={deliverySettings}
            onConfirm={handleConfirmOrder}
            onCheckoutSession={handleCheckoutSession}
            onRemoveItem={(id) => removeItem(id)}
          />
        )}
        {view === 'thankyou' && <ThankYou setView={handleNavigate} orderNumber={lastOrderNumber} />}
        {view === 'orders' && <Orders orders={orders} setView={handleNavigate} />}
        {view === 'profile' && <Profile setView={handleNavigate} />}
        {view === 'offers' && <Offers setView={handleNavigate} />}
        {(view === 'about' || view === 'terms' || view === 'refund' || view === 'privacy') && (
          <ContentPage type={view} setView={handleNavigate} />
        )}
      </div>
      {showFooter && <Footer setView={handleNavigate} />}
      {showFooter && <BottomNav view={view} setView={handleNavigate} />}
      <HelpCenter />
    </div>
  )
}
