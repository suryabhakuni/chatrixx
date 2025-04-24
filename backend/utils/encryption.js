const crypto = require('crypto');

/**
 * Generate a random encryption key
 * @param {number} length - Key length in bytes
 * @returns {string} - Base64 encoded key
 */
const generateEncryptionKey = (length = 32) => {
  const key = crypto.randomBytes(length);
  return key.toString('base64');
};

/**
 * Encrypt a message with AES-256-GCM
 * Note: In a real E2E system, encryption would happen on the client
 * This is a server-side implementation for demonstration
 * 
 * @param {string} text - Plain text to encrypt
 * @param {string} key - Base64 encoded encryption key
 * @returns {Object} - Encrypted data with iv, tag, and ciphertext
 */
const encryptMessage = (text, key) => {
  try {
    // Convert key from base64 to Buffer
    const keyBuffer = Buffer.from(key, 'base64');
    
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get the authentication tag
    const tag = cipher.getAuthTag().toString('base64');
    
    return {
      iv: iv.toString('base64'),
      tag,
      encryptedData: encrypted
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
};

/**
 * Decrypt a message with AES-256-GCM
 * Note: In a real E2E system, decryption would happen on the client
 * This is a server-side implementation for demonstration
 * 
 * @param {Object} encryptedData - Object with iv, tag, and encryptedData
 * @param {string} key - Base64 encoded encryption key
 * @returns {string} - Decrypted text
 */
const decryptMessage = (encryptedData, key) => {
  try {
    // Convert key from base64 to Buffer
    const keyBuffer = Buffer.from(key, 'base64');
    
    // Convert iv and tag from base64 to Buffer
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedData.encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
};

/**
 * Generate a shared encryption key for a conversation
 * In a real E2E system, this would be done using a key exchange protocol
 * This is a simplified implementation for demonstration
 * 
 * @param {string} conversationId - Conversation ID
 * @returns {string} - Base64 encoded key
 */
const generateConversationKey = (conversationId) => {
  // In a real system, this would be a secure key exchange
  // For demo purposes, we're deriving a key from the conversation ID
  const hash = crypto.createHash('sha256');
  hash.update(conversationId + process.env.ENCRYPTION_SECRET);
  return hash.digest('base64');
};

module.exports = {
  generateEncryptionKey,
  encryptMessage,
  decryptMessage,
  generateConversationKey
};
