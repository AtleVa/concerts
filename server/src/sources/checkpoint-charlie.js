const fetch = require('node-fetch');
const { stripHtml, truncate } = require('../utils/text');

const SOURCE_ID = 'checkpoint-charlie';
const SOURCE_NAME = 'Checkpoint Charlie';
// This is the exact public endpoint checkpoint.no's own homepage calls
// (see program.js on their site) to render its "Program" section - a
// public LinTicket JSON feed scoped to venue/"Sted" id 1, no auth needed.
const API_URL =
  'https://www.linticket.no/api/index.php3?appid=b65d6dcb-64ec-4219-a431-5a9f24171a3e&action=events&Sted%5B1%5D=on';

async function fetchEvents() {
  const res = await fetch(API_URL, {
    headers: { 'User-Agent': 'concert-aggregator/1.0 (+stavanger-events)' },
  });

  if (!res.ok) {
    throw new Error(`Checkpoint Charlie (LinTicket) responded with ${res.status}`);
  }

  const events = await res.json();
  if (!Array.isArray(events)) return [];

  return events.map((e) => {
    const dateTime = e.dato && e.starttid ? `${e.dato}T${e.starttid}:00` : e.dato || null;
    const date = dateTime ? new Date(dateTime).toISOString() : null;
    const image = e.bilde_large || e.bilde_medium || e.bilde || null;
    const price = e.priser ? `${e.priser} kr` : null;

    return {
      id: `${SOURCE_ID}-${e.arrid}`,
      source: SOURCE_ID,
      sourceName: SOURCE_NAME,
      title: stripHtml(e.navn),
      date,
      description: truncate(
        [stripHtml(e.tekst), price ? `Pris: ${price}` : null].filter(Boolean).join(' — '),
        400
      ),
      image,
      url: e.link,
      venue: e.spillested || SOURCE_NAME,
    };
  });
}

module.exports = { id: SOURCE_ID, name: SOURCE_NAME, fetchEvents };
