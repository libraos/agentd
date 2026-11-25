// The brand pass (2026-11-25): the product is LibraOS Engine. The server dash and the personal app
// (and its /panel) never show LibraOS Core, AgentD or LibraOS Next in their rendered text or in the
// attributes a person reads (title, aria-label, placeholder, the install meta names), in every mode.
// The product's name and the CLI program's name each come from one constant (region:brand):
//   1  the real page: no old name anywhere a person reads; the window title is 'PAGE · LibraOS Engine'
//      in the app and /panel, '… · LibraOS Engine Server' on the server; shown commands read libraos-core;
//   2  the same page with both constants renamed: neither the old product name nor libraos-core is left
//      in what renders, so each is a one-line change;
//   3  in the source, the product name and libraos-core appear only in the constants, in the HTML that
//      brandApply rewrites (data-brand), in comments and in regexes that read server text.
// Unchanged by design: API paths and fields, agentd/hof-… branch names, .agentd/tasks.toml, storage keys.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_brand.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',theme=process.env.DASH_UI_THEME||'light',now=new Date().toISOString();
const real=fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8');
const CONST="const PRODUCT='LibraOS Engine',CLI='libraos-core',";
assert(real.includes(CONST),'the brand constants are not where region:brand keeps them');
const renamed=real.replace(CONST,"const PRODUCT='Zephyr Brand',CLI='zcli',");
const OLD=/LibraOS Core|LibraOS Next|AgentD/;

// Fixtures. Commands the server itself sends (cli, start, next_step) are left out, so what renders is the page's.
const task=(id,o)=>({id,title:'Fix login '+id,goal:'Fix the login retry '+id,accept:['retry is added'],state:'claimed',claimer:'w-'+id,from:'s-alice',from_user:'alice',mine:true,worker:'claude',worker_tool:'claude',to:'any',project:'acme/web',stage:'implement',source:'interactive',updated_ago:'2m',branch:'agentd/'+id,
  attempts:[{tool:'claude',running:true}],retry:{tool:'claude',cwd:'/r/web',budget:'30m',may:true},...o});
const list=[task('hof-b1'),task('hof-b2',{worker_state:'blocked',worker_wait:'input'})];
const lesson={id:'lesson:lsn-a1',kind:'lesson',title:'Lesson proposed: Check stopped at its time limit',from:'agentd',age:'2h',mine:true,lesson:'lsn-a1',count:3,lesson_state:'proposed',lesson_version:1,
  lesson_text:{title:'Check stopped at its time limit',happened:'A check ran out of time.',why:'The limit was short.',next:'Raise it.'}};
const base={user:'alice',role:'owner',now,handoff_list:list,done:[],sessions:[],left:[],unlinked:[],inbox:[lesson],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:['/r/web'],dispatch:true,terminal:true};
const team={...base,mode:'team'};
const app={...base,mode:'app',watchdog:{running:false},spend_today:{usd:1,workers:1,unpriced:0,pending:0}};
const onboarding={user:'alice',state:{flowVersion:4,closedAt:null,outcome:null,lastCompletedStep:-1,checklist:{},surface:'terminal',defaultAgent:null,theme:'system',sound:'system',notifications:false,guideHidden:false,toursSeen:[],toastShown:false},
  facts:{os:'linux',repositories:[],task_files:0,clients:[{tool:'claude',found:true,connected:false}],default_tool:'claude',first_task:{done:false,handoff:null,count:0},gh:'not_installed',linear:false,commands:{}}};
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
function load(html,path,snap){const ob=JSON.parse(JSON.stringify(onboarding)),errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
  const dom=new JSDOM(html,{url:'http://127.0.0.1:21470'+path,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',theme);
    w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
    w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
    w.WebSocket=class{constructor(){this.readyState=0}send(){}close(){this.readyState=3}};w.Terminal=class{open(){}onData(){}resize(){}write(){}focus(){}dispose(){}};
    w.Notification=class{constructor(){}static get permission(){return 'default'}static requestPermission(){return Promise.resolve('default')}};
    w.fetch=async(url,init)=>{const u=new URL(url,w.location.href),id=u.searchParams.get('id')||u.searchParams.get('ref')||u.searchParams.get('handoff');let body={};
      if(init&&init.method&&init.method!=='GET'){let b={};if(u.pathname==='/api/onboarding'){ob.state=JSON.parse(init.body);b=ob}return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(b)),text:async()=>JSON.stringify(b)}}
      if(u.pathname==='/api/auth')return {ok:true,status:204};
      if(u.pathname==='/api/dash')body=snap;
      else if(u.pathname==='/api/onboarding')body=ob;
      else if(u.pathname==='/api/workitem')body={tree:[{id,log:[{note:'claimed',ago:'5m',actor:'w-'+id}]}]};
      else if(u.pathname==='/api/session')body={turns:[{role:'assistant',text:'Reading the login client.'}]};
      else if(u.pathname==='/api/taskmsg')body={may:true,live:true};
      else if(u.pathname==='/api/review')body={handoff:id,enabled:true,may:true,branch:'agentd/'+id,base_branch:'main',files:[{path:'login.go',added:3,removed:1}]};
      else if(u.pathname==='/api/files')body={files:[]};
      else if(u.pathname==='/api/checks')body={check:'go test ./...',runs:[]};
      else if(u.pathname==='/api/taskdetail')body={handoff:id,state:'claimed',tool:'claude'};
      else if(u.pathname==='/api/settings')body={owner:true,config:{}};
      else if(u.pathname==='/api/triggers')body={triggers:{enabled:false},schedules:[]};
      return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
  return {w:dom.window,doc:dom.window.document,errors}}
// readable: what a person reads: every text node (open or closed, hidden or not) and the attributes a
// browser shows or speaks, plus the window title and the install names.
const ATTRS=['title','aria-label','placeholder','alt','content','data-disabled-reason'];
function readable(doc){const out=[doc.title];const walk=doc.createTreeWalker(doc.documentElement,4);for(let n;(n=walk.nextNode());){if(!n.parentElement.closest('script,style'))out.push(n.data)}
  for(const n of doc.querySelectorAll('*'))for(const a of ATTRS){const v=n.getAttribute(a);if(v)out.push(v)}return out.join('\n')}
const near=(text,re)=>{const m=re.exec(text);return m?JSON.stringify(text.slice(Math.max(0,m.index-80),m.index+60)):''};
// Scenes: each renders a part of the page and returns its readable text.
async function serverScenes(html,check){const t=load(html,'/',team);await settle();assert(!t.errors.length,t.errors.join('\n'));
  for(const r of ['#overview','#home','#inbox','#issues','#team','#settings/agents','#settings/sessions','#settings/connections','#settings/repositories','#settings/diagnostics','#triggers','#help','#insights']){
    t.w.location.hash=r;await settle();check('server '+r,readable(t.doc),t.doc)}
  t.w.close()}
async function appScenes(html,check){const t=load(html,'/',app),{w,doc}=t,q=s=>doc.querySelector(s);await settle();assert(!t.errors.length,t.errors.join('\n'));
  assert(doc.body.classList.contains('app-mode'),'app mode is off');
  const click=n=>{assert(n,'nothing to click');n.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}))};
  // The onboarding wizard, every step (Continue, else Skip), and the feedback toast at its end.
  assert(/Welcome to/.test(readable(doc)),'the wizard did not open');check('app onboarding',readable(doc),doc);
  for(let i=1;i<=6;i++){const m=q('#appob-layer .appob-modal');if(!m)break;check('app onboarding step '+(m.dataset.step||i),readable(doc),doc);
    const next=q('#appob-layer [data-ob="continue"]')||q('#appob-layer [data-ob="skip"]');if(!next)break;click(next);await settle()}
  assert(!q('#appob-layer .appob-modal'),'the wizard did not finish');check('app onboarding done',readable(doc),doc);
  // Then the pages over the centre, a task, its menus and sheets.
  check('app no task',readable(doc),doc);
  for(const p of ['home','tasks','triggers','settings']){const b=q('#app-shell [data-app-nav="'+p+'"]');if(!b||b.hidden){const btn=q('#app-shell [data-app-action="'+p+'"]');if(btn)click(btn)}else click(b);await settle();check('app page '+p,readable(doc),doc)}
  click(q('#app-shell .app-task[data-task-id="hof-b1"]'));await settle();check('app task',readable(doc),doc);
  for(const p of ['files','details','changes','checks']){const tab=q('#app-right [data-app-panel="'+p+'"][role=tab]');if(tab){click(tab);await settle();check('app panel '+p,readable(doc),doc)}}
  const cmd=[...doc.querySelectorAll('#app-shell button')].find(b=>/^Command/.test(b.textContent.trim()));if(cmd){click(cmd);await settle();check('app command menu',readable(doc),doc);doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await settle()}
  click(q('#app-shell [data-app-action="watchdog"],[data-app-status="watchdog"]'));await settle();check('app watchdog note',readable(doc),doc);
  click(q('#app-left [data-app-action="help"]'));await settle();check('app help menu',readable(doc),doc);
  const keys=[...doc.querySelectorAll('.appob-menu button,.appob-menu [role=menuitem]')].find(b=>/Keyboard shortcuts/.test(b.textContent));if(keys){click(keys);await settle();check('app shortcuts',readable(doc),doc);doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await settle()}
  click(q('#app-left [data-app-action="help"]'));await settle();
  const ms=[...doc.querySelectorAll('.appob-menu button,.appob-menu [role=menuitem]')].find(b=>/Milestones/.test(b.textContent));if(ms){click(ms);await settle();assert(/Getting started/.test(readable(doc)),'Milestones did not open');check('app milestones',readable(doc),doc);doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await settle()}
  const nt=q('#app-shell [data-app-action="new-task"]');click(nt);await settle();check('app new task',readable(doc),doc);
  return t}
async function panelScenes(html,check){const t=load(html,'/panel',app),{w,doc}=t;await settle();assert(!t.errors.length,t.errors.join('\n'));
  check('panel list',readable(doc),doc);const row=doc.querySelector('#app-panel .ap-row');if(row){row.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));await settle();check('panel task',readable(doc),doc)}
  return t}

(async()=>{
 // 1. The real page: no old name, the new one in the titles and headers, commands that read libraos-core.
 const seen=new Set();
 const check=(where,text,doc)=>{assert(!OLD.test(text),where+' shows an old name: '+near(text,OLD));seen.add(where);
   if(/^server/.test(where))assert(/ · LibraOS Engine Server$/.test(doc.title),where+': the window title '+JSON.stringify(doc.title));
   else{assert(/ · LibraOS Engine$/.test(doc.title)&&!/Server/.test(doc.title),where+': the app window title '+JSON.stringify(doc.title))}};
 await serverScenes(real,check);
 {const t=load(real,'/',team);await settle();const d=t.doc;
  assert.equal(d.querySelector('.rail-mark').title,'LibraOS Engine Server','the server rail mark');
  assert.equal(d.querySelector('.rail-mark').getAttribute('aria-label'),'LibraOS Engine Server, go to Overview');
  for(const m of ['application-name','apple-mobile-web-app-title'])assert.equal(d.querySelector('meta[name="'+m+'"]').content,'LibraOS Engine',m);
  t.w.location.hash='#help';await settle();assert(/libraos-core doctor/.test(d.getElementById('page-help').textContent),'the Help page command does not read libraos-core');t.w.close()}
 const a=await appScenes(real,check);
 {const d=a.doc;assert(/^Fix login hof-b1 · LibraOS Engine$/.test(d.title)||/ · LibraOS Engine$/.test(d.title),'app title: '+d.title);
  assert.equal(d.querySelector('.app-name').textContent,'LibraOS Engine','the app sidebar header');
  assert.equal(d.querySelector('[data-app-action="new-task"]').title,'New task (libraos-core new, N)','the New task tooltip');
  // The window title follows the page: Home, then the open task's title.
  a.w.document.querySelector('#app-shell [data-app-nav="home"]').dispatchEvent(new a.w.MouseEvent('click',{bubbles:true}));await settle();
  assert.equal(d.title,'Home · LibraOS Engine','the Home window title');
  // A route change (the team dash's hashchange) does not put "Server" back in app mode.
  a.w.location.hash='#overview';await settle();assert(!/Server/.test(d.title),'a route change made the app title '+d.title);
  const open=d.querySelector('#app-shell .app-task[data-task-id="hof-b1"]');open.dispatchEvent(new a.w.MouseEvent('click',{bubbles:true}));await settle();
  assert.equal(d.title,'Fix login hof-b1 · LibraOS Engine','the open task window title');
  // The lesson's sender, agentd, reads as the product.
  a.w.close()}
 const p=await panelScenes(real,check);
 assert.equal(p.doc.querySelector('.ap-brand').textContent,'LibraOS Engine','the panel header');
 assert.equal(p.doc.getElementById('app-panel').getAttribute('aria-label'),'LibraOS Engine tasks','the panel region label');p.w.close();
 for(const s of ['server #overview','server #settings/agents','server #help','app onboarding','app task','app page home','app new task','app shortcuts','app onboarding step notifications','app onboarding step agent','app onboarding done','app milestones','app help menu','app command menu','panel list','panel task'])assert(seen.has(s),'scene not reached: '+s);

 // 2. Both constants renamed: nothing of either old value is left in what renders.
 const LEFT=/LibraOS Engine|libraos-core/;
 const check2=(where,text)=>{assert(!LEFT.test(text),where+' does not take the name from its constant: '+near(text,LEFT));assert(!OLD.test(text),where+': '+near(text,OLD))};
 await serverScenes(renamed,check2);
 {const t=await appScenes(renamed,check2);assert(/Zephyr Brand$/.test(t.doc.title),'the app title does not take PRODUCT: '+t.doc.title);
  assert.equal(t.doc.querySelector('[data-app-action="new-task"]').title,'New task (zcli new, N)','the tooltip does not take CLI');t.w.close()}
 {const t=load(renamed,'/',team);await settle();assert.equal(t.doc.querySelector('.rail-mark').title,'Zephyr Brand Server','the rail mark does not take PRODUCT');
  t.w.location.hash='#help';await settle();assert(/zcli doctor/.test(t.doc.getElementById('page-help').textContent),'the Help page does not take CLI');t.w.close()}
 {const t=await panelScenes(renamed,check2);t.w.close()}

 // 3. The source: no old name outside comments, so text no scene above reaches is covered too; the names outside the constants only where brandApply rewrites them, in comments, or in
 // regexes that read text the server sends (an alternative inside a regex group).
 {let inBlock=false;const bad=[],lines=real.split('\n'),scriptAt=lines.findIndex((l,i)=>i>1000&&l==='<script>');assert(scriptAt>0,'no page script');lines.forEach((line,i)=>{const t=line.trim();
   const opens=t.startsWith('/*')||/^\s*\w+[^'"]*\/\*/.test(t)&&!t.includes('*/');if(opens&&!t.includes('*/'))inBlock=true;const wasBlock=inBlock;if(t.includes('*/'))inBlock=false;
   if(wasBlock||t.startsWith('//')||t.startsWith('<!--')||t.startsWith('*')||t.startsWith(CONST))return;
   for(const m of line.matchAll(/LibraOS Engine|libraos-core|LibraOS Core|LibraOS Next|AgentD/g)){const before=line.slice(Math.max(0,m.index-3),m.index),after=line[m.index+m[0].length];
     if(/[|(:]$/.test(before)&&/[|)]/.test(after))continue;// a regex alternative
     if(i<scriptAt&&/data-brand(-title)?=|<title>/.test(line)&&/LibraOS Engine|libraos-core/.test(m[0]))continue;// static HTML that brandApply rewrites
     bad.push((i+1)+': '+line.slice(Math.max(0,m.index-60),m.index+40))}});
  assert.deepEqual(bad,[],'an old name, or the product or CLI name written out instead of PRODUCT / CLI:\n'+bad.join('\n'))}
 console.log('dash_brand: ok ('+(phone?'phone':'desktop')+', '+theme+')');
})().catch(e=>{console.error(e);process.exit(1)});
