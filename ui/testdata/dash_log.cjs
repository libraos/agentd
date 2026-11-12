// The Log section of a task (region:worker-log): DASH_UI_DOM_MODULE=/path/to/jsdom node testdata/dash_log.cjs dash.html
// A running worker's new lines appear without a reload, as text; polling stops when it ends or the section
// closes; a refused or missing log says so. Run in the phone layout and both themes (DASH_UI_PHONE, DASH_UI_THEME).
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),errors=[],requests=[];
const h={id:'hof-test',title:'Fix the dashboard workflow',goal:'Fix the dashboard workflow',state:'claimed',claimer:'codex-test',from:'codex-test',from_user:'alice',worker:'codex',to:'any',project:'acme/repo',stage:'implement',source:'interactive',updated_ago:'1m',dispatched:now,attempts:[{running:true,minutes:2}]};
const dash={user:'alice',role:'owner',now,handoff_list:[h],sessions:[{id:'codex-test',label:'worker',tool:'codex',status:'active',user:'alice',cwd:'/tmp/repo',seen_ago:'1m'}],left:[],unlinked:[],inbox:[],waiting:[],done:[],claims:[],prs:[],issues:[]};
const evil='<img src=x onerror=alert(1)>';
let log={handoff:'hof-test',state:'claimed',running:true,lines:['step 1','token [redacted] used',evil],truncated:false,redacted:1,limit:200},logStatus=200;
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#inbox',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{}]};
 w.fetch=async(url,opts={})=>{requests.push(String(url));const u=new URL(url,w.location.href);let body={},status=200;
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/workitem')body={kind:'handoff',ref:'hof-test',tree:[h],prs:[]};
  else if(u.pathname==='/api/log'){status=logStatus;body=status===200?JSON.parse(JSON.stringify(log)):{}}
  else if(u.pathname==='/api/result')body={files:[]};
  else if(u.pathname==='/api/review')body={handoff:u.searchParams.get('id'),branch:null};
  else if(u.pathname==='/api/chat')body={chats:[],roles:[],gateway_ready:false};
  return {ok:status<400,status,json:async()=>body,text:async()=>status===404?'no such task\n':JSON.stringify(body)}};
}});
const w=dom.window,tick=(ms=25)=>new Promise(r=>setTimeout(r,ms));
const logReqs=()=>requests.filter(u=>u.startsWith('/api/log')).length;
const panel=()=>w.document.querySelector('#hist details[data-wlog="hof-test"]');
const open=async d=>{d.open=true;d.dispatchEvent(new w.Event('toggle'));await tick();await tick()};
(async()=>{
 await tick();await tick();assert(!errors.length,errors.join('\n'));
 const css=[...w.document.querySelectorAll('style')].map(n=>n.textContent).join('\n');assert(css.includes('region:css-worker-log')&&/\.wlog-lines\{[^}]*overflow-wrap:anywhere/.test(css),'log lines must wrap in the phone layout');
 w.eval('WLOG_EVERY=40');
 w.eval("showWorkItem('hof-test')");await tick();await tick();
 let d=panel();assert(d,'the task has no Log section');assert.equal(d.querySelector('summary').textContent,'Log');assert(!d.open,'Log opens closed');
 assert.equal(logReqs(),0,'a closed Log section read the log');
 await open(d);d=panel();
 assert.equal(requests.find(u=>u.startsWith('/api/log')),'/api/log?id=hof-test');
 let pre=d.querySelector('pre.wlog-lines');assert(pre,'no log lines');assert.equal(pre.textContent,['step 1','token [redacted] used',evil].join('\n'));
 assert(!d.querySelector('img'),'log text became markup');
 assert(d.textContent.includes('Live: new lines appear while the worker runs.')&&d.textContent.includes('1 secret hidden.'),'status: '+d.textContent);
 assert(!d.querySelector('input,textarea,[contenteditable]'),'the Log section takes input');
 // New lines arrive without a reload while it runs.
 log.lines=[...log.lines,'step 2','step 3'];await tick(120);
 pre=panel().querySelector('pre.wlog-lines');assert(pre.textContent.endsWith('step 2\nstep 3'),'new lines did not appear: '+pre.textContent);
 // A redraw of the work item keeps the section open and polling.
 w.eval("showWorkItem('hof-test')");await tick();assert(panel().open,'a redraw closed the Log section');
 log.lines=[...log.lines,'step 4'];await tick(120);assert(panel().querySelector('pre.wlog-lines').textContent.endsWith('step 4'),'polling stopped after a redraw');
 // The worker ends: one last read, then no more.
 log={...log,running:false,state:'done',lines:[...log.lines,'finished']};await tick(120);
 const after=logReqs();await tick(200);assert.equal(logReqs(),after,'still polling after the worker ended');
 d=panel();assert(d.querySelector('pre.wlog-lines').textContent.endsWith('finished'));assert(d.textContent.includes('The worker is not running; this is the end of its log.'),'ended status: '+d.textContent);
 // Closing the section stops polling for a running worker too.
 log={...log,running:true,state:'claimed'};w.eval("delete WLOG['hof-test']");w.eval("showWorkItem('hof-test')");await tick();d=panel();await open(d);
 d.open=false;d.dispatchEvent(new w.Event('toggle'));const closed=logReqs();await tick(200);assert.equal(logReqs(),closed,'still polling a closed Log section');
 // A log that was cleaned up, and a task the person cannot see.
 log={handoff:'hof-test',state:'done',running:false,lines:[],missing:true,note:'The worker log is gone; it was cleaned up or moved.'};w.eval("delete WLOG['hof-test']");w.eval("showWorkItem('hof-test')");await tick();d=panel();await open(d);
 assert(panel().textContent.includes('cleaned up'),'missing log: '+panel().textContent);assert(!panel().querySelector('pre'));
 logStatus=404;w.eval("delete WLOG['hof-test']");w.eval("showWorkItem('hof-test')");await tick();d=panel();await open(d);
 assert(panel().textContent.includes('You cannot see this task’s log.'),'refused: '+panel().textContent);
 assert(!errors.length,errors.join('\n'));
 console.log('dash_log ok',process.env.DASH_UI_PHONE==='1'?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
