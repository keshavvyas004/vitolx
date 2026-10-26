import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatDate } from '@/lib/utils'
import api from '@/api/axios'

export default function MyOrders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/orders/my/purchases').then(r => setOrders(r.data)).finally(() => setLoading(false))
  }, [])

  const statusColors: Record<string, string> = {
    awaiting_payment: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-green-100 text-green-700',
    payout_initiated: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Purchases</h1>

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🛒</p>
          <p className="font-medium">No purchases yet</p>
          <Link to="/home" className="text-blue-600 text-sm mt-2 block hover:underline">Start shopping →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <div key={order._id} className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex gap-4">
                <img
                  src={order.product?.images?.[0]?.url}
                  alt={order.product?.title}
                  className="w-20 h-20 rounded-xl object-cover bg-gray-100 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 truncate">{order.product?.title}</p>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${statusColors[order.status] || 'bg-gray-100 text-gray-500'}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-blue-600 font-bold mt-1">{formatCurrency(order.buyerTotal)}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Seller: <span className="text-gray-600 font-medium">{order.seller?.name}</span>
                    <span className="mx-1">·</span>
                    {formatDate(order.createdAt)}
                  </p>

                  {/* Show seller contact if paid */}
                  {(order.status === 'paid' || order.status === 'payout_initiated' || order.status === 'completed') && order.sellerPhone && (
                    <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-green-700 font-semibold">📞 Seller:</span>
                      <span className="text-sm font-bold text-green-800">{order.sellerPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
