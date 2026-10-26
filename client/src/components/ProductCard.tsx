import { Link } from 'react-router-dom'
import { Clock, Gavel, Eye } from 'lucide-react'
import { formatCurrency, timeRemaining } from '@/lib/utils'

interface Product {
  _id: string
  title: string
  images: { url: string }[]
  basePrice: number
  currentBid: number
  saleType: 'fixed' | 'auction'
  auctionEndAt?: string
  condition: string
  category: string
  bidCount: number
  views: number
  status: string
  seller: { name: string; year: string; department: string }
}

export default function ProductCard({ product }: { product: Product }) {
  const isAuction = product.saleType === 'auction'
  const displayPrice = isAuction ? product.currentBid : product.basePrice

  return (
    <Link to={`/product/${product._id}`} className="group block bg-white rounded-2xl border border-gray-200 hover:shadow-lg hover:border-blue-200 transition-all duration-200 overflow-hidden">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {product.images?.[0]?.url ? (
          <img
            src={product.images[0].url}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 text-xs">No image</div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
            isAuction ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
          }`}>
            {isAuction ? '🔨 Auction' : '🏷️ Fixed'}
          </span>
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white/90 text-gray-700">
            {product.condition}
          </span>
        </div>
        {product.status === 'sold' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-red-500 text-white font-bold px-4 py-1.5 rounded-full text-sm">SOLD</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-xs text-gray-500 mb-1">{product.category}</p>
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
          {product.title}
        </h3>

        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400">{isAuction ? 'Current Bid' : 'Price'}</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(displayPrice)}</p>
          </div>
          {isAuction && product.auctionEndAt && (
            <div className="text-right">
              <div className="flex items-center gap-1 text-orange-500 text-xs font-medium">
                <Clock className="w-3 h-3" />
                {timeRemaining(product.auctionEndAt)}
              </div>
              <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                <Gavel className="w-3 h-3" />
                {product.bidCount} bids
              </div>
            </div>
          )}
        </div>

        {/* Seller */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">{product.seller.name}</span>
            <span className="mx-1">·</span>
            <span>{product.seller.year} yr</span>
          </div>
          <div className="flex items-center gap-1 text-gray-400 text-xs">
            <Eye className="w-3 h-3" />
            {product.views}
          </div>
        </div>
      </div>
    </Link>
  )
}
