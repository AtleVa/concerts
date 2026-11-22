// Source sites publish Norwegian wall-clock times; parse them as such even
// when the host (e.g. Azure App Service) runs in UTC. Must precede any Date use.
process.env.TZ = process.env.APP_TZ || 'Europe/Oslo';

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { getAggregatedEvents, startScheduledRefresh, SOURCES } = require('./aggregator');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

// If a built client bundle is present (client/dist, copied alongside the
// server on deploy), serve it as static assets with an SPA fallback so this
// service can host both the API and the web page.
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
const hasClientBuild = fs.existsSync(path.join(clientDistPath, 'index.html'));
if (hasClientBuild) {
  app.use(express.static(clientDistPath));
}

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
    // Browsers revalidate (cheap 304 via ETag) so a refresh by anyone shows up immediately.
    res.set('Cache-Control', 'public, no-cache');
    res.json(data);
  } catch (err) {
    console.error('Failed to aggregate events:', err);
    res.status(500).json({ error: 'Failed to aggregate events' });
  }
});

if (hasClientBuild) {
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Concert aggregator API listening on http://localhost:${PORT}`);
  startScheduledRefresh();
});


