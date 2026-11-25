// The landing page (libraos/core#850; on the team server an alias of Overview since #907 step 4): Home groups tasks into Working, Needs attention,
// Waiting on another task, Review and validation and Closed recently, each a count and a short list, from
// issueItems, the list Tasks draws, so the counts match Tasks' columns. Each row opens its task.
// Created by (people, and services or triggers by source) and project narrow every group and
// are the address (#home?by=...&project=...), so a reload keeps them. It is at #home (a bare address
// lands on Overview since #907), read only, the same for a viewer; in agentd app it is the Home page over the centre,
// from the snapshot it already has (no new route: it never asks for /api/issues), and a row opens
// the task's workspace. The personal Home starts at Created by: Me (the signed-in person; Anyone is by=anyone in
// the address), its Needs attention group reads Needs you then, and no label says "(team)" (review M3).
// Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_home.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const html=fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8');
const base={from:'s-ann',from_user:'ann',to:'any',project:'acme/app',source:'interactive',updated_ago:'1m',age:'1m',mine:true};
const open=[
 {...base,id:'hof-work',goal:'Fix login '+evil,state:'claimed',mark:'working',stage:'implement',claimer:'s-w1',worker:'codex',dispatched:true,attempts:[{tool:'codex',running:true}]},
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
 // The team server: #home is an alias of Overview (#907 step 4), the address kept as typed (agentd app
 // reads #home?... itself), under Overview in the rail; no Home rail item is left. Home's groups and
 // filters are agentd app's now, tested below; the server's worker nodes are on Overview's Agents card.
 {const hits=[],dom=page('http://127.0.0.1:21620/#home?by=person%3Abob',()=>snap,hits),w=dom.window,doc=w.document;await settle();assert(!errors.length,errors.join('\n'));
  assert(!doc.getElementById('page-overview').hidden,'#home does not open Overview');assert(doc.getElementById('page-home').hidden,'the server still shows its Home');
  assert.equal(doc.querySelector('.rail-item[aria-current="page"]').dataset.rail,'overview');assert(!doc.querySelector('.rail-item[data-rail="home"]'),'Home is still a rail item');
  assert.equal(doc.querySelector('#page-title').textContent,'Overview');assert(w.location.hash.startsWith('#home'),'the address was rewritten: '+w.location.hash);
  assert(!doc.querySelector('#home-body [data-home-group]'),'the server drew Home\'s groups');
  dom.window.close()}
 // agentd app: Home over the centre from the same snapshot, no new route; a task row opens it.
 {const hits=[],app={...snap,mode:'app',watchdog:{running:true,start:'agentd install'},spend_today:{usd:0,workers:0,unpriced:0,pending:0}};
  const dom=page('http://127.0.0.1:21470/#home?by=person%3Aann',()=>app,hits),w=dom.window,doc=w.document;await settle();assert(!errors.length,errors.join('\n'));
  assert(doc.body.classList.contains('app-mode'),'not in app mode');
  const nav=doc.querySelector('#app-shell [data-app-nav="home"]');assert(nav,'the app has no Home');assert.equal(nav.getAttribute('aria-current'),'page','#home did not open the app\'s Home');
  const root=doc.getElementById('app-page');assert(root&&!root.hidden,'no Home page over the centre');
  const bySel=()=>root.querySelector('select[data-home-filter="by"]'),needsHead=()=>root.querySelector('#home-h-needs-app').textContent;
  assert.equal(bySel().value,'person:ann');assert.equal(bySel().selectedOptions[0].textContent,'Me','the signed-in person is not Me');
  assert(![...bySel().querySelectorAll('optgroup option')].some(o=>o.value==='person:ann'),'Me is listed twice');
  assert.deepEqual(groupIds(root,'working'),['hof-work']);assert.deepEqual(groupIds(root,'needs'),[]);assert.equal(needsHead(),'Needs you');
  assert(!/\(team\)/.test(root.textContent),'the personal Home still says (team)');assert(!root.querySelector('[data-home-clear]'),'Me is the default, not a filter to clear');
  await pick(w,root,'by','');assert.equal(w.location.hash,'#home?by=anyone');assert.deepEqual(groupIds(root,'needs'),['hof-need']);assert.equal(needsHead(),'Needs attention');
  // Each row's state is the task's mark in its own fixed column, the word the sidebar and Tasks use.
  const chip=root.querySelector('[data-home-row="hof-work"] .home-chip');assert(chip&&chip.querySelector('[data-mark="working"]')&&/Working/.test(chip.textContent),'the row lacks its mark: '+(chip&&chip.textContent));
  const dot=doc.querySelector('#app-projects [data-task-id="hof-work"] .app-dot');assert.equal(dot.getAttribute('aria-label'),'Working','the sidebar says another word');
  root.querySelector('[data-home-clear]').click();await settle();assert.equal(w.location.hash,'#home','Clear filters does not go back to Me');assert.equal(bySel().value,'person:ann');
  await pick(w,root,'by','');
  await pick(w,root,'project','acme/site');assert.equal(hashParams(w).get('project'),'acme/site');assert.deepEqual(groupIds(root,'done'),['hof-done']);
  assert(!hits.includes('/api/issues'),'app Home asked for /api/issues, which agentd app does not serve: '+hits.join(','));
  // Another person's task opens read only in the workspace.
  root.querySelector('[data-home-row="hof-need"] .home-open').click();await settle();
  assert.equal(doc.getElementById('app-shell').dataset.task,'hof-need','the row did not open its task');assert(doc.getElementById('app-shell').hasAttribute('data-readonly'),'another person\'s task is not read only');
  assert(root.hidden,'Home stays over the open task');
  dom.window.close()}
 // A bare #home is Me; with no person (the shared token) there is no Me and it is Anyone.
 for(const [user,want] of [['ann','person:ann'],[undefined,'']]){const app={...snap,user,mode:'app',watchdog:{running:true,start:'agentd install'},spend_today:{usd:0,workers:0,unpriced:0,pending:0}};
  const dom=page('http://127.0.0.1:21470/#home',()=>app,[]),w=dom.window,doc=w.document;await settle();assert(!errors.length,errors.join('\n'));
  const root=doc.getElementById('app-page'),sel=root.querySelector('select[data-home-filter="by"]');assert.equal(sel.value,want,'the default creator for '+user);
  assert.equal(!!sel.querySelector('option[value="person:ann"]')&&sel.querySelector('option[value="person:ann"]').textContent==='Me',!!user);
  assert.deepEqual(groupIds(root,'needs'),user?[]:['hof-need']);assert.equal(w.location.hash,'#home');dom.window.close()}
 assert(!errors.length,errors.join('\n'));
 console.log('dash_home: ok');
})().catch(e=>{console.error(e);process.exit(1)});
