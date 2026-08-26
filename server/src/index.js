const express = require('express');
const cors = require('cors');
const { getAggregatedEvents, SOURCES } = require('./aggregator');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/sources', (_req, res) => {
  res.json(SOURCES.map((s) => ({ id: s.id, name: s.name })));
});

app.get('/api/events', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const data = await getAggregatedEvents({ forceRefresh });
    res.json(data);
  } catch (err) {
    console.error('Failed to aggregate events:', err);
    res.status(500).json({ error: 'Failed to aggregate events' });
  }
});

app.listen(PORT, () => {
  console.log(`Concert aggregator API listening on http://localhost:${PORT}`);
});
