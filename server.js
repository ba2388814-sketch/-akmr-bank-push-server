const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// সরাসরি মাল্টিলাইন ফরম্যাটে প্রাইভেট কি বসানো হলো যাতে কোনো এরর না আসে
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: "pushserver-ff2b4",
    clientEmail: "firebase-adminsdk-fbsvc@pushserver-ff2b4.iam.gserviceaccount.com",
    privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3v4hP...
-----END PRIVATE KEY-----`
  })
});

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.status(200).json({ 
    status: true, 
    message: 'A K M R BANK PLC Push Server is running successfully!' 
  });
});

app.post('/register-token', async (req, res) => {
  try {
    const { token, appId, userAgent } = req.body;
    
    if (!token || !appId) {
      return res.status(400).json({ success: false, error: 'Token and App ID are required' });
    }

    await db.collection('fcm_tokens').doc(token).set({
      token,
      appId,
      userAgent: userAgent || 'Unknown',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    res.json({ success: true, message: 'Token registered successfully for A K M R BANK' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/send-notification', async (req, res) => {
  try {
    const { appId, title, body, imageUrl } = req.body;

    if (!appId || !title || !body) {
      return res.status(400).json({ success: false, error: 'App ID, title, and body are required' });
    }

    const snapshot = await db.collection('fcm_tokens').where('appId', '==', appId).get();
    
    if (snapshot.empty) {
      return res.status(404).json({ success: false, error: 'No devices found for this App ID' });
    }

    const tokens = [];
    snapshot.forEach(doc => {
      tokens.push(doc.id);
    });

    const message = {
      tokens: tokens,
      data: {
        title: title,
        body: body,
        imageUrl: imageUrl || ''
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    res.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      message: 'Notifications processed by A K M R BANK Server'
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`A K M R BANK Server is running on port ${PORT}`);
});
