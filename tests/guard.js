#!/usr/bin/env node
/* The gate that stands between an edit and the public domain.
 *
 * It runs in about a second, needs no browser and no npm install, so it can sit
 * in front of every deploy. It does not check that the page is good. It checks
 * the three things that turn a small edit into a bad afternoon:
 *
 *   1. the script still parses, because a page whose script throws renders
 *      nothing at all, and the domain serves the blank
 *   2. nothing from the live transaction has reached the page
 *   3. the house style holds
 *
 * The first one is not hypothetical. Typing an apostrophe inside a single
 * quoted string closes the string, and the failure looks nothing like its
 * cause: the whole page goes white and every symptom points somewhere else.
 *
 *   node tests/guard.js
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(FILE, 'utf8');

let bad = 0;
const fail = (what, detail) => { bad++; console.log('  FAIL  ' + what + (detail ? '\n        ' + detail : '')); };
const pass = what => console.log('  ok    ' + what);

/* ---- 1. the script parses ------------------------------------------- */
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!scripts.length) fail('the page has a script block at all');
else {
  const js = scripts.join('\n');
  try {
    new (require('vm').Script)(js, { filename: 'index.html' });
    pass('the page script parses (' + js.length.toLocaleString() + ' chars)');
  } catch (e) {
    // point at the line, since the browser symptom will not
    const line = (String(e.stack).match(/index\.html:(\d+)/) || [])[1];
    fail('the page script parses', e.message + (line ? '\n        near script line ' + line : '') +
      '\n        A stray apostrophe inside a \'single quoted\' string does this.' +
      '\n        Use "double quotes" for any text containing an apostrophe.');
  }
}

/* ---- 2. nothing from the live transaction ---------------------------- */
/* The deck this model was abstracted from is a live raise under NDA. Every
   party, agency and place it names stays off the page. Novo BioPower is the
   one public comparable and may appear only inside a benchmark line. */
const BANNED = ['Revi', 'Winslow', 'Lincoln', 'McBain', 'Atlas', 'National Salvage', 'Nexus',
  'BNP', 'Mammoet', 'seller ask', 'I-40', 'Zurn', 'RFOR', 'Interlink', 'M3 Construction',
  'Riffel', 'ADG', 'Puro Earth', 'APS', 'Navajo', 'ADEQ', 'ADWR', '4FRI', 'Michigan'];
const leaks = BANNED.filter(w => new RegExp('\\b' + w.replace(/-/g, '\\-') + '\\b', 'i').test(html));
if (leaks.length) fail('nothing from the live deal appears', leaks.join(', '));
else pass('nothing from the live deal appears');

const novo = [...html.matchAll(/Novo/g)].length;
const novoBench = /mkt[^\n]*Novo|Novo[^\n]*BioPower/.test(html);
if (novo && !novoBench) fail('the public comparable is cited only as a benchmark', novo + ' loose mentions');
else pass('the public comparable is cited only as a benchmark');

/* ---- 3. house style -------------------------------------------------- */
const body = html.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<style>[\s\S]*?<\/style>/g, '');
const prose = scripts.join('\n');

/* Only in prose. A dash is legitimate as the empty-cell glyph, as a CSS bullet
   and in the banners that divide the source, so look inside quoted strings long
   enough to be a sentence rather than at the whole file. */
const emLines = [...prose.matchAll(/(["'])((?:\\.|(?!\1).){40,})\1/g)]
  .map(m => m[2]).filter(t => t.includes('\u2014'));
if (emLines.length) fail('no em dashes in prose', emLines.slice(0, 3).map(t => t.slice(0, 70)).join('\n        '));
else pass('no em dashes in prose');

const BRIT = /\b(organis|recognis|analyse|behaviour|colour|favour|centre(?!s? of)|licence|defence|programme)/gi;
/* "centre" is allowed: data centres are the customer, and that is the spelling
   the industry uses. Everything else in the list is a slip. */
const brit = [...prose.matchAll(/\b(organis\w*|recognis\w*|amortis\w*|monetis\w*|analyse\w*|behaviour\w*|colour\w*|favour\w*|labour|licence|defence|programme|centre of)\b/gi)]
  .map(m => m[0]);
if (brit.length) fail('American spelling', [...new Set(brit)].join(', '));
else pass('American spelling');

/* The page is written about Gibson rather than by him, in the register of a
   proposal. First person is the thing that regresses: one edit slips an "I"
   back in and the document is half memo, half cover letter. Checked inside
   quoted prose only, so code comments can say what they like. */
const strings = [...prose.matchAll(/(["'])((?:\\.|(?!\1).){40,})\1/g)].map(m => m[2]);
const firstPerson = strings.filter(t => /\b(I|I'm|I'd|I've|I'll|my|My|me|myself|mine)\b/.test(t));
if (firstPerson.length)
  fail('the prose stays in the third person',
    firstPerson.slice(0, 3).map(t => t.slice(0, 70)).join('\n        '));
else pass('the prose stays in the third person (' + strings.length + ' prose strings)');

console.log('');
if (bad) { console.log(bad + ' check' + (bad > 1 ? 's' : '') + ' failed. Do not deploy this.'); process.exit(1); }
console.log('All guard checks passed.');
