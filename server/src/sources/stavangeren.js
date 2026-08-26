const fetch = require('node-fetch');
const { stripHtml, truncate } = require('../utils/text');
const { extractNorwegianDate } = require('../utils/norwegianDate');

const SOURCE_ID = 'stavangeren';
const SOURCE_NAME = 'Stavangeren';
const API_BASE = 'https://www.stavangeren.no/wp-json/wp/v2';

/**
 * Stavangeren runs WordPress with a custom "event" post type that is
 * exposed through the standard WP REST API. This is a stable, structured
 * JSON source (no HTML scraping needed).
 */
async function fetchEvents() {
  const url = `${API_BASE}/event?per_page=50&orderby=date&order=desc&_embed=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'concert-aggregator/1.0 (+stavanger-events)' },
  });

  if (!res.ok) {
    throw new Error(`Stavangeren API responded with ${res.status}`);
  }

  const posts = await res.json();

  return posts.map((post) => {
    const media =
      post._embedded &&
      post._embedded['wp:featuredmedia'] &&
      post._embedded['wp:featuredmedia'][0];

    const plainContent = stripHtml(post.content && post.content.rendered);
    const plainTitle = stripHtml(post.title && post.title.rendered);
    // The WP REST API doesn't expose a structured "event date" field - only
    // publish/modified timestamps. Most listings mention the actual date in
    // the body text (e.g. "den 21 august kl 21.00"), so we parse it from
    // there and only fall back to null (unknown) rather than the misleading
    // publish date.
    const date = extractNorwegianDate(`${plainTitle} ${plainContent}`, new Date(post.date));

    return {
      id: `${SOURCE_ID}-${post.id}`,
      source: SOURCE_ID,
      sourceName: SOURCE_NAME,
      title: plainTitle,
      date,
      description: truncate(plainContent, 400),
      image: (media && media.source_url) || null,
      url: post.link,
      venue: SOURCE_NAME,
    };
  });
}

module.exports = { id: SOURCE_ID, name: SOURCE_NAME, fetchEvents };
