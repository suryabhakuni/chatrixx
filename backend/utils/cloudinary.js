const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} folder - The folder to upload to (default: 'chatrixx')
 * @param {Object} options - Additional upload options
 * @returns {Promise<Object>} - Cloudinary upload result
 */
const uploadFile = (fileBuffer, folder = 'chatrixx', options = {}) => {
  return new Promise((resolve, reject) => {
    // Create upload stream to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto', // Automatically detect resource type
        ...options
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    // Convert buffer to stream and pipe to uploadStream
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - The public ID of the file to delete
 * @returns {Promise<Object>} - Cloudinary deletion result
 */
const deleteFile = async (publicId) => {
  return await cloudinary.uploader.destroy(publicId);
};

/**
 * Generate a Cloudinary URL with transformations
 * @param {string} publicId - The public ID of the file
 * @param {Object} transformations - Transformation options
 * @returns {string} - Transformed Cloudinary URL
 */
const getFileUrl = (publicId, transformations = {}) => {
  return cloudinary.url(publicId, transformations);
};

module.exports = {
  uploadFile,
  deleteFile,
  getFileUrl
};
