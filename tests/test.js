/**
 * tests/test.js — Unit tests for Expense Analyzer
 * Run: node tests/test.js
 */

const { parseAmount, parseTransactions } = require('../src/parser');
const { categorize } = require('../src/categorizer');
const { renderMarkdown, renderJSON, formatIDR } = require('../src/renderer');
const { analyze } = require('../src/analyzer');

let passed = 0;
let failed = 0;

function assert(description, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.error(`  ✗ ${description}`);
    console.error(`    Expected: ${JSON.stringify(expected)}`);
    console.error(`    Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

function assertContains(description, actual, substring) {
  const ok = typeof actual === 'string' && actual.includes(substring);
  if (ok) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.error(`  ✗ ${description}`);
    console.error(`    Expected to contain: "${substring}"`);
    console.error(`    Actual: ${actual}`);
    failed++;
  }
}

// ─── parseAmount ─────────────────────────────────────────────────────────────
console.log('\n[parseAmount]');
assert('plain integer',         parseAmount('45000'),    45000);
assert('dot thousands 150.000', parseAmount('150.000'),  150000);
assert('suffix ribu',           parseAmount('45ribu'),   45000);
assert('suffix rb',             parseAmount('60rb'),     60000);
assert('suffix k',              parseAmount('25k'),      25000);
assert('suffix jt',             parseAmount('2jt'),      2000000);
assert('decimal 18.500',        parseAmount('18500'),    18500);
assert('with Rp prefix',        parseAmount('Rp 32.500'),32500);
assert('invalid string',        parseAmount('abc'),      null);
assert('empty string',          parseAmount(''),         null);

// ─── parseTransactions ───────────────────────────────────────────────────────
console.log('\n[parseTransactions]');
const input1 = 'makan siang 45ribu, bensin 60rb, bayar listrik 150.000, beli kopi 25k, ojek online 18500, langganan Netflix 54000, beli obat 32.500';
const txns1 = parseTransactions(input1);
assert('parses 7 transactions', txns1.length, 7);
assert('first item name',       txns1[0].name, 'Makan Siang');
assert('first item amount',     txns1[0].amount, 45000);
assert('bensin amount',         txns1[1].amount, 60000);
assert('listrik amount',        txns1[2].amount, 150000);
assert('kopi amount',           txns1[3].amount, 25000);
assert('ojek amount',           txns1[4].amount, 18500);
assert('netflix amount',        txns1[5].amount, 54000);
assert('obat amount',           txns1[6].amount, 32500);

const txnsEmpty = parseTransactions('no numbers here at all');
assert('returns empty for no numbers', txnsEmpty.length, 0);

const txnsEmpty2 = parseTransactions('');
assert('returns empty for empty string', txnsEmpty2.length, 0);

// ─── categorize ──────────────────────────────────────────────────────────────
console.log('\n[categorize]');
assert('Makan Siang → Konsumsi',       categorize('Makan Siang'),   'Konsumsi');
assert('Kopi → Konsumsi',              categorize('Kopi'),          'Konsumsi');
assert('Bensin → Transportasi',        categorize('Bensin'),        'Transportasi');
assert('Ojek Online → Transportasi',   categorize('Ojek Online'),   'Transportasi');
assert('Listrik → Utilitas',           categorize('Listrik'),       'Utilitas');
assert('Netflix → Operasional',        categorize('Netflix'),       'Operasional');
assert('Obat → Lain-lain',             categorize('Obat'),          'Lain-lain');
assert('Pulsa → Utilitas',             categorize('Pulsa'),         'Utilitas');
assert('Unknown item → Lain-lain',     categorize('Xyz Random'),    'Lain-lain');

// ─── formatIDR ───────────────────────────────────────────────────────────────
console.log('\n[formatIDR]');
assert('45000 → Rp 45.000',   formatIDR(45000),   'Rp 45.000');
assert('150000 → Rp 150.000', formatIDR(150000),  'Rp 150.000');
assert('1500000 → Rp 1.500.000', formatIDR(1500000), 'Rp 1.500.000');

// ─── renderMarkdown ───────────────────────────────────────────────────────────
console.log('\n[renderMarkdown]');
const sampleTxns = [
  { name: 'Makan Siang', amount: 45000, category: 'Konsumsi' },
  { name: 'Bensin',      amount: 60000, category: 'Transportasi' },
];
const md = renderMarkdown(sampleTxns);
assertContains('contains header row',         md, '| No | Barang/Jasa |');
assertContains('contains Makan Siang',        md, 'Makan Siang');
assertContains('contains Rp 45.000',          md, 'Rp 45.000');
assertContains('contains TOTAL PENGELUARAN',  md, 'TOTAL PENGELUARAN');
assertContains('total is Rp 105.000',         md, 'Rp 105.000');

const mdEmpty = renderMarkdown([]);
assert('empty → error string', mdEmpty, 'Error: No transaction data detected.');

// ─── renderJSON ───────────────────────────────────────────────────────────────
console.log('\n[renderJSON]');
const json = renderJSON(sampleTxns);
assert('json has 2 rows',          json.rows.length,           2);
assert('json total',               json.total,                 105000);
assert('json totalFormatted',      json.totalFormatted,        'Rp 105.000');
assert('json no error',            json.error,                 null);
assert('json first row no',        json.rows[0].no,            1);
assert('json first row category',  json.rows[0].category,      'Konsumsi');

const jsonEmpty = renderJSON([]);
assert('empty json error', jsonEmpty.error, 'Error: No transaction data detected.');

// ─── Full pipeline (analyze) ──────────────────────────────────────────────────
console.log('\n[analyze — full pipeline]');
const fullMd = analyze('makan siang 45ribu, bensin 60rb, bayar listrik 150.000, beli kopi 25k, ojek online 18500, langganan Netflix 54000, beli obat 32.500');
assertContains('full pipeline: header',      fullMd, '| No | Barang/Jasa |');
assertContains('full pipeline: total',       fullMd, 'Rp 385.000');
assertContains('full pipeline: Netflix',     fullMd, 'Netflix');
assertContains('full pipeline: Operasional', fullMd, 'Operasional');

const fullJson = analyze('makan 20ribu', 'json');
assert('json pipeline: rows count', fullJson.rows.length, 1);
assert('json pipeline: total',      fullJson.total,       20000);

const noData = analyze('tidak ada angka sama sekali');
assert('no data: error output', noData, 'Error: No transaction data detected.');

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n─────────────────────────────────`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
