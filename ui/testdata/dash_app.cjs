// #561: the dash page's personal mode. When /api/dash says mode "app" (agentd app,
// libraos/agentd-core#560) the page draws the reference app's frame instead of the team dash: a
// left sidebar, a centre with an editor-style tab strip, a right sidebar with icon
// tabs, and a status bar (watchdog, running, waiting, today's spend). No rail and
// no team page shows. The regions are empty mount points the later issues fill.
// The same page in team mode (no mode, or "team") is unchanged. Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_app.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const task=(id,o)=>({id,title:'Task '+id,goal:'Task '+id,state:'claimed',claimer:'w-'+id,from:'s-alice',from_user:'alice',worker:'codex',to:'any',project:'acme/repo',stage:'implement',source:'interactive',updated_ago:'1m',dispatched:now,attempts:[{tool:'codex',running:true,minutes:2,usd:0.5}],...o});
// Two running (one with a mark Working), one failed (needs you), one offered.
const list=[task('hof-a1',{mark:'working'}),task('hof-a2',{mark:'working'}),task('hof-a3',{mark:'failed',attempts:[{tool:'codex',running:false,end_reason:'failed',usd:0.25}]}),task('hof-a4',{state:'offered',claimer:null,dispatched:null,attempts:[]})];
const base={user:'alice',role:'owner',now,handoff_list:list,done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:[]};
const app=(o)=>({...base,mode:'app',watchdog:{running:true,start:'agentd install'},spend_today:{usd:4.2,workers:3,unpriced:0,pending:0,user:'alice'},...o});
let snap=app(),hits={};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21470/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async(url)=>{const u=new URL(url,w.location.href);hits[u.pathname]=(hits[u.pathname]||0)+1;let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=snap;
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const $=id=>doc.getElementById(id),body=doc.body;
// shown: not hidden by a hidden attribute on it or an ancestor.
const shown=n=>{for(let x=n;x&&x!==doc;x=x.parentElement)if(x.hidden)return false;return true};
const key=(k,o={})=>doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true,...o}));
const css=[...doc.querySelectorAll('style')].map(n=>n.textContent).join('\n');
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // App mode: the frame, and nothing of the team dash.
 assert(body.classList.contains('app-mode'),'app mode is not on');
 const shell=$('app-shell');assert(shell&&shown(shell),'the app frame is not shown');
 const left=$('app-left'),center=$('app-center'),right=$('app-right'),status=$('app-status');
 for(const [n,name] of [[left,'left sidebar'],[center,'centre'],[right,'right sidebar'],[status,'status bar']])assert(n&&shell.contains(n)&&shown(n),'no '+name);
 assert.equal(left.tagName,'ASIDE');assert.equal(right.tagName,'ASIDE');assert.equal(status.getAttribute('role'),'status');
 assert(!shown(doc.querySelector('.shell')),'the team shell shows in app mode');
 for(const id of ['rail','agents-list','side','page-inbox','page-work','page-team','page-insights','page-metrics','page-usage','page-chat','page-settings','page-triggers','page-setup','page-help'].filter(id=>$(id)))assert(!shown($(id)),id+' shows in app mode');
 assert(!shown(doc.querySelector('.shell header')),'the team top bar shows');
 // Each region has its mount point, empty for the issues that fill it.
 for(const r of ['projects','tabs','tab-body','right-panel'])assert(shell.querySelector('[data-region="'+r+'"]'),'no mount point '+r);
 assert(left.contains(shell.querySelector('[data-region="projects"]')),'projects are not in the left sidebar');
 assert(center.contains(shell.querySelector('[data-region="tabs"]'))&&center.contains(shell.querySelector('[data-region="tab-body"]')),'tabs are not in the centre');
 // Left sidebar: Search, Tasks, Triggers, the Projects header with its bell, add-repository and new-task buttons, settings and help at the foot.
 const lt=left.textContent;for(const word of ['Search','Tasks','Triggers','Projects'])assert(lt.includes(word),'left sidebar has no '+word);
 for(const a of ['bell','add-repo','new-task','settings','help'])assert(left.querySelector('[data-app-action="'+a+'"]'),'left sidebar has no '+a+' button');
 assert.equal(left.querySelector('[data-app-action="bell"] .app-count').textContent,'1','the bell counts the tasks waiting on you');
 // Centre: the tab strip with its + and Command at the right end.
 assert(center.querySelector('.app-tabstrip [data-app-action="new-tab"]')&&/Command/.test(center.querySelector('.app-tabstrip [data-app-action="command"]').textContent),'the tab strip has no + or Command');
 // Right sidebar: icon tabs at the top in the reference app's order (Explorer, Agents, Source Control, Checks) as Files, Details, Changes, Checks.
 const tabs=[...right.querySelectorAll('[role=tab]')];
 assert.deepEqual(tabs.map(t=>t.dataset.appPanel),['files','details','changes','checks'],'right sidebar tabs');
 assert.deepEqual(tabs.map(t=>t.getAttribute('aria-label')),['Files','Details','Changes','Checks']);
 assert.equal(tabs.filter(t=>t.getAttribute('aria-selected')==='true').length,1,'one right tab is selected');
 tabs[2].click();await tick();
 assert.equal(tabs[2].getAttribute('aria-selected'),'true','a right tab does not select');
 for(const p of right.querySelectorAll('[role=tabpanel]'))assert.equal(shown(p),p.dataset.appPanel==='changes','panel '+p.dataset.appPanel);
 // Status bar: watchdog, running, waiting, today's spend.
 const st=()=>status.textContent.replace(/\s+/g,' ');
 assert(/Watchdog running/.test(st()),'status: '+st());assert(/2 running/.test(st()),'running count: '+st());assert(/1 waiting on you/.test(st()),'waiting count: '+st());assert(/Today \$4\.20/.test(st()),'today: '+st());
 // A watchdog not running is loud and gives the command; the server's text stays text.
 snap=app({watchdog:{running:false,start:'agentd install '+evil,note:'no watchdog is running'},spend_today:{usd:1,workers:2,unpriced:1,pending:0}});await w.refresh();await settle();
 const wd=status.querySelector('[data-app-status="watchdog"]');assert(wd.classList.contains('app-warn'),'a stopped watchdog is not marked');assert(/No watchdog/.test(wd.textContent),wd.textContent);
 wd.click();await tick();const pop=$('app-watchdog-pop');assert(pop&&shown(pop),'the watchdog item does not open its command');
 assert(pop.textContent.includes('agentd install '+evil)&&!pop.querySelector('img'),'the start command is not shown as text');
 assert(/≥\s?\$1\.00/.test(st()),'unpriced spend is not a floor: '+st());
 key('Escape');await tick();assert(!shown(pop),'Escape does not close the watchdog command');
 // Sidebars: desktop open by default, Mod+B and Mod+L toggle them; on a phone both are drawers, closed until asked, one at a time.
 const open=side=>body.classList.contains('app-'+side+'-open');
 if(!phone){
  assert(open('left')&&open('right'),'sidebars are not open by default on desktop');
  key('b',{ctrlKey:true});await tick();assert(!open('left'),'Ctrl+B does not hide the left sidebar');
  key('b',{ctrlKey:true});await tick();assert(open('left'),'Ctrl+B does not show the left sidebar');
  key('l',{ctrlKey:true});await tick();assert(!open('right'),'Ctrl+L does not hide the right sidebar');
  shell.querySelector('[data-app-action="toggle-right"]').click();await tick();assert(open('right'),'the right toggle does not show it');
  assert.equal(w.localStorage.getItem('dash-app-sidebars'),JSON.stringify({left:true,right:true}),'sidebar state is not kept');
 }else{
  assert(!open('left')&&!open('right'),'phone drawers are open at load');
  shell.querySelector('[data-app-action="toggle-left"]').click();await tick();assert(open('left'),'the left drawer does not open');assert(shown($('app-scrim')),'no scrim behind the drawer');
  shell.querySelector('[data-app-action="toggle-right"]').click();await tick();assert(open('right')&&!open('left'),'opening one drawer does not close the other');
  key('Escape');await tick();assert(!open('right'),'Escape does not close the drawer');
  shell.querySelector('[data-app-action="toggle-left"]').click();await tick();$('app-scrim').click();await tick();assert(!open('left'),'the scrim does not close the drawer');
 }
 // The reference app's sizes and its own CSS region.
 assert(/region:css-app/.test(css),'no css-app region');
 for(const re of [/--app-left-w:280px/,/--app-right-w:350px/,/\.app-status\{[^}]*height:24px/,/\.app-tabstrip\{[^}]*height:32px/,/\.app-dragstrip\{[^}]*height:4px/,/\.app-rtabs\{[^}]*height:40px/,/'Geist'/,/@media\(max-width:860px\)\{[^@]*\.app-left\{/])assert(re.test(css),'css: '+re);
 // Back to the team dash: the frame goes, the team shell is back as it was.
 snap={...base};await w.refresh();await settle();
 assert(!body.classList.contains('app-mode')&&!shown(shell)&&shown(doc.querySelector('.shell')),'team mode does not restore the team dash');
 assert(shown($('rail')),'the rail does not show in team mode');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_app: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
