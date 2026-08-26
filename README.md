# Stavanger Concerts

A React app that aggregates upcoming concert/event listings from Stavanger
venues and displays them in one searchable, filterable page.

## Sources

| Venue | Method |
|---|---|
| **Stavangeren** | WordPress REST API (`/wp-json/wp/v2/event`) - fully structured, most reliable source. Event dates aren't exposed as a structured field, so they're best-effort parsed from the Norwegian post text (e.g. "den 21 august kl 21.00"). Events with no parseable date are still shown, flagged as "Date TBA". |
| **Fiskepiren** | Squarespace's native Events collection is unused/empty on this site - the real program is hand-built page content (date label → title → poster → ticket button). The adapter scrapes `/program`'s content blocks in document order and groups them into events. |
| **Checkpoint Charlie** | checkpoint.no's homepage renders its program via an AJAX call to a public (no-auth) LinTicket JSON API (`action=events`, scoped to their venue id). The adapter calls that same public endpoint directly. |
| **TOU** | WordPress REST API (`/wp-json/wp/v2/event`), same as Stavangeren, but each post's body embeds a raw debug dump of the underlying LinTicket event JSON ("Default Twig-template..."). The adapter extracts structured fields (date, title, image, price, ticket link) straight out of that embedded blob via targeted regexes, and works around an upstream bug where Norwegian unicode escapes in free text lose their backslash (e.g. "på" ships as "pu00e5"). |
| **Stavanger konserthus** | WordPress + the Tixly ticketing plugin. The best-structured source: `/program/` is server-rendered with full schema.org `Event` microdata per item (`itemprop="name"/"startDate"/"location"`), so the adapter just scrapes that markup directly with cheerio - no JSON reverse-engineering needed. |
| **Folken** | WordPress + LinTicket, server-rendered `<li class="list-item" data-type="Konsert">` markup on `/folken/` with title, poster, a "DD Monthname" date label (rendered in English, e.g. "15 August" - not Norwegian "august"), time, and ticket link. The adapter scrapes this directly and filters to `data-type="Konsert"` only (the same listing also covers Comedy/Quiz/Teater/Film). |

Each source runs independently (`Promise.allSettled`) - if one site changes its
markup or goes down, the others keep working and the frontend shows a
per-source status pill.

## Project structure

```
server/   Node/Express aggregator API (source adapters + 30-min cache)
client/   React (Vite) frontend
```

## Running locally

**Backend** (http://localhost:4000):
```
cd server
npm install
npm start        # or `npm run dev` for auto-reload
```

**Frontend** (http://localhost:5173):
```
cd client
npm install
npm run dev
```

The client reads the API URL from `client/.env` (`VITE_API_BASE_URL`,
defaults to `http://localhost:4000`).

## API

- `GET /api/events` - aggregated, deduplicated, upcoming-only events, sorted
  by date (undated events last). Cached for 30 minutes.
- `GET /api/events?refresh=1` - bypasses the cache and re-fetches all sources.
- `GET /api/sources` - list of configured sources.

## Adding another venue

Add a new file under `server/src/sources/` exporting `{ id, name,
fetchEvents() }` (see `stavangeren.js` for the structured-API pattern, or
`checkpoint-charlie.js` for the HTML-scraping fallback pattern), then add it
to the `SOURCES` array in `server/src/aggregator.js`.
