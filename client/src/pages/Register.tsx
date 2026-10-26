import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Phone, Lock, Eye, EyeOff } from 'lucide-react'
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import api from '@/api/axios'
import useAuthStore from '@/store/authStore'

const YEARS = ['1st', '2nd', '3rd', '4th', 'PG1', 'PG2']

export default function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [form, setForm] = useState({
    enrollmentNo: '',
    name: '',
    phone: '',
    year: '',
    department: '',
    upiId: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const setupRecaptcha = () => {
    if (recaptchaRef.current) {
      try {
        recaptchaRef.current.clear()
      } catch {
        /* ignore */
      }
      recaptchaRef.current = null
    }
    const container = document.getElementById('recaptcha-container')
    if (container) {
      container.innerHTML = ''
    }
    recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
    })
    return recaptchaRef.current
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!/^\d{2}[A-Z]{3}\d{5}$/.test(form.enrollmentNo.toUpperCase())) {
      return setError('Invalid enrollment number. Format: 26MCA10020')
    }
    if (form.phone.replace(/\D/g, '').length !== 10) {
      return setError('Enter a valid 10-digit phone number')
    }
    if (!form.password || form.password.length < 6) {
      return setError('Password must be at least 6 characters long')
    }
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match')
    }
    const phoneFormatted = `+91${form.phone.replace(/\D/g, '')}`
    try {
      setLoading(true)
      const verifier = setupRecaptcha()
      const result = await signInWithPhoneNumber(auth, phoneFormatted, verifier)
      setConfirmation(result)
      set('phone', phoneFormatted)
      setStep('otp')
    } catch (err: any) {
      console.error('Send OTP error:', err)
      // Reset recaptcha so it can be used again
      try { recaptchaRef.current?.clear() } catch {}
      recaptchaRef.current = null
      const container = document.getElementById('recaptcha-container')
      if (container) container.innerHTML = ''

      if (err?.code === 'auth/operation-not-allowed') {
        setError('Phone auth is disabled in Firebase Console. Go to Authentication > Sign-in method and enable "Phone".')
      } else if (err?.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized. Add localhost to Firebase Console > Authentication > Settings > Authorized domains.')
      } else if (err?.code === 'auth/quota-exceeded') {
        setError('SMS quota exceeded. Use a test phone number in Firebase Console (e.g. +919876543210 -> 123456) or upgrade to Blaze plan.')
      } else if (err?.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a few minutes or test with a Firebase test number.')
      } else if (err?.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format. Please provide a valid 10-digit number.')
      } else {
        setError(err?.message || 'Failed to send OTP. Please check browser console.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!confirmation) return setError('Please go back and request OTP again.')
    try {
      setLoading(true)
      // Verify OTP with Firebase
      const credential = await confirmation.confirm(otp)
      // Get Firebase ID token (proof that phone is verified)
      const idToken = await credential.user.getIdToken()
      // Send to backend to create account
      const { data } = await api.post('/auth/register', {
        ...form,
        enrollmentNo: form.enrollmentNo.toUpperCase().trim(),
        idToken,
      })
      setAuth(data.user, data.accessToken)
      navigate('/home')
    } catch (err: any) {
      console.error('Registration error:', err)
      let msg = 'Registration failed. Please try again.'
      if (err?.code === 'auth/invalid-verification-code') {
        msg = 'Wrong OTP. Please check and try again.'
      } else if (err?.code === 'auth/code-expired') {
        msg = 'OTP expired. Please go back and request a new one.'
      } else if (typeof err?.response?.data?.message === 'string') {
        msg = err.response.data.message
      } else if (typeof err?.response?.data?.error === 'string') {
        msg = err.response.data.error
      } else if (typeof err?.response?.data?.error?.message === 'string') {
        msg = err.response.data.error.message
      } else if (typeof err?.message === 'string') {
        msg = err.message
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      {/* Invisible reCAPTCHA container — required by Firebase */}
      <div id="recaptcha-container" />

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-1">Join VIT OLX — students only</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {step === 'form' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Keshav Vyas"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Enrollment Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Enrollment Number</label>
                <input
                  value={form.enrollmentNo}
                  onChange={e => set('enrollmentNo', e.target.value.toUpperCase())}
                  placeholder="26MCA10020"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider"
                  maxLength={10}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Format: 2-digit year + 3-letter branch + 5-digit roll</p>
              </div>

              {/* Year + Department */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
                  <select
                    value={form.year} onChange={e => set('year', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select</option>
                    {YEARS.map(y => <option key={y} value={y}>{y} Year</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                  <input
                    value={form.department} onChange={e => set('department', e.target.value)}
                    placeholder="MCA / B.Tech CSE"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">+91</span>
                  <input
                    type="tel"
                    value={form.phone.replace('+91', '')}
                    onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Lock className="w-3.5 h-3.5 inline mr-1 text-gray-500" />Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full px-3 py-2.5 pr-8 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={e => set('confirmPassword', e.target.value)}
                    placeholder="Repeat"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>
              </div>

              {/* UPI ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  UPI ID <span className="text-gray-400 font-normal">(optional — for receiving payments)</span>
                </label>
                <input
                  value={form.upiId} onChange={e => set('upiId', e.target.value)}
                  placeholder="yourname@upi"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <button
                type="submit" disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {loading ? 'Sending OTP…' : 'Verify Phone with OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="text-center mb-2">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Phone className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-600">OTP sent to <strong>{form.phone}</strong></p>
                <p className="text-xs text-gray-400 mt-1">Check your SMS messages</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit OTP"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl font-mono tracking-widest"
                  maxLength={6}
                  required
                />
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <button
                type="submit" disabled={loading || otp.length !== 6}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {loading ? 'Creating Account…' : 'Create Account'}
              </button>
              <button type="button" onClick={() => { setStep('form'); setOtp(''); setError('') }} className="w-full text-sm text-gray-500 hover:text-blue-600">
                ← Edit details
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Already registered?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
