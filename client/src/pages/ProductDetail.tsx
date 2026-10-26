import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MessageCircle, ShoppingCart, ChevronLeft, ChevronRight, Play, User, Trash2 } from 'lucide-react'
import BidPanel from '@/components/BidPanel'
import { formatCurrency, formatDate } from '@/lib/utils'
import api from '@/api/axios'
import useAuthStore from '@/store/authStore'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [imgIdx, setImgIdx] = useState(0)
  const [buyLoading, setBuyLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    api.get(`/products/${id}`).then(r => setProduct(r.data)).finally(() => setLoading(false))
  }, [id])

  const handleDeleteListing = async () => {
    if (!product) return
    const confirmed = window.confirm(`Are you sure you want to delete "${product.title}"? This cannot be undone.`)
    if (!confirmed) return

    try {
      setDeleteLoading(true)
      await api.delete(`/products/${product._id}`)
      navigate('/my-listings')
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete listing')
      setDeleteLoading(false)
    }
  }

  const handleBuyNow = async () => {
    if (!product) return
    try {
      setBuyLoading(true)
      const { data } = await api.post('/orders/initiate', { productId: product._id })

      // Support Mock/Demo mode if Razorpay is not configured with live test keys
      if (!data.keyId || data.keyId.includes('xxxx') || data.razorpayOrderId?.startsWith('order_mock_')) {
        const verify = await api.post('/orders/verify-payment', {
          orderId: data.orderId,
          razorpayOrderId: data.razorpayOrderId,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: 'mock_signature',
        })
        navigate(`/order-success/${verify.data.orderId}`, { state: { sellerPhone: verify.data.sellerPhone } })
        return
      }

      // Live / Sandbox Razorpay
      const rzp = new (window as any).Razorpay({
        key: data.keyId,
        amount: data.amount * 100,
        currency: 'INR',
        order_id: data.razorpayOrderId,
        name: 'VIT OLX',
        description: product.title,
        handler: async (response: any) => {
          const verify = await api.post('/orders/verify-payment', {
            orderId: data.orderId,
            razorpayOrderId: data.razorpayOrderId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
          navigate(`/order-success/${verify.data.orderId}`, { state: { sellerPhone: verify.data.sellerPhone } })
        },
        prefill: { name: user?.name, contact: '' },
        theme: { color: '#2563EB' },
      })
      rzp.open()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Payment initiation failed')
    } finally {
      setBuyLoading(false)
    }
  }

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    </div>
  )

  if (!product) return <div className="text-center py-20 text-gray-400">Product not found</div>

  const isSeller = user?.id === product.seller._id
  const isActive = product.status === 'active'
  const images = product.images || []

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Media Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden">
            {images[imgIdx] && (
              <img src={images[imgIdx].url} alt={product.title} className="w-full h-full object-cover" />
            )}
            {images.length > 1 && (
              <>
                <button onClick={() => setImgIdx(i => Math.max(0, i - 1))} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white shadow">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setImgIdx(i => Math.min(images.length - 1, i + 1))} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white shadow">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
              {imgIdx + 1} / {images.length}
            </div>
          </div>
          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img: any, i: number) => (
                <button key={i} onClick={() => setImgIdx(i)} className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${imgIdx === i ? 'border-blue-500' : 'border-gray-200'}`}>
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
              {product.video?.url && (
                <a href={product.video.url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-xl bg-gray-900 flex items-center justify-center border-2 border-gray-200 hover:border-blue-500 transition-colors">
                  <Play className="w-5 h-5 text-white" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          {/* Title & badges */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">{product.category}</span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">{product.condition}</span>
              {product.status === 'sold' && <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-600">SOLD</span>}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
            <p className="text-sm text-gray-400 mt-1">Listed on {formatDate(product.createdAt)}</p>
          </div>

          {/* Price / Bid Panel */}
          {product.saleType === 'auction' ? (
            <BidPanel
              productId={product._id}
              sellerId={product.seller._id}
              currentBid={product.currentBid}
              basePrice={product.basePrice}
              bidCount={product.bidCount}
              minBidIncrement={product.minBidIncrement}
              auctionEndAt={product.auctionEndAt}
              onBidPlaced={newBid => setProduct((p: any) => ({ ...p, currentBid: newBid }))}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Fixed Price</p>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(product.basePrice)}</p>
              {isActive && !isSeller && (
                <button
                  onClick={handleBuyNow}
                  disabled={buyLoading}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-60"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {buyLoading ? 'Processing…' : 'Buy Now'}
                </button>
              )}
            </div>
          )}

          {/* Chat with seller */}
          {!isSeller && isActive && (
            <Link
              to={`/chat?product=${product._id}&seller=${product.seller._id}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-colors text-sm font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              Chat with Seller
            </Link>
          )}

          {/* Description */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{product.description}</p>
          </div>

          {/* Seller Info */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{product.seller.name}</p>
              <p className="text-xs text-gray-500">{product.seller.year} Year · {product.seller.department}</p>
              <p className="text-xs text-gray-400">{product.seller.enrollmentNo}</p>
            </div>
          </div>

          {/* Seller actions */}
          {isSeller && product.status !== 'sold' && product.status !== 'payment_pending' && (
            <div className="pt-2">
              <button
                onClick={handleDeleteListing}
                disabled={deleteLoading}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 border border-red-200"
              >
                <Trash2 className="w-4 h-4" />
                {deleteLoading ? 'Deleting listing…' : 'Delete Listing'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
