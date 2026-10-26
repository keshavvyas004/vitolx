const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// In-memory OTP store (use Redis in production)
const otpStore = new Map(); // key: phone → { otp, expiresAt }

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

async function sendOTP(phone) {
  const otp = generateOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(phone, { otp, expiresAt });

  console.log('\n==================================================');
  console.log(`🔑 [VIT OLX] OTP for ${phone}: ${otp}`);
  console.log('==================================================\n');

  try {
    await client.messages.create({
      body: `Your VIT OLX verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    console.log(`✅ Twilio SMS sent successfully to ${phone}`);
  } catch (err) {
    console.warn(`⚠️ Twilio SMS notice (${err.message})`);
    console.warn(`👉 For development/testing, you can enter the OTP displayed above: ${otp}`);
  }

  return { success: true, otp };
}

function verifyOTP(phone, inputOtp) {
  const record = otpStore.get(phone);
  if (!record) return { valid: false, reason: 'OTP not found. Please request a new one.' };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    return { valid: false, reason: 'OTP expired. Please request a new one.' };
  }
  if (record.otp !== inputOtp) {
    return { valid: false, reason: 'Invalid OTP.' };
  }
  otpStore.delete(phone);
  return { valid: true };
}

module.exports = { sendOTP, verifyOTP };
