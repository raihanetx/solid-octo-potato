'use client'

import { useState } from 'react'
import { ViewType } from '@/types'

interface HelpCenterProps {
  setView: (v: ViewType) => void
  orderNumber?: string
}

export default function HelpCenter() {
  const [isOpen, setIsOpen] = useState(false)

  const handleCall = () => {
    window.location.href = 'tel:+8801866225512'
    setIsOpen(false)
  }

  const handleWhatsApp = () => {
    window.open('https://wa.me/8801866225512', '_blank')
    setIsOpen(false)
  }

  const handleMessenger = () => {
    window.open('https://m.me/yourpage', '_blank')
    setIsOpen(false)
  }

  return (
    <div className="fixed bottom-[68px] md:bottom-5 right-4 md:right-5 z-[150] flex flex-col items-end">
      {/* Contact Options - Shows when open with staggered animation */}
      {isOpen && (
        <div className="flex flex-col gap-1.5 mb-1.5">
          {/* Call */}
          <button
            onClick={handleCall}
            className="w-10 h-10 md:w-11 md:h-11 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-all animate-pop-in flex items-center justify-center"
            style={{ animationDelay: '0ms' }}
            title="Call Us"
          >
            <i className="ri-phone-fill text-base md:text-lg"></i>
          </button>
          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="w-10 h-10 md:w-11 md:h-11 bg-[#25D366] text-white rounded-full shadow-lg hover:bg-[#128C7E] transition-all animate-pop-in flex items-center justify-center"
            style={{ animationDelay: '80ms' }}
            title="WhatsApp"
          >
            <i className="ri-whatsapp-fill text-base md:text-lg"></i>
          </button>
          {/* Messenger */}
          <button
            onClick={handleMessenger}
            className="w-10 h-10 md:w-11 md:h-11 bg-[#0084FF] text-white rounded-full shadow-lg hover:bg-[#0066CC] transition-all animate-pop-in flex items-center justify-center"
            style={{ animationDelay: '160ms' }}
            title="Messenger"
          >
            <i className="ri-messenger-fill text-base md:text-lg"></i>
          </button>
        </div>
      )}

      {/* Main Help Center Button - Larger on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 md:w-11 md:h-11 bg-green-600 text-white rounded-full flex flex-col items-center justify-center shadow-lg hover:bg-green-700 transition-all duration-300 ${isOpen ? 'rotate-45' : ''}`}
      >
        <i className={`ri-${isOpen ? 'close' : 'customer-service-2'}-fill text-base md:text-lg`}></i>
      </button>
      
      {/* Contact Us Text */}
      {!isOpen && (
        <span 
          className="text-[9px] md:text-[9px] font-semibold text-green-600 mt-0.5 cursor-pointer hover:text-green-700"
          onClick={() => setIsOpen(true)}
        >
          Contact Us
        </span>
      )}
    </div>
  )
}
