import app from './src/app.js';
import { config } from './src/config/environment.js';
import logger from './src/utils/logger.js';

const PORT = config.port;

const server = app.listen(PORT, () => {
    logger.info('dbus API Server started', {
        port: PORT,
        environment: config.nodeEnv,
        logLevel: config.logLevel,
        nodeVersion: process.version,
        pid: process.pid
    });
    
    if (config.nodeEnv === 'development') {
        console.log(`🚌 dbus API Server started`);
        console.log(`📍 Environment: ${config.nodeEnv}`);
        console.log(`🌐 Listening on: http://localhost:${PORT}`);
        console.log(`📚 API Docs: http://localhost:${PORT}/api/v1`);
    }
});

// Handle server errors
server.on('error', (error) => {
    logger.error('Server error occurred', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, closing server');
    server.close(() => {
        logger.info('Server closed successfully');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, closing server');
    server.close(() => {
        logger.info('Server closed successfully');
        process.exit(0);
    });
});
