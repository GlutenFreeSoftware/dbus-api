import morgan from 'morgan';
import logger from '../utils/logger.js';

// Custom morgan token for response time
morgan.token('response-time-ms', (req, res) => {
    const responseTime = res.getHeader('X-Response-Time');
    return responseTime ? `${responseTime}ms` : '-';
});

// Custom morgan stream that writes to our logger
const stream = {
    write: (message) => {
        // Remove trailing newline and log as http level
        logger.http(message.trim());
    }
};

// Morgan format for development
const devFormat = ':method :url :status :res[content-length] - :response-time ms';

// Morgan format for production (more detailed)
const prodFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

// Request logging middleware
export const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    // Log incoming request
    logger.debug(`Incoming ${req.method} ${req.url}`, {
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length')
    });

    // Override res.end to capture response details
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const responseTime = Date.now() - start;
        
        // Add response time header
        res.setHeader('X-Response-Time', responseTime);
        
        // Log the request completion
        logger.apiRequest(req, res, responseTime);
        
        // Call original end method
        originalEnd.call(this, chunk, encoding);
    };

    next();
};

// Morgan middleware for file logging
export const morganMiddleware = morgan(
    process.env.NODE_ENV === 'development' ? devFormat : prodFormat,
    { 
        stream,
        skip: (req, res) => {
            // Skip logging for health check in production to reduce noise
            return process.env.NODE_ENV === 'production' && req.url === '/health';
        }
    }
);

// Error logging middleware (should be used after error handler)
export const errorLogger = (err, req, res, next) => {
    logger.error('Unhandled error in request', err, {
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        body: req.body,
        params: req.params,
        query: req.query
    });
    
    next(err);
};