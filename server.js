const express = require('express');
const { getBusLines, getLineStops, getBusTimeAtStop } = require('./routes');

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

app.get('/bus-stops/:lineNumber', async (req, res) => {
    try {
        const lineNumber = parseInt(req.params.lineNumber, 10);
        const busStops = await getLineStops(lineNumber);
        res.json(busStops);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bus stops' });
    }
});

app.get('/bus-time/:lineNumber/:stopId', (req, res) => {
    const lineNumber = parseInt(req.params.lineNumber, 10);
    const stopId = req.params.stopId;
    const busTime = getBusTimeAtStop(lineNumber, stopId);
    res.json({ time: busTime });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
