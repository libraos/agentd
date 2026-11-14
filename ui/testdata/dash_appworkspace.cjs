// #565: the app's task workspace. An open task fills the centre's editor tabs (Session first, Terminal N,
// Log, file diffs labelled `path (diff)` with M/U, closable, + and Command) and the right sidebar's
// panels (Files Names/Contents, Changes `branch → base` with CHANGES and Push and open a draft PR,
// Checks with `not evidence`, Details with the budget's 85% warning, delivery and agent). No merge
// control anywhere in app mode. Another person's task is read only: Session, Log and diffs.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_appworkspace.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const task=(id,o)=>({id,title:'Fix login '+id,goal:'Fix the login retry '+id,accept:['retry is added'],state:'claimed',claimer:'w-'+id,from:'s-alice',from_user:'alice',worker:'claude',worker_tool:'claude',to:'any',project:'acme/demo-repo',stage:'implement',source:'interactive',updated_ago:'1m',dispatched:now,check:'go test ./...',
  retry:{tool:'claude',cwd:'/r/demo',budget:'30m',may:true},takeover:{cli:'agentd handoff claim '+id+' --takeover',may:true},cancel:{cli:'agentd handoff done '+id+' --cancel --reason R',may:true},editor:{dir:'/r/demo',may:true},report:'added the retry '+evil,...o});
const list=[task('hof-w1'),task('hof-w2',{from:'s-bob',from_user:'bob',takeover:null,cancel:null})];
const base={user:'alice',role:'owner',now,handoff_list:list,done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:['/r/demo'],dispatch:true,terminal:true,editor:{local:true,argv:['code']}};
const snap={...base,mode:'app',watchdog:{running:true},spend_today:{usd:1,workers:1,unpriced:0,pending:0}};
const review={handoff:'hof-w1',enabled:true,may:true,branch:'agentd/hof-w1',base_branch:'master',repo:'acme/demo-repo',remote:'origin',head:'abc1234',state:'claimed',added:2,deleted:0,proposed:true,
  files:[{path:'a.txt',added:1,deleted:0,diff:'diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1,2 @@\n hello\n+retry added '+evil},{path:'src/new.ts',added:1,deleted:0,diff:'diff --git a/src/new.ts b/src/new.ts\nnew file mode 100644\n--- /dev/null\n+++ b/src/new.ts\n@@ -0,0 +1 @@\n+export const x=1'}]};
const files={files:[{path:'a.txt',changed:'modified',size:20},{path:'src/new.ts',changed:'added',size:16},{path:'README.md',size:9}],changed:2};
const checks={check:'go test ./...',runs:[{result:'passed',actor:'worker',at:now,tests:'12 tests',revert_test:'not evidence: the added tests pass without the change'}]};
const detail=(frac,o)=>({handoff:'hof-w1',state:'claimed',show:'agentd handoff show hof-w1',tool:'claude',model:'claude-opus-5-5',branch:'agentd/hof-w1',cost:{minutes:9,usd:1.5},
  budget:{cap:'10m',used:Math.round(frac*10)+' of 10 min',fraction:frac,warn:frac>=0.85,over:frac>=1,warn_at:0.85,raise:'agentd handoff budget hof-w1 --budget 10m'},delivery:{outcome:'open',reason:'Still claimed: it is judged once it ends.',report:'agentd factory report'},...o});
let frac=0.9,hits={},posts=[],reviewOver={};
const workitem=id=>({tree:[{id,log:[{note:'report: tests pass '+evil,ago:'2m',actor:'w-'+id},{note:'message m1 from user alice to its worker w: please add a test',ago:'1m'},{note:'claimed',ago:'5m',actor:'w-'+id}]}]});
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21470/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.WebSocket=class{constructor(u){this.url=u;this.readyState=0;(w.SOCKETS=w.SOCKETS||[]).push(u)}send(){}close(){this.readyState=3}};
 w.Terminal=class{open(){}onData(){}resize(){}write(){}focus(){}dispose(){}};
 w.fetch=async(url,o)=>{const u=new URL(url,w.location.href),id=u.searchParams.get('id')||u.searchParams.get('ref');hits[u.pathname]=(hits[u.pathname]||0)+1;let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/action'){posts.push(JSON.parse(o.body));body={ok:true}}
  else if(u.pathname==='/api/dash')body=snap;
  else if(u.pathname==='/api/review')body=reviewOver[id]||{...review,handoff:id,branch:'agentd/'+id};
  else if(u.pathname==='/api/files')body=u.searchParams.get('path')?{text:'# readme',size:8}:files;
  else if(u.pathname==='/api/checks')body=checks;
  else if(u.pathname==='/api/taskdetail')body=detail(frac,{handoff:id});
  else if(u.pathname==='/api/workitem')body=workitem(id);
  else if(u.pathname==='/api/taskmsg')body={may:id==='hof-w1',live:true};
  else if(u.pathname==='/api/log')body={lines:['line one','line two '+evil],running:false};
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
const $=id=>doc.getElementById(id),q=(s,n)=>(n||doc).querySelector(s),qa=(s,n)=>[...(n||doc).querySelectorAll(s)];
const tabs=()=>qa('#app-tabs [role=tab]'),tabText=()=>tabs().map(t=>t.querySelector('.app-tlabel').textContent),cur=()=>q('#app-tabs [aria-selected="true"]');
const panel=n=>$('app-panel-'+n),click=n=>{assert(n,'nothing to click');n.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}))};
const shown=n=>{for(let x=n;x&&x!==doc;x=x.parentElement)if(x.hidden)return false;return true};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));assert(doc.body.classList.contains('app-mode'),'app mode is off');
 assert.equal(typeof w.appSelect,'function','no appSelect seam for #564');
 // The sidebar's event opens a task (#563's seam): Session first and only.
 doc.dispatchEvent(new w.CustomEvent('app-task',{detail:{id:'hof-w1',mine:true,readOnly:false}}));await settle();
 assert.deepEqual(tabText(),['Session']);assert.equal(cur().dataset.kind,'session');assert(!q('.app-tclose',tabs()[0]),'Session closes');
 // Session: the task, its latest report and its history as text, and a message box to the worker.
 const body=$('app-tab-body');assert(/Fix login hof-w1/.test(body.textContent),'no title');assert(/Fix the login retry/.test(body.textContent)&&/retry is added/.test(body.textContent),'no goal or done-when');
 assert(/tests pass/.test(body.textContent)&&/please add a test/.test(body.textContent),'no history');assert(!q('img',body),'text went in as HTML');
 const ta=q('.app-msgbar textarea',body);assert(ta&&shown(ta),'no message box');ta.value='add a test';ta.dispatchEvent(new w.Event('input'));click(q('.app-msgbar .app-primary',body));await settle();
 assert(posts.some(p=>p.action==='task_msg'&&p.id==='hof-w1'&&p.body==='add a test'),'the message was not sent');
 // + opens Terminal 1, 2, 3 (numbered sockets) and Log; no fourth terminal.
 const plus=q('#app-center [data-app-action="new-tab"]'),cmd=q('#app-center [data-app-action="command"]');assert(plus.getAttribute('aria-disabled')!=='true'&&cmd.getAttribute('aria-disabled')!=='true','+ or Command is still off');
 for(let i=0;i<3;i++){click(plus);await tick();click(q('.app-menu [data-act="terminal"]'));await settle()}
 assert.deepEqual(tabText(),['Session','Terminal 1','Terminal 2','Terminal 3']);assert.equal(cur().dataset.kind,'term');
 assert.deepEqual(w.SOCKETS.map(u=>new URL(u).search),['?id=hof-w1','?id=hof-w1&n=2','?id=hof-w1&n=3'],'terminal sockets: '+w.SOCKETS);
 click(plus);await tick();assert.equal(q('.app-menu [data-act="terminal"]').getAttribute('aria-disabled'),'true','a fourth terminal is offered');
 click(q('.app-menu [data-act="log"]'));await settle();assert.equal(tabText().pop(),'Log');assert(/line two/.test(body.textContent)&&!q('img',body),'Log: '+body.textContent);
 // Closing a tab: the × closes Terminal 2 and its socket goes.
 click(q('#app-tabs [data-tab="term:2"] .app-tclose'));await settle();assert.deepEqual(tabText(),['Session','Terminal 1','Terminal 3','Log']);
 // Changes: branch → base, CHANGES 2 with +N and M/U, Push and open a draft PR; a click opens the diff tab.
 const ch=panel('changes');assert(/agentd\/hof-w1/.test(q('.app-branch',ch).textContent)&&/master/.test(q('.app-base',ch).textContent),'no branch → base');
 assert.equal(q('.app-chead [data-n]',ch).textContent,'2');const rows=qa('.app-crow',ch);assert.deepEqual(rows.map(r=>r.dataset.mark),['M','U']);assert.deepEqual(rows.map(r=>q('.app-n.add',r).textContent),['+1','+1']);
 const pr=q('[data-act="open_pr"]',ch);assert(pr&&/Push and open a draft PR/.test(pr.textContent)&&/agentd handoff pr hof-w1/.test(ch.textContent),'no Push and open a draft PR');
 click(pr);await settle();const sh=q('dialog[open]');assert(sh&&/Open a draft pull request/.test(sh.textContent),'no confirm before the push');assert(!posts.some(p=>p.action==='open_pr'),'pushed without a confirm');
 const cancel=qa('button',sh).find(b=>/^Cancel$/.test(b.textContent.trim()));if(cancel)click(cancel);else doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await settle();
 click(rows[0]);await settle();assert.equal(tabText().pop(),'a.txt (diff)');assert.equal(cur().dataset.mark,'M');assert.equal(q('.app-tmark',cur()).textContent,'M');
 assert(q('.app-diff .app-dadd',body)&&/retry added/.test(q('.app-diff',body).textContent)&&!q('img',body),'no diff');assert.equal(q('.app-diff .app-dadd',body).dataset.n,'2','new-side line number');
 click(qa('.app-crow',panel('changes'))[1]);await settle();assert.equal(tabText().pop(),'new.ts (diff)');assert.equal(cur().dataset.mark,'U');
 // Files: Names lists with marks; a changed file opens its diff, another its text; Contents searches the changed lines.
 const fp=panel('files');assert.deepEqual(qa('.app-seg button',fp).map(b=>b.textContent),['Names','Contents']);assert.deepEqual(qa('.app-frow',fp).map(r=>r.dataset.mark||''),['M','U','']);
 click(qa('.app-frow',fp)[2]);await settle();assert.equal(tabText().pop(),'README.md');assert(/# readme/.test(body.textContent));
 click(q('.app-seg [data-seg="contents"]',panel('files')));await tick();const inp=q('.app-find input',panel('files'));inp.value='retry';inp.dispatchEvent(new w.Event('input'));await tick();
 assert(/retry added/.test(panel('files').textContent)&&qa('.app-frow',panel('files')).length===1,'Contents: '+panel('files').textContent);
 // Checks: the run and the revert test's not evidence.
 const ck=panel('checks');assert(/go test/.test(ck.textContent)&&q('.check-noev',ck)&&/not evidence/.test(q('.check-noev',ck).textContent),'Checks: '+ck.textContent);
 // Details: at 90% the budget warns; agent and model; delivery with its reason.
 const dt=panel('details');assert(q('[data-sec="budget"][data-warn]',dt)&&q('[data-k="budget-warn"]',dt),'no 85% warning at 90%');assert(/85%/.test(dt.textContent));
 assert.equal(q('.app-meter',dt).getAttribute('aria-valuenow'),'90');assert(/Claude/.test(dt.textContent)&&/Claude Opus 5\.5/.test(dt.textContent)&&/agentd\/hof-w1/.test(dt.textContent),'no agent');
 assert(/judged once it ends/.test(dt.textContent)&&/agentd handoff budget hof-w1 --budget 10m/.test(dt.textContent),'no delivery or raise');assert(q('[data-task-act="editor"]',dt),'no Open in editor');
 // Command: actions by state, each with its command.
 click(cmd);await tick();const m=q('.app-menu[data-menu="command"]');assert(m,'no Command menu');
 for(const k of ['stop','takeover','retry','set_check','cancel','open_editor'])assert(q('[data-act="'+k+'"]',m),'Command has no '+k);
 assert.equal(q('[data-act="takeover"]',m).dataset.cli,'agentd handoff claim hof-w1 --takeover');assert(/agentd handoff dispatch hof-w1 --tool claude --cwd \/r\/demo/.test(q('[data-act="retry"]',m).textContent));
 assert(/--run-check/.test(q('[data-act="retry_check"]',m).textContent),'retry check names no command');
 click(q('[data-act="stop"]',m));await settle();const st=q('dialog[open]');assert(st&&/Stop this worker/.test(st.textContent),'Stop asks no confirm');
 const keep=qa('button',st).find(b=>/^Cancel$/.test(b.textContent.trim()));if(keep)click(keep);else doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await settle();
 // No merge control in app mode, anywhere in the frame or a menu.
 click(cmd);await tick();const all=[...qa('#app-shell button,#app-shell a,#app-shell [role=menuitem]'),...qa('.app-menu button')];
 assert(!all.some(b=>/\bmerge\b/i.test(b.textContent)&&!/never merges/i.test(b.textContent)),'a merge control: '+all.filter(b=>/merge/i.test(b.textContent)).map(b=>b.textContent));
 assert(!q('[data-act*="merge"],[data-action*="merge"]'),'a merge action');click(doc.body);await tick();
 // Under 85% there is no warning; at its cap it is over.
 frac=0.2;w.awDetails('hof-w1',true);await settle();assert(!q('[data-sec="budget"][data-warn]',panel('details'))&&!q('.app-bwarn',panel('details')),'warned at 20%');
 frac=1.1;w.awDetails('hof-w1',true);await settle();assert(q('[data-sec="budget"][data-over]',panel('details'))&&q('[data-k="budget-over"]',panel('details')),'not over at 110%');
 // Another person's task: read only. Session, Log and diffs; no terminal, message box, actions or push.
 doc.dispatchEvent(new w.CustomEvent('app-task',{detail:{id:'hof-w2',mine:false,readOnly:true}}));await settle();
 assert.deepEqual(tabText(),['Session']);assert(!q('.app-msgbar textarea',body),'a message box on another’s task');assert(/read only/.test(body.textContent));
 assert.equal(plus.getAttribute('aria-disabled'),'true');assert.equal(cmd.getAttribute('aria-disabled'),'true');click(plus);click(cmd);await tick();assert(!q('.app-menu'),'a menu on another’s task');
 assert(!q('[data-act="open_pr"]',panel('changes')),'Push on another’s task');assert(!q('[data-task-act]',panel('details')),'an action in Details on another’s task');
 click(qa('.app-crow',panel('changes'))[0]);await settle();assert.equal(tabText().pop(),'a.txt (diff)','no diff on another’s task');
 // Back to my task: its tabs are as I left them.
 w.appSelect('hof-w1');await settle();assert.equal(tabText()[1],'Terminal 1');
 // #603: a worker that committed on the user's own branch: Changes lists that commit's files, and only
 // publishing says the branch is not agentd's. "has not committed" only with no commit since dispatch.
 const why='the worker\'s branch todo-clear is not agentd/hof-w1, the branch agentd made for this handoff, so agentd will not push it';
 reviewOver['hof-w1']={handoff:'hof-w1',enabled:true,may:false,may_why:'',branch:'todo-clear',foreign:true,why_not:why,base_branch:'main',head:'4865e61',base:'1111111',commits:1,state:'done',added:68,deleted:1,proposed:false,
  files:[{path:'todo.js',added:60,deleted:1,diff:'+x'},{path:'todo.test.js',added:8,deleted:0,diff:'+y'}]};
 w.awChanges('hof-w1',true);await settle();let cg=panel('changes');
 assert(/todo-clear/.test(q('.app-branch',cg).textContent),'no worker branch: '+cg.textContent);assert.equal(q('.app-chead [data-n]',cg).textContent,'2');
 assert.deepEqual(qa('.app-crow',cg).map(r=>r.dataset.path),['todo.js','todo.test.js']);assert(/\+68 −1/.test(q('.app-chead',cg).textContent),'no totals');
 assert(!/has not committed/.test(cg.textContent),'says has not committed: '+cg.textContent);assert(cg.textContent.includes('will not push it'),'publishing does not say why');
 assert.equal(q('[data-act="open_pr"]',cg).getAttribute('aria-disabled'),'true','push is offered for a branch agentd did not make');
 reviewOver['hof-w1']={...reviewOver['hof-w1'],files:[],added:0,deleted:0,commits:0};w.awChanges('hof-w1',true);await settle();cg=panel('changes');
 assert(/has not committed/.test(q('[data-k="none"]',cg).textContent),'no commit is not said: '+cg.textContent);assert(q('[data-k="publish"]',cg)&&cg.textContent.includes('will not push it'));
 reviewOver['hof-w1']={handoff:'hof-w1',enabled:true,branch:null,why_not:'no worker ran for this handoff'};w.awChanges('hof-w1',true);await settle();cg=panel('changes');
 assert(!/has not committed/.test(cg.textContent),'has not committed without a count: '+cg.textContent);assert(/no worker ran/.test(cg.textContent));
 delete reviewOver['hof-w1'];w.awChanges('hof-w1',true);await settle();
 assert(!errors.length,errors.join('\n'));
 // The page's own phone layout: tabs scroll, the right panels are the drawer the frame already has.
 if(phone)assert(doc.body.classList.contains('app-mode'));
 console.log('dash_appworkspace: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');process.exit(0)
})().catch(e=>{console.error(e);process.exit(1)});
