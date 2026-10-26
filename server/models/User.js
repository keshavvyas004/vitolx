const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    enrollmentNo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^\d{2}[A-Z]{3}\d{5}$/, 'Invalid enrollment number format (e.g. 26MAS10012)'],
    },
    name: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      unique: true,
      match: [/^\+91\d{10}$/, 'Phone must be in +91XXXXXXXXXX format'],
    },
    year: { type: String, enum: ['1st', '2nd', '3rd', '4th', 'PG1', 'PG2'], required: true },
    department: { type: String, required: true, trim: true },
    upiId: { type: String, trim: true, default: null },
    // Razorpay contact+fund account for auto-payout
    razorpayContactId: { type: String, default: null },
    razorpayFundAccountId: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    password: { type: String, default: null },
    totalEarnings: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
