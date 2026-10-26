const express = require('express');
const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Bid = require('../models/Bid');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { calculateFees } = require('../middleware/feeCalculator');
const {
  createPaymentOrder,
  verifyPaymentSignature,
  createContact,
  createFundAccount,
  initiateUPIPayout,
} = require('../services/razorpay');

const router = express.Router();

// POST /api/orders/initiate — buyer initiates purchase (fixed price or after bid accepted)
router.post('/initiate', protect, async (req, res) => {
  try {
    const { productId, bidId } = req.body;

    const product = await Product.findById(productId).populate('seller');
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Determine price
    let basePrice = product.basePrice;
    let bid = null;

    if (product.saleType === 'auction') {
      if (!bidId) return res.status(400).json({ message: 'Bid ID required for auction' });
      bid = await Bid.findById(bidId);
      if (!bid || bid.bidder.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not your winning bid' });
      }
      if (!bid.isAccepted) return res.status(400).json({ message: 'Bid has not been accepted by seller' });
      basePrice = bid.amount;
    } else {
      // Fixed price — must be the buyer
      if (product.status !== 'active') return res.status(400).json({ message: 'Item no longer available' });
    }

    const fees = calculateFees(basePrice);

    // Create Razorpay order (buyer_total in paise)
    const receipt = `order_${Date.now()}`;
    const rzpOrder = await createPaymentOrder(fees.buyerTotal, receipt);

    // Create order in DB
    const order = await Order.create({
      product: product._id,
      buyer: req.user._id,
      seller: product.seller._id,
      bid: bid?._id || null,
      basePrice,
      buyerFee: fees.buyerFee,
      sellerFee: fees.sellerFee,
      buyerTotal: fees.buyerTotal,
      sellerReceives: fees.sellerReceives,
      platformEarned: fees.platformEarned,
      razorpayOrderId: rzpOrder.id,
    });

    // Mark product as payment pending
    product.status = 'payment_pending';
    product.buyer = req.user._id;
    await product.save();

    res.status(201).json({
      orderId: order._id,
      razorpayOrderId: rzpOrder.id,
      amount: fees.buyerTotal, // what buyer sees — no breakdown
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/orders/verify-payment — after Razorpay frontend callback
router.post('/verify-payment', protect, async (req, res) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const isValid = verifyPaymentSignature({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, signature: razorpaySignature });
    if (!isValid) return res.status(400).json({ message: 'Payment verification failed' });

    const order = await Order.findById(orderId).populate('seller buyer product');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.buyer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = razorpaySignature;
    order.paymentStatus = 'paid';
    order.status = 'paid';
    order.sellerPhoneRevealed = true;
    await order.save();

    // Mark product as sold
    const product = order.product;
    product.status = 'sold';
    await product.save();

    // Update stats
    await User.findByIdAndUpdate(order.buyer._id, { $inc: { totalSpent: order.buyerTotal } });
    await User.findByIdAndUpdate(order.seller._id, { $inc: { totalEarnings: order.sellerReceives } });

    // Initiate seller payout
    await triggerSellerPayout(order);

    res.json({
      message: 'Payment successful',
      orderId: order._id,
      sellerPhone: order.seller.phone, // ONLY revealed here after payment ✅
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Internal: Razorpay payout to seller
async function triggerSellerPayout(order) {
  try {
    const seller = await User.findById(order.seller);
    if (!seller.upiId) return; // admin will handle manually

    // Create contact + fund account if not exists
    let contactId = seller.razorpayContactId;
    let fundAccountId = seller.razorpayFundAccountId;

    if (!contactId) {
      contactId = await createContact(seller);
      seller.razorpayContactId = contactId;
    }
    if (!fundAccountId) {
      fundAccountId = await createFundAccount(contactId, seller.upiId);
      seller.razorpayFundAccountId = fundAccountId;
    }
    await seller.save();

    const payout = await initiateUPIPayout({
      fundAccountId,
      amount: order.sellerReceives,
      notes: { orderId: order._id.toString(), product: order.product.toString() },
    });

    order.payoutId = payout.id;
    order.payoutStatus = 'processing';
    order.status = 'payout_initiated';
    await order.save();
  } catch (err) {
    console.error('Payout failed:', err.message);
    // Payout failures are logged — admin can retry
  }
}

// GET /api/orders/:id — get order details (buyer only)
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('product', 'title images category condition')
      .populate('seller', 'name enrollmentNo year department')
      .populate('buyer', 'name enrollmentNo');

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.buyer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const response = order.toObject();
    // Remove financial internals from response
    delete response.buyerFee;
    delete response.sellerFee;
    delete response.platformEarned;
    delete response.sellerReceives;
    delete response.razorpaySignature;

    // Only add seller phone if paid
    if (order.status === 'paid' || order.status === 'payout_initiated' || order.status === 'completed') {
      const seller = await User.findById(order.seller._id).select('phone');
      response.sellerPhone = seller.phone;
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/orders/my/purchases
router.get('/my/purchases', protect, async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .sort({ createdAt: -1 })
      .populate('product', 'title images status')
      .populate('seller', 'name enrollmentNo')
      .select('-buyerFee -sellerFee -platformEarned -sellerReceives -razorpaySignature');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
