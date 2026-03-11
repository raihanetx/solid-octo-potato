'use client'

import React, { useState, useMemo } from 'react'
import { useAdmin } from '@/components/admin/context/AdminContext'

const ReviewsView: React.FC = () => {
  const { adminReviews, setAdminReviews } = useAdmin()
  const [ratingFilter, setRatingFilter] = useState<number | null>(null)

  const filteredReviews = useMemo(() => {
    if (!ratingFilter) return adminReviews
    return adminReviews.filter(r => r.rating === ratingFilter)
  }, [adminReviews, ratingFilter])

  const handleDeleteReview = async (reviewId: number) => {
    try {
      const response = await fetch(`/api/reviews?id=${reviewId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        setAdminReviews(adminReviews.filter(r => r.id !== reviewId))
      } else {
        alert('Failed to delete review')
      }
    } catch (error) {
      console.error('Error deleting review:', error)
      alert('Failed to delete review')
    }
  }

  return (
    <div className="p-4 md:p-8" style={{fontFamily: "'Inter', sans-serif", backgroundColor: '#ffffff', color: '#1c2333', margin: '0', minHeight: 'calc(100vh - 80px)'}}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1c2333] tracking-tight">Review Management</h1>
          <p className="text-[#8a96a8] text-sm mt-1">Manage customer reviews and feedback</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-4 py-1.5 bg-[#16a34a]/10 text-[#16a34a] text-[13px] font-bold rounded-lg">
            {filteredReviews.filter(r => r.rating >= 4).length} Positive
          </span>
          <span className="px-4 py-1.5 bg-[#ef4444]/10 text-[#ef4444] text-[13px] font-bold rounded-lg">
            {filteredReviews.filter(r => r.rating < 3).length} Negative
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#e4e7ee] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#f59e0b]/10 rounded-lg flex items-center justify-center">
              <i className="ri-star-line text-[#f59e0b] text-xl"></i>
            </div>
            <div>
              <div className="text-[11px] text-[#8a96a8] uppercase tracking-wider">Total Reviews</div>
              <div className="text-xl font-bold text-[#1c2333]">{filteredReviews.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#e4e7ee] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#16a34a]/10 rounded-lg flex items-center justify-center">
              <i className="ri-star-fill text-[#16a34a] text-xl"></i>
            </div>
            <div>
              <div className="text-[11px] text-[#8a96a8] uppercase tracking-wider">Avg Rating</div>
              <div className="text-xl font-bold text-[#16a34a]">
                {filteredReviews.length > 0 
                  ? (filteredReviews.reduce((acc, r) => acc + r.rating, 0) / filteredReviews.length).toFixed(1)
                  : '0.0'}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#e4e7ee] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#16a34a]/10 rounded-lg flex items-center justify-center">
              <i className="ri-thumb-up-line text-[#16a34a] text-xl"></i>
            </div>
            <div>
              <div className="text-[11px] text-[#8a96a8] uppercase tracking-wider">5 Star</div>
              <div className="text-xl font-bold text-[#16a34a]">{filteredReviews.filter(r => r.rating === 5).length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#e4e7ee] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ef4444]/10 rounded-lg flex items-center justify-center">
              <i className="ri-thumb-down-line text-[#ef4444] text-xl"></i>
            </div>
            <div>
              <div className="text-[11px] text-[#8a96a8] uppercase tracking-wider">1-2 Star</div>
              <div className="text-xl font-bold text-[#ef4444]">{filteredReviews.filter(r => r.rating <= 2).length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white border border-[#e4e7ee] rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#e4e7ee] flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#1c2333]">Customer Reviews</h3>
          <div className="flex items-center gap-2">
            <select 
              className="px-3 py-2 border border-[#e4e7ee] rounded-lg text-sm focus:outline-none focus:border-[#16a34a] text-[#8a96a8]"
              value={ratingFilter || ''}
              onChange={(e) => setRatingFilter(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-white border-b border-[#e4e7ee]">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8a96a8] uppercase tracking-wider">Product</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8a96a8] uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8a96a8] uppercase tracking-wider">Review</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8a96a8] uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8a96a8] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ee]">
              {filteredReviews.map((review) => (
                <tr key={review.id} className="hover:bg-[#f5f6f9]/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-semibold text-[#1c2333]">{review.product}</div>
                      <div className="text-[11px] text-[#8a96a8]">{review.productCategory}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-[#1c2333]">{review.customerName}</div>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {[1,2,3,4,5].map(star => (
                          <i 
                            key={star} 
                            className={`ri-star-${star <= review.rating ? 'fill' : 'line'} ${star <= review.rating ? 'text-[#f59e0b]' : 'text-[#e4e7ee]'}`}
                            style={{fontSize: '12px'}}
                          ></i>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[#64748b] text-[12px] max-w-[280px] truncate">{review.text}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[#1c2333] text-[12px]">{review.date}</div>
                    <div className="text-[#8a96a8] text-[11px]">{review.time}</div>
                  </td>
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => handleDeleteReview(review.id)}
                      className="px-3 py-1.5 text-[11px] font-semibold text-[#ef4444] border border-[#ef4444] rounded-lg hover:bg-[#ef4444]/10 transition-colors"
                    >
                      <i className="ri-delete-bin-line mr-1"></i>Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ReviewsView
