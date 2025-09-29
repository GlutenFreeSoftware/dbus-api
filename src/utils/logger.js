import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../config/environment.js';

// Custom format for console output with colors
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        // Remove winston's internal fields
        const { service, version, env, ...customMeta } = meta;
        
        const metaParts = [];
        
        // Add service info if available
        if (service && service !== 'dbus-api') metaParts.push(`service=${service}`);
        
        // Add specific fields if they exist
        if (customMeta.userId) metaParts.push(`userId=${customMeta.userId}`);
        if (customMeta.ip) metaParts.push(`ip=${customMeta.ip}`);
        if (customMeta.method && customMeta.url) metaParts.push(`${customMeta.method} ${customMeta.url}`);
        if (customMeta.responseTime) metaParts.push(`${customMeta.responseTime}ms`);
        
        // Add all remaining meta fields
        const remainingMeta = { ...customMeta };
        delete remainingMeta.userId;
        delete remainingMeta.ip;
        delete remainingMeta.method;
        delete remainingMeta.url;
        delete remainingMeta.responseTime;
        delete remainingMeta.stack;
        delete remainingMeta.errorName;
        delete remainingMeta.errorMessage;
        
        // Format remaining meta as key=value pairs
        Object.entries(remainingMeta).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                metaParts.push(`${key}=${JSON.stringify(value)}`);
            }
        });
        
        const metaStr = metaParts.length > 0 ? ` [${metaParts.join(' | ')}]` : '';
        return `${timestamp} ${level}: ${message}${metaStr}${stack ? '\n' + stack : ''}`;
    })
);

// Format for file output (JSON for easier parsing)
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create winston logger
const logger = winston.createLogger({
    level: config.logLevel || 'info',
    format: fileFormat,
    defaultMeta: { 
        service: 'dbus-api',
        version: process.env.npm_package_version || '1.0.0',
        env: config.nodeEnv 
    },
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: consoleFormat,
            silent: config.nodeEnv === 'test'
        }),

        // Error log file with daily rotation
        new DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '14d',
            format: fileFormat
        }),

        // Combined log file with daily rotation
        new DailyRotateFile({
            filename: 'logs/combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d',
            format: fileFormat
        }),

        // HTTP access log file
        new DailyRotateFile({
            filename: 'logs/access-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'http',
            maxSize: '20m',
            maxFiles: '30d',
            format: fileFormat
        })
    ]
});

// Custom logging methods with additional context
class Logger {
    constructor(winston) {
        this.winston = winston;
    }

    info(message, meta = {}) {
        this.winston.info(message, meta);
    }

    error(message, error = null, meta = {}) {
        if (error instanceof Error) {
            meta.stack = error.stack;
            meta.errorName = error.name;
            meta.errorMessage = error.message;
        }
        this.winston.error(message, meta);
    }

    warn(message, meta = {}) {
        this.winston.warn(message, meta);
    }

    debug(message, meta = {}) {
        this.winston.debug(message, meta);
    }

    http(message, meta = {}) {
        this.winston.log('http', message, meta);
    }

    // API specific logging methods
    apiRequest(req, res, responseTime) {
        const meta = {
            method: req.method,
            url: req.url,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            responseTime,
            statusCode: res.statusCode,
            contentLength: res.get('content-length') || 0
        };

        if (req.user) {
            meta.userId = req.user.id;
        }

        const message = `${req.method} ${req.url} - ${res.statusCode} - ${responseTime}ms`;
        
        if (res.statusCode >= 400) {
            this.error(message, null, meta);
        } else {
            this.http(message, meta);
        }
    }

    scraperOperation(operation, duration, success = true, error = null, meta = {}) {
        const logMeta = {
            operation,
            duration,
            success,
            service: 'scraper',
            ...meta
        };

        const message = `Scraper ${operation} ${success ? 'completed' : 'failed'} in ${duration}ms`;

        if (success) {
            this.info(message, logMeta);
        } else {
            this.error(message, error, logMeta);
        }
    }

    cacheOperation(operation, key, hit = null, meta = {}) {
        const logMeta = {
            operation,
            key,
            service: 'cache',
            ...meta
        };

        if (hit !== null) {
            logMeta.hit = hit;
        }

        const message = `Cache ${operation} for key: ${key}${hit !== null ? ` (${hit ? 'HIT' : 'MISS'})` : ''}`;
        this.debug(message, logMeta);
    }

    rateLimitExceeded(ip, route, meta = {}) {
        const logMeta = {
            ip,
            route,
            service: 'rateLimit',
            ...meta
        };
        
        this.warn(`Rate limit exceeded for ${ip} on ${route}`, logMeta);
    }
}

export default new Logger(logger);