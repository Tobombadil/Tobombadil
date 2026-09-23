/* 4.0, the capture case.
 *
 * The page's figures come out of its own formula engine. This file recomputes
 * the same economics in plain JavaScript, sharing no code with the page, and
 * requires the two to agree across random settings of every dial. Then it
 * checks the parts a reader acts on: the verdict, the band, the tariff marker,
 * and that the reset belongs to this model alone.
 *
 *   node tests/capture.js
 */
const { chromium } = require('playwright');
const fails = [], ok = [];
const check = (n, c, d) => (c ? ok : fails).push(n + (d !== undefined ? ` → ${d}` : ''));
const near = (a, b, t = 1e-6) => Math.abs(a - b) <= t * Math.max(1, Math.abs(b));

/* ---- the reference model ---------------------------------------------- */
const ann = (r, n) => (1 - Math.pow(1 + r, -n)) / r;
const irr = cf => {
  const npv = r => cf.reduce((s, c, i) => s + c / Math.pow(1 + r, i), 0);
  let lo = -0.9999, hi = 10;
  if (npv(lo) * npv(hi) > 0) return NaN;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; (npv(lo) * npv(m) < 0) ? hi = m : lo = m; }
  return (lo + hi) / 2;
};
function reference(a) {
  const kgPerGal = 44.01 / 46.07 * 0.7893 * 3.78541;
  const kt = a.C5 * kgPerGal * a.C7;                       // thousand tonnes a year, one plant
  const mt = kt * a.C27 / 1000;                            // system, million tonnes a year
  const n = 12, dp = 5, credit = 85;
  const aP = ann(a.C12, n), aQ = ann(a.C29, n);
  /* §45Z: $1.00 a gallon scaled by the score's distance below 50 kg/mmBtu */
  const after = a.C59 - kgPerGal * a.C7 / 0.07633 - a.C61;
  const zT = Math.max(0, Math.min(1, (50 - after) / 50)) * 1000 / (kgPerGal * a.C7);
  /* one credit a year, never both */
  const creditY = y => a.C17 === 1 && y <= a.C66 ? zT * a.C15 : (y <= dp ? credit : credit * a.C15);
  let pv = 0; for (let y = 1; y <= n; y++) pv += creditY(y) / Math.pow(1 + a.C12, y);
  const creditT = pv / aP;
  const capT = a.C10 / (kt / 1000 * aP);
  const ceil = creditT - a.C11 - capT;
  const pipeCapex = a.C26 + a.C23 * (a.C22 === 1 ? a.C25 : a.C24);
  const floor = pipeCapex / (mt * aQ) + a.C28;
  const plantCf = [-a.C10], pipeCf = [-pipeCapex];
  for (let y = 1; y <= n; y++) {
    plantCf.push(kt / 1000 * (creditY(y) - a.C11 - a.C14));
    pipeCf.push(mt * (a.C14 - a.C28));
  }
  const zone = ceil - floor;
  return { ceil, floor, zone,
    plantNpv:(ceil - a.C14) * kt / 1000 * aP, pipeNpv:(a.C14 - floor) * mt * aQ,
    share:zone > 0 ? Math.max(0, Math.min(1, (ceil - a.C14) / zone)) : 0,
    plantIrr:irr(plantCf), pipeIrr:irr(pipeCf) };
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{ width:1280, height:1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').join(__dirname, '..', 'index.html'));
  await p.waitForTimeout(1100);
  check('no page errors', errs.length === 0, errs.join(' | '));

  /* ---- the page against the reference, at base and at random ---------- */
  const runs = await p.evaluate(n => {
    const cells = SHEET_BY_NAME['Capture'].cells;
    const ins = Object.entries(cells).filter(([, d]) => d.input);
    const rnd = d => { const s = Math.floor((d.max - d.min) / d.step);
      return +(d.min + d.step * Math.floor(Math.random() * (s + 1))).toFixed(6); };
    const out = [];
    for (let i = 0; i < n; i++) {
      const ov = {};
      if (i > 0) { ins.forEach(([k, d]) => ov['Capture!' + k] = rnd(d));
        ov['Capture!C22'] = i % 2; ov['Capture!C17'] = (i >> 1) % 2; }
      const C = r => readCell('Capture', r);
      const a = {}; ins.concat([['C22'], ['C17']]).forEach(([k]) => a[k] = ov['Capture!' + k] ?? C(k));
      out.push({ a, got:underScenario(ov, () => ({
        ceil:C('C38'), floor:C('C39'), zone:C('C40'), plantNpv:C('C41'), pipeNpv:C('C42'),
        share:C('C43'), plantIrr:C('C45'), pipeIrr:C('C46'),
        /* the same NPVs, discounted from the year-by-year rows instead */
        rowPlant:['B','C','D','E','F','G','H','I','J','K','L','M','N']
          .reduce((s, c, y) => s + C(c + '50') / Math.pow(1 + C('C12'), y), 0),
        rowPipe:['B','C','D','E','F','G','H','I','J','K','L','M','N']
          .reduce((s, c, y) => s + C(c + '51') / Math.pow(1 + C('C29'), y), 0),
      })) });
    }
    return out;
  }, 60);
  const keys = ['ceil', 'floor', 'zone', 'plantNpv', 'pipeNpv', 'share'];
  const drift = [];
  runs.forEach(({ a, got }, i) => {
    const want = reference(a);
    keys.forEach(k => { if (!near(got[k], want[k], 1e-9)) drift.push(`run ${i} ${k}: ${got[k]} vs ${want[k]}`); });
    ['plantIrr', 'pipeIrr'].forEach(k => {
      const g = got[k], w = want[k];
      if (!(Number.isNaN(w) ? !isFinite(g) || typeof g !== 'number' : near(g, w, 1e-6)))
        drift.push(`run ${i} ${k}: ${g} vs ${w}`);
    });
  });
  check('the capture model matches an independent one across 60 settings', drift.length === 0,
        drift.slice(0, 3).join(' | ') || runs.length + ' runs');
  check('the closed-form NPVs equal the year-by-year cash flows',
        runs.every(({ got }) => near(got.rowPlant, got.plantNpv, 1e-9) && near(got.rowPipe, got.pipeNpv, 1e-9)),
        runs.filter(({ got }) => !near(got.rowPlant, got.plantNpv, 1e-9)).length + ' plant mismatches');
  check('the base case is a deal, with room on both sides',
        runs[0].got.zone > 0 && runs[0].got.plantNpv > 0 && runs[0].got.pipeNpv > 0,
        `band $${runs[0].got.zone.toFixed(1)}/t, plant $${runs[0].got.plantNpv.toFixed(1)}M, pipe $${runs[0].got.pipeNpv.toFixed(1)}M`);

  /* the tariff divides the band and does not change its size */
  const split = await p.evaluate(() => [5, 20, 35, 60, 90].map(t =>
    underScenario({ 'Capture!C14':t }, () => ({ zone:readCell('Capture', 'C40'),
      parts:readCell('Capture', 'C44') + (t - readCell('Capture', 'C39')) }))));
  check('the tariff moves value between the sides, not the size of the band',
        split.every(s => near(s.parts, s.zone, 1e-9) && near(s.zone, split[0].zone, 1e-9)),
        split.map(s => s.zone.toFixed(2)).join(', '));

  /* ---- the credits never stack ------------------------------------------ */
  const stack = await p.evaluate(() => [0, 1].map(el => underScenario({ 'Capture!C17':el }, () => {
    const C = r => readCell('Capture', r);
    const cols = ['C','D','E','F','G','H','I','J','K','L','M','N'];
    const z = C('C65') * C('C15'), qd = C('C18'), qt = C('C18') * C('C15');
    return cols.map((c, i) => { const v = C(c + '52'), y = i + 1;
      const want = el === 1 && y <= C('C66') ? z : (y <= C('C20') ? qd : qt);
      return { y, v, want }; });
  })));
  check('each year carries exactly one credit, never both',
        stack.every(run => run.every(r => near(r.v, r.want, 1e-9))),
        stack.map((run, el) => (el ? '§45Z then §45Q: ' : '§45Q: ') + run.map(r => r.v.toFixed(0)).join('/')).join(' · '));
  const zs = await p.evaluate(() => {
    const at = (el, more) => underScenario({ 'Capture!C17':el, 'Capture!C61':more }, () => readCell('Capture', 'C38'));
    return { q0:at(0, 0), q20:at(0, 20), z0:at(1, 0), z20:at(1, 20) };
  });
  check('avoided emissions pay only under §45Z',
        near(zs.q0, zs.q20, 1e-12) && zs.z20 > zs.z0,
        `§45Q ${zs.q0.toFixed(1)} → ${zs.q20.toFixed(1)}, §45Z ${zs.z0.toFixed(1)} → ${zs.z20.toFixed(1)} $/t`);
  const dim = await p.evaluate(async () => {
    const n = () => document.querySelectorAll('#capture .ccz.off').length;
    const before = n();
    overrides['Capture!C17'] = 1; recalc(); const after = n();
    delete overrides['Capture!C17']; recalc();
    return { before, after };
  });
  check('the §45Z dials read as inactive unless §45Z is claimed', dim.before > 0 && dim.after === 0,
        `${dim.before} dimmed under §45Q, ${dim.after} under §45Z`);

  /* ---- statute stays statute ------------------------------------------ */
  const law = await p.evaluate(() => ['C18', 'C19', 'C20', 'C56', 'C57'].map(r => [r, rawOf('Capture', r)]));
  check('the credits, their periods and direct pay are stated, not derived',
        law.map(([, v]) => v).join() === '85,12,5,1,50', law.map(x => x.join('=')).join(' '));
  const co2 = await p.evaluate(() => [rawOf('Capture', 'C6'), readCell('Capture', 'C6')]);
  check('CO₂ per gallon is chemistry, computed rather than typed',
        /^=/.test(co2[0]) && co2[1] > 2.8 && co2[1] < 2.9, co2[1].toFixed(3) + ' kg');

  /* ---- every dial carries a benchmark ---------------------------------- */
  const bench = await p.evaluate(() => {
    const A = SHEET_BY_NAME['Capture'].cells;
    const bare = Object.entries(A).filter(([, d]) => d.input && !(d.mkt && d.s)).map(([k]) => k);
    const unknown = Object.entries(A).filter(([, d]) => d.s && !BENCH[d.s]).map(([k]) => k);
    const bad = Object.entries(A).filter(([, d]) => d.mkt && !(d.mkt[0] < d.mkt[1])).map(([k]) => k);
    const held = ['C6', 'C18', 'C19', 'C20', 'C56', 'C57', 'C58'].filter(k => !A[k].s);
    return { bare, unknown, bad, held };
  });
  check('every capture dial carries a range and a source', bench.bare.length === 0, bench.bare.join(', ') || 'all');
  check('and every held figure a source', bench.held.length === 0, bench.held.join(', ') || 'all');
  check('every capture source tag is one the page can explain', bench.unknown.length === 0, bench.unknown.join(', ') || 'all');
  check('every capture range runs low to high', bench.bad.length === 0, bench.bad.join(', ') || 'all');

  /* ---- the verdict is the model's -------------------------------------- */
  const verdict = async () => p.evaluate(() => ({
    word:document.querySelector('#capture .qverdict').textContent,
    yes:!document.getElementById('cc-yes').hidden, no:!document.getElementById('cc-no').hidden,
    band:document.querySelector('#zone rect[data-band]').dataset.band,
    neg:document.querySelector('[data-ctile="C40"]').classList.contains('neg') }));
  const v1 = await verdict();
  check('a positive band reads yes, and quotes the split', v1.word === 'On these inputs, yes.' && v1.yes && !v1.no
        && v1.band === 'deal' && !v1.neg, JSON.stringify(v1));
  await p.evaluate(() => { document.getElementById('in-Capture-C27').value = 2;
    document.getElementById('in-Capture-C27').dispatchEvent(new Event('input')); });
  await p.waitForTimeout(200);
  const v2 = await verdict();
  check('two plants cannot carry a new-build line, and the page says no',
        v2.word === 'On these inputs, no.' && !v2.yes && v2.no && v2.band === 'none' && v2.neg, JSON.stringify(v2));

  /* ---- the chart draws what the cells hold ----------------------------- */
  const geo = await p.evaluate(() => {
    const svg = document.querySelector('#zone svg');
    const vb = svg.viewBox.baseVal;
    const band = svg.querySelector('rect[data-band]');
    const ends = [...svg.querySelectorAll('line[data-end]')].reduce((o, l) => (o[l.dataset.end] = +l.getAttribute('x1'), o), {});
    return { vbW:vb.width, box:document.getElementById('zone').clientWidth,
      bx0:+band.getAttribute('x'), bx1:+band.getAttribute('x') + +band.getAttribute('width'), ends,
      tariff:+svg.querySelector('path[data-tariff]').dataset.tariff, t:readCell('Capture', 'C14'),
      floor:readCell('Capture', 'C39'), ceil:readCell('Capture', 'C38') };
  });
  check('the band runs exactly between the two ends',
        near(Math.min(geo.ends['Pipe needs'], geo.ends['Plant can pay']), geo.bx0, 1e-6)
        && near(Math.max(geo.ends['Pipe needs'], geo.ends['Plant can pay']), geo.bx1, 1e-6),
        `${geo.bx0.toFixed(1)}–${geo.bx1.toFixed(1)}`);
  check('the plant end sits left of the pipe end when there is no deal',
        geo.ceil < geo.floor && geo.ends['Plant can pay'] < geo.ends['Pipe needs']);
  check('the marker is the dialled tariff', geo.tariff === geo.t, geo.tariff);
  check('the chart is drawn at the width it is shown at', Math.abs(geo.vbW - geo.box) <= 1, `${geo.vbW} in ${geo.box}`);

  /* ---- converting a line is the comparison the caption promises -------- */
  const conv = await p.evaluate(() => {
    const cap = document.getElementById('cc-alt').textContent;
    const other = underScenario({ 'Capture!C22':1 }, () => readCell('Capture', 'C39'));
    return { cap, other, now:readCell('Capture', 'C39') };
  });
  check('the caption names what a converted line would need',
        conv.cap.includes('$' + conv.other.toFixed(1)) && conv.other < conv.now, conv.cap);
  /* the way a reader gets there: open the group, then pick */
  await p.evaluate(() => [...document.querySelectorAll('#capture .igh')]
    .find(h => /pipe and the store/i.test(h.textContent)).click());
  await p.selectOption('#sel-Capture-C22', '1'); await p.waitForTimeout(200);
  const pipe = await p.evaluate(() => document.getElementById('cc-pipe').textContent);
  check('and switching the line changes what the answer calls it', pipe === 'A converted line', pipe);

  /* ---- reset belongs to this model ------------------------------------- */
  const reset = await p.evaluate(() => {
    overrides['Assumptions!C13'] = 120; recalc();
    [...document.querySelectorAll('#capture .reset')][0].click();
    const cap = Object.keys(overrides).filter(k => k.startsWith('Capture!'));
    const kept = overrides['Assumptions!C13'];
    const sel = document.getElementById('sel-Capture-C22').value;
    const sl = document.getElementById('in-Capture-C27').value;
    delete overrides['Assumptions!C13']; recalc();
    return { cap, kept, sel, sl };
  });
  check('the capture reset clears the capture dials and leaves 3.0 alone',
        reset.cap.length === 0 && reset.kept === 120 && reset.sel === '0' && reset.sl === '10', JSON.stringify(reset));

  /* ---- on a phone ------------------------------------------------------- */
  const m = await b.newPage({ viewport:{ width:390, height:844 } });
  await m.goto('file://' + require('path').join(__dirname, '..', 'index.html'));
  await m.waitForTimeout(1100);
  const ph = await m.evaluate(() => {
    const svg = document.querySelector('#zone svg'), host = document.getElementById('zone');
    const labels = [...svg.querySelectorAll('text')].map(t => t.getBoundingClientRect());
    const box = svg.getBoundingClientRect();
    return { fits:svg.getBoundingClientRect().width <= host.clientWidth + 1,
      inside:labels.every(r => r.left >= box.left - 1 && r.right <= box.right + 1),
      over:document.documentElement.scrollWidth > innerWidth };
  });
  check('on a phone the band fits its box and keeps its labels inside it', ph.fits && ph.inside, JSON.stringify(ph));
  check('and the page does not scroll sideways', !ph.over);

  await b.close();
  console.log('PASS (' + ok.length + ')'); ok.forEach(s => console.log('  ✓ ' + s));
  if (fails.length) { console.log('\nFAIL (' + fails.length + ')'); fails.forEach(s => console.log('  ✗ ' + s)); process.exit(1); }
  console.log('\nCapture checks passed.');
})().catch(e => { console.error('HARNESS', e); process.exit(2); });
