import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatDate, timeRemaining } from '@/lib/utils'
import api from '@/api/axios'

export default function MyListings() {
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.get('/products/seller/my-listings').then(r => setListings(r.data)).finally(() => setLoading(false))
  }, [])

  const filtered = listings.filter(p => filter === 'all' || p.status === filter)

  const tabs = [
    { v: 'all', label: 'All' },
    { v: 'active', label: 'Active' },
    { v: 'payment_pending', label: 'Pending Payment' },
    { v: 'sold', label: 'Sold' },
    { v: 'cancelled', label: 'Cancelled' },
  ]

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    payment_pending: 'bg-yellow-100 text-yellow-700',
    sold: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-gray-100 text-gray-500',
    auction_ended: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
        <Link to="/sell" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
          + New Listing
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.v}
            onClick={() => setFilter(t.v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${filter === t.v ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-blue-400'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-medium">No listings here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <Link key={p._id} to={`/product/${p._id}`} className="flex gap-4 bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md hover:border-blue-200 transition-all">
              <img src={p.images?.[0]?.url} alt={p.title} className="w-20 h-20 rounded-xl object-cover bg-gray-100 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900 truncate">{p.title}</p>
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${statusColors[p.status] || 'bg-gray-100 text-gray-500'}`}>
                    {p.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-blue-600 font-bold mt-1">{formatCurrency(p.saleType === 'auction' ? p.currentBid : p.basePrice)}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                  <span>Listed {formatDate(p.createdAt)}</span>
                  {p.saleType === 'auction' && <span>👁 {p.views} views · {p.bidCount} bids</span>}
                  {p.saleType === 'auction' && p.status === 'active' && <span className="text-orange-500">⏱ {timeRemaining(p.auctionEndAt)}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
