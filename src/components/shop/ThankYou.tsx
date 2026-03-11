'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ViewType } from '@/types'

interface ThankYouProps {
  setView: (v: ViewType) => void
  orderNumber?: string
}

export default function ThankYou({ setView }: ThankYouProps) {
  const router = useRouter()
  
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleContinueShopping = () => {
    router.push('/')
  }

  const handleViewOrders = () => {
    router.push('/history')
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto bg-green-500 rounded-full flex items-center justify-center">
            <i className="ri-check-line text-3xl text-white"></i>
          </div>
        </div>

        {/* Thank You Message */}
        <h1 
          className="text-2xl font-bold text-gray-900 mb-2"
          style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}
        >
          ধন্যবাদ!
        </h1>
        <p 
          className="text-gray-500 mb-6"
          style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}
        >
          আপনার অর্ডার সফলভাবে প্লেস হয়েছে
        </p>

        {/* Info Box */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <i className="ri-phone-line text-gray-400 text-lg mt-0.5"></i>
            <p 
              className="text-sm text-gray-600 leading-relaxed"
              style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}
            >
              আপনার অর্ডার ভেরিফাই করতে কল করা হতে পারে। অনুগ্রহ করে আপনার ফোন সক্রিয় রাখুন এবং কল ধরার চেষ্টা করুন।
            </p>
          </div>
        </div>

        {/* Contact */}
        <div 
          className="flex items-center justify-center gap-4 mb-8 text-sm"
          style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}
        >
          <a 
            href="tel:+8801866225512" 
            className="flex items-center gap-1.5 text-green-600 font-medium hover:text-green-700"
          >
            <i className="ri-phone-line"></i> 01866225512
          </a>
          <span className="text-gray-300">|</span>
          <a 
            href="https://wa.me/8801866225512" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-green-600 font-medium hover:text-green-700"
          >
            <i className="ri-whatsapp-line"></i> WhatsApp
          </a>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleContinueShopping}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}
          >
            হোম
          </button>
          <button
            onClick={handleViewOrders}
            className="flex-1 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors"
            style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}
          >
            অর্ডার দেখুন
          </button>
        </div>
      </div>
    </div>
  )
}
