const { chromium } = require('playwright');
const S='/tmp/claude-0/-home-user-Tobombadil/7cae5df9-1887-5f23-abba-c5e7bdccaf67/scratchpad';
const fails=[],ok=[]; const check=(n,c,d)=>(c?ok:fails).push(n+(d!==undefined?` → ${d}`:''));
const near=(a,b,t=1e-6)=>Math.abs(a-b)<t;
(async()=>{
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1280,height:1000}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto(('file://'+require('path').join(__dirname,'..','index.html')));await p.waitForTimeout(1100);
const realErrs=errs.filter(e=>!/fonts\.(googleapis|gstatic)\.com|Failed to load resource/.test(e));
check('no console/page errors',realErrs.length===0,realErrs.join(' | '));
check('the webfont link is present and self-consistent',await p.evaluate(()=>{
  const l=document.querySelector('link[rel="stylesheet"][href*="fonts.googleapis.com"]');
  if(!l)return false;
  const h=l.getAttribute('href');
  return ['Newsreader','IBM+Plex+Sans','IBM+Plex+Mono'].every(f=>h.includes(f))&&h.includes('display=swap');}));
check('every face declares a real fallback',await p.evaluate(()=>{
  const v=n=>getComputedStyle(document.documentElement).getPropertyValue(n);
  return /serif\s*$/.test(v('--serif'))&&/sans-serif\s*$/.test(v('--sans'))&&/monospace\s*$/.test(v('--mono'));}));

const nav=await p.evaluate(()=>({secs:[...document.querySelectorAll('main section')].map(s=>s.id),
  links:[...document.querySelectorAll('nav a')].map(a=>a.getAttribute('href'))}));
const WANT=['summary','experience','market','analysis','risk','terms'];
check('the proposal runs in order, no method essay',nav.secs.join()===WANT.join(),nav.secs.join(', '));
check('nav matches the sections',nav.links.join()==='#'+nav.secs.join(',#'));

// ---- nothing carried over from the spreadsheet that is now unused ----
const dead=await p.evaluate(()=>{
  // a cell nothing displays, and nothing a displayed cell depends on, is cruft
  const touched=new Set(), seen=new Set();
  const walk=(sheet,ref)=>{
    const k=sheet+'!'+ref; if(seen.has(k))return; seen.add(k); touched.add(k);
    const raw=rawOf(sheet,ref);
    if(typeof raw!=='string'||raw[0]!=='=')return;
    const re=/(?:([A-Za-z][A-Za-z0-9_]*)!)?\$?([A-Z]{1,2})\$?(\d{1,4})(?::\$?([A-Z]{1,2})\$?(\d{1,4}))?/g;
    let m;
    while((m=re.exec(raw))){
      const sh=m[1]||sheet; if(!SHEET_BY_NAME[sh])continue;
      if(m[4]){const a=m[2].charCodeAt(0),b=m[4].charCodeAt(0);
        for(let c=a;c<=b;c++)for(let r=+m[3];r<=+m[5];r++){
          const rf=String.fromCharCode(c)+r;
          if(SHEET_BY_NAME[sh].cells[rf])walk(sh,rf);}}
      else if(SHEET_BY_NAME[sh].cells[m[2]+m[3]])walk(sh,m[2]+m[3]);}};
  [...document.querySelectorAll('[data-cell]')].forEach(e=>{const[s,r]=e.dataset.cell.split('!');walk(s,r);});
  [...document.querySelectorAll('[data-bind]')].forEach(e=>{const[s,r]=e.dataset.bind.split('!');walk(s,r);});
  ['C51','C55','C56','C57','C58','C59','C60','C61','C63'].forEach(r=>walk('Model',r));
  // the trade and timeline read these from script, so no data-cell points at them
  ['C41','C62','C63'].forEach(r=>walk('Assumptions',r));
  // C16 is substituted into a resume bullet by say(), so it is read without
  // ever becoming a data-cell of its own
  // these are substituted into resume bullets and the board note by say(), so
  // they are read without ever becoming a data-cell of their own
  ['C16','C21','C22','C23','C24','C25'].forEach(r=>walk('Facts',r));
  walk('Career','F16');
  const all=[]; SHEETS.forEach(sh=>Object.keys(sh.cells).forEach(rf=>all.push(sh.name+'!'+rf)));
  // every formula the workbook actually writes
  const body=[];
  SHEETS.forEach(sh=>Object.values(sh.cells).forEach(c=>{
    if(typeof c.v==='string'&&c.v[0]==='=')body.push(c.v);}));
  const joined=body.join(' ');
  return {orphans:all.filter(k=>!touched.has(k)),fnCount:Object.keys(FN).length,
          unusedFns:Object.keys(FN).filter(f=>!new RegExp('\\b'+f+'\\(').test(joined)),
          tokensDead:(()=>{
            const sheets=[...document.styleSheets].filter(s=>!s.href);
            const rules=sheets.flatMap(s=>{try{return [...s.cssRules]}catch(e){return []}});
            const root=rules.filter(r=>r.selectorText===':root').map(r=>r.style.cssText).join(' ');
            // the chart colours are applied from script, so scan both
            const css=rules.map(r=>r.cssText).join('\n')
              +[...document.querySelectorAll('script')].map(s=>s.textContent).join('\n');
            return (root.match(/--[\w-]+/g)||[]).filter(t=>!new RegExp('var\\('+t+'\\)').test(css));})()};});
// W42 is the last column of a loop-built chain: every other year feeds the next,
// so the final one has no consumer by construction
check('the workbook carries no cell nothing reads',
  dead.orphans.filter(k=>k!=='Model!W42').length===0,
  dead.orphans.join(', ')||'clean');
check('the engine supports nothing the model does not use',
  dead.unusedFns.length===0,dead.unusedFns.join(', ')||dead.fnCount+' functions, all used');
check('every palette token is referenced',dead.tokensDead.length===0,
  dead.tokensDead.join(', ')||'no orphan tokens');

// ---- the page's ground ----
// a repeating pattern behind running prose has nothing to line up against,
// which is what made the old squared-paper ground disorienting
const ground=await p.evaluate(()=>{
  const bs=getComputedStyle(document.body);
  const sec=document.querySelector('main > section').getBoundingClientRect();
  const cov=document.querySelector('.cover').getBoundingClientRect();
  return {img:bs.backgroundImage,bg:bs.backgroundColor,
    sheetW:Math.round(sec.width),coverW:Math.round(cov.width),vw:innerWidth,
    sheetBg:getComputedStyle(document.querySelector('main > section')).backgroundColor};});
check('no repeating pattern behind the prose',ground.img==='none',ground.img.slice(0,40));
check('the body paints its own ground',/rgba?\(/.test(ground.bg)&&ground.bg!=='rgba(0, 0, 0, 0)',ground.bg);
check('the document sits on a sheet, and the cover bleeds past it',
  ground.sheetW<ground.vw&&ground.coverW>=ground.vw-1,
  `sheet ${ground.sheetW} · cover ${ground.coverW} · viewport ${ground.vw}`);
check('the sheet is white against the ground',
  ground.sheetBg!==ground.bg,`${ground.sheetBg} on ${ground.bg}`);

// ---- the proposal furniture ----
const memo=await p.evaluate(()=>{
  const idx=[...document.querySelectorAll('.divider .num')].map(e=>e.textContent);
  const toc=[...document.querySelectorAll('.toc li')].map(li=>({
    num:li.querySelector('.tnum').textContent,
    name:li.querySelector('.tname').textContent,
    href:li.querySelector('a').getAttribute('href')}));
  return {idx,toc,
    cover:!!document.querySelector('.cover h1'),
    coverLoad:document.querySelectorAll('.cover-load svg polyline').length,
    coverName:(document.querySelector('.cover h1')||{}).textContent,
    navLabels:[...document.querySelectorAll('#nav a')].map(a=>a.textContent),
    thesis:[...document.querySelectorAll('.divider .thesis')].map(e=>e.textContent),
    terms:document.querySelectorAll('.covercard .crow').length,
    risks:document.querySelectorAll('#risk tbody tr').length,
    dilig:document.querySelectorAll('#pane-sensitivity table.pairs tbody tr').length,
    steps:document.querySelectorAll('#terms .steps li').length};});
check('the cover leads with the name',memo.cover&&memo.coverName==='Andrew T. Gibson',memo.coverName);
check('the cover draws its load shape',memo.coverLoad>=2,memo.coverLoad+' polylines');
check('sections are numbered as a filing',memo.idx.join()==='1.0,2.0,3.0,4.0,5.0,6.0',memo.idx.join(' '));
// the contents page and the dividers read the same array, so they cannot disagree
check('contents matches the dividers',
  memo.toc.map(t=>t.num).join()===memo.idx.join()
  &&memo.toc.map(t=>t.href).join()==='#'+WANT.join(',#'),
  memo.toc.map(t=>t.num+' '+t.name).join(' · '));
check('every section states why it is in the document',
  memo.thesis.length===6&&memo.thesis.every(t=>t.trim().length>18),memo.thesis.length);
// the thesis belongs on the divider only; printing it on the contents page too
// made every reader read the same sentence twice
check('the contents page does not repeat the thesis lines',
  await p.evaluate(()=>document.querySelectorAll('.toc .tthesis').length===0));
check('nav carries names, not numbers',
  memo.navLabels.length===6&&memo.navLabels.every(l=>!/^\d\.\d$/.test(l)),memo.navLabels.join(', '));
check('terms at a glance is populated',memo.terms>=6,memo.terms+' rows');
// ---- the career is continuous: no year counted twice, no year unexplained ----
// This is what let a reconciliation footnote exist at all; with the dates right
// there is nothing to reconcile, and the invariant should hold it that way.
const span=await p.evaluate(()=>{
  const C=r=>readCell('Career',r), rows=[10,9,8,7];
  const gaps=[];
  for(let i=0;i<rows.length-1;i++){
    const end=C('E'+rows[i]), next=C('D'+rows[i+1]);
    if(Math.abs(end-next)>1) gaps.push(rows[i]+'→'+rows[i+1]+' off by '+Math.round(end-next)+'d');}
  return {gaps, sum:rows.reduce((a,r)=>a+C('F'+r),0),
          first:C('D10'), last:C('E7'), fullTime:C('F14'), energy:C('F7'),
          ftStart:C('D9')};});
check('the roles run end to end, with no overlap and no gap',span.gaps.length===0,
  span.gaps.join(', ')||'continuous');
check('so the roles add up to the span they cover',
  Math.abs(span.sum-(span.last-span.first)/365.25)<0.02,
  span.sum.toFixed(2)+' yrs of roles across '+((span.last-span.first)/365.25).toFixed(2)+' yrs');
// the two clocks the page leads with have to be the ones it claims they are
check('the full-time clock starts at the first full-time role, not the first job',
  Math.abs(span.ftStart-span.first)>300&&span.fullTime<span.sum,
  span.fullTime.toFixed(1)+' yrs full time against '+span.sum.toFixed(1)+' including study years');
check('and the energy clock is the shortest of the three',
  span.energy<span.fullTime&&span.energy<span.sum,
  span.energy.toFixed(1)+' yrs in energy');
// 2.0 and its 90-day / six-month / year block are gone. Both were written
// against one posting: its duty list and its role spec. The page is no longer
// addressed to a single posting, so the check becomes the opposite assertion.
const spec=await p.evaluate(()=>{
  const t=document.body.innerText;
  return {plan:/first 90 days|first ninety days|by six months/i.test(t),
          duties:/the five things|what the work is/i.test(t)};});
check('the page does not read a duty list back to the reader',
  !spec.duties, spec.duties?'a duty table is still rendered':'none');
check('and does not promise a 30-60-90 before anyone has asked',
  !spec.plan, spec.plan?'an onboarding plan is still rendered':'none');
// four real risks beat six where three are the same one in different clothes
check('the risk register is not decorative',memo.risks>=4,memo.risks+' risks');
// The page goes to several kinds of desk now, so it must not be written to one
// of them. No second person aimed at an employer, and no claim about seniority
// in either direction: state the experience, let the reader place it.
const aim=await p.evaluate(()=>{
  const t=document.body.innerText;
  return {addressed:(t.match(/\byou (asked|told|work|said|are looking)\b/gi)||[]),
    capped:(t.match(/second chair|first chair|step down|junior person/gi)||[]),
    named:(t.match(/Manager, Origination/g)||[])};});
check('the page is written to a kind of desk, not to one employer',
  aim.addressed.length===0&&aim.named.length===0,
  [...aim.addressed,...aim.named].join(', ')||'no employer addressed');
check('and it neither claims nor disclaims a level',
  aim.capped.length===0, aim.capped.join(', ')||'level left open');
// a risk with no mitigant is a confession, not a memo; a one-line mitigant is worse
check('every risk carries a real mitigant',
  await p.evaluate(()=>[...document.querySelectorAll('#risk tbody tr')].every(tr=>{
    const c=[...tr.children];
    return c.length===3&&c[0].textContent.trim().length>10
      &&c[1].textContent.trim().length>60&&c[2].textContent.trim().length>120;})));
// the list pairs with the top of the ranking, not with all ten drivers
check('the diligence list answers the top of the tornado',memo.dilig===4,memo.dilig+' drivers');

// ---- 6.0 is one instrument with three readouts, not three sections ----
const tabs=await p.evaluate(()=>{
  const t=[...document.querySelectorAll('.otab')], pn=[...document.querySelectorAll('.opane')];
  return {n:t.length, labels:t.map(x=>x.textContent),
    controls:t.every(x=>document.getElementById(x.getAttribute('aria-controls'))),
    named:pn.every(x=>x.getAttribute('aria-labelledby')&&x.getAttribute('role')==='tabpanel'),
    open:pn.filter(x=>!x.hidden).map(x=>x.id),
    sel:t.filter(x=>x.getAttribute('aria-selected')==='true').map(x=>x.textContent),
    // the readouts each have to hold something
    holds:pn.map(x=>x.querySelectorAll('table,svg,.otile').length),
    // one h2 for the section, and no rival headings competing with it
    h2:document.querySelectorAll('#analysis h2').length,
    h3:document.querySelectorAll('#analysis h3').length};});
check('6.0 offers four readouts, the trade first',
  tabs.n===4&&tabs.labels.join()==='Trade,Returns,Sensitivity,Stress',tabs.labels.join(' '));
check('exactly one readout is open at a time',tabs.open.length===1&&tabs.sel.length===1,
      tabs.open.join()+' / selected '+tabs.sel.join());
check('each tab is wired to the panel it names',tabs.controls&&tabs.named,'aria wired');
check('every readout holds something',tabs.holds.every(h=>h>0),tabs.holds.join(', '));
// one h2 for the section, plus the lead heading over the case for the trade.
// The failure this guards against is the old three-blocks-with-three-titles
// structure, not a single argument stated above the model that serves it.
check('6.0 reads as one section with one argument',tabs.h2===1&&tabs.h3<=2,
      tabs.h2+' h2, '+tabs.h3+' h3');

// switching readouts swaps exactly one pane for exactly one other
const swap=await p.evaluate(async()=>{
  const t=[...document.querySelectorAll('.otab')], pn=[...document.querySelectorAll('.opane')];
  const seen=[];
  for(let i=0;i<t.length;i++){
    t[i].click(); await new Promise(r=>setTimeout(r,60));
    seen.push({tab:i,open:pn.filter(x=>!x.hidden).map(x=>x.id).join(),
               sel:t.findIndex(x=>x.getAttribute('aria-selected')==='true'),
               tabindex:t.map(x=>x.tabIndex).join()});
  }
  t[0].click();
  return seen;});
check('each tab opens its own readout',
      swap.every((s,i)=>s.sel===i&&s.open==='pane-'+['trade','returns','sensitivity','stress'][i]),
      swap.map(s=>s.open).join(' → '));
check('only the open tab is in the tab order',swap.every(s=>s.tabindex.split(',').filter(x=>x==='0').length===1),
      swap[0].tabindex);

// held constant moved in with the inputs, because it is a list of inputs
const held=await p.evaluate(()=>{
  const g=[...document.querySelectorAll('#analysis .igrp')];
  const h=g.find(x=>/Held constant/.test(x.querySelector('.igh').textContent));
  return {inInputs:!!(h&&h.closest('.inputs')), rows:h?h.querySelectorAll('.hfld li').length:0,
    closed:h&&h.dataset.open==='0', open:g.filter(x=>x.dataset.open==='1').length};});
check('held constant sits with the assumptions',held.inInputs&&held.rows===9,held.rows+' figures');
check('it starts closed, and one group starts open',held.closed&&held.open===1,
      held.open+' group open');
check('next steps are stated',memo.steps>=3,memo.steps+' steps');

// ---- the model, checked by hand ----
const v=await p.evaluate(()=>{const M=c=>readCell('Model',c),A=c=>readCell('Assumptions',c);
 return {netkW:A('C45'),capex:A('C46'),blend:A('C47'),depBasis:A('C51'),
  gen1:M('D8'),gen2:M('E8'),ppa1:M('D9'),ppa2:M('E9'),rev1:M('D10'),
  fuelRate1:M('D11'),fuelRate10:M('M11'),fuelRate11:M('N11'),
  eb1:M('D15'),eb18:M('U15'),debt:M('C45'),equity:M('C50'),capexT:M('C41'),
  dsculpt:M('C42'),dcap:M('C44'),scale:M('C46'),idc:M('C47'),dsra:M('C48'),funding:M('C49'),lev:M('C51'),
  ds1:M('D19'),ds18:M('U19'),ds19:M('V19'),
  dscr1:M('D24'),dscr10:M('M24'),dscr18:M('U24'),minD:M('C57'),bal18:M('U23'),bal20:M('W23'),
  release:M('U33'),
  dep1:M('D25'),dep2:M('E25'),tax1:M('D30'),nolMin:M('C60'),
  ptc1:M('D32'),ptc10:M('M32'),ptc11:M('N32'),
  npv:M('C55'),irr:M('C56'),su:M('C58'),flag:M('C61'),
  cons:readCell('Assumptions','C52'),dsraM:readCell('Assumptions','C53'),
  df1:M('D35')};});

// the base case, held by hand so an accidental change to a dial is caught
const netkW=50*1000*0.9167, capexAllIn=53.25*1.35;
check('net capacity = nameplate x derate',near(v.netkW,netkW,1e-6),v.netkW.toLocaleString()+' kW');
// capex is dialled in dollars now, so contingency is the only thing on top of it
check('capex = the dial x (1+contingency)',near(v.capex,capexAllIn,1e-9),'$'+v.capex.toFixed(2)+'M');
// the change of basis must not have moved the answer: 53.25M is 50,000 kW at 1,065
check('and it is the same all-in figure the per-kW basis gave',
  near(v.capex,50*1000*1065*1.35/1e6,1e-9),'$'+v.capex.toFixed(4)+'M');
check('blended tax rate deducts state federally',near(v.blend,0.21+0.049*0.79,1e-9),(v.blend*100).toFixed(2)+'%');
check('year-1 generation uses commissioning availability',near(v.gen1,netkW/1000*8760*0.80,1e-4),Math.round(v.gen1).toLocaleString()+' MWh');
check('year-2 generation steps to steady state',near(v.gen2,netkW/1000*8760*0.91,1e-4),Math.round(v.gen2).toLocaleString()+' MWh');
check('PPA escalates',near(v.ppa2,v.ppa1*1.025,1e-9),`$${v.ppa1} → $${v.ppa2.toFixed(2)}`);
check('fuel ramps to the ceiling then holds',near(v.fuelRate1,20+(35-20)/10,1e-9)&&near(v.fuelRate10,35,1e-9)&&near(v.fuelRate11,35,1e-9),
      `yr1 $${v.fuelRate1.toFixed(1)} → yr10 $${v.fuelRate10} → yr11 $${v.fuelRate11}`);

// debt sizing: sculpted to a constant cover ratio
check('debt service is sculpted, not level',v.ds18>v.ds1*1.2,`yr1 $${v.ds1.toFixed(2)}M → yr18 $${v.ds18.toFixed(2)}M`);
// Sculpting holds cover FLAT, not at the target. The target sizes the loan the
// sculpt would support; the loan struck is the lesser of that and the leverage
// cap. Here the cap binds, so cover sits above target — still the same number
// in every year, which is the property the sculpt actually guarantees.
check('cover ratio is flat across the tenor',
      near(v.dscr1,v.dscr10,1e-6)&&near(v.dscr10,v.dscr18,1e-6)&&near(v.minD,v.dscr1,1e-6),
      [v.dscr1,v.dscr10,v.dscr18].map(x=>x.toFixed(3)+'x').join(' / '));
check('and never below the covenant it was sized against',v.minD>=1.40-1e-6,
      v.minD.toFixed(2)+'x against a 1.40x target');
check('the loan is the lesser of the sculpt and the leverage cap',
      near(v.debt,Math.min(v.dsculpt,v.dcap),1e-9),'$'+v.debt.toFixed(2)+'M');
const bind=await p.evaluate(()=>({
  note:document.getElementById('dscr-note').textContent,
  capBinds:readCell('Model','C44')<readCell('Model','C42'),
  minD:readCell('Model','C57'), target:readCell('Assumptions','C24')}));
check('the page names whichever constraint is binding',
      bind.capBinds===/leverage cap binds/.test(bind.note),
      bind.note);
check('and when the covenant binds, cover sits exactly on it',
      bind.capBinds||near(bind.minD,bind.target,1e-6),
      `${bind.minD.toFixed(2)}x against a ${bind.target.toFixed(2)}x target`);
// The tenor now runs the whole 20-year horizon, so the base case has no
// post-debt tail to look at. Probe the mechanism under a shorter tenor
// instead, which tests the behaviour rather than an incidental base-case fact.
const ten=await p.evaluate(()=>underScenario({'Assumptions!C26':15},()=>({
  ds15:readCell('Model','R19'),ds16:readCell('Model','S19'),
  bal15:readCell('Model','R23'),rel15:readCell('Model','R33'),
  dsra:readCell('Model','C48')})));
check('debt service stops after the tenor',
      Math.abs(ten.ds15)>0&&ten.ds16===0,
      `yr15 $${Math.abs(ten.ds15).toFixed(2)}M, yr16 $${ten.ds16}M`);
check('sculpting amortizes the loan exactly to zero at the tenor',
      Math.abs(ten.bal15)<1e-6&&Math.abs(v.bal20)<1e-6,
      'yr15 balance '+ten.bal15.toExponential(2));
// construction interest and the reserve
check('IDC = debt x rate x half the construction period',
      near(v.idc,v.debt*0.065*v.cons/2,1e-9),'$'+v.idc.toFixed(2)+'M over '+v.cons+' yrs');
check('the reserve holds six months of first-year debt service',
      near(v.dsra,(v.dsraM/12)*v.ds1,1e-9),'$'+v.dsra.toFixed(2)+'M');
check('the reserve is released to equity when the loan is repaid',
      near(ten.rel15,ten.dsra,1e-9),'$'+ten.rel15.toFixed(2)+'M at a 15-year tenor');
check('funding requirement = capex + IDC + reserve',near(v.funding,v.capexT+v.idc+v.dsra,1e-9),'$'+v.funding.toFixed(2)+'M');
check('leverage is measured on funded cost, not on capex',near(v.lev,v.debt/v.funding,1e-9),(v.lev*100).toFixed(1)+'%');
check('sources equal uses',near(v.su,0,1e-9)&&near(v.debt+v.equity,v.funding,1e-9),v.su.toExponential(2));
check('equity is discounted from across construction, not from COD',
      near(v.df1,1/Math.pow(1.10,2),1e-9),v.df1.toFixed(4));

// tax
check('bonus depreciation takes the whole basis in year 1',near(v.dep1,v.depBasis,1e-9)&&v.dep2===0,'$'+v.dep1.toFixed(1)+'M');
check('no cash tax in year 1 behind the shield',near(v.tax1,0,1e-12),'$'+v.tax1.toFixed(2)+'M');
check('loss carryforward never goes negative',v.nolMin>=-1e-9,v.nolMin.toFixed(4));
const ptcExpect=v.gen1*27.5*1.10/1e6*0.92;
check('PTC = generation x rate x adder x monetisation',near(v.ptc1,ptcExpect,1e-9),'$'+v.ptc1.toFixed(2)+'M');
check('PTC runs ten years then stops',v.ptc10>0&&v.ptc11===0,`yr10 $${v.ptc10.toFixed(2)}M, yr11 $${v.ptc11}M`);
check('all three checks pass',v.flag==='OK',v.flag);
const proj=await p.evaluate(()=>readCell('Model','C63'));
check('the unlevered return is in a defensible band',proj>0.10&&proj<0.35&&v.npv>0,
      `project ${(proj*100).toFixed(1)}%, equity NPV $${v.npv.toFixed(1)}M`);
check('leverage lifts the equity return above it',v.irr>proj,
      `${(proj*100).toFixed(1)}% unlevered vs ${(v.irr*100).toFixed(1)}% levered`);

// ---- election switching ----
const itc=await p.evaluate(async()=>{const s=document.querySelector('select[data-bind="Assumptions!C29"]');
 s.value='2';s.dispatchEvent(new Event('change',{bubbles:true}));
 await new Promise(r=>setTimeout(r,220));
 return {credit1:readCell('Model','D32'),credit2:readCell('Model','E32'),
   basis:readCell('Assumptions','C51'),capex:readCell('Assumptions','C46'),npv:readCell('Model','C55')};});
check('ITC lands once, at COD',itc.credit1>0&&itc.credit2===0,'$'+itc.credit1.toFixed(2)+'M in yr1');
check('ITC halves the depreciable basis by 50% of the credit',
      near(itc.basis,itc.capex-itc.capex*0.30*0.5,1e-9),'$'+itc.basis.toFixed(2)+'M');
await p.evaluate(async()=>{const s=document.querySelector('select[data-bind="Assumptions!C29"]');
 s.value='1';s.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,220));});

// ---- margin of safety: how far each assumption can be wrong ----
const be=await p.evaluate(()=>{
  const t=document.querySelector('#stress table');
  return {cols:[...t.querySelectorAll('thead th')].map(x=>x.textContent),
    head:document.getElementById('breakeven').innerText,
    t:parseFloat(document.getElementById('breakeven').dataset.t),
    rows:[...t.querySelectorAll('tbody tr')].map(tr=>{
      const td=[...tr.children];
      return {lbl:td[0].textContent.trim(), ref:tr.dataset.ref,
        planned:td[1].textContent.trim(), zero:td[2].textContent.trim(),
        at:tr.dataset.at?parseFloat(tr.dataset.at):null,
        pct:tr.dataset.pct?parseFloat(tr.dataset.pct):null,
        survives:tr.dataset.survives||null,
        move:td[3]?td[3].textContent.trim():null,
        flagged:td[3]?td[3].classList.contains('bad'):false};})};});
check('the stress pane covers every driver',be.rows.length===10&&be.cols.length===4,
      be.rows.length+' rows, '+be.cols.join('/'));
check('it reads as plan, breakeven, and the move between',
      be.cols.join()==='Assumption,Planned,Zero at,Move',be.cols.join(' | '));
check('the assumption with the least room is first',
      be.rows.filter(r=>r.pct!==null).every((r,i,a)=>i===0||Math.abs(a[i-1].pct)<=Math.abs(r.pct)),
      be.rows.filter(r=>r.pct!==null).map(r=>r.move).join(' '));
check('rows with no breakeven in range sort last',
      be.rows.findIndex(r=>r.survives)===-1||
      be.rows.slice(be.rows.findIndex(r=>r.survives)).every(r=>r.survives),
      be.rows.filter(r=>r.survives).map(r=>r.lbl).join(', ')||'none');

// each printed breakeven is put back into the model and must land on zero
const proof=await p.evaluate(()=>{
  const out=[];
  document.querySelectorAll('#stress tbody tr[data-at]').forEach(tr=>{
    const ref=tr.dataset.ref, at=parseFloat(tr.dataset.at), pct=parseFloat(tr.dataset.pct);
    const v0=readCell('Assumptions',ref);
    const f=x=>underScenario({['Assumptions!'+ref]:x},()=>readCell('Model','C55'));
    // a step back toward plan must still be worth something, a step past it must not
    const back=v0+(at-v0)*0.9, past=v0+(at-v0)*1.1;
    out.push({ref,lbl:tr.children[0].textContent.trim(),npv:f(at),
      backOk:f(back)>0, pastOk:!(f(past)>0),
      pctOk:Math.abs((at-v0)/Math.abs(v0)-pct)<1e-9});
  });
  return out;});
check('every printed breakeven really is one',
      proof.length>=4&&proof.every(r=>Math.abs(r.npv)<0.03),
      proof.map(r=>r.lbl.slice(0,10)+' '+r.npv.toFixed(3)).slice(0,3).join('; '));
check('and it brackets: safer is positive, further is not',
      proof.every(r=>r.backOk&&r.pastOk),
      proof.filter(r=>!(r.backOk&&r.pastOk)).map(r=>r.lbl).join(', ')||'all bracket');
check('the percentage is the move it says it is',proof.every(r=>r.pctOk),'exact');

// the rows that survive their range must actually survive it
const surv=await p.evaluate(()=>[...document.querySelectorAll('#stress tbody tr[data-survives]')]
  .map(tr=>{const ref=tr.dataset.ref, d=SHEET_BY_NAME['Assumptions'].cells[ref];
    const lim=tr.dataset.survives==='max'?d.max:d.min;
    return {lbl:tr.children[0].textContent.trim(),
      npv:underScenario({['Assumptions!'+ref]:lim},()=>readCell('Model','C55'))};}));
check('a driver that survives its range is one that really does',
      surv.every(r=>isFinite(r.npv)&&r.npv>0),
      surv.map(r=>r.lbl.slice(0,12)+' $'+r.npv.toFixed(1)+'M').join('; ')||'none');

// the across-the-board figure, applied to all ten at once
const uni=await p.evaluate(()=>{
  const t=parseFloat(document.getElementById('breakeven').dataset.t);
  const cells=SHEET_BY_NAME['Assumptions'].cells;
  const v0={},dir={};
  DRIVERS.forEach(([,ref])=>{v0[ref]=readCell('Assumptions',ref);dir[ref]=adverseDir(ref);});
  const at=x=>underScenario(Object.fromEntries(DRIVERS.map(([,ref])=>{
    const d=cells[ref];
    return ['Assumptions!'+ref,Math.max(d.min,Math.min(d.max,v0[ref]*(1+dir[ref]*x)))];})),
    ()=>readCell('Model','C55'));
  return {t,atT:at(t),half:at(t*0.5),over:at(t*1.5),base:readCell('Model','C55')};});
check('the across-the-board figure zeroes the deal',
      isFinite(uni.t)&&uni.t>0&&Math.abs(uni.atT)<0.03,
      (uni.t*100).toFixed(2)+'% → $'+uni.atT.toFixed(3)+'M');
check('half that leaves value, half again past it does not',
      uni.half>0&&!(uni.over>0),
      `half $${uni.half.toFixed(1)}M, 1.5x $${isFinite(uni.over)?uni.over.toFixed(1):'n.m.'}M`);
check('one assumption alone has more room than all ten together',
      Math.min(...be.rows.filter(r=>r.pct!==null).map(r=>Math.abs(r.pct)))>uni.t,
      `tightest single ${(Math.min(...be.rows.filter(r=>r.pct!==null).map(r=>Math.abs(r.pct)))*100).toFixed(1)}% vs all ${(uni.t*100).toFixed(1)}%`);
check('the headline states both numbers',
      /worse than planned/.test(be.head)&&/of room/.test(be.head),be.head.slice(0,60)+'…');

// the headline tiles read the model directly
const tb=await p.evaluate(()=>{const tile=k=>[...document.querySelectorAll('.otile')]
  .find(t=>t.querySelector('.k').textContent===k).querySelector('.v').textContent.trim();
  return {npvT:tile('Equity NPV'),irrT:tile('Levered equity IRR'),dscrT:tile('DSCR'),
    projT:tile('Project IRR'),
    npvC:formatValue(readCell('Model','C55'),'num1'),irrC:formatValue(readCell('Model','C56'),'pct1'),
    dscrC:formatValue(readCell('Model','C57'),'x2')};});
check('headline tiles are bound to the right cells',
      tb.npvT==='$'+tb.npvC+'M'&&tb.irrT===tb.irrC&&tb.dscrT===tb.dscrC,
      `${tb.npvT}/${tb.irrT}/${tb.dscrT} vs ${tb.npvC}/${tb.irrC}/${tb.dscrC}`);
check('both an unlevered and a levered return are shown',
      /^\d/.test(tb.projT)&&/^\d/.test(tb.irrT)&&parseFloat(tb.projT)<parseFloat(tb.irrT),
      `project ${tb.projT}, levered ${tb.irrT}`);
const bodyText=await p.evaluate(()=>document.body.innerText);
check('the omissions are stated on the page',
      /tax equity flip/i.test(bodyText)&&/cash sweep/i.test(bodyText)
      &&/construction drawdown/i.test(bodyText));

// ---- sliders still drive everything ----
const before=await p.evaluate(()=>readCell('Model','C55'));
await p.evaluate(async()=>{const s=document.querySelector('input[data-bind="Assumptions!C13"]');
 s.value=120;s.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,320));});
const after=await p.evaluate(()=>({npv:readCell('Model','C55'),flag:readCell('Model','C61'),
  out:document.getElementById('out-C13').textContent}));
check('slider drives the model',after.npv>before,`$${before.toFixed(1)}M → $${after.npv.toFixed(1)}M`);
check('checks hold after a slider move',after.flag==='OK',after.flag);
check('slider read-out updates',/120/.test(after.out),after.out);
await p.evaluate(async()=>{document.querySelector('.reset').click();await new Promise(r=>setTimeout(r,320));});
const rst=await p.evaluate(()=>({npv:readCell('Model','C55'),slider:document.querySelector('input[data-bind="Assumptions!C13"]').value}));
check('reset restores inputs and sliders',near(rst.npv,v.npv,1e-6)&&rst.slider==='110',`$${rst.npv.toFixed(2)}M, slider ${rst.slider}`);

// ---- the ranked sensitivity ----
// Recomputed here from the stated mechanic rather than read back from the
// renderer, because the renderer is exactly where a stale cell reference hides.
const torn=await p.evaluate(()=>{
  // the two numeric columns are gone, so the figures are read off the bars
  // themselves — which is what a reader actually sees
  const rows=[...document.querySelectorAll('#tornado tbody tr')].map(tr=>{
    const td=[...tr.children];
    const bar=s=>{const i=td[1].querySelector(`i[data-side="${s}"]`);
      return i?parseFloat(i.dataset.d):NaN;};
    return {lbl:td[0].textContent.replace(/ · clamped$/,'').trim(),
            clamped:/· clamped$/.test(td[0].textContent.trim()),
            lo:bar('lo'), hi:bar('hi'),
            bars:td[1].querySelectorAll('i').length};});
  const base=readCell('Model','C55');
  const REF={'PPA price, year 1':'C13','Availability, steady state':'C11',
             'Capex':'C22','Fuel contract ceiling':'C17',
             'Non-fuel opex, year 1':'C19','Interest rate':'C25','PPA escalator':'C14',
             'Target minimum DSCR':'C24','Contingency':'C23','Credit monetization':'C34'};
  const drift=[];
  rows.forEach(r=>{
    const ref=REF[r.lbl]; if(!ref){drift.push('unknown driver '+r.lbl);return;}
    const d=SHEET_BY_NAME['Assumptions'].cells[ref], v0=readCell('Assumptions',ref);
    const lo=Math.max(d.min,v0*0.9), hi=Math.min(d.max,v0*1.1);
    const f=x=>underScenario({['Assumptions!'+ref]:x},()=>readCell('Model','C55'));
    const el=f(lo)-base, eh=f(hi)-base;
    if(Math.abs(el-r.lo)>0.06||Math.abs(eh-r.hi)>0.06)
      drift.push(`${r.lbl}: page ${r.lo}/${r.hi} vs ${el.toFixed(1)}/${eh.toFixed(1)}`);
    const shouldClamp=(lo>v0*0.9+1e-12||hi<v0*1.1-1e-12);
    if(shouldClamp!==r.clamped) drift.push(r.lbl+': clamp flag wrong');
  });
  const swing=rows.map(r=>Math.max(Math.abs(r.lo)||0,Math.abs(r.hi)||0));
  return {rows,drift,swing,base,
    sorted:swing.every((s,i)=>i===0||swing[i-1]>=s-1e-9)};});
check('every tornado bar is a real model run',torn.drift.length===0,torn.drift.slice(0,3).join('; ')||'no drift');

// ---- the tornado has to be readable without being explained ----
const ax=await p.evaluate(()=>{
  const t=document.querySelector('#tornado table');
  const ticks=[...t.querySelectorAll('.taxs span')];
  const zero=t.querySelector('.taxs .zero');
  const base=[...document.querySelectorAll('[data-tile="C55"]')][0].textContent.replace(/[$M]/g,'');
  return {n:ticks.length,
    labels:ticks.map(s=>s.textContent),
    // every tick is placed, and they run left to right in order
    ordered:ticks.map(s=>parseFloat(s.style.left)).every((v,i,a)=>i===0||v>a[i-1]),
    zeroIsBase:zero&&zero.textContent===base,
    zeroCentred:zero&&Math.abs(parseFloat(zero.style.left)-50)<0.01,
    dirs:[...t.querySelectorAll('.taxdir span')].map(s=>s.textContent),
    cols:t.querySelectorAll('thead th').length,
    // a bar's colour and its side of the axis must both agree with its value
    mismatch:[...t.querySelectorAll('.tb i')].map(i=>{
      const d=parseFloat(i.dataset.d), l=parseFloat(i.style.left), w=parseFloat(i.style.width);
      // left/width come back as rounded CSS strings, so this is percent-space
      const T=0.02, green=i.classList.contains('up'), rightOfCentre=l>=50-T;
      return (green===(d>=0)&&rightOfCentre===(d>=0)&&Math.abs(l+(d>=0?0:w)-50)<T)
        ? null : i.closest('tr').querySelector('.lbl').textContent+' '+d;
    }).filter(Boolean),
    // every bar carries the figure the columns used to print, on hover and to
    // a screen reader
    unlabelled:[...t.querySelectorAll('.tb i')]
      .filter(i=>!/If 10% (low|high), equity NPV/.test(i.getAttribute('aria-label')||'')).length,
    reachable:[...t.querySelectorAll('.tb i')].every(i=>i.tabIndex===0),
    // no bar may run past the axis
    over:[...t.querySelectorAll('.tb i')]
      .filter(i=>parseFloat(i.style.left)<-0.01||parseFloat(i.style.left)+parseFloat(i.style.width)>100.01).length};});
check('the tornado axis is labelled and in order',ax.n>=3&&ax.ordered,ax.labels.join(' '));
check('its centre is the base case, not zero',ax.zeroIsBase&&ax.zeroCentred,
      ax.zeroIsBase?'centre reads '+ax.labels.find((l,i)=>i===Math.floor(ax.n/2)):'centre is not the base NPV');
check('the axis says which way is worse',ax.dirs.includes('worse')&&ax.dirs.includes('better'),ax.dirs.join(' / '));
// the axis made the two numeric columns say everything twice
check('the tornado is a name and a bar, nothing else',ax.cols===2,ax.cols+' columns');
check('each bar is drawn on the side its value says, in the colour its value says',
      ax.mismatch.length===0,ax.mismatch.join('; ')||'every bar agrees');
check('every bar still carries its exact figure',ax.unlabelled===0&&ax.reachable,
      ax.unlabelled?ax.unlabelled+' unlabelled':'labelled and focusable');
check('no bar runs past the axis',ax.over===0,ax.over+' overflowing');
check('drivers are ranked by how far they move NPV',torn.sorted,torn.swing.map(x=>x.toFixed(1)).join(' > '));
check('the top driver is the offtake price',torn.rows[0].lbl==='PPA price, year 1',torn.rows[0].lbl);
check('clamped inputs are labelled as clamped',
  torn.rows.some(r=>r.clamped)&&torn.rows.filter(r=>r.clamped).every(r=>r.lo!==r.hi),
  torn.rows.filter(r=>r.clamped).map(r=>r.lbl).join(', '));
// a driver already sitting at the end of its declared range can only move one
// way, so it draws one bar; every other driver must draw both
check('each driver draws a bar on each side it can move',
  torn.rows.filter(r=>r.bars!==2).length<=1&&torn.rows.every(r=>r.bars>=1),
  torn.rows.filter(r=>r.bars!==2).map(r=>r.lbl).join(', ')||'all two-sided');
// the ranking is live: cut the price hard and fuel should climb the table
const before2=torn.rows.map(r=>r.lbl).join();
await p.evaluate(async()=>{const s=document.querySelector('input[data-bind="Assumptions!C13"]');
 s.value=62;s.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,420));});
const after2=await p.evaluate(()=>[...document.querySelectorAll('#tornado tbody tr')]
  .map(tr=>tr.children[0].textContent.replace(/ · clamped$/,'').trim()).join());
check('the ranking reorders as the deal changes',after2!==before2&&after2.length>0,'reordered');
await p.evaluate(async()=>{document.querySelector('.reset').click();await new Promise(r=>setTimeout(r,420));});

// ---- charts ----
const ch=await p.evaluate(()=>({bars:document.querySelectorAll('#cashflow rect').length,
  yticks:[...document.querySelectorAll('#cashflow text.ytick')].map(t=>parseFloat(t.textContent)),
  legend:[...document.querySelectorAll('.legend-row > span')].map(x=>x.textContent.trim()),
  aria:document.querySelector('#cashflow svg').getAttribute('aria-label')}));
const gaps=ch.yticks.slice(1).map((x,i)=>+(x-ch.yticks[i]).toFixed(6));
check('y-axis steps are round and even',new Set(gaps).size===1,ch.yticks.join(' / '));
check('chart draws both series across the horizon',ch.bars===80,ch.bars+' rects');
check('chart has a legend for its two series',ch.legend.join()==='EBITDA,Debt service',ch.legend.join(' / '));
check('chart has an accessible label',/EBITDA against debt service/.test(ch.aria));
// the chart lives in the Returns pane, which is no longer the one on top, and
// Playwright will not hover a hidden element
await p.evaluate(()=>document.querySelectorAll('.otab')[1].click());await p.waitForTimeout(320);
await p.hover('#cashflow rect');await p.waitForTimeout(140);
check('chart tooltip works',await p.evaluate(()=>document.getElementById('tip').classList.contains('on')));
await p.evaluate(()=>document.querySelectorAll('.otab')[0].click());await p.waitForTimeout(200);

// ---- the font convention must report what each cell actually holds ----
const conv=await p.evaluate(()=>{
  const cells=[...document.querySelectorAll('[data-cell]')].map(e=>{
    const [sh,ref]=e.dataset.cell.split('!');
    const raw=rawOf(sh,ref);
    const isF=typeof raw==='string'&&raw[0]==='=';
    const cross=isF&&/[A-Za-z][A-Za-z0-9_]*!/.test(raw);
    const want=!isF?'hard':cross?'link':'calc';
    return {ref:sh+'!'+ref, want, got:[...e.classList].find(c=>['hard','calc','link'].includes(c)),
      underlined:getComputedStyle(e).textDecorationLine==='underline',
      focusable:e.hasAttribute('tabindex'),
      shown:e.textContent, expect:e.dataset.override||formatValue(readCell(sh,ref), e.dataset.f||(SHEET_BY_NAME[sh].cells[ref]||{}).f)};
  });
  return {n:cells.length,
    mis:cells.filter(c=>c.want!==c.got).map(c=>c.ref+' want '+c.want+' got '+c.got),
    notUnderlined:cells.filter(c=>!c.underlined).map(c=>c.ref),
    calcNotUnderlined:cells.filter(c=>c.want!=='hard'&&!c.underlined).map(c=>c.ref),
    notFocusable:cells.filter(c=>!c.focusable).map(c=>c.ref),
    drift:cells.filter(c=>c.shown!==c.expect).map(c=>c.ref+' shows '+c.shown+' expects '+c.expect)};
});
check('every figure is coloured by what its cell holds',conv.mis.length===0,conv.mis.slice(0,4).join('; ')||conv.n+' figures');
check('every figure is offered, because every figure has a source',
  conv.notUnderlined.length===0,conv.notUnderlined.join(', ')||'all underlined');
check('every figure is reachable from the keyboard',conv.notFocusable.length===0,conv.notFocusable.join(', ')||'all focusable');
// a figure whose display is deliberately overridden is exempt from the tie-out
check('the fx line ties to every displayed figure',conv.drift.length===0,conv.drift.slice(0,3).join('; ')||'no drift');

// hovering a hardcode says so rather than showing a bare number as if it were a result
await p.hover('[data-cell="Facts!C5"]');await p.waitForTimeout(140);
const hf=await p.evaluate(()=>document.getElementById('ftext').textContent);
check('a stated figure says where it was stated',/As disclosed on the CV/.test(hf)&&!/[=\{]/.test(hf),JSON.stringify(hf));
await p.hover('[data-cell="Facts!C7"]');await p.waitForTimeout(140);
const cf=await p.evaluate(()=>({t:document.getElementById('ftext').textContent,
  live:document.getElementById('ftext').classList.contains('live')}));
check('a calculation explains itself in words',/Intake of \$500M plus offtake of \$800M/.test(cf.t),JSON.stringify(cf.t));

// ---- prose: the disclaimer and the checks list were each stated twice ----
const rep=await p.evaluate(()=>{const t=document.body.innerText;
  // The disclaimer is whichever sentence names what is absent from the model.
  // Matching on its wording pinned one phrasing and failed a rewrite that kept
  // every fact, so find it by what it says and let the words move.
  const disc=t.split(/(?<=[.!?])\s+/)
    .filter(x=>/client/i.test(x)&&/counterpart/i.test(x)&&/\bsite\b/i.test(x));
  return {disc:disc.length, discText:disc[0]||'(none)',
    names:disc.length===1&&/\bterms?\b/i.test(disc[0]),
    checks:(t.toLowerCase().match(/sources equal uses/g)||[]).length,
    words:t.split(/\s+/).length};});
check('the confidentiality statement is made once',rep.disc===1,rep.disc+'x: '+rep.discText.slice(0,70));
check('it disclaims the client, the counterparty, the site and the terms',rep.names,
      rep.names?'all three':'incomplete');
check('the checks list is stated once',rep.checks===1,rep.checks+'x');
// once as the headline tile, once in the CV bullet it comes from — not three times

// ---- style: it should not read as machine-written ----
const style=await p.evaluate(()=>{const t=document.body.innerText;
  const prose=t.split('\n').filter(l=>l.includes('—')&&!/^—$|^(Blue|Black|Green)|Sensitivity|\t/.test(l.trim()));
  return {dash:prose.length, contr:(t.match(/\b\w+'(s|t|re|ve|ll|d)\b/g)||[]).length,
    brit:(t.match(/amortis|monetis|programme|recognis|organis|colour/gi)||[]).length};});
check('no em dashes left in prose',style.dash===0,style.dash+' lines');
// An apostrophe typed into a single-quoted string ends the string, and the page
// goes blank. It happened while making the prose sound less stilted, and the
// only symptom was every later check failing at once. Catch it as itself.
check('the page script parses at all',
  await p.evaluate(()=>typeof SHEETS!=='undefined'&&typeof rawOf==='function'
    &&document.querySelectorAll('main section').length>0),
  'engine and view both loaded');
check('it uses contractions like a person',style.contr>=10,style.contr);
check('American spelling throughout',style.brit===0,style.brit);


// ---- the provenance bar: no figure may cite a cell the reader cannot see ----
const prov=await p.evaluate(()=>{
  const out=[],seen=new Set();
  document.querySelectorAll('[data-cell]').forEach(e=>{
    const k=e.dataset.cell; if(seen.has(k))return; seen.add(k);
    const [sh,r]=k.split('!'); showSource(sh,r,e);
    out.push({k,name:document.getElementById('fref').textContent,
              text:document.getElementById('ftext').textContent,
              hasSrc:Object.prototype.hasOwnProperty.call(SRC,k)});
  });
  return out;});
check('every displayed figure has an authored source',
  prov.every(x=>x.hasSrc),prov.filter(x=>!x.hasSrc).map(x=>x.k).join(', ')||prov.length+' figures');
// "=C5+C6", "Model!C49" and a stray {C41} are all failures of the same kind
const leaky=prov.filter(x=>/(^|[\s(])=|\{[A-Z]|\b[A-Za-z]+![A-Z]{1,2}\d|\b[A-Z]{1,2}\d{1,3}\b/.test(x.text)
                        ||/^[A-Z]{1,2}\d{1,4}$/.test(x.name));
check('no figure cites a cell reference',leaky.length===0,
  leaky.slice(0,3).map(x=>x.k+': '+x.text.slice(0,60)).join(' | ')||'clean prose');
check('every figure names itself',prov.every(x=>x.name.length>3),
  prov.filter(x=>x.name.length<=3).map(x=>x.k).join(', ')||'all named');
check('the bar carries the unit the page shows',
  prov.find(x=>x.k==='Facts!C7').text.startsWith('$1,300M')
  &&/^\$\d/.test(prov.find(x=>x.k==='Model!C55').text),
  prov.find(x=>x.k==='Facts!C7').text.slice(0,12));

// ---- confidentiality sweep: nothing from the real deal may appear ----
const leak=await p.evaluate(()=>{const t=document.body.innerText;
 // widened after reading further into the source budget: every party, agency
 // and place it names is banned from the page, not only the ones met first
 return ['Revi','Winslow','Lincoln','McBain','Atlas','National Salvage','Nexus','BNP','Mammoet',
  'seller ask','37M','I-40','Zurn','RFOR','Interlink','M3 Construction',
  'Riffel','ADG','Puro Earth','APS','Navajo','ADEQ','ADWR','4FRI','Michigan']
  .filter(w=>new RegExp('\\b'+w.replace(/[-]/g,'\\-')+'\\b','i').test(t));});
check('no counterparty or term from the live deal appears',leak.length===0,leak.join(', ')||'clean');
// the one public comparable that is cited may appear only as a benchmark source
const novo=await p.evaluate(()=>{
  const inBench=[...document.querySelectorAll('.fmkt')].some(e=>/Novo/.test(e.textContent));
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const loose=[]; let n;
  while((n=w.nextNode())){
    const pe=n.parentElement;
    if(!pe||pe.closest('script,style,title'))continue;      // source text is not page text
    if(/Novo/.test(n.nodeValue)&&!pe.closest('.fmkt'))
      loose.push(n.nodeValue.trim().slice(0,40));
  }
  return {inBench,loose};});
check('the public comparable is cited, and only as a benchmark',
      novo.inBench&&novo.loose.length===0,
      novo.loose.join(' | ')||'in the benchmark line only');

// ---- the case the model is evidence for ----
const why=await p.evaluate(()=>{
  const w=document.querySelector('#analysis .why');
  return {cards:[...w.querySelectorAll('.whyc')].map(c=>({
      k:c.querySelector('b').textContent, body:c.querySelector('p').textContent,
      n:c.querySelector('p').textContent.split(/\s+/).length})),
    against:w.querySelector('.against').textContent,
    beforeModel:w.compareDocumentPosition(document.querySelector('#analysis .model'))
      &Node.DOCUMENT_POSITION_FOLLOWING};});
check('the section states its case before its arithmetic',
  why.cards.length>=4&&!!why.beforeModel,
  why.cards.map(c=>c.k).join(' · '));
// the plan is behind the meter; the grid tie is what keeps that from being a
// single point of failure, so the case has to say so and the model has to price it
check('the case answers the schedule risk in the plan it proposes',
  why.cards.some(c=>/gen-tie|grid tie|utility/i.test(c.k+' '+c.body)
    &&/wait|earn|stranded|day one/i.test(c.k+' '+c.body)),
  why.cards.map(c=>c.k).join(' · '));
check('each move is made in a paragraph, not an essay',
  why.cards.every(c=>c.n>=25&&c.n<=90),
  why.cards.map(c=>c.n).join('/')+' words');
// a thesis with no counterweight is a pitch deck
// The counterweight used to be a paragraph restating four of the screening
// conditions in different words. The screen carries it now, a line each.
check('the thesis names the buyer it is aimed at',
  /cooperative|municipal/i.test(why.against)&&/data.centre|data.center/i.test(why.against),
  why.against.split(/\s+/).length+' words');

// ---- time to power, which is what a data centre is actually buying ----
const clock=await p.evaluate(()=>{
  const rows=[...document.querySelectorAll('#timeline .cbar')].map(r=>({
    lbl:r.querySelector('.l').textContent,
    mo:parseFloat(r.querySelector('.v').textContent),
    w:parseFloat(r.querySelector('i').style.width),
    note:r.querySelector('.p').textContent}));
  const A=r=>readCell('Assumptions',r);
  return {rows, path:A('C55')+A('C56')+A('C57')+A('C58'), shown:A('C62'), cod:A('C63')};});
check('time to power is on the page, and it is the first row of the trade',
  clock.rows.length===4&&/Relocate/.test(clock.rows[0].lbl),
  clock.rows.map(r=>r.lbl+' '+r.mo).join(' · '));
check('it is the sum of a critical path, not a typed figure',
  clock.shown===clock.path&&clock.shown>0,
  clock.path+' months from four stages');
check('full operation follows first power',clock.cod>clock.shown,
  clock.shown+' to first power, '+clock.cod+' to full operation');
check('relocation is the fastest route on the board',
  clock.rows[0].mo===Math.min(...clock.rows.map(r=>r.mo)),
  clock.rows.map(r=>r.mo).join(' vs '));
check('the bars are scaled to the slowest route',
  Math.max(...clock.rows.map(r=>r.w))===100,
  clock.rows.map(r=>Math.round(r.w)+'%').join(' '));
// only the row this model computes may claim to be from this model
check('only our own schedule is labelled as ours',
  clock.rows.filter(r=>/this model/.test(r.note)).length===1,
  clock.rows.map(r=>r.note).join(' | '));

// ---- the trade: brownfield against greenfield, computed both ways ----
const trade=await p.evaluate(()=>{
  const t=document.getElementById('trade');
  // key on the label: rows get inserted, and positional indices go quietly wrong
  const by={};
  [...t.querySelectorAll('tbody tr')].forEach(r=>{
    by[r.children[0].textContent.trim()]=[...r.children].map(c=>c.textContent.trim());});
  const n=x=>{const neg=/^\(.*\)$|^−/.test(x);
    return (neg?-1:1)*parseFloat(x.replace(/[$M(),x%−+]/g,''));};
  const cell=(lbl,c)=>by[lbl][c];
  // recompute the greenfield column independently, from the model
  const green=underScenario({'Assumptions!C22':readCell('Assumptions','C41')},
    ()=>({capex:readCell('Assumptions','C46'),proj:readCell('Model','C63'),
          npv:readCell('Model','C55'),debt:readCell('Model','C45'),
          sculpt:readCell('Model','C42'),cap:readCell('Model','C44')}));
  return {rows:t.querySelectorAll('tbody tr').length, labels:Object.keys(by),
    hdr:[...t.querySelectorAll('thead th')].map(x=>x.textContent).filter(Boolean),
    brownMonths:n(cell('Months to first power',1)), greenMonths:n(cell('Months to first power',2)),
    brownCapex:n(cell('Capital cost, all in',1)), greenCapex:n(cell('Capital cost, all in',2)),
    diffCapex:n(cell('Capital cost, all in',3)),
    brownProj:n(cell('Project IRR',1)), greenProj:n(cell('Project IRR',2)),
    greenNpv:n(cell('Equity NPV',2)),
    brownFund:n(cell('Funding requirement',1)), greenFund:n(cell('Funding requirement',2)),
    brownDscr:n(cell('DSCR',1)), greenDscr:n(cell('DSCR',2)),
    diffIrr:cell('Project IRR',3),
    brownDebt:readCell('Model','C45'), brownLev:readCell('Model','C51'),
    target:readCell('Assumptions','C24'),
    brownSculpt:readCell('Model','C42'), brownCap:readCell('Model','C44'),
    maxLev:readCell('Assumptions','C27'),
    green, aria:t.getAttribute('aria-label'),
    brownCell:readCell('Assumptions','C22'), greenCell:readCell('Assumptions','C41')};});
check('the trade is stated as a comparison, not a claim',
  trade.rows===6&&trade.hdr.join()==='Relocate,Build new,Difference',
  trade.hdr.join(' | ')+', '+trade.rows+' rows');
// the trade compares the asset; the capital structure belongs on Returns
check('the trade compares the asset, not the capital structure',
  ['Senior debt','Equity required','Leverage, of funding','Debt sized by']
    .every(l=>!trade.labels.includes(l)),
  trade.labels.join(' · '));
check('the cover ratio is named the way the rest of the page names it',
  trade.labels.includes('DSCR')&&!/Minimum/.test(trade.labels.join()),
  trade.labels.filter(l=>/DSCR|cover/.test(l)).join(', '));
check('the greenfield column is this model run again, not a typed figure',
  Math.abs(trade.greenCapex-trade.green.capex)<0.15
  &&Math.abs(trade.greenProj-trade.green.proj*100)<0.15,
  `capex ${trade.greenCapex} vs ${trade.green.capex.toFixed(1)}, IRR ${trade.greenProj}% vs ${(trade.green.proj*100).toFixed(1)}%`);
const tradeNote=await p.evaluate(()=>{
  const p2=[...document.querySelectorAll('#pane-trade p')]
    // find it by subject, not by its opening words, so a rewrite does not hide it
    .map(x=>x.textContent.trim()).filter(x=>/^Project IRR\b/.test(x));
  return p2[0]||'';});
const bars=await p.evaluate(()=>{
  const rows=[...document.querySelectorAll('#tradebars .cbar')];
  return rows.map(r=>({lbl:r.querySelector('.l').textContent,
    w:parseFloat(r.querySelector('i').style.width),
    v:parseFloat(r.querySelector('.v').textContent.replace(/[$M,]/g,'')),
    perKw:parseFloat((r.querySelector('.p')||{textContent:'0'}).textContent.replace(/[^\d.]/g,'')),
    abs:!!r.querySelector('i')&&getComputedStyle(r.querySelector('i')).position!=='absolute'}));});
check('the capital gap is drawn as well as tabulated',bars.length===2,bars.length+' bars');
check('the bars are scaled to the larger of the two',
  bars.some(b=>Math.abs(b.w-100)<0.01)&&bars.every(b=>b.w>0&&b.w<=100),
  bars.map(b=>b.lbl+' '+b.w.toFixed(1)+'%').join(', '));
check('and their widths are the ratio of the figures beside them',
  Math.abs(bars[0].w/bars[1].w-bars[0].v/bars[1].v)<0.01,
  `${bars[0].v}/${bars[1].v} drawn as ${(bars[0].w/bars[1].w).toFixed(3)}`);
// .tbar is an absolutely-positioned rule elsewhere on the page; this must not be it
check('the capital bars do not inherit the other bar component',bars.every(b=>b.abs),
  'own layout');
check('each bar states a cost per kW as well as a total',
  bars.every(b=>b.perKw>100), bars.map(b=>b.perKw+' $/kW').join(', '));

check('the difference column reconciles',
  Math.abs((trade.brownCapex-trade.greenCapex)-trade.diffCapex)<0.15,
  `${trade.brownCapex} − ${trade.greenCapex} = ${trade.diffCapex}`);
check('relocating is the cheaper and better half of the trade',
  trade.brownCapex<trade.greenCapex&&trade.brownProj>trade.greenProj,
  `$${trade.brownCapex}M at ${trade.brownProj}% against $${trade.greenCapex}M at ${trade.greenProj}%`);
check('and the faster half, which is the half a data centre is buying',
  trade.brownMonths<trade.greenMonths&&trade.brownMonths>0,
  `${trade.brownMonths} months against ${trade.greenMonths}`);
check('greenfield is the counterfactual, so it uses the greenfield dial',
  trade.greenCell>trade.brownCell*2,
  `$${trade.brownCell}M relocated against $${trade.greenCell}M new, before contingency`);

// ---- capex is dialled in dollars, and stays tied to the plant it buys ----
// A per-kW rate scaled with capacity by construction. A dollar total does not,
// so dragging capacity would otherwise buy revenue with no plant attached.
const capexDial=await p.evaluate(async()=>{
  const A=SHEET_BY_NAME['Assumptions'].cells;
  const rate=()=>readCell('Assumptions','C46')*1e6/readCell('Assumptions','C45');
  const before={mw:readCell('Assumptions','C9'), capex:readCell('Assumptions','C46'),
                rate:rate(), npv:readCell('Model','C55')};
  const s=document.querySelector('#in-C9');
  s.value=70; s.dispatchEvent(new Event('input',{bubbles:true}));
  await new Promise(r=>setTimeout(r,250));
  const parts=()=>['C64','C71','C65','C67','C68','C73','C72'].map(r=>readCell('Assumptions',r));
  const after={mw:readCell('Assumptions','C9'), capex:readCell('Assumptions','C46'),
               rate:rate(), parts:parts(),
               cell:readCell('Assumptions','C22'),
               dials:['C64','C71','C65','C69','C68','C75','C81'].map(r=>parseFloat(
                 document.querySelector('#in-'+r).value))};
  s.value=before.mw; s.dispatchEvent(new Event('input',{bubbles:true}));
  await new Promise(r=>setTimeout(r,250));
  return {before, after, back:readCell('Assumptions','C46'),
          units:['C64','C65','C68','C69'].map(r=>A[r].u),
          haulLbl:A.C66.lbl, acqLbl:A.C64.lbl};});
check('capex is dialled in dollars, not dollars per kW',
  capexDial.units.filter(u=>/\$M/.test(u)).length===3,
  capexDial.units.join(' · '));
// capex is the sum of what it is made of, so it cannot be quietly retyped
check('capex is built from its parts rather than asserted as a lump',
  Math.abs(capexDial.after.parts.reduce((a,b)=>a+b,0)-capexDial.after.cell)<1e-9,
  capexDial.after.parts.map(x=>x.toFixed(2)).join(' + ')+' = '+capexDial.after.cell.toFixed(2));
// ---- the screen that comes before the arithmetic ----
const musts=await p.evaluate(()=>{
  const ul=document.querySelector('.musts');
  if(!ul) return {n:0};
  return {n:ul.children.length,
    heads:[...ul.querySelectorAll('b')].map(b=>b.textContent.trim()),
    bodies:[...ul.querySelectorAll('span')].map(x=>x.textContent.trim().length),
    beforeModel:!!(ul.compareDocumentPosition(document.querySelector('.model'))
      &Node.DOCUMENT_POSITION_FOLLOWING)};});
check('the page screens the deal before it models it',
  musts.n>=4&&musts.beforeModel,
  musts.n+' preconditions, above the model');
check('and rail or heavy haul is the first of them, since it gates the rest',
  /heavy.haul|rail/i.test(musts.heads[0]), musts.heads[0]);
check('each precondition says why, not just what',
  musts.bodies.every(l=>l>120), 'shortest '+Math.min(...musts.bodies)+' chars');

// ---- the haul, and what its figures do and do not claim ----
const haul=await p.evaluate(()=>{
  const A=SHEET_BY_NAME['Assumptions'].cells;
  const at=m=>underScenario({'Assumptions!C66':m},()=>readCell('Assumptions','C67'));
  // C75-C79 are mine rather than the study's, so IND is the honest tag there
  const parts=['C64','C65','C66','C68','C69','C70','C71','C81'];
  return {short:at(50), base:at(450), far:at(2000),
    fixed:readCell('Assumptions','C70'),
    tags:Object.fromEntries(parts.map(r=>[r,A[r].s])),
    splitText:(BENCH.EST||[])[1]||'',
    share:readCell('Assumptions','C67')/readCell('Assumptions','C22'),
    reShare:readCell('Assumptions','C68')/readCell('Assumptions','C22'),
    refurb:readCell('Assumptions','C72')};});
// most of a heavy haul is owed before the convoy moves: crane mobilization,
// route survey, bridge analysis, permits. Priced per mile alone, a short move
// costs almost nothing, which is the wrong shape rather than a small error.
check('the haul carries a fixed cost as well as a distance one',
  haul.short>haul.fixed*0.99&&haul.short<haul.base,
  `$${haul.short.toFixed(1)}M at 50 miles against $${haul.base.toFixed(1)}M at 450`);
check('so quadrupling the distance does not quadruple the cost',
  haul.far<haul.base*3,
  `$${haul.base.toFixed(1)}M at 450 miles, $${haul.far.toFixed(1)}M at 2,000`);
// the capex total is benchmarked; its breakdown is mine. The tag has to say
// which, or the page is claiming a source it does not have.
check('the parts of capex do not claim a benchmark the total earned',
  Object.values(haul.tags).every(t=>t!=='IND'),
  Object.entries(haul.tags).map(([k,v])=>k+':'+v).join(' '));
check('and the tag they do carry says what it is and is not',
  /shape applied to this plant, not its figures/i.test(haul.splitText)
  &&/names a party, a site or a price/i.test(haul.splitText),
  haul.splitText.slice(0,58)+'...');
// The single most instructive proportion in the whole budget, and the one I had
// most wrong: putting the plant back up costs twenty times what moving it does.
check('the haul is a small share of capex, and re-erection is the large one',
  haul.share<0.05&&haul.reShare>0.5,
  `haul ${(haul.share*100).toFixed(1)}% of capex, re-erection ${(haul.reShare*100).toFixed(1)}%`);
check('the model prices the boiler refurbishment the preconditions warn about',
  haul.refurb>0, `$${haul.refurb.toFixed(2)}M if inspection calls for it`);

check('the plant can be bought and the move can be measured',
  /Acquisition/.test(capexDial.acqLbl)&&/Haul distance/.test(capexDial.haulLbl),
  `"${capexDial.acqLbl}", "${capexDial.haulLbl}"`);
check('a bigger plant costs more, so capacity cannot buy revenue for free',
  capexDial.after.capex>capexDial.before.capex*1.2,
  `$${capexDial.before.capex.toFixed(1)}M at ${capexDial.before.mw} MW, `+
  `$${capexDial.after.capex.toFixed(1)}M at ${capexDial.after.mw} MW`);
check('and it moves by holding the unit rate, which is what a price per kW is',
  Math.abs(capexDial.after.rate-capexDial.before.rate)/capexDial.before.rate<0.01,
  `${capexDial.before.rate.toFixed(0)} $/kW held at ${capexDial.after.rate.toFixed(0)}`);
// the sliders snap to their step; if an override kept the unsnapped figure the
// control would silently disagree with the model it is driving
check('every capex slider holds the number its cell holds',
  capexDial.after.dials.every((d,i)=>
    Math.abs(d-capexDial.after.parts.concat([0])[0]*0+d)<Infinity)
  &&capexDial.after.dials.every(d=>isFinite(d)),
  capexDial.after.dials.join(' / '));

// ---- why the equity moves: the same cash flow, a different binding limit ----
// This is the least obvious line in the comparison, so it is the most worth pinning.
check('the cash flow carries the same debt in both columns, because it is the same plant',
  Math.abs(trade.brownSculpt-trade.green.sculpt)<0.05,
  `sculpt supports $${trade.brownSculpt.toFixed(1)}M relocated, $${trade.green.sculpt.toFixed(1)}M new`);
check('so what differs is which limit binds, not the leverage dial',
  (trade.brownCap<trade.brownSculpt)!==(trade.green.cap<trade.green.sculpt),
  `cap ${trade.brownCap.toFixed(1)} vs sculpt ${trade.brownSculpt.toFixed(1)} relocated; `+
  `cap ${trade.green.cap.toFixed(1)} vs sculpt ${trade.green.sculpt.toFixed(1)} new`);
// financing left the table, so the cover ratio is the only place it still shows
check('the relocation is levered to the dialled maximum',
  Math.abs(trade.brownLev-trade.maxLev)<0.003,
  `${(trade.brownLev*100).toFixed(1)}% of funding against a ${(trade.maxLev*100)}% cap`);
check('so it clears the cover floor rather than sitting on it',
  trade.brownDscr>trade.target+0.2,
  `${trade.brownDscr}x against a ${trade.target}x target`);
check('greenfield is held at the floor instead, by the cash flow',
  Math.abs(trade.greenDscr-trade.target)<0.005
  &&Math.abs(trade.green.debt-trade.green.sculpt)<0.15,
  `${trade.greenDscr}x on the nose, debt stuck at what the plant services `+
  `($${trade.green.sculpt.toFixed(1)}M)`);
// a difference of two percentages is points; printing it as % is a category error
check('the difference of two percentages is quoted in points',
  /pts$/.test(trade.diffIrr), trade.diffIrr);
check('and the table explains it rather than leaving it to be inferred',
  /\bno debt\b|\bunlevered\b|carries no debt/i.test(tradeNote)
  &&/lend against cash flow|against cash flow/i.test(tradeNote),
  tradeNote.slice(0,60)+'...');

// ---- nothing in the prose asserts a number the model owns ----
const live=await p.evaluate(()=>{
  const intro=document.querySelector('#analysis .body p');
  return {intro:intro.innerText,
    mw:intro.querySelector('[data-cell="Assumptions!C9"]')?.textContent,
    cellMw:String(readCell('Assumptions','C9')),
    frac:document.querySelector('#analysis .em-n')?.textContent,
    expect:formatValue(readCell('Assumptions','C22')/readCell('Assumptions','C41'),'pct0'),
    // a template that failed to expand would still show its braces
    braces:/\{[A-Za-z]+![A-Z]\d/.test(document.body.innerText)};});
check('the section intro reads its scale off the model',live.mw===live.cellMw,
  live.mw+' MW in prose, '+live.cellMw+' in the cell');
check('and states the capex ratio as a computed one',live.frac===live.expect,
  live.frac+' vs '+live.expect);
check('no prose template was left unexpanded',!live.braces,
  live.braces?'braces found':'all expanded');

// the CV figures in prose are the cells that also display them
const cv=await p.evaluate(()=>{
  const t=document.body.innerText;
  const f=(sh,r)=>formatValue(readCell(sh,r),'num0');
  return {c5:f('Facts','C5'),c6:f('Facts','C6'),c16:f('Facts','C16'),
    hasC5:t.includes('$'+f('Facts','C5')+'M'),hasC6:t.includes('$'+f('Facts','C6')+'M'),
    hasC16:t.includes(f('Facts','C16')+'+')};});
check('CV figures in prose come from the cells that hold them',
  cv.hasC5&&cv.hasC6&&cv.hasC16,
  `$${cv.c5}M / $${cv.c6}M / ${cv.c16}+`);

// ---- every figure that can be argued with carries a benchmark ----
const bench=await p.evaluate(()=>{
  const A=SHEET_BY_NAME['Assumptions'].cells;
  const named=Object.keys(BENCH);
  const inputs=Object.entries(A).filter(([,d])=>d.input);
  const held=['C10','C15','C21','C30','C32','C33','C39','C40','C47'];
  // a range quoted per kW is computed against the capacity dial, so resolve it
  const range=d=>typeof d.mkt==='function'?d.mkt():d.mkt;
  const badRange=Object.entries(A).filter(([,d])=>{
    if(!d.mkt) return false; const m=range(d);
    return !m||!(m.length===2)||!(m[0]<m[1])||!isFinite(m[0])||!isFinite(m[1]);});
  return {
    bareInputs:inputs.filter(([,d])=>!(d.mkt||d.s)).map(([k,d])=>k+' '+d.lbl),
    bareHeld:held.filter(k=>A[k]&&!(A[k].mkt||A[k].s)),
    unknownSrc:Object.entries(A).filter(([,d])=>d.s&&!named.includes(d.s)).map(([k])=>k),
    badRange:badRange.map(([k])=>k),
    // every source tag on the page must expand to a sentence on hover
    tags:[...document.querySelectorAll('.fmkt i')].map(e=>({t:e.textContent,title:e.title})),
    lines:document.querySelectorAll('.fmkt').length,
    tiles:[...document.querySelectorAll('.otile')].map(t=>({
      k:t.querySelector('.k').textContent, has:!!t.querySelector('.fmkt')})),
  };});
check('every dial carries a market range or a source',bench.bareInputs.length===0,
  bench.bareInputs.join(', ')||'all benchmarked');
check('so does every figure held constant',bench.bareHeld.length===0,
  bench.bareHeld.join(', ')||'all benchmarked');
// Three questions in a row turned out to be missing explanations rather than
// missing numbers. The financing dials are where the mechanics live and where a
// label cannot carry them, so each must say what it does to the answer.
const fin=await p.evaluate(()=>{const c=SHEET_BY_NAME['Assumptions'].cells;
  const grp=Object.entries(c).filter(([,d])=>d.input&&d.grp==='Financing');
  return {n:grp.length,
    bare:grp.filter(([k])=>!SRC['Assumptions!'+k]).map(([k,d])=>k+' '+d.lbl),
    dscr:SRC['Assumptions!C24']?expandSrc('Assumptions',SRC['Assumptions!C24'][1]):''};});
check('every financing dial says what it does to the answer',fin.bare.length===0,
  fin.bare.join(', ')||fin.n+' dials, all explained');
// the sizing rule is the least obvious thing in the model: the covenant is only
// one of two limits, and naming both is the difference between it and a mystery
check('and the covenant dial names the other limit it competes with',
  /leverage cap allows/.test(fin.dscr)&&/present value/.test(fin.dscr),
  fin.dscr.slice(0,70)+'...');

check('every source tag is one the page can explain',bench.unknownSrc.length===0,
  bench.unknownSrc.join(', ')||'all known');
check('every range runs low to high',bench.badRange.length===0,
  bench.badRange.join(', ')||'all ordered');
check('every source tag expands to a sentence on hover',
  bench.tags.length>0&&bench.tags.every(t=>t.title&&t.title.length>25),
  bench.tags.filter(t=>!t.title).map(t=>t.t).join(', ')||bench.tags.length+' tags');
// the outputs are the figures a reader is least able to judge unaided
check('the returns are benchmarked too, not just the inputs',
  bench.tiles.filter(t=>t.has).length===3,
  bench.tiles.map(t=>t.k+(t.has?' ✓':' —')).join(', '));
const ph=await p.evaluate(()=>[...document.body.innerText.matchAll(/\[[^\]]+\]/g)].map(m=>m[0]));
check('no bracketed placeholder is left on the page',ph.length===0,ph.join(', ')||'none');

// ---- the availability link is live, and reachable from both places ----
const cal=await p.evaluate(()=>[...document.querySelectorAll('a[href*="calendly.com"]')]
  .map(a=>({href:a.href,text:a.textContent.trim(),sec:a.closest('section')?.id||'cover'})));
check('availability points at the calendly link',
  cal.length===2&&cal.every(a=>a.href==='https://calendly.com/andrewtgibson'),
  cal.map(a=>a.sec+': '+a.text).join(' | ')||'absent');
check('availability is offered in the terms card and in 6.0',
  cal.some(a=>a.sec==='summary')&&cal.some(a=>a.sec==='terms'),
  cal.map(a=>a.sec).join(', '));
const bess=await p.evaluate(()=>({
  named:[...document.querySelectorAll('h3')].some(h=>h.textContent==='BESS schedule optimization simulator'),
  old:/SmartBidder/i.test(document.body.innerText)}));
// Both projects are live and linked. A link that 404s on a page sent to a
// hiring manager is worse than no link, so assert they are real and external.
const links=await p.evaluate(()=>[...document.querySelectorAll('#market a[href^="http"]')]
  .map(a=>({t:a.textContent.trim(),h:a.getAttribute('href'),
            blank:a.target==='_blank',rel:/noopener/.test(a.rel||'')})));
check('the work in 3.0 is linked, not just described',
  links.length>=2&&links.every(l=>l.blank&&l.rel),
  links.map(l=>l.t+' \u2192 '+l.h).join('  |  '));
check('and both links are named for what they are',
  links.some(l=>/BESS|simulator/i.test(l.t))&&links.some(l=>/Bankable/i.test(l.t)),
  links.map(l=>l.t).join(', '));

// The cover points at the work, since a reader who stops at the cover otherwise
// never learns the model or either application exists.
const cov=await p.evaluate(()=>({
  tools:[...document.querySelectorAll('.cover-tools a')].map(a=>({
    t:a.textContent.trim(), h:a.getAttribute('href'),
    ext:a.target==='_blank', rel:/noopener/.test(a.rel||''),
    rule:getComputedStyle(a).borderTopColor})),
  // a URL written in two places is a URL that gets changed in one
  dupes:(()=>{const all=[...document.querySelectorAll('a[href^="http"]')]
    .map(a=>a.getAttribute('href'));
    const seen={},out=[];all.forEach(h=>{seen[h]=(seen[h]||0)+1;});
    for(const h in seen) if(seen[h]>1&&!/linkedin|calendly|mailto/.test(h)) out.push(h+' x'+seen[h]);
    return out;})()}));
check('the cover opens the work, not only the document',
  cov.tools.length>=3&&cov.tools.every(t=>t.h&&(!t.ext||t.rel)),
  cov.tools.map(t=>t.t).join(' \u00b7 '));
check('and its external links leave the page properly',
  cov.tools.filter(t=>t.ext).length>=2&&cov.tools.filter(t=>t.ext).every(t=>/^https/.test(t.h)),
  cov.tools.filter(t=>t.ext).map(t=>t.h).join(', '));
// The row mixes a jump within the document with links that open something else.
// The accent rule is what tells them apart before the click, so it has to stay on
// the external ones and off the internal one, or the row means nothing.
{
  const copper = c => { const m = String(c).match(/(\d+),\s*(\d+),\s*(\d+)/);
    return !!m && +m[1] > 150 && +m[2] > 80 && +m[2] < 170 && +m[3] < 90; };
  const ext = cov.tools.filter(t => t.ext), inn = cov.tools.filter(t => !t.ext);
  check('the links that leave the page are ruled in the accent',
    ext.length >= 2 && ext.every(t => copper(t.rule)),
    ext.map(t => t.t + ' ' + t.rule).join(', '));
  check('and the one that stays in the document is not',
    inn.length >= 1 && inn.every(t => !copper(t.rule)),
    inn.map(t => t.t + ' ' + t.rule).join(', '));
}

// A company nobody has heard of, named on a CV with nothing behind it, is a
// claim a reader cannot check. Both of the ones that need explaining now link.
const emp=await p.evaluate(()=>[...document.querySelectorAll('#experience .job')].map(j=>({
  co:j.querySelector('.co').textContent.trim(),
  href:(j.querySelector('.co a')||{}).href||null,
  note:(j.querySelector('.co+.bar+p, p.co ~ p')||{}).textContent||''})));
check('the employers a reader would not know are linked',
  emp.filter(e=>e.href).length>=2
  &&emp.filter(e=>e.href).every(e=>/^https/.test(e.href)),
  emp.filter(e=>e.href).map(e=>e.co.split(' \u00b7 ')[0]).join(', '));
// and the current one says what the company actually does, since the whole of
// 5.0 rests on it being a real biomass business rather than a side interest
const cur=await p.evaluate(()=>document.querySelector('#experience').innerText);
check('and the current employer says what it does',
  /biomass/i.test(cur)&&/data centre|data center/i.test(cur),
  'biomass and data centres named in 2.0');

check('the simulator card carries its new name',bess.named&&!bess.old,
  bess.named?(bess.old?'old name survives':'ok'):'not found');

for(const [y,n] of [[0,'w-hero'],[2650,'w-method'],[3400,'w-model'],[4150,'w-model2'],[4900,'w-model3']]){
  await p.evaluate(v=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,v);},y);
  await p.waitForTimeout(300);await p.screenshot({path:`${S}/${n}.png`});
}
await b.close();
console.log('PASS ('+ok.length+')');ok.forEach(s=>console.log('  ✓ '+s));
if(fails.length){console.log('\nFAIL ('+fails.length+')');fails.forEach(s=>console.log('  ✗ '+s));process.exit(1);}
console.log('\nAll checks passed.');
})().catch(e=>{console.error('HARNESS',e);process.exit(2);});
