const fetch = require('node-fetch');
const { stripHtml, truncate } = require('../utils/text');

const SOURCE_ID = 'tou';
const SOURCE_NAME = 'TOU';
const API_BASE = 'https://www.touofficial.com/arrangementer/wp-json/wp/v2';

/**
 * TOU also runs WordPress with a custom "event" post type, but instead of
 * free prose it embeds a debug dump of the raw LinTicket event JSON straight
 * into the post body ("Default Twig-template for showing the complete
 * JSON-data: {...}"). That blob contains real structured fields (dato,
 * navn, link, bilde_large, priser, tekst, utsolgt, arrid, etc.) - we pull
 * those out with targeted regexes rather than JSON.parse, since the
 * embedded "tekst" field contains raw (unescaped) newlines that break
 * strict JSON parsing.
 */
async function fetchEvents() {
  const url = `${API_BASE}/event?per_page=100&orderby=date&order=desc`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'concert-aggregator/1.0 (+stavanger-events)' },
  });

  if (!res.ok) {
    throw new Error(`TOU API responded with ${res.status}`);
  }

  const posts = await res.json();
  const seenArrIds = new Set();
  const events = [];

  posts.forEach((post) => {
    const html = post.content && post.content.rendered;
    if (!html) return;

    const blobMatch = html.match(
      /Default Twig-template for showing the complete JSON-data:<br\s*\/?>\s*([\s\S]*)/
    );
    if (!blobMatch) return;

    const blob = decodeEntities(blobMatch[1]);
    const field = (name) => {
      const m = blob.match(new RegExp(`"${name}":"([^"]*)"`));
      return m ? m[1] : null;
    };
    // "tekst" is the only field that can itself contain literal double
    // quotes (from embedded HTML attributes), so it needs its own
    // non-greedy match anchored to the field that always follows it.
    const tekstMatch = blob.match(/"tekst":"([\s\S]*?)","teaser"/);

    const arrid = field('arrid');
    if (arrid) {
      if (seenArrIds.has(arrid)) return;
      seenArrIds.add(arrid);
    }

    const navn = field('navn');
    const dato = field('dato') || field('datoshowfrom');
    if (!navn || !dato) return;

    const link = field('link');
    const image = field('bilde_large') || field('bilde_medium') || field('bilde');
    const priser = field('priser');
    const utsolgt = field('utsolgt') === 'true';
    const sted = fixBrokenUnicodeEscapes(field('sted') || '');
    const tekst = stripHtml(fixBrokenUnicodeEscapes(tekstMatch ? tekstMatch[1] : ''));

    events.push({
      id: `${SOURCE_ID}-${arrid || post.id}`,
      source: SOURCE_ID,
      sourceName: SOURCE_NAME,
      title: stripHtml(fixBrokenUnicodeEscapes(navn)) + (utsolgt ? ' (Utsolgt)' : ''),
      date: new Date(`${dato}T19:00:00`).toISOString(),
      description: truncate(
        [sted ? `Scene: ${sted}` : null, tekst, priser ? `Pris: ${priser} kr` : null]
          .filter(Boolean)
          .join(' — '),
        400
      ),
      image: image || null,
      url: link || post.link,
      venue: SOURCE_NAME,
    });
  });

  return events;
}

function decodeEntities(str) {
  return str
    .replace(/&#8220;|&#8221;|&#8243;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8217;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&aring;/g, 'å')
    .replace(/&oslash;/g, 'ø')
    .replace(/&aelig;/g, 'æ')
    .replace(/&hellip;/g, '...');
}

// TOU's own Twig template drops the backslash from JSON unicode escapes in
// free text (e.g. "på" becomes "pu00e5" instead of "p\u00e5"). Restore the
// common Norwegian characters affected by this upstream bug, then fall back
// to a generic decode for any other stray "uXXXX" escape sequences.
function fixBrokenUnicodeEscapes(str) {
  return str
    .replace(/u00e5/g, 'å')
    .replace(/u00f8/g, 'ø')
    .replace(/u00e6/g, 'æ')
    .replace(/u00c5/g, 'Å')
    .replace(/u00d8/g, 'Ø')
    .replace(/u00c6/g, 'Æ')
    .replace(/u00e9/g, 'é')
    .replace(/u00e8/g, 'è')
    .replace(/u00bb/g, '»')
    .replace(/u00ab/g, '«')
    .replace(/u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

module.exports = { id: SOURCE_ID, name: SOURCE_NAME, fetchEvents };
