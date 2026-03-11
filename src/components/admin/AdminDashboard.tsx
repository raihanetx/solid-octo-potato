'use client'

import React, { useState, useEffect } from 'react'
import { AdminProvider, useAdmin } from '@/components/admin/context/AdminContext'

// View Components
import OverviewView from '@/components/admin/views/OverviewView'
import CategoriesView from '@/components/admin/views/CategoriesView'
import ProductsView from '@/components/admin/views/ProductsView'
import OrdersView from '@/components/admin/views/OrdersView'
import CouponsView from '@/components/admin/views/CouponsView'
import AbandonedView from '@/components/admin/views/AbandonedView'
import CustomersView from '@/components/admin/views/CustomersView'
import InventoryView from '@/components/admin/views/InventoryView'
import ReviewsView from '@/components/admin/views/ReviewsView'
import SettingsView from '@/components/admin/views/SettingsView'
import PageContentView from '@/components/admin/views/PageContentView'

// Types
import type { ViewType } from '@/types'

// Main Dashboard Content Component (uses context)
function AdminDashboardContent({ setView }: { setView: (v: string) => void }) {
  const {
    dashView,
    setDashView,
    navItems,
    configItems,
    editingCategory,
    setEditingCategory,
    editingProduct,
    setEditingProduct,
    editingCoupon,
    setEditingCoupon,
    openCategoryEdit,
    openProductEdit,
    openCouponEdit,
    showToast,
    toastMsg,
    isModalOpen,
    setIsModalOpen,
    newProduct,
    setNewProduct,
    handleAddProductInventory,
    getPageTitle,
    getPageDesc,
    settings,
  } = useAdmin()

  // Mobile navigation state
  const [navOpen, setNavOpen] = useState(false)

  // Prevent body scroll when nav is open
  useEffect(() => {
    if (navOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [navOpen])

  const clearEditingStates = () => {
    setEditingCategory(null)
    setEditingProduct(null)
    setEditingCoupon(null)
  }

  // Handle navigation click
  const handleNavClick = (viewId: string) => {
    setDashView(viewId)
    clearEditingStates()
    setNavOpen(false) // Close nav after clicking
  }

  // Get title considering editing states
  const title = editingCategory ? 'Edit Category' 
    : editingProduct ? 'Edit Product' 
    : editingCoupon ? 'Edit Coupon' 
    : getPageTitle(dashView)

  // Get description considering editing states
  const desc = editingCategory ? 'Modify category details and settings'
    : editingProduct ? 'Update product information and variants'
    : editingCoupon ? 'Adjust coupon rules and availability'
    : getPageDesc(dashView)

  return (
    <div className="admin-layout" style={{fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif"}}>
      {/* Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#0f172a',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
          zIndex: 9999,
          animation: 'slideIn 0.2s ease-out',
          fontSize: '14px',
          fontWeight: 500,
        }}>
          {toastMsg}
        </div>
      )}

      {/* Header with Hamburger */}
      <header className="admin-header-bar">
        <div className="admin-header-left">
          <button 
            className="hamburger-btn" 
            onClick={() => setNavOpen(!navOpen)}
            aria-label="Toggle navigation"
          >
            <i className={navOpen ? 'ri-close-line' : 'ri-menu-line'}></i>
          </button>
          <div className="admin-header-brand">
            <img src={settings.logoUrl || "https://i.postimg.cc/4xZk3k2j/IMG-20260226-120143.png"} alt="Logo" style={{width: '32px', height: '32px', objectFit: 'contain'}} />
            <span>{settings.websiteName || 'EcoMart'}</span>
          </div>
        </div>
        <div className="admin-header-right">
          {/* Action buttons for specific views */}
          {(dashView === 'categories' && !editingCategory) && (
            <button className="btn-admin-minimal btn-admin-primary" onClick={() => openCategoryEdit()}>+ Add Category</button>
          )}
          {(dashView === 'coupons' && !editingCoupon) && (
            <button className="btn-admin-minimal btn-admin-primary" onClick={() => openCouponEdit()}>+ Add Coupon</button>
          )}
        </div>
      </header>

      {/* Navigation Overlay */}
      <div 
        className={`nav-overlay ${navOpen ? 'visible' : ''}`} 
        onClick={() => setNavOpen(false)}
      ></div>

      {/* Slide-out Navigation */}
      <nav className={`admin-nav-slider ${navOpen ? 'open' : ''}`}>
        <div className="nav-slider-header">
          <img src={settings.logoUrl || "https://i.postimg.cc/4xZk3k2j/IMG-20260226-120143.png"} alt="Logo" style={{width: '28px', height: '28px', objectFit: 'contain'}} />
          <span>{settings.websiteName || 'EcoMart'}</span>
        </div>

        <div className="nav-slider-section">
          <div className="nav-section-label">Main Menu</div>
          {navItems.map(item => (
            <div 
              key={item.id}
              className={`nav-slider-item ${dashView === item.id && !editingCategory && !editingProduct && !editingCoupon ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="nav-slider-divider"></div>

        <div className="nav-slider-section">
          <div className="nav-section-label">Configuration</div>
          {configItems.map(item => (
            <div 
              key={item.id}
              className={`nav-slider-item ${dashView === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="nav-slider-footer">
          <button className="nav-add-btn" onClick={() => { setIsModalOpen(true); setNavOpen(false); }}>
            <i className="ri-add-line"></i>
            <span>Add Inventory</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="admin-main-content">
        {/* Page Header with Back button for editing states */}
        <div className="admin-page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
          <div>
            {editingCategory || editingProduct || editingCoupon ? (
              <h1 style={{display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer'}} onClick={clearEditingStates}>
                <i className="ri-arrow-left-line" style={{fontSize: '20px'}}></i>
                {title}
              </h1>
            ) : (
              <h1>{title}</h1>
            )}
            <p>{desc}</p>
          </div>
        </div>

        {/* View Content */}
        {dashView === 'overview' && !editingCategory && !editingProduct && (
          <OverviewView setDashView={setDashView} />
        )}
        
        {dashView === 'categories' && (
          <CategoriesView />
        )}
        
        {dashView === 'products' && (
          <ProductsView />
        )}
        
        {dashView === 'orders' && (
          <OrdersView />
        )}
        
        {dashView === 'coupons' && (
          <CouponsView />
        )}
        
        {dashView === 'abandoned' && (
          <AbandonedView />
        )}
        
        {dashView === 'customers' && (
          <CustomersView />
        )}
        
        {dashView === 'inventory' && (
          <InventoryView />
        )}
        
        {dashView === 'reviews' && (
          <ReviewsView />
        )}
        
        {dashView === 'content' && (
          <PageContentView />
        )}
        
        {dashView === 'settings' && (
          <SettingsView />
        )}
      </main>

      {/* Add Inventory Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            maxWidth: '90vw',
          }}>
            <h3 style={{marginBottom: '16px', fontSize: '18px', fontWeight: 600}}>Add New Product</h3>
            <form onSubmit={handleAddProductInventory}>
              <div style={{marginBottom: '16px'}}>
                <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500}}>Product Name</label>
                <input 
                  type="text" 
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                  placeholder="Enter product name"
                />
              </div>
              <div style={{marginBottom: '24px'}}>
                <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500}}>Stock Quantity</label>
                <input 
                  type="number" 
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                  placeholder="Enter stock quantity"
                />
              </div>
              <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#16a34a',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Back to Shop Button */}
      <button
        onClick={() => setView('shop')}
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          background: '#16a34a',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          zIndex: 100,
        }}
      >
        <i className="ri-arrow-left-line"></i>
        Back to Shop
      </button>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// Main Export with Provider wrapper
export default function AdminDashboard({ setView }: { setView: (v: ViewType) => void }) {
  return (
    <AdminProvider setView={setView}>
      <AdminDashboardContent setView={setView} />
    </AdminProvider>
  )
}
