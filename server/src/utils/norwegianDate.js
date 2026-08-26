const MONTHS = {
  jan: 0, januar: 0,
  feb: 1, februar: 1,
  mar: 2, mars: 2,
  apr: 3, april: 3,
  mai: 4,
  jun: 5, juni: 5,
  jul: 6, juli: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  okt: 9, oktober: 9,
  nov: 10, november: 10,
  des: 11, desember: 11,
};

const MONTH_NAMES = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');

// Matches "21 august", "18. sept", "13.nov" etc., optionally followed by a
// "kl 21:00" / "kl. 21.00" time and/or a 4-digit year.
const DATE_RE = new RegExp(
  `(\\d{1,2})\\.?\\s*(${MONTH_NAMES})[a-zæøå]*` +
    `(?:\\s+(\\d{4}))?` +
    `(?:\\s*,?\\s*kl\\.?\\s*(\\d{1,2})[:.](\\d{2}))?`,
  'gi'
);

/**
 * Best-effort extraction of a Norwegian-language event date/time from free
 * text (e.g. "den 21 august kl 21.00" or "flyttet ... til 13.nov kl 21:30").
 * When a post mentions multiple dates (common for rescheduled shows) the
 * LAST match is used, since venues consistently write the new date last
 * ("flyttet fra X til Y").
 * Returns an ISO string or null if no date could be confidently parsed.
 */
function extractNorwegianDate(text, referenceDate = new Date()) {
  if (!text) return null;

  const matches = [...text.matchAll(DATE_RE)];
  if (matches.length === 0) return null;

  const last = matches[matches.length - 1];
  const [, day, monthRaw, yearRaw, hourRaw, minuteRaw] = last;
  const month = MONTHS[monthRaw.toLowerCase()];
  if (month === undefined) return null;

  const hour = hourRaw ? parseInt(hourRaw, 10) : 20;
  const minute = minuteRaw ? parseInt(minuteRaw, 10) : 0;

  let year = yearRaw ? parseInt(yearRaw, 10) : referenceDate.getFullYear();
  let candidate = new Date(year, month, parseInt(day, 10), hour, minute);

  // No explicit year: these listings are almost always upcoming events, so
  // if the guessed date already fell far in the past, assume next year.
  if (!yearRaw) {
    const oneWeekAgo = new Date(referenceDate);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    if (candidate < oneWeekAgo) {
      candidate = new Date(year + 1, month, parseInt(day, 10), hour, minute);
    }
  }

  return Number.isNaN(candidate.getTime()) ? null : candidate.toISOString();
}

module.exports = { extractNorwegianDate };
