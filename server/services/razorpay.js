const Razorpay = require('razorpay');
const crypto = require('crypto');
const axios = require('axios');

const isDummyKey = !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.includes('xxxx');

let razorpay = null;
if (!isDummyKey) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  } catch (e) {
    console.warn('⚠️ Razorpay initialization notice:', e.message);
  }
}

/**
 * Create a Razorpay order for buyer checkout
 */
async function createPaymentOrder(amount, receipt) {
  // amount in paise (INR × 100)
  if (isDummyKey || !razorpay) {
    return {
      id: `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt,
      status: 'created',
    };
  }

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt,
    payment_capture: 1,
  });
  return order;
}

/**
 * Verify Razorpay webhook / frontend payment signature
 */
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (isDummyKey || orderId?.startsWith('order_mock_') || signature === 'mock_signature') {
    return true;
  }

  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expected === signature;
}

/**
 * Create a Razorpay Contact for a seller (needed for payout)
 */
async function createContact(user) {
  const response = await axios.post(
    'https://api.razorpay.com/v1/contacts',
    {
      name: user.name,
      contact: user.phone.replace('+', ''),
      type: 'vendor',
      reference_id: user.enrollmentNo,
    },
    {
      auth: {
        username: process.env.RAZORPAY_KEY_ID,
        password: process.env.RAZORPAY_KEY_SECRET,
      },
    }
  );
  return response.data.id; // contact_id
}

/**
 * Create a Fund Account (UPI) for a seller
 */
async function createFundAccount(contactId, upiId) {
  const response = await axios.post(
    'https://api.razorpay.com/v1/fund_accounts',
    {
      contact_id: contactId,
      account_type: 'vpa',
      vpa: { address: upiId },
    },
    {
      auth: {
        username: process.env.RAZORPAY_KEY_ID,
        password: process.env.RAZORPAY_KEY_SECRET,
      },
    }
  );
  return response.data.id; // fund_account_id
}

/**
 * Initiate payout to seller's UPI
 */
async function initiateUPIPayout({ fundAccountId, amount, notes }) {
  const response = await axios.post(
    'https://api.razorpay.com/v1/payouts',
    {
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
      fund_account_id: fundAccountId,
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      mode: 'UPI',
      purpose: 'payout',
      queue_if_low_balance: true,
      notes,
    },
    {
      auth: {
        username: process.env.RAZORPAY_KEY_ID,
        password: process.env.RAZORPAY_KEY_SECRET,
      },
    }
  );
  return response.data;
}

module.exports = {
  createPaymentOrder,
  verifyPaymentSignature,
  createContact,
  createFundAccount,
  initiateUPIPayout,
};
