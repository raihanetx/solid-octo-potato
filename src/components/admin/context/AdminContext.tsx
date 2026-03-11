'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { 
  Category, Product, InventoryItem, Alert, AdminReview, 
  Order, Coupon, CouponProduct, CouponCategory,
  AbandonedCheckout, CustomerProfile, Settings
} from '@/types'

// Navigation items
const adminNavItems = [
  { id: 'overview', label: 'Overview', icon: 'ri-dashboard-line' },
  { id: 'orders', label: 'Orders', icon: 'ri-shopping-bag-line' },
  { id: 'products', label: 'Products', icon: 'ri-box-3-line' },
  { id: 'inventory', label: 'Inventory', icon: 'ri-archive-line' },
  { id: 'categories', label: 'Categories', icon: 'ri-folder-line' },
  { id: 'coupons', label: 'Coupons', icon: 'ri-ticket-2-line' },
  { id: 'reviews', label: 'Reviews', icon: 'ri-star-line' },
  { id: 'abandoned', label: 'Abandoned', icon: 'ri-alert-line' },
  { id: 'customers', label: 'Customers', icon: 'ri-user-line' },
  { id: 'content', label: 'Page Content', icon: 'ri-file-text-line' },
]

// Only Settings in config - credentials removed (now in .env)
const adminConfigItems = [
  { id: 'settings', label: 'Settings', icon: 'ri-settings-3-line' },
]

// Helper functions
const getAdminPageTitle = (dashView: string): string => {
  const titles: Record<string, string> = {
    overview: 'Store Overview',
    orders: 'Order Management',
    products: 'Product Management',
    inventory: 'Inventory Management',
    categories: 'Category Management',
    coupons: 'Coupon Management',
    reviews: 'Review Management',
    abandoned: 'Abandoned Checkouts',
    customers: 'Customer History',
    content: 'Page Content',
    settings: 'System Settings',
  }
  return titles[dashView] || 'Dashboard'
}

const getAdminPageDesc = (dashView: string): string => {
  const descs: Record<string, string> = {
    overview: 'Performance metrics for today',
    orders: 'Detailed overview of all incoming requests',
    products: 'Manage your store items and inventory',
    inventory: 'Track and manage product stock levels',
    categories: 'Organize your product categories',
    coupons: 'Manage discount coupons for your store',
    reviews: 'Manage customer reviews and feedback',
    abandoned: 'Customers who visited but didn\'t complete checkout',
    customers: 'Overview of customer orders and spending',
    content: 'Manage your store pages and policies',
    settings: 'Configure your store preferences and policies',
  }
  return descs[dashView] || ''
}

// Types for the context
interface AdminContextType {
  // Navigation
  dashView: string
  setDashView: (view: string) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  navItems: typeof adminNavItems
  configItems: typeof adminConfigItems
  getPageTitle: (view: string) => string
  getPageDesc: (view: string) => string
  
  // Toast
  showToast: boolean
  setShowToast: (show: boolean) => void
  toastMsg: string
  setToastMsg: (msg: string) => void
  showToastMsg: (msg: string) => void
  
  // Loading state
  isLoading: boolean
  
  // Inventory
  inventory: InventoryItem[]
  setInventory: (inventory: InventoryItem[]) => void
  expandedInventory: number | null
  setExpandedInventory: (id: number | null) => void
  editingInventoryItem: InventoryItem | null
  setEditingInventoryItem: (item: InventoryItem | null) => void
  refetchInventory: () => void
  
  // Alerts
  alerts: Alert[]
  
  // Reviews
  adminReviews: AdminReview[]
  setAdminReviews: (reviews: AdminReview[]) => void
  
  // Categories
  categories: Category[]
  setCategories: (categories: Category[]) => void
  editingCategory: Category | null
  setEditingCategory: (category: Category | null) => void
  refetchCategories: () => void
  
  // Products
  products: Product[]
  setProducts: (products: Product[]) => void
  editingProduct: Product | null
  setEditingProduct: (product: Product | null) => void
  prodVarieties: {id: number; name: string; price: string; stock: string; discount: string; discountType: 'pct' | 'fixed'; discountValue: string}[]
  setProdVarieties: (varieties: {id: number; name: string; price: string; stock: string; discount: string; discountType: 'pct' | 'fixed'; discountValue: string}[]) => void
  prodFaqs: {id: number; question: string; answer: string}[]
  setProdFaqs: (faqs: {id: number; question: string; answer: string}[]) => void
  prodImages: string[]
  setProdImages: (images: string[]) => void
  prodRelated: number[]
  setProdRelated: (ids: number[]) => void
  allRelatedOptions: {id: number; name: string; category: string; price: number; image: string}[]
  refetchProducts: () => void
  
  // Orders
  orders: Order[]
  setOrders: (orders: Order[]) => void
  currentOrderFilter: 'all' | 'pending' | 'approved' | 'canceled' | 'cancel_customer' | 'cancel_admin' | 'courier_review' | 'courier_shipping' | 'courier_delivered' | 'courier_cancel'
  setCurrentOrderFilter: (filter: 'all' | 'pending' | 'approved' | 'canceled' | 'cancel_customer' | 'cancel_admin' | 'courier_review' | 'courier_shipping' | 'courier_delivered' | 'courier_cancel') => void
  selectedOrder: Order | null
  setSelectedOrder: (order: Order | null) => void
  refetchOrders: () => void
  
  // Coupons
  coupons: Coupon[]
  setCoupons: (coupons: Coupon[]) => void
  editingCoupon: Coupon | null
  setEditingCoupon: (coupon: Coupon | null) => void
  couponForm: {
    code: string
    type: 'pct' | 'fixed'
    value: string
    expiry: string
    scope: 'all' | 'products' | 'categories'
  }
  setCouponForm: (form: {
    code: string
    type: 'pct' | 'fixed'
    value: string
    expiry: string
    scope: 'all' | 'products' | 'categories'
  }) => void
  pickedProducts: number[]
  setPickedProducts: (ids: number[]) => void
  pickedCategories: string[]
  setPickedCategories: (categories: string[]) => void
  couponProducts: CouponProduct[]
  couponCategories: CouponCategory[]
  refetchCoupons: () => void
  
  // Abandoned
  abandonedCheckouts: AbandonedCheckout[]
  expandedAbandoned: number | null
  setExpandedAbandoned: (id: number | null) => void
  
  // Customers
  customerProfiles: CustomerProfile[]
  expandedCustomer: number | null
  setExpandedCustomer: (id: number | null) => void
  
  // Settings
  settings: Settings
  setSettings: (settings: Settings) => void
  refetchSettings: () => void
  
  // Modal
  isModalOpen: boolean
  setIsModalOpen: (open: boolean) => void
  newProduct: { name: string; stock: string }
  setNewProduct: (product: { name: string; stock: string }) => void
  handleAddProductInventory: (e: React.FormEvent) => void
  
  // Edit functions
  openCategoryEdit: (cat: Category | null) => void
  openProductEdit: (prod: Product | null) => void
  openCouponEdit: (coupon: Coupon | null) => void
  
  // Set view for navigation
  setView: (v: string) => void
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children, setView }: { children: ReactNode; setView: (v: string) => void }) {
  // Navigation
  const [dashView, setDashView] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true)
  
  // Toast
  const [showToast, setShowToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  
  const showToastMsg = (msg: string) => {
    setToastMsg(msg)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2200)
  }
  
  // Inventory - start empty, can be populated from API
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [expandedInventory, setExpandedInventory] = useState<number | null>(null)
  const [editingInventoryItem, setEditingInventoryItem] = useState<InventoryItem | null>(null)
  
  // Alerts - computed from inventory
  const alerts: Alert[] = []
  
  // Reviews - start empty
  const [adminReviews, setAdminReviews] = useState<AdminReview[]>([])
  
  // Categories - fetched from API
  const [categories, setCategories] = useState<Category[]>([])
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  
  // Products - fetched from API
  const [products, setProducts] = useState<Product[]>([])
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [prodVarieties, setProdVarieties] = useState<{id: number; name: string; price: string; stock: string; discount: string; discountType: 'pct' | 'fixed'; discountValue: string}[]>([])
  const [prodFaqs, setProdFaqs] = useState<{id: number; question: string; answer: string}[]>([])
  const [prodImages, setProdImages] = useState<string[]>([])
  const [prodRelated, setProdRelated] = useState<number[]>([])
  
  // All related options - populated from products
  const allRelatedOptions = products.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: parseFloat(p.price.replace('TK', '')) || 0,
    image: p.image
  }))
  
  // Orders - fetched from API
  const [orders, setOrders] = useState<Order[]>([])
  const [currentOrderFilter, setCurrentOrderFilter] = useState<'all' | 'pending' | 'approved' | 'canceled' | 'cancel_customer' | 'cancel_admin' | 'courier_review' | 'courier_shipping' | 'courier_delivered' | 'courier_cancel'>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  
  // Coupon products/categories - populated from products
  const couponProducts: CouponProduct[] = products.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    img: p.image
  }))
  
  const couponCategories: CouponCategory[] = categories.map(c => ({
    name: c.name,
    color: '#16a34a'
  }))
  
  // Coupons - fetched from API
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [couponForm, setCouponForm] = useState({
    code: '',
    type: 'pct' as 'pct' | 'fixed',
    value: '',
    expiry: '',
    scope: 'all' as 'all' | 'products' | 'categories',
  })
  const [pickedProducts, setPickedProducts] = useState<number[]>([])
  const [pickedCategories, setPickedCategories] = useState<string[]>([])
  
  // Abandoned - start empty
  const [abandonedCheckouts, setAbandonedCheckouts] = useState<AbandonedCheckout[]>([])
  const [expandedAbandoned, setExpandedAbandoned] = useState<number | null>(null)
  
  // Customers - start empty
  const [customerProfiles, setCustomerProfiles] = useState<CustomerProfile[]>([])
  const [expandedCustomer, setExpandedCustomer] = useState<number | null>(null)
  
  // Settings - defaults with all fields
  const [settings, setSettings] = useState<Settings>({
    storeName: 'EcoMart',
    storeEmail: 'support@ecomart.com',
    storePhone: '+880 1234-567890',
    storeAddress: 'Dhaka, Bangladesh',
    currency: 'TK',
    deliveryCharge: 60,
    freeDeliveryMin: 500,
    universalDelivery: false,
    universalDeliveryCharge: 60,
    // All optional fields initialized
    websiteName: 'EcoMart',
    slogan: '',
    logoUrl: '',
    faviconUrl: '',
    heroImages: [],
    insideDhakaDelivery: 60,
    outsideDhakaDelivery: 120,
    whatsappNumber: '',
    phoneNumber: '',
    facebookUrl: '',
    messengerUsername: '',
    aboutUs: '',
    termsConditions: '',
    refundPolicy: '',
    privacyPolicy: '',
    offerTitle: 'Offers',
    offerSlogan: 'Exclusive deals just for you',
    courierEnabled: false,
    courierApiKey: '',
    courierSecretKey: '',
  })
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', stock: '' })
  
  // Handle add product to inventory
  const handleAddProductInventory = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProduct.name || !newProduct.stock) return
    const qty = parseInt(newProduct.stock)
    const newItem: InventoryItem = {
      id: Date.now(),
      name: newProduct.name,
      category: 'General',
      image: 'https://via.placeholder.com/80',
      variants: [{ name: 'Default', stock: qty, initialStock: qty }],
      lastEdited: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
    setInventory(prev => [newItem, ...prev])
    setNewProduct({ name: '', stock: '' })
    setIsModalOpen(false)
    showToastMsg('Product added to inventory!')
  }
  
  // Category edit function
  const openCategoryEdit = (cat: Category | null = null) => {
    if (cat) {
      setEditingCategory({ ...cat })
    } else {
      setEditingCategory({
        id: 'CAT-' + Date.now().toString().slice(-6),
        name: '',
        type: 'icon',
        icon: '',
        image: '',
        items: 0,
        created: 'Just now',
        status: 'Active'
      })
    }
  }
  
  // Product edit function
  const openProductEdit = (prod: Product | null = null) => {
    if (prod) {
      setEditingProduct({ ...prod, shortDesc: '', longDesc: '', offerSwitch: prod.offer })
    } else {
      setEditingProduct({
        id: Date.now(),
        name: '',
        category: '',
        image: 'https://via.placeholder.com/80',
        variants: '0 variants',
        price: 'TK0',
        discount: '0%',
        offer: false,
        status: 'active',
        shortDesc: '',
        longDesc: '',
        offerSwitch: false
      })
    }
    setProdVarieties([])
    setProdFaqs([])
    setProdImages([])
    setProdRelated([])
  }
  
  // Coupon edit function
  const openCouponEdit = (coupon: Coupon | null = null) => {
    if (coupon && coupon.id) {
      setCouponForm({
        code: coupon.code,
        type: coupon.type,
        value: coupon.value.toString(),
        expiry: coupon.expiry,
        scope: coupon.scope,
      })
      setPickedProducts(coupon.selectedProducts || [])
      setPickedCategories(coupon.selectedCategories || [])
      setEditingCoupon(coupon)
    } else {
      setCouponForm({ code: '', type: 'pct', value: '', expiry: '', scope: 'all' })
      setPickedProducts([])
      setPickedCategories([])
      setEditingCoupon({ id: '', code: '', type: 'pct', value: 0, scope: 'all', expiry: '' })
    }
  }
  
  // Fetch functions
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      if (data.success) {
        setCategories(data.data.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          type: cat.type || 'icon',
          icon: cat.icon || '',
          image: cat.image || '',
          items: cat.items || 0,
          created: cat.created_at ? new Date(cat.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Just now',
          status: cat.status || 'Active'
        })))
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }
  
  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      if (data.success) {
        setProducts(data.data.map((prod: any) => ({
          id: prod.id,
          name: prod.name,
          category: prod.category,
          image: prod.image,
          variants: '1 variant',
          price: `TK${prod.price}`,
          discount: prod.discount || '0%',
          offer: prod.offer === 1 || prod.offer === true,
          status: prod.status || 'active',
          shortDesc: prod.shortDesc || '',
          longDesc: prod.longDesc || ''
        })))
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }
  
  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      const data = await response.json()
      if (data.success) {
        const mappedOrders = data.data.map((ord: any) => ({
          id: ord.id,
          customer: ord.customerName || ord.customer_name,
          phone: ord.phone,
          address: ord.address,
          note: ord.note || '',
          date: ord.date,
          time: ord.time,
          paymentMethod: ord.paymentMethod || ord.payment_method,
          status: ord.status,
          courierStatus: ord.courierStatus || ord.courier_status || '',
          consignmentId: ord.consignmentId || ord.consignment_id,
          trackingCode: ord.trackingCode || ord.tracking_code,
          courierDeliveredAt: ord.courierDeliveredAt || ord.courier_delivered_at,
          subtotal: ord.subtotal,
          delivery: ord.delivery,
          discount: ord.discount || 0,
          couponCodes: ord.couponCodes ? JSON.parse(ord.couponCodes) : (ord.coupon_codes ? JSON.parse(ord.coupon_codes) : []),
          couponAmount: ord.couponAmount ?? ord.coupon_amount ?? 0,
          total: ord.total,
          canceledBy: ord.canceledBy || ord.canceled_by,
          items: ord.items || [],
          createdAt: ord.createdAt || ord.created_at
        }))
        setOrders(mappedOrders)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }
  
  const fetchCoupons = async () => {
    try {
      const response = await fetch('/api/coupons')
      const data = await response.json()
      if (data.success) {
        setCoupons(data.data.map((coup: any) => ({
          id: coup.id,
          code: coup.code,
          type: coup.type,
          value: coup.value,
          scope: coup.scope,
          expiry: coup.expiry || '',
          selectedProducts: coup.selected_products ? JSON.parse(coup.selected_products) : [],
          selectedCategories: coup.selected_categories ? JSON.parse(coup.selected_categories) : []
        })))
      }
    } catch (error) {
      console.error('Error fetching coupons:', error)
    }
  }
  
  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      const data = await response.json()
      if (data.success) {
        const customersWithOrders = await Promise.all(
          data.data.map(async (cust: any) => {
            let orders = []
            try {
              const ordersRes = await fetch(`/api/orders?customerId=${cust.id}`)
              const ordersData = await ordersRes.json()
              if (ordersData.success && Array.isArray(ordersData.data)) {
                orders = ordersData.data.map((ord: any, idx: number) => ({
                  date: ord.date || '',
                  time: ord.time || '',
                  timeAgo: ord.time || '',
                  visitCount: idx + 1,
                  total: parseFloat(String(ord.total || 0)),
                  products: Array.isArray(ord.items) ? ord.items.map((item: any) => ({
                    name: item.name || '',
                    variants: [{
                      label: item.variant || null,
                      qty: parseInt(String(item.qty || 1))
                    }]
                  })) : []
                }))
              }
            } catch (e) {
              console.error('Error fetching orders for customer:', cust.id, e)
            }
            return {
              id: cust.id,
              name: cust.name || 'Unknown',
              phone: cust.phone || '',
              address: cust.address || '',
              totalOrders: parseInt(String(cust.totalOrders || 0)),
              totalSpent: parseFloat(String(cust.totalSpent || 0)),
              orders
            }
          })
        )
        setCustomerProfiles(customersWithOrders)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }
  
  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()
      if (data.success) {
        const d = data.data
        setSettings({
          storeName: d.websiteName || 'EcoMart',
          storeEmail: 'support@ecomart.com',
          storePhone: d.phoneNumber || '+880 1234-567890',
          storeAddress: 'Dhaka, Bangladesh',
          currency: 'TK',
          deliveryCharge: d.insideDhakaDelivery || 60,
          freeDeliveryMin: d.freeDeliveryMin || 500,
          universalDelivery: d.universalDelivery || false,
          universalDeliveryCharge: d.universalDeliveryCharge || 60,
          websiteName: d.websiteName || 'EcoMart',
          slogan: d.slogan || '',
          logoUrl: d.logoUrl || '',
          faviconUrl: d.faviconUrl || '',
          heroImages: d.heroImages || '[]',
          insideDhakaDelivery: d.insideDhakaDelivery || 60,
          outsideDhakaDelivery: d.outsideDhakaDelivery || 120,
          whatsappNumber: d.whatsappNumber || '',
          phoneNumber: d.phoneNumber || '',
          facebookUrl: d.facebookUrl || '',
          messengerUsername: d.messengerUsername || '',
          aboutUs: d.aboutUs || '',
          termsConditions: d.termsConditions || '',
          refundPolicy: d.refundPolicy || '',
          privacyPolicy: d.privacyPolicy || '',
          offerTitle: d.offerTitle || 'Offers',
          offerSlogan: d.offerSlogan || 'Exclusive deals just for you',
          courierEnabled: d.courierEnabled || false,
          courierApiKey: d.courierApiKey || '',
          courierSecretKey: d.courierSecretKey || '',
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }
  
  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/inventory')
      const data = await response.json()
      if (data.success && data.data) {
        setInventory(data.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          image: item.image,
          variants: item.variants.map((v: any) => ({
            id: v.id,
            name: v.name,
            label: v.name,
            stock: v.stock,
            initialStock: v.initialStock,
          })),
          lastEdited: item.lastEdited,
        })))
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
    }
  }
  
  const fetchReviews = async () => {
    try {
      const response = await fetch('/api/reviews')
      const data = await response.json()
      if (data.success && data.data) {
        setAdminReviews(data.data.map((review: any) => ({
          id: review.id,
          customerName: review.name,
          rating: review.rating,
          text: review.text,
          date: review.date,
          time: '',
          product: 'Product',
          productCategory: '',
        })))
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    }
  }

  const fetchAbandoned = async () => {
    try {
      const response = await fetch('/api/abandoned')
      const data = await response.json()
      if (data.success && data.data) {
        setAbandonedCheckouts(data.data)
      }
    } catch (error) {
      console.error('Error fetching abandoned checkouts:', error)
    }
  }
  
  // Fetch all data on mount
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchCategories(),
        fetchProducts(),
        fetchOrders(),
        fetchCoupons(),
        fetchCustomers(),
        fetchSettings(),
        fetchInventory(),
        fetchReviews(),
        fetchAbandoned(),
      ])
      setIsLoading(false)
    }
    fetchData()
  }, [])
  
  const value: AdminContextType = {
    // Navigation
    dashView,
    setDashView,
    sidebarCollapsed,
    setSidebarCollapsed,
    navItems: adminNavItems,
    configItems: adminConfigItems,
    getPageTitle: getAdminPageTitle,
    getPageDesc: getAdminPageDesc,
    
    // Loading
    isLoading,
    
    // Toast
    showToast,
    setShowToast,
    toastMsg,
    setToastMsg,
    showToastMsg,
    
    // Inventory
    inventory,
    setInventory,
    expandedInventory,
    setExpandedInventory,
    editingInventoryItem,
    setEditingInventoryItem,
    refetchInventory: fetchInventory,
    
    // Alerts
    alerts,
    
    // Reviews
    adminReviews,
    setAdminReviews,
    
    // Categories
    categories,
    setCategories,
    editingCategory,
    setEditingCategory,
    refetchCategories: fetchCategories,
    
    // Products
    products,
    setProducts,
    editingProduct,
    setEditingProduct,
    prodVarieties,
    setProdVarieties,
    prodFaqs,
    setProdFaqs,
    prodImages,
    setProdImages,
    prodRelated,
    setProdRelated,
    allRelatedOptions,
    refetchProducts: fetchProducts,
    
    // Orders
    orders,
    setOrders,
    currentOrderFilter,
    setCurrentOrderFilter,
    selectedOrder,
    setSelectedOrder,
    refetchOrders: fetchOrders,
    
    // Coupons
    coupons,
    setCoupons,
    editingCoupon,
    setEditingCoupon,
    couponForm,
    setCouponForm,
    pickedProducts,
    setPickedProducts,
    pickedCategories,
    setPickedCategories,
    couponProducts,
    couponCategories,
    refetchCoupons: fetchCoupons,
    
    // Abandoned
    abandonedCheckouts,
    expandedAbandoned,
    setExpandedAbandoned,
    
    // Customers
    customerProfiles,
    expandedCustomer,
    setExpandedCustomer,
    
    // Settings
    settings,
    setSettings,
    refetchSettings: fetchSettings,
    
    // Modal
    isModalOpen,
    setIsModalOpen,
    newProduct,
    setNewProduct,
    handleAddProductInventory,
    
    // Edit functions
    openCategoryEdit,
    openProductEdit,
    openCouponEdit,
    
    // Navigation
    setView,
  }
  
  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
