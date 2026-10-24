/**
 * renderer.js
 * Renders a list of categorized transactions into:
 *   - Markdown table (for CLI output)
 *   - Structured JSON (for web UI / further processing)
 */

/**
 * Formats a number as IDR currency string: "Rp 45.000"
 * @param {number} amount
 * @returns {string}
 */
function formatIDR(amount) {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

/**
 * Renders transactions as a Markdown table with TOTAL PENGELUARAN row.
 * @param {{ name: string, amount: number, category: string }[]} transactions
 * @returns {string}
 */
function renderMarkdown(transactions) {
  if (!transactions || transactions.length === 0) {
    return 'Error: No transaction data detected.';
  }

  const header = '| No | Barang/Jasa | Nominal (Rp) | Kategori |\n'
               + '|----|-------------|--------------|----------|';

  const rows = transactions.map((t, i) =>
    `| ${i + 1}  | ${t.name} | ${formatIDR(t.amount)} | ${t.category} |`
  );

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalRow = `|    | **TOTAL PENGELUARAN** | **${formatIDR(total)}** |  |`;

  return [header, ...rows, totalRow].join('\n');
}

/**
 * Renders transactions as a structured result object (for JSON/web use).
 * @param {{ name: string, amount: number, category: string }[]} transactions
 * @returns {{ rows: object[], total: number, error: string|null }}
 */
function renderJSON(transactions) {
  if (!transactions || transactions.length === 0) {
    return { rows: [], total: 0, error: 'Error: No transaction data detected.' };
  }

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  return {
    rows: transactions.map((t, i) => ({
      no: i + 1,
      name: t.name,
      amount: t.amount,
      amountFormatted: formatIDR(t.amount),
      category: t.category,
    })),
    total,
    totalFormatted: formatIDR(total),
    error: null,
  };
}

module.exports = { renderMarkdown, renderJSON, formatIDR };
