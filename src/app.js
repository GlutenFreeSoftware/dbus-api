import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/environment.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimitWindow,
    max: config.rateLimitMax,
    message: {
        success: false,
        error: {
            message: 'Too many requests from this IP, please try again later.'
        }
    }
});
app.use(limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;