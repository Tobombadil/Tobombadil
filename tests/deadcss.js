const {chromium}=require('playwright');
(async()=>{const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1180,height:900}});
await p.goto(('file://'+require('path').join(__dirname,'..','index.html')));await p.waitForTimeout(900);
const r=await p.evaluate(async()=>{
 // open every pane and every input group so nothing hides from the audit
 for(const t of document.querySelectorAll('.otab')){t.click();await new Promise(r=>setTimeout(r,120));}
 document.querySelectorAll('.opane').forEach(x=>x.hidden=false);
 document.querySelectorAll('.igrp').forEach(g=>g.dataset.open='1');
 const used=new Set();
 document.querySelectorAll('*').forEach(e=>(e.className||'').toString().split(/\s+/).forEach(c=>c&&used.add(c)));
 const SHEET=()=>[...[...document.styleSheets].find(s=>s.ownerNode&&s.ownerNode.tagName==='STYLE').cssRules];
 const css=SHEET().flatMap(function f(r){
   return r.cssRules?[...r.cssRules].flatMap(f):(r.selectorText?[r.selectorText]:[]);});
 const declared=new Set();
 css.forEach(s=>(s.match(/\.[A-Za-z][\w-]*/g)||[]).forEach(c=>declared.add(c.slice(1))));
 const dead=[...declared].filter(c=>!used.has(c)).sort();
 // tokens
 const root=SHEET().find(r=>r.selectorText===':root');
 const toks=[...root.style].filter(x=>x.startsWith('--'));
 const all=[...document.querySelectorAll('style')].map(s=>s.textContent).join('')
   + [...document.querySelectorAll('script')].map(s=>s.textContent).join('');
 const deadTok=toks.filter(t=>(all.split('var('+t).length-1)===0);
 return {dead,deadTok};});
console.log('dead classes:',r.dead.length?r.dead.join(' '):'none');
console.log('dead tokens: ',r.deadTok.length?r.deadTok.join(' '):'none');
await br.close();})();
