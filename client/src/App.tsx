import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Home from '@/pages/Home'
import ProductDetail from '@/pages/ProductDetail'
import AddProduct from '@/pages/AddProduct'
import OrderSuccess from '@/pages/OrderSuccess'
import MyListings from '@/pages/MyListings'
import MyBids from '@/pages/MyBids'
import MyOrders from '@/pages/MyOrders'
import Chat from '@/pages/Chat'
import Profile from '@/pages/Profile'
import Admin from '@/pages/Admin'
import useAuthStore from '@/store/authStore'
import { useSocket } from '@/hooks/useSocket'

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

// Admin only wrapper
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/home" replace />
  return <>{children}</>
}

function AppLayout({ children }: { children: React.ReactNode }) {
  useSocket() // initialize socket connection when logged in
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  )
}

export default function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={isAuthenticated ? <Navigate to="/home" replace /> : <Landing />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/home" replace /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/home" replace /> : <Register />} />

        {/* Protected routes — wrapped in layout with Navbar */}
        <Route path="/home" element={
          <ProtectedRoute><AppLayout><Home /></AppLayout></ProtectedRoute>
        } />
        <Route path="/product/:id" element={
          <ProtectedRoute><AppLayout><ProductDetail /></AppLayout></ProtectedRoute>
        } />
        <Route path="/sell" element={
          <ProtectedRoute><AppLayout><AddProduct /></AppLayout></ProtectedRoute>
        } />
        <Route path="/order-success/:id" element={
          <ProtectedRoute><AppLayout><OrderSuccess /></AppLayout></ProtectedRoute>
        } />
        <Route path="/my-listings" element={
          <ProtectedRoute><AppLayout><MyListings /></AppLayout></ProtectedRoute>
        } />
        <Route path="/my-bids" element={
          <ProtectedRoute><AppLayout><MyBids /></AppLayout></ProtectedRoute>
        } />
        <Route path="/my-orders" element={
          <ProtectedRoute><AppLayout><MyOrders /></AppLayout></ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute><AppLayout><Chat /></AppLayout></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>
        } />

        {/* Admin only */}
        <Route path="/admin" element={
          <AdminRoute><AppLayout><Admin /></AppLayout></AdminRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
