import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import api from '@/api/axios'

const CATEGORIES = ['Electronics', 'Books', 'Furniture', 'Clothing', 'Appliances', 'Sports', 'Stationery', 'Other']
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair']

export default function Home() {
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ category: '', condition: '', saleType: '', minPrice: '', maxPrice: '', sort: 'newest' })
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12', sort: filters.sort })
      if (search) params.set('search', search)
      if (filters.category) params.set('category', filters.category)
      if (filters.condition) params.set('condition', filters.condition)
      if (filters.saleType) params.set('saleType', filters.saleType)
      if (filters.minPrice) params.set('minPrice', filters.minPrice)
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
      const { data } = await api.get(`/products?${params}`)
      setProducts(Array.isArray(data?.products) ? data.products : [])
      setTotal(typeof data?.total === 'number' ? data.total : 0)
    } catch (err) {
      console.error('Fetch products error:', err)
      setProducts([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [search, filters, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const resetFilters = () => {
    setFilters({ category: '', condition: '', saleType: '', minPrice: '', maxPrice: '', sort: 'newest' })
    setSearch('')
    setPage(1)
  }

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'newest').length + (search ? 1 : 0)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search + Filter Bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search items…"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-3 border rounded-xl font-medium transition-colors ${showFilters ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-300 text-gray-700 hover:border-blue-400'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">{activeFilterCount}</span>
          )}
        </button>
        <select
          value={filters.sort}
          onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}
          className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="most_bids">Most Bids</option>
          <option value="ending_soon">Ending Soon</option>
        </select>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Category</label>
            <select
              value={filters.category}
              onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Condition</label>
            <select
              value={filters.condition}
              onChange={e => setFilters(f => ({ ...f, condition: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Sale Type</label>
            <select
              value={filters.saleType}
              onChange={e => setFilters(f => ({ ...f, saleType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="fixed">Fixed Price</option>
              <option value="auction">Auction</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Price Range</label>
            <div className="flex gap-2">
              <input
                type="number" placeholder="Min" value={filters.minPrice}
                onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number" placeholder="Max" value={filters.maxPrice}
                onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="col-span-2 md:col-span-4 flex justify-end">
            <button onClick={resetFilters} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors">
              <X className="w-3.5 h-3.5" /> Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{total} items found</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl h-72 animate-pulse" />
          ))}
        </div>
      ) : (!products || products.length === 0) ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 p-8 shadow-xs max-w-md mx-auto my-6">
          <p className="text-5xl mb-3">🛍️</p>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No items listed yet</h3>
          <p className="text-sm text-gray-500 mb-6">
            Be the first to sell, or load sample campus items to explore the platform!
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={async () => {
                try {
                  setLoading(true)
                  await api.post('/products/seed')
                  fetchProducts()
                } catch (e: any) {
                  alert(e?.response?.data?.message || 'Failed to seed sample items')
                  setLoading(false)
                }
              }}
              className="w-full px-5 py-2.5 bg-blue-50 text-blue-700 font-semibold rounded-xl hover:bg-blue-100 active:scale-98 transition-all text-sm"
            >
              ✨ Load Sample Campus Listings
            </button>
            <Link
              to="/sell"
              className="w-full px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-98 transition-all text-sm"
            >
              + Sell an Item
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(products || []).map((p: any) => <ProductCard key={p._id} product={p} />)}
          </div>

          {/* Pagination */}
          {total > 12 && (
            <div className="flex justify-center gap-2 mt-10">
              {Array(Math.ceil(total / 12)).fill(0).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-400'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
