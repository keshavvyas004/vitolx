import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingBag, Plus, MessageCircle, User, LogOut, LayoutDashboard, ChevronDown, PackageCheck } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import { getInitials } from '@/lib/utils'
import api from '@/api/axios'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on route change
  useEffect(() => {
    setDropdownOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      /* ignore */
    }
    logout()
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/home" className="flex items-center gap-2 font-black text-xl text-blue-600 hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="tracking-tight">VIT OLX</span>
          </Link>

          {isAuthenticated && user && (
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                to="/sell"
                className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Sell Item</span>
                <span className="sm:hidden">Sell</span>
              </Link>

              <Link
                to="/chat"
                className={`p-2 rounded-xl transition-colors ${
                  location.pathname === '/chat' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Messages"
              >
                <MessageCircle className="w-5 h-5" />
              </Link>

              {/* User dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(prev => !prev)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors focus:outline-none"
                  aria-expanded={dropdownOpen}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    {getInitials(user?.name)}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
                      <p className="font-bold text-sm text-gray-900 truncate">{user?.name || 'Student'}</p>
                      <p className="text-xs text-blue-600 font-mono mt-0.5">{user?.enrollmentNo || ''}</p>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      <Link to="/my-listings" className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                        <ShoppingBag className="w-4 h-4 text-gray-500" /> My Listings
                      </Link>
                      <Link to="/my-orders" className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                        <PackageCheck className="w-4 h-4 text-gray-500" /> My Purchases
                      </Link>
                      <Link to="/my-bids" className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                        <LayoutDashboard className="w-4 h-4 text-gray-500" /> My Bids
                      </Link>
                      <Link to="/profile" className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                        <User className="w-4 h-4 text-gray-500" /> Profile & Earnings
                      </Link>
                      {user.role === 'admin' && (
                        <Link to="/admin" className="flex items-center gap-2.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-xl font-semibold transition-colors">
                          <LayoutDashboard className="w-4 h-4" /> Admin Panel
                        </Link>
                      )}
                      <div className="pt-1 border-t border-gray-100">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                        >
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
