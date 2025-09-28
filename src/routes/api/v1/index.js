import { Router } from 'express';
import linesRouter from './lines.js';

const router = Router();

router.use('/lines', linesRouter);

export default router;