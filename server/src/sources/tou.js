const fetch = require('node-fetch');
const { truncate } = require('../utils/text');

const SOURCE_ID = 'tou';
const SOURCE_NAME = 'TOU';
const API_URL = 'https://www.touofficial.com/api/eventsEdge';

/**
 * TOU relaunched its site on a "broadcast.events"-powered Next.js platform
 * (https://www.touofficial.com/arrangementer), replacing the old WordPress
 * site. The program page fetches its listing client-side from a same-origin
 * JSON API (/api/eventsEdge) that returns clean, structured event objects -
 * no more scraping/regex needed. Each event has a `custom_fields.type`
 * ("Concert", "Quiz", "Film", "Arts & Theatre", etc.); we only keep
 * "Concert" since that's what this aggregator is about.
 */
async function fetchEvents() {
  const res = await fetch(API_URL, {
    headers: { 'User-Agent': 'concert-aggregator/1.0 (+stavanger-events)' },
  });

  if (!res.ok) {
    throw new Error(`TOU API responded with ${res.status}`);
  }

  const events = await res.json();

  return events
    .filter((ev) => ev.custom_fields && ev.custom_fields.type === 'Concert')
    .map((ev) => {
      const fields = ev.custom_fields || {};
      const image =
        (ev.photo && ev.photo.urls && (ev.photo.urls.large || ev.photo.urls.medium)) ||
        (ev.imagekit && ev.imagekit.url) ||
        null;

      return {
        id: `${SOURCE_ID}-${ev.id}`,
        source: SOURCE_ID,
        sourceName: SOURCE_NAME,
        title: ev.name + (fields.soldOut ? ' (Utsolgt)' : ''),
        date: ev.start_time || null,
        description: truncate(
          [
            fields.zone ? `Scene: ${fields.zone}` : null,
            plainText(ev.details),
            fields.coverCharge ? `Pris: ${fields.coverCharge} kr` : null,
          ]
            .filter(Boolean)
            .join(' — '),
          400
        ),
        image,
        url: fields.ticketUrl || 'https://www.touofficial.com/arrangementer',
        venue: SOURCE_NAME,
      };
    });
}

/** Strip the lightweight markdown TOU uses in "details" (bold/quote/newlines). */
function plainText(details) {
  if (!details) return '';
  return details
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/\s*\n+\s*/g, ' ')
    .trim();
}

module.exports = { id: SOURCE_ID, name: SOURCE_NAME, fetchEvents };
