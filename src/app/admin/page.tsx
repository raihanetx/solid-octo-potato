'use client'

import AdminDashboard from '@/components/admin/AdminDashboard'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Authentication temporarily disabled for development */}
      <AdminDashboard setView={() => {}} />
    </div>
  )
}
