import { Router } from 'express';
import lineController from '../../../controllers/lineController.js';
import stopController from '../../../controllers/stopController.js';

const router = Router();

// Get all bus lines
router.get('/', lineController.getLines);

// Get stops for a specific line
router.get('/:lineCode', lineController.getLineStops);

// Get bus arrival time for a specific stop in a line
router.get('/:lineCode/:stopCode', stopController.getBusArrival);

export default router;