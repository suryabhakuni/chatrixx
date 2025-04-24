const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Compress an image buffer
 * @param {Buffer} buffer - Image buffer
 * @param {Object} options - Compression options
 * @returns {Promise<Buffer>} - Compressed image buffer
 */
const compressImage = async (buffer, options = {}) => {
  try {
    const {
      quality = 80,
      maxWidth = 1920,
      maxHeight = 1080,
      format = 'jpeg'
    } = options;
    
    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    
    // Determine if resizing is needed
    const needsResize = metadata.width > maxWidth || metadata.height > maxHeight;
    
    // Process image
    let processedImage = sharp(buffer);
    
    if (needsResize) {
      processedImage = processedImage.resize({
        width: Math.min(metadata.width, maxWidth),
        height: Math.min(metadata.height, maxHeight),
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Set format and quality
    if (format === 'jpeg') {
      processedImage = processedImage.jpeg({ quality });
    } else if (format === 'png') {
      processedImage = processedImage.png({ quality });
    } else if (format === 'webp') {
      processedImage = processedImage.webp({ quality });
    }
    
    // Get buffer
    return await processedImage.toBuffer();
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
};

/**
 * Compress a video file
 * @param {Buffer} buffer - Video buffer
 * @param {Object} options - Compression options
 * @returns {Promise<string>} - Path to compressed video file
 */
const compressVideo = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const {
        videoBitrate = '1000k',
        audioBitrate = '128k',
        width = 1280,
        height = 720,
        format = 'mp4'
      } = options;
      
      // Create temporary input file
      const inputId = uuidv4();
      const inputPath = path.join(tempDir, `${inputId}_input.mp4`);
      fs.writeFileSync(inputPath, buffer);
      
      // Create output file path
      const outputId = uuidv4();
      const outputPath = path.join(tempDir, `${outputId}_output.${format}`);
      
      // Compress video using ffmpeg
      ffmpeg(inputPath)
        .outputOptions([
          `-c:v libx264`,
          `-b:v ${videoBitrate}`,
          `-c:a aac`,
          `-b:a ${audioBitrate}`,
          `-vf scale=${width}:${height}:force_original_aspect_ratio=decrease`
        ])
        .output(outputPath)
        .on('end', () => {
          // Clean up input file
          fs.unlinkSync(inputPath);
          resolve(outputPath);
        })
        .on('error', (err) => {
          // Clean up input file
          if (fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
          }
          reject(err);
        })
        .run();
    } catch (error) {
      console.error('Error compressing video:', error);
      reject(error);
    }
  });
};

/**
 * Compress an audio file
 * @param {Buffer} buffer - Audio buffer
 * @param {Object} options - Compression options
 * @returns {Promise<string>} - Path to compressed audio file
 */
const compressAudio = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const {
        audioBitrate = '128k',
        format = 'mp3'
      } = options;
      
      // Create temporary input file
      const inputId = uuidv4();
      const inputPath = path.join(tempDir, `${inputId}_input.mp3`);
      fs.writeFileSync(inputPath, buffer);
      
      // Create output file path
      const outputId = uuidv4();
      const outputPath = path.join(tempDir, `${outputId}_output.${format}`);
      
      // Compress audio using ffmpeg
      ffmpeg(inputPath)
        .outputOptions([
          `-c:a libmp3lame`,
          `-b:a ${audioBitrate}`
        ])
        .output(outputPath)
        .on('end', () => {
          // Clean up input file
          fs.unlinkSync(inputPath);
          resolve(outputPath);
        })
        .on('error', (err) => {
          // Clean up input file
          if (fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
          }
          reject(err);
        })
        .run();
    } catch (error) {
      console.error('Error compressing audio:', error);
      reject(error);
    }
  });
};

/**
 * Clean up temporary files
 * @param {number} maxAgeHours - Maximum age in hours
 */
const cleanupTempFiles = (maxAgeHours = 24) => {
  try {
    if (!fs.existsSync(tempDir)) return;
    
    const files = fs.readdirSync(tempDir);
    const now = new Date();
    
    files.forEach(file => {
      if (file === '.gitkeep') return;
      
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = (now - stats.mtime) / (1000 * 60 * 60); // Age in hours
      
      if (fileAge > maxAgeHours) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old temp file: ${file}`);
      }
    });
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
  }
};

module.exports = {
  compressImage,
  compressVideo,
  compressAudio,
  cleanupTempFiles
};
