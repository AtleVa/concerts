const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { stripHtml } = require('../utils/text');

const SOURCE_ID = 'folken';
const SOURCE_NAME = 'Folken';
const PROGRAM_URL = 'https://www.folken.no/folken/';

const MONTHS = {
  // Norwegian
  januar: 0, februar: 1, mars: 2, april: 3, mai: 4, juni: 5,
  juli: 6, august: 7, september: 8, oktober: 9, november: 10, desember: 11,
  // English (Folken's date labels are rendered in English, e.g. "15 August")
  january: 0, february: 1, march: 2, may: 4, june: 5, july: 6,
  october: 9, december: 11,
};

/**
 * Folken (WordPress, LinTicket-powered) server-renders its full program as
 * plain <li class="list-item" data-type="..."> markup - a category
 * ("Konsert", "Comedy", "Quiz", "Teater", "Annet", "Film"), title+link,
 * poster image, a "DD monthname" date (no year, no weekday), a time, and a
 * ticket link. We only keep the "Konsert" category since that's what this
 * aggregator is about.
 */
async function fetchEvents() {
  const res = await fetch(PROGRAM_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (concert-aggregator/1.0)' },
  });

  if (!res.ok) {
    throw new Error(`Folken responded with ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const now = new Date();

  const events = [];

  $('.event-list.normal > li.list-item[data-type="Konsert"]').each((_, el) => {
    const $el = $(el);

    // Current markup uses BEM-style "fk-event__*" classes; the legacy
    // selectors are kept as fallbacks in case of a partial rollback.
    const titleLink = $el.find('.fk-event__title a, .title a').first();
    const title = stripHtml(titleLink.text());
    const url = titleLink.attr('href');
    if (!title) return;

    let image = $el.find('img.fk-event__image').first().attr('src') || null;
    if (!image) {
      const bgImage = $el.find('.image').first().attr('style') || '';
      const imageMatch = bgImage.match(/url\(([^)]+)\)/);
      image = imageMatch ? imageMatch[1].replace(/^['"]|['"]$/g, '') : null;
    }

    const $time = $el.find('time.fk-event__date').first();
    const isoDate = $time.attr('datetime') || '';
    const dayMonthText =
      $time.text().trim() ||
      $el
        .find('.info-item')
        .filter((i, item) => $(item).find('.fa-calendar-o').length > 0)
        .first()
        .text()
        .trim();
    const timeText =
      $el.find('.fk-event__time').first().text().trim() ||
      $el
        .find('.info-item')
        .filter((i, item) => $(item).find('.fa-clock-o').length > 0)
        .first()
        .text()
        .trim();

    const date = parseIsoDate(isoDate, timeText) || parseFolkenDate(dayMonthText, timeText, now);

    const description = stripHtml($el.find('.fk-event__teaser').first().text()) || null;

    const ticketUrl = $el
      .find('a[data-fk-tickets], a.fk-event__cta[href*="linticket"], a.buyticket')
      .first()
      .attr('href');

    events.push({
      id: `${SOURCE_ID}-${url ? url.split('/').filter(Boolean).pop() : title}`,
      source: SOURCE_ID,
      sourceName: SOURCE_NAME,
      title,
      date,
      description,
      image,
      url: ticketUrl || url || PROGRAM_URL,
      venue: SOURCE_NAME,
    });
  });

  return events;
}

function parseIsoDate(isoDate, timeText) {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
  const hours = timeMatch ? Number(timeMatch[1]) : 20;
  const minutes = timeMatch ? Number(timeMatch[2]) : 0;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hours, minutes);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseFolkenDate(dayMonthText, timeText, referenceDate) {
  const match = dayMonthText.match(/(\d{1,2})\.?\s+([a-zæøå]+)/i);
  if (!match) return null;

  const day = Number(match[1]);
  const month = MONTHS[match[2].toLowerCase()];
  if (month === undefined) return null;

  const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
  const hours = timeMatch ? Number(timeMatch[1]) : 20;
  const minutes = timeMatch ? Number(timeMatch[2]) : 0;

  let year = referenceDate.getFullYear();
  let date = new Date(year, month, day, hours, minutes);

  const oneWeekAgo = new Date(referenceDate);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  if (date < oneWeekAgo) {
    date = new Date(year + 1, month, day, hours, minutes);
  }

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

module.exports = { id: SOURCE_ID, name: SOURCE_NAME, fetchEvents };
