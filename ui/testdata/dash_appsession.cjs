// libraos/agentd-core#602: a Codex task's Session. Its heading is the task's own goal (or title), never
// "another task"; the Codex worker's conversation shows as a Claude worker's does: the prompt, the agent's
// messages, each command it ran and its outcome, live while it runs (re-read on the Session's tick) and
// after it is done; Windows paths stay as written; text goes in as text. The history stays below it.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_appsession.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const CX='hof-c0ffee12',GONE='hof-abcdef99',OTHER='hof-01234567';
// A finished Codex task with no title: only its goal, which names the task itself and another one.
const codex={id:CX,goal:'Fix the login retry for '+CX+', after '+OTHER,state:'done',from:'s-alice',from_user:'alice',worker:'codex',worker_tool:'codex',to:'any',project:'acme/demo-repo',updated_ago:'3m',worker_branch:'agentd/'+CX};
const snap={user:'alice',role:'owner',now,mode:'app',watchdog:{running:true},handoff_list:[],done:[codex],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:['/r/demo'],dispatch:true,terminal:true,spend_today:{usd:0,workers:0,unpriced:0,pending:0}};
let turns=[
 {role:'user',text:'agentd started you to take handoff '+CX+'. First claim it.'},
 {role:'assistant',text:'I will claim it, then read the brief. '+evil},
 {role:'tool',text:'Shell(go test ./internal/agentd/)',id:'c1'},
 {role:'result',text:'ok  \tgithub.com/x/agentd\t1.2s',id:'c1'},
 {role:'tool',text:'Shell(type C:\\Users\\alice\\repo\\missing.txt)',id:'c2'},
 {role:'error',text:'The system cannot find the file specified.',id:'c2'},
 {role:'assistant',text:'Tests pass; committed.'}];
const hits={};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21470/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.WebSocket=class{constructor(u){this.url=u;this.readyState=0}send(){}close(){this.readyState=3}};w.Terminal=class{open(){}onData(){}resize(){}write(){}focus(){}dispose(){}};
 w.fetch=async(url)=>{const u=new URL(url,w.location.href),id=u.searchParams.get('id')||u.searchParams.get('ref')||u.searchParams.get('handoff');const k=u.pathname+(u.searchParams.get('handoff')?'?handoff='+id:'');hits[k]=(hits[k]||0)+1;let body={},status=200;
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=snap;
  else if(u.pathname==='/api/session'&&u.searchParams.get('handoff')){if(id===OTHER)status=404;else body=id===GONE?{handoff:id,tool:'codex',turns:[],note:'No worker has run on this task, so there is no conversation to show.'}:{handoff:id,tool:'codex',turns,spans:[]}}
  else if(u.pathname==='/api/workitem')body={tree:[{id,goal:id===GONE?'Rename the settings page':id===OTHER?'Clean up the settings of '+OTHER:codex.goal,log:[{note:'claimed',ago:'5m',actor:'w-'+id},{note:'done',ago:'3m',actor:'w-'+id}]}]};
  else if(u.pathname==='/api/taskmsg')body={may:true,live:false,gone:'The task is done: no worker is on it any more, so a message would not be read.'};
  else if(u.pathname==='/api/review')body={handoff:id,files:[]};else if(u.pathname==='/api/files')body={files:[]};else if(u.pathname==='/api/checks')body={runs:[]};
  else if(u.pathname==='/api/taskdetail')body={handoff:id,tool:'codex'};else if(u.pathname==='/api/log')body={lines:[],running:false};
  return {ok:status<400,status,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>status===404?'404 page not found':JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
const $=id=>doc.getElementById(id),q=(s,n)=>(n||doc).querySelector(s),qa=(s,n)=>[...(n||doc).querySelectorAll(s)];
const conv=()=>q('#app-tab-body [data-k="conversation"]'),roles=()=>qa('[data-role]',conv()).map(n=>n.dataset.role),head=()=>q('#app-tab-body .app-sess h2').textContent;
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));assert(doc.body.classList.contains('app-mode'),'app mode is off');
 doc.dispatchEvent(new w.CustomEvent('app-task',{detail:{id:CX,mine:true,readOnly:false}}));await settle();
 // The heading is the task's goal; its own id stays, another task's id is humanized as everywhere.
 assert(head().startsWith('Fix the login retry for '+CX),'the heading is not the task’s goal: '+head());assert(/after another task/.test(head()),'another id kept: '+head());
 // The conversation: the prompt, the agent's messages, each command and its outcome, in order, as text.
 assert(hits['/api/session?handoff='+CX]>=1,'the worker conversation was not read');const c=conv();assert(c,'no conversation in the Session');
 assert.deepEqual(roles(),['user','assistant','tool','result','tool','error','assistant']);
 assert(/agentd started you to take handoff/.test(q('[data-role="user"]',c).textContent),'no prompt');
 assert(/Shell\(go test \.\/internal\/agentd\/\)/.test(qa('[data-role="tool"]',c)[0].textContent)&&/ok\s+github\.com/.test(q('[data-role="result"]',c).textContent),'no command or outcome');
 assert(qa('[data-role="tool"]',c)[1].textContent.includes('C:\\Users\\alice\\repo\\missing.txt'),'Windows path changed: '+qa('[data-role="tool"]',c)[1].textContent);
 assert(/cannot find the file/.test(q('[data-role="error"]',c).textContent)&&q('.app-ferr[data-role="error"]',c),'a failed command is not marked');
 assert(!q('img',$('app-tab-body'))&&c.textContent.includes('<img'),'text went in as HTML');
 assert(!/No history yet/.test($('app-tab-body').textContent),'No history yet on a task with history');
 // The history stays, below the conversation, and the done task's footer.
 const feed=q('#app-tab-body .app-feed[aria-label="History"]');assert(feed&&/claimed/.test(feed.textContent),'the history is gone');
 assert(c.compareDocumentPosition(feed)&w.Node.DOCUMENT_POSITION_FOLLOWING,'history before the conversation');
 assert(/no worker is on it any more/.test($('app-tab-body').textContent),'no done footer');
 // Live: the Session's tick re-reads it, so a running worker's next line shows.
 turns=[...turns,{role:'assistant',text:'LATER_LINE'}];const real=w.Date.now.bind(w.Date);w.Date.now=()=>real()+20000;w.awTick();await settle();w.awTick();await settle();
 assert(/LATER_LINE/.test(conv().textContent),'a new line does not show: '+conv().textContent);w.Date.now=real;
 // A task the snapshot no longer has: the heading is the work item's goal, never an id or "another task".
 w.appSelect(GONE);await settle();assert.equal(head(),'Rename the settings page');assert(/No worker has run/.test(conv().textContent),'no note: '+conv().textContent);
 // Another person's task the server will not show: said so, no error.
 w.appSelect(OTHER,true);await settle();assert.equal(head(),'Clean up the settings of '+OTHER);assert(/Only the task’s own person/.test(conv().textContent),'404: '+conv().textContent);
 assert(!errors.length,errors.join('\n'));
 console.log('dash_appsession: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');process.exit(0)
})().catch(e=>{console.error(e);process.exit(1)});
