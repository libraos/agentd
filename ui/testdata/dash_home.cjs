// The landing page (libraos/agentd-core#850): Home groups the team's tasks into Working,
// Needs you, Blocked, Ready to review and Done (recent), each a count and a short list, from
// issueItems, the list Tasks draws, so the counts match Tasks' columns. Each row opens its task.
// Created by (people, and services or triggers by source) and project narrow every group and
// are the address (#home?by=...&project=...), so a reload keeps them. It is the default landing
// page, read only, the same for a viewer; in agentd app it is the Home page over the centre,
// from the snapshot it already has (no new route: it never asks for /api/issues), and a row opens
// the task's workspace. Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_home.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const html=fs.readFileSync(process.argv[2],'utf8');
const base={from:'s-ann',from_user:'ann',to:'any',project:'acme/app',source:'interactive',updated_ago:'1m',age:'1m',mine:true};
const open=[
 {...base,id:'hof-work',goal:'Fix login '+evil,state:'claimed',stage:'implement',claimer:'s-w1',worker:'codex',dispatched:true,attempts:[{tool:'codex',running:true}]},
 {...base,id:'hof-need',goal:'Worker waits on a prompt',state:'claimed',stage:'implement',claimer:'s-w2',worker:'claude',dispatched:true,worker_state:'blocked',from:'s-bob',from_user:'bob',project:'acme/site',mine:false},
 {...base,id:'hof-blk',goal:'Waits on the schema change',state:'blocked',blocked_by:['hof-work']},
 {...base,id:'hof-todo',goal:'Not started yet',state:'offered',from:'s-bob',from_user:'bob',mine:false},
 {...base,id:'hof-rev',goal:'Nightly review',state:'claimed',stage:'review',claimer:'s-w3',from:'',from_user:null,source:'trigger',mine:false}];
const done=[
 {...base,what:'handoff',ref:'hof-done',title:'Ship the docs',state:'done',project:'acme/site',age:'2h'},
 {...base,what:'handoff',ref:'hof-bdone',title:'Bob finished',state:'done',from:'s-bob',from_user:'bob',age:'3h',mine:false}];
const snap={user:'ann',role:'owner',now,team:true,handoff_list:open,done,sessions:[],left:[],unlinked:[],waiting:[],claims:[],messages:[],inbox:[],checkouts:[],counts:{},handoffs:{},host_states:{}};
const errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
function page(url,dash,hits){return new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url)=>{const u=new URL(url,w.location.href);hits.push(u.pathname);let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash();
  else if(u.pathname==='/api/issues')body={issues:[]};
  else if(u.pathname==='/api/team')body={roles:[],members:[],handoff_roles:{}};
  else if(u.pathname==='/api/chat')body={chats:[],roles:[],gateway_ready:false};
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}})}
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
const groupIds=(root,key)=>[...root.querySelectorAll('[data-home-group="'+key+'"] .home-row')].map(r=>r.dataset.homeRow);
const count=(root,key)=>root.querySelector('[data-home-count="'+key+'"]').textContent;
const pick=async(w,root,field,value)=>{const s=root.querySelector('select[data-home-filter="'+field+'"]');assert(s,'no '+field+' filter');assert([...s.options].some(o=>o.value===value),field+' filter lacks '+value+': '+[...s.options].map(o=>o.value));s.value=value;s.dispatchEvent(new w.Event('change',{bubbles:true}));await settle()};
const hashParams=w=>new URLSearchParams(w.location.hash.split('?')[1]||'');
(async()=>{
 // The server: Home is where a bare address lands.
 {const hits=[],dom=page('http://127.0.0.1:21620/',()=>snap,hits),w=dom.window,doc=w.document;await settle();assert(!errors.length,errors.join('\n'));
  assert(!doc.getElementById('page-home').hidden,'a bare address does not land on Home');assert.equal(doc.querySelector('.rail-item[aria-current="page"]').dataset.rail,'home');
  assert.equal(doc.querySelector('#page-title').textContent,'Home');
  const root=doc.getElementById('home-body');
  assert.deepEqual([...root.querySelectorAll('[data-home-group]')].map(g=>g.querySelector('h3').textContent),['Working','Needs you','Blocked','Ready to review','Done (recent)']);
  assert.deepEqual(groupIds(root,'working'),['hof-work']);assert.deepEqual(groupIds(root,'needs'),['hof-need']);assert.deepEqual(groupIds(root,'blocked'),['hof-blk']);
  assert.deepEqual(groupIds(root,'review'),['hof-rev']);assert.deepEqual(groupIds(root,'done').sort(),['hof-bdone','hof-done']);
  assert.equal(count(root,'done'),'2');assert.equal(root.querySelector('[data-home-todo]').dataset.homeTodo,'1','To do is not named under the groups');
  // The same list Tasks draws: its board columns hold the same tasks.
  {const m=w.eval("(()=>{const items=issueItems(lastDash,true).filter(i=>!i.folded);return {progress:items.filter(i=>i.status==='progress').length,review:items.filter(i=>i.status==='review').length}})()");
   assert.equal(String(m.progress),count(root,'working'));assert.equal(String(m.review),count(root,'review'))}
  // Each row opens its task; a title is text, never markup.
  const work=root.querySelector('[data-home-row="hof-work"] a.home-open');assert.equal(work.getAttribute('href'),'#issues/hof-work');
  assert(work.textContent.includes('Fix login')&&!root.querySelector('img'),'a title became markup');
  assert.equal(root.querySelector('[data-home-row="hof-done"] a.home-open').getAttribute('href'),'#issues/hof-done');
  assert(root.querySelector('[data-home-row="hof-rev"] [data-home-by="source:trigger"]'),'a trigger task does not say a trigger made it');
  // Created by: people and services; it narrows every group and is in the address.
  await pick(w,root,'by','person:bob');
  assert.equal(hashParams(w).get('by'),'person:bob','the creator filter is not in the address: '+w.location.hash);
  assert.deepEqual(groupIds(root,'working'),[]);assert.deepEqual(groupIds(root,'needs'),['hof-need']);assert.deepEqual(groupIds(root,'done'),['hof-bdone']);assert.equal(root.querySelector('[data-home-todo]').dataset.homeTodo,'1');
  assert(root.querySelector('[data-home-group="working"] .home-empty'),'an empty group says so');
  await pick(w,root,'by','source:trigger');assert.deepEqual(groupIds(root,'review'),['hof-rev']);assert.deepEqual(groupIds(root,'needs'),[]);
  // Project with a creator: both apply.
  await pick(w,root,'by','person:ann');await pick(w,root,'project','acme/site');
  assert.equal(hashParams(w).get('project'),'acme/site');assert.equal(hashParams(w).get('by'),'person:ann');
  assert.deepEqual(groupIds(root,'done'),['hof-done']);assert.deepEqual(groupIds(root,'working'),[]);assert.deepEqual(groupIds(root,'blocked'),[]);
  // Clear filters empties the address's query.
  root.querySelector('[data-home-clear]').click();await settle();assert.equal(w.location.hash,'#home');assert.deepEqual(groupIds(root,'working'),['hof-work']);
  // Home writes nothing.
  assert(!root.querySelector('[data-write],form'),'Home has an action');
  dom.window.close()}
 // A reload with filters in the address keeps them; a viewer sees the same page, read only.
 {const hits=[],viewer={...snap,role:'viewer'},dom=page('http://127.0.0.1:21620/#home?by=person%3Abob&project=acme%2Fapp',()=>viewer,hits),w=dom.window,doc=w.document;await settle();assert(!errors.length,errors.join('\n'));
  const root=doc.getElementById('home-body');assert.equal(root.querySelector('select[data-home-filter="by"]').value,'person:bob');assert.equal(root.querySelector('select[data-home-filter="project"]').value,'acme/app');
  assert.deepEqual(groupIds(root,'needs'),[],'bob\'s acme/site task shows under acme/app');assert.deepEqual(groupIds(root,'done'),['hof-bdone']);
  assert(root.querySelector('[data-home-row="hof-bdone"] a.home-open'),'a viewer cannot open a task');
  assert(!hits.includes('/api/action'),'Home acted: '+hits.join(','));
  dom.window.close()}
 // agentd app: Home over the centre from the same snapshot, no new route; a task row opens it.
 {const hits=[],app={...snap,mode:'app',watchdog:{running:true,start:'agentd install'},spend_today:{usd:0,workers:0,unpriced:0,pending:0}};
  const dom=page('http://127.0.0.1:21470/#home?by=person%3Aann',()=>app,hits),w=dom.window,doc=w.document;await settle();assert(!errors.length,errors.join('\n'));
  assert(doc.body.classList.contains('app-mode'),'not in app mode');
  const nav=doc.querySelector('#app-shell [data-app-nav="home"]');assert(nav,'the app has no Home');assert.equal(nav.getAttribute('aria-current'),'page','#home did not open the app\'s Home');
  const root=doc.getElementById('app-page');assert(root&&!root.hidden,'no Home page over the centre');
  assert.equal(root.querySelector('select[data-home-filter="by"]').value,'person:ann');
  assert.deepEqual(groupIds(root,'working'),['hof-work']);assert.deepEqual(groupIds(root,'needs'),[]);
  await pick(w,root,'by','');assert.equal(w.location.hash,'#home');assert.deepEqual(groupIds(root,'needs'),['hof-need']);
  await pick(w,root,'project','acme/site');assert.equal(hashParams(w).get('project'),'acme/site');assert.deepEqual(groupIds(root,'done'),['hof-done']);
  assert(!hits.includes('/api/issues'),'app Home asked for /api/issues, which agentd app does not serve: '+hits.join(','));
  // Another person's task opens read only in the workspace.
  root.querySelector('[data-home-row="hof-need"] .home-open').click();await settle();
  assert.equal(doc.getElementById('app-shell').dataset.task,'hof-need','the row did not open its task');assert(doc.getElementById('app-shell').hasAttribute('data-readonly'),'another person\'s task is not read only');
  assert(root.hidden,'Home stays over the open task');
  dom.window.close()}
 assert(!errors.length,errors.join('\n'));
 console.log('dash_home: ok');
})().catch(e=>{console.error(e);process.exit(1)});
