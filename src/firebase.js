const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert({
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        projectId: "mspr-payetonkawa-58875-73430"
    })
});

const db = admin.firestore();
module.exports = db;
