const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { stripHtml } = require('../utils/text');

const SOURCE_ID = 'dnb-arena';
const SOURCE_NAME = 'DNB Arena';
const PROGRAM_URL = 'https://www.dnbarena.no/events/';

/**
 * DNB Arena (WordPress) server-renders its full event list as a plain
 * <table class="eventlist"> with one <tr class="event-item filter-item ...">
 * per event. Each row's class list tags its category (oilers, konsert, show,
 * sport); we only keep "konsert" since that's what this aggregator is
 * about. The date is a Unix timestamp in the <time datetime="..."> attribute,
 * so no manual date parsing is needed.
 */
async function fetchEvents() {
  const res = await fetch(PROGRAM_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (concert-aggregator/1.0)' },
  });

  if (!res.ok) {
    throw new Error(`DNB Arena responded with ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const events = [];

  $('table.eventlist tr.event-item.konsert').each((_, el) => {
    const $el = $(el);
    const cells = $el.find('> td');

    const titleCell = cells.eq(0);
    const image = titleCell.find('img').first().attr('src') || null;
    const title = stripHtml(titleCell.clone().find('img').remove().end().text());
    if (!title) return;

    const timestamp = cells.eq(1).find('time').first().attr('datetime');
    const date = timestamp ? new Date(Number(timestamp) * 1000).toISOString() : null;

    const linksCell = cells.eq(2);
    const ticketUrl = linksCell.find('a.tickets').first().attr('href');
    const moreUrl = linksCell.find('a.more').first().attr('href');

    const id = $el.attr('id') || title;

    events.push({
      id: `${SOURCE_ID}-${id}`,
      source: SOURCE_ID,
      sourceName: SOURCE_NAME,
      title,
      date,
      description: null,
      image,
      url: ticketUrl || moreUrl || PROGRAM_URL,
      venue: SOURCE_NAME,
    });
  });

  return events;
}

module.exports = { id: SOURCE_ID, name: SOURCE_NAME, fetchEvents };
