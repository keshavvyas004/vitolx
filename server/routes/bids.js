const express = require('express');
const Bid = require('../models/Bid');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /api/bids — place a bid
router.post('/', protect, async (req, res) => {
  try {
    const { productId, amount } = req.body;
    const product = await Product.findById(productId);

    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.saleType !== 'auction') return res.status(400).json({ message: 'This item is not for auction' });
    if (product.status !== 'active') return res.status(400).json({ message: 'Auction is not active' });
    if (new Date() > new Date(product.auctionEndAt)) return res.status(400).json({ message: 'Auction has ended' });
    if (product.seller.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot bid on your own item' });
    }

    const minRequired = product.currentBid + product.minBidIncrement;
    if (amount < minRequired) {
      return res.status(400).json({ message: `Minimum bid is ₹${minRequired}` });
    }

    // Mark previous winning bid as not winning
    await Bid.updateMany({ product: productId, isWinning: true }, { isWinning: false });

    const bid = await Bid.create({
      product: productId,
      bidder: req.user._id,
      amount,
      isWinning: true,
    });

    // Update product
    product.currentBid = amount;
    product.highestBidder = req.user._id;
    product.bidCount += 1;
    await product.save();

    // Emit to socket room
    const io = req.app.get('io');
    if (io) {
      io.to(`product:${productId}`).emit('new_bid', {
        bid: {
          id: bid._id,
          amount: bid.amount,
          bidder: { name: req.user.name, enrollmentNo: req.user.enrollmentNo },
          createdAt: bid.createdAt,
        },
        currentBid: product.currentBid,
        bidCount: product.bidCount,
      });
    }

    res.status(201).json({ message: 'Bid placed', currentBid: product.currentBid });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bids/:productId — get bids for a product
router.get('/:productId', protect, async (req, res) => {
  try {
    const bids = await Bid.find({ product: req.params.productId })
      .sort({ amount: -1 })
      .limit(20)
      .populate('bidder', 'name enrollmentNo year department');
    res.json(bids);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/bids/:bidId/accept — seller accepts a bid
router.post('/:bidId/accept', protect, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.bidId).populate('product');
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    const product = bid.product;
    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the seller can accept bids' });
    }
    if (product.status !== 'active') return res.status(400).json({ message: 'Product is no longer active' });

    bid.isAccepted = true;
    await bid.save();

    product.status = 'payment_pending';
    product.highestBidder = bid.bidder;
    product.currentBid = bid.amount;
    await product.save();

    // Notify winning bidder
    const acceptIo = req.app.get('io');
    if (acceptIo) {
      acceptIo.to(`user:${bid.bidder}`).emit('bid_accepted', {
        productId: product._id,
        productTitle: product.title,
        amount: bid.amount,
      });
    }

    res.json({ message: 'Bid accepted. Buyer notified to complete payment.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bids/my/bids — buyer's bid history
router.get('/my/bids', protect, async (req, res) => {
  try {
    const bids = await Bid.find({ bidder: req.user._id })
      .sort({ createdAt: -1 })
      .populate('product', 'title images basePrice currentBid status auctionEndAt saleType');
    res.json(bids);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
