const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Storage
const bucket = admin.storage().bucket();

/**
 * Upload a file to Firebase Storage
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} originalName - Original file name
 * @param {string} mimeType - File MIME type
 * @returns {Promise<Object>} - Upload result with download URL
 */
const uploadFile = async (fileBuffer, originalName, mimeType) => {
    try {
        // Generate a unique filename
        const fileName = `${uuidv4()}-${originalName}`;
        
        // Create a reference to the file
        const file = bucket.file(`uploads/${fileName}`);
        
        // Create a write stream
        const stream = file.createWriteStream({
            metadata: {
                contentType: mimeType
            },
            resumable: false
        });
        
        // Handle stream errors
        return new Promise((resolve, reject) => {
            stream.on('error', (error) => {
                reject(error);
            });
            
            stream.on('finish', async () => {
                // Make the file publicly accessible
                await file.makePublic();
                
                // Get the public URL
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
                
                resolve({
                    fileName,
                    fileUrl: publicUrl,
                    fileType: mimeType,
                    filePath: file.name
                });
            });
            
            // Write the file buffer to the stream
            stream.end(fileBuffer);
        });
    } catch (error) {
        throw new Error(`Error uploading file: ${error.message}`);
    }
};

/**
 * Delete a file from Firebase Storage
 * @param {string} filePath - Path to the file in storage
 * @returns {Promise<boolean>} - Success status
 */
const deleteFile = async (filePath) => {
    try {
        await bucket.file(filePath).delete();
        return true;
    } catch (error) {
        throw new Error(`Error deleting file: ${error.message}`);
    }
};

module.exports = {
    uploadFile,
    deleteFile
};
