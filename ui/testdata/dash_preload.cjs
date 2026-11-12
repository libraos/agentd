// Before the first /api/dash snapshot arrives, nothing from another page shows.
// A reload on #issues used to show Insights' tabs (Metrics, Usage, History) beside
// the board's views control for as long as the snapshot took, since the tab row sat
// in <main> outside every page until Insights was first entered.
// Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_preload.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString();
const dash={user:'alice',role:'owner',now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{}};
let release=null;const held=new Promise(r=>{release=r});
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#issues',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url)=>{const u=new URL(url,w.location.href);let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  // The snapshot is held back until the test lets it through.
  if(u.pathname==='/api/dash'){await held;body=dash}
  else if(u.pathname==='/api/issues')body={issues:[]};
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<5;i++)await tick()};
// Shown: neither it nor an ancestor is hidden.
const shown=n=>{for(;n&&n.nodeType===1;n=n.parentElement)if(n.hidden)return false;return true};
// Everything in <main> that is shown and belongs to no page but Tasks' own (#page-work).
const strays=()=>[...doc.querySelectorAll('#main *')].filter(n=>shown(n)&&!n.closest('#page-work')).map(n=>n.id||n.className||n.tagName).filter((v,i,a)=>a.indexOf(v)===i);
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 const tabs=doc.getElementById('ins-tabs');assert(tabs,'no Insights tab row');
 assert(!shown(tabs),'the Insights tabs show on Tasks before the first snapshot');
 assert.deepEqual(strays(),[],'shown in <main> before the first snapshot, from another page');
 release();await settle();assert(!errors.length,errors.join('\n'));
 assert(!shown(tabs),'the Insights tabs show on Tasks after the snapshot');
 assert(!doc.getElementById('page-work').hidden,'Tasks is not shown once the snapshot arrived');
 // Insights still has its tabs, at the top of the view shown.
 for(const v of ['metrics','usage','history']){w.location.hash='#insights/'+v;await settle();
  assert(shown(tabs),'the tabs are hidden on '+v);assert(doc.getElementById('page-'+v).contains(tabs),'the tabs are not in '+v)}
 w.location.hash='#issues';await settle();assert(!shown(tabs),'the Insights tabs show on Tasks after a visit to Insights');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_preload ok');w.close();
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
