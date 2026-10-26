const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyFirebaseToken } = require('../services/firebaseAdmin');
const { protect } = require('../middleware/auth');

const router = express.Router();

function generateTokens(userId) {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
}

function setCookieAndRespond(res, user, statusCode = 200) {
  const { accessToken, refreshToken } = generateTokens(user._id);
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.status(statusCode).json({
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      enrollmentNo: user.enrollmentNo,
      year: user.year,
      department: user.department,
      role: user.role,
      upiId: user.upiId,
    },
  });
}

// POST /api/auth/register
// Firebase Phone Auth: receives idToken from frontend after OTP verified by Firebase + password
router.post('/register', async (req, res) => {
  try {
    const { enrollmentNo, name, year, department, upiId, password, idToken } = req.body;

    if (!idToken) return res.status(400).json({ message: 'Phone verification (OTP) required' });

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Enrollment format: 26MCA10020
    if (!/^\d{2}[A-Z]{3}\d{5}$/.test(enrollmentNo?.toUpperCase())) {
      return res.status(400).json({ message: 'Invalid enrollment number (e.g. 26MAS10012)' });
    }

    // Verify Firebase token → get verified phone number
    const { phone } = await verifyFirebaseToken(idToken);
    if (!phone) return res.status(400).json({ message: 'Phone verification failed' });

    // Check for existing account
    const exists = await User.findOne({
      $or: [{ enrollmentNo: enrollmentNo.toUpperCase() }, { phone }],
    });
    if (exists) {
      return res.status(409).json({ message: 'Enrollment number or phone already registered' });
    }

    const user = await User.create({
      enrollmentNo: enrollmentNo.toUpperCase(),
      name,
      phone,
      year,
      department,
      upiId: upiId || null,
      password,
    });

    setCookieAndRespond(res, user, 201);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login
// Supports:
// 1. Password login: { enrollmentNo, password } (Instant, no OTP required for returning students)
// 2. OTP login fallback: { enrollmentNo, idToken } (Phone OTP verification via Firebase)
router.post('/login', async (req, res) => {
  try {
    const { enrollmentNo, password, idToken } = req.body;

    if (!enrollmentNo) {
      return res.status(400).json({ message: 'Enrollment number is required' });
    }

    const formattedEnrollment = enrollmentNo.toUpperCase().trim();

    // Mode 1: Password Login
    if (password) {
      const user = await User.findOne({ enrollmentNo: formattedEnrollment });
      if (!user) {
        return res.status(404).json({ message: 'Student not found. Please register first.' });
      }
      if (!user.isActive) {
        return res.status(403).json({ message: 'Account deactivated. Contact admin.' });
      }

      // If user registered earlier without a password, set entered password on first login
      if (!user.password) {
        user.password = password;
        await user.save();
        return setCookieAndRespond(res, user);
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect password. Please try again.' });
      }

      return setCookieAndRespond(res, user);
    }

    // Mode 2: Firebase Phone OTP Login fallback
    if (idToken) {
      const { phone } = await verifyFirebaseToken(idToken);
      if (!phone) return res.status(400).json({ message: 'Phone verification failed' });

      const user = await User.findOne({
        enrollmentNo: formattedEnrollment,
        phone,
      });
      if (!user) return res.status(404).json({ message: 'Student not found. Please register first.' });
      if (!user.isActive) return res.status(403).json({ message: 'Account deactivated. Contact admin.' });

      return setCookieAndRespond(res, user);
    }

    return res.status(400).json({ message: 'Password or Phone OTP required' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message || 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token' });
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const { accessToken } = generateTokens(decoded.id);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ message: 'Refresh token invalid or expired' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    enrollmentNo: req.user.enrollmentNo,
    year: req.user.year,
    department: req.user.department,
    role: req.user.role,
    upiId: req.user.upiId,
    totalEarnings: req.user.totalEarnings,
    totalSpent: req.user.totalSpent,
  });
});

// PATCH /api/auth/update-profile
router.patch('/update-profile', protect, async (req, res) => {
  try {
    const { name, year, department, upiId } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { name, year, department, upiId },
      { new: true, runValidators: true }
    ).select('-phone -razorpayContactId -razorpayFundAccountId');
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
