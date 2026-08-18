const express     = require('express');
const admin       = require('firebase-admin');
const bodyParser  = require('body-parser');
const cors        = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Base64 থেকে প্রাইভেট কি ডিকোড করে নেওয়া হচ্ছে, ফলে কোনো এরর আসবে না
const decodedPrivateKey = process.env.FIREBASE_PRIVATE_KEY_B64 
  ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY_B64, 'base64').toString('utf8')
  : undefined;

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: "pushserver-ff2b4",
    clientEmail: "firebase-adminsdk-fbsvc@pushserver-ff2b4.iam.gserviceaccount.com",
    privateKey: decodedPrivateKey
  })
});

const db = admin.firestore();

function isValidAppId(appId) {
  return appId && /^[a-zA-Z0-9._\-]{3,100}$/.test(appId);
}

function tokenDocId(token) {
  return token.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
}

function devicesRef(appId) {
  return db.collection('push_tokens').doc(appId).collection('devices');
}

app.get('/', (req, res) => {
  res.send('A K M R BANK PLC Push Notification Server is Running successfully!');
});

app.post('/register-token', async (req, res) => {
  const { token, appId, userAgent } = req.body;
  if (!token || !isValidAppId(appId)) return res.status(400).json({ success: false, error: 'invalid data' });

  try {
    await devicesRef(appId).doc(tokenDocId(token)).set({
      token, appId, userAgent: userAgent || '', registeredAt: Date.now()
    }, { merge: true });
    res.json({ success: true, message: 'Token registered' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => console.log(`A K M R BANK Server running on port ${PORT}`));
