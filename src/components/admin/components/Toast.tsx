'use client'

import React from 'react'

interface ToastProps {
  show: boolean
  message: string
}

const Toast: React.FC<ToastProps> = ({ show, message }) => {
  return (
    <div className={`cat-toast ${show ? 'show' : ''}`}>
      <i className="ri-check-double-line" style={{color: '#16a34a', fontSize: '16px'}}></i>
      <span>{message}</span>
    </div>
  )
}

export default Toast
