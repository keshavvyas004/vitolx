const express = require('express');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { uploadImages, uploadVideo, cloudinary } = require('../middleware/upload');

const router = express.Router();

// Utility: parse multer files into standard URL format
function parseFiles(files) {
  return files.map((f) => ({
    url: f.filename ? `/uploads/${f.filename}` : f.path,
    publicId: f.filename || f.path,
  }));
}

// GET /api/products — browse listings (auth required)
router.get('/', protect, async (req, res) => {
  try {
    const {
      search, category, condition, saleType,
      minPrice, maxPrice, sort = 'newest', page = 1, limit = 12,
    } = req.query;

    const filter = { status: 'active' };
    if (search) filter.$text = { $search: search };
    if (category) filter.category = category;
    if (condition) filter.condition = condition;
    if (saleType) filter.saleType = saleType;
    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = Number(minPrice);
      if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
    }

    const sortMap = {
      newest: { createdAt: -1 },
      price_asc: { basePrice: 1 },
      price_desc: { basePrice: -1 },
      most_bids: { bidCount: -1 },
      ending_soon: { auctionEndAt: 1 },
    };

    const products = await Product.find(filter)
      .sort(sortMap[sort] || sortMap.newest)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('seller', 'name year department enrollmentNo')
      .select('-buyer'); // never expose buyer here

    const total = await Product.countDocuments(filter);
    res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/products/:id — product detail
router.get('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name year department enrollmentNo')
      .populate('highestBidder', 'name enrollmentNo');

    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Increment views
    product.views += 1;
    await product.save();

    // Never expose seller phone or buyer info
    const productObj = product.toObject();
    delete productObj.buyer;

    res.json(productObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/products — create listing
// Images uploaded separately from video to handle multer limits
router.post('/', protect, (req, res, next) => {
  uploadImages(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const {
      title, description, category, condition,
      basePrice, saleType, auctionEndAt, minBidIncrement, videoUrl, videoPublicId,
    } = req.body;

    // Validate auction end date
    if (saleType === 'auction') {
      if (!auctionEndAt) return res.status(400).json({ message: 'Auction end date required' });
      if (new Date(auctionEndAt) <= new Date()) {
        return res.status(400).json({ message: 'Auction end date must be in the future' });
      }
    }

    const images = req.files ? parseFiles(req.files) : [];
    if (images.length === 0) return res.status(400).json({ message: 'At least one image required' });

    const product = await Product.create({
      seller: req.user._id,
      title,
      description,
      category,
      condition,
      images,
      video: videoUrl ? { url: videoUrl, publicId: videoPublicId } : undefined,
      basePrice: Number(basePrice),
      saleType,
      auctionEndAt: saleType === 'auction' ? new Date(auctionEndAt) : null,
      currentBid: saleType === 'auction' ? Number(basePrice) : 0,
      minBidIncrement: minBidIncrement ? Number(minBidIncrement) : 10,
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/products/upload-video — upload video separately, get URL back
router.post('/upload-video', protect, (req, res, next) => {
  uploadVideo(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No video uploaded' });
  const url = req.file.filename ? `/uploads/${req.file.filename}` : req.file.path;
  res.json({ url, publicId: req.file.filename || req.file.path });
});

// PATCH /api/products/:id — update listing (seller only)
router.patch('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your listing' });
    }
    if (product.status !== 'active') {
      return res.status(400).json({ message: 'Cannot edit a non-active listing' });
    }

    const allowed = ['title', 'description', 'condition', 'minBidIncrement', 'auctionEndAt'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) product[field] = req.body[field];
    });
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/products/:id — cancel listing
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your listing' });
    }
    if (['payment_pending', 'sold'].includes(product.status)) {
      return res.status(400).json({ message: 'Cannot cancel a completed/pending sale' });
    }

    // Delete media from Cloudinary
    for (const img of product.images) {
      await cloudinary.uploader.destroy(img.publicId);
    }
    if (product.video?.publicId) {
      await cloudinary.uploader.destroy(product.video.publicId, { resource_type: 'video' });
    }

    await product.deleteOne();
    res.json({ message: 'Listing removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/products/seller/my-listings
router.get('/seller/my-listings', protect, async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user._id })
      .sort({ createdAt: -1 })
      .select('-buyer');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/products/seed — populate sample campus listings
router.post('/seed', protect, async (req, res) => {
  try {
    const sampleProducts = [
      {
        seller: req.user._id,
        title: 'Casio fx-991EX Classwiz Scientific Calculator',
        description: 'Original Casio Classwiz calculator in pristine condition. Used for 1 semester in Engineering Maths. Dual power (solar + battery) with fast processor.',
        category: 'Electronics',
        condition: 'Like New',
        images: [{ url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800&auto=format&fit=crop&q=60', publicId: 'sample1' }],
        basePrice: 850,
        saleType: 'fixed',
      },
      {
        seller: req.user._id,
        title: 'Higher Engineering Mathematics by B.S. Grewal (44th Ed)',
        description: 'Essential textbook for 1st & 2nd year B.Tech students. All pages intact, no scribbles, formula sheet included.',
        category: 'Books',
        condition: 'Good',
        images: [{ url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60', publicId: 'sample2' }],
        basePrice: 420,
        saleType: 'fixed',
      },
      {
        seller: req.user._id,
        title: 'boAt Rockerz 450 Bluetooth On-Ear Headphones',
        description: 'Matte black wireless headphones with 15 hours battery life. Deep bass, super lightweight, perfect for late night study sessions.',
        category: 'Electronics',
        condition: 'Like New',
        images: [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=60', publicId: 'sample3' }],
        basePrice: 700,
        saleType: 'auction',
        auctionEndAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        currentBid: 700,
        minBidIncrement: 50,
      },
      {
        seller: req.user._id,
        title: 'Ergonomic Hostel Study Chair with Mesh Back',
        description: 'Comfortable breathable study chair with armrests and height adjustment. Moving out of hostel so selling at a discounted price.',
        category: 'Furniture',
        condition: 'Good',
        images: [{ url: 'https://images.unsplash.com/photo-1580481077197-0f8d0a9228ad?w=800&auto=format&fit=crop&q=60', publicId: 'sample4' }],
        basePrice: 1400,
        saleType: 'auction',
        auctionEndAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
        currentBid: 1400,
        minBidIncrement: 100,
      },
      {
        seller: req.user._id,
        title: 'Chemistry / Biotech Lab Coat (Size L) & Safety Goggles',
        description: 'Clean white lab coat washed and sanitized. Heavy cotton fabric, suitable for all semester laboratory courses.',
        category: 'Clothing',
        condition: 'Fair',
        images: [{ url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=60', publicId: 'sample5' }],
        basePrice: 280,
        saleType: 'fixed',
      },
    ];

    const created = await Product.insertMany(sampleProducts);
    res.json({ message: 'Sample listings seeded successfully', count: created.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
