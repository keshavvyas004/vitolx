const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bid: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid', default: null }, // null = fixed price

    // Pricing breakdown (hidden from frontend responses)
    basePrice: { type: Number, required: true },
    buyerFee: { type: Number, required: true },      // added on top
    sellerFee: { type: Number, required: true },     // deducted from seller
    buyerTotal: { type: Number, required: true },    // buyer pays this
    sellerReceives: { type: Number, required: true },// seller gets this
    platformEarned: { type: Number, required: true },// buyerFee + sellerFee

    // Razorpay payment (buyer → platform)
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },

    // Razorpay Payout (platform → seller UPI)
    payoutId: { type: String, default: null },
    payoutStatus: { type: String, enum: ['pending', 'processing', 'processed', 'failed'], default: 'pending' },

    // Order status
    status: {
      type: String,
      enum: ['awaiting_payment', 'paid', 'payout_initiated', 'completed', 'cancelled'],
      default: 'awaiting_payment',
    },

    // Seller contact revealed after payment
    sellerPhoneRevealed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
