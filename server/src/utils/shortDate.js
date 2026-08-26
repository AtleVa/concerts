const { MONTHS } = (() => {
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
  return { MONTHS };
})();

// "15. august" (no year - assume upcoming occurrence)
const MONTH_NAME_RE = new RegExp(
  `^(\\d{1,2})\\.?\\s*(${Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|')})[a-zæøå]*\\s*$`,
  'i'
);

// "16.10.26", "18.-19.09.26" (numeric, optional day range, 2 or 4 digit year)
const NUMERIC_RE = /^(\d{1,2})\.(?:-\d{1,2}\.)?(\d{1,2})\.(\d{2,4})/;

/**
 * Parses short standalone date labels used on venue "program" pages, such as
 * "15. august" or "16.10.26" (optionally followed by "UTSOLGT" = sold out).
 * Returns { date: isoString|null, soldOut: boolean } or null if the text
 * isn't recognizable as a date at all.
 */
function parseShortNorwegianDate(text, referenceDate = new Date()) {
  if (!text) return null;
  const soldOut = /utsolgt/i.test(text);
  const clean = text.replace(/utsolgt/i, '').trim();

  const numeric = clean.match(NUMERIC_RE);
  if (numeric) {
    const [, day, month, yearRaw] = numeric;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    const date = new Date(Number(year), Number(month) - 1, Number(day), 20, 0);
    return Number.isNaN(date.getTime()) ? null : { date: date.toISOString(), soldOut };
  }

  const named = clean.match(MONTH_NAME_RE);
  if (named) {
    const [, day, monthName] = named;
    const month = MONTHS[monthName.toLowerCase()];
    if (month === undefined) return null;

    let year = referenceDate.getFullYear();
    let date = new Date(year, month, Number(day), 20, 0);
    const oneWeekAgo = new Date(referenceDate);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    if (date < oneWeekAgo) {
      date = new Date(year + 1, month, Number(day), 20, 0);
    }
    return Number.isNaN(date.getTime()) ? null : { date: date.toISOString(), soldOut };
  }

  return null;
}

module.exports = { parseShortNorwegianDate };
