import { useLocation, useParams, Link } from 'react-router-dom'
import { CheckCircle, Phone, ShoppingBag } from 'lucide-react'

export default function OrderSuccess() {
  const { id } = useParams()
  const { state } = useLocation()
  const sellerPhone = state?.sellerPhone

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-500 mb-8">Your order is confirmed. The seller will be notified.</p>

        {/* Seller Contact — revealed only here */}
        {sellerPhone && (
          <div className="bg-white border-2 border-green-200 rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-center gap-2 text-green-600 mb-3">
              <Phone className="w-5 h-5" />
              <span className="font-semibold">Seller's Contact</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-wider mb-2">{sellerPhone}</p>
            <p className="text-xs text-gray-400">Coordinate pickup with the seller directly</p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            to={`/my-orders`}
            className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" /> View My Orders
          </Link>
          <Link
            to="/home"
            className="flex items-center justify-center gap-2 w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            Continue Browsing
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-6">Order ID: {id}</p>
      </div>
    </div>
  )
}
