import { create } from 'zustand'

// Types
export interface ShopCategory {
  id: string
  name: string
  type: string
  icon: string | null
  image: string | null
  items: number
  status: string
}

export interface ShopProduct {
  id: number
  name: string
  category: string
  categoryId: string | null
  image: string
  price: number
  oldPrice: number | null
  discount: string
  discountType: string | null
  discountValue: number | null
  offer: boolean
  status: string
  shortDesc: string | null
  longDesc: string | null
}

export interface ProductVariant {
  id: number
  name: string
  stock: number
  initialStock: number
  price: number
  discount: string
  discountType: string | null
  discountValue: number | null
  productId: number
}

export interface ProductImage {
  id: number
  url: string
  sortOrder: number
  productId: number
}

export interface ProductFaq {
  id: number
  question: string
  answer: string
  sortOrder: number
  productId: number
}

export interface RelatedProduct {
  id: number
  relatedProductId: number
  sortOrder: number
  productId: number
  product: ShopProduct | null
}

export interface ProductReview {
  id: number
  initials: string
  name: string
  rating: number
  text: string
  date: string
  productId: number | null
  customerId: number | null
}

// Settings interface for frontend
export interface ShopSettings {
  websiteName: string
  slogan: string
  logoUrl: string
  faviconUrl: string
  heroImages: string[]
  whatsappNumber: string
  phoneNumber: string
  facebookUrl: string
  messengerUsername: string
  insideDhakaDelivery: number
  outsideDhakaDelivery: number
  freeDeliveryMin: number
  universalDelivery: boolean
  universalDeliveryCharge: number
}

// Default settings (used before loading from database)
const defaultSettings: ShopSettings = {
  websiteName: 'EcoMart',
  slogan: 'Your trusted marketplace for fresh organic products and groceries.',
  logoUrl: 'https://i.postimg.cc/4xZk3k2j/IMG-20260226-120143.png',
  faviconUrl: '',
  heroImages: [
    'https://i.postimg.cc/zfN3dyGV/Whisk-785426d5b3a55ac9f384abb1c653efdedr.jpg',
    'https://i.postimg.cc/QCFMB50H/Whisk-186f0227f2203638e6f4806f9343b15cdr.jpg',
    'https://i.postimg.cc/0jzN6mcM/Whisk-21cf4f35609655e91844ef8ae3c7f4c9dr.jpg',
  ],
  whatsappNumber: '',
  phoneNumber: '',
  facebookUrl: '',
  messengerUsername: '',
  insideDhakaDelivery: 60,
  outsideDhakaDelivery: 120,
  freeDeliveryMin: 500,
  universalDelivery: false,
  universalDeliveryCharge: 60,
}

interface ShopState {
  categories: ShopCategory[]
  products: ShopProduct[]
  settings: ShopSettings
  selectedProductId: number | null
  selectedProductVariants: ProductVariant[]
  selectedProductImages: ProductImage[]
  selectedProductFaqs: ProductFaq[]
  selectedProductRelated: RelatedProduct[]
  selectedProductReviews: ProductReview[]
  isLoading: boolean
  settingsLoaded: boolean
  error: string | null
  searchQuery: string
  selectedCategory: string | null

  // Actions
  fetchData: () => Promise<void>
  fetchCategories: () => Promise<void>
  fetchProducts: () => Promise<void>
  fetchSettings: () => Promise<void>
  setSelectedProduct: (productId: number | null) => Promise<void>
  fetchProductDetails: (productId: number) => Promise<void>
  addReview: (productId: number, review: { name: string; rating: number; text: string }) => Promise<boolean>
  setSearchQuery: (query: string) => void
  setSelectedCategory: (category: string | null) => void
}

export const useShopStore = create<ShopState>((set, get) => ({
  categories: [],
  products: [],
  settings: defaultSettings,
  selectedProductId: null,
  selectedProductVariants: [],
  selectedProductImages: [],
  selectedProductFaqs: [],
  selectedProductRelated: [],
  selectedProductReviews: [],
  isLoading: true, // Start with loading true so skeleton shows immediately
  settingsLoaded: false,
  error: null,
  searchQuery: '',
  selectedCategory: null,

  fetchData: async () => {
    set({ isLoading: true, error: null })
    try {
      const [categoriesRes, productsRes, settingsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/products'),
        fetch('/api/settings')
      ])
      
      const categoriesData = await categoriesRes.json()
      const productsData = await productsRes.json()
      const settingsData = await settingsRes.json()
      
      if (categoriesData.success) {
        set({ categories: categoriesData.data })
      }
      
      if (productsData.success) {
        set({ products: productsData.data })
      }
      
      if (settingsData.success && settingsData.data) {
        // Parse heroImages from JSON string if needed
        let heroImagesArr = defaultSettings.heroImages
        if (settingsData.data.heroImages) {
          try {
            const parsed = typeof settingsData.data.heroImages === 'string' 
              ? JSON.parse(settingsData.data.heroImages) 
              : settingsData.data.heroImages
            heroImagesArr = Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultSettings.heroImages
          } catch {
            heroImagesArr = defaultSettings.heroImages
          }
        }
        
        set({ 
          settings: {
            websiteName: settingsData.data.websiteName || defaultSettings.websiteName,
            slogan: settingsData.data.slogan || defaultSettings.slogan,
            logoUrl: settingsData.data.logoUrl || defaultSettings.logoUrl,
            faviconUrl: settingsData.data.faviconUrl || '',
            heroImages: heroImagesArr,
            whatsappNumber: settingsData.data.whatsappNumber || '',
            phoneNumber: settingsData.data.phoneNumber || '',
            facebookUrl: settingsData.data.facebookUrl || '',
            messengerUsername: settingsData.data.messengerUsername || '',
            insideDhakaDelivery: settingsData.data.insideDhakaDelivery ?? 60,
            outsideDhakaDelivery: settingsData.data.outsideDhakaDelivery ?? 120,
            freeDeliveryMin: settingsData.data.freeDeliveryMin ?? 500,
            universalDelivery: settingsData.data.universalDelivery ?? false,
            universalDeliveryCharge: settingsData.data.universalDeliveryCharge ?? 60,
          },
          settingsLoaded: true
        })
      }
      
      set({ isLoading: false })
    } catch (error) {
      console.error('Error fetching shop data:', error)
      set({ error: 'Failed to load data', isLoading: false })
    }
  },

  fetchCategories: async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      if (data.success) {
        set({ categories: data.data })
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  },

  fetchProducts: async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      if (data.success) {
        set({ products: data.data })
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  },

  fetchSettings: async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()
      if (data.success && data.data) {
        // Parse heroImages from JSON string if needed
        let heroImagesArr = defaultSettings.heroImages
        if (data.data.heroImages) {
          try {
            const parsed = typeof data.data.heroImages === 'string' 
              ? JSON.parse(data.data.heroImages) 
              : data.data.heroImages
            heroImagesArr = Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultSettings.heroImages
          } catch {
            heroImagesArr = defaultSettings.heroImages
          }
        }
        
        set({ 
          settings: {
            websiteName: data.data.websiteName || defaultSettings.websiteName,
            slogan: data.data.slogan || defaultSettings.slogan,
            logoUrl: data.data.logoUrl || defaultSettings.logoUrl,
            faviconUrl: data.data.faviconUrl || '',
            heroImages: heroImagesArr,
            whatsappNumber: data.data.whatsappNumber || '',
            phoneNumber: data.data.phoneNumber || '',
            facebookUrl: data.data.facebookUrl || '',
            messengerUsername: data.data.messengerUsername || '',
            insideDhakaDelivery: data.data.insideDhakaDelivery ?? 60,
            outsideDhakaDelivery: data.data.outsideDhakaDelivery ?? 120,
            freeDeliveryMin: data.data.freeDeliveryMin ?? 500,
            universalDelivery: data.data.universalDelivery ?? false,
            universalDeliveryCharge: data.data.universalDeliveryCharge ?? 60,
          },
          settingsLoaded: true
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  },

  setSelectedProduct: async (productId: number | null) => {
    set({ selectedProductId: productId })
    if (productId) {
      await get().fetchProductDetails(productId)
    } else {
      set({ 
        selectedProductVariants: [],
        selectedProductImages: [],
        selectedProductFaqs: [],
        selectedProductRelated: [],
        selectedProductReviews: []
      })
    }
  },

  fetchProductDetails: async (productId: number) => {
    try {
      // Fetch all product details in parallel
      const [variantsRes, imagesRes, faqsRes, relatedRes, reviewsRes] = await Promise.all([
        fetch(`/api/variants?productId=${productId}`),
        fetch(`/api/product-images?productId=${productId}`),
        fetch(`/api/product-faqs?productId=${productId}`),
        fetch(`/api/related-products?productId=${productId}`),
        fetch(`/api/reviews?productId=${productId}`)
      ])
      
      const variantsData = await variantsRes.json()
      const imagesData = await imagesRes.json()
      const faqsData = await faqsRes.json()
      const relatedData = await relatedRes.json()
      const reviewsData = await reviewsRes.json()
      
      set({
        selectedProductVariants: variantsData.success ? variantsData.data : [],
        selectedProductImages: imagesData.success ? imagesData.data : [],
        selectedProductFaqs: faqsData.success ? faqsData.data : [],
        selectedProductRelated: relatedData.success ? relatedData.data : [],
        selectedProductReviews: reviewsData.success ? reviewsData.data : []
      })
    } catch (error) {
      console.error('Error fetching product details:', error)
      set({
        selectedProductVariants: [],
        selectedProductImages: [],
        selectedProductFaqs: [],
        selectedProductRelated: [],
        selectedProductReviews: []
      })
    }
  },

  addReview: async (productId: number, review: { name: string; rating: number; text: string }) => {
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...review,
          productId
        })
      })
      const data = await response.json()
      if (data.success) {
        // Add to local state
        set(state => ({
          selectedProductReviews: [data.data, ...state.selectedProductReviews]
        }))
        return true
      }
      return false
    } catch (error) {
      console.error('Error adding review:', error)
      return false
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  setSelectedCategory: (category: string | null) => {
    set({ selectedCategory: category })
  }
}))
