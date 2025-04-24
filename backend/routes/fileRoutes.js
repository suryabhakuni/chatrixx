const router = require('express').Router();
const fileController = require('../controllers/fileController');
const auth = require('../middleware/auth');
const multer = require('multer');
const { validate, fileSchemas } = require('../middleware/validator');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images, audio, video, and common document types
        if (file.mimetype.startsWith('image/') ||
            file.mimetype.startsWith('audio/') ||
            file.mimetype.startsWith('video/') ||
            file.mimetype === 'application/pdf' ||
            file.mimetype === 'application/msword' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.mimetype === 'text/plain') {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type'), false);
        }
    }
});

// File routes
router.post('/upload', auth, upload.single('file'), fileController.uploadFile);
router.delete('/', auth, validate(fileSchemas.deleteFile), fileController.deleteFile);
router.post('/message', auth, validate(fileSchemas.sendFileMessage), fileController.sendFileMessage);

module.exports = router;
