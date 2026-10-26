import { Link } from 'react-router-dom'
import { ShoppingBag, Shield, Zap, Users } from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
          VIT OLX
        </h1>
        <p className="text-xl text-gray-500 mb-2 font-medium">Student Marketplace</p>
        <p className="text-gray-400 max-w-xl mx-auto mb-10">
          Buy and sell items within your college community. Safe, simple, and exclusively for students.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            to="/register"
            className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="px-8 py-3.5 bg-white text-gray-700 rounded-xl font-bold text-lg border border-gray-300 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: <Shield className="w-6 h-6" />, title: 'Students Only', desc: 'Verified via enrollment number — no outsiders, no staff.' },
          { icon: <Zap className="w-6 h-6" />, title: 'Bid or Buy', desc: 'Auction for the best price or buy instantly at a fixed rate.' },
          { icon: <Users className="w-6 h-6" />, title: 'Secure Payments', desc: 'Pay inside the app. Seller contact revealed only after payment.' },
        ].map(f => (
          <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              {f.icon}
            </div>
            <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-sm text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
