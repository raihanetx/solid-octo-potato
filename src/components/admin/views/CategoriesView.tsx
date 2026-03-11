'use client'

import React, { useRef, useState } from 'react'
import { useAdmin } from '@/components/admin/context/AdminContext'
import type { Category } from '@/types'

export function CategoriesView() {
  const {
    categories,
    editingCategory,
    setEditingCategory,
    showToastMsg,
    refetchCategories
  } = useAdmin()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const openCategoryEdit = (cat: Category | null = null) => {
    if (cat) {
      setEditingCategory({ ...cat, type: cat.type || 'icon' })
    } else {
      setEditingCategory({
        id: 'CAT-' + Date.now().toString().slice(-6),
        name: '',
        type: 'icon',
        icon: '',
        image: '',
        items: 0,
        created: 'Just now',
        status: 'Active'
      })
    }
  }

  const handleSaveCategory = async () => {
    if (!editingCategory?.name) {
      showToastMsg('Please enter a category name')
      return
    }

    setIsSaving(true)
    
    try {
      const exists = categories.find(c => c.id === editingCategory.id)
      
      if (exists) {
        // Update existing category
        const response = await fetch('/api/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingCategory.id,
            name: editingCategory.name,
            type: editingCategory.type,
            icon: editingCategory.icon,
            image: editingCategory.image,
            items: editingCategory.items,
            status: editingCategory.status
          })
        })
        
        if (response.ok) {
          showToastMsg('Category updated successfully!')
          refetchCategories()
          setEditingCategory(null)
        } else {
          showToastMsg('Failed to update category')
        }
      } else {
        // Create new category
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingCategory.id,
            name: editingCategory.name,
            type: editingCategory.type,
            icon: editingCategory.icon,
            image: editingCategory.image,
            items: editingCategory.items,
            status: editingCategory.status
          })
        })
        
        if (response.ok) {
          showToastMsg('Category created successfully!')
          refetchCategories()
          setEditingCategory(null)
        } else {
          showToastMsg('Failed to create category')
        }
      }
    } catch (error) {
      console.error('Error saving category:', error)
      showToastMsg('Error saving category')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return
    
    try {
      const response = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        showToastMsg('Category deleted successfully!')
        refetchCategories()
      } else {
        showToastMsg('Failed to delete category')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      showToastMsg('Error deleting category')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIsUploading(true)
      try {
        // Upload file via /api/upload
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'category')
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        
        const result = await response.json()
        
        if (result.success && result.url) {
          setEditingCategory({ ...editingCategory!, image: result.url })
          showToastMsg('Image uploaded successfully!')
        } else {
          showToastMsg(result.error || 'Failed to upload image')
        }
      } catch (error) {
        console.error('Error uploading image:', error)
        showToastMsg('Failed to upload image')
      } finally {
        setIsUploading(false)
      }
    }
  }

  // ADD/EDIT CATEGORY PAGE
  if (editingCategory) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        minHeight: 'calc(100vh - 200px)'
      }}>
        {/* Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '600px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Card Header */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#111827',
              margin: 0
            }}>
              {categories.find(c => c.id === editingCategory.id) ? 'Edit Category' : 'Add New Category'}
            </h3>
          </div>
          
          {/* Card Body */}
          <div style={{ padding: '1.5rem' }}>
            {/* Category Type */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 500,
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
                Category Type
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="catType" 
                    checked={editingCategory.type === 'icon'}
                    onChange={() => setEditingCategory({ ...editingCategory, type: 'icon' })}
                    style={{ accentColor: '#16a34a', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>Icon</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="catType" 
                    checked={editingCategory.type === 'image'}
                    onChange={() => setEditingCategory({ ...editingCategory, type: 'image' })}
                    style={{ accentColor: '#16a34a', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>Image</span>
                </label>
              </div>
            </div>

            {/* Category Name */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 500,
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
                Category Name
              </label>
              <input 
                type="text" 
                placeholder="category name"
                value={editingCategory.name}
                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#111827',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#16a34a'
                  e.target.style.boxShadow = '0 0 0 3px rgba(22, 163, 74, 0.15)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Icon Input */}
            {editingCategory.type === 'icon' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  marginBottom: '0.5rem',
                  color: '#374151'
                }}>
                  Icon Code (Remix Icon)
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'stretch' }}>
                  <input 
                    type="text" 
                    placeholder="ri-leaf-line"
                    value={editingCategory.icon || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      color: '#111827',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#16a34a'
                      e.target.style.boxShadow = '0 0 0 3px rgba(22, 163, 74, 0.15)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                  {/* Icon Preview Box */}
                  <div style={{
                    width: '48px',
                    minHeight: '48px',
                    background: editingCategory.icon ? '#f0fdf4' : '#f9fafb',
                    border: `2px solid ${editingCategory.icon ? '#16a34a' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s ease'
                  }}>
                    {editingCategory.icon ? (
                      <i 
                        className={editingCategory.icon} 
                        style={{ fontSize: '1.5rem', color: '#16a34a' }}
                      ></i>
                    ) : (
                      <i 
                        className="ri-image-line" 
                        style={{ fontSize: '1.25rem', color: '#9ca3af' }}
                      ></i>
                    )}
                  </div>
                </div>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginTop: '0.25rem',
                  marginBlockStart: '0.25rem',
                  marginBlockEnd: 0
                }}>
                  Use Remix Icon codes. Example: ri-leaf-line, ri-shopping-basket-line
                </p>
              </div>
            )}

            {/* Image Upload */}
            {editingCategory.type === 'image' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  marginBottom: '0.5rem',
                  color: '#374151'
                }}>
                  Category Image
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <div 
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${editingCategory.image ? '#16a34a' : '#d1d5db'}`,
                    borderRadius: '12px',
                    padding: editingCategory.image ? '1.5rem' : '2rem',
                    textAlign: 'center',
                    cursor: isUploading ? 'wait' : 'pointer',
                    transition: 'all 0.2s ease',
                    background: editingCategory.image ? '#f0fdf4' : '#f9fafb',
                    opacity: isUploading ? 0.7 : 1
                  }}
                >
                  {isUploading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <i className="ri-loader-4-line" style={{ fontSize: '2rem', color: '#16a34a', animation: 'spin 1s linear infinite' }}></i>
                      <p style={{ color: '#16a34a', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>
                        Uploading...
                      </p>
                    </div>
                  ) : editingCategory.image ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <img 
                        src={editingCategory.image} 
                        alt="Preview" 
                        style={{ 
                          width: '80px', 
                          height: '80px', 
                          objectFit: 'cover', 
                          borderRadius: '8px',
                          border: '2px solid #16a34a'
                        }} 
                      />
                      <p style={{ color: '#16a34a', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>
                        Click to change image
                      </p>
                    </div>
                  ) : (
                    <>
                      <i className="ri-upload-cloud-2-line" style={{ fontSize: '2rem', color: '#16a34a', marginBottom: '0.75rem', display: 'block' }}></i>
                      <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                        Click or drag to upload image
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
              <button 
                onClick={handleSaveCategory}
                disabled={isSaving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  border: 'none',
                  fontFamily: 'inherit',
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)',
                  opacity: isSaving ? 0.7 : 1
                }}
              >
                {isSaving ? 'Saving...' : 'Save Category'}
              </button>
              <button 
                onClick={() => setEditingCategory(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '1px solid #d1d5db',
                  fontFamily: 'inherit',
                  background: '#ffffff',
                  color: '#374151'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // CATEGORIES LIST PAGE
  return (
    <div className="p-4 md:p-8 bg-white min-h-[calc(100vh-80px)]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1c2333]">Category Management</h1>
          <p className="text-[#8a96a8] text-sm mt-1">Manage product categories</p>
        </div>
        <button
          onClick={() => openCategoryEdit()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16a34a] text-white rounded-[5px] text-[13px] font-semibold hover:bg-[#15803d] transition-colors"
        >
          <i className="ri-add-line text-base"></i>
          Add Category
        </button>
      </div>

      {/* Table */}
      <div className="flex flex-col gap-2">
        {/* Header Row - Darker background */}
        <div className="grid grid-cols-6 bg-[#374151] rounded-[5px]">
          <div className="px-4 py-3 border-r border-[#4b5563] flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-white">Category</div>
          <div className="px-4 py-3 border-r border-[#4b5563] flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-white">Source</div>
          <div className="px-4 py-3 border-r border-[#4b5563] flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-white">Products</div>
          <div className="px-4 py-3 border-r border-[#4b5563] flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-white">Created</div>
          <div className="px-4 py-3 border-r border-[#4b5563] flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-white">Status</div>
          <div className="px-4 py-3 flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-white">Manage</div>
        </div>

        {/* Data Rows */}
        {categories.map((cat) => (
          <div key={cat.id} className="grid grid-cols-6 bg-white rounded-[5px] border border-[#d1d5db] overflow-hidden hover:border-[#9ca3af] transition-colors">
            {/* Category */}
            <div className="px-4 py-3.5 border-r border-[#d1d5db] flex items-center justify-center gap-2">
              <div style={{
                width: '32px',
                height: '32px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: cat.type === 'image' ? 'hidden' : 'visible',
                color: '#16a34a',
                flexShrink: 0
              }}>
                {cat.type === 'icon' ? (
                  <i className={cat.icon}></i>
                ) : (
                  <img src={cat.image} style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '6px' }} alt={cat.name} />
                )}
              </div>
              <span className="text-[13px] font-medium text-[#1c2333] truncate">{cat.name}</span>
            </div>
            
            {/* Source */}
            <div className="px-4 py-3.5 border-r border-[#d1d5db] flex items-center justify-center">
              <span className="text-[12px] text-[#6b7280]">{cat.type === 'icon' ? 'Icon Library' : 'Image Upload'}</span>
            </div>
            
            {/* Products */}
            <div className="px-4 py-3.5 border-r border-[#d1d5db] flex items-center justify-center">
              <span className="text-[13px] font-medium text-[#1c2333]">{cat.items} Items</span>
            </div>
            
            {/* Created */}
            <div className="px-4 py-3.5 border-r border-[#d1d5db] flex items-center justify-center">
              <span className="text-[12px] text-[#6b7280]">{cat.created}</span>
            </div>
            
            {/* Status */}
            <div className="px-4 py-3.5 border-r border-[#d1d5db] flex items-center justify-center">
              <span className={`text-[11px] font-bold ${cat.status === 'Active' ? 'text-[#16a34a]' : 'text-[#ef4444]'}`}>
                {cat.status === 'Active' ? '[Active]' : '[Hidden]'}
              </span>
            </div>
            
            {/* Manage */}
            <div className="px-4 py-3.5 flex items-center justify-center gap-3">
              <i className="ri-pencil-line text-[16px] text-[#6b7280] cursor-pointer hover:text-[#16a34a] transition-colors" onClick={() => openCategoryEdit(cat)}></i>
              <i className="ri-delete-bin-line text-[16px] text-[#6b7280] cursor-pointer hover:text-[#ef4444] transition-colors" onClick={() => handleDeleteCategory(cat.id)}></i>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CategoriesView
