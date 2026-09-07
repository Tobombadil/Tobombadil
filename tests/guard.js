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

/* Voice. First person is allowed and wanted, used sparingly: for what was
   actually done, and for what is missing. The two failure modes are opposite,
   so both are checked.

   Too little, and the prose contorts around the absence of a subject. That is
   what produced "the work is sourcing", "the work sits before anything is
   written down" and a page that read like a reference written by a stranger.

   Too much, and it is a cover letter. Roughly a quarter of sentences carrying
   an I is the register; half of them is not. */
const strings = [...prose.matchAll(/(["'])((?:\\.|(?!\1).){40,})\1/g)].map(m => m[2]);
const sentences = strings.flatMap(t => t.split(/(?<=[.!?])\s+/)).filter(x => x.split(' ').length > 4);
const fp = sentences.filter(t => /\b(I|I'm|I'd|I've|I'll|my|My|me|myself)\b/.test(t));
const pct = Math.round(100 * fp.length / Math.max(sentences.length, 1));
if (!fp.length) fail('first person is used, rather than written around', '0 of ' + sentences.length + ' sentences');
else if (pct > 45) fail('first person stays sparing', pct + '% of sentences, want under 45');
else pass('first person is used sparingly (' + pct + '% of ' + sentences.length + ' sentences)');

/* Run-ons. A sentence past about thirty words stops being read and starts being
   scanned, and this page has drifted there twice: once at 43 words in the risk
   register, once across the summary at 36, 32 and 27. The page median is 10, so
   the bar is generous and only catches a genuine pile-up. The provenance notes
   that define a figure are dense by nature and sit just under it. */
const long = sentences.map(t => [t.split(/\s+/).length, t])
  .filter(([n]) => n > 34).sort((a, b) => b[0] - a[0]);
if (long.length)
  fail('no sentence runs on',
    long.slice(0, 3).map(([n, t]) => n + 'w: ' + t.slice(0, 70)).join('\n        '));
else pass('no sentence runs on (longest ' +
  Math.max(...sentences.map(t => t.split(/\s+/).length)) + 'w, median 10)');

/* Humble is the other half of the instruction, and it is the half a rewrite
   erodes without anyone noticing. These are the constructions that turn a
   record into a pitch. */
const BRAG = /\bI (?:am|'m) (?:passionate|confident|excited|a proven|an? (?:strong|natural|highly))\b|\bI believe\b|\bI (?:successfully|spearheaded|excel|thrive|pride myself)\b|\bproven track record\b|\bresults[- ]driven\b|\bworld[- ]class\b|\bself[- ]starter\b|\bwear many hats\b/i;
const brag = strings.filter(t => BRAG.test(t));
if (brag.length) fail('it states the record without selling it', brag.slice(0, 2).map(t => t.slice(0, 70)).join('\n        '));
else pass('it states the record without selling it');

console.log('');
if (bad) { console.log(bad + ' check' + (bad > 1 ? 's' : '') + ' failed. Do not deploy this.'); process.exit(1); }
console.log('All guard checks passed.');
