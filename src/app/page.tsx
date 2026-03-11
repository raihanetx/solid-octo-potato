'use client'

import { Suspense, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import Shop from '@/components/shop/Shop'
import ContentPage from '@/components/content/ContentPage'
import { useCartStore, useShopStore } from '@/store'
import { useAppRouter } from '@/hooks/useAppRouter'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { navigate } = useAppRouter()
  
  const { items: cartItems, addItem: addToCart } = useCartStore()
  const { fetchData } = useShopStore()
  
  // Fetch initial data
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  // Handle category click - navigate to category page
  const handleCategoryClick = useCallback((categoryName: string) => {
    navigate('category', { categoryName })
  }, [navigate])

  // Handle navigation
  const handleNavigate = useCallback(() => {
    navigate('shop')
  }, [navigate])
  
  // Handle content pages (about, terms, etc.)
  const page = searchParams.get('page')
  if (page && ['about', 'terms', 'refund', 'privacy'].includes(page)) {
    return (
      <MainLayout>
        <ContentPage type={page as 'about' | 'terms' | 'refund' | 'privacy'} setView={() => router.push('/')} />
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Shop 
        setView={handleNavigate} 
        addToCart={addToCart} 
        onCategoryClick={handleCategoryClick}
      />
    </MainLayout>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full h-full absolute inset-0 skeleton-shimmer" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
