const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// GET /api/admin/stats — platform overview
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalProducts, totalOrders, revenueAgg] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Product.countDocuments(),
      Order.countDocuments({ paymentStatus: 'paid' }),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$platformEarned' } } },
      ]),
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;
    const activeListings = await Product.countDocuments({ status: 'active' });
    const soldListings = await Product.countDocuments({ status: 'sold' });

    res.json({ totalUsers, totalProducts, totalOrders, totalRevenue, activeListings, soldListings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/users — list all students
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = { role: 'student' };
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { enrollmentNo: new RegExp(search, 'i') },
      ];
    }
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('-razorpayContactId -razorpayFundAccountId');
    const total = await User.countDocuments(filter);
    res.json({ users, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/users/:id/deactivate
router.patch('/users/:id/deactivate', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deactivated', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/products — all listings
router.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = status ? { status } : {};
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('seller', 'name enrollmentNo phone');
    const total = await Product.countDocuments(filter);
    res.json({ products, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/products/:id — remove any listing
router.delete('/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/orders — revenue & payout tracking
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const orders = await Order.find({ paymentStatus: 'paid' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('product', 'title')
      .populate('buyer', 'name enrollmentNo')
      .populate('seller', 'name enrollmentNo phone upiId');
    const total = await Order.countDocuments({ paymentStatus: 'paid' });
    res.json({ orders, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
