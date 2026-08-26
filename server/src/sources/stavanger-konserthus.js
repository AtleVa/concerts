const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { stripHtml, truncate } = require('../utils/text');

const SOURCE_ID = 'stavanger-konserthus';
const SOURCE_NAME = 'Stavanger konserthus';
const PROGRAM_URL = 'https://www.stavanger-konserthus.no/program/';

/**
 * Stavanger konserthus (WordPress + the "tix"/Tixly ticketing plugin) is the
 * best-structured source of all: the /program/ page is server-rendered with
 * full schema.org "Event" microdata per item (itemprop="name"/"startDate"/
 * "location", plus a poster image and detail-page link) - no client-side
 * rendering or JSON APIs to reverse engineer, just straightforward scraping.
 */
async function fetchEvents() {
  const res = await fetch(PROGRAM_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (concert-aggregator/1.0)' },
  });

  if (!res.ok) {
    throw new Error(`Stavanger konserthus responded with ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const events = [];

  $('article[itemtype="http://schema.org/Event"]').each((_, el) => {
    const $el = $(el);

    const title = stripHtml($el.find('[itemprop="name"]').first().text());
    if (!title) return;

    const startDateEl = $el.find('[itemprop="startDate"]').first();
    const isoDate = startDateEl.attr('content');
    const date = isoDate ? new Date(isoDate).toISOString() : null;

    const venue = stripHtml(
      $el.find('[itemprop="location"] [itemprop="name"]').first().text()
    );
    const link = $el.find('a.event-link').first().attr('href');
    const image = $el.find('img[itemprop="image"]').first().attr('data-src');

    events.push({
      id: `${SOURCE_ID}-${link ? link.split('/').filter(Boolean).pop() : title}`,
      source: SOURCE_ID,
      sourceName: SOURCE_NAME,
      title,
      date,
      description: venue ? truncate(`Scene: ${venue}`, 400) : null,
      image: image || null,
      url: link || PROGRAM_URL,
      venue: SOURCE_NAME,
    });
  });

  return events;
}

module.exports = { id: SOURCE_ID, name: SOURCE_NAME, fetchEvents };
