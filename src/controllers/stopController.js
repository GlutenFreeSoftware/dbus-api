import scraperService from '../services/scraperService.js';

export class StopController {
    async getBusArrival(req, res, next) {
        try {
            const { lineCode, stopCode } = req.params;
            const busTime = await scraperService.getBusTimeAtStop(lineCode, stopCode);
            
            res.json({
                success: true,
                data: {
                    line: lineCode,
                    stop: stopCode,
                    arrival_time: busTime,
                    unit: 'minutes'
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new StopController();