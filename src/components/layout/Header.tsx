'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ViewType } from '@/types'
import { useShopStore } from '@/store/useShopStore'
import {
  Home,
  Percent,
  ShoppingBag,
  User,
  Info,
  FileCheck,
  RotateCcw,
  Shield,
  ChevronDown,
  ChevronRight,
  Package,
  X,
  Grid3X3
} from 'lucide-react'

interface HeaderProps {
  view: ViewType
  setView: (v: ViewType) => void
  cartCount: number
}

// Simple search - only match by product NAME/TITLE
function smartSearch(products: { id: number; name: string; status: string; price: number; image: string }[], query: string) {
  if (!query.trim()) return []
  
  const searchTerm = query.toLowerCase().trim()
  
  // Score each product by name only
  const scored = products
    .filter(p => p.status === 'active')
    .map(product => {
      const productName = product.name.toLowerCase()
      let score = 0
      
      // Exact match (highest score)
      if (productName === searchTerm) {
        score = 100
      }
      // Name starts with search term
      else if (productName.startsWith(searchTerm)) {
        score = 80
      }
      // Name contains search term as a word
      else if (productName.split(/\s+/).includes(searchTerm)) {
        score = 60
      }
      // Name contains search term partially
      else if (productName.includes(searchTerm)) {
        score = 40
      }
      
      return { product, score }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5) // Show only 5 results in preview
    .map(item => item.product)
  
  return scored
}

// Search Results Component - shows matching products
function SearchResults({ query, onItemClick }: { query: string; onItemClick: () => void }) {
  const router = useRouter()
  const { products } = useShopStore()
  
  // Use smart search with memoization
  const filteredProducts = useMemo(() => {
    return smartSearch(products, query)
  }, [products, query])

  const handleProductClick = (productId: number, productName: string) => {
    const slug = productName
      .toLowerCase()
      .replace(/[^a-z0-9\u0980-\u09FF\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100)
    
    router.push(`/${slug}`)
    onItemClick()
  }

  if (filteredProducts.length === 0) {
    return null
  }

  return (
    <div className="py-2">
      <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 font-medium">
        {filteredProducts.length} products found
      </div>
      <div className="space-y-1">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            onClick={() => handleProductClick(product.id, product.name)}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <img 
              src={product.image} 
              alt={product.name}
              className="w-10 h-10 object-contain rounded bg-gray-50"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800 truncate font-bangla">
                {product.name}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {product.category}
              </div>
              <div className="text-xs text-[#16a34a] font-semibold">
                TK {product.price}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Search Results Container - only shows when there are results
function SearchResultsContainer({ query, onItemClick }: { query: string; onItemClick: () => void }) {
  const { products } = useShopStore()
  
  const filteredProducts = useMemo(() => {
    if (!query.trim()) return []
    return smartSearch(products, query)
  }, [products, query])

  if (filteredProducts.length === 0) {
    return null
  }

  return (
    <div className="border-t border-gray-100 px-3 pb-3 max-h-[60vh] overflow-y-auto">
      <SearchResults query={query} onItemClick={onItemClick} />
    </div>
  )
}

export default function Header({ view, setView, cartCount }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { settings, searchQuery, setSearchQuery, categories, setSelectedCategory } = useShopStore()
  const logoUrl = settings.logoUrl
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const [menuOpen, setMenuOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const mobileSearchRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
        setCategoriesOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // Close mobile search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
        setMobileSearchOpen(false)
      }
    }

    if (mobileSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mobileSearchOpen])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!localSearch.trim()) return
    
    // Navigate to search results page
    router.push(`/search/${encodeURIComponent(localSearch.trim())}`)
    
    // Close mobile search
    setMobileSearchOpen(false)
  }

  const handleSearchChange = (value: string) => {
    setLocalSearch(value)
    // Real-time search - update immediately for preview
    setSearchQuery(value)
  }

  const handleNavClick = (navView: ViewType, categoryName?: string) => {
    setMenuOpen(false)
    setCategoriesOpen(false)
    
    // Navigate using proper paths
    switch (navView) {
      case 'shop':
        setSearchQuery('')
        setLocalSearch('')
        setSelectedCategory(null)
        router.push('/')
        break
      case 'cart':
        router.push('/cart')
        break
      case 'checkout':
        router.push('/checkout')
        break
      case 'orders':
        router.push('/history')
        break
      case 'profile':
        router.push('/profile')
        break
      case 'offers':
        router.push('/offers')
        break
      case 'about':
      case 'terms':
      case 'refund':
      case 'privacy':
        router.push(`/?page=${navView}`)
        break
      case 'category':
        if (categoryName) {
          router.push(`/category/${encodeURIComponent(categoryName)}`)
        }
        break
    }
  }

  // Menu Panel Component
  const MenuPanel = ({ isMobile }: { isMobile: boolean }) => (
    <div 
      className={`fixed bg-white shadow-2xl z-[300] overflow-hidden flex flex-col ${
        isMobile 
          ? 'inset-y-0 right-0 w-[260px]' 
          : 'inset-y-0 right-0 w-[280px]'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-gray-100 ${isMobile ? 'px-4 py-3.5' : 'px-5 py-4'}`}>
        <h2 className={`font-semibold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
          Menu
        </h2>
        <button 
          onClick={() => setMenuOpen(false)}
          className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      
      {/* Content */}
      <div className={`flex-1 overflow-y-auto ${isMobile ? 'pb-20' : 'pb-24'}`}>
        {/* Quick Links */}
        <div className={`${isMobile ? 'px-3' : 'px-4'}`}>
          <div className={`text-[11px] font-semibold text-gray-400 uppercase tracking-wider ${isMobile ? 'pt-4 pb-2 px-1' : 'pt-5 pb-2.5 px-1'}`}>
            Quick Links
          </div>
          <div className="space-y-1">
            <MenuItem icon={<Home className="w-[18px] h-[18px]" />} label="Home" onClick={() => handleNavClick('shop')} isMobile={isMobile} />
            <MenuItem icon={<User className="w-[18px] h-[18px]" />} label="My Profile" onClick={() => handleNavClick('profile')} isMobile={isMobile} />
            <MenuItem icon={<Package className="w-[18px] h-[18px]" />} label="Order History" onClick={() => handleNavClick('orders')} isMobile={isMobile} />
            <MenuItem icon={<ShoppingBag className="w-[18px] h-[18px]" />} label="Cart" onClick={() => handleNavClick('cart')} isMobile={isMobile} />
            <MenuItem icon={<Percent className="w-[18px] h-[18px]" />} label="Offers" onClick={() => handleNavClick('offers')} isMobile={isMobile} />
          </div>
        </div>

        {/* Categories */}
        <div className={`${isMobile ? 'px-3' : 'px-4'}`}>
          <div className={`text-[11px] font-semibold text-gray-400 uppercase tracking-wider ${isMobile ? 'pt-5 pb-2 px-1' : 'pt-6 pb-2.5 px-1'}`}>
            Categories
          </div>
          <div className="space-y-1">
            {/* Categories Dropdown Toggle */}
            <button
              onClick={() => setCategoriesOpen(!categoriesOpen)}
              className={`w-full flex items-center gap-3 rounded-xl transition-all duration-150 group ${
                isMobile ? 'px-3 py-2.5' : 'px-4 py-3'
              } text-gray-700 hover:bg-gray-50 active:bg-gray-100`}
            >
              <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
                <Grid3X3 className="w-[18px] h-[18px]" />
              </span>
              <span className="flex-1 font-medium text-left text-[13px] group-hover:text-gray-900 transition-colors">
                All Categories
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${categoriesOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Category Items Dropdown */}
            {categoriesOpen && (
              <div className="space-y-0.5 mt-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleNavClick('category', category.name)}
                    className={`w-full flex items-center gap-2 rounded-lg transition-all duration-150 group ${
                      isMobile ? 'px-3 py-2' : 'px-3 py-2'
                    } text-gray-600 hover:bg-gray-50 hover:text-gray-900`}
                  >
                    <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-gray-400" />
                    <span className="text-[13px] font-medium text-left">
                      {category.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Legal */}
        <div className={`${isMobile ? 'px-3' : 'px-4'}`}>
          <div className={`text-[11px] font-semibold text-gray-400 uppercase tracking-wider ${isMobile ? 'pt-5 pb-2 px-1' : 'pt-6 pb-2.5 px-1'}`}>
            Legal
          </div>
          <div className="space-y-1">
            <MenuItem icon={<Info className="w-[18px] h-[18px]" />} label="About Us" onClick={() => handleNavClick('about')} isMobile={isMobile} />
            <MenuItem icon={<FileCheck className="w-[18px] h-[18px]" />} label="Terms & Conditions" onClick={() => handleNavClick('terms')} isMobile={isMobile} />
            <MenuItem icon={<RotateCcw className="w-[18px] h-[18px]" />} label="Return & Refund" onClick={() => handleNavClick('refund')} isMobile={isMobile} />
            <MenuItem icon={<Shield className="w-[18px] h-[18px]" />} label="Privacy Policy" onClick={() => handleNavClick('privacy')} isMobile={isMobile} />
          </div>
        </div>
      </div>
    </div>
  )

  // Menu Item Component
  const MenuItem = ({ 
    icon, 
    label, 
    onClick, 
    isMobile 
  }: { 
    icon: React.ReactNode
    label: string
    onClick: () => void
    isMobile: boolean
  }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl transition-all duration-150 group ${
        isMobile ? 'px-3 py-2.5' : 'px-4 py-3'
      } text-gray-700 hover:bg-gray-50 active:bg-gray-100`}
    >
      <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
        {icon}
      </span>
      <span className="flex-1 font-medium text-left text-[13px] group-hover:text-gray-900 transition-colors">
        {label}
      </span>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" />
    </button>
  )

  return (
    <>
      <header className="w-full bg-white border-b border-gray-200 shadow-[0_1px_4px_rgba(0,0,0,0.08)] flex items-center justify-between px-3 md:px-[2rem] h-[64px] md:h-[70px] sticky top-0 z-[200]">
        <div className="flex items-center shrink-0 w-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSearchQuery(''); setLocalSearch(''); setSelectedCategory(null); router.push('/'); }}>
            <img src={logoUrl} alt="Logo" className="h-[100px] w-[100px] md:h-[140px] md:w-[140px] object-contain" />
          </div>
        </div>

        {/* Desktop Search - Inline Search Bar */}
        <form className="hidden md:flex flex-1 justify-center mx-[1rem] max-w-2xl" onSubmit={handleSearch}>
          <div className="flex items-center border border-gray-300 rounded-full px-6 w-full bg-transparent h-10 relative transition-colors duration-200 focus-within:border-green-500">
            <input 
              type="text" 
              name="search" 
              placeholder="Search Product" 
              className="w-full outline-none bg-transparent text-base text-gray-700 placeholder-gray-400 pr-10" 
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <button type="submit" className="absolute right-5 cursor-pointer hover:text-green-600 transition-colors">
              <i className="ri-search-line text-gray-400 text-xl"></i>
            </button>
          </div>
        </form>

        {/* Desktop Navigation - All icons in one line with dividers */}
        <div className="hidden md:flex items-center justify-end shrink-0 gap-1">
          {/* Cart Icon */}
          <div className="px-2 cursor-pointer hover:text-green-600 relative transition-colors flex items-center" onClick={() => router.push('/cart')}>
            <div className="relative">
              <i className="ri-shopping-cart-line text-[22px] text-gray-600 leading-none"></i>
              {cartCount > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-600 rounded-full text-[9px] text-white flex items-center justify-center font-bold border-2 border-white">{cartCount}</span>}
            </div>
          </div>
          
          <div className="w-px h-5 bg-gray-200"></div>
          
          {/* Order Icon */}
          <div className="px-2 cursor-pointer hover:text-green-600 relative transition-colors flex items-center" onClick={() => router.push('/history')}>
            <i className="ri-file-list-3-line text-[22px] text-gray-600 leading-none"></i>
          </div>
          
          <div className="w-px h-5 bg-gray-200"></div>
          
          {/* Offers Icon */}
          <div className="px-2 cursor-pointer hover:text-green-600 relative transition-colors flex items-center" onClick={() => router.push('/offers')}>
            <i className="ri-gift-line text-[22px] text-gray-600 leading-none"></i>
          </div>
          
          <div className="w-px h-5 bg-gray-200"></div>
          
          {/* Profile Icon */}
          <div className="px-2 cursor-pointer hover:text-green-600 relative transition-colors flex items-center" onClick={() => router.push('/profile')}>
            <i className="ri-user-line text-[22px] text-gray-600 leading-none"></i>
          </div>
          
          <div className="w-px h-5 bg-gray-200"></div>
          
          {/* Hamburger Menu Button */}
          <div 
            ref={menuRef}
            className="pl-2 pr-0 cursor-pointer hover:text-green-600 transition-colors flex items-center"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <i className="ri-menu-line text-[22px] text-gray-600 leading-none"></i>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center justify-end h-10 shrink-0">
          {/* Search Icon */}
          <div 
            className="px-3 cursor-pointer hover:text-green-600 transition-colors"
            onClick={() => setMobileSearchOpen(true)}
          >
            <i className="ri-search-line text-[22px] text-gray-600 leading-none"></i>
          </div>
          
          <div className="w-px h-5 bg-gray-200"></div>
          
          {/* Cart Icon */}
          <div className="px-3 cursor-pointer hover:text-green-600 relative transition-colors" onClick={() => router.push('/cart')}>
            <i className="ri-shopping-cart-line text-[22px] text-gray-600 leading-none"></i>
            {cartCount > 0 && <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-green-600 rounded-full text-[9px] text-white flex items-center justify-center font-bold border-2 border-white">{cartCount}</span>}
          </div>
          
          <div className="w-px h-5 bg-gray-200"></div>
          
          {/* Mobile Hamburger Menu Button */}
          <div 
            ref={menuRef}
            className="px-3 cursor-pointer hover:text-green-600 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <i className="ri-menu-line text-[22px] text-gray-600 leading-none"></i>
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div 
          className="md:hidden fixed top-[64px] left-0 right-0 z-[250] bg-white shadow-lg animate-slide-down"
          ref={mobileSearchRef}
        >
          <form onSubmit={handleSearch} className="flex items-center p-2">
            <div className="flex-1 flex items-center border border-gray-300 rounded-full px-4 bg-gray-50 h-[40px] relative transition-colors duration-200 focus-within:border-green-500 focus-within:bg-white">
              <i className="ri-search-line text-gray-400 text-lg mr-2"></i>
              <input 
                type="text" 
                placeholder="Search Product..." 
                className="flex-1 outline-none bg-transparent text-sm text-gray-700 placeholder-gray-400" 
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                autoFocus
              />
              {localSearch && (
                <button 
                  type="button"
                  onClick={() => { setLocalSearch(''); setSearchQuery(''); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
          {/* Search Results Preview - only shows when there are results */}
          <SearchResultsContainer query={localSearch} onItemClick={() => setMobileSearchOpen(false)} />
        </div>
      )}

      {/* Menu Overlay & Panel */}
      {menuOpen && (
        <div className="fixed inset-0 z-[250]" ref={menuRef}>
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Panel - Desktop */}
          <div className="hidden md:block">
            <MenuPanel isMobile={false} />
          </div>
          
          {/* Panel - Mobile */}
          <div className="md:hidden">
            <MenuPanel isMobile={true} />
          </div>
        </div>
      )}
    </>
  )
}
