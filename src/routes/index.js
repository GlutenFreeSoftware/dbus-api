import { Router } from 'express';
import v1Router from './api/v1/index.js';

const router = Router();

router.use('/api/v1', v1Router);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString()
    });
});

export default router;