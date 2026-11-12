// #466: Settings > Diagnostics, owners only: for each agent found, Preview runs
// agentd connect TOOL --dry-run and shows what would change; Connect, offered
// after a clean preview, runs it and names the backups. Only {action,tool,dry_run}
// is sent, and the tool is one the server listed. A non-owner sees none of it.
// Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_connect.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const dash={user:'alice',role:'owner',now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{}};
const settings={owner:true,config:{},models:{},members:[{name:'alice',role:'owner'}],invites:[],personal:null,email:{},telegram:{},history:[],chat_roles:[]};
// connect is what GET /api/settings?diagnostics=1 sends (settings_connect.go).
const diag={doctor:[{id:'claude-mcp',status:'fail',detail:'not registered'}],services:[],checked_at:now,connect:[{tool:'claude',found:true},{tool:'codex',found:true},{tool:'opencode',found:false}]};
const posts=[];let failNext=null;
const replies={
 preview:t=>({tool:t,dry_run:true,ok:true,exit:0,output:[t+'    /h/.claude.json: would change: register agentd '+evil],backups:[]}),
 connect:t=>({tool:t,dry_run:false,ok:true,exit:0,output:[t+'    /h/.claude.json: registered agentd (backup /h/.claude.json.agentd-backup-1)'],backups:['/h/.claude.json.agentd-backup-1',evil]})};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#settings',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);let body={},status=200;
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/settings'){
   if(opts.method==='POST'){const data=JSON.parse(opts.body);posts.push(data);
    if(failNext){status=failNext.status;body={error:failNext.error};failNext=null}
    else body=data.dry_run?replies.preview(data.tool):replies.connect(data.tool)}
   else if(u.searchParams.has('diagnostics'))body=diag;else body=settings}
  return {ok:status<400,status,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const tab=name=>{const b=[...doc.querySelectorAll('#set-tabs button')].find(n=>n.textContent===name);assert(b,'no tab '+name);b.click()};
const box=()=>doc.getElementById('set-connect-result');
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 tab('Diagnostics');await settle();
 const diagBox=doc.getElementById('set-diagnostics');
 assert(diagBox.textContent.includes('Connect agents'),'no Connect agents section');
 // A Preview for each agent found, none for one not installed.
 const previews=[...diagBox.querySelectorAll('[data-connect-preview]')].map(b=>b.dataset.connectPreview);
 assert.deepEqual(previews,['claude','codex'],'Preview buttons');
 assert(diagBox.textContent.includes('Not installed'),'opencode not shown as not installed');
 assert(!diagBox.querySelector('[data-connect-apply]'),'Connect offered before a preview');
 // Preview: a dry run of that tool, nothing else sent; output as text.
 diagBox.querySelector('[data-connect-preview="claude"]').click();await settle();
 assert.deepEqual(posts.at(-1),{action:'connect',tool:'claude',dry_run:true});
 assert(!box().hidden,'result hidden');assert.equal(box().querySelector('[data-connect-head]').dataset.connectHead,'preview');
 assert(box().textContent.includes('nothing has changed yet'),box().textContent);
 assert(box().textContent.includes('would change: register agentd '+evil),'preview output');
 assert(!box().querySelector('img'),'output became markup');
 assert(!box().querySelector('[data-connect-backups]'),'a preview lists backups');
 // Connect: the same tool, without dry_run; names the backups as text.
 const apply=box().querySelector('[data-connect-apply="claude"]');assert(apply,'no Connect after a clean preview');
 apply.click();await settle();
 assert.deepEqual(posts.at(-1),{action:'connect',tool:'claude',dry_run:false});assert.equal(posts.length,2);
 assert(box().textContent.includes('Connected claude'),box().textContent);
 const listed=[...box().querySelectorAll('[data-connect-backups] li')].map(n=>n.textContent);
 assert.deepEqual(listed,['/h/.claude.json.agentd-backup-1',evil],'backups');
 assert(!box().querySelector('img'),'a backup path became markup');
 assert(!box().querySelector('[data-connect-apply]'),'Connect still offered after connecting');
 assert(doc.getElementById('toast').textContent.includes('Connected claude'),'no toast');
 // A refusal from the server is shown, and nothing is offered to apply.
 failNext={status:403,error:'Settings changes require a signed-in owner'};
 diagBox.querySelector('[data-connect-preview="codex"]').click();await settle();
 assert.equal(box().querySelector('[role=alert]')?.textContent,'Settings changes require a signed-in owner');
 assert(!box().querySelector('[data-connect-apply]'),'Connect offered after a refusal');
 // Buttons are usable again after each run.
 assert(![...diagBox.querySelectorAll('[data-connect-preview]')].some(b=>b.disabled),'buttons left disabled');
 // Wraps on a phone: the log and paths break anywhere.
 const css=[...doc.querySelectorAll('style')].map(n=>n.textContent).join('\n');
 assert(/\.set-connect-log\{[^}]*white-space:pre-wrap[^}]*overflow-wrap:anywhere/.test(css),'log does not wrap');
 // A non-owner gets no Connect section and sends nothing.
 settings.owner=false;w.eval("TOKEN='';COOKIE=true;USER='viewer';ROLE='viewer';settingsAccess()");await settle();
 tab('Diagnostics');await settle();
 assert(!doc.querySelector('#set-diagnostics [data-connect-preview]'),'a non-owner sees Preview');
 assert.equal(posts.length,3);
 assert(!errors.length,errors.join('\n'));
 console.log('dash_connect: ok',process.env.DASH_UI_PHONE==='1'?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
