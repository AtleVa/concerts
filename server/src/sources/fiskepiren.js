const fetch = require('node-fetch');
const cheerio = require('cheerio');
const crypto = require('crypto');
const { stripHtml } = require('../utils/text');
const { parseShortNorwegianDate } = require('../utils/shortDate');

const SOURCE_ID = 'fiskepiren';
const SOURCE_NAME = 'Fiskepiren';
const PROGRAM_URL = 'https://www.fiskepiren.no/program';

/**
 * Fiskepiren's /program page is Squarespace, but the concerts are hand-built
 * with plain content blocks (a short date label, a title, a poster image and
 * a ticket button) rather than Squarespace's native "Events" collection -
 * that collection exists on the site but is empty. So instead we walk the
 * page's blocks in document order and group them: a date-like text block
 * starts a new event, the next text block is its title, any image block is
 * its poster, and the following button/link block (tickets - fixr.co,
 * tikkio.com, linticket.no, etc.) closes it out.
 */
async function fetchEvents() {
  const res = await fetch(PROGRAM_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (concert-aggregator/1.0)' },
  });

  if (!res.ok) {
    throw new Error(`Fiskepiren responded with ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const events = [];
  let current = null;

  const pushCurrent = (link) => {
    if (current && current.date && current.title) {
      const idSource = `${current.title}|${current.date}|${link || ''}`;
      const hash = crypto.createHash('sha1').update(idSource).digest('hex').slice(0, 16);
      events.push({
        id: `${SOURCE_ID}-${hash}`,
        source: SOURCE_ID,
        sourceName: SOURCE_NAME,
        title: current.title + (current.soldOut ? ' (Utsolgt)' : ''),
        date: current.date,
        description: null,
        image: current.image || null,
        url: link || PROGRAM_URL,
        venue: SOURCE_NAME,
      });
    }
    current = null;
  };

  $('.sqs-block').each((_, el) => {
    const $el = $(el);

    if ($el.hasClass('html-block')) {
      const text = $el.find('.sqs-html-content').first().text().trim();
      if (!text) return;

      const parsed = parseShortNorwegianDate(text);
      if (parsed) {
        current = { date: parsed.date, soldOut: parsed.soldOut };
      } else if (current && !current.title) {
        current.title = stripHtml(text);
      }
    } else if ($el.hasClass('image-block') && current) {
      const img = $el.find('img').first();
      current.image = img.attr('data-src') || img.attr('src') || current.image;
    } else if ($el.hasClass('button-block') && current && current.title) {
      const href = $el.find('a').first().attr('href');
      pushCurrent(href);
    }
  });

  return events;
}

module.exports = { id: SOURCE_ID, name: SOURCE_NAME, fetchEvents };
