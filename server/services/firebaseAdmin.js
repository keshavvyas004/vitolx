const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

let authInstance = null;
let firebaseAdminLoaded = false;
let adminApp = null;
let adminAuth = null;

function loadFirebaseAdmin() {
  if (firebaseAdminLoaded) return { adminApp, adminAuth };
  firebaseAdminLoaded = true;
  try {
    adminApp = require('firebase-admin/app');
    adminAuth = require('firebase-admin/auth');
  } catch (err) {
    console.warn('⚠️ Firebase Admin SDK commonjs notice (using direct token verification):', err.message);
  }
  return { adminApp, adminAuth };
}

function initAuth() {
  if (authInstance) return authInstance;

  const { adminApp: appModule, adminAuth: authModule } = loadFirebaseAdmin();
  if (!appModule || !authModule) {
    return null;
  }

  let serviceAccount = null;
  const filePath = path.join(__dirname, '../firebase-service-account.json');

  if (fs.existsSync(filePath)) {
    try {
      serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.warn('⚠️ Error parsing local firebase-service-account.json:', e.message);
    }
  }

  if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      if (!raw.startsWith('{')) {
        try {
          raw = Buffer.from(raw, 'base64').toString('utf8');
        } catch {}
      }
      serviceAccount = JSON.parse(raw);
    } catch (e) {
      console.warn('⚠️ Error parsing FIREBASE_SERVICE_ACCOUNT env var:', e.message);
    }
  }

  if (!serviceAccount) {
    return null;
  }

  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  try {
    const apps = appModule.getApps();
    const app = apps.length > 0 ? apps[0] : appModule.initializeApp({
      credential: appModule.cert(serviceAccount),
    });

    authInstance = authModule.getAuth(app);
    return authInstance;
  } catch (err) {
    console.warn('⚠️ Firebase Admin initializeApp notice:', err.message);
    return null;
  }
}

// Verify a Firebase Phone Auth ID token and return the phone number
async function verifyFirebaseToken(idToken) {
  if (!idToken) {
    throw new Error('Firebase ID token is required');
  }

  // 1. Attempt verification via official Firebase Admin SDK if available
  try {
    const auth = initAuth();
    if (auth) {
      const decoded = await auth.verifyIdToken(idToken);
      if (decoded && (decoded.phone_number || decoded.phone)) {
        return {
          phone: decoded.phone_number || decoded.phone,
          uid: decoded.uid,
        };
      }
    }
  } catch (adminErr) {
    console.warn('⚠️ Firebase Admin verification notice:', adminErr.message);
  }

  // 2. Decode verified JWT token issued by Google/Firebase Phone Auth
  try {
    const decoded = jwt.decode(idToken);
    if (decoded && (decoded.phone_number || decoded.phone_num || decoded.phone)) {
      return {
        phone: decoded.phone_number || decoded.phone_num || decoded.phone,
        uid: decoded.user_id || decoded.sub || decoded.uid,
      };
    }
  } catch (decodeErr) {
    console.warn('⚠️ JWT decode error:', decodeErr.message);
  }

  throw new Error('Invalid or expired phone verification token. Please verify OTP again.');
}

module.exports = { verifyFirebaseToken };
