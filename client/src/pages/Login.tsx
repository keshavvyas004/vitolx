import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Phone, Hash } from 'lucide-react'
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import api from '@/api/axios'
import useAuthStore from '@/store/authStore'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [enrollmentNo, setEnrollmentNo] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)

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
    if (!/^\d{2}[A-Z]{3}\d{5}$/.test(enrollmentNo.toUpperCase())) {
      return setError('Invalid enrollment number (e.g. 26MCA10020)')
    }
    const phoneFormatted = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '')}`
    try {
      setLoading(true)
      const verifier = setupRecaptcha()
      const result = await signInWithPhoneNumber(auth, phoneFormatted, verifier)
      setConfirmation(result)
      setPhone(phoneFormatted)
      setStep('otp')
    } catch (err: any) {
      console.error('Send OTP error:', err)
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

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!confirmation) return setError('Please go back and request OTP again.')
    try {
      setLoading(true)
      // Verify OTP with Firebase
      const credential = await confirmation.confirm(otp)
      // Get Firebase ID token
      const idToken = await credential.user.getIdToken()
      // Send to backend to log in
      const { data } = await api.post('/auth/login', {
        enrollmentNo: enrollmentNo.toUpperCase(),
        idToken,
      })
      setAuth(data.user, data.accessToken)
      navigate('/home')
    } catch (err: any) {
      console.error('Login error:', err)
      if (err?.code === 'auth/invalid-verification-code') {
        setError('Wrong OTP. Please check and try again.')
      } else if (err?.code === 'auth/code-expired') {
        setError('OTP expired. Please go back and request a new one.')
      } else if (err?.response?.data?.message) {
        setError(err.response.data.message)
      } else if (err?.message) {
        setError(err.message)
      } else {
        setError('Login failed. Please try again.')
      }
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
          <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
          <p className="text-gray-500 mt-1">VIT OLX — students only</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {step === 'credentials' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Hash className="w-4 h-4 inline mr-1" />Enrollment Number
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
                  <Phone className="w-4 h-4 inline mr-1" />Phone Number
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

              {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <button
                type="submit" disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {loading ? 'Sending OTP…' : 'Send OTP'}
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

              {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <button
                type="submit" disabled={loading || otp.length !== 6}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {loading ? 'Signing In…' : 'Sign In'}
              </button>
              <button type="button" onClick={() => { setStep('credentials'); setOtp(''); setError('') }} className="w-full text-sm text-gray-500 hover:text-blue-600">
                ← Back
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            New student?{' '}
            <Link to="/register" className="text-blue-600 font-semibold hover:underline">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
