import { useState, useEffect } from 'react'
import { Gavel, TrendingUp, Clock } from 'lucide-react'
import { io } from 'socket.io-client'
import { formatCurrency, timeRemaining } from '@/lib/utils'
import api from '@/api/axios'
import useAuthStore from '@/store/authStore'

interface BidPanelProps {
  productId: string
  sellerId: string
  currentBid: number
  basePrice: number
  bidCount: number
  minBidIncrement: number
  auctionEndAt: string
  onBidPlaced?: (newBid: number) => void
}

interface BidEntry {
  id: string
  amount: number
  bidder: { name: string; enrollmentNo: string }
  createdAt: string
}

export default function BidPanel({
  productId, sellerId, currentBid: initialBid, basePrice,
  bidCount: initialCount, minBidIncrement, auctionEndAt, onBidPlaced,
}: BidPanelProps) {
  const { user } = useAuthStore()
  const [currentBid, setCurrentBid] = useState(initialBid)
  const [bidCount, setBidCount] = useState(initialCount)
  const [bidAmount, setBidAmount] = useState(initialBid + minBidIncrement)
  const [bids, setBids] = useState<BidEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [timeLeft, setTimeLeft] = useState(timeRemaining(auctionEndAt))
  const isEnded = new Date() > new Date(auctionEndAt)
  const isSeller = user?.id === sellerId

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(timeRemaining(auctionEndAt)), 30000)
    return () => clearInterval(interval)
  }, [auctionEndAt])

  useEffect(() => {
    // Fetch existing bids
    api.get(`/bids/${productId}`).then(r => setBids(r.data)).catch(() => {})

    // Socket for live updates
    const socketUrl = import.meta.env.VITE_API_URL || '/'
    const socket = io(socketUrl, { withCredentials: true })
    socket.emit('join_product', productId)
    socket.on('new_bid', ({ bid, currentBid: newBid, bidCount: newCount }: { bid: BidEntry; currentBid: number; bidCount: number }) => {
      setCurrentBid(newBid)
      setBidCount(newCount)
      setBids(prev => [bid, ...prev])
      onBidPlaced?.(newBid)
    })
    return () => { socket.emit('leave_product', productId); socket.disconnect() }
  }, [productId, onBidPlaced])

  const handleBid = async () => {
    setError(''); setSuccess('')
    const minRequired = currentBid + minBidIncrement
    if (bidAmount < minRequired) {
      return setError(`Minimum bid is ${formatCurrency(minRequired)}`)
    }
    try {
      setLoading(true)
      await api.post('/bids', { productId, amount: bidAmount })
      setSuccess('Bid placed successfully!')
      setBidAmount(bidAmount + minBidIncrement)
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to place bid'
      setError(msg || 'Failed to place bid')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptBid = async (bidId: string) => {
    try {
      setLoading(true)
      await api.post(`/bids/${bidId}/accept`)
      setSuccess('Bid accepted! Buyer has been notified to complete payment.')
      setBids(prev => prev.map((b: any) => ((b.id === bidId || b._id === bidId) ? { ...b, isAccepted: true } : b)))
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to accept bid')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      {/* Current Bid */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Current Highest Bid</p>
          <p className="text-3xl font-bold text-blue-600">{formatCurrency(currentBid || basePrice)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{bidCount} bids placed</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 text-orange-500 font-semibold">
            <Clock className="w-4 h-4" />
            <span>{timeLeft}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Min increment: {formatCurrency(minBidIncrement)}</p>
        </div>
      </div>

      {/* Bid Input */}
      {!isSeller && !isEnded && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
              <input
                type="number"
                value={bidAmount}
                onChange={e => setBidAmount(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                min={currentBid + minBidIncrement}
                step={minBidIncrement}
              />
            </div>
            <button
              onClick={handleBid}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors disabled:opacity-60"
            >
              <Gavel className="w-4 h-4" />
              {loading ? 'Placing…' : 'Bid Now'}
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          {/* Quick bid buttons */}
          <div className="flex gap-2">
            {[1, 2, 5].map(mult => (
              <button
                key={mult}
                onClick={() => setBidAmount(currentBid + minBidIncrement * mult)}
                className="flex-1 py-1.5 text-xs border border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                +{formatCurrency(minBidIncrement * mult)}
              </button>
            ))}
          </div>
        </div>
      )}

      {isEnded && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center text-red-600 font-medium text-sm">
          Auction has ended
        </div>
      )}

      {/* Bid History */}
      {bids.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <p className="text-sm font-semibold text-gray-700">Bid History</p>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {bids.map((bid: any, i) => {
              const bId = bid.id || bid._id
              return (
                <div key={bId} className={`flex justify-between items-center px-3 py-2 rounded-xl text-sm ${i === 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                  <div>
                    <span className="text-gray-700 font-medium">{bid.bidder?.name || 'Student'}</span>
                    {bid.isAccepted && (
                      <span className="ml-2 px-2 py-0.5 text-[11px] font-bold bg-green-100 text-green-700 rounded-md">
                        Accepted
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">{formatCurrency(bid.amount)}</span>
                    {isSeller && !bid.isAccepted && (
                      <button
                        onClick={() => handleAcceptBid(bId)}
                        disabled={loading}
                        className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        Accept
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
