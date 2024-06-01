const admin = require('firebase-admin');

async function setupFirebaseTestEnv() {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                projectId: "mspr-payetonkawa-58875-73430"
            })
        });
    }

    const db = admin.firestore();
    const collections = await db.listCollections();
    for (const collection of collections) {
        const snapshot = await collection.get();
        snapshot.forEach((doc) => doc.ref.delete());
    }
}

async function teardownFirebaseTestEnv() {
    const db = admin.firestore();
    const collections = await db.listCollections();
    for (const collection of collections) {
        const snapshot = await collection.get();
        snapshot.forEach((doc) => doc.ref.delete());
    }
}

module.exports = {
    setupFirebaseTestEnv,
    teardownFirebaseTestEnv
};
