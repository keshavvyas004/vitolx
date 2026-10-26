import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Send, ArrowLeft, MessageSquare, ShoppingBag, Clock } from 'lucide-react'
import { io } from 'socket.io-client'
import api from '@/api/axios'
import useAuthStore from '@/store/authStore'
import { formatDate } from '@/lib/utils'

export default function Chat() {
  const { search } = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(search)
  const productId = params.get('product')
  const otherUserId = params.get('seller') || params.get('user')
  const { user } = useAuthStore()

  // Inbox list state
  const [conversations, setConversations] = useState<any[]>([])
  const [inboxLoading, setInboxLoading] = useState(true)

  // Active chat state
  const [messages, setMessages] = useState<any[]>([])
  const [activeProduct, setActiveProduct] = useState<any>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load conversations inbox
  useEffect(() => {
    api.get('/chat/conversations/my')
      .then(r => setConversations(r.data))
      .catch(() => {})
      .finally(() => setInboxLoading(false))
  }, [productId, otherUserId])

  // Load active chat when productId and otherUserId are present
  useEffect(() => {
    if (!productId || !otherUserId) return

    setLoading(true)
    // Fetch product info for the top header
    api.get(`/products/${productId}`)
      .then(r => setActiveProduct(r.data))
      .catch(() => {})

    // Fetch message history
    api.get(`/chat/${productId}/${otherUserId}`)
      .then(r => setMessages(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))

    const socketUrl = import.meta.env.VITE_API_URL || '/'
    const socket = io(socketUrl, { withCredentials: true })
    socket.emit('join_user', user?.id)
    socket.on('new_message', (msg: any) => {
      if (msg.product === productId || msg.product?._id === productId) {
        setMessages(prev => [...prev, msg])
      }
    })

    return () => { socket.disconnect() }
  }, [productId, otherUserId, user?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !productId || !otherUserId) return
    const messageText = text.trim()
    setText('')

    try {
      const { data } = await api.post('/chat', {
        productId,
        receiverId: otherUserId,
        text: messageText,
      })
      setMessages(prev => [...prev, data])
    } catch (err: any) {
      console.error('Failed to send message:', err)
    }
  }

  // View: Conversation List (Inbox)
  if (!productId || !otherUserId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-500 mt-0.5">Chat with buyers and sellers</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        {inboxLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 p-8 shadow-xs">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No conversations yet</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
              When you browse items, click "Chat with Seller" to ask questions or discuss deals.
            </p>
            <Link
              to="/home"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
            >
              Browse Campus Listings
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {conversations.map((c) => {
              const product = c.product
              const other = c.otherUser
              return (
                <Link
                  key={`${c.productId}-${other?._id}`}
                  to={`/chat?product=${c.productId}&seller=${other?._id}`}
                  className="flex items-center gap-4 bg-white border border-gray-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="relative w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                    {product?.images?.[0]?.url ? (
                      <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-gray-900 truncate text-sm">{other?.name}</p>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(c.lastMessage?.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 font-medium truncate mt-0.5">
                      {product?.title || 'Campus Item'}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {c.lastMessage?.text}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs font-bold flex items-center justify-center">
                      {c.unread}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // View: Active Chat
  return (
    <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col h-[calc(100vh-4.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/chat')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600"
            title="Back to inbox"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-gray-900 truncate text-base">
              {activeProduct?.seller?._id === otherUserId ? activeProduct?.seller?.name : 'Chat'}
            </h1>
            {activeProduct && (
              <Link to={`/product/${activeProduct._id}`} className="text-xs text-blue-600 hover:underline truncate block">
                Item: {activeProduct.title}
              </Link>
            )}
          </div>
        </div>

        {activeProduct && (
          <Link
            to={`/product/${activeProduct._id}`}
            className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors text-xs font-semibold text-gray-700"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
            View Item
          </Link>
        )}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1">
        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-16 bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-4xl mb-2">💬</p>
            <p className="text-sm font-semibold text-gray-700">Start the conversation</p>
            <p className="text-xs mt-1 text-gray-400">Ask questions about pickup point, condition, or timings.</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const senderId = msg.sender?._id || msg.sender?.id || msg.sender
            const isMe = String(senderId) === String(user?.id)

            return (
              <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs sm:max-w-md px-4 py-2.5 rounded-2xl text-sm shadow-2xs ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-white border border-gray-200 text-gray-900 rounded-bl-xs'
                  }`}
                >
                  {!isMe && (
                    <p className="text-[11px] font-bold mb-1 text-blue-600">
                      {msg.sender?.name || 'Student'}
                    </p>
                  )}
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 bg-white border border-gray-200 rounded-2xl p-2 shadow-xs">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type your message…"
          className="flex-1 px-3 py-2 text-sm focus:outline-none bg-transparent"
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
