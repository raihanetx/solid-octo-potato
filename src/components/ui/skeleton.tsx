import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton-shimmer rounded-md", className)}
      {...props}
    />
  )
}

// Headline Skeleton - for section titles
function HeadlineSkeleton({ 
  className, 
  width = '150px',
  height = '24px',
  centered = false
}: { 
  className?: string
  width?: string
  height?: string
  centered?: boolean
}) {
  return (
    <span 
      className={cn("skeleton-headline", centered && "mx-auto", className)}
      style={{ width, height }}
    />
  )
}

// Subheadline Skeleton - for section subtitles
function SubheadlineSkeleton({ 
  className,
  width = '200px',
  centered = false
}: { 
  className?: string
  width?: string
  centered?: boolean
}) {
  return (
    <span 
      className={cn("skeleton-text mt-2", centered && "mx-auto block", className)}
      style={{ width, height: '14px' }}
    />
  )
}

// Text Skeleton - for inline text
function TextSkeleton({ 
  className, 
  lines = 1,
  width 
}: { 
  className?: string
  lines?: number
  width?: string | number
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <span 
          key={i} 
          className="skeleton-text block"
          style={{ 
            width: width 
              ? (typeof width === 'number' ? `${width}px` : width)
              : (i === lines - 1 ? '60%' : '100%'),
            height: '14px'
          }}
        />
      ))}
    </div>
  )
}

// Product Card Skeleton
function ProductCardSkeleton() {
  return (
    <div className="bg-white p-3 border border-gray-200 rounded-xl">
      <Skeleton className="h-[130px] md:h-[150px] w-full rounded-lg mb-3" />
      <span className="skeleton-text block w-3/4" style={{ height: '16px' }} />
      <span className="skeleton-text block w-1/2 mt-2" style={{ height: '12px' }} />
      <Skeleton className="h-9 w-full rounded-lg mt-3" />
    </div>
  )
}

// Category Skeleton
function CategorySkeleton() {
  return (
    <div className="flex-shrink-0 flex flex-col items-center">
      <div className="skeleton-rounded w-[60px] h-[60px] md:w-[85px] md:h-[85px]" />
      <span className="skeleton-text mt-2" style={{ width: '48px', height: '12px' }} />
    </div>
  )
}

// Hero Slider Skeleton
function HeroSkeleton() {
  return (
    <Skeleton className="h-full w-full rounded-2xl" />
  )
}

// Offer Card Skeleton
function OfferCardSkeleton() {
  return (
    <div className="bg-white rounded-xl flex items-center overflow-hidden border border-gray-200 shrink-0 w-[220px] md:w-[280px] h-[90px] md:h-[110px]">
      <Skeleton className="w-[90px] md:w-[110px] h-full rounded-none" />
      <div className="flex-1 py-2 px-3 flex flex-col justify-center gap-2">
        <span className="skeleton-text" style={{ width: '60px', height: '12px' }} />
        <span className="skeleton-text" style={{ width: '80%', height: '14px' }} />
        <span className="skeleton-text" style={{ width: '70px', height: '14px' }} />
      </div>
    </div>
  )
}

// Product Detail Skeleton
function ProductDetailSkeleton() {
  return (
    <div className="bg-white min-h-screen p-4 md:p-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
        {/* Image Section */}
        <div className="flex flex-col">
          <Skeleton className="w-full h-[280px] md:h-[350px] rounded-2xl" />
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>
        
        {/* Content Section */}
        <div className="flex flex-col">
          {/* Title */}
          <span className="skeleton-text mb-3" style={{ width: '80%', height: '28px' }} />
          
          {/* Price Row */}
          <div className="flex items-center gap-3 mb-5">
            <span className="skeleton-text" style={{ width: '100px', height: '24px' }} />
            <span className="skeleton-text" style={{ width: '70px', height: '18px' }} />
          </div>
          
          {/* Description */}
          <div className="space-y-2 mb-6">
            <span className="skeleton-text block" style={{ height: '14px' }} />
            <span className="skeleton-text block" style={{ height: '14px' }} />
            <span className="skeleton-text block" style={{ width: '70%', height: '14px' }} />
          </div>
          
          {/* Variants */}
          <div className="mb-4">
            <span className="skeleton-text mb-2 block" style={{ width: '100px', height: '14px' }} />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-20 rounded-lg" />
              <Skeleton className="h-10 w-20 rounded-lg" />
              <Skeleton className="h-10 w-20 rounded-lg" />
            </div>
          </div>
          
          {/* Buttons */}
          <Skeleton className="h-12 w-full rounded-xl mt-4" />
          <Skeleton className="h-14 w-full rounded-xl mt-3" />
        </div>
      </div>
    </div>
  )
}

// Cart Item Skeleton
function CartItemSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
      <Skeleton className="w-16 h-16 rounded-lg" />
      <div className="flex-1 space-y-2">
        <span className="skeleton-text block" style={{ width: '80%', height: '14px' }} />
        <span className="skeleton-text block" style={{ width: '50%', height: '12px' }} />
      </div>
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  )
}

// Section Header Skeleton - for titles with subtitles
function SectionHeaderSkeleton({ 
  titleWidth = '150px',
  subtitleWidth = '200px',
  className
}: { 
  titleWidth?: string
  subtitleWidth?: string
  className?: string
}) {
  return (
    <div className={cn("text-center mb-4 md:mb-6", className)}>
      <HeadlineSkeleton width={titleWidth} height="24px" centered />
      <SubheadlineSkeleton width={subtitleWidth} centered />
    </div>
  )
}

export { 
  Skeleton, 
  HeadlineSkeleton,
  SubheadlineSkeleton,
  TextSkeleton,
  ProductCardSkeleton, 
  CategorySkeleton, 
  HeroSkeleton, 
  OfferCardSkeleton,
  ProductDetailSkeleton,
  CartItemSkeleton,
  SectionHeaderSkeleton
}
