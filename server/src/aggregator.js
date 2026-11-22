const NodeCache = require('node-cache');
const stavangeren = require('./sources/stavangeren');
const fiskepiren = require('./sources/fiskepiren');
const checkpointCharlie = require('./sources/checkpoint-charlie');
const tou = require('./sources/tou');
const stavangerKonserthus = require('./sources/stavanger-konserthus');
const folken = require('./sources/folken');
const dnbArena = require('./sources/dnb-arena');

const rogalandTeater = require('./sources/rogaland-teater');

const SOURCES = [stavangeren, fiskepiren, checkpointCharlie, tou, stavangerKonserthus, folken, dnbArena, rogalandTeater];
const REFRESH_HOUR = 8; // daily scheduled refresh, local time in REFRESH_TZ
const REFRESH_TZ = process.env.REFRESH_TZ || 'Europe/Oslo';
const CACHE_KEY = 'aggregated-events';

// No TTL: the cache lives until the 08:00 refresh or a manual refresh.
const cache = new NodeCache({ stdTTL: 0, useClones: false });

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

function zonedParts(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: REFRESH_TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((x) => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/** Milliseconds until the next REFRESH_HOUR:00 in REFRESH_TZ. */
function msUntilNextRefresh(now = new Date()) {
  const local = zonedParts(now);
  const d = new Date(local);
  let target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), REFRESH_HOUR);
  if (target <= local) target += 24 * 60 * 60 * 1000;
  return target - local;
}

/** Seconds until the next scheduled refresh. */
function getCacheRemainingSeconds() {
  return Math.round(msUntilNextRefresh() / 1000);
}

/** Warms the cache now and re-fetches every day at REFRESH_HOUR. */
function startScheduledRefresh() {
  const run = () => getAggregatedEvents({ forceRefresh: true }).catch((e) => console.error('Scheduled refresh failed:', e));
  const schedule = () => {
    const t = setTimeout(async () => {
      await run();
      schedule();
    }, msUntilNextRefresh());
    t.unref();
  };
  run();
  schedule();
}

module.exports = { getAggregatedEvents, getCacheRemainingSeconds, startScheduledRefresh, SOURCES };
