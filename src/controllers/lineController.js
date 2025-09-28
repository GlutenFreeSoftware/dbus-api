import scraperService from '../services/scraperService.js';

export class LineController {
    async getLines(req, res, next) {
        try {
            const busLines = await scraperService.getBusLines();
            res.json({
                success: true,
                data: busLines,
                count: busLines.length
            });
        } catch (error) {
            next(error);
        }
    }

    async getLineStops(req, res, next) {
        try {
            const { lineCode } = req.params;
            const busStops = await scraperService.getLineStops(lineCode);
            
            res.json({
                success: true,
                data: busStops
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new LineController();