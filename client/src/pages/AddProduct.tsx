import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, Loader2, Video } from 'lucide-react'
import api from '@/api/axios'

const CATEGORIES = ['Electronics', 'Books', 'Furniture', 'Clothing', 'Appliances', 'Sports', 'Stationery', 'Other']
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair']

export default function AddProduct() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '', description: '', category: '', condition: '',
    basePrice: '', saleType: 'fixed', auctionEndAt: '', minBidIncrement: '10',
  })
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [_video, setVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoPublicId, setVideoPublicId] = useState('')
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const imgRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 5 - images.length)
    const combined = [...images, ...files].slice(0, 5)
    setImages(combined)
    setImagePreviews(combined.map(f => URL.createObjectURL(f)))
  }

  const removeImage = (i: number) => {
    const newImages = images.filter((_, idx) => idx !== i)
    const newPreviews = imagePreviews.filter((_, idx) => idx !== i)
    setImages(newImages)
    setImagePreviews(newPreviews)
  }

  const handleVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setVideo(file)
    setVideoPreview(URL.createObjectURL(file))
    // Upload immediately to get URL
    setUploadingVideo(true)
    try {
      const fd = new FormData()
      fd.append('video', file)
      const { data } = await api.post('/products/upload-video', fd)
      setVideoUrl(data.url)
      setVideoPublicId(data.publicId)
    } catch {
      setError('Video upload failed')
    } finally {
      setUploadingVideo(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (images.length === 0) return setError('At least one product image is required')

    try {
      setLoading(true)
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (videoUrl) {
        fd.append('videoUrl', videoUrl)
        fd.append('videoPublicId', videoPublicId)
      }
      images.forEach(img => fd.append('images', img))

      const { data } = await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      navigate(`/product/${data._id}`)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to list product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">List an Item</h1>
        <p className="text-gray-500 mt-1">Help your fellow students find what they need</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Images */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Product Images <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal ml-1">(up to 5)</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {imagePreviews.map((src, i) => (
              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <button type="button" onClick={() => imgRef.current?.click()} className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors">
                <Upload className="w-5 h-5 mb-1" />
                <span className="text-xs">Add Photo</span>
              </button>
            )}
          </div>
          <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
        </div>

        {/* Video */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Working Condition Video <span className="text-gray-400 font-normal">(optional — recommended for electronics)</span>
          </label>
          <p className="text-xs text-gray-400 mb-2">Show the item is working — builds buyer trust</p>
          {videoPreview ? (
            <div className="relative rounded-xl overflow-hidden bg-black h-40 flex items-center justify-center">
              <video src={videoPreview} controls className="h-full" />
              {uploadingVideo && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                  <span className="text-white ml-2 text-sm">Uploading…</span>
                </div>
              )}
              {!uploadingVideo && videoUrl && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">✓ Uploaded</div>
              )}
            </div>
          ) : (
            <button type="button" onClick={() => videoRef.current?.click()} className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors">
              <Video className="w-6 h-6 mb-1" />
              <span className="text-sm">Upload Video (MP4, MOV)</span>
              <span className="text-xs mt-0.5">Max 100MB</span>
            </button>
          )}
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideo} />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
          <input
            value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="e.g. Study Lamp — IKEA, works perfectly"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={100} required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description <span className="text-red-500">*</span></label>
          <textarea
            value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Describe the item, its condition, why you're selling, any defects…"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={4} maxLength={2000} required
          />
        </div>

        {/* Category + Condition */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category <span className="text-red-500">*</span></label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">Select</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Condition <span className="text-red-500">*</span></label>
            <select value={form.condition} onChange={e => set('condition', e.target.value)} className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">Select</option>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Sale Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Sale Type</label>
          <div className="grid grid-cols-2 gap-3">
            {[{ v: 'fixed', label: '🏷️ Fixed Price', desc: 'Set a firm price' }, { v: 'auction', label: '🔨 Auction', desc: 'Let students bid' }].map(opt => (
              <button
                key={opt.v} type="button"
                onClick={() => set('saleType', opt.v)}
                className={`p-4 border-2 rounded-xl text-left transition-colors ${form.saleType === opt.v ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {form.saleType === 'auction' ? 'Starting Bid' : 'Price'} (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number" value={form.basePrice} onChange={e => set('basePrice', e.target.value)}
              placeholder="500" min={1}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {form.saleType === 'auction' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Min Bid Increment (₹)</label>
              <input
                type="number" value={form.minBidIncrement} onChange={e => set('minBidIncrement', e.target.value)}
                placeholder="10" min={1}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Auction End Date */}
        {form.saleType === 'auction' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Auction End Date & Time <span className="text-red-500">*</span></label>
            <input
              type="datetime-local"
              value={form.auctionEndAt}
              onChange={e => set('auctionEndAt', e.target.value)}
              min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={form.saleType === 'auction'}
            />
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={loading || uploadingVideo}
          className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 text-lg"
        >
          {loading ? 'Listing…' : 'List Item for Sale'}
        </button>
      </form>
    </div>
  )
}
