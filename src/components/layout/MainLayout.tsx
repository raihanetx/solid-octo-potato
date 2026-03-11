'use client'

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import HelpCenter from '@/components/layout/HelpCenter'
import { useCartStore } from '@/store'
import { usePathname } from 'next/navigation'

interface MainLayoutProps {
  children: React.ReactNode
  hideLayout?: boolean
}

export default function MainLayout({ children, hideLayout = false }: MainLayoutProps) {
  const { items: cartItems } = useCartStore()
  const pathname = usePathname()
  
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  
  // Don't show layout on thank-you page
  const showLayout = !hideLayout && pathname !== '/thank-you'
  const showHeader = showLayout
  const showFooter = showLayout
  const showBottomNav = showLayout
  const showHelpCenter = showLayout

  return (
    <div className="flex flex-col min-h-screen relative pb-16 md:pb-0">
      {showHeader && <Header view="shop" setView={() => {}} cartCount={cartCount} />}
      <div className="flex-grow w-full">
        {children}
      </div>
      {showFooter && <Footer setView={() => {}} />}
      {showBottomNav && <BottomNav view="shop" setView={() => {}} />}
      {showHelpCenter && <HelpCenter />}
    </div>
  )
}
