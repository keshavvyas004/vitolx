const express = require('express');
const Message = require('../models/Message');
const Product = require('../models/Product');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/chat/:productId/:otherUserId — get conversation
router.get('/:productId/:otherUserId', protect, async (req, res) => {
  try {
    const { productId, otherUserId } = req.params;
    const messages = await Message.find({
      product: productId,
      $or: [
        { sender: req.user._id, receiver: otherUserId },
        { sender: otherUserId, receiver: req.user._id },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name enrollmentNo')
      .populate('receiver', 'name enrollmentNo');

    // Mark as read
    await Message.updateMany(
      { product: productId, receiver: req.user._id, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/chat — send a message
router.post('/', protect, async (req, res) => {
  try {
    const { productId, receiverId, text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Message cannot be empty' });
    if (!receiverId) return res.status(400).json({ message: 'Receiver is required' });

    const message = await Message.create({
      product: productId,
      sender: req.user._id,
      receiver: receiverId,
      text: text.trim(),
    });

    const populated = await message.populate([
      { path: 'sender', select: 'name enrollmentNo' },
      { path: 'receiver', select: 'name enrollmentNo' },
    ]);

    // Emit to receiver's socket room
    req.app.get('io').to(`user:${receiverId}`).emit('new_message', populated);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/chat/conversations/my — list all conversations for current user
router.get('/conversations/my', protect, async (req, res) => {
  try {
    const rawConversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: req.user._id }, { receiver: req.user._id }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            product: '$product',
            otherUser: {
              $cond: [{ $eq: ['$sender', req.user._id] }, '$receiver', '$sender'],
            },
          },
          lastMessage: { $first: '$$ROOT' },
          unread: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$receiver', req.user._id] }, { $eq: ['$read', false] }] }, 1, 0],
            },
          },
        },
      },
    ]);

    const populated = await Promise.all(
      rawConversations.map(async (c) => {
        const [product, otherUser] = await Promise.all([
          Product.findById(c._id.product).select('title images basePrice status').lean(),
          User.findById(c._id.otherUser).select('name enrollmentNo year department').lean(),
        ]);
        return {
          productId: c._id.product,
          product,
          otherUser,
          lastMessage: c.lastMessage,
          unread: c.unread,
        };
      })
    );

    res.json(populated.filter(c => c.otherUser));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
