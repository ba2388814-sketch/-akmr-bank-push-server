const express     = require('express');
const admin       = require('firebase-admin');
const bodyParser  = require('body-parser');
const cors        = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
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

function appMetaRef(appId) {
  return db.collection('push_app_meta').doc(appId);
}

app.get('/', (req, res) => {
  res.send('A K M R BANK PLC Push Notification Server is Running successfully!');
});

app.get('/debug', (req, res) => {
  res.json({
    status: true,
    message: 'A K M R BANK Server Connected',
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL
  });
});

app.post('/register-token', async (req, res) => {
  const { token, appId, userAgent } = req.body;

  if (!token)               return res.status(400).json({ success: false, error: 'token required' });
  if (!isValidAppId(appId)) return res.status(400).json({ success: false, error: 'valid appId required' });

  try {
    await devicesRef(appId).doc(tokenDocId(token)).set({
      token,
      appId,
      userAgent:    userAgent || '',
      registeredAt: Date.now(),
      updatedAt:    Date.now()
    }, { merge: true });

    res.json({ success: true, message: 'Token registered for A K M R BANK' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/send-notification', async (req, res) => {
  const { token, title, body, imageUrl } = req.body;
  if (!token) return res.status(400).json({ success: false, error: 'token required' });

  try {
    const t = title || 'A K M R BANK Notification';
    const b = body  || '';

    const payloadData = { title: t, body: b };
    if (imageUrl) payloadData.imageUrl = imageUrl;

    const message = {
      token,
      data: payloadData,
      android: { priority: 'high' }
    };

    const msgId = await admin.messaging().send(message);
    res.json({ success: true, messageId: msgId, message: 'Sent by A K M R BANK Server' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/send-all', async (req, res) => {
  const { appId, title, body, imageUrl } = req.body;
  if (!isValidAppId(appId)) return res.status(400).json({ success: false, error: 'valid appId required' });

  try {
    const snap = await devicesRef(appId).get();
    if (snap.empty) return res.json({ success: false, error: 'No tokens found for this app' });

    const tokens = snap.docs.map(d => d.data().token).filter(Boolean);
    const t = title || 'A K M R BANK Notification';
    const b = body  || '';

    const payloadData = { title: t, body: b };
    if (imageUrl) payloadData.imageUrl = imageUrl;

    const messages = tokens.map(token => ({
      token,
      data: payloadData,
      android: { priority: 'high' }
    }));

    const result = await admin.messaging().sendEach(messages);

    const batch = db.batch();
    let removed = 0;
    result.responses.forEach((r, i) => {
      if (!r.success) { batch.delete(snap.docs[i].ref); removed++; }
    });
    if (removed > 0) await batch.commit();

    res.json({
      success:      true,
      appId,
      total:        tokens.length,
      successCount: result.successCount,
      failureCount: result.failureCount,
      message:      'Broadcast processed by A K M R BANK Server'
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => console.log(`A K M R BANK Push Server running on port ${PORT}`));
