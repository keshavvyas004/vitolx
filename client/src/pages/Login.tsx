import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Lock, Hash, Eye, EyeOff, Phone, ShieldCheck } from 'lucide-react'
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import api from '@/api/axios'
import useAuthStore from '@/store/authStore'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  // 'password' is now default; 'otp' is optional fallback
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password')
  const [enrollmentNo, setEnrollmentNo] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Phone OTP state (fallback)
  const [otpStep, setOtpStep] = useState<'credentials' | 'verify'>('credentials')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 1. Password Login (Default & Instant)
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!/^\d{2}[A-Z]{3}\d{5}$/.test(enrollmentNo.toUpperCase().trim())) {
      return setError('Invalid enrollment number (e.g. 26MCA10020)')
    }
    if (!password) {
      return setError('Please enter your password')
    }

    try {
      setLoading(true)
      const { data } = await api.post('/auth/login', {
        enrollmentNo: enrollmentNo.toUpperCase().trim(),
        password,
      })
      setAuth(data.user, data.accessToken)
      navigate('/home')
    } catch (err: any) {
      console.error('Password login error:', err)
      const msg = typeof err?.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err?.response?.data?.error === 'string'
            ? err.response.data.error
            : (typeof err?.message === 'string' ? err.message : 'Login failed. Please check your credentials.'))
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // 2. Firebase Phone OTP (Fallback)
  const setupRecaptcha = () => {
    if (recaptchaRef.current) {
      try { recaptchaRef.current.clear() } catch {}
      recaptchaRef.current = null
    }
    const container = document.getElementById('recaptcha-container')
    if (container) container.innerHTML = ''
    recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
    })
    return recaptchaRef.current
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!/^\d{2}[A-Z]{3}\d{5}$/.test(enrollmentNo.toUpperCase().trim())) {
      return setError('Invalid enrollment number (e.g. 26MCA10020)')
    }
    const phoneFormatted = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '')}`
    try {
      setLoading(true)
      const verifier = setupRecaptcha()
      const result = await signInWithPhoneNumber(auth, phoneFormatted, verifier)
      setConfirmation(result)
      setPhone(phoneFormatted)
      setOtpStep('verify')
    } catch (err: any) {
      console.error('Send OTP error:', err)
      try { recaptchaRef.current?.clear() } catch {}
      recaptchaRef.current = null
      const container = document.getElementById('recaptcha-container')
      if (container) container.innerHTML = ''

      if (err?.code === 'auth/operation-not-allowed') {
        setError('Phone auth is disabled in Firebase Console.')
      } else if (err?.code === 'auth/quota-exceeded') {
        setError('SMS quota exceeded. Please sign in with your password.')
      } else {
        setError(err?.message || 'Failed to send OTP.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!confirmation) return setError('Please request OTP again.')
    try {
      setLoading(true)
      const credential = await confirmation.confirm(otp)
      const idToken = await credential.user.getIdToken()
      const { data } = await api.post('/auth/login', {
        enrollmentNo: enrollmentNo.toUpperCase().trim(),
        idToken,
      })
      setAuth(data.user, data.accessToken)
      navigate('/home')
    } catch (err: any) {
      console.error('OTP login error:', err)
      if (err?.code === 'auth/invalid-verification-code') {
        setError('Wrong OTP. Please check and try again.')
      } else if (err?.code === 'auth/code-expired') {
        setError('OTP expired. Please request a new one.')
      } else {
        const msg = typeof err?.response?.data?.message === 'string'
          ? err.response.data.message
          : (typeof err?.response?.data?.error === 'string'
              ? err.response.data.error
              : (typeof err?.message === 'string' ? err.message : 'Login failed.'))
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      {/* Invisible reCAPTCHA container for OTP fallback */}
      <div id="recaptcha-container" />

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
          <p className="text-gray-500 mt-1">VIT OLX — Student Marketplace</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          {authMode === 'password' ? (
            /* PASSWORD LOGIN FORM */
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Hash className="w-4 h-4 inline mr-1 text-gray-500" />
                  Enrollment Number
                </label>
                <input
                  value={enrollmentNo}
                  onChange={e => setEnrollmentNo(e.target.value.toUpperCase())}
                  placeholder="26MCA10020"
                  maxLength={10}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Lock className="w-4 h-4 inline mr-1 text-gray-500" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 shadow-md shadow-blue-500/10 cursor-pointer"
              >
                {loading ? 'Signing In…' : 'Sign In'}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('otp')
                    setOtpStep('credentials')
                    setError('')
                  }}
                  className="text-xs text-gray-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Or sign in with Phone OTP
                </button>
              </div>
            </form>
          ) : (
            /* PHONE OTP FALLBACK FLOW */
            <div>
              {otpStep === 'credentials' ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" /> Phone OTP Sign In
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Hash className="w-4 h-4 inline mr-1 text-gray-500" />
                      Enrollment Number
                    </label>
                    <input
                      value={enrollmentNo}
                      onChange={e => setEnrollmentNo(e.target.value.toUpperCase())}
                      placeholder="26MCA10020"
                      maxLength={10}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Phone className="w-4 h-4 inline mr-1 text-gray-500" />
                      Phone Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">+91</span>
                      <input
                        type="tel"
                        value={phone.replace('+91', '')}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="9876543210"
                        className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? 'Sending OTP…' : 'Send OTP'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('password')
                      setError('')
                    }}
                    className="w-full text-sm text-gray-500 hover:text-gray-800 pt-1"
                  >
                    ← Back to Password Sign In
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-5">
                  <div className="text-center mb-2">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Phone className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-600">OTP sent to <strong>{phone}</strong></p>
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

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? 'Signing In…' : 'Sign In'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('credentials')
                      setOtp('')
                      setError('')
                    }}
                    className="w-full text-sm text-gray-500 hover:text-blue-600"
                  >
                    ← Back
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="border-t border-gray-100 mt-6 pt-5 text-center">
            <p className="text-sm text-gray-500">
              New student?{' '}
              <Link to="/register" className="text-blue-600 font-semibold hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
