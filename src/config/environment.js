import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 80,
    nodeEnv: process.env.NODE_ENV || 'development',
    cacheExpiry: process.env.CACHE_EXPIRY || 3600000, // 1 hour
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW || 900000, // 15 minutes
    rateLimitMax: process.env.RATE_LIMIT_MAX || 100
};