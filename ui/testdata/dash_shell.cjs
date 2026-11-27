// The shell (#479, libraos/core#907 step 4): the rail's seven items (Overview, Agents, Tasks, Team,
// Insights, Chat, Settings), and Triggers just above Chat for an owner, with Help a link at its foot, every old route opening its new place;
// Agents a page of its own (#agents: Needs you first, then open tasks by repository, counts,
// New task, Add a repository) and on no other page, desktop or phone: no list beside the rail, no
// show or hide handle, no drawer; a row opens its task, the address naming it, so reload and back
// keep it; Team's Working now gone with nothing lost; the phone bar has Agents too. Run in every mode:
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
function load(url,storage){return new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
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
 // The rail: its items with those names, in that order (Agents right after Overview, Triggers just above Chat), Settings at its foot.
 const railItems=[...doc.querySelectorAll('#rail .rail-item')].filter(a=>!a.hidden);assert(railItems.length<=8,'more than eight rail items');
 assert.deepEqual(railItems.map(a=>a.querySelector('.rail-label').textContent),['Overview','Agents','Tasks','Team','Insights','Triggers','Chat','Settings']);
 assert.deepEqual([...doc.querySelectorAll('#rail [data-rail]')].map(a=>a.dataset.rail),['overview','agents','issues','team','insights','triggers','chat','settings','help'],'the rail is not in its order');
 {const ag=doc.querySelector('#rail [data-rail="agents"]');assert.equal(ag.tagName,'A');assert.equal(ag.getAttribute('href'),'#agents');assert(!ag.hasAttribute('data-owner-only'),'Agents is an owner\'s only');
  assert(ag.querySelector('.rail-icon svg[aria-hidden="true"][stroke="currentColor"][fill="none"]'),'Agents has no line icon in the rail\'s style');assert.equal(ag.previousElementSibling.dataset.rail,'overview','Agents is not right after Overview')}
 assert.equal(doc.querySelector('#rail [data-rail="triggers"]').nextElementSibling.dataset.rail,'chat','Triggers is not just above Chat');
 // Triggers shows in the rail on a desktop; the phone bar keeps its five, and the account menu has it there.
 const shellCss=[...doc.querySelectorAll('style')].map(n=>n.textContent).join('\n');assert.equal(w.getComputedStyle(doc.querySelector('#rail [data-rail="triggers"]')).display,'flex','Triggers is not shown in the rail');
 assert(/@media\(max-width:860px\)\{[^@]*\.rail-mark,\.rail-foot,\.rail-item\[data-rail="triggers"\]\{display:none\}/.test(shellCss),'Triggers takes a place in the phone bar');
 assert(!/data-rail="agents"\][^{]*\{[^}]*display:none/.test(shellCss),'Agents is hidden somewhere, the phone bar included');
 assert(!doc.querySelector('.acct-links a[href="#triggers"]').hidden,'the account menu has no Triggers for an owner');
 assert.deepEqual([...doc.querySelectorAll('#rail .rail-foot [data-rail]')].map(a=>a.dataset.rail),['settings','help'],'Settings and Help are not at the foot');
 assert(!doc.querySelector('#rail .rail-aux[data-rail="help"]').matches('.rail-item'),'Help counts as a rail item');
 for(const gone of ['home','inbox'])assert(!doc.querySelector('#rail [data-rail="'+gone+'"]'),gone+' is still in the rail');
 // Every old route opens its new place, under the rail item that now holds it.
 const old={'#home':['page-overview','overview','#home'],'#inbox':['page-inbox','issues','#inbox'],'#inbox/approvals':['page-inbox','issues','#inbox/approvals'],'#triggers':['page-triggers','triggers','#triggers'],
  '#team/repositories':['page-team','settings','#settings/repositories'],'#team/roles':['page-team','settings','#settings/roles'],'#team/host':['page-team','settings','#settings/sessions'],'#team/members':['page-team','team','#team/users'],'#team/who':['page-team','team','#team/who'],
  '#settings/members':['page-team','team','#team/users'],'#agents':['page-agents','agents','#agents'],'#agents/hof-work':['page-agents','agents','#agents'],'#work':['page-work','issues','#issues'],'#metrics':['page-metrics','insights','#insights/metrics'],'#usage':['page-usage','insights','#insights/usage'],'#history':['page-history','insights','#insights/history'],'#insights/workers':['page-workers','insights','#insights/workers']};
 for(const [hash,[id,rail,lands]] of Object.entries(old)){await go(hash);assert(!doc.getElementById(id).hidden,hash+' does not open '+id);assert(doc.getElementById('page-notfound').hidden,hash+' lands on Page not found');
  assert.equal(doc.querySelector('#rail [aria-current="page"]').dataset.rail,rail,hash+' is not under '+rail);assert.equal(w.location.hash.split('?')[0],lands,hash+' does not land at '+lands)}
 await go('#inbox');assert.equal(doc.querySelector('#page-title').textContent,'Tasks / Needs me');assert(doc.querySelector('#page-inbox a.ib-board[href="#issues"]'),'Needs me has no way back to the board');
 await go('#team/repositories');assert(doc.querySelector('#team-tabs').hidden,'Team tabs show on a Settings section');assert.equal(doc.querySelector('#page-title').textContent,'Settings / Repositories');
 assert.equal(doc.querySelector('#settings-sections a[aria-current="page"]').dataset.section,'repositories','the panel does not mark Repositories');
 await go('#team');assert.deepEqual([...doc.querySelectorAll('#team-tabs a')].map(a=>a.dataset.tab),['users','permissions','nodes','activity'],'Team has more than its four tabs');assert(!doc.querySelector('#team-tabs [data-tab-more]'),'Team still has a More strip');
 // Every page still opens, and on none does a label say Issues (text, title, aria-label or placeholder).
 const pages={'#agents':'page-agents','#overview':'page-overview','#home':'page-overview','#team/users':'page-team','#team/permissions':'page-team','#team/activity':'page-team','#inbox':'page-inbox','#inbox/failed':'page-inbox','#community':'page-community','#issues':'page-work','#issues/hof-work':'page-work','#chat':'page-chat','#triggers':'page-triggers','#insights/success':'page-success','#insights/cost':'page-cost','#insights/metrics':'page-metrics','#insights/usage':'page-usage','#insights/history':'page-history','#team':'page-team','#settings/sessions':'page-team','#settings/repositories':'page-team','#settings/roles':'page-team','#team/working':'page-work','#settings':'page-settings','#help':'page-help'};
 const labels=()=>{const out=[];const walk=n=>{if(n.nodeType===3){if(!n.parentElement.closest('script,style,[hidden]'))out.push(n.textContent)}else if(n.nodeType===1&&!n.matches('script,style')){for(const a of ['title','aria-label','placeholder'])if(n.getAttribute(a))out.push(n.getAttribute(a));if(!n.hidden)for(const c of n.childNodes)walk(c)}};walk(doc.body);out.push(doc.title);return out};
 for(const [hash,id] of Object.entries(pages)){await go(hash);assert(!doc.getElementById(id).hidden,hash+' does not open '+id);assert(doc.getElementById('page-notfound').hidden,hash+' lands on Page not found');
  const bad=labels().filter(t=>/\bIssues\b/.test(t));assert(!bad.length,hash+': a label says Issues: '+bad.join(' | '))}
 await go('#issues');assert.equal(doc.querySelector('#page-title').textContent,'Tasks');assert.equal(doc.querySelector('.rail-item[aria-current="page"]').dataset.rail,'issues');
 // The Agents page: its rail item current, its title, then the list as it was beside the rail.
 await go('#agents');assert(!doc.querySelector('#page-agents').hidden,'#agents does not open the Agents page');assert.equal(doc.querySelector('#page-title').textContent,'Agents');
 assert.equal(doc.querySelector('#rail [aria-current="page"]').dataset.rail,'agents');assert(doc.body.classList.contains('no-panel'),'the Agents page has a second panel');
 // The list: Needs you first (needs_you before failed), then repositories by name, each working → waiting → not started; a session with no task in its own.
 assert.deepEqual([...doc.querySelectorAll('#agents-rows .ag-group')].map(g=>g.firstChild.textContent),['Needs you','acme/alpha','acme/zeta','gamma']);
 assert.deepEqual(ids(),['hof-ask','hof-fail','hof-work','hof-wait','hof-new','hof-zed','s-solo']);
 assert.equal(doc.querySelector('#agents-counts').textContent,'2 tasks need you3 working1 waiting');
 for(const r of rows())assert.equal(r.querySelectorAll('.tmark').length,1,'a row without its one mark: '+r.textContent);
 assert.equal(row('hof-ask').querySelector('.tmark').dataset.mark,'needs_you');assert.equal(row('hof-fail').querySelector('.tmark').dataset.mark,'failed');
 assert(row('hof-ask').textContent.includes(evil),'the title is not the task text');assert(!doc.querySelector('#agents-rows img'),'a title became markup');
 const sub=row('hof-work').querySelector('.ag-sub').textContent;for(const want of ['Codex','Working','12 min','$0.40'])assert(sub.includes(want),'the row lacks '+want+': '+sub);
 {const refs=row('hof-work').nextElementSibling;assert(refs&&refs.matches('[data-task-refs]'),'the row has no line of its id and links under it');assert.equal(refs.querySelector('[data-task-id]').textContent,'hof-work');
  const is=refs.querySelector('a[data-ref-kind="issue"]');assert(is&&is.textContent==='alpha#12'&&is.getAttribute('href')==='https://github.com/acme/alpha/issues/12','the issue is not a link by its short name: '+refs.innerHTML)}
 assert(row('hof-ask').querySelector('.ag-sub').textContent.includes('Claude · Needs you'),row('hof-ask').textContent);
 assert.equal(row('s-solo').getAttribute('href'),'#team/session/s-solo');assert(row('s-solo').textContent.includes('Exploring the gamma repo'));
 assert.equal(doc.querySelector('#agents-add').getAttribute('href'),'#settings/repositories','Add a repository does not lead to Settings > Repositories');
 assert.equal(doc.querySelector('#agents-new').textContent,'New task');
 // New task on the page starts the same sheet as the old list's; it is not hidden on #agents, on a phone or a desktop.
 {const nt=doc.querySelector('#page-agents #agents-new');assert(nt&&!nt.hidden,'the Agents page has no New task');assert(nt.hasAttribute('data-write'));nt.click();await settle();
  assert(doc.querySelector('.sheet:not([hidden]),[role="dialog"]:not([hidden])'),'New task opens nothing');doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await settle()}
 // No page but #agents shows the list or anything of the old one: no aside beside the rail, no handle, no scrim, no drawer, no column for it.
 for(const gone of ['#agents-list','#agents-show','#agents-show-n','#agents-toggle','#agents-close','#agents-scrim','aside.agents','.agents-show','.ag-hide'])assert(!doc.querySelector(gone),gone+' is still on the page');
 assert(!/agents-collapsed|agents-handle|agents-open|--ag-col|--agents-w|\.agents-show|aside\.agents/.test(shellCss),'CSS for the old list is left');
 for(const h of ['#overview','#inbox','#issues','#issues/hof-work','#triggers','#new','#chat','#insights/metrics','#team','#settings','#help','#community','#nowhere']){await go(h);
  assert(doc.querySelector('#page-agents').hidden,'the Agents list shows on '+h);assert(!doc.querySelector('#page-agents').contains(doc.querySelector('.page:not([hidden])')),h);
  for(const c of ['agents-collapsed','agents-handle','agents-open'])assert(!doc.body.classList.contains(c),c+' on '+h);assert.notEqual(doc.querySelector('#rail [aria-current="page"]')?.dataset.rail,'agents','Agents is current on '+h)}
 // The old show or hide choice is dropped on load; an old address under #agents lands on #agents.
 {const again=load('http://127.0.0.1:21620/#agents/old',{'dash-agents':'{"inbox":false,"help":true}'});await settle();const ad=again.window.document;assert.equal(again.window.localStorage.getItem('dash-agents'),null,'the old choice is kept');
  assert.equal(again.window.location.hash,'#agents');assert(!ad.querySelector('#page-agents').hidden);assert(ad.querySelectorAll('#agents-rows .ag-row').length===7,'the page reloads without its rows');
  again.window.location.hash='#inbox';await settle();assert(ad.querySelector('#page-agents').hidden,'the old choice shows the list on Inbox');again.window.close()}
 // The top bar: the title shrinks with an ellipsis so the counts, Search and Account stay one group at the right; the counts
 // read as links; Settings, Help and Triggers are on the rail, not again in the account menu (a phone, with no rail foot, keeps them);
 // Page not found has its title only (dash-review REQUIRED 2, A, M).
 assert(/header h1\{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis\}/.test(shellCss),'the title does not shrink');
 assert(/header>\.stats\{[^}]*margin-left:auto/.test(shellCss),'the counts are not in the right group');assert(/header>\.stats \.stat\{color:var\(--accent\)\}/.test(shellCss),'the counts do not read as links');
 assert(/@media\(min-width:861px\)\{\.acct-card \.acct-links>a\[href="#settings"\],\.acct-card \.acct-links>a\[href="#help"\]/.test(shellCss),'Settings and Help are still in the desktop account menu');
 {const kids=[...doc.querySelector('header').children].map(n=>n.id||n.className);assert(kids.indexOf('stats')>kids.indexOf('page-title')&&kids.indexOf('stats')<kids.indexOf('search-open'),'the counts are not between the title and Search: '+kids)}
 await go('#nowhere');assert(doc.querySelector('#stats').hidden,'Page not found shows the header counts');await go('#issues');assert(!doc.querySelector('#stats').hidden);
 // An Inbox notice with no task is in its own Inbox group, last, its row marked like a task's (dash-review A).
 await go('#agents');{const saved=dash;dash={...dash,attention_version:1,inbox:[{id:'n-1',what:'notice',kind:'notice',title:'Lesson proposed',can_answer:true,actionable:true}]};w.eval('refresh()');await settle();
  const groups=[...doc.querySelectorAll('#agents-rows .ag-group')];const inbox=doc.querySelector('#agents-rows [data-ag-inbox]');
  assert(inbox,'an Inbox notice with no task has no group');assert.equal(groups.at(-1),inbox,'the Inbox group is not last');const n=inbox.nextElementSibling;assert(n&&n.classList.contains('ag-notice')&&n.querySelector('.ag-mark'),'an Inbox notice has no mark');assert(n.textContent.includes('Lesson proposed'));
  dash=saved;w.eval('refresh()');await settle()}
 // A row opens its task: the address names it; back returns to the Agents page.
 await go('#agents');row('hof-work').click();await settle();
 assert.equal(w.location.hash,'#issues/hof-work');assert(!doc.querySelector('#page-work').hidden);assert(doc.querySelector('#issue-detail').textContent.includes('Working in alpha'),'the task did not open');
 assert(doc.querySelector('#page-agents').hidden,'the Agents list stays beside the task');assert.equal(doc.querySelector('#rail [aria-current="page"]').dataset.rail,'issues');
 await go('#agents');row('hof-ask').click();await settle();assert.equal(w.location.hash,'#issues/hof-ask');
 w.history.back();await settle();assert.equal(w.location.hash,'#agents');assert(!doc.querySelector('#page-agents').hidden,'back does not return to the Agents page');
 w.history.back();await settle();assert.equal(w.location.hash,'#issues/hof-work');assert(doc.querySelector('#issue-detail').textContent.includes('Working in alpha'));
 // Reload on a task's address: the task opens.
 const re=load('http://127.0.0.1:21620/#issues/hof-wait');await settle();const rd=re.window.document;
 assert(rd.querySelector('#issue-detail').textContent.includes('Waiting in alpha'),'reload lost the task');re.window.close();
 await go('#agents');
 // The list follows the page's own refresh: a task that finished leaves, a new one arrives, counts follow.
 dash={...dash,handoff_list:[...open.filter(h=>h.id!=='hof-ask'),{...base,id:'hof-late',goal:'Arrived later',project:'acme/beta',state:'offered',mark:'waiting'}]};
 w.eval('refresh()');await settle();assert(!row('hof-ask'),'a finished task stays');assert(row('hof-late'),'a new task is missing');
 assert.deepEqual([...doc.querySelectorAll('#agents-rows .ag-group')].map(g=>g.firstChild.textContent),['Needs you','acme/alpha','acme/beta','acme/zeta','gamma']);assert.equal(doc.querySelector('#agents-counts').textContent,'1 task needs you3 working2 waiting');
 // Team: no Working now; what it showed is on the Agents page's rows (task, agent, state, time, cost) and its latest activity.
 await go('#team');await settle();assert(!doc.querySelector('.working-table'),'Team still has Working now');assert(![...doc.querySelectorAll('#team-tabs a')].some(a=>/Working now/.test(a.textContent)),'Working now is still a Team tab');
 await go('#agents');await settle();
 assert(row('hof-work').querySelector('.ag-act')&&row('hof-work').querySelector('.ag-act').textContent==='Reading the alpha tests','the latest activity is lost');assert(requests.some(r=>r.startsWith('/api/team?activity=')));
 await go('#team/working');assert.equal(w.location.hash,'#issues?view=agents','#team/working does not open Tasks > Running now');
 // Repository links use the repositories' current names (libraos/core#1038: libraos/agentd, then libraos/cli,
 // is now libraos/engine),
 // not GitHub's redirect from the old ones: Help's documentation link and the issue and PR links ghHref builds.
 await go('#help');assert.equal(doc.querySelector('#help-docs a').getAttribute('href'),'https://github.com/libraos/engine#readme');
 assert.equal(w.eval("ghHref('libraos/engine#12','PR')"),'https://github.com/libraos/engine/pull/12');
 assert.equal(w.eval("ghHref('libraos/core#1038','issue')"),'https://github.com/libraos/core/issues/1038');
 assert(!/libraos\/(agentd|cli)(?![\w-])|libraos\/agentd-(core|next)\b/.test(doc.documentElement.outerHTML),'the page still names an old repository');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_shell: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 dom.window.close();process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
