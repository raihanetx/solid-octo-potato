import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem } from '@/types'

interface CartItemWithQty extends CartItem {
  quantity: number
}

interface CartState {
  items: CartItemWithQty[]
  addItem: (item: CartItem) => void
  removeItem: (id: number) => void
  updateQuantity: (id: number, qty: number) => void
  clearCart: () => void
  getSubtotal: () => number
  getTax: () => number
  getTotal: () => number
}

// Debounce map for analytics tracking
const analyticsDebounce = new Map<number, NodeJS.Timeout>()
const ANALYTICS_DEBOUNCE_MS = 2000 // Only track once per item per 2 seconds

// Track cart event to analytics API (with debouncing to prevent spam)
const trackCartEvent = async (productId: number, action: 'add' | 'remove') => {
  // Skip if recently tracked (debounce)
  if (analyticsDebounce.has(productId)) {
    return
  }
  
  // Mark as being tracked
  const timeout = setTimeout(() => {
    analyticsDebounce.delete(productId)
  }, ANALYTICS_DEBOUNCE_MS)
  analyticsDebounce.set(productId, timeout)
  
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: `cart-${action}`, productId }),
    }).catch(() => {
      // Silently fail analytics
    })
  } catch (e) {
    // Silently fail analytics
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item: CartItem) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex((i) => i.id === item.id)
          
          if (existingItemIndex >= 0) {
            const updatedItems = [...state.items]
            const existingItem = updatedItems[existingItemIndex]
            updatedItems[existingItemIndex] = {
              ...existingItem,
              quantity: existingItem.quantity + 1
            }
            return { items: updatedItems }
          }
          
          return { items: [...state.items, { ...item, quantity: 1 }] }
        })
        
        // Track cart addition
        trackCartEvent(item.id, 'add')
      },

      removeItem: (id: number) => {
        // Track cart removal before removing
        trackCartEvent(id, 'remove')
        
        set((state) => ({
          items: state.items.filter((item) => item.id !== id)
        }))
      },

      updateQuantity: (id: number, qty: number) => {
        set((state) => {
          if (qty <= 0) {
            // Track removal when quantity goes to 0
            trackCartEvent(id, 'remove')
            return { items: state.items.filter((item) => item.id !== id) }
          }
          
          return {
            items: state.items.map((item) => {
              if (item.id === id) {
                return { ...item, quantity: qty }
              }
              return item
            })
          }
        })
      },

      clearCart: () => {
        set({ items: [] })
      },

      getSubtotal: () => {
        const state = get()
        return state.items.reduce((sum, item) => {
          return sum + item.price * item.quantity
        }, 0)
      },

      getTax: () => {
        return Math.round(get().getSubtotal() * 0.05)
      },

      getTotal: () => {
        return get().getSubtotal() + get().getTax()
      }
    }),
    {
      name: 'krishi-bitan-cart', // localStorage key
    }
  )
)

// Helper functions for computed values
export const getCartSubtotal = (items: CartItemWithQty[]): number => {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

export const getCartTax = (items: CartItemWithQty[]): number => {
  return Math.round(getCartSubtotal(items) * 0.05)
}

export const getCartTotal = (items: CartItemWithQty[]): number => {
  return getCartSubtotal(items) + getCartTax(items)
}
