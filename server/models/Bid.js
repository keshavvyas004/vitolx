const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    isWinning: { type: Boolean, default: false },
    isAccepted: { type: Boolean, default: false }, // seller accepted this bid
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bid', bidSchema);
