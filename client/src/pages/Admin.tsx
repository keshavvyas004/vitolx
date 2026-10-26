import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import api from '@/api/axios'

export default function Admin() {
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [tab, setTab] = useState<'overview' | 'users' | 'orders'>('overview')

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data))
  }, [])

  useEffect(() => {
    if (tab === 'users') api.get('/admin/users').then(r => setUsers(r.data.users))
    if (tab === 'orders') api.get('/admin/orders').then(r => setOrders(r.data.orders))
  }, [tab])

  const statCards = stats ? [
    { label: 'Total Students', value: stats.totalUsers, icon: '👥' },
    { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: '💰' },
    { label: 'Completed Orders', value: stats.totalOrders, icon: '✅' },
    { label: 'Active Listings', value: stats.activeListings, icon: '🛍️' },
    { label: 'Items Sold', value: stats.soldListings, icon: '📦' },
  ] : []

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['overview', 'users', 'orders'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-blue-400'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5 text-center shadow-sm">
              <p className="text-3xl mb-2">{s.icon}</p>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Enrollment', 'Phone', 'Year', 'Dept', 'Earnings'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u: any) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 font-mono text-blue-600">{u.enrollmentNo}</td>
                  <td className="px-4 py-3 text-gray-600">{u.phone}</td>
                  <td className="px-4 py-3 text-gray-500">{u.year}</td>
                  <td className="px-4 py-3 text-gray-500">{u.department}</td>
                  <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(u.totalEarnings || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'orders' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Product', 'Buyer', 'Seller', 'Amount Paid', 'Platform Earned', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o: any) => (
                <tr key={o._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-32 truncate">{o.product?.title}</td>
                  <td className="px-4 py-3 text-gray-600">{o.buyer?.name}</td>
                  <td className="px-4 py-3 text-gray-600">{o.seller?.name}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(o.buyerTotal)}</td>
                  <td className="px-4 py-3 font-bold text-green-600">{formatCurrency(o.platformEarned)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${o.payoutStatus === 'processed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {o.payoutStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
