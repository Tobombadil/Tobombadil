/* An independent implementation of the project model, written from the stated
   mechanics rather than from the workbook, and compared against the page across
   many random input vectors. If the two disagree, one of them is wrong. */
const { chromium } = require('playwright');
const fails = [], ok = [];
const check = (n, c, d) => (c ? ok : fails).push(n + (d !== undefined ? ` → ${d}` : ''));

function reference(a) {
  const netkW = a.mw * 1000 * a.derate;
  const N = 20;
  const yr = i => i + 1;
  const gen = [], ppa = [], ebitda = [];
  for (let i = 0; i < N; i++) {
    const t = yr(i);
    const avail = t === 1 ? a.avail1 : a.availSteady;
    gen[i] = netkW / 1000 * 8760 * avail;
    ppa[i] = a.ppa * Math.pow(1 + a.esc, t - 1);
    const rev = gen[i] * ppa[i] / 1e6;
    const rate = a.yrsToCeil <= 0 ? a.ceil : a.fuelNow + (a.ceil - a.fuelNow) * Math.min(1, t / a.yrsToCeil);
    const fuel = gen[i] * a.fuelUse * rate / 1e6;
    const opex = a.opex1 * Math.pow(1 + a.opexEsc, t - 1);
    const maint = netkW * a.maint / 1e6;
    ebitda[i] = rev - fuel - opex - maint;
  }
  /* built up from the parts the page builds it from, independently: the haul
     is route miles at a rate per mile, and contingency sits over the lot */
  const haul = a.haulFixed + a.miles * a.haulRate / 1000;
  /* the two configured lines, worked out here rather than read off the page */
  const intercon = (a.gridMode <= 1 ? a.btm : 0)
    + (a.gridMode >= 1 ? a.yard + a.gtMiles * a.gtRate + a.netUp : 0);
  const refurb = a.boiler === 0 ? 0 : a.boiler === 1 ? a.retube * 0.45 : a.retube;
  const capex = (a.acq + a.dev + a.dismantle + haul + a.reerect + intercon + refurb) * (1 + a.conting);

  const inTenor = ebitda.filter((_, i) => yr(i) <= a.tenor);
  const financeable = Math.min(...inTenor) > 0 ? 1 : 0;
  const targetDS = ebitda.map((e, i) => yr(i) <= a.tenor ? Math.max(0, e) / a.targetDscr : 0);
  const Dsculpt = financeable * targetDS.reduce((s, d, i) => s + d / Math.pow(1 + a.rd, yr(i)), 0);
  const k = a.rd * a.consYrs / 2 + (a.dsraM / 12) * (Dsculpt > 0 ? targetDS[0] / Dsculpt : 0);
  const Dcap = a.lev * capex / (1 - a.lev * k);
  const D = Math.max(0, Math.min(Dsculpt, Dcap));
  const scale = Dsculpt > 0 ? D / Dsculpt : 0;
  const DS = targetDS.map(d => d * scale);

  const idc = D * a.rd * a.consYrs / 2;
  const dsra = (a.dsraM / 12) * DS[0];
  const funding = capex + idc + dsra;
  const equity = funding - D;

  const basis = capex - (a.credit === 2 ? capex * a.itcRate * 0.5 : 0);
  let bal = D, nol = 0, nolU = 0;
  const cf = [], cfU = [];
  let minDscr = Infinity, lastBal = 0;
  for (let i = 0; i < N; i++) {
    const t = yr(i);
    const interest = DS[i] > 0 ? bal * a.rd : 0;
    const principal = DS[i] - interest;
    bal = bal - principal;
    lastBal = bal;
    const dscr = DS[i] > 0 ? ebitda[i] / DS[i] : 999;
    minDscr = Math.min(minDscr, dscr);

    const dep = a.bonus === 1 ? (t === 1 ? basis : 0) : (t <= a.depLife ? basis / a.depLife : 0);
    const taxable = ebitda[i] - interest - dep;
    const nolOpen = nol;
    const used = taxable > 0 ? Math.min(nolOpen, taxable * a.nolCap) : 0;
    const after = taxable - used;
    const tax = after > 0 ? after * a.blended : 0;
    nol = nolOpen - used + (taxable < 0 ? -taxable : 0);

    let credit = 0;
    if (a.credit === 1 && t <= 10)
      credit = gen[i] * a.ptcBase * (1 + a.adder) * Math.pow(1 + a.ptcInf, t - 1) / 1e6 * a.monet;
    else if (a.credit === 2 && t === 1)
      credit = capex * a.itcRate * (1 + a.adder) * a.monet;

    const release = t === a.tenor ? dsra : 0;
    cf[i] = ebitda[i] - DS[i] - tax + credit + release;

    /* unlevered: no interest, so no shield, and no reserve to release */
    const taxableU = ebitda[i] - dep;
    const usedU = taxableU > 0 ? Math.min(nolU, taxableU * a.nolCap) : 0;
    const afterU = taxableU - usedU;
    const taxU = afterU > 0 ? afterU * a.blended : 0;
    nolU = nolU - usedU + (taxableU < 0 ? -taxableU : 0);
    cfU[i] = ebitda[i] - taxU + credit;
  }
  const pv = cf.reduce((s, c, i) => s + c / Math.pow(1 + a.ke, yr(i) + 1), 0);
  const tv = ebitda[N - 1] * (1 + a.esc) * (1 - Math.pow((1 + a.esc) / (1 + a.ke), a.life - 20)) / (a.ke - a.esc);
  const pvtv = tv / Math.pow(1 + a.ke, N + 1);
  const npv = -equity / 2 - (equity / 2) / (1 + a.ke) + pv + pvtv;

  const solve = stream => {
    const at = r => stream.reduce((s, c, i) => s + c / Math.pow(1 + r, i), 0);
    let lo = -0.9999, hi = 10, flo = at(lo), fhi = at(hi);
    if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return NaN;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2, fm = at(mid);
      if (flo * fm <= 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
    }
    return (lo + hi) / 2;
  };
  const lev = [-equity / 2, -equity / 2, ...cf];
  lev[lev.length - 1] += tv;
  const unlev = [-capex / 2, -capex / 2, ...cfU];
  unlev[unlev.length - 1] += tv;
  return { capex, financeable, Dsculpt, D, idc, dsra, funding, equity, npv,
           irr: solve(lev), projIrr: solve(unlev),
           minDscr, lastBal, ebitda1: ebitda[0], ds1: DS[0] };
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(('file://'+require('path').join(__dirname,'..','index.html')));
  await p.waitForTimeout(1300);
  check('no page errors', errs.length === 0, errs.join(' | '));

  // The tiles used to be compared against the stress table's base-case row.
  // That row is gone — the pane prints breakevens now — so they are compared
  // against this file's own model instead, which is the stronger check: it
  // shares no code with the page at all.
  const bind = await p.evaluate(() => {
    const tile = k => [...document.querySelectorAll('.otile')]
      .find(t => t.querySelector('.k').textContent === k).querySelector('.v').textContent.trim();
    return { npvT: tile('Equity NPV'), irrT: tile('Levered equity IRR'), dscrT: tile('DSCR'),
             projT: tile('Project IRR'),
             cells: { npv: readCell('Model','C55'), dscr: readCell('Model','C57') } };
  });
  check('the tiles are the cells they claim to read',
        bind.npvT === '$' + bind.cells.npv.toFixed(1) + 'M'
        && bind.dscrT === bind.cells.dscr.toFixed(2) + 'x',
        `${bind.npvT} / ${bind.dscrT}`);
  check('the unlevered return is below the levered one at base case',
        parseFloat(bind.projT) < parseFloat(bind.irrT), `${bind.projT} unlevered vs ${bind.irrT} levered`);

  // cross-check the whole model against the independent implementation
  const runs = await p.evaluate(n => {
    const cells = SHEET_BY_NAME['Assumptions'].cells;
    const ins = Object.entries(cells).filter(([, d]) => d.input);
    const rnd = d => { const s = Math.floor((d.max - d.min) / d.step);
      return +(d.min + d.step * Math.floor(Math.random() * (s + 1))).toFixed(6); };
    const out = [];
    for (let i = 0; i < n; i++) {
      const ov = {};
      if (i > 0) ins.forEach(([k, d]) => ov['Assumptions!' + k] = rnd(d));
      const elect = i % 3;
      if (i > 0) { ov['Assumptions!C29'] = elect; ov['Assumptions!C37'] = i % 2; }
      const A = c => readCell('Assumptions', c), M = c => readCell('Model', c);
      const got = underScenario(ov, () => ({
        capex:A('C46'), financeable:M('C40'), Dsculpt:M('C42'), D:M('C45'), idc:M('C47'),
        dsra:M('C48'), funding:M('C49'), equity:M('C50'), npv:M('C55'), irr:M('C56'),
        minDscr:M('C57'), lastBal:M('W23'), ebitda1:M('D15'), ds1:M('D19'), flag:M('C61'),
        projIrr:M('C63'),
      }));
      const a = {
        mw:ov['Assumptions!C9']??A('C9'), derate:A('C10'),
        availSteady:ov['Assumptions!C11']??A('C11'), avail1:ov['Assumptions!C12']??A('C12'),
        ppa:ov['Assumptions!C13']??A('C13'), esc:ov['Assumptions!C14']??A('C14'),
        fuelUse:A('C15'), fuelNow:ov['Assumptions!C16']??A('C16'), ceil:ov['Assumptions!C17']??A('C17'),
        yrsToCeil:ov['Assumptions!C18']??A('C18'), opex1:ov['Assumptions!C19']??A('C19'),
        opexEsc:ov['Assumptions!C20']??A('C20'), maint:A('C21'),
        acq:ov['Assumptions!C64']??A('C64'), dismantle:ov['Assumptions!C65']??A('C65'),
        miles:ov['Assumptions!C66']??A('C66'), haulRate:ov['Assumptions!C69']??A('C69'),
        haulFixed:ov['Assumptions!C70']??A('C70'),
        dev:ov['Assumptions!C71']??A('C71'),
        gridMode:ov['Assumptions!C74']??A('C74'), btm:ov['Assumptions!C75']??A('C75'),
        yard:ov['Assumptions!C76']??A('C76'), gtMiles:ov['Assumptions!C77']??A('C77'),
        gtRate:ov['Assumptions!C78']??A('C78'), netUp:ov['Assumptions!C79']??A('C79'),
        boiler:ov['Assumptions!C80']??A('C80'), retube:ov['Assumptions!C81']??A('C81'),
        reerect:ov['Assumptions!C68']??A('C68'), conting:ov['Assumptions!C23']??A('C23'),
        targetDscr:ov['Assumptions!C24']??A('C24'), rd:ov['Assumptions!C25']??A('C25'),
        tenor:ov['Assumptions!C26']??A('C26'), lev:ov['Assumptions!C27']??A('C27'),
        ke:ov['Assumptions!C28']??A('C28'), credit:ov['Assumptions!C29']??A('C29'),
        ptcBase:A('C30'), ptcInf:A('C31'), adder:A('C32'), itcRate:A('C33'),
        monet:ov['Assumptions!C34']??A('C34'), bonus:ov['Assumptions!C37']??A('C37'),
        depLife:A('C38'), nolCap:A('C39'), life:A('C40'), blended:A('C47'),
        consYrs:A('C52'), dsraM:A('C53'),
      };
      out.push({ a, got });
    }
    return out;
  }, 250);

  const keys = ['capex','financeable','Dsculpt','D','idc','dsra','funding','equity','npv','minDscr','lastBal','ebitda1','ds1'];
  const bad = [];
  runs.forEach(({ a, got }, i) => {
    const ref = reference(a);
    keys.forEach(k => {
      const x = got[k], y = ref[k];
      if (!isFinite(x) && !isFinite(y)) return;
      const tol = Math.max(1e-6, Math.abs(y) * 1e-9);
      if (!(Math.abs(x - y) < tol)) bad.push(`run ${i} ${k}: page ${x} vs reference ${y}`);
    });
    ['irr','projIrr'].forEach(k => {
      const bothNaN = !isFinite(got[k]) && !isFinite(ref[k]);
      if (!bothNaN && !(Math.abs(got[k] - ref[k]) < 1e-6))
        bad.push(`run ${i} ${k}: page ${got[k]} vs reference ${ref[k]}`);
    });
  });
  check('the page matches an independent implementation on every field',
        bad.length === 0, bad.length ? bad.slice(0, 5).join(' | ') : `${runs.length} vectors × ${keys.length + 2} fields`);

  // run 0 is the base case, so the headline tiles can be read against a model
  // that shares no code with the page
  const ref0 = reference(runs[0].a);
  check('the headline tiles match an independent model at base case',
        bind.npvT === '$' + ref0.npv.toFixed(1) + 'M'
        && bind.dscrT === ref0.minDscr.toFixed(2) + 'x',
        `${bind.npvT} / ${bind.dscrT} vs $${ref0.npv.toFixed(1)}M / ${ref0.minDscr.toFixed(2)}x`);

  // invariants that must hold on every one of those vectors
  const inv = [];
  runs.forEach(({ got }, i) => {
    if (got.D < -1e-9) inv.push(`run ${i}: negative debt`);
    if (got.equity < -1e-9) inv.push(`run ${i}: negative equity`);
    if (got.funding > 0 && got.D / got.funding > 0.9001) inv.push(`run ${i}: leverage over cap`);
    if (Math.abs(got.D + got.equity - got.funding) > 5e-3) inv.push(`run ${i}: sources != uses`);
    if (got.D > 1e-9 && Math.abs(got.lastBal) > 5e-3) inv.push(`run ${i}: debt not amortized`);
    if (got.financeable === 1 && got.flag !== 'OK') inv.push(`run ${i}: financeable but ${got.flag}`);
    if (got.financeable === 0 && got.flag !== 'NOT FINANCEABLE') inv.push(`run ${i}: unfinanceable but ${got.flag}`);
  });
  check('structural invariants hold on every vector', inv.length === 0, inv.slice(0, 4).join(' | ') || runs.length + ' vectors');

  const fin = runs.filter(r => r.got.financeable === 1).length;
  check('the sweep covers both financeable and unfinanceable structures',
        fin > 20 && fin < runs.length - 20, `${fin} financeable of ${runs.length}`);

  await b.close();
  console.log('PASS (' + ok.length + ')');
  ok.forEach(s => console.log('  ✓ ' + s));
  if (fails.length) { console.log('\nFAIL (' + fails.length + ')'); fails.forEach(s => console.log('  ✗ ' + s)); process.exit(1); }
  console.log('\nCross-check passed.');
})().catch(e => { console.error('HARNESS', e); process.exit(2); });
