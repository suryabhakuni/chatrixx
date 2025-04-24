const { rateLimit } = require('express-rate-limit');
// Temporarily disable Redis store to fix the error
// const { RedisStore } = require('rate-limit-redis');
// const { redisClient } = require('../config/redis');

// Create a rate limiter with memory store (no Redis)
const createRateLimiter = (options = {}) => {
    const defaultOptions = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        message: 'Too many requests, please try again later.'
        // Redis store temporarily disabled
        // store: new RedisStore({
        //     sendCommand: async (...args) => await redisClient.sendCommand(args),
        //     prefix: 'rl:'
        // })
    };

    return rateLimit({
        ...defaultOptions,
        ...options
    });
};

// Create different rate limiters for different routes
const authLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 requests per hour
    message: 'Too many authentication attempts, please try again later.'
});

const apiLimiter = createRateLimiter();

const messageLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Too many messages sent, please slow down.'
});

module.exports = {
    authLimiter,
    apiLimiter,
    messageLimiter
};
