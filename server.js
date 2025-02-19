import express from 'express';
import { getBusLines, getLineStops, getBusTimeAtStop } from './scraper.js';

const app = express();

const PORT = 3000;

app.get('/bus-lines', async (req, res) => {
    try {
        const busLines = await getBusLines();
        res.json(busLines);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bus lines' });
    }
});

app.get('/bus-stops/:lineCode', async (req, res) => {
    try {
        const busStops = await getLineStops(req.params.lineCode);
        res.json(busStops);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bus stops' });
    }
});

app.get('/bus-time/:lineNumber/:stopId', async (req, res) => {
    try {
        const lineNumber = parseInt(req.params.lineNumber, 10);
        const stopId = req.params.stopId;
        const busTime = await getBusTimeAtStop(lineNumber, stopId);
        res.json({ time: busTime });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bus time' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
