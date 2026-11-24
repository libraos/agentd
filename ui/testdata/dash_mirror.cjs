// Member hosts' handoffs mirrored to the team server (#848): a mirrored row
// (origin "host", read_only) shows which host it came from, offers no action
// (handoffActions, handoffWorkerActions and taskActions are empty), opens as a
// read-only work item, and Insights' "Whose work" select sends scope to
// /api/factory, /api/usage and /api/history.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_mirror.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString();
const mirrored={id:'hof-m1',state:'claimed',to:'any',goal:'Fix the parser on a laptop',origin:'host',host:'alice-laptop',mirror:{node:'alice-laptop',person:'alice',read_only:true},read_only:true,check:'go test ./...',dispatched:now,attempts:[],created:now,updated:now};
const own={id:'hof-o1',state:'offered',to:'any',goal:'Server task',origin:'server',created:now,updated:now};
let dash={user:'alice',role:'owner',now,team:true,dispatch:true,handoff_list:[own,mirrored],done:[],sessions:[],left:[],unlinked:[],waiting:[],claims:[],messages:[],inbox:[],checkouts:[]};
const requests=[],errors=[],actions=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=(body,status=200)=>({ok:status<400,status,json:async()=>body,text:async()=>JSON.stringify(body)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21620/#insights/history',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);requests.push(u.pathname+u.search);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/action'){actions.push(JSON.parse(opts.body));return json({})}
  if(u.pathname==='/api/load')return json({at:now,tasks:{waiting_person:19}});
  if(u.pathname==='/api/running')return json({at:now,running:[{id:'hof-fixture-old',goal:'Old task',worker_state:'blocked'}]});
  if(u.pathname==='/api/history')return json({rows:[{id:'hof-m2',key:'mirror:alice@alice-laptop/hof-m2',state:'done',goal:'Mirrored finished task',origin:'host',host:'alice-laptop',mirror:{node:'alice-laptop',person:'alice',read_only:true},read_only:true,updated:now},{id:'hof-3',state:'done',goal:'Own task',origin:'server',updated:now}],total:2,groups:2,next:null,limit:50,scope:u.searchParams.get('scope')||'all',facets:{states:['done','cancelled','declined'],sources:[],creators:[],scopes:['server','hosts']}});
  if(u.pathname==='/api/workitem')return json({kind:'mirror',ref:'hof-m2',id:'hof-m2',title:'Mirrored finished task',state:'done',origin:'host',host:'alice-laptop',mirror:{node:'alice-laptop',person:'alice',read_only:true},read_only:true,worker:'codex',usd:1.25,minutes:12,note:'Mirrored from host alice-laptop (alice). It is read only here: open it on that host to act on it.',updated:now});
  if(u.pathname==='/api/issue'&&u.searchParams.get('ref')==='hof-m1')return json({kind:'handoff',ref:'hof-m1',title:'Fix the parser on a laptop',mirror:true,read_only:true,node:'alice-laptop',person:'alice',mirrored:'2026-11-21T10:00:07Z',mirrored_ago:'1h',state:'claimed',issues:[{ref:'acme/widget#4'}],body:{goal:'Fix the parser on a laptop'},
   tree:[{...mirrored,focus:true,worker:'claude',worker_state:'running',branch:'agentd/hof-m1',project:'acme/widget',log:[],usd:1.5,minutes:30,attempts:[{tool:'claude',model:'opus',started:now,end_reason:'done',minutes:30,usd:1.5,running:false}]}]});
  if(u.pathname==='/api/issue'&&u.searchParams.get('ref')==='hof-o1')return json({kind:'handoff',ref:'hof-o1',title:'Server task',tree:[{...own,focus:true,log:[],attempts:[]}],body:{goal:'Server task'}});
  if(u.pathname==='/api/usage')return json({totals:{workers:0},daily:[],by_user:[],by_project:[],by_tool:[],by_model:[],errors:[]});
  if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:false});
  return json({})}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<8;i++)await tick()};
const evalJS=s=>w.eval(s);
(async()=>{
 await settle();
 // No action on a mirrored row, but the server's own row keeps its own.
 assert.deepEqual(evalJS('handoffActions(lastDash||{dispatch:true},'+JSON.stringify(mirrored)+')'),[],'a mirrored row offered an action');
 assert.deepEqual(evalJS('handoffWorkerActions({dispatch:true},'+JSON.stringify(mirrored)+')'),[],'a mirrored row offered a worker action');
 assert.deepEqual(evalJS('taskActions({},'+JSON.stringify(mirrored)+')'),[],'a mirrored row offered a task action');
 const tag=evalJS('hostTag('+JSON.stringify(mirrored)+')');assert(tag&&tag.textContent==='on alice-laptop','no host label: '+(tag&&tag.textContent));
 assert.equal(evalJS('hostTag('+JSON.stringify(own)+')'),null,'the server\'s own row got a host label');
 // History: the mirrored row is labelled with its host.
 const rows=[...doc.querySelectorAll('#page-history .hrow, .hrow')];assert(rows.length>=2,'history rows not drawn');
 const m=rows.find(r=>r.dataset.ref==='hof-m2');assert(m&&m.querySelector('.host-tag'),'the mirrored history row has no host label');
 assert(!rows.find(r=>r.dataset.ref==='hof-3').querySelector('.host-tag'),'the own history row has a host label');
 // Whose work: scope goes to history, then usage and factory.
 const sel=doc.getElementById('ins-scope');assert(sel,'no Whose work select');assert(doc.getElementById('page-history').contains(sel),'Whose work is not on the History view');
 let before=requests.length;sel.value='hosts';sel.dispatchEvent(new w.Event('change'));await settle();
 const hist=requests.slice(before).filter(r=>r.startsWith('/api/history?')).pop();assert(hist,'no history request after the scope changed');
 assert.equal(new URL('http://x'+hist).searchParams.get('scope'),'hosts');
 w.location.hash='#insights/workers';await settle();
 const usage=requests.filter(r=>r.startsWith('/api/usage?')).pop();assert(usage&&new URL('http://x'+usage).searchParams.get('scope')==='hosts','usage without scope: '+usage);
 w.location.hash='#insights/metrics';await settle();
 const fac=requests.filter(r=>r.startsWith('/api/factory?')).pop();assert(fac&&new URL('http://x'+fac).searchParams.get('scope')==='hosts','factory without scope: '+fac);
 sel.value='';sel.dispatchEvent(new w.Event('change'));await settle();
 const fac2=requests.filter(r=>r.startsWith('/api/factory?')).pop();assert(!new URL('http://x'+fac2).searchParams.has('scope'),'All work still sent a scope');
 // A mirrored work item opens read only, with its note and no buttons.
 w.showWorkItem('hof-m2');await settle();const box=doc.getElementById('hist');
 assert(box.textContent.includes('read only here'),'no read-only note: '+box.textContent.slice(0,200));
 assert(box.textContent.includes('alice-laptop'));
 assert.deepEqual([...box.querySelectorAll('.drawer-scroll button')].map(b=>b.textContent),[],'a mirrored work item has buttons');
 // The task page of a mirrored handoff (/api/issue says mirror: true) is read only: the device note, what
 // its device sent, and no action, message box, terminal or file panel.
 w.closeHistory&&w.closeHistory();
 before=requests.length;w.location.hash='#issues/hof-m1';await settle();
 const det=doc.getElementById('issue-detail');
 assert(requests.slice(before).some(r=>r==='/api/issue?ref=hof-m1'),'the task page did not ask /api/issue');
 const note=det.querySelector('.mirror-note');assert(note,'no device note: '+det.textContent.slice(0,300));
 assert(/^Mirrored from alice-laptop \(alice\), last updated .+\. Act on it on that device\.$/.test(note.textContent),'note: '+note.textContent);
 assert(!/unknown handoff|Could not load/.test(det.textContent),'the page says it could not load: '+det.textContent.slice(0,200));
 assert(det.textContent.includes('Fix the parser on a laptop')&&det.textContent.includes('agentd/hof-m1')&&det.textContent.includes('$1.50'),'the mirrored row is not drawn: '+det.textContent.slice(0,400));
 assert.deepEqual([...det.querySelectorAll('button,textarea,input,select,[data-write],[data-task-act]')].map(b=>b.outerHTML.slice(0,80)),[],'a mirrored task page has controls');
 assert(!det.querySelector('.tw-tabs,.tw-acts'),'a mirrored task page has the workspace tabs or actions');
 assert(!requests.slice(before).some(r=>/^\/api\/(action|terminal|files|worklog|taskdetail|openpr)/.test(r)),'the mirrored page asked for worker data: '+requests.slice(before).join(' '));
 // A server handoff's page is the workspace as before.
 w.location.hash='#issues/hof-o1';await settle();
 assert(!det.querySelector('.mirror-note'),'the server task got the device note');assert(det.querySelector('.tw-tabs'),'the server task lost its workspace');
 const pending={...own,id:'hof-fixture-active',title:'Blocked again',project:'sample/widget',attention_status:'needs',mark:'needs_you',issues:['sample/widget#8']};
 const reason='stale: worker ended on '+now.slice(0,10)+', not retried';
 const old={...own,id:'hof-fixture-old',title:'Old task',attention_status:'stale',worker_state:'blocked',mark:'needs_you',stale_age:'5d',stale_at:'2020-01-01T00:00:00Z',cancel:{may:true},stale_cancel_reason:reason};
 const viewerOld={...old,id:'hof-fixture-viewer',title:'No cancel permission',cancel:{may:false},stale_cancel_reason:undefined};
 const mine={...mirrored,host:'fixture-owned-node',mirror:{person:'fixture-signed-in',node:'fixture-owned-node'},attention_status:'needs',other_mirror:false,mine:false};
 const others={...mine,id:'hof-fixture-mirror',host:'fixture-other-node',mirror:{person:'fixture-other-person',node:'fixture-other-node'},attention_status:'stale',other_mirror:true,stale_age:'6d',cancel:{may:true}};
 const approval={what:'approval',ref:'fixture-approval',title:'Repository command approval',can_answer:true,handoff:pending.id};
 const standalone={what:'approval',ref:'fixture-standalone',title:'Standalone approval',can_answer:true};
 const blocked={id:'fixture-block',handoff:pending.id,kind:'blocked',title:'Worker waits'};
 const expired={id:'fixture-expired',kind:'stale',title:'Expired offer'};
 dash={...dash,user:'fixture-signed-in',attention_version:1,handoff_list:[pending,old,viewerOld,mine,others],waiting:[approval,standalone],
   inbox:[blocked,expired,{...blocked,id:'fixture-old-notice',handoff:old.id},{...blocked,id:'fixture-mirror-notice',handoff:others.id}]};
 const show=async hash=>{w.location.hash=hash;await evalJS('refresh()');await settle()};
 const equalNumber=(selector,n)=>assert.equal(doc.querySelector(selector)?.textContent,String(n),selector);
 const fold=(pane,key)=>doc.querySelector(`${pane} [data-attention-group="${key}"]`);
 await show('#issues?view=needs&layout=board');
 evalJS(`ISS.d={issues:[{ref:'sample/widget#8',title:'Linked issue',repo:'sample/widget',state:'OPEN',handoffs:[${JSON.stringify(pending)},${JSON.stringify(old)}],prs:[]}]};drawCards(lastDash)`);
 equalNumber('#board [data-status="needs"] .kcol-head .n',3);
 equalNumber('[data-view-n="needs"]',3);equalNumber('#needs-me-n',3);equalNumber('#inbox-badge',3);
 assert(doc.querySelector('#board [data-status="needs"] [data-ref="'+pending.id+'"]'),'the linked task was folded out of Needs attention');
 const stale=fold('#board','stale'),other=fold('#board','owner:fixture-other-person');
 assert(stale&&!stale.open&&other&&!other.open,'stale and mirrored groups must start folded');
 assert(stale.textContent.includes('Last changed 5d ago'));
 assert(other.textContent.includes('act on host fixture-other-node')&&!other.querySelector('button'),'another person’s mirror offered a write');
 assert(!stale.querySelector('[data-ref="'+viewerOld.id+'"] button'),'permissionless task offered Cancel');
 assert.equal(actions.length,0,'a refresh cancelled something');
 stale.open=true;stale.querySelector('[data-ref="'+old.id+'"] button').click();await tick();
 let dialog=doc.querySelector('dialog.sheet[open]');assert.equal(dialog.querySelector('textarea').value,reason);
 dialog.querySelector('button[type="button"]').click();assert.equal(actions.length,0,'dismissing Cancel wrote to the server');

 await show('#overview');
 equalNumber('[data-ov-need="attention"]',3);assert(!doc.querySelector('[data-ov-need-row="'+old.id+'"]'),'the running feed reintroduced a stale task');
 assert(fold('#ov-body','stale')&&!fold('#ov-body','stale').open);assert(fold('#ov-body','owner:fixture-other-person'));
 await show('#inbox');equalNumber('#inbox-tabs [data-tab="needs"] .n',3);
 assert(doc.querySelector('#inbox-rows [data-id="attention:'+mine.id+'"]'),'viewer’s own mirrored need was omitted from Inbox');
 assert(!doc.querySelector('#inbox-rows [data-id="fixture-old-notice"],[data-id="fixture-mirror-notice"]'));
 evalJS('appStatus(appMine(lastDash),lastDash);appSidebar(lastDash)');
 equalNumber('#app-bell-count',3);equalNumber('#app-waiting',3);
 assert(doc.querySelector('[data-app-action="bell"]').getAttribute('aria-label').startsWith('3 need attention'));

 dash={...dash,handoff_list:dash.handoff_list.map(h=>h.id===old.id?{...h,attention_status:'needs',stale_age:undefined,stale_cancel_reason:undefined}:h)};
 await show('#issues?view=needs&layout=list');equalNumber('#inbox-badge',4);equalNumber('[data-view-n="needs"]',4);
 assert(!fold('#board','stale').querySelector('[data-ref="'+old.id+'"]'),'a fresh event did not move the task back into attention');
 assert.equal(actions.length,0);
 dash={...dash,handoff_list:[pending,old,viewerOld,mine,others]};await show('#overview');
 const overviewStale=fold('#ov-body','stale');overviewStale.open=true;overviewStale.querySelector('button').click();await tick();
 dialog=doc.querySelector('dialog.sheet[open]');dialog.querySelector('textarea').value='Fixture retirement reason';
 dialog.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settle();
 assert.deepEqual(actions,[{action:'cancel',id:old.id,reason:'Fixture retirement reason'}]);
 dash={...dash,mode:'app'};await show('#home');evalJS("appPage('home')");equalNumber('[data-home-count="needs"]',3);
 evalJS("appPage('tasks')");assert(fold('#app-page','stale')&&!fold('#app-page','stale').open);assert(fold('#app-page','owner:fixture-other-person'));
 assert.deepEqual(errors,[]);
 console.log('dash_mirror: ok');process.exit(0)
})().catch(e=>{console.error(e);process.exit(1)});
