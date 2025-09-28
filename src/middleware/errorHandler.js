import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
    // Log the error with request context
    logger.error('Request error occurred', err, {
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        body: req.body,
        params: req.params,
        query: req.query
    });

    const isDevelopment = process.env.NODE_ENV === 'development';

    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
    } else if (err.message.includes('not found')) {
        statusCode = 404;
    }

    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(isDevelopment && { stack: err.stack })
        }
    });
};

export const notFoundHandler = (req, res) => {
    logger.warn('404 - Route not found', {
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
    });

    res.status(404).json({
        success: false,
        error: {
            message: `Endpoint ${req.method} ${req.path} not found`
        }
    });
};