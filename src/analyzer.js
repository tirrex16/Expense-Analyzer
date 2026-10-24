/**
 * analyzer.js
 * Core engine: orchestrates parsing, categorization, and rendering.
 * This module is shared by both the CLI and the web UI.
 */

const { parseTransactions } = require('./parser');
const { categorize } = require('./categorizer');
const { renderMarkdown, renderJSON } = require('./renderer');

/**
 * Runs the full analysis pipeline on raw input text.
 * @param {string} input - raw user text
 * @param {'markdown'|'json'} format - output format
 * @returns {string|object}
 */
function analyze(input, format = 'markdown') {
  const transactions = parseTransactions(input);

  const categorized = transactions.map(t => ({
    ...t,
    category: categorize(t.name),
  }));

  if (format === 'json') return renderJSON(categorized);
  return renderMarkdown(categorized);
}

module.exports = { analyze };
