// libraos/core#658: a task whose worker could not start says why in its Session. The snapshot's
// start_failure (the history's newest "dispatch failed" line) shows as "The worker did not start" with
// its next step and a Start again button beside it, as text; not on a task that started, not as a
// button on another person's task, and Start again opens the same sheet as the Command menu's.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_appstartfail.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const BAD='hof-5a1f0001',OK='hof-5a1f0002',RO='hof-5a1f0003';
const why='Workspace not trusted: Claude Code does not trust the checkout C:\\Users\\alice\\demo '+evil;
const bad={id:BAD,goal:'Add a flag',state:'offered',from:'s-alice',from_user:'alice',worker:'claude',worker_tool:'claude',to:'any',project:'acme/demo-repo',updated_ago:'1m',
  dispatched:true,dispatch_failed:true,attempts:[],retry:{cwd:'/r/demo',tool:'claude',budget:'30m',may:true},
  start_failure:{why,next:'Run agentd trust C:\\Users\\alice\\demo on the host, then start a new worker from this work item.'}};
const ok={id:OK,goal:'Fix the parser',state:'claimed',from:'s-alice',from_user:'alice',worker:'claude',worker_tool:'claude',to:'any',project:'acme/demo-repo',updated_ago:'1m',dispatched:true,attempts:[{tool:'claude',running:true}]};
const ro={...bad,id:RO,goal:'Their task',from:'s-bob',from_user:'bob',retry:{cwd:'/r/demo',tool:'claude',may:false,why_not:'Only bob can start it again.'}};
const snap={user:'alice',role:'owner',now,mode:'app',watchdog:{running:true},handoff_list:[bad,ok,ro],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:['/r/demo'],dispatch:true,terminal:true,spend_today:{usd:0,workers:0,unpriced:0,pending:0}};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21470/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.WebSocket=class{constructor(u){this.url=u;this.readyState=0}send(){}close(){this.readyState=3}};w.Terminal=class{open(){}onData(){}resize(){}write(){}focus(){}dispose(){}};
 w.fetch=async(url)=>{const u=new URL(url,w.location.href),id=u.searchParams.get('id')||u.searchParams.get('ref')||u.searchParams.get('handoff');let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=snap;
  else if(u.pathname==='/api/session')body={handoff:id,tool:'claude',turns:[],note:id===OK?'No conversation yet.':'Its worker did not start, so there is no conversation to show; the reason is above and in its history.'};
  else if(u.pathname==='/api/workitem')body={tree:[{id,goal:'g',log:id===OK?[{note:'claimed',ago:'1m'}]:[{note:'dispatch failed: '+why,ago:'1m',actor:'agentd'}]}]};
  else if(u.pathname==='/api/taskmsg')body={may:true,live:false,gone:'No worker is on it.'};
  else if(u.pathname==='/api/review')body={handoff:id,files:[]};else if(u.pathname==='/api/files')body={files:[]};else if(u.pathname==='/api/checks')body={runs:[]};
  else if(u.pathname==='/api/taskdetail')body={handoff:id,tool:'claude'};else if(u.pathname==='/api/log')body={lines:[],running:false};
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
const $=id=>doc.getElementById(id),q=(s,n)=>(n||doc).querySelector(s),box=()=>q('#app-tab-body [data-k="start-failure"]');
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));assert(doc.body.classList.contains('app-mode'),'app mode is off');
 w.appSelect(BAD);await settle();
 const b=box();assert(b,'no start failure in the Session: '+$('app-tab-body').textContent.slice(0,300));
 assert(/The worker did not start/.test(b.textContent)&&b.textContent.includes('C:\\Users\\alice\\demo'),'reason missing: '+b.textContent);
 assert(/Run agentd trust/.test(b.textContent),'no next step: '+b.textContent);
 assert(!q('img',$('app-tab-body'))&&b.textContent.includes('<img'),'text went in as HTML');
 // It comes before the conversation, which no longer says "not readable yet".
 const conv=q('#app-tab-body [data-k="conversation"]');assert(b.compareDocumentPosition(conv)&w.Node.DOCUMENT_POSITION_FOLLOWING,'the reason is below the conversation');
 assert(!/not readable yet/.test($('app-tab-body').textContent),'still not readable yet');
 assert(/dispatch failed/.test(q('#app-tab-body .app-feed[aria-label="History"]').textContent),'the history line is not shown');
 // Start again beside it opens the same confirm sheet as the Command menu.
 const again=q('button[data-act="retry"]',b);assert(again&&again.getAttribute('aria-disabled')!=='true','no Start again beside the reason');
 again.click();await settle();assert(/Start a new worker\?/.test(doc.body.textContent),'Start again opened nothing');
 const dlg=[...doc.querySelectorAll('dialog')].find(d=>d.open);if(dlg)dlg.close();await settle();
 // A task that started shows none.
 w.appSelect(OK);await settle();assert(!box(),'a started task shows a start failure');
 // Another person's task: the reason, read only, no button.
 w.appSelect(RO,true);await settle();assert(box()&&/did not start/.test(box().textContent),'no reason on another person’s task');assert(!q('button[data-act="retry"]',box()),'a button on a read-only task');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_appstartfail: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');process.exit(0)
})().catch(e=>{console.error(e);process.exit(1)});
