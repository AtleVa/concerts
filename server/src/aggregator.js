const NodeCache = require('node-cache');
const stavangeren = require('./sources/stavangeren');
const fiskepiren = require('./sources/fiskepiren');
const checkpointCharlie = require('./sources/checkpoint-charlie');
const tou = require('./sources/tou');
const stavangerKonserthus = require('./sources/stavanger-konserthus');
const folken = require('./sources/folken');

const SOURCES = [stavangeren, fiskepiren, checkpointCharlie, tou, stavangerKonserthus, folken];
const CACHE_TTL_SECONDS = 30 * 60; // refresh at most every 30 minutes
const CACHE_KEY = 'aggregated-events';

const cache = new NodeCache({ stdTTL: CACHE_TTL_SECONDS, checkperiod: 60 });

/**
 * Fetches events from every configured source in parallel. A failure in one
 * source (site down, markup changed, etc.) never breaks the others - it's
 * reported back per-source so the frontend can show a friendly notice.
 */
async function fetchAllEvents() {
  const results = await Promise.allSettled(SOURCES.map((source) => source.fetchEvents()));

  const events = [];
  const sourceStatus = [];

  results.forEach((result, i) => {
    const source = SOURCES[i];
    if (result.status === 'fulfilled') {
      events.push(...result.value);
      sourceStatus.push({ id: source.id, name: source.name, ok: true, count: result.value.length });
    } else {
      sourceStatus.push({
        id: source.id,
        name: source.name,
        ok: false,
        count: 0,
        error: result.reason && result.reason.message,
      });
    }
  });

  // Drop events with a clearly-past date (yesterday or earlier) - this is an
  // "upcoming concerts" aggregator. Events with no parseable date are kept,
  // since they may still be upcoming; users can confirm via the source link.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const upcomingEvents = events.filter((e) => !e.date || new Date(e.date) >= startOfToday);

  // Sort: dated events chronologically first, undated events last.
  upcomingEvents.sort((a, b) => {
    if (a.date && b.date) return new Date(a.date) - new Date(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title);
  });

  return { events: upcomingEvents, sources: sourceStatus, fetchedAt: new Date().toISOString() };
}

async function getAggregatedEvents({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = cache.get(CACHE_KEY);
    if (cached) return cached;
  }

  const fresh = await fetchAllEvents();
  cache.set(CACHE_KEY, fresh);
  return fresh;
}

module.exports = { getAggregatedEvents, SOURCES };
