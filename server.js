import express from 'express';
import { getBusLines, getLineStops, getBusTimeAtStop } from './scraper.js';
import dotenv from 'dotenv';

const app = express();
dotenv.config();

const PORT = process.env.PORT || 8080;

app.get('/lines', async (req, res) => {
    try {
        const busLines = await getBusLines();
        res.json(busLines);
    } catch (error) {
        res.status(500).json({ error: `${error.message}` });
    }
});

app.get('/stops/:lineCode', async (req, res) => {
    try {
        const busStops = await getLineStops(req.params.lineCode);
        res.json(busStops);
    } catch (error) {
        res.status(500).json({ error: `${error.message}` });
    }
});

app.get('/arrival/:lineNumber/:stopCode', async (req, res) => {
    try {
        const busTime = await getBusTimeAtStop(req.params.lineNumber, req.params.stopCode);
        res.json({ time: busTime });
    } catch (error) {
        res.status(500).json({ error: `${error.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
