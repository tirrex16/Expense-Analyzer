/**
 * parser.js
 * Extracts transactions (item name + amount in IDR) from raw unstructured text.
 */

/**
 * Normalizes amount strings like "45ribu", "60rb", "150.000", "25k", "18500"
 * into plain integer IDR values.
 * @param {string} raw - raw amount token
 * @returns {number|null}
 */
function parseAmount(raw) {
  if (!raw) return null;

  // Remove currency prefixes (Rp, rp)
  let cleaned = raw.replace(/^rp\.?\s*/i, '').trim();

  // Handle dot-separated thousands: "150.000" → "150000"
  // Only when dots appear as thousand separators (groups of 3 digits)
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '');
  }

  // Handle comma as decimal separator or thousand separator
  cleaned = cleaned.replace(/,/g, '');

  // Handle suffixes: k / rb / ribu → ×1000, jt / juta → ×1000000
  const suffixMatch = cleaned.match(/^([\d.]+)\s*(k|rb|ribu|jt|juta)$/i);
  if (suffixMatch) {
    const base = parseFloat(suffixMatch[1]);
    const suffix = suffixMatch[2].toLowerCase();
    if (suffix === 'k' || suffix === 'rb' || suffix === 'ribu') return Math.round(base * 1000);
    if (suffix === 'jt' || suffix === 'juta') return Math.round(base * 1000000);
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num);
}

/**
 * Parses raw input text into an array of { name, amount } transaction objects.
 * Strategy: split on common delimiters (comma, semicolon, newline),
 * then for each segment extract the last numeric token as the amount
 * and the preceding text as the item name.
 * @param {string} input
 * @returns {{ name: string, amount: number }[]}
 */
function parseTransactions(input) {
  if (!input || typeof input !== 'string') return [];

  // Split into segments by comma, semicolon, or newline
  const segments = input
    .split(/[,;\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const transactions = [];

  // Regex to capture: optional "Rp"/"rp", then a number with optional suffix
  const amountPattern = /(?:rp\.?\s*)?([\d.,]+\s*(?:k|rb|ribu|jt|juta)?)\s*$/i;

  for (const segment of segments) {
    const match = segment.match(amountPattern);
    if (!match) continue;

    const rawAmount = match[1].trim();
    const amount = parseAmount(rawAmount);
    if (amount === null || amount <= 0) continue;

    // Item name is everything before the amount token
    const nameRaw = segment.slice(0, match.index).trim();

    // Clean up leading action words (beli, bayar, beli, langganan, isi, dll)
    const name = nameRaw
      .replace(/^(beli|bayar|langganan|isi|pesan|bayar|beli)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (name.length === 0) continue;

    // Capitalize first letter of each word
    const formattedName = name
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    transactions.push({ name: formattedName, amount });
  }

  return transactions;
}

module.exports = { parseTransactions, parseAmount };
