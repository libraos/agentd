// Review M5 and m5 (personal app refresh item 5): terminal commands are not the main text.
// By default the Command menu, the workspace header, New task, Details, Changes, Triggers and Settings put
// each command behind a "Same in a terminal" disclosure or a copy icon whose tooltip names it; the copy
// icon copies exactly that command (or, with no clipboard, shows it). One preference in Settings,
// Terminal commands, shows them inline again; it is kept per viewer in localStorage
// (dash-cli-inline.USER), and where storage throws the page still works and the choice lasts for the page.
// Commands are built from CLI and quote their words as before. Triggers (m5): a schedule's next run is
// a friendly time in the viewer's zone with its UTC value only in the tooltip, and a run that started a
// task reads as the task does (Working, Done), not "Unassigned" with "done" as its reason.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_appcli.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',theme=process.env.DASH_UI_THEME||'light',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const html=fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8');
const task=(id,o)=>({id,title:'Fix login '+id,goal:'Fix the login retry '+id,accept:['retry is added'],state:'claimed',claimer:'w-'+id,from:'s-alice',from_user:'alice',mine:true,worker:'claude',worker_tool:'claude',to:'any',project:'acme/demo-repo',stage:'implement',source:'interactive',updated_ago:'1m',dispatched:now,mark:'working',
  check:'go test ./... | tail',retry:{tool:'claude',cwd:'/r/my demo',budget:'30m',may:true},takeover:{cli:'libraos-engine handoff claim '+id+' --takeover',may:true},cancel:{cli:'libraos-engine handoff done '+id+' --cancel --reason R',may:true},...o});
const base={user:'alice',role:'owner',now,handoff_list:[task('hof-c1')],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:['/r/demo'],dispatch:true,terminal:true,
  mode:'app',watchdog:{running:true},spend_today:{usd:1,workers:1,unpriced:0,pending:0,user:'alice'}};
const review={handoff:'hof-c1',enabled:true,may:true,branch:'agentd/hof-c1',base_branch:'main',repo:'acme/demo-repo',remote:'origin',head:'abc1234',state:'claimed',added:1,deleted:0,proposed:true,files:[{path:'a.txt',added:1,deleted:0,diff:'@@ -1 +1,2 @@\n a\n+b'}]};
const detail={handoff:'hof-c1',state:'claimed',show:'libraos-engine handoff show hof-c1',tool:'claude',branch:'agentd/hof-c1',cost:{minutes:9,usd:1.5},
  budget:{cap:'10m',used:'5 of 10 min',fraction:0.5,raise:'libraos-engine handoff budget hof-c1 --budget 20m'},delivery:{outcome:'open',reason:'Still claimed.',report:'libraos-engine factory report'}};
const nextRun=new Date(Date.now()+3600e3).toISOString();
const triggers={status:{enabled:false,problem:'',problem_when_enabled:'',repos:['acme/web'],authors:['alice'],label:'fix',budget:'30m',max_per_day:3,dirs:{},offers:[]},templates:[],repo:'acme/web',author:'alice',enable:'libraos-engine config set triggers.enabled true',
  schedules:{schedules:[{schedule:'/src/web#nightly',name:'nightly',dir:'/src/web',enabled:true,next_run:nextRun,definition:{cron:'0 3 * * *',timezone:'UTC',goal:'Update deps '+evil},
    runs:[{id:'r1',scheduled_for:now,status:'offered',handoff:'hof-c1',handoff_state:'claimed'},{id:'r2',scheduled_for:now,status:'offered',handoff:'hof-old',handoff_state:'done'},{id:'r3',scheduled_for:now,status:'skipped_precheck',reason:'precheck exited 1'}]}]}};
const obState={flowVersion:4,closedAt:12345,outcome:'completed',lastCompletedStep:5,checklist:{},surface:'terminal',defaultAgent:'codex',theme:'system',sound:'system',notifications:false,guideHidden:true,toursSeen:['tasks'],toastShown:true};
const obFacts={os:'linux',repositories:[],task_files:0,clients:[],default_tool:'codex',first_task:{done:true,handoff:null,count:1},gh:'connected',linear:false,commands:{}};
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
// boot: storage 'ok' or 'throw' (every dash-cli-inline key refused), preset localStorage entries, clipboard on or off.
async function boot(o={}){const errors=[],vc=new VirtualConsole(),clip=[],posts=[];let trigCode=200;
  vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
  const dom=new JSDOM(html,{url:'http://127.0.0.1:21470/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',theme);for(const [k,v] of Object.entries(o.preset||{}))w.localStorage.setItem(k,v);
    if(o.storage==='throw')for(const m of ['getItem','setItem','removeItem']){const f=w.Storage.prototype[m];w.Storage.prototype[m]=function(k,...a){if(/^dash-cli-inline/.test(k))throw new w.DOMException('denied','SecurityError');return f.call(this,k,...a)}}
    if(o.clipboard!==false)Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{writeText:async t=>{clip.push(t)}}});
    w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
    w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
    w.WebSocket=class{constructor(){this.readyState=0}send(){}close(){this.readyState=3}};w.Terminal=class{open(){}onData(){}resize(){}write(){}focus(){}dispose(){}};
    w.fetch=async(url,init)=>{const u=new URL(url,w.location.href),id=u.searchParams.get('id')||u.searchParams.get('ref');let body={},status=200;
      if(u.pathname==='/api/auth')return {ok:true,status:204};
      if(init&&init.method==='POST'&&u.pathname!=='/api/onboarding')posts.push(u.pathname+' '+init.body);
      if(u.pathname==='/api/dash')body=base;
      else if(u.pathname==='/api/review')body=review;
      else if(u.pathname==='/api/files')body={files:[{path:'a.txt',changed:'modified',size:2}],changed:1};
      else if(u.pathname==='/api/checks')body={check:'go test ./...',runs:[]};
      else if(u.pathname==='/api/taskdetail')body={...detail,handoff:id};
      else if(u.pathname==='/api/workitem')body={tree:[{id,log:[]}]};
      else if(u.pathname==='/api/session')body={turns:[]};
      else if(u.pathname==='/api/taskmsg')body={may:true,live:true};
      else if(u.pathname==='/api/triggers'){status=trigCode;body=trigCode===200?triggers:{error:'Triggers are for owners'}}
      else if(u.pathname==='/api/onboarding')body={user:'alice',state:obState,facts:obFacts};
      return {ok:status<400,status,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
  const w=dom.window,doc=w.document;await settle();assert(!errors.length,errors.join('\n'));assert(doc.body.classList.contains('app-mode'),'app mode is off');
  const t={w,doc,clip,posts,errors,$:id=>doc.getElementById(id),q:(s,n)=>(n||doc).querySelector(s),qa:(s,n)=>[...(n||doc).querySelectorAll(s)],setTrig:c=>{trigCode=c},
    click:n=>{assert(n,'nothing to click');n.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}))},
    open:async id=>{doc.dispatchEvent(new w.CustomEvent('app-task',{detail:{id,mine:true,readOnly:false}}));await settle()},
    page:async name=>{w.appPage(name);await settle()},
    menu:async()=>{if(t.q('.app-menu'))t.click(doc.body);await tick();t.click(t.q('#app-center [data-app-action="command"]'));await tick();const m=t.q('.app-menu[data-menu="command"]');assert(m,'no Command menu');return m},
    ok:()=>assert(!errors.length,errors.join('\n'))};
  return t}
const SHOW='libraos-engine handoff show hof-c1',RETRY="libraos-engine handoff dispatch hof-c1 --tool claude --cwd '/r/my demo'",CHECK="libraos-engine handoff check hof-c1 --check 'go test ./... | tail'";
const UTC=/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d UTC$/;
(async()=>{
 // 1. Default: copy icons and disclosures, nothing inline.
 let t=await boot();const {q,qa,$}=t;
 assert(/region:cli-same/.test(html)&&/region:css-cli-same/.test(html),'no cli-same regions');
 await t.open('hof-c1');
 // Workspace header: a copy icon whose tooltip is "Same in a terminal: CMD", no command text.
 const meta=q('#app-tab-body .app-smeta');assert(meta,'no session header');assert(!/handoff show/.test(meta.textContent),'the header shows its command as text: '+meta.textContent);
 const hc=q('.cli-copy',meta);assert(hc&&hc.dataset.cli===SHOW,'no copy icon for handoff show');assert.equal(hc.title,'Same in a terminal: '+SHOW+' (click to copy)');
 assert(/Same in a terminal/.test(hc.getAttribute('aria-label'))&&hc.getAttribute('type')==='button'&&q('svg',hc),'the copy icon has no name or icon');
 t.click(hc);await tick();assert.deepEqual(t.clip,[SHOW],'Copy did not copy the command');assert(/Copied: libraos-engine handoff show hof-c1/.test($('toast').textContent),'no Copied toast');
 // Command menu: each command is the copy icon beside its item, built from CLI and quoted as before; no command line under a label.
 let m=await t.menu();assert(!q('.app-mitem code',m),'a command line under an item');
 const rowCli=k=>{const b=q('[data-act="'+k+'"]',m);assert(b,'no '+k);const r=b.closest('.app-mrow');return r&&q('.cli-copy',r)};
 assert.equal(rowCli('retry').dataset.cli,RETRY);assert.equal(rowCli('set_check').dataset.cli,CHECK);assert.equal(rowCli('takeover').dataset.cli,'libraos-engine handoff claim hof-c1 --takeover');
 assert.equal(q('[data-act="retry"]',m).dataset.cli,RETRY,'the item lost its data-cli');assert(!rowCli('stop'),'Stop has a command icon, but no command does it');
 const rc=q('[data-act="retry_check"]',m);assert(!/--run-check/.test(rc.textContent)&&q('.cli-copy',rc).dataset.cli==='libraos-engine handoff done hof-c1 --run-check','retry check: '+rc.textContent);
 t.clip.length=0;t.click(rowCli('retry'));await tick();assert.deepEqual(t.clip,[RETRY]);assert(q('.app-menu'),'copying closed the menu');assert(!q('dialog[open]')&&!t.posts.length,'copying ran the action');
 // Arrow keys still move between the items, not the copy icons.
 q('.app-mitem',m).focus();doc_key(t,'ArrowDown');assert(t.doc.activeElement.classList.contains('app-mitem'),'ArrowDown left the items');
 t.click(t.doc.body);await tick();
 // Details: each section's command is a copy icon in its heading.
 const dt=$('app-panel-details');assert(!q('code.app-cli',dt),'Details shows a command line');
 const secCli=s=>{const c=q('[data-sec="'+s+'"] h4 .cli-copy',dt);return c&&c.dataset.cli};
 assert.equal(secCli('agent'),detail.show);assert.equal(secCli('budget'),detail.budget.raise);assert.equal(secCli('delivery'),detail.delivery.report);
 assert(/^Raise it in a terminal: /.test(q('[data-sec="budget"] h4 .cli-copy',dt).title),'the raise icon does not say what it does');
 // Changes: Push and open a draft PR keeps its button; its command is a copy icon.
 const ch=$('app-panel-changes');assert(q('[data-act="open_pr"]',ch),'no Push and open a draft PR');assert(!/Same as:/.test(ch.textContent),'Changes shows Same as:');
 assert(q('.cli-copy[data-cli="libraos-engine handoff pr hof-c1"]',ch),'no copy icon for handoff pr');
 // New task: the command is folded under "Same in a terminal", with Copy; the goal is quoted as before.
 t.click(q('#app-shell [data-app-action="new-task"]'));await settle();const dlg=$('app-newtask');assert(dlg,'no New task');
 const same=q('details.appnt-same',dlg);assert(same&&!same.open&&q('summary',same).textContent==='Same in a terminal','New task: no closed disclosure');assert(same.contains($('appnt-cmd')),'the command is not inside it');
 const goal=q('#appnt-goal',dlg);goal.value="it's done";goal.dispatchEvent(new t.w.Event('input'));await tick();
 assert(/^libraos-engine new 'it'\\''s done' --cwd \/r\/demo /.test($('appnt-cmd').textContent),'New task line: '+$('appnt-cmd').textContent);
 t.clip.length=0;t.click(q('.cli-copy',same));await tick();assert.deepEqual(t.clip,[$('appnt-cmd').textContent],'New task Copy');
 t.click(q('.appnt-x',dlg)||q('[aria-label="Close"]',dlg));await settle();
 // Triggers: commands in disclosures; m5 next run and run status.
 await t.page('triggers');const p=$('app-page');assert(/Triggers/.test(p.textContent),'no Triggers page');
 const card=q('[data-appt="trigger"]',p),on=q('details.cli-same',card);assert(on&&q('summary',on).textContent==='Turn on from a terminal'&&/libraos-engine config set triggers\.enabled true/.test(on.textContent),'trigger card: '+card.textContent);
 const night=q('[data-schedule="nightly"]',p),sd=q('details.cli-same',night);assert(sd&&q('summary',sd).textContent==='Same in a terminal'&&q('.cli-copy',sd).dataset.cli==='libraos-engine schedule run nightly --repo /src/web','schedule command');
 const nr=q('[data-appt="next-run"]',night);assert(nr,'no next run');assert(/^(today|tomorrow) \d\d:\d\d \S+/.test(nr.textContent),'next run: '+nr.textContent);
 assert(UTC.test(nr.title)&&nr.getAttribute('datetime')===nextRun,'next run tooltip: '+nr.title);
 const st=q('.appt-state',night).textContent;assert(!/\d{4}-\d\d-\d\dT|\(/.test(st),'the ISO time is on the page: '+st);
 const cells=qa('tbody tr',night).map(r=>Object.fromEntries(qa('td',r).map(c=>[c.dataset.label,c.textContent])));
 assert.deepEqual(cells.map(c=>[c.Status,c.Why]),[['Working','—'],['Done','—'],['skipped precheck','precheck exited 1']],'runs: '+JSON.stringify(cells));
 assert(!qa('td',night).some(c=>c.textContent==='Unassigned'),'a run reads Unassigned');assert(UTC.test(q('tbody time',night).title),'a due time has no UTC tooltip');
 assert(night.textContent.includes('Update deps '+evil)&&!q('img',p),'text became markup');
 t.setTrig(403);await t.page('');await t.page('triggers');const ro=$('app-page');
 assert.equal(qa('details.cli-same',ro).length,2,'read-only: two disclosures');assert(/libraos-engine trigger status/.test(ro.textContent)&&/libraos-engine schedule run NAME/.test(ro.textContent),'read only: '+ro.textContent);
 // Settings: the commands in a disclosure, and the preference that shows them inline.
 await t.page('settings');await settle();let sp=$('app-page');const pref=q('[data-pref="cli"]',sp);assert(pref,'no Terminal commands preference');
 const tog=q('[data-app-pref="cli"]',sp);assert.equal(tog.textContent,'Show inline');assert.equal(tog.getAttribute('aria-pressed'),'false');
 const sd2=q('details.cli-same',sp);assert(sd2&&/libraos-engine config set dispatch\.default_tool codex/.test(sd2.textContent)&&/libraos-engine connect TOOL/.test(sd2.textContent),'Settings commands: '+sp.textContent);
 assert(!qa(':scope > section > code',sp).length,'Settings shows commands as text');
 t.click(tog);await settle();sp=$('app-page');
 assert.equal(t.w.localStorage.getItem('dash-cli-inline.alice'),'1','the preference is not kept for this viewer');
 assert.equal(q('[data-app-pref="cli"]',sp).textContent,'Hide');assert.equal(q('[data-app-pref="cli"]',sp).getAttribute('aria-pressed'),'true');assert.equal(t.doc.activeElement,q('[data-app-pref="cli"]',sp),'focus left the toggle');
 assert(!q('details.cli-same',sp)&&/libraos-engine connect TOOL/.test(q('[data-cli-same="inline"]',sp).textContent),'Settings inline');
 // Inline everywhere, at once for the open task.
 await t.page('');const meta2=q('#app-tab-body .app-smeta');assert(q('code',meta2)&&q('code',meta2).textContent===SHOW&&!q('.cli-copy',meta2),'header inline');
 m=await t.menu();assert.equal(q('[data-act="retry"] code',m).textContent,RETRY);assert(!q('.app-mrow',m)&&!q('.cli-copy',m),'inline menu still has icons');
 assert(/--run-check/.test(q('[data-act="retry_check"]',m).textContent),'retry check inline');t.click(t.doc.body);await tick();
 assert.deepEqual(qa('#app-panel-details code.app-cli').map(c=>c.textContent),[detail.show,detail.budget.raise,detail.delivery.report],'Details inline');assert(!q('#app-panel-details .cli-copy'),'Details inline has icons');
 assert(/Same as: libraos-engine handoff pr hof-c1/.test($('app-panel-changes').textContent),'Changes inline');
 t.click(q('#app-shell [data-app-action="new-task"]'));await settle();assert(!q('#app-newtask details')&&/^Same as/.test(q('#app-newtask [data-cli-same="inline"]').textContent),'New task inline');t.click(q('#app-newtask .appnt-x'));await settle();
 t.setTrig(200);await t.page('triggers');assert(!q('#app-page details.cli-same')&&/libraos-engine schedule run nightly/.test(q('#app-page [data-schedule="nightly"] .appt-cli').textContent),'Triggers inline');
 t.ok();t.w.close();
 // 2. Remembered per viewer: alice's choice is read on a new page; bob's is not hers.
 t=await boot({preset:{'dash-cli-inline.alice':'1'}});await t.open('hof-c1');assert(t.q('#app-tab-body .app-smeta code'),'the inline choice was not remembered');t.ok();t.w.close();
 t=await boot({preset:{'dash-cli-inline.bob':'1'}});await t.open('hof-c1');assert(t.q('#app-tab-body .app-smeta .cli-copy')&&!t.q('#app-tab-body .app-smeta code'),'another viewer\'s choice applied');t.ok();t.w.close();
 // 3. Storage refused: the page works, default copy icons; the toggle still works for this page.
 t=await boot({storage:'throw'});await t.open('hof-c1');assert(t.q('#app-tab-body .app-smeta .cli-copy'),'no copy icon without storage');
 await t.page('settings');await settle();t.click(t.q('#app-page [data-app-pref="cli"]'));await settle();assert.equal(t.q('#app-page [data-app-pref="cli"]').textContent,'Hide','the toggle failed without storage');
 await t.page('');assert(t.q('#app-tab-body .app-smeta code'),'inline did not apply without storage');t.ok();t.w.close();
 // 4. No clipboard: Copy shows the command to copy by hand.
 t=await boot({clipboard:false});await t.open('hof-c1');t.click(t.q('#app-tab-body .app-smeta .cli-copy'));await tick();
 assert(/In a terminal: libraos-engine handoff show hof-c1/.test(t.$('toast').textContent),'no command shown without a clipboard: '+t.$('toast').textContent);t.ok();t.w.close();
 console.log('dash_appcli: ok',phone?'phone':'desktop',theme);process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
function doc_key(t,key){(t.doc.activeElement||t.doc.body).dispatchEvent(new t.w.KeyboardEvent('keydown',{key,bubbles:true}))}
