const Joi = require('joi');

// Validation middleware factory
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);

        if (error) {
            return res.status(400).json({
                message: error.details[0].message
            });
        }

        next();
    };
};

// Auth validation schemas
const authSchemas = {
    login: Joi.object({
        token: Joi.string().required()
    }),

    verifyToken: Joi.object({
        token: Joi.string().required()
    })
};

// User validation schemas
const userSchemas = {
    updateProfile: Joi.object({
        name: Joi.string().min(2).max(50),
        status: Joi.string().max(100),
        profilePicture: Joi.string().uri()
    }).min(1)
};

// Message validation schemas
const messageSchemas = {
    sendMessage: Joi.object({
        conversationId: Joi.string().required(),
        content: Joi.string().required(),
        messageType: Joi.string().valid('text', 'image', 'file', 'voice'),
        attachments: Joi.array().items(
            Joi.object({
                url: Joi.string().uri(),
                fileType: Joi.string(),
                fileName: Joi.string(),
                fileSize: Joi.number()
            })
        )
    }),

    editMessage: Joi.object({
        content: Joi.string().required()
    }),

    addReaction: Joi.object({
        emoji: Joi.string().required()
    })
};

// Conversation validation schemas
const conversationSchemas = {
    createDirect: Joi.object({
        userId: Joi.string().required()
    }),

    createGroup: Joi.object({
        name: Joi.string().min(2).max(50).required(),
        participants: Joi.array().items(Joi.string()).min(1).required(),
        groupImage: Joi.string().uri()
    }),

    updateGroup: Joi.object({
        groupName: Joi.string().min(2).max(50),
        groupImage: Joi.string().uri()
    }).min(1),

    addParticipants: Joi.object({
        participants: Joi.array().items(Joi.string()).min(1).required()
    })
};

// Connection validation schemas
const connectionSchemas = {
    sendRequest: Joi.object({
        recipientId: Joi.string().required()
    }),

    blockUser: Joi.object({
        userId: Joi.string().required()
    })
};

// File validation schemas
const fileSchemas = {
    sendFileMessage: Joi.object({
        conversationId: Joi.string().required(),
        fileUrl: Joi.string().uri().required(),
        fileName: Joi.string().required(),
        fileType: Joi.string().required(),
        fileSize: Joi.number().required(),
        publicId: Joi.string().required()
    }),

    deleteFile: Joi.object({
        publicId: Joi.string().required()
    })
};

module.exports = {
    validate,
    authSchemas,
    userSchemas,
    messageSchemas,
    conversationSchemas,
    connectionSchemas,
    fileSchemas
};
