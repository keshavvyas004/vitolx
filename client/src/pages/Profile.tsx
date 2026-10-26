import { useState, useEffect } from 'react'
import { User, IndianRupee, Save } from 'lucide-react'
import api from '@/api/axios'
import useAuthStore from '@/store/authStore'

const YEARS = ['1st', '2nd', '3rd', '4th', 'PG1', 'PG2']

export default function Profile() {
  const { user, setAuth, accessToken } = useAuthStore()
  const [form, setForm] = useState({ name: user?.name || '', year: user?.year || '', department: user?.department || '', upiId: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/auth/me').then(r => {
      setForm({ name: r.data.name, year: r.data.year, department: r.data.department, upiId: r.data.upiId || '' })
    })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess('')
    try {
      setLoading(true)
      await api.patch('/auth/update-profile', form)
      if (user && accessToken) setAuth({ ...user, ...form }, accessToken)
      setSuccess('Profile updated!')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      {/* Identity Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-7 h-7" />
          </div>
          <div>
            <p className="font-bold text-lg">{user.name}</p>
            <p className="text-blue-100 font-mono text-sm">{user.enrollmentNo}</p>
            <p className="text-blue-200 text-xs mt-0.5">{user.year} Year · {user.department}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-white/20">
          <div>
            <p className="text-blue-200 text-xs">Total Earned</p>
            <div className="flex items-center gap-1 font-bold text-lg">
              <IndianRupee className="w-4 h-4" />
              {user.totalEarnings || 0}
            </div>
          </div>
          <div>
            <p className="text-blue-200 text-xs">Total Spent</p>
            <div className="flex items-center gap-1 font-bold text-lg">
              <IndianRupee className="w-4 h-4" />
              {user.totalSpent || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Edit Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
              <select
                value={form.year}
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {YEARS.map(y => <option key={y} value={y}>{y} Year</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
              <input
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              UPI ID <span className="text-gray-400 font-normal">(for receiving payments)</span>
            </label>
            <input
              value={form.upiId}
              onChange={e => setForm(f => ({ ...f, upiId: e.target.value }))}
              placeholder="yourname@upi"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {success && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
