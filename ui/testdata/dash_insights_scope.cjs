// Insights' Whose work filter says what it applies to (libraos/agentd-core#904 item 2).
// The filter sits beside the cards it narrows (the factory overview on Metrics, the
// Usage numbers, the History rows), is part of every Insights address (a shared or
// reloaded link keeps it, the tabs and a week's outcome link carry it), and the PR
// cards, which read the PR ledger, say they are not filtered by host. With no PR rows
// for the period they say "No PRs recorded for this period" and link to repository
// sync settings, not a zero.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_insights_scope.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString();
const rate={not_enough_data:true,n:0,of:0,coverage:{decided:0,all:0},rule:'Fixture rule'},lat={n:0},exec={not_enough_data:true,n:0,of:0,running:0,rule:'Fixture rule'};
let merged=0;
const metrics=()=>({tasks:{all:3,accepted:1,failed:1,undecided:1},outcomes:{autonomous_task_success_rate:rate,first_pass_acceptance_rate:rate,human_execution_intervention_rate:rate,cost_per_accepted_task:rate},
  workflow:{latency:{open_to_merge:merged?{n:merged,median_hours:2}:lat,open_to_first_review:lat,first_review_to_merge:lat},task_execution_time:exec},reference:{ai_only_commit_rate:rate,infra_failure_rate:rate},cost:{},coverage:{covered:true},merged,
  chart:merged?{unit:'day',opened:merged,points:[{start:'2026-11-17',opened:merged,merged}]}:{unit:'day',opened:0,points:[]}});
const factory={factory:1,since:'2026-10-15T09:00:00Z',until:'2026-10-29T09:00:00Z',handoffs:2,
  total:{handoffs:2,dispatched:2,autonomous_completion:{n:1,of:2,pct:50},cost_per_accepted:{median_usd:1},interventions:{with_any:0,of:2,mean:0},outcomes:{accepted:1,failed:1}},
  by_week:[{week:'2026-10-15',since:'2026-10-15T09:00:00Z',until:'2026-10-22T09:00:00Z',outcomes:{accepted:1,failed:1}}],by_tool:[],by_stage:[],failure_classes:{attempts:0,classes:[]},by_agent_model:[],load:{max_workers:2,peak_workers:0,days:[],averages:{}}};
const requests=[];
const dash={user:'alice',role:'owner',now,team:true,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{}};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21620/#insights/metrics?range=30d&scope=hosts',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);requests.push((opts.method||'GET')+' '+u.pathname+u.search);let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/issues')body={issues:[]};
  else if(u.pathname==='/api/metrics')body=metrics();
  else if(u.pathname==='/api/bench')body={rounds:[]};
  else if(u.pathname==='/api/factory')body=factory;
  else if(u.pathname==='/api/usage')body={totals:{workers:0}};
  else if(u.pathname==='/api/insights')body={since:'2026-11-11T00:00:00Z',until:'2026-11-18T00:00:00Z',scope:u.searchParams.get('scope')||'all',handoffs:0,total:{handoffs:0,coverage:{attempts:0}},by_person:[],by_model:[],by_project:[],rules:{}};
  else if(u.pathname==='/api/history')body={rows:[],total:0,groups:0,next:null,limit:50,facets:{states:[],sources:[],creators:[]}};
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()},route=async h=>{w.location.hash=h;await settle()};
const last=p=>{const r=requests.filter(x=>x.startsWith('GET '+p+'?')).pop();return r?new URL('http://x'+r.slice(4)).searchParams:null};
const hashParams=()=>new URLSearchParams(w.location.hash.split('?')[1]||'');
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // A link with a scope opens with it, and the factory report is read for it; the PR metrics never are.
 const sel=doc.getElementById('ins-scope');assert.equal(sel.value,'hosts','the scope in the link was dropped');
 assert.equal(last('/api/factory').get('scope'),'hosts','factory read without the link\'s scope');
 assert(!last('/api/metrics').has('scope'),'PR metrics were sent a scope they ignore');
 // The filter sits beside the cards it narrows, not in the tab row that heads the PR cards too.
 const overview=doc.getElementById('ins-overview');assert(overview.contains(sel),'Whose work is not beside the factory cards');
 assert(!doc.getElementById('ins-tabs').parentElement.querySelector(':scope > #ins-scope'),'Whose work still sits in the tab row');
 const box=sel.closest('[data-scope-box]');assert(box&&/Whose work/.test(box.textContent),'Whose work has no label');
 // PR cards say they read the PR ledger, not filtered by host.
 assert(/PR ledger · not filtered by host/.test(doc.getElementById('metrics').textContent),'PR metrics are not labelled');
 const latency=doc.querySelector('#ins-cards [data-card="latency"]');assert(/PR ledger · not filtered by host/.test(latency.textContent),'the PR latency card is not labelled: '+latency.textContent);
 // No PR rows: says so, links to sync settings, and no zero count.
 const body=doc.getElementById('metrics').textContent;assert(/No PRs recorded for this period/.test(body),'empty PR data does not say No PRs recorded: '+body.slice(0,300));
 const link=doc.querySelector('#metrics a[href^="#settings/"]');assert(link,'no link to repository sync settings');
 assert.notEqual(doc.getElementById('n-metrics').textContent,'0','an empty PR ledger reads as zero');
 assert(/No PRs recorded for this period/.test(latency.textContent),'the latency card does not say no PRs recorded: '+latency.textContent);
 // A week's outcome link and the tabs carry the scope.
 const seg=doc.querySelector('#ins-weeks .ins-seg');assert(seg,'no outcome link');assert.equal(new URLSearchParams(seg.getAttribute('href').split('?')[1]).get('scope'),'hosts','the outcome link drops the scope');
 for(const a of doc.querySelectorAll('#ins-tabs a'))assert.equal(new URLSearchParams((a.getAttribute('href').split('?')[1])||'').get('scope'),'hosts','the '+a.dataset.tab+' tab drops the scope');
 // Changing it puts it in the address.
 sel.value='server';sel.dispatchEvent(new w.Event('change'));await settle();
 assert.equal(hashParams().get('scope'),'server','the scope is not in the address: '+w.location.hash);assert.equal(last('/api/factory').get('scope'),'server');
 // Worker usage, Usage and History read it from the address and hold the filter beside their own numbers.
 await route('#insights/workers?range=30d&scope=hosts');assert.equal(sel.value,'hosts');assert.equal(last('/api/usage').get('scope'),'hosts','worker usage without the link\'s scope');
 assert(doc.getElementById('page-workers').contains(sel),'Whose work is not on Worker usage');
 await route('#insights/usage?range=7d&scope=server');assert.equal(sel.value,'server');assert.equal(last('/api/insights').get('scope'),'server','insights without the link\'s scope');assert.equal(last('/api/insights').get('since'),'7d');
 assert(doc.getElementById('ix-bar').contains(sel),'Whose work is not in Usage\'s control row');
 await route('#insights/history?scope=server');assert.equal(sel.value,'server');assert.equal(last('/api/history').get('scope'),'server','history without the link\'s scope');
 assert(doc.getElementById('page-history').contains(sel),'Whose work is not on History');
 // All work drops it from the address.
 sel.value='';sel.dispatchEvent(new w.Event('change'));await settle();assert(!hashParams().has('scope'),'All work kept a scope in the address');
 // With PRs, the count is back and the empty note gone.
 merged=3;await route('#insights/metrics?range=7d');await settle();
 assert.equal(doc.getElementById('n-metrics').textContent,'3');assert(!/No PRs recorded/.test(doc.getElementById('metrics').textContent),'No PRs recorded with PRs');
 assert(!requests.some(r=>!r.startsWith('GET ')&&!r.includes('/api/auth')),'Insights wrote: '+requests.filter(r=>!r.startsWith('GET ')));
 assert(!errors.length,errors.join('\n'));
 console.log('dash_insights_scope: ok');w.close()})().catch(e=>{console.error(e);process.exit(1)});
