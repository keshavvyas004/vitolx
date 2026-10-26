const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const fs = require('fs');

let authInstance = null;
let initError = null;

// Initialize lazily — do NOT throw at startup, only when actually used
function initAuth() {
  if (authInstance) return authInstance;
  if (initError) throw initError;

  let serviceAccount;
  try {
    const filePath = path.join(__dirname, '../firebase-service-account.json');
    if (fs.existsSync(filePath)) {
      serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      throw new Error('Firebase service account not configured. Set FIREBASE_SERVICE_ACCOUNT env variable on Vercel.');
    }

    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp({
      credential: cert(serviceAccount),
    });

    authInstance = getAuth(app);
    return authInstance;
  } catch (err) {
    initError = err;
    throw err;
  }
}

// Verify a Firebase Phone Auth ID token and return the phone number
async function verifyFirebaseToken(idToken) {
  const auth = initAuth();
  const decoded = await auth.verifyIdToken(idToken);
  return {
    phone: decoded.phone_number, // e.g. "+918890701038"
    uid: decoded.uid,
  };
}

module.exports = { verifyFirebaseToken };
