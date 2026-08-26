/** Strip HTML tags and decode common entities, collapsing whitespace. */
function stripHtml(html) {
  if (!html) return '';
  const withoutTags = String(html).replace(/<[^>]*>/g, ' ');
  const decoded = withoutTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // Numeric entities, e.g. &#8211; (en dash), &#8217; (right quote)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&');
  return decoded.replace(/\s+/g, ' ').trim();
}

/** Truncate text to maxLen chars, breaking on a word boundary. */
function truncate(text, maxLen) {
  if (!text || text.length <= maxLen) return text || '';
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLen)}…`;
}

module.exports = { stripHtml, truncate };
