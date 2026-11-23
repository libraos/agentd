// libraos/agentd-core#680: the app's Triggers page. For an owner it reads /api/triggers and draws
// [triggers] (state, settings, runs) and each schedule (state, runs); New trigger / Edit writes the
// form with POST /api/settings trigger_edit (a template fills it), Pause sends trigger_pause, and a
// schedule's Enable, Pause and Run now send schedule_enable, schedule_disable and schedule_run. Nothing
// sends triggers.enabled; turning them on is shown as the terminal's command. A run's row opens its
// task. Anyone else (403) gets the read-only commands and no control. Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_apptriggers.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const task=(id,o)=>({id,title:'Task '+id,goal:'Task '+id,state:'claimed',claimer:'w-'+id,from:'s-alice',from_user:'alice',worker:'claude',to:'any',project:'acme/web',stage:'implement',source:'trigger',updated_ago:'1m',dispatched:true,mine:true,mark:'working',attempts:[],...o});
const base={user:'alice',role:'owner',now,handoff_list:[task('hof-t1'),task('hof-s1',{source:'schedule'})],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:[],dispatch:true,
 mode:'app',watchdog:{running:true},spend_today:{usd:0,workers:0,unpriced:0,pending:0,user:'alice'}};
const tpls=[{name:'ci-red',title:'Fix red CI on my PRs',about:'a',label:'',budget:'30m',max_per_day:3,toml:'x'},{name:'issue-label',title:'Fix issues I label, and red CI',about:'b',label:'agentd:fix',budget:'45m',max_per_day:3,toml:'y'}];
const offStatus={enabled:false,problem:'',problem_when_enabled:'',repos:[],authors:[],label:'',budget:'',max_per_day:0,dirs:{},offers:[]};
const sched=(o)=>({schedule:'/src/web#nightly',name:'nightly',dir:'/src/web',enabled:true,next_run:'2026-11-15T03:00:00Z',definition:{cron:'0 3 * * *',timezone:'UTC',goal:'Update deps '+evil},
 runs:[{id:'sr1',scheduled_for:'2026-11-14T03:00:00Z',status:'offered',handoff:'hof-s1',handoff_state:'claimed'},{id:'sr2',scheduled_for:'2026-11-13T03:00:00Z',status:'skipped_precheck',reason:'precheck exited 1'}],...o});
let trig={status:offStatus,templates:tpls,repo:'acme/web',author:'alice',enable:'agentd config set triggers.enabled true',schedules:{schedules:[]}},trigCode=200,posts=[],postFail='';
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21470/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async(url,o={})=>{const u=new URL(url,w.location.href);let body={},status=200;
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=base;
  if(u.pathname==='/api/triggers'){body=trigCode===200?trig:{error:'Triggers are for owners'};status=trigCode}
  if(u.pathname==='/api/settings'&&o.method==='POST'){const b=JSON.parse(o.body);posts.push(b);if(postFail){status=400;body={error:postFail}}else body={changed:true}}
  return {ok:status<400,status,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const $=id=>doc.getElementById(id),body=doc.body,page=()=>$('app-page');
const shown=n=>{for(let x=n;x&&x!==doc;x=x.parentElement)if(x.hidden)return false;return w.getComputedStyle(n).display!=='none'};
const css=[...doc.querySelectorAll('style')].map(n=>n.textContent).join('\n');
const openLeft=async()=>{if(phone&&!body.classList.contains('app-left-open')){doc.querySelector('#app-shell [data-app-action="toggle-left"]').click();await tick()}};
const openTriggers=async()=>{await openLeft();const nav=doc.querySelector('#app-shell [data-app-nav="triggers"]');if(nav.getAttribute('aria-current')==='page'){nav.click();await tick()}nav.click();await settle()};
const btn=(sel)=>page().querySelector(sel);
const dialog=()=>doc.querySelector('dialog.sheet');
const submit=async()=>{dialog().querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle()};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));assert(body.classList.contains('app-mode'),'app mode is not on');
 assert(/region:css-app-triggers/.test(css),'no css region');
 // No trigger yet: New trigger, the terminal's command to turn on, empty runs, no schedules.
 await openTriggers();
 assert(shown(page()),'Triggers is not shown');
 const t=page().textContent;
 assert(/No trigger yet/.test(t)&&/agentd config set triggers\.enabled true/.test(t),'empty: '+t);
 const add=btn('[data-appt-action="trigger_edit"]');assert.equal(add.textContent,'New trigger');assert(!add.disabled);
 assert.equal(add.getAttribute('data-contextual-tour-target'),'triggers-add');assert(page().querySelector('[data-contextual-tour-target="triggers-runs"]'),'no runs target for the tour');
 assert(!btn('[data-appt-action="trigger_pause"]'),'Pause while off');assert(page().querySelector('[data-appt="no-schedules"]'),'no empty schedules note');
 // New trigger: the form, a template fills it, Save sends trigger_edit with lists and a number.
 add.click();await tick();assert(dialog()&&dialog().open,'no form');
 const inp=n=>[...dialog().querySelectorAll('input')].find(i=>i.id.endsWith('-'+n));
 assert.equal(inp('repos').value,'acme/web');assert.equal(inp('authors').value,'alice');
 dialog().querySelector('[data-template="issue-label"]').click();
 assert.equal(inp('label').value,'agentd:fix');assert.equal(inp('budget').value,'45m');
 inp('repos').value='acme/web, acme/api';inp('authors').value='alice bob';inp('max_per_day').value='0';
 await submit();assert.equal(posts.length,0,'sent an out-of-range max_per_day');assert(dialog(),'the form closed on a bad value');
 inp('max_per_day').value='4';await submit();
 assert.deepEqual(posts.pop(),{action:'trigger_edit',repos:['acme/web','acme/api'],authors:['alice','bob'],label:'agentd:fix',budget:'45m',max_per_day:4});
 assert(!dialog(),'the form stays open after a save');
 // A refusal shows in the form, and the form stays.
 btn('[data-appt-action="trigger_edit"]').click();await tick();postFail='triggers are on; an edit is written only while they are off';
 await submit();assert(dialog()&&/only while they are off/.test(dialog().textContent),'refusal not shown');postFail='';
 dialog().querySelector('.sheet-foot button').click();await tick();posts=[];
 // On, with settings, runs and a schedule: Edit is disabled, Pause sends trigger_pause, runs open their task.
 trig={...trig,status:{...offStatus,enabled:true,repos:['acme/web'],authors:['alice'],label:'agentd:fix',budget:'45m',max_per_day:4,
  offers:[{created:now,kind:'pr',repo:'acme/web',number:12,head_sha:'a'.repeat(40),handoff:'hof-t1',error:''},{created:now,kind:'issue',repo:'acme/web',number:7,handoff:'',error:'over the cap '+evil}]},
  schedules:{schedules:[sched(),sched({schedule:'/src/web#weekly',name:'weekly',enabled:false,next_run:null,runs:[]})]}};
 await openTriggers();
 const tx=page().textContent;
 assert(/On\. A red PR/.test(tx)&&/acme\/web#12/.test(tx)&&/agentd config set triggers\.enabled false/.test(tx),'on: '+tx);
 assert(btn('[data-appt-action="trigger_edit"]').disabled,'Edit is enabled while triggers are on');assert.equal(btn('[data-appt-action="trigger_edit"]').textContent,'Edit trigger');
 assert(!page().querySelector('img'),'text became markup');assert(tx.includes('Update deps '+evil)&&tx.includes('over the cap '+evil),'evil text not shown as text');
 btn('[data-appt-action="trigger_pause"]').click();await tick();assert(dialog(),'Pause asks first');await submit();
 assert.deepEqual(posts.pop(),{action:'trigger_pause'});
 // Schedules: nightly (enabled) has Run now and Pause, weekly Enable; its runs list, a skip with its reason.
 const night=page().querySelector('[data-schedule="nightly"]');
 assert(/skipped precheck/.test(night.textContent)&&/precheck exited 1/.test(night.textContent),'nightly runs: '+night.textContent);
 assert(/agentd schedule run nightly --repo \/src\/web/.test(night.textContent),'no CLI twin for run now');
 night.querySelector('[data-appt-action="schedule_run"]').click();await settle();assert.deepEqual(posts.pop(),{action:'schedule_run',dir:'/src/web',name:'nightly'});
 await openTriggers();page().querySelector('[data-schedule="nightly"] [data-appt-action="schedule_disable"]').click();await settle();assert.deepEqual(posts.pop(),{action:'schedule_disable',dir:'/src/web',name:'nightly'});
 await openTriggers();assert(!page().querySelector('[data-schedule="weekly"] [data-appt-action="schedule_run"]'),'Run now on a schedule that is off');
 page().querySelector('[data-schedule="weekly"] [data-appt-action="schedule_enable"]').click();await settle();assert.deepEqual(posts.pop(),{action:'schedule_enable',dir:'/src/web',name:'weekly'});
 // Nothing on the page ever sent triggers.enabled or a config write.
 assert(!posts.some(p=>p.action==='config'||JSON.stringify(p).includes('enabled')),'sent enabled: '+JSON.stringify(posts));
 // A run's row opens its task.
 await openTriggers();const seen=[];doc.addEventListener('app-task',e=>seen.push(e.detail.id));
 page().querySelector('[data-schedule="nightly"] tr[data-task-id="hof-s1"]').click();await tick();
 assert.equal(seen.pop(),'hof-s1','a schedule run did not open its task');assert(!shown(page()),'the page stays over the task');
 await openTriggers();page().querySelector('[data-appt="trigger"] tr[data-task-id="hof-t1"]').click();await tick();assert.equal(seen.pop(),'hof-t1','a trigger run did not open its task');
 // Not an owner: the read-only commands and no control.
 trigCode=403;await openTriggers();
 const ro=page().textContent;
 assert(/Read only/.test(ro)&&/Only an owner/.test(ro)&&/agentd trigger status/.test(ro),'read only: '+ro);
 assert(!page().querySelector('input,textarea,select,form,[data-appt-action]'),'a non-owner has a control');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_apptriggers: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
