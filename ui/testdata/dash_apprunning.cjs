// libraos/agentd-core#604: the app's status bar and the Agents list count every open task whose
// dispatched worker is alive (the server's worker_running), however it was started: one sent by a
// session no person is known for reads as someone else's (mine false) and one whose codex worker
// missed a report has an Inbox item, and before, each dropped out of "running" while it ran.
// Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_apprunning.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString();
const base={user:'boss',role:'owner',now,done:[],sessions:[],left:[],unlinked:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{}};
const task=(id,x)=>({id,state:'claimed',from:'agentd-new',to:'any',claimer:'codex-'+id,goal:'task '+id,mark:'working',worker:'codex',dispatched:true,attempts:[{tool:'codex',running:true,minutes:3}],...x});
// live-report: mine, worker alive, a missed report in the Inbox; live-other: worker alive, reads as
// someone else's; mine-session: mine, claimed by an interactive session (no dispatched worker);
// other-ended: someone else's, its worker no longer alive.
const list=mine=>[
 task('hof-live-report',{worker_running:true,...(mine?{mine:true}:{})}),
 task('hof-live-other',{worker_running:true,...(mine?{mine:false}:{})}),
 task('hof-mine-session',{worker:null,dispatched:false,attempts:[],claimer:'claude-me',...(mine?{mine:true}:{})}),
 task('hof-other-ended',{attempts:[{tool:'codex',running:false}],...(mine?{mine:false}:{})}),
];
const inbox=[{id:'report:hof-live-report:1',kind:'report',handoff:'hof-live-report',text:'codex worker missed its report',created:now}];
const load=async dash=>{
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
 const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21470/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
  w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.fetch=async(url)=>{const u=new URL(url,w.location.href);let body={};
   if(u.pathname==='/api/auth')return {ok:true,status:204};
   if(u.pathname==='/api/dash')body=dash;
   return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
 const tick=()=>new Promise(r=>setTimeout(r,25));for(let i=0;i<6;i++)await tick();
 return {w:dom.window,doc:dom.window.document,errors};
};
(async()=>{
 {// The app: mine working (2: the one with a missed report too) plus the other person's live worker.
  const {w,doc,errors}=await load({...base,mode:'app',watchdog:{running:true},handoff_list:list(true),inbox});
  assert(!errors.length,'app: '+errors.join('\n'));
  assert.equal(doc.getElementById('app-running').textContent,'3','app: the running count misses a live dispatched worker');
  assert.equal(doc.getElementById('app-waiting').textContent,'1','app: the missed report no longer waits on you');
  // The task list draws each live worker's task as working, whoever it reads as sent by.
  for(const id of ['hof-live-report','hof-live-other']){const r=doc.querySelector('#app-projects .app-task[data-task-id="'+id+'"]');assert(r,'app: no row for '+id);assert.equal(r.dataset.mark,'working','app: '+id+' does not read working')}
  w.close();
 }
 {// The team dash's Agents list: every claimed task is working, the one that also needs you included.
  const {w,doc,errors}=await load({...base,mode:'team',handoff_list:list(false),inbox});
  assert(!errors.length,'team: '+errors.join('\n'));
  const counts=[...doc.querySelectorAll('#agents-counts span')].map(n=>n.textContent);
  assert.deepEqual(counts.slice(0,2),['1 task needs you','4 working'],'team: '+counts.join(' | '));
  w.close();
 }
 console.log('dash_apprunning: ok',process.env.DASH_UI_PHONE==='1'?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
