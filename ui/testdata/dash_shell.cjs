// The shell (#479, libraos/agentd-core#907 step 4): the rail's six items (Overview, Tasks, Team,
// Insights, Chat, Settings) with Help a link at its foot, every old route opening its new place; the
// persistent Agents list (Needs you first, then open tasks by repository, counts,
// New task, Add a repository) shown on Inbox, Tasks and Triggers (Chat has its conversations) and
// collapsed elsewhere, the choice remembered; a row opens its task in place, the
// address naming it, so reload and back keep it; Team's Working now gone with
// nothing lost; on a phone the list is a drawer. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_shell.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const base={from:'s-alice',from_user:'alice',to:'any',updated_ago:'1m',age:'1m'};
const open=[
 {...base,id:'hof-new',goal:'Not started in alpha',project:'acme/alpha',state:'offered',mark:'not_started'},
 {...base,id:'hof-work',goal:'Working in alpha',project:'acme/alpha',state:'claimed',claimer:'s-w',worker:'codex',dispatched:true,issue:'acme/alpha#12',attempts:[{tool:'codex',model:'gpt-x',running:true,minutes:12,usd:0.4}],mark:'working'},
 {...base,id:'hof-wait',goal:'Waiting in alpha',project:'acme/alpha',state:'offered',worker:'claude',mark:'waiting'},
 {...base,id:'hof-fail',goal:'Failed in beta',project:'acme/beta',state:'offered',worker:'claude',mark:'failed'},
 {...base,id:'hof-ask',goal:'Asks a question '+evil,project:'acme/beta',state:'claimed',claimer:'s-q',worker:'claude',dispatched:true,worker_state:'blocked',worker_wait:'a question',attempts:[{tool:'claude',running:true,minutes:3}],mark:'needs_you'},
 {...base,id:'hof-zed',goal:'Working in zeta',project:'acme/zeta',state:'claimed',claimer:'s-z',worker:'claude',dispatched:true,attempts:[{tool:'claude',running:true,minutes:1}],mark:'working'}];
const sessions=[{id:'s-w',tool:'codex',status:'active',host_state:'busy',cwd:'/srv/alpha',user:'alice'},{id:'s-z',tool:'claude',status:'active',host_state:'busy',cwd:'/srv/zeta'},
 {id:'s-solo',tool:'claude',status:'active',host_state:'busy',cwd:'/srv/gamma',task:'Exploring the gamma repo'}];
let dash={user:'alice',role:'owner',now,handoff_list:open,done:[],sessions,left:[],waiting:[],claims:[],messages:[],inbox:[],dispatch:true,checkouts:['/srv/alpha']};
const errors=[],requests=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=body=>({ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)});
function load(url,storage){return new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');for(const [k,v] of Object.entries(storage||{}))w.localStorage.setItem(k,v);
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.fetch=async(url)=>{const u=new URL(url,w.location.href);requests.push(u.pathname+u.search);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/issues')return json({issues:[]});
  if(u.pathname==='/api/issue'||u.pathname==='/api/workitem'){const id=u.searchParams.get('ref'),h=dash.handoff_list.find(x=>x.id===id)||{id,goal:id};return json({kind:'handoff',ref:id,title:h.goal,body:{goal:h.goal},tree:[{...h,focus:true}],prs:[]})}
  if(u.pathname==='/api/team')return u.searchParams.has('activity')?json({activity:{'s-w':{text:'Reading the alpha tests',at:now,model:'gpt-x'}}}):json({roles:[],members:[],handoff_roles:{}});
  if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:true});
  if(u.pathname==='/api/triggers')return json({enabled:false,owner:true,templates:[],offers:[]});
  if(u.pathname==='/api/repositories')return json({repositories:[]});
  if(u.pathname==='/api/settings')return json({owner:true,config:{},models:{}});
  return json({})}}})}
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<5;i++)await tick()};
(async()=>{
 let dom=load('http://127.0.0.1:21620/#inbox'),w=dom.window,doc=w.document;await settle();
 const go=async h=>{w.location.hash=h;await settle()};
 const rows=()=>[...doc.querySelectorAll('#agents-rows .ag-row')],ids=()=>rows().map(r=>r.dataset.agentId),row=id=>doc.querySelector('#agents-rows [data-agent-id="'+id+'"]');
 const collapsed=()=>doc.body.classList.contains('agents-collapsed'),drawer=()=>doc.body.classList.contains('agents-open');
 // The rail: its items with those names, in that order, the last two at its foot.
 const railItems=[...doc.querySelectorAll('#rail .rail-item')];assert(railItems.length<=6,'more than six rail items');
 assert.deepEqual(railItems.map(a=>a.querySelector('.rail-label').textContent),['Overview','Tasks','Team','Insights','Chat','Settings']);
 assert.deepEqual([...doc.querySelectorAll('#rail .rail-foot [data-rail]')].map(a=>a.dataset.rail),['settings','help'],'Settings and Help are not at the foot');
 assert(!doc.querySelector('#rail .rail-aux[data-rail="help"]').matches('.rail-item'),'Help counts as a rail item');
 for(const gone of ['home','inbox','triggers'])assert(!doc.querySelector('#rail [data-rail="'+gone+'"]'),gone+' is still in the rail');
 // Every old route opens its new place, under the rail item that now holds it.
 const old={'#home':['page-overview','overview','#home'],'#inbox':['page-inbox','issues','#inbox'],'#inbox/approvals':['page-inbox','issues','#inbox/approvals'],'#triggers':['page-triggers','settings','#triggers'],
  '#team/repositories':['page-team','settings','#settings/repositories'],'#team/roles':['page-team','settings','#settings/roles'],'#team/host':['page-team','settings','#settings/sessions'],'#team/members':['page-team','team','#team/members'],'#team/who':['page-team','team','#team/who'],
  '#settings/members':['page-team','team','#team/users'],'#work':['page-work','issues','#issues'],'#metrics':['page-metrics','insights','#insights/metrics'],'#usage':['page-usage','insights','#insights/usage'],'#history':['page-history','insights','#insights/history'],'#insights/workers':['page-workers','insights','#insights/workers']};
 for(const [hash,[id,rail,lands]] of Object.entries(old)){await go(hash);assert(!doc.getElementById(id).hidden,hash+' does not open '+id);assert(doc.getElementById('page-notfound').hidden,hash+' lands on Page not found');
  assert.equal(doc.querySelector('#rail [aria-current="page"]').dataset.rail,rail,hash+' is not under '+rail);assert.equal(w.location.hash.split('?')[0],lands,hash+' does not land at '+lands)}
 await go('#inbox');assert.equal(doc.querySelector('#page-title').textContent,'Tasks / Needs me');assert(doc.querySelector('#page-inbox a.ib-board[href="#issues"]'),'Needs me has no way back to the board');
 await go('#team/repositories');assert(doc.querySelector('#team-tabs').hidden,'Team tabs show on a Settings section');assert.equal(doc.querySelector('#page-title').textContent,'Settings / Repositories');
 assert.equal(doc.querySelector('#settings-sections a[aria-current="page"]').dataset.section,'repositories','the panel does not mark Repositories');
 await go('#team');assert.deepEqual([...doc.querySelectorAll('#team-tabs a')].map(a=>a.dataset.tab),['users','permissions','nodes','activity'],'Team has more than its four tabs');assert(!doc.querySelector('#team-tabs [data-tab-more]'),'Team still has a More strip');
 // Every page still opens, and on none does a label say Issues (text, title, aria-label or placeholder).
 const pages={'#overview':'page-overview','#home':'page-overview','#team/users':'page-team','#team/permissions':'page-team','#team/activity':'page-team','#inbox':'page-inbox','#inbox/failed':'page-inbox','#issues':'page-work','#issues/hof-work':'page-work','#chat':'page-chat','#triggers':'page-triggers','#insights/success':'page-success','#insights/cost':'page-cost','#insights/metrics':'page-metrics','#insights/usage':'page-usage','#insights/history':'page-history','#team':'page-team','#settings/sessions':'page-team','#settings/repositories':'page-team','#settings/roles':'page-team','#team/working':'page-team','#settings':'page-settings','#help':'page-help'};
 const labels=()=>{const out=[];const walk=n=>{if(n.nodeType===3){if(!n.parentElement.closest('script,style,[hidden]'))out.push(n.textContent)}else if(n.nodeType===1&&!n.matches('script,style')){for(const a of ['title','aria-label','placeholder'])if(n.getAttribute(a))out.push(n.getAttribute(a));if(!n.hidden)for(const c of n.childNodes)walk(c)}};walk(doc.body);out.push(doc.title);return out};
 for(const [hash,id] of Object.entries(pages)){await go(hash);assert(!doc.getElementById(id).hidden,hash+' does not open '+id);assert(doc.getElementById('page-notfound').hidden,hash+' lands on Page not found');
  const bad=labels().filter(t=>/\bIssues\b/.test(t));assert(!bad.length,hash+': a label says Issues: '+bad.join(' | '))}
 await go('#issues');assert.equal(doc.querySelector('#page-title').textContent,'Tasks');assert.equal(doc.querySelector('.rail-item[aria-current="page"]').dataset.rail,'issues');
 // The list: Needs you first (needs_you before failed), then repositories by name, each working → waiting → not started; a session with no task in its own.
 assert.deepEqual([...doc.querySelectorAll('#agents-rows .ag-group')].map(g=>g.firstChild.textContent),['Needs you','acme/alpha','acme/zeta','gamma']);
 assert.deepEqual(ids(),['hof-ask','hof-fail','hof-work','hof-wait','hof-new','hof-zed','s-solo']);
 assert.equal(doc.querySelector('#agents-counts').textContent,'2 tasks need you3 working1 waiting');
 for(const r of rows())assert.equal(r.querySelectorAll('.tmark').length,1,'a row without its one mark: '+r.textContent);
 assert.equal(row('hof-ask').querySelector('.tmark').dataset.mark,'needs_you');assert.equal(row('hof-fail').querySelector('.tmark').dataset.mark,'failed');
 assert(row('hof-ask').textContent.includes(evil),'the title is not the task text');assert(!doc.querySelector('#agents-rows img'),'a title became markup');
 const sub=row('hof-work').querySelector('.ag-sub').textContent;for(const want of ['Codex','working now','#12','12 min','$0.40'])assert(sub.includes(want),'the row lacks '+want+': '+sub);
 assert(row('hof-ask').querySelector('.ag-sub').textContent.includes('Claude · waiting on you'),row('hof-ask').textContent);
 assert.equal(row('s-solo').getAttribute('href'),'#team/session/s-solo');assert(row('s-solo').textContent.includes('Exploring the gamma repo'));
 assert.equal(doc.querySelector('#agents-add').getAttribute('href'),'#settings/repositories','Add a repository does not lead to Settings > Repositories');
 assert.equal(doc.querySelector('#agents-new').textContent,'New task');
 // Shown on Inbox, Tasks and Triggers, collapsed on Chat (its conversation list takes the list's place, #483), Insights, Team and Settings (desktop); the toggle says which.
 if(!phone){for(const h of ['#inbox','#issues','#triggers']){await go(h);assert(!collapsed(),'the list is not shown on '+h);assert.equal(doc.querySelector('#agents-toggle').getAttribute('aria-expanded'),'true');assert(!doc.querySelector('#agents-list').inert)}
  for(const h of ['#chat','#insights/metrics','#team','#settings']){await go(h);assert(collapsed(),'the list is not collapsed on '+h);assert.equal(doc.querySelector('#agents-toggle').getAttribute('aria-expanded'),'false');assert(doc.querySelector('#agents-list').inert)}
  // Hide it on Inbox and show it on Team: remembered for this browser, page by page.
  await go('#inbox');doc.querySelector('#agents-toggle').click();await tick();assert(collapsed());await go('#team');doc.querySelector('#agents-toggle').click();await tick();assert(!collapsed());
  assert.deepEqual(JSON.parse(w.localStorage.getItem('dash-agents')),{inbox:false,team:true});await go('#issues');assert(!collapsed(),'hiding on Inbox hid it on Tasks');
  const again=load('http://127.0.0.1:21620/#inbox',{'dash-agents':w.localStorage.getItem('dash-agents')});await settle();assert(again.window.document.body.classList.contains('agents-collapsed'),'the choice is not remembered on reload');
  again.window.location.hash='#team';await settle();assert(!again.window.document.body.classList.contains('agents-collapsed'));again.window.close();
  await go('#inbox');doc.querySelector('#agents-toggle').click();await tick();assert(!collapsed(),'Show does not bring the list back')}
 else{// On a phone the list is a drawer: the toggle opens it over an inert page; Escape and choosing a row close it.
  await go('#inbox');assert(!drawer());assert(doc.querySelector('#agents-list').inert);doc.querySelector('#agents-toggle').click();await tick();assert(drawer(),'the toggle does not open the drawer');
  assert(doc.querySelector('#column').inert,'the page is not inert under the drawer');assert(!doc.querySelector('#agents-scrim').hidden);
  doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await tick();assert(!drawer(),'Escape does not close the drawer');assert(!doc.querySelector('#column').inert);
  doc.querySelector('#agents-toggle').click();await tick();assert(drawer())}
 // A row opens its task in place: the address names it, the rail and the list stay, and the row is marked.
 await go('#inbox');row('hof-work').click();await settle();
 assert.equal(w.location.hash,'#issues/hof-work');assert(!doc.querySelector('#page-work').hidden);assert(doc.querySelector('#issue-detail').textContent.includes('Working in alpha'),'the task did not open');
 assert(doc.querySelector('#agents-list')&&rows().length===7,'the list went away');if(phone)assert(!drawer(),'choosing a row left the drawer open');else assert(!collapsed());
 assert.equal(row('hof-work').getAttribute('aria-current'),'page');assert.equal(doc.querySelectorAll('#agents-rows [aria-current="page"]').length,1);
 row('hof-ask').click();await settle();assert.equal(w.location.hash,'#issues/hof-ask');assert.equal(row('hof-ask').getAttribute('aria-current'),'page');assert(!row('hof-work').hasAttribute('aria-current'));
 // Back returns to the earlier task, then to Inbox, the mark following.
 w.history.back();await settle();assert.equal(w.location.hash,'#issues/hof-work');assert(doc.querySelector('#issue-detail').textContent.includes('Working in alpha'));assert.equal(row('hof-work').getAttribute('aria-current'),'page');
 w.history.back();await settle();assert.equal(w.location.hash,'#inbox');assert(!doc.querySelector('#agents-rows [aria-current]'),'a row is still marked on Inbox');
 // An issue's page marks the task that works on it.
 await go('#issues/acme/alpha/12');assert.equal(row('hof-work').getAttribute('aria-current'),'page');
 // Reload on a task's address: the task opens and its row is marked.
 const re=load('http://127.0.0.1:21620/#issues/hof-wait');await settle();const rd=re.window.document;
 assert(rd.querySelector('#issue-detail').textContent.includes('Waiting in alpha'),'reload lost the task');assert.equal(rd.querySelector('#agents-rows [data-agent-id="hof-wait"]').getAttribute('aria-current'),'page');re.window.close();
 // The list follows the page's own refresh: a task that finished leaves, a new one arrives, counts follow.
 dash={...dash,handoff_list:[...open.filter(h=>h.id!=='hof-ask'),{...base,id:'hof-late',goal:'Arrived later',project:'acme/beta',state:'offered',mark:'waiting'}]};
 w.eval('refresh()');await settle();assert(!row('hof-ask'),'a finished task stays');assert(row('hof-late'),'a new task is missing');
 assert.deepEqual([...doc.querySelectorAll('#agents-rows .ag-group')].map(g=>g.firstChild.textContent),['Needs you','acme/alpha','acme/beta','acme/zeta','gamma']);assert.equal(doc.querySelector('#agents-counts').textContent,'1 task needs you3 working2 waiting');
 // Team: no Working now; what it showed is on the list's rows (task, agent, state, time, cost) and its latest activity.
 await go('#team');await settle();assert(!doc.querySelector('.working-table'),'Team still has Working now');assert(![...doc.querySelectorAll('#team-tabs a')].some(a=>/Working now/.test(a.textContent)),'Working now is still a Team tab');
 assert(row('hof-work').querySelector('.ag-act')&&row('hof-work').querySelector('.ag-act').textContent==='Reading the alpha tests','the latest activity is lost');assert(requests.some(r=>r.startsWith('/api/team?activity=')));
 await go('#team/working');assert(doc.querySelector('#team-view [data-moved="working"]'),'#team/working does not say where it went');
 // A page hooks in from its dashPage(): the row its own address shows, and whether the list shows by default.
 w.eval("PAGES.inbox.agentsSelected=r=>r.rest[0]==='failed'?'hof-fail':'';PAGES.help.agents=true");await go('#inbox/failed');assert.equal(row('hof-fail').getAttribute('aria-current'),'page','a page cannot say which row it shows');
 if(!phone){await go('#help');assert(!collapsed(),'a page cannot show the list by default')}
 assert(!errors.length,errors.join('\n'));
 console.log('dash_shell: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 dom.window.close();process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
