const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 2000 },
    category: {
      type: String,
      required: true,
      enum: ['Electronics', 'Books', 'Furniture', 'Clothing', 'Appliances', 'Sports', 'Stationery', 'Other'],
    },
    condition: {
      type: String,
      required: true,
      enum: ['New', 'Like New', 'Good', 'Fair'],
    },
    images: [{ url: String, publicId: String }], // up to 5 images
    video: { url: String, publicId: String },     // 1 working-condition video
    basePrice: { type: Number, required: true, min: 1 },
    saleType: { type: String, enum: ['fixed', 'auction'], required: true },
    // Auction fields
    auctionEndAt: { type: Date, default: null },       // custom date set by seller
    currentBid: { type: Number, default: 0 },
    minBidIncrement: { type: Number, default: 10 },
    highestBidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    bidCount: { type: Number, default: 0 },
    // Status
    status: {
      type: String,
      enum: ['active', 'auction_ended', 'payment_pending', 'sold', 'cancelled'],
      default: 'active',
    },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Full-text search index
productSchema.index({ title: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model('Product', productSchema);
