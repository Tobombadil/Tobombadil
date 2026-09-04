const { chromium } = require('playwright');
const S='/tmp/claude-0/-home-user-Tobombadil/7cae5df9-1887-5f23-abba-c5e7bdccaf67/scratchpad';
const fails=[],ok=[]; const check=(n,c,d)=>(c?ok:fails).push(n+(d!==undefined?` → ${d}`:''));
(async()=>{
const b=await chromium.launch();
for(const vp of [{w:390,h:800,n:'phone'},{w:768,h:1024,n:'tablet'}]){
  const p=await b.newPage({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:2,isMobile:vp.w<700,hasTouch:vp.w<700});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(('file://'+require('path').join(__dirname,'..','index.html')));await p.waitForTimeout(450);
  check(`${vp.n}: no errors`,errs.length===0,errs.join(' | '));
  const o=await p.evaluate(()=>({ov:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    // wide content is allowed to scroll inside .chartbox ; everything else must fit
    wide:[...document.querySelectorAll('main *')]
      .filter(e=>!e.closest('.chartbox'))
      .filter(e=>e.getBoundingClientRect().right>innerWidth+1)
      .map(e=>e.tagName+'.'+(e.className||'').toString().split(' ')[0]).slice(0,4)}));
  check(`${vp.n}: nothing overflows the viewport`,o.ov<=0&&o.wide.length===0,`overflow ${o.ov}px ${o.wide.join(', ')}`);
  // the chart is allowed to scroll inside its own container, but must not push the body
  const cb=await p.evaluate(()=>{const c=document.getElementById('cashflow');
    return {scrolls:c.scrollWidth>c.clientWidth,inside:c.getBoundingClientRect().right<=innerWidth+1};});
  check(`${vp.n}: chart scrolls inside its own box`,cb.inside,`contained ${cb.inside}, own-scroll ${cb.scrolls}`);
  // 6.0's readouts are tabs now, so each one has to be opened to be measured.
  // A hidden pane has a zero rect, which would pass every fit check for free.
  const panes=await p.evaluate(async()=>{
    const tabs=[...document.querySelectorAll('.otab')], out=[];
    for(let i=0;i<tabs.length;i++){
      tabs[i].click(); await new Promise(r=>setTimeout(r,320));
      const pane=[...document.querySelectorAll('.opane')].find(x=>!x.hidden);
      const over=[...pane.querySelectorAll('*')]
        .filter(e=>!e.closest('.chartbox'))
        .filter(e=>e.getBoundingClientRect().right>innerWidth+1)
        .map(e=>e.tagName+'.'+(e.className||'').toString().split(' ')[0]);
      out.push({id:pane.id,label:tabs[i].textContent,h:Math.round(pane.getBoundingClientRect().height),
        over:over.slice(0,3),
        body:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)});
    }
    tabs[0].click();
    return out;});
  check(`${vp.n}: every readout is drawn and fits`,
    panes.every(x=>x.h>60&&x.over.length===0&&x.body<=0),
    panes.map(x=>x.label+' '+x.h+'px'+(x.over.length?' OVER '+x.over.join():'')).join(' · '));

  const torn=await p.evaluate(async()=>{
    document.querySelectorAll('.otab')[2].click(); await new Promise(r=>setTimeout(r,320));
    const t=document.querySelector('#tornado table');
    const r={right:t.getBoundingClientRect().right<=innerWidth+1,w:Math.round(t.getBoundingClientRect().width),
      rows:t.querySelectorAll('tbody tr').length};
    document.querySelectorAll('.otab')[0].click();
    return r;});
  // a driver the answer does not move with is filtered out of the ranking, so
  // the row count tracks how many actually bite rather than how many exist
  check(`${vp.n}: the ranked sensitivity fits`,torn.right&&torn.rows>=8&&torn.rows<=10&&torn.w>200,
    `${torn.rows} rows, ${torn.w}px wide`);

  // the stress table keeps three columns rather than restacking into 54 lines
  const stt=await p.evaluate(async()=>{
    document.querySelectorAll('.otab')[3].click(); await new Promise(r=>setTimeout(r,320));
    const box=document.getElementById('stress'), t=box.querySelector('table');
    const vis=[...t.querySelectorAll('tbody tr')[0].children]
      .filter(td=>getComputedStyle(td).display!=='none').length;
    const r={cols:vis,h:Math.round(t.getBoundingClientRect().height),
      scrolls:box.scrollWidth>box.clientWidth+1,
      fits:t.getBoundingClientRect().right<=innerWidth+1,
      rows:t.querySelectorAll('tbody tr').length,
      name:t.querySelector('tbody tr td').textContent.trim()};
    document.querySelectorAll('.otab')[0].click();
    return r;});
  check(`${vp.n}: the margin table fits without scrolling`,
    !stt.scrolls&&stt.fits&&stt.rows===10&&stt.h<900,
    `${stt.cols} cols, ${stt.rows} rows, ${stt.h}px, "${stt.name}"`);
  if(vp.w<700){
    // ---- the phone audit, which the overflow checks could never catch ----
    // every section must be reachable: the names need 849px in a 390px bar
    const navFit=await p.evaluate(()=>{
      const nav=document.getElementById('nav'), out=[];
      [...nav.querySelectorAll('a')].forEach(active=>{
        nav.querySelectorAll('a').forEach(a=>a.classList.toggle('on',a===active));
        const last=nav.querySelector('a:last-child').getBoundingClientRect();
        if(last.right>innerWidth+0.5) out.push(active.dataset.sec);
      });
      return {clipped:out,n:nav.querySelectorAll('a').length,
        scrolls:nav.scrollWidth>nav.clientWidth+1};});
    check(`${vp.n}: every section is reachable in the nav, whichever is active`,
      navFit.clipped.length===0&&!navFit.scrolls,
      navFit.clipped.join(', ')||`${navFit.n} links, no scroll`);
    // the source bar had 210px for a 297px sentence; it is hidden here and the
    // tooltip carries the same content instead
    const prov=await p.evaluate(async()=>{
      const el=document.querySelector('[data-cell="Facts!C7"]');
      el.scrollIntoView(); await new Promise(r=>setTimeout(r,120));
      el.dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));
      await new Promise(r=>setTimeout(r,120));
      const t=document.getElementById('tip'), r=t.getBoundingClientRect();
      return {barHidden:getComputedStyle(document.querySelector('.fbar')).display==='none',
        on:t.classList.contains('on'), text:t.innerText,
        inside:r.left>=-0.5&&r.right<=innerWidth+0.5,
        clipped:t.scrollWidth>t.clientWidth+1};});
    check(`${vp.n}: the source bar is not shown where it would truncate`,prov.barHidden);
    check(`${vp.n}: tapping a figure reveals its full source`,
      prov.on&&prov.inside&&!prov.clipped&&/Intake of \$500M plus offtake of \$800M/.test(prov.text),
      prov.text.slice(0,52).replace(/\n/g,' / '));
    // eighteen open dials pushed the model's own outputs below the fold
    const model=await p.evaluate(()=>({
      open:[...document.querySelectorAll('.igrp')].filter(g=>g.dataset.open!=='0').length,
      groups:document.querySelectorAll('.igrp').length,
      tilesFromDivider:Math.round(
        document.querySelector('#analysis .otiles').getBoundingClientRect().top
        -document.querySelector('#analysis .divider').getBoundingClientRect().top)}));
    check(`${vp.n}: the assumption panel starts closed`,model.open===0,
      `${model.open} of ${model.groups} open`);
    check(`${vp.n}: the model's outputs are within a screen of its heading`,
      model.tilesFromDivider<vp.h,model.tilesFromDivider+'px');
    // the sticky chrome must not eat the screen
    const vp_h=vp.h;
    const chrome=await p.evaluate(()=>Math.round(
      document.querySelector('.bar').getBoundingClientRect().height
      +document.querySelector('.fbar').getBoundingClientRect().height));
    check(`${vp.n}: sticky chrome stays under 8% of the viewport`,
      chrome/vp_h<0.08,chrome+'px');

    // the transaction schedule becomes stacked rows on a phone
    const st=await p.evaluate(()=>getComputedStyle(document.querySelector('.sched thead')).display);
    check('phone: schedule table restacks',st==='none',st);
    // sliders still drive the model on touch
    const n0=await p.evaluate(()=>readCell('Model','C55'));
    await p.evaluate(()=>{const s=document.querySelector('input[data-bind="Assumptions!C13"]');
      s.value=120;s.dispatchEvent(new Event('input',{bubbles:true}));});
    await p.waitForTimeout(220);
    const n1=await p.evaluate(()=>({npv:readCell('Model','C55'),tie:readCell('Model','C61')}));
    check('phone: sliders drive the model',n1.npv>n0&&n1.tie==='OK',`$${n0.toFixed(1)}M → $${n1.npv.toFixed(1)}M`);
    await p.evaluate(()=>document.querySelector('.reset').click());await p.waitForTimeout(200);
    for(const [y,n] of [[0,'p-hero'],[1350,'p-exp'],[3900,'p-model'],[4600,'p-model2']]){
      await p.evaluate(v=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,v);},y);
      await p.waitForTimeout(300);await p.screenshot({path:`${S}/${n}.png`});
    }
  }
  await p.close();
}

/* ── every grid, swept, at widths the breakpoints do not name ─────────
   Two bugs shipped from the same cause: a fixed column count plus nth-child
   rules that assume a specific number of items. A phone got a 91px card with
   one word per line, and a one-tile block drew a half-width rule under a tile
   with nothing beneath it. Both were invisible at the widths anyone tested.
   Sweep instead, on one page resized, and assert the two things that were wrong. */
{
  const sweep=[320,360,390,430,500,560,600,680,700,820,900,1024,1180,1400];
  const narrow=[], stray=[];
  const p=await b.newPage({viewport:{width:390,height:900}});
  await p.goto(('file://'+require('path').join(__dirname,'..','index.html')));await p.waitForTimeout(1800);
  for(const w of sweep){
    await p.setViewportSize({width:w,height:900});await p.waitForTimeout(120);
    const r=await p.evaluate(()=>{
      const thin=[], border=[];
      document.querySelectorAll('.whys,.tiles').forEach(g=>{
        const kids=[...g.children];
        kids.forEach(c=>{
          const box=c.getBoundingClientRect();
          if(box.width>0&&box.width<150) thin.push(c.className+' '+Math.round(box.width)+'px');
          const cs=getComputedStyle(c);
          // a rule on the only cell has nothing to separate it from
          if(kids.length===1&&(parseFloat(cs.borderBottomWidth)>0||parseFloat(cs.borderRightWidth)>0))
            border.push(c.className+' alone with a border');
        });
      });
      return {thin, border};});
    r.thin.forEach(t=>narrow.push(w+'px: '+t));
    r.border.forEach(t=>stray.push(w+'px: '+t));
  }
  await p.close();
  check('every width: no grid cell is squeezed below readable width',
    narrow.length===0, narrow.slice(0,3).join('; ')||sweep.length+' widths swept');
  check('every width: a lone grid cell draws no rule against nothing',
    stray.length===0, stray.slice(0,3).join('; ')||'clean');
}
/* ---- the sticky bar must never be see-through with content moving under it ----
   The chrome goes transparent over the cover on purpose, so the hero reads clean.
   That is only safe at the very top: once the page scrolls, cover text passes
   beneath the bar and reads straight through the nav. It shipped that way and no
   check noticed, because every existing check measures layout, not what is
   legible on top of what. */
{
  const p = await b.newPage({viewport:{width:390,height:844}});
  await p.goto(('file://'+require('path').join(__dirname,'..','index.html'))); await p.waitForTimeout(2200);
  const opaque = css => {
    const m = String(css).match(/rgba?\(([^)]+)\)/);
    if (!m) return false;
    const parts = m[1].split(',').map(x => parseFloat(x));
    return parts.length < 4 || parts[3] > 0.9;
  };
  const read = async y => {
    await p.evaluate(v => window.scrollTo(0, v), y);
    await p.waitForTimeout(650);
    return p.evaluate(() => {
      const bars = ['.bar', '.fbar'].map(sel => {
        const e = document.querySelector(sel);
        if (!e || !e.getBoundingClientRect().height) return null;
        return {sel, bg: getComputedStyle(e).backgroundColor};
      }).filter(Boolean);
      return {bars, atCover: document.body.classList.contains('at-cover'),
              scrolled: document.body.classList.contains('scrolled')};
    });
  };
  const top = await read(0);
  check('at the very top the chrome is transparent, which is the design',
    top.bars.every(x => !opaque(x.bg)) && !top.scrolled,
    top.bars.map(x => x.sel + ' ' + x.bg).join(', '));

  const bad = [];
  for (const y of [40, 120, 260, 420, 700]) {
    const r = await read(y);
    r.bars.filter(x => !opaque(x.bg)).forEach(x => bad.push(y + 'px: ' + x.sel + ' ' + x.bg));
  }
  check('once scrolled, nothing reads through the sticky bar',
    bad.length === 0, bad.slice(0, 3).join('; ') || 'opaque at 40/120/260/420/700px');

  // and it must hand back to the light chrome once the cover is behind you
  const past = await read(1600);
  check('past the cover the bar returns to the document chrome',
    !past.atCover && past.bars.every(x => opaque(x.bg)),
    past.bars.map(x => x.bg).join(', '));
  await p.close();
}

await b.close();
console.log('PASS ('+ok.length+')');ok.forEach(s=>console.log('  ✓ '+s));
if(fails.length){console.log('\nFAIL ('+fails.length+')');fails.forEach(s=>console.log('  ✗ '+s));process.exit(1);}
console.log('\nResponsive checks passed.');
})().catch(e=>{console.error('HARNESS',e);process.exit(2);});
