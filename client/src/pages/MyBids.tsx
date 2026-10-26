import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatDate, timeRemaining } from '@/lib/utils'
import api from '@/api/axios'

export default function MyBids() {
  const [bids, setBids] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/bids/my/bids').then(r => setBids(r.data)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bids</h1>

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : bids.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔨</p>
          <p className="font-medium">No bids placed yet</p>
          <Link to="/home" className="text-blue-600 text-sm mt-2 block hover:underline">Browse auctions →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bids.map((bid: any) => {
            const product = bid.product
            const isWinning = bid.isWinning
            const productEnded = product?.status !== 'active'

            return (
              <Link key={bid._id} to={`/product/${product?._id}`} className="flex gap-4 bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md hover:border-blue-200 transition-all">
                <img src={product?.images?.[0]?.url} alt={product?.title} className="w-20 h-20 rounded-xl object-cover bg-gray-100 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 truncate">{product?.title}</p>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${isWinning ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {isWinning ? '🏆 Winning' : 'Outbid'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-500">Your bid: <strong className="text-gray-900">{formatCurrency(bid.amount)}</strong></span>
                    <span className="text-sm text-blue-600 font-medium">Current: {formatCurrency(product?.currentBid)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span>{formatDate(bid.createdAt)}</span>
                    {!productEnded && product?.auctionEndAt && (
                      <span className="text-orange-500">⏱ {timeRemaining(product.auctionEndAt)}</span>
                    )}
                    {productEnded && <span className="text-red-500">Auction ended</span>}
                  </div>
                  {bid.isAccepted && (
                    <div className="mt-2 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg inline-block font-medium">
                      ✅ Bid accepted — complete payment
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
