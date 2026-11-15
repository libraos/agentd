// libraos/agentd-core#670: a follow-up on a finished task. The Session's message box stays on a done task:
// it says what a send does (a worker starts again on the task's branch, with the conversation), sends the
// task_msg action, and the follow-up then shows in the same conversation and in the history, as text. A
// task with nothing to start keeps its note and no box.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_appfollowup.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const CX='hof-c0ffee12',KID='hof-f011face',GONE='hof-abcdef99';
const codex={id:CX,goal:'Add GET /version with a unittest',state:'done',from:'s-alice',from_user:'alice',worker:'codex',worker_tool:'codex',to:'any',project:'acme/demo-repo',updated_ago:'3m',worker_branch:'agentd/'+CX};
const other={...codex,id:GONE,goal:'Rename the settings page',state:'cancelled',worker_branch:'agentd/'+GONE};
const snap={user:'alice',role:'owner',now,mode:'app',watchdog:{running:true},handoff_list:[],done:[codex,other],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:['/r/demo'],dispatch:true,terminal:true,spend_today:{usd:0,workers:0,unpriced:0,pending:0}};
let turns=[{role:'user',text:'agentd started you to take handoff '+CX+'.'},{role:'assistant',text:'Added GET /version; tests pass.'}];
let log=[{note:'claimed',ago:'5m',actor:'w-1'},{note:'done',ago:'3m',actor:'w-1'}];
let msg={may:true,live:false,followup:'child',followup_note:'The task is done. A message starts a worker again on agentd/'+CX+', with the conversation so far and your message.'};
const posts=[];
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21470/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.WebSocket=class{constructor(u){this.url=u;this.readyState=0}send(){}close(){this.readyState=3}};w.Terminal=class{open(){}onData(){}resize(){}write(){}focus(){}dispose(){}};
 w.fetch=async(url,o)=>{const u=new URL(url,w.location.href),id=u.searchParams.get('id')||u.searchParams.get('ref')||u.searchParams.get('handoff');let body={},status=200;
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=snap;
  else if(u.pathname==='/api/action'){const b=JSON.parse(o.body);posts.push(b);
    if(b.action==='task_msg'){body={ok:true,handoff:b.id,followup:KID,dispatch:{handoff:KID,status:'started'}};
      msg={may:true,live:false,gone:'A worker is starting on this task; send your message once it is working.'};
      turns=[...turns,{role:'user',text:'Follow-up: '+b.body,handoff:KID}];log=[...log,{note:'follow-up from user alice, started '+KID+': '+b.body,ago:'0s',actor:'s-dash'}]}}
  else if(u.pathname==='/api/session'&&u.searchParams.get('handoff'))body={handoff:id,tool:'codex',turns,spans:[]};
  else if(u.pathname==='/api/workitem')body={tree:[{id,goal:id===GONE?other.goal:codex.goal,log:id===GONE?[{note:'cancelled',ago:'1h'}]:log}]};
  else if(u.pathname==='/api/taskmsg')body=id===GONE?{may:true,live:false,gone:'The task is cancelled: no worker is on it any more, so a message would not be read.'}:msg;
  else if(u.pathname==='/api/review')body={handoff:id,files:[]};else if(u.pathname==='/api/files')body={files:[]};else if(u.pathname==='/api/checks')body={runs:[]};
  else if(u.pathname==='/api/taskdetail')body={handoff:id,tool:'codex'};else if(u.pathname==='/api/log')body={lines:[],running:false};
  return {ok:status<400,status,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<8;i++)await tick()};
const $=id=>doc.getElementById(id),q=(s,n)=>(n||doc).querySelector(s),qa=(s,n)=>[...(n||doc).querySelectorAll(s)];
const bar=()=>q('#app-tab-body .app-msgbar');
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));assert(doc.body.classList.contains('app-mode'),'app mode is off');
 doc.dispatchEvent(new w.CustomEvent('app-task',{detail:{id:CX,mine:true,readOnly:false}}));await settle();
 // The done task keeps its box, saying what a send does; never the old "would not be read".
 assert(bar()&&!bar().hidden,'no message bar on a done task');
 const ta=q('textarea',bar());assert(ta,'no box on a done task: '+bar().textContent);
 assert.equal(ta.getAttribute('aria-label'),'Follow up on this task');
 assert(/starts a worker again on agentd\/hof-c0ffee12/.test(q('[data-k="followup-note"]',bar()).textContent),'no note: '+bar().textContent);
 assert(!/would not be read/.test($('app-tab-body').textContent),'the old dead end is shown');
 const btn=q('button',bar());assert.equal(btn.textContent,'Send and start');
 // Sending: the task_msg action with the words as typed.
 ta.value='also read the version from an environment variable '+evil;ta.dispatchEvent(new w.Event('input'));btn.click();await settle();
 assert.equal(posts.length,1);assert.deepEqual(posts[0],{action:'task_msg',id:CX,body:'also read the version from an environment variable '+evil});
 // The same conversation, then the follow-up and its history line, as text.
 const conv=q('#app-tab-body [data-k="conversation"]');const f=q('[data-k="followup"]',conv);
 assert(f&&/Follow-up: also read the version/.test(f.textContent),'the follow-up is not in the conversation: '+conv.textContent);
 assert(/Added GET \/version/.test(conv.textContent),'the earlier conversation is gone');
 assert(f.compareDocumentPosition(q('[data-role="assistant"]',conv))&w.Node.DOCUMENT_POSITION_PRECEDING,'the follow-up is not after the earlier conversation');
 const hist=q('#app-tab-body .app-feed[aria-label="History"]'),m=qa('[data-k="message"]',hist).pop();
 assert(m&&/^> You: also read the version/.test(m.textContent),'no follow-up line in the history: '+hist.textContent);
 assert(!q('img',$('app-tab-body')),'text went in as HTML');
 // While its worker starts the box says so.
 assert(bar()&&!q('textarea',bar())&&/A worker is starting/.test(bar().textContent),'box while starting: '+(bar()&&bar().textContent));
 // A cancelled task: its note, no box.
 w.appSelect(GONE);await settle();assert(bar()&&!q('textarea',bar())&&/cancelled/.test(bar().textContent),'cancelled task: '+(bar()&&bar().textContent));
 assert(!errors.length,errors.join('\n'));
 console.log('dash_appfollowup: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');process.exit(0)
})().catch(e=>{console.error(e);process.exit(1)});
