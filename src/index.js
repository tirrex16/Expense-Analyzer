#!/usr/bin/env node
/**
 * index.js — CLI entry point for Expense Analyzer
 *
 * Usage:
 *   echo "makan siang 45ribu, bensin 60rb" | node src/index.js
 *   node src/index.js "makan siang 45ribu, bensin 60rb"
 *   node src/index.js --json "makan siang 45ribu, bensin 60rb"
 */

const { analyze } = require('./analyzer');

const args = process.argv.slice(2);
const jsonFlag = args.includes('--json');
const inputArgs = args.filter(a => a !== '--json');

function run(input) {
  if (!input || input.trim().length === 0) {
    process.stderr.write('Usage: node src/index.js [--json] "<expense text>"\n');
    process.exit(1);
  }

  const result = analyze(input, jsonFlag ? 'json' : 'markdown');

  if (jsonFlag) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result);
  }
}

// If input provided as argument
if (inputArgs.length > 0) {
  run(inputArgs.join(' '));
} else {
  // Read from stdin (pipe mode)
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { data += chunk; });
  process.stdin.on('end', () => run(data.trim()));
}
