const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Initialize Firebase Admin with your service account
try {
  // Check if already initialized
  if (admin.apps.length === 0) {
    // Look for the firebase config file in the config folder
    const configPath = path.join(__dirname, '../config/firebase-config.json');

    if (!fs.existsSync(configPath)) {
      console.error('\nERROR: firebase-config.json file not found in the config folder!');
      process.exit(1);
    }

    const serviceAccount = require('../config/firebase-config.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  process.exit(1);
}

/**
 * Generate a custom token and then exchange it for an ID token
 * @param {string} uid - User ID to generate token for
 * @param {Object} claims - Additional claims to include in the token
 */
async function generateTestToken(uid = 'test-user-123', claims = {}) {
  try {
    console.log('Generating token for user:', uid);

    // Create or update the test user in Firebase
    try {
      await admin.auth().getUser(uid);
      console.log('Test user already exists');
    } catch (error) {
      // User doesn't exist, create it
      await admin.auth().createUser({
        uid,
        email: claims.email || 'test@example.com',
        displayName: claims.name || 'Test User',
        photoURL: claims.picture || 'https://via.placeholder.com/150',
      });
      console.log('Created test user in Firebase');
    }

    // Create custom token
    const customToken = await admin.auth().createCustomToken(uid, claims);
    console.log('\nCustom Token (for client SDK):\n', customToken);

    // Note: In a real scenario, you would exchange this custom token for an ID token
    // using the Firebase client SDK's signInWithCustomToken method
    console.log('\nTo use this token:');
    console.log('1. Use this custom token with Firebase client SDK to sign in');
    console.log('2. Then get the ID token from the client SDK');
    console.log('3. Use that ID token in your Postman requests');

    // For testing purposes, we'll also set custom claims on the user
    // which will be included in the ID token when they authenticate
    await admin.auth().setCustomUserClaims(uid, {
      ...claims,
      testUser: true
    });
    console.log('\nSet custom claims on user. These will be included in the ID token.');

    return customToken;
  } catch (error) {
    console.error('Error generating token:', error);
    throw error;
  }
}

// Generate tokens for Google and Facebook testing
async function main() {
  try {
    // Generate token for Google testing
    console.log('=== GENERATING GOOGLE TEST TOKEN ===');
    await generateTestToken('google-test-user', {
      email: 'google-test@example.com',
      name: 'Google Test User',
      picture: 'https://via.placeholder.com/150?text=Google',
      provider: 'google.com'
    });

    console.log('\n\n=== GENERATING FACEBOOK TEST TOKEN ===');
    // Generate token for Facebook testing
    await generateTestToken('facebook-test-user', {
      email: 'facebook-test@example.com',
      name: 'Facebook Test User',
      picture: 'https://via.placeholder.com/150?text=Facebook',
      provider: 'facebook.com'
    });

    process.exit(0);
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

// Run the script
main();
