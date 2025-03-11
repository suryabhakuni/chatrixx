const admin = require('firebase-admin');
const serviceAccount = require('./firebase-config.json');

const initializeFirebase = () => {
  try {
    // Check if any Firebase apps exist
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized successfully');
    } else {
      console.log('Firebase Admin already initialized');
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
};

module.exports = { initializeFirebase };