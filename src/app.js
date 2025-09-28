import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/environment.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger, morganMiddleware } from './middleware/logging.js';
import logger from './utils/logger.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Logging middleware
app.use(requestLogger);
app.use(morganMiddleware);

// Rate limiting with logging
const limiter = rateLimit({
    windowMs: config.rateLimitWindow,
    max: config.rateLimitMax,
    message: {
        success: false,
        error: {
            message: 'Too many requests from this IP, please try again later.'
        }
    },
    // Use handler instead of onLimitReached for v7
    handler: (req, res) => {
        logger.rateLimitExceeded(
            req.ip || req.connection.remoteAddress,
            req.url,
            { method: req.method, userAgent: req.get('User-Agent') }
        );
        
        res.status(429).json({
            success: false,
            error: {
                message: 'Too many requests from this IP, please try again later.'
            }
        });
    }
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request ID for tracing
app.use((req, res, next) => {
    req.id = Math.random().toString(36).substr(2, 9);
    res.setHeader('X-Request-ID', req.id);
    next();
});

// Routes
app.use('/', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', new Error(reason), { promise });
    process.exit(1);
});

export default app;