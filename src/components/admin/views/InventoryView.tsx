'use client'

import React, { useState } from 'react'
import { useAdmin } from '@/components/admin/context/AdminContext'

const InventoryView: React.FC = () => {
  const { 
    inventory, 
    setInventory, 
    expandedInventory, 
    setExpandedInventory, 
    editingInventoryItem, 
    setEditingInventoryItem,
    showToastMsg,
    refetchInventory
  } = useAdmin()

  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleDeleteInventory = async (item: { id: number; name: string }) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"? This will also delete all its variants.`)) {
      return
    }
    
    setDeletingId(item.id)
    try {
      const response = await fetch(`/api/products?id=${item.id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        setInventory(inventory.filter(i => i.id !== item.id))
        showToastMsg('Product deleted successfully!')
      } else {
        showToastMsg('Failed to delete product')
      }
    } catch (error) {
      console.error('Error deleting inventory:', error)
      showToastMsg('Failed to delete product')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="prod-mgmt-wrapper">
      <div style={{marginBottom: '20px', fontSize: '18px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans'"}}>Inventory Management</div>
      
      {/* Stats Cards */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px'}}>
        <div className="prod-order-card" style={{padding: '16px', display: 'flex', alignItems: 'center', gap: '12px'}}>
          <div style={{width: '40px', height: '40px', borderRadius: '8px', background: '#16a34a15', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <i className="ri-archive-line" style={{color: '#16a34a', fontSize: '20px'}}></i>
          </div>
          <div>
            <div style={{fontSize: '11px', color: '#8a96a8', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Total Products</div>
            <div style={{fontSize: '20px', fontWeight: 700, color: '#1c2333'}}>{inventory.length}</div>
          </div>
        </div>
        <div className="prod-order-card" style={{padding: '16px', display: 'flex', alignItems: 'center', gap: '12px'}}>
          <div style={{width: '40px', height: '40px', borderRadius: '8px', background: '#f59e0b15', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <i className="ri-stack-line" style={{color: '#f59e0b', fontSize: '20px'}}></i>
          </div>
          <div>
            <div style={{fontSize: '11px', color: '#8a96a8', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Total Varieties</div>
            <div style={{fontSize: '20px', fontWeight: 700, color: '#1c2333'}}>{inventory.reduce((acc, i) => acc + i.variants.length, 0)}</div>
          </div>
        </div>
        <div className="prod-order-card" style={{padding: '16px', display: 'flex', alignItems: 'center', gap: '12px'}}>
          <div style={{width: '40px', height: '40px', borderRadius: '8px', background: '#16a34a15', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <i className="ri-checkbox-circle-line" style={{color: '#16a34a', fontSize: '20px'}}></i>
          </div>
          <div>
            <div style={{fontSize: '11px', color: '#8a96a8', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Total Stock</div>
            <div style={{fontSize: '20px', fontWeight: 700, color: '#16a34a'}}>{inventory.reduce((acc, i) => acc + i.variants.reduce((vAcc, v) => vAcc + v.stock, 0), 0)}</div>
          </div>
        </div>
        <div className="prod-order-card" style={{padding: '16px', display: 'flex', alignItems: 'center', gap: '12px'}}>
          <div style={{width: '40px', height: '40px', borderRadius: '8px', background: '#ef444415', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <i className="ri-alert-line" style={{color: '#ef4444', fontSize: '20px'}}></i>
          </div>
          <div>
            <div style={{fontSize: '11px', color: '#8a96a8', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Low Stock</div>
            <div style={{fontSize: '20px', fontWeight: 700, color: '#ef4444'}}>{inventory.filter(i => i.variants.some(v => v.stock < 10)).length}</div>
          </div>
        </div>
      </div>

      {/* Inventory Table - Matching Product Section Design */}
      <div className="prod-container">
        <div className="inv-table-header">
          <div className="inv-grid-row">
            <div>Product Name</div>
            <div>Varieties</div>
            <div>Stock</div>
            <div>Last Edited</div>
            <div>Action</div>
          </div>
        </div>
        {inventory.map((item) => {
          const totalStock = item.variants.reduce((acc, v) => acc + v.stock, 0)
          const totalInitialStock = item.variants.reduce((acc, v) => acc + v.initialStock, 0)
          const isExpanded = expandedInventory === item.id
          
          return (
            <React.Fragment key={item.id}>
              <div 
                className="prod-order-card product-row"
                style={{cursor: 'pointer'}}
                onClick={() => setExpandedInventory(isExpanded ? null : item.id)}
              >
                <div className="inv-grid-row">
                  <div className="product-cell" style={{justifyContent: 'center'}}>
                    <img src={item.image} alt={item.name} className="inv-product-img" />
                    <div className="product-info">
                      <span className="product-name">{item.name}</span>
                      <span className="product-cat">{item.category}</span>
                    </div>
                  </div>
                  <div className="bracket-text text-blue">[{item.variants.length} varieties]</div>
                  <div className="bracket-text text-muted-val">[{totalStock} of {totalInitialStock}]</div>
                  <div className="text-muted-val">{item.lastEdited}</div>
                  <div className="inv-action-btns">
                    <button className="inv-btn-edit" onClick={(e) => { e.stopPropagation(); setEditingInventoryItem(item); }}>Edit</button>
                    <button className="inv-btn-delete" onClick={(e) => { e.stopPropagation(); handleDeleteInventory(item); }} disabled={deletingId === item.id}>{deletingId === item.id ? 'Deleting...' : 'Delete'}</button>
                  </div>
                </div>
              </div>
              
              {/* Expanded Variants */}
              {isExpanded && (
                <div className="prod-order-card" style={{background: '#ffffff', padding: '16px 20px 16px 70px'}}>
                  <div style={{fontSize: '11px', fontWeight: 600, color: '#8a96a8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px'}}>Varieties Stock Details</div>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px'}}>
                    {item.variants.map((variant, vIndex) => (
                      <div 
                        key={vIndex}
                        style={{padding: '10px 12px', background: 'white', borderRadius: '8px', border: '1px solid #e4e7ee'}}
                      >
                        <div style={{fontSize: '11px', color: '#64748b', marginBottom: '4px'}}>{variant.name}</div>
                        <div style={{fontSize: '13px', fontWeight: 600, color: '#1c2333'}}>
                          {variant.stock} <span style={{fontSize: '11px', fontWeight: 400, color: '#8a96a8'}}>of {variant.initialStock}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
      
      {/* Inventory Edit Modal */}
      {editingInventoryItem && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingInventoryItem(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1c2333]">Edit Stock - {editingInventoryItem.name}</h3>
              <button onClick={() => setEditingInventoryItem(null)} className="text-[#8a96a8] hover:text-[#1c2333]">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-3">
              {editingInventoryItem.variants.map((variant, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#e4e7ee]">
                  <div>
                    <div className="font-medium text-[#1c2333]">{variant.name}</div>
                    <div className="text-[11px] text-[#8a96a8]">Variety: {variant.initialStock}</div>
                  </div>
                  <input 
                    type="number"
                    value={variant.stock}
                    onChange={(e) => {
                      const newVariants = [...editingInventoryItem.variants];
                      newVariants[idx].stock = parseInt(e.target.value) || 0;
                      setEditingInventoryItem({...editingInventoryItem, variants: newVariants});
                    }}
                    className="w-20 px-3 py-2 border border-[#e4e7ee] rounded-lg text-center focus:outline-none focus:border-[#16a34a]"
                  />
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setEditingInventoryItem(null)}
                className="flex-1 px-4 py-2 border border-[#e4e7ee] text-[#8a96a8] rounded-lg font-semibold hover:bg-[#f5f6f9] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  // Save each variant's stock to database
                  try {
                    for (const variant of editingInventoryItem.variants) {
                      if (variant.id) {
                        await fetch('/api/inventory', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            variantId: variant.id,
                            stock: variant.stock
                          })
                        })
                      }
                    }
                    // Refetch inventory from database
                    refetchInventory()
                    setEditingInventoryItem(null)
                    showToastMsg('Stock updated successfully!')
                  } catch (error) {
                    console.error('Error saving inventory:', error)
                    showToastMsg('Failed to update stock')
                  }
                }}
                className="flex-1 px-4 py-2 bg-[#16a34a] text-white rounded-lg font-semibold hover:bg-[#15803d] transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryView
