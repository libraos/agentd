// libraos/agentd-core#677: a running task's Session in agentd app. A message sent to its worker shows in
// the conversation, in time among the worker's turns, with msg status's word for it (sent, read,
// answered), and a new send shows there at once; Enter sends, Shift+Enter adds a line, Ctrl+Enter still
// sends, and Enter while an input method is composing does not. The history lists the work item's log.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_appmessages.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const ID='hof-5e17d001',T=m=>new Date(Date.now()-m*60000).toISOString();
const task={id:ID,title:'Fix the login retry',goal:'Fix the login retry',state:'claimed',claimer:'w-1',from:'s-alice',from_user:'alice',worker:'claude',worker_tool:'claude',to:'any',project:'acme/demo-repo',updated_ago:'1m',dispatched:now,worker_branch:'agentd/'+ID};
const snap={user:'alice',role:'owner',now,mode:'app',watchdog:{running:true},handoff_list:[task],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:['/r/demo'],dispatch:true,terminal:true,spend_today:{usd:0,workers:0,unpriced:0,pending:0}};
const turns=[{role:'user',text:'agentd started you to take handoff '+ID,at:T(10)},{role:'assistant',text:'Claimed; reading the code.',at:T(8)},{role:'assistant',text:'Added the test as asked.',at:T(2)}];
let sent=[{message:'msg-1',user:'alice',to:'w-1',body:'please add a test '+evil,sent:T(5),ago:'5m',state:'answered',reply:'msg-r'},{message:'msg-2',user:'bob',to:'w-1',body:'and the docs',sent:T(1),ago:'1m',state:'read'}];
const posts=[];
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21470/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.WebSocket=class{constructor(u){this.url=u;this.readyState=0}send(){}close(){this.readyState=3}};w.Terminal=class{open(){}onData(){}resize(){}write(){}focus(){}dispose(){}};
 w.fetch=async(url,o)=>{const u=new URL(url,w.location.href),id=u.searchParams.get('id')||u.searchParams.get('ref')||u.searchParams.get('handoff');let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/action'){const p=JSON.parse(o.body);posts.push(p);if(p.action==='task_msg')sent=[...sent,{message:'msg-3',user:'alice',to:'w-1',body:p.body,sent:new Date().toISOString(),ago:'0s',state:'unread'}];body={ok:true,message:'msg-3'}}
  else if(u.pathname==='/api/dash')body=snap;
  else if(u.pathname==='/api/session')body={handoff:id,tool:'claude',turns,spans:[]};
  else if(u.pathname==='/api/workitem')body={tree:[{id,goal:task.goal,log:[{note:'dispatched',ago:'10m',actor:'s-alice'},{note:'report: test added',ago:'2m',actor:'w-1'}]}]};
  else if(u.pathname==='/api/taskmsg')body={handoff:id,may:true,live:true,sent};
  else if(u.pathname==='/api/review')body={handoff:id,files:[]};else if(u.pathname==='/api/files')body={files:[]};else if(u.pathname==='/api/checks')body={runs:[]};
  else if(u.pathname==='/api/taskdetail')body={handoff:id,tool:'claude'};else if(u.pathname==='/api/log')body={lines:[],running:true};
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
const q=(s,n)=>(n||doc).querySelector(s),qa=(s,n)=>[...(n||doc).querySelectorAll(s)];
const conv=()=>q('#app-tab-body [data-k="conversation"]'),roles=()=>qa('[data-role]',conv()).map(n=>n.dataset.role),box=()=>q('#app-tab-body .app-msgbar textarea');
const key=(k,o={})=>{const e=new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true,ctrlKey:!!o.ctrl,shiftKey:!!o.shift,isComposing:!!o.composing});box().dispatchEvent(e);return e};
const type=t=>{box().value=t;box().dispatchEvent(new w.Event('input',{bubbles:true}))},sends=()=>posts.filter(p=>p.action==='task_msg');
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));assert(doc.body.classList.contains('app-mode'),'app mode is off');
 doc.dispatchEvent(new w.CustomEvent('app-task',{detail:{id:ID,mine:true,readOnly:false}}));await settle();
 // Sent messages are in the conversation, each where it falls in time, with its delivery state, as text.
 assert(conv(),'no conversation');
 assert.deepEqual(roles(),['user','assistant','sent','assistant','sent'],'messages not placed by time: '+roles());
 const [s1,s2]=qa('[data-role="sent"]',conv());
 assert(/^> You: please add a test/.test(s1.textContent)&&s1.dataset.state==='answered'&&/answered · 5m ago/.test(s1.textContent),'first message: '+s1.textContent);
 assert(/^> bob: and the docs/.test(s2.textContent)&&/read · 1m ago/.test(s2.textContent),'another person’s message: '+s2.textContent);
 assert(/libraos-core msg status msg-1/.test(q('.app-fstate',s1).title),'no msg status command');
 assert(!q('#app-tab-body img')&&s1.textContent.includes('<img'),'text went in as HTML');
 // History lists the work item's log, not "No history yet".
 const feed=q('#app-tab-body .app-feed[aria-label="History"]');assert(feed&&/dispatched/.test(feed.textContent)&&/test added/.test(feed.textContent),'history: '+(feed&&feed.textContent));
 assert(!/No history yet/.test(q('#app-tab-body').textContent),'No history yet');
 // The box says how it sends. Shift+Enter is a new line; Enter while composing is not a send.
 assert(box(),'no message box');assert(/Enter sends, Shift\+Enter adds a line/.test(box().placeholder),'placeholder: '+box().placeholder);
 box().focus();type('line one');let e=key('Enter',{shift:true});await settle();assert(!e.defaultPrevented&&!sends().length,'Shift+Enter sent');
 e=key('Enter',{composing:true});await settle();assert(!e.defaultPrevented&&!sends().length,'Enter while composing sent');
 // Enter sends; the box clears and the message shows in the conversation with its state.
 type('rename the flag');e=key('Enter');await settle();
 assert(e.defaultPrevented,'Enter was not taken');assert.equal(sends().length,1,'Enter did not send');assert.equal(sends()[0].body,'rename the flag');assert.equal(sends()[0].id,ID);
 assert.equal(doc.activeElement,box(),'the box lost its focus after the send');
 assert.equal(box().value,'','the box did not clear');
 const last=qa('[data-role="sent"]',conv()).pop();assert(last&&/^> You: rename the flag/.test(last.textContent)&&last.dataset.state==='unread'&&/sent, not fetched yet/.test(last.textContent),'the sent message does not show: '+conv().textContent);
 // Ctrl+Enter still sends.
 type('one more');key('Enter',{ctrl:true});await settle();assert.equal(sends().length,2,'Ctrl+Enter did not send');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_appmessages: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');process.exit(0)
})().catch(e=>{console.error(e);process.exit(1)});
