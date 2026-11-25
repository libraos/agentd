// The personal app review's M3 and M4 (refresh item 4).
// M3  one task-state vocabulary: the same task reads the same state word on the server's Tasks page (its card's mark),
//     in agentd app's sidebar (the row's second line and its dot), on Home (the row's chip) and at /panel (the row's
//     state), whatever the view: a running worker with no session yet reads Working, never "worker starting" or
//     "In progress"; a task waiting on another reads Waiting; one nobody asked a worker for, Not started; a finished
//     one Done, a failed one Failed. The words are region:marks' six, and nothing else draws its own.
// M4  a done or failed task opens with a result strip at the top of the centre, over every tab (so on a phone it is
//     visible without opening a drawer): the verdict (the mark word, why it failed), the check with its test count,
//     the branch, the cost, Push and open a draft PR (through the existing confirm sheet: nothing is posted until it is
//     confirmed, and there is no other way to push or merge) and Start again (the existing Start a new worker sheet,
//     only where the server offers retry) or Follow up (the Session's box, #670). A running task has no strip; another
//     person's task has one with no actions; when /api/checks, /api/taskdetail and /api/review cannot be read the
//     strip still shows the verdict and the snapshot's check state, and offers no push it cannot check.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_appresult.cjs dash.html
'use strict';
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',theme=process.env.DASH_UI_THEME||'light',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const html=fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8');
const base={from:'s-alice',from_user:'alice',mine:true,to:'any',project:'acme/demo-repo',source:'interactive',stage:'implement',updated_ago:'2m',age:'2m'};
// One task per state, as /api/dash sends them: open ones with the server's mark, finished ones in done (keyed by ref).
const open=[
 // A dispatched worker whose run started, with no session yet: the sidebar once said "worker starting".
 {...base,id:'hof-run',goal:'Rework the login client '+evil,state:'offered',worker:'claude',worker_tool:'claude',dispatched:now,attempts:[{tool:'claude',running:true,usd_so_far:0.4}],worker_running:true,mark:'working',branch:'agentd/hof-run',check_state:'not_run'},
 {...base,id:'hof-blk',goal:'Waits on the schema change',state:'blocked',blocked_by:['hof-run'],mark:'waiting',check_state:'none'},
 {...base,id:'hof-new',goal:'Not asked for a worker yet',state:'offered',mark:'not_started',check_state:'none'},
 // Its last worker failed and the server offers Start again (retry).
 {...base,id:'hof-bad',goal:'Fix the flaky upload test',state:'offered',worker:'codex',worker_tool:'codex',dispatched:now,mark:'failed',branch:'agentd/hof-bad',check_state:'failed',check:'go test ./...',
  attempts:[{tool:'codex',end_reason:'done',check:'failed: TestUpload',usd:0.8,minutes:6}],retry:{tool:'codex',cwd:'/r/demo',budget:'30m',may:true},cancel:{may:true,cli:'agentd handoff done hof-bad --cancel --reason R'}}];
const done=[
 {...base,what:'handoff',ref:'hof-ok',title:'Ship the docs '+evil,state:'done',worker:'claude',mark:'done',branch:'agentd/hof-ok',check_state:'passed',result:'claude · done · 14 min · $1.25 · check passed'},
 {...base,what:'handoff',ref:'hof-fail',title:'Speed up the build',state:'done',worker:'codex',mark:'failed',failed:true,branch:'agentd/hof-fail',check_state:'timed_out'},
 {...base,what:'handoff',ref:'hof-bobs',title:'Bob’s finished task',state:'done',worker:'claude',mark:'done',from:'s-bob',from_user:'bob',mine:false,branch:'agentd/hof-bobs',check_state:'passed'}];
const WORDS={'hof-run':'Working','hof-blk':'Waiting','hof-new':'Not started','hof-bad':'Failed','hof-ok':'Done','hof-fail':'Failed'};
const snap=o=>({user:'alice',role:'owner',now,team:false,handoff_list:open,done,sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:['/r/demo'],dispatch:true,terminal:true,...o});
const appSnap=()=>snap({mode:'app',watchdog:{running:true,start:'agentd install'},spend_today:{usd:2.05,workers:2,unpriced:0,pending:0}});
const checks=id=>id==='hof-ok'?{handoff:id,check:'go test ./...',runs:[{result:'passed',actor:'w-ok',at:now,tests:'12 tests',wall_s:40}]}:id==='hof-bad'?{handoff:id,check:'go test ./...',runs:[{result:'failed',actor:'w-bad',at:now,tests:'30 tests',failure:'TestUpload'}]}:{handoff:id,check:'',runs:[],none:'This task has no check.'};
const detail=id=>({handoff:id,tool:'claude',branch:'agentd/'+id,cost:{usd:id==='hof-ok'?1.25:0.8,minutes:id==='hof-ok'?14:6},budget:{none:'No budget.'},delivery:{outcome:id==='hof-ok'?'accepted':'open',reason:'Its check passed.'}});
const review=id=>({handoff:id,enabled:true,may:true,branch:'agentd/'+id,base_branch:'main',head:'abc1234',repo:'acme/demo-repo',title:'Ship the docs',body:'Body',added:3,deleted:1,files:[{path:'docs/a.md',added:3,deleted:1,diff:'+x'}]});
function load(path,dash,o={}){const errors=[],posts=[],hits={},vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
 const dom=new JSDOM(html,{url:'http://127.0.0.1:21470'+path,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',theme);
  w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
  w.WebSocket=class{constructor(){this.readyState=0}send(){}close(){this.readyState=3}};w.Notification=undefined;
  w.fetch=async(url,opt)=>{const u=new URL(url,w.location.href),id=u.searchParams.get('id')||u.searchParams.get('ref')||u.searchParams.get('handoff');hits[u.pathname]=(hits[u.pathname]||0)+1;let body={},status=200;
   if(u.pathname==='/api/auth')return {ok:true,status:204};
   if(u.pathname==='/api/action'){posts.push(JSON.parse(opt.body));body={ok:true,ref:'acme/demo-repo#9'}}
   else if(u.pathname==='/api/dash')body=dash;
   else if(o.broken&&['/api/checks','/api/taskdetail','/api/review'].includes(u.pathname))status=500;
   else if(u.pathname==='/api/checks')body=checks(id);
   else if(u.pathname==='/api/taskdetail')body=detail(id);
   else if(u.pathname==='/api/review')body=review(id);
   else if(u.pathname==='/api/taskmsg')body=id==='hof-fail'?{may:true,live:false,followup:true,followup_note:'A message starts a worker again on the task’s branch.'}:{may:true,live:!/^hof-(ok|bobs)$/.test(id),gone:'The task is done.'};
   else if(u.pathname==='/api/workitem')body={tree:[{id,log:[]}]};else if(u.pathname==='/api/session')body={turns:[]};
   else if(u.pathname==='/api/files')body={files:[]};else if(u.pathname==='/api/log')body={lines:[],running:false};else if(u.pathname==='/api/issues')body={issues:[]};
   return {ok:status<300,status,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>status>=300?'server error':JSON.stringify(body)}}}});
 const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<8;i++)await tick()};
 return {dom,w,doc,errors,posts,hits,settle,q:(s,n)=>(n||doc).querySelector(s),qa:(s,n)=>[...(n||doc).querySelectorAll(s)],click:n=>{assert(n,'nothing to click');n.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}))}}}
const first=t=>String(t||'').split(' · ')[0].trim();
// A mark's word without its glyph (aria-hidden), as a screen reader reads it.
const said=n=>{const c=n.cloneNode(true);c.querySelectorAll('[aria-hidden="true"]').forEach(x=>x.remove());return c.textContent.trim()};
(async()=>{
 // M3: the server's Tasks page, the card's state word.
 {const {dom,doc,errors,settle,qa}=load('/#issues?view=all&layout=list',snap());await settle();assert(!errors.length,errors.join('\n'));
  for(const [id,want] of Object.entries(WORDS)){const card=doc.querySelector('#board [data-ref="'+id+'"]');assert(card,'no Tasks card for '+id);
   const m=card.querySelector('.ktop .tmark,.ktop .status');assert(m,'no state on '+id);assert.equal(said(m),want,'Tasks says another word for '+id)}
  assert(!qa('#board .ktop').some(n=>/In progress|worker starting|Needs attention/.test(n.textContent)),'Tasks still says an old word');dom.window.close()}
 // M3: agentd app's sidebar (dot and second line) and Home (chip), for each task.
 {const {dom,w,doc,errors,settle,q}=load('/#home?by=anyone',appSnap());await settle();assert(!errors.length,errors.join('\n'));assert(doc.body.classList.contains('app-mode'),'not in app mode');
  for(const [id,want] of Object.entries(WORDS)){const row=q('#app-projects .app-task[data-task-id="'+id+'"]');assert(row,'no sidebar row for '+id);
   assert.equal(q('.app-dot',row).getAttribute('aria-label'),want,'the sidebar dot of '+id);assert.equal(first(q('.app-tmeta',row).textContent),want,'the sidebar line of '+id+': '+q('.app-tmeta',row).textContent)}
  assert(!/worker starting|In progress/.test(q('#app-projects').textContent),'the sidebar still says an old word');
  const page=doc.getElementById('app-page');assert(page&&!page.hidden,'Home is not open');
  for(const [id,want] of Object.entries(WORDS)){const chip=q('[data-home-row="'+id+'"] .home-chip',page);if(!chip)continue;assert.equal(said(chip),want,'Home says another word for '+id)}
  for(const id of ['hof-run','hof-bad','hof-ok','hof-blk'])assert(q('[data-home-row="'+id+'"] .home-chip',page),'Home lacks '+id+': '+[...page.querySelectorAll('[data-home-row]')].map(n=>n.dataset.homeRow+'='+said(n.querySelector('.home-chip'))).join(', '));
  assert(!/In progress|\(team\)/.test(page.textContent),'Home still says an old word');dom.window.close()}
 // M3: /panel, the row's state.
 {const {dom,doc,errors,settle,q}=load('/panel',appSnap(),{});await settle();assert(!errors.length,errors.join('\n'));
  const sel=doc.getElementById('ap-project');if(sel&&!sel.hidden&&sel.value!=='*'){sel.value='*';sel.dispatchEvent(new dom.window.Event('change'));await settle()}
  for(const [id,want] of Object.entries(WORDS)){const row=q('#ap-list .ap-row[data-ap-open="'+id+'"]');assert(row,'no panel row for '+id);
   assert.equal(first(q('.ap-rmeta>span',row).textContent),want,'the panel says another word for '+id);assert.equal(q('.app-dot',row).getAttribute('aria-label'),want)}
  dom.window.close()}

 // M4: a done task opens with its result strip at the top of the centre.
 {const {dom,w,doc,errors,posts,settle,q,qa,click}=load('/',appSnap());await settle();assert(!errors.length,errors.join('\n'));
  const strip=()=>doc.getElementById('app-result');
  assert(strip().hidden,'a strip shows with no task open');
  w.appTaskOpen('hof-run');await settle();assert(strip().hidden,'a running task has a result strip');
  w.appTaskOpen('hof-ok');await settle();const s=strip();
  assert(!s.hidden,'a done task has no result strip');assert.equal(s.dataset.mark,'done');
  // It is in the centre, above the tab body, never in the right sidebar drawer: a phone sees it as the task opens.
  assert(doc.getElementById('app-center').contains(s)&&!doc.getElementById('app-right').contains(s),'the strip is not in the centre');
  assert(s.compareDocumentPosition(doc.getElementById('app-tab-body'))&w.Node.DOCUMENT_POSITION_FOLLOWING,'the strip is not above the tabs\' body');
  if(phone)assert(!doc.body.classList.contains('app-right-open'),'a drawer had to open');
  assert.notEqual(w.getComputedStyle(s).display,'none','the strip is hidden by its style');
  const v=q('[data-k="verdict"]',s);assert(v&&q('.tmark[data-mark="done"]',v)&&/Done/.test(v.textContent),'verdict: '+(v&&v.textContent));assert(/Delivered/.test(v.textContent),'no delivery verdict: '+v.textContent);
  assert.equal(q('[data-k="check"] dd',s).textContent,'Check passed · 12 tests');assert.equal(q('[data-k="branch"] dd',s).textContent,'agentd/hof-ok');assert.equal(q('[data-k="cost"] dd',s).textContent,'$1.25 · 14 min');
  assert(!q('img',s),'text went in as markup');
  // The same task reads the same word in the strip as in the sidebar.
  assert.equal(said(q('.tmark',v)),q('#app-projects .app-task[data-task-id="hof-ok"] .app-dot').getAttribute('aria-label'));
  // It stays over every tab: Log too.
  click(q('#app-center [data-app-action="new-tab"]'));await settle();click(qa('.app-menu .app-mitem').find(b=>b.dataset.act==='log'));await settle();assert(!strip().hidden&&strip().dataset.hid==='hof-ok','the strip went with the tab');
  // Push and open a draft PR goes through the existing confirm sheet; nothing is posted until it is confirmed.
  const push=q('[data-act="open_pr"]',s);assert(push&&/Push and open a draft PR/.test(push.textContent),'no Push and open a draft PR');
  assert(!qa('button,a',s).some(b=>/merge/i.test(b.textContent)),'the strip offers a merge');
  click(push);await settle();let dialog=q('dialog.sheet[open]');assert(dialog&&/Open a draft pull request\?/.test(dialog.textContent),'the confirm sheet did not open');assert.equal(posts.length,0,'a push was posted before confirming');
  assert(/Nothing is merged/.test(dialog.textContent));
  dialog.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settle();
  assert.deepEqual(posts,[{action:'open_pr',id:'hof-ok',head:'abc1234'}],'the confirm sent something else: '+JSON.stringify(posts));
  // A done task with no follow-up box and no retry has no Start again.
  assert(!q('[data-act="retry"],[data-act="followup"]',strip()),'Start again on a task the server does not restart');
  // A failed open task: its verdict says why, and Start again opens the existing sheet.
  posts.length=0;w.appTaskOpen('hof-bad');await settle();const b=strip();assert(!b.hidden&&b.dataset.mark==='failed','no strip on a failed task');
  assert(/Failed/.test(q('[data-k="verdict"]',b).textContent)&&/Check failed/.test(q('[data-k="verdict"]',b).textContent),'the verdict does not say why: '+q('[data-k="verdict"]',b).textContent);
  assert.equal(q('[data-k="check"] dd',b).textContent,'Check failed · 30 tests');
  const again=q('[data-act="retry"]',b);assert(again,'no Start again on a failed task with retry');click(again);await settle();
  dialog=q('dialog.sheet[open]');assert(dialog&&/Start a new worker\?/.test(dialog.textContent),'Start again does not open its sheet');assert.equal(posts.length,0,'Start again posted before confirming');
  dialog.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settle();
  assert.equal(posts.length,1);assert.equal(posts[0].action,'retry');assert.equal(posts[0].id,'hof-bad');
  // A finished failed task whose box takes a follow-up: Follow up goes to that box.
  w.appTaskOpen('hof-fail');await settle();const f=strip();assert(!f.hidden&&f.dataset.mark==='failed');assert.equal(q('[data-k="check"] dd',f).textContent.startsWith('No check')||/timed out/i.test(q('[data-k="check"] dd',f).textContent),true);
  const fu=q('[data-act="followup"]',f);assert(fu,'no Follow up on a finished task that takes one');click(fu);await settle();
  assert.equal(doc.activeElement&&doc.activeElement.tagName,'TEXTAREA','Follow up did not go to the box');assert(doc.activeElement.closest('#app-tab-body .app-msgbar'));
  // Another person's done task: the result, read only, no actions.
  w.appTaskOpen('hof-bobs');await settle();const o=strip();assert(!o.hidden,'no strip on another person’s done task');assert(!q('.app-racts',o)&&!q('button',o),'another person’s task offers actions');
  assert(!errors.length,errors.join('\n'));dom.window.close()}
 // M4: what cannot be read is left out, never guessed: the verdict and the snapshot's check state stay, no Push.
 {const {dom,w,doc,errors,posts,settle,q}=load('/',appSnap(),{broken:true});await settle();w.appTaskOpen('hof-ok');await settle();const s=doc.getElementById('app-result');
  assert(!s.hidden&&/Done/.test(q('[data-k="verdict"]',s).textContent),'no strip when the result routes fail');
  assert.equal(q('[data-k="check"] dd',s).textContent,'Check passed','the snapshot\'s check state is not used');assert.equal(q('[data-k="branch"] dd',s).textContent,'agentd/hof-ok');assert.equal(q('[data-k="cost"] dd',s).textContent,'$1.25','the cost from the result line');
  assert(!q('[data-act="open_pr"]',s),'a push offered that could not be checked');assert.equal(posts.length,0);
  assert(!errors.length,errors.join('\n'));dom.window.close()}
 console.log('dash_appresult: ok',phone?'phone':'desktop',theme);
})().catch(e=>{console.error(e);process.exit(1)});
