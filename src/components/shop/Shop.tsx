'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CartItem, ViewType } from '@/types'
import { useShopStore } from '@/store/useShopStore'
import { ProductCardSkeleton, CategorySkeleton, HeroSkeleton, OfferCardSkeleton, SectionHeaderSkeleton, HeadlineSkeleton, SubheadlineSkeleton } from '@/components/ui/skeleton'

// Placeholder image for broken/missing images
const PLACEHOLDER_IMG = '/placeholder.svg'

// Handle image load error - show placeholder
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget
  if (target.src !== PLACEHOLDER_IMG) {
    target.src = PLACEHOLDER_IMG
  }
}

interface ShopProps {
  setView: (v: ViewType) => void
  addToCart: (item: CartItem) => void
  onCategoryClick?: (categoryName: string) => void
}

// Helper function to create URL-safe slug from product name
function createProductSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF\s-]/g, '') // Keep Bengali chars, alphanumeric, spaces, hyphens
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100) // Limit length
  return slug
}

// Simple search - only match by product NAME/TITLE
function searchProductsByName(products: { id: number; name: string; status: string }[], query: string) {
  if (!query.trim()) {
    return products.filter(p => p.status === 'active')
  }
  
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
    .map(item => item.product)
  
  return scored
}

export default function Shop({ setView, addToCart, onCategoryClick }: ShopProps) {
  const router = useRouter()
  const { categories, products, settings, isLoading, fetchData, setSelectedProduct, searchQuery, setSearchQuery } = useShopStore()
  
  // Use heroImages from settings (loaded from database)
  const heroImages = settings.heroImages

  useEffect(() => {
    fetchData()
    // Clear search query when landing on home page
    setSearchQuery('')
  }, [fetchData, setSearchQuery])

  // Filter products using smart search
  const filteredProducts = useMemo(() => {
    return searchProductsByName(products, searchQuery)
  }, [products, searchQuery])

  
  // Filter out products with price <= 0
  const validProducts = filteredProducts.filter(p => p.status === 'active' && p.price > 0)

  // Handle category click - navigate to category page
  const handleCategoryClick = (categoryName: string) => {
    if (onCategoryClick) {
      onCategoryClick(categoryName)
    }
  }

  // Handle product click - navigate to product details page with product name in URL
  const handleProductClick = async (productId: number, productName: string) => {
    await setSelectedProduct(productId)
    const slug = createProductSlug(productName)
    router.push(`/${slug}`)
  }

  // Filter products with offers for the offer cards section
  const offerProducts = products.filter(p => p.offer && p.status === 'active' && p.price > 0).slice(0, 3)

  return (
    <main className="flex-grow">
      {/* Hero Banner - Static */}
      <section className="w-full pb-4 md:pb-6">
        <div className="mx-3 mt-3 md:mx-6 md:mt-6 relative h-[180px] md:h-[300px] rounded-2xl overflow-hidden border border-gray-200">
          {isLoading ? (
            <HeroSkeleton />
          ) : (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{backgroundImage: heroImages[0] ? `url('${heroImages[0]}')` : 'none'}}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent"></div>
            </>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="py-2 md:py-4">
        <div className="container mx-auto px-4 md:px-6">
          {isLoading ? (
            <SectionHeaderSkeleton titleWidth="120px" subtitleWidth="220px" className="mb-3" />
          ) : (
            <div className="text-center mb-3 md:mb-4">
              <h2 className="text-lg md:text-2xl font-bold text-gray-900 font-bangla">ক্যাটাগরি</h2>
              <p className="text-gray-500 mt-0.5 text-xs md:text-sm font-bangla">আপনার প্রয়োজনীয় সবকিছু এখানেই পাবেন</p>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center">
              <div className="flex gap-3 md:gap-4 md:flex-wrap md:justify-center">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <CategorySkeleton key={i} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="flex gap-3 md:gap-4 overflow-x-auto md:flex-wrap md:justify-center pb-2 md:pb-0 no-scrollbar">
                {categories.filter(c => c.status === 'Active').map((cat) => (
                  <div 
                    key={cat.id} 
                    className="flex-shrink-0 flex flex-col items-center group cursor-pointer"
                    onClick={() => handleCategoryClick(cat.name)}
                  >
                    <div className="w-[60px] h-[60px] md:w-[85px] md:h-[85px] rounded-lg border flex items-center justify-center text-gray-700 transition-all duration-300 mb-1.5 overflow-hidden border-gray-200 bg-white group-hover:text-[#16a34a] group-hover:border-[#16a34a]">
                      {cat.type === 'icon' && cat.icon ? (
                        <i className={`${cat.icon} text-2xl md:text-3xl`}></i>
                      ) : cat.type === 'image' && cat.image ? (
                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" onError={handleImageError} />
                      ) : (
                        <i className="ri-folder-line text-2xl md:text-3xl"></i>
                      )}
                    </div>
                    <span className="text-[11px] md:text-xs font-medium text-gray-700">{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* OFFER CARDS SECTION - Only show if there are offer products */}
      {(isLoading || offerProducts.length > 0) && (
        <section id="offers" className="py-2 md:py-4">
          <div className="px-3 md:px-4">
            {isLoading ? (
              <SectionHeaderSkeleton titleWidth="100px" subtitleWidth="160px" className="mb-3" />
            ) : (
              <div className="mb-3 md:mb-4 text-center">
                <h2 className="text-lg md:text-2xl font-bold text-gray-900 font-bangla">অফার কার্ড</h2>
                <p className="text-gray-500 mt-0.5 text-xs md:text-sm font-bangla">আপনার জন্য এক্সক্লুসিভ ডিল</p>
              </div>
            )}
            <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-2">
              {isLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <OfferCardSkeleton key={i} />
                  ))}
                </>
              ) : (
                <>
                  {offerProducts.map((product) => {
                    // Format discount text
                    const discountValue = product.discountValue ?? 0
                    const discountType = product.discountType ?? 'pct'
                    const discountText = discountValue > 0
                      ? (discountType === 'pct' ? `${discountValue}% ছাড়` : `TK ${discountValue} ছাড়`)
                      : product.discount
                    
                    // Calculate original price for display
                    let originalPrice = product.oldPrice
                    if (!originalPrice || originalPrice <= product.price) {
                      if (discountValue > 0) {
                        if (discountType === 'pct') {
                          originalPrice = Math.round(product.price * 100 / (100 - discountValue))
                        } else {
                          originalPrice = product.price + discountValue
                        }
                      }
                    }
                    
                    return (
                      <div 
                        key={product.id} 
                        className="bg-white rounded-lg flex items-center overflow-hidden border border-gray-200 transition-all shrink-0 w-[220px] md:w-[280px] h-[90px] md:h-[110px] cursor-pointer hover:border-[#16a34a]" 
                        onClick={() => handleProductClick(product.id, product.name)}
                      >
                        <div className="w-[100px] md:w-[130px] h-full flex justify-center items-center p-1.5 md:p-2">
                          <img src={product.image} alt={product.name} className="w-full h-full object-contain scale-110" onError={handleImageError} />
                        </div>
                        <div className="w-[1px] h-[65%] bg-gray-200"></div>
                        <div className="flex-1 py-2 px-3 flex flex-col justify-center">
                          <div className="text-[10px] md:text-xs text-[#ff4757] font-bold mb-0.5 md:mb-1 font-bangla">{discountText}</div>
                          <h2 className="text-[12px] md:text-sm font-semibold text-gray-800 mb-0.5 md:mb-1 truncate font-bangla">{product.name}</h2>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] md:text-sm font-bold text-[#16a34a]">TK {product.price}</span>
                            {originalPrice && originalPrice > product.price && (
                              <span className="text-[9px] md:text-[10px] line-through text-gray-400">TK {originalPrice}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ALL Products Grid */}
      <section id="products-section" className="pb-8 pt-2 md:pt-4">
        <div className="container mx-auto px-4 md:px-6">
          {/* Section Header */}
          {isLoading ? (
            <SectionHeaderSkeleton titleWidth="100px" subtitleWidth="180px" className="mb-3 md:mb-4" />
          ) : (
            <div className="text-center mb-3 md:mb-4">
              <h2 className="text-lg md:text-2xl font-bold text-gray-900 font-bangla">সকল পণ্য</h2>
              <p className="text-gray-500 mt-0.5 text-xs md:text-sm font-bangla">আমাদের সকল পণ্য এখানে পাবেন</p>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5 justify-items-start">
              {filteredProducts.map((item) => {
                // Calculate discount percentage from discountValue
                const discountValue = item.discountValue ?? 0
                const discountType = item.discountType ?? 'pct'
                
                // Calculate original price for display
                let originalPrice = item.oldPrice
                if (!originalPrice || originalPrice <= item.price) {
                  if (discountValue > 0) {
                    if (discountType === 'pct') {
                      originalPrice = Math.round(item.price * 100 / (100 - discountValue))
                    } else {
                      originalPrice = item.price + discountValue
                    }
                  }
                }
                
                const hasDiscount = discountValue > 0 || (originalPrice && originalPrice > item.price)
                
                return (
                  <div 
                    key={item.id} 
                    onClick={() => handleProductClick(item.id, item.name)} 
                    className="bg-white p-3 relative cursor-pointer transition-all duration-300 flex flex-col w-full min-h-[230px] md:min-h-[260px] border border-gray-200 rounded-xl hover:border-[#16a34a]"
                  >
                    {hasDiscount && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded z-10">
                        -{discountValue > 0 
                          ? (discountType === 'pct' ? `${discountValue}%` : `TK ${discountValue}`)
                          : item.discount}
                      </span>
                    )}
                    <div className="flex-grow flex items-center justify-center py-2">
                      <div className="w-full h-[130px] md:h-[150px] flex items-center justify-center">
                        <img src={item.image} alt={item.name} className="w-full h-full object-contain" loading="lazy" onError={handleImageError}/>
                      </div>
                    </div>
                    <div className="flex flex-col mt-auto">
                      <h3 className="text-sm font-medium text-gray-800 truncate font-bangla">{item.name}</h3>
                      <div className="flex items-center gap-2 mb-2 mt-1">
                        <span className="text-sm font-semibold text-[#16a34a]">TK {item.price}</span>
                        {originalPrice && originalPrice > item.price && (
                          <span className="text-xs text-gray-400 line-through">TK {originalPrice}</span>
                        )}
                      </div>
                      <button 
                        className="w-full text-[11px] md:text-xs font-semibold py-1.5 md:py-2 flex items-center justify-center gap-1 bg-[#16a34a] text-white rounded-full border-none cursor-pointer transition-transform duration-200 active:scale-95 font-bangla" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          addToCart({
                            id: item.id,
                            name: item.name,
                            price: item.price,
                            oldPrice: originalPrice || item.price,
                            img: item.image,
                            weight: '1 KG',
                            category: item.category,
                            categoryId: item.categoryId,
                            offer: item.offer,
                            discountType: item.discountType as 'pct' | 'fixed' | undefined,
                            discountValue: item.discountValue,
                          });
                        }}
                      >
                        <i className="ri-shopping-cart-line text-sm md:text-xs"></i>
                        কার্টে যোগ করুন
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 font-bangla">
                {searchQuery 
                  ? `"${searchQuery}" পণ্য পাওয়া যায়নি` 
                  : 'কোনো পণ্য নেই'}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
