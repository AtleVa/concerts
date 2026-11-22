const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { stripHtml, truncate } = require('../utils/text');

const SOURCE_ID = 'rogaland-teater';
const SOURCE_NAME = 'Rogaland Teater';
const PROGRAM_URL = 'https://rogaland-teater.no/program/';

// data-start / data-end are formatted MM.DD.YYYY.
function parseUsDate(value) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value || '');
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
}

/**
 * The /program/ page is server-rendered WordPress. Each production is an
 * <article class="tease-show"> carrying the run's first/last date in
 * data-start/data-end. Productions already running are dated today (while
 * the run lasts) so they aren't dropped as past events.
 */
async function fetchEvents() {
  const res = await fetch(PROGRAM_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (concert-aggregator/1.0)' },
  });

  if (!res.ok) {
    throw new Error(`Rogaland Teater responded with ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = [];

  $('article.tease-show').each((_, el) => {
    const $el = $(el);

    const title = stripHtml($el.find('h2').first().text());
    const link = $el.find('a').first().attr('href');
    if (!title || !link) return;

    const start = parseUsDate($el.attr('data-start'));
    const end = parseUsDate($el.attr('data-end'));
    let date = null;
    if (start && start >= today) date = start;
    else if (end && end >= today) date = today;
    else if (start || end) return; // run is over

    const excerpt = stripHtml($el.find('.show-excerpt').first().text());
    const category = stripHtml($el.find('p.show-date').first().text()).split('|').pop().trim();
    const img = $el.find('img').first();

    events.push({
      id: `${SOURCE_ID}-${link.split('/').filter(Boolean).pop()}`,
      source: SOURCE_ID,
      sourceName: SOURCE_NAME,
      title,
      date: date ? date.toISOString() : null,
      description: truncate([category, excerpt].filter(Boolean).join(' – '), 400) || null,
      image: img.attr('src') || null,
      url: link,
      venue: SOURCE_NAME,
    });
  });

  return events;
}

module.exports = { id: SOURCE_ID, name: SOURCE_NAME, fetchEvents };
