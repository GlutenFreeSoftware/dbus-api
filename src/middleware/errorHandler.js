export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

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
    res.status(404).json({
        success: false,
        error: {
            message: `Endpoint ${req.method} ${req.path} not found`
        }
    });
};