const { chromium } = require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:1280,height:1000}});
await p.goto(('file://'+require('path').join(__dirname,'..','index.html')));await p.waitForTimeout(1600);
const r=await p.evaluate(()=>{
  // ---- every cell the page actually reaches, formulas included ----
  const touched=new Set();
  const realRead=readCell;
  // walk every sheet cell and record which are reachable from displayed figures
  const displayed=new Set([...document.querySelectorAll('[data-cell]')].map(e=>e.dataset.cell));
  const deps=(sheet,ref,seen)=>{
    const k=sheet+'!'+ref; if(seen.has(k))return; seen.add(k); touched.add(k);
    const raw=rawOf(sheet,ref);
    if(typeof raw!=='string'||raw[0]!=='=')return;
    const re=/(?:([A-Za-z][A-Za-z0-9_]*)!)?\$?([A-Z]{1,2})\$?(\d{1,4})(?::\$?([A-Z]{1,2})\$?(\d{1,4}))?/g;
    let m;
    while((m=re.exec(raw))){
      const sh=m[1]||sheet;
      if(!SHEET_BY_NAME[sh])continue;
      if(m[4]){ // a range
        const c1=m[2].charCodeAt(0),c2=m[4].charCodeAt(0);
        for(let c=c1;c<=c2;c++) for(let rw=+m[3];rw<=+m[5];rw++)
          if(SHEET_BY_NAME[sh].cells[String.fromCharCode(c)+rw]) deps(sh,String.fromCharCode(c)+rw,seen);
      } else if(SHEET_BY_NAME[sh].cells[m[2]+m[3]]) deps(sh,m[2]+m[3],seen);
    }
  };
  const seen=new Set();
  displayed.forEach(k=>{const [s,r]=k.split('!');deps(s,r,seen);});
  // model roots the page computes but does not render as data-cell
  ['Model!C61','Model!C51','Model!C63','Model!C55','Model!C56','Model!C57','Model!C58','Model!C59','Model!C60']
    .forEach(k=>{const [s,r]=k.split('!');deps(s,r,seen);});
  [...document.querySelectorAll('input[data-bind],select[data-bind]')]
    .forEach(e=>{const [s,r]=e.dataset.bind.split('!');deps(s,r,seen);});
  const all=[]; SHEETS.forEach(sh=>Object.keys(sh.cells).forEach(rf=>all.push(sh.name+'!'+rf)));
  const orphan=all.filter(k=>!touched.has(k));

  // ---- formats actually used ----
  const fmts=new Set(); SHEETS.forEach(sh=>Object.values(sh.cells).forEach(c=>c.f&&fmts.add(c.f)));
  document.querySelectorAll('[data-cell][data-f]').forEach(e=>fmts.add(e.dataset.f));

  // ---- engine functions never called by any formula ----
  const src=[...document.scripts].map(s=>s.textContent).join('\n');
  const formulas=[]; SHEETS.forEach(sh=>Object.values(sh.cells).forEach(c=>{
    if(typeof c.v==='string'&&c.v[0]==='=')formulas.push(c.v);}));
  const body=formulas.join(' ');
  const fnNames=Object.keys(FN);
  const unusedFns=fnNames.filter(f=>!new RegExp('\\b'+f+'\\(').test(body));

  // ---- CSS classes defined but never present in the DOM ----
  const used=new Set();
  document.querySelectorAll('*').forEach(e=>e.classList.forEach(c=>used.add(c)));
  const css=[...document.styleSheets].filter(s=>!s.href)
    .flatMap(s=>{try{return [...s.cssRules]}catch(e){return []}})
    .flatMap(r=>r.cssRules?[...r.cssRules]:[r])
    .map(r=>r.selectorText||'').join(',');
  const declared=new Set((css.match(/\.[A-Za-z][\w-]*/g)||[]).map(s=>s.slice(1)));
  const deadClasses=[...declared].filter(c=>!used.has(c));

  // ---- custom properties never referenced ----
  const root=[...document.styleSheets].filter(s=>!s.href)
    .flatMap(s=>{try{return [...s.cssRules]}catch(e){return []}})
    .filter(r=>r.selectorText===':root').map(r=>r.style.cssText).join(' ');
  const tokens=(root.match(/--[\w-]+/g)||[]);
  const allCss=[...document.styleSheets].filter(s=>!s.href)
    .flatMap(s=>{try{return [...s.cssRules]}catch(e){return []}})
    .map(r=>r.cssText).join('\n');
  const deadTokens=tokens.filter(t=>!new RegExp('var\\('+t+'\\)').test(allCss));

  return {orphan,fmts:[...fmts],unusedFns,deadClasses,deadTokens,
    cellsTotal:all.length};
});
console.log('orphan cells ('+r.orphan.length+' of '+r.cellsTotal+'):\n ',r.orphan.join(' '));
console.log('\nformats in use:',r.fmts.join(' '));
console.log('engine functions no formula calls:',r.unusedFns.join(' ')||'none');
console.log('\nCSS classes declared but absent from the DOM:\n ',r.deadClasses.join(' '));
console.log('\ntokens declared but never referenced:',r.deadTokens.join(' ')||'none');
await b.close();})();
