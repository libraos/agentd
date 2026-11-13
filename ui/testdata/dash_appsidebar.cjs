// libraos/agentd-core#563: the app's left sidebar. In app mode (/api/dash mode "app") my tasks
// are listed by repository, each as Orca's worktree card (status dot, title, branch, spend);
// others' tasks are in their own read-only group (the server's mine on each task); the bell
// counts my tasks waiting on me and toggles the list to them; Tasks is every task as a table over
// the centre and Triggers is read only; ArrowUp/ArrowDown, Enter and N work in the sidebar.
// Opening another person's task marks the frame read only. Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_appsidebar.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const task=(id,o)=>({id,title:'Task '+id,goal:'Task '+id,state:'claimed',claimer:'w-'+id,from:'s-alice',from_user:'alice',worker:'codex',to:'any',project:'acme/web',stage:'implement',source:'interactive',updated_ago:'1m',dispatched:true,mine:true,attempts:[{tool:'codex',running:true,minutes:2,usd:0.5}],...o});
const list=[
 task('hof-w1',{mark:'working',branch:'agentd/hof-w1',attempts:[{tool:'codex',running:false,usd:0.25},{tool:'codex',running:true,usd:0.5}]}),
 task('hof-n1',{mark:'needs_you',worker_state:'blocked',branch:'agentd/hof-n1',title:'Fix login '+evil}),
 task('hof-f1',{project:'acme/api',mark:'failed',branch:'agentd/hof-f1',attempts:[{tool:'codex',running:false,end_reason:'failed',usd:1}]}),
 task('hof-q1',{project:'acme/api',state:'offered',mark:'waiting',claimer:null,dispatched:true,attempts:[]}),
 task('hof-o1',{project:'acme/api',state:'offered',mark:'not_started',claimer:null,dispatched:false,attempts:[]}),
 // Bob's: one working, one that needs him (not me).
 task('hof-b1',{from:'s-bob',from_user:'bob',mine:false,mark:'working',branch:'agentd/hof-b1'}),
 task('hof-b2',{from:'s-bob',from_user:'bob',mine:false,mark:'needs_you',worker_state:'blocked',project:'acme/api'})];
const done=[{what:'handoff',ref:'hof-d1',title:'Done task',from_user:'alice',mine:true,project:'acme/web',branch:'agentd/hof-d1',age:'2h',failed:false,mark:'done',attempts:[{tool:'codex',running:false,usd:2}]},
 {what:'handoff',ref:'hof-bd',title:'Bob done',from_user:'bob',mine:false,project:'acme/web',age:'3h',failed:false,mark:'done'}];
const base={user:'alice',role:'owner',now,handoff_list:list,done,sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:[],dispatch:true};
const app=(o)=>({...base,mode:'app',watchdog:{running:true,start:'agentd install'},spend_today:{usd:4.2,workers:3,unpriced:0,pending:0,user:'alice'},...o});
let snap=app(),hits={};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21470/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async(url)=>{const u=new URL(url,w.location.href);hits[u.pathname]=(hits[u.pathname]||0)+1;let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=snap;
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const $=id=>doc.getElementById(id),body=doc.body;
const shown=n=>{for(let x=n;x&&x!==doc;x=x.parentElement)if(x.hidden)return false;return w.getComputedStyle(n).display!=='none'};
const key=(k,o={},target=doc.activeElement||doc.body)=>target.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true,...o}));
const css=[...doc.querySelectorAll('style')].map(n=>n.textContent).join('\n');
const box=()=>$('app-projects');
// The list as [kind, label]: a folder row ['repo', name] or a task row ['task', id].
const items=()=>[...box().children].filter(n=>n.matches('.app-repo,.app-task')).map(n=>n.matches('.app-repo')?['repo',n.querySelector('.app-rname').textContent]:['task',n.dataset.taskId]);
const row=id=>box().querySelector('[data-task-id="'+id+'"]');
const openLeft=async()=>{if(phone&&!body.classList.contains('app-left-open')){doc.querySelector('#app-shell [data-app-action="toggle-left"]').click();await tick()}};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 assert(body.classList.contains('app-mode'),'app mode is not on');await openLeft();
 // Grouping: my tasks by repository (folders sorted, each task under its own), finished ones too;
 // then Other people's with Bob's only.
 const it=items();
 assert.deepEqual(it.filter(x=>x[0]==='repo').map(x=>x[1]),['acme/api','acme/web','Other people’s'],'folders: '+JSON.stringify(it));
 const under=name=>{const i=it.findIndex(x=>x[0]==='repo'&&x[1]===name),out=[];for(let j=i+1;j<it.length&&it[j][0]==='task';j++)out.push(it[j][1]);return out};
 assert.deepEqual(under('acme/api').sort(),['hof-f1','hof-o1','hof-q1'],'acme/api: '+under('acme/api'));
 assert.deepEqual(under('acme/web').sort(),['hof-d1','hof-n1','hof-w1'],'acme/web: '+under('acme/web'));
 assert.deepEqual(under('Other people’s').sort(),['hof-b1','hof-b2','hof-bd'],'others: '+under('Other people’s'));
 assert(/Read only/.test(box().querySelector('.app-repo[data-repo="others"]').textContent),'the others group does not say read only');
 // A row: dot, title, the branch on the second line, the spend; the title stays text.
 const w1=row('hof-w1');assert.equal(w1.querySelector('.app-ttitle').textContent,'Task hof-w1');
 assert.equal(w1.querySelector('.app-tmeta').textContent,'agentd/hof-w1','branch line: '+w1.querySelector('.app-tmeta').textContent);
 assert.equal(w1.querySelector('.app-tspend').textContent,'$0.75','spend sums the attempts');
 assert.equal(row('hof-d1').querySelector('.app-tspend').textContent,'$2.00');
 assert(!row('hof-o1').querySelector('.app-tspend'),'a task with no spend shows one');
 assert.equal(row('hof-n1').querySelector('.app-ttitle').textContent,'Fix login '+evil);assert(!box().querySelector('img'),'a title became markup');
 // Others' rows say whose they are, and read only.
 const b1=row('hof-b1');assert(b1.hasAttribute('data-readonly')&&/bob · agentd\/hof-b1/.test(b1.textContent)&&/Read only/.test(b1.textContent),'others row: '+b1.textContent);
 assert(!w1.hasAttribute('data-readonly')&&!/Read only/.test(w1.textContent),'my row reads as read only');
 // Status dots, one per state, as Orca's: working, needs you (with its question mark), failed, waiting, not started, done.
 const dot=id=>row(id).querySelector('.app-dot');
 for(const [id,d] of [['hof-w1','working'],['hof-n1','needs_you'],['hof-f1','failed'],['hof-q1','waiting'],['hof-o1','idle'],['hof-d1','done'],['hof-b1','working']])assert.equal(dot(id).dataset.dot,d,id+' dot');
 assert.equal(dot('hof-n1').textContent,'?');assert.equal(dot('hof-w1').getAttribute('aria-label'),'Working');
 for(const re of [/\.app-dot\[data-dot="done"\]\{background:#00bb7f\}/,/\.app-dot\[data-dot="failed"\]\{[^}]*background:#fb2c36/,/\.app-dot\[data-dot="working"\]\{[^}]*var\(--o-working\)/,/\.app-dot\[data-dot="needs_you"\]\{[^}]*var\(--o-question\)/,/\.app-repo\{[^}]*height:28px/,/\.app-ttitle\{[^}]*font-size:13px;line-height:20px/,/\.app-tmeta\{[^}]*font-size:11px/,/\.app-task\{[^}]*border-radius:10px/,/region:css-app-sidebar/])assert(re.test(css),'css: '+re);
 // The bell counts my tasks waiting on me (hof-n1 needs me, hof-f1 failed), not Bob's; the status bar agrees.
 const bell=doc.querySelector('#app-shell [data-app-action="bell"]');
 assert.equal(bell.querySelector('.app-count').textContent,'2','bell count');assert(bell.classList.contains('app-hot'));
 assert(/2 waiting on you/.test($('app-status').textContent.replace(/\s+/g,' ')),'status bar waiting: '+$('app-status').textContent);
 assert(/1 running/.test($('app-status').textContent.replace(/\s+/g,' ')),'status bar running counts mine only: '+$('app-status').textContent);
 bell.click();await tick();
 assert.equal(bell.getAttribute('aria-pressed'),'true');assert.equal($('app-projects-name').textContent,'Needs you');
 assert.deepEqual(items().map(x=>x[1]).sort(),['hof-f1','hof-n1'],'the bell list: '+JSON.stringify(items()));
 bell.click();await tick();assert.equal($('app-projects-name').textContent,'Projects');assert(items().length>7,'the bell does not toggle back');
 // Opening a task: the seam event, aria-current; another person's marks the frame read only.
 const seen=[];doc.addEventListener('app-task',e=>seen.push(e.detail));
 row('hof-b1').click();await tick();
 assert.equal(seen.length,1);assert.equal(seen[0].id,'hof-b1');assert.equal(seen[0].readOnly,true);assert.equal(seen[0].mine,false);
 const shell=$('app-shell');assert(shell.hasAttribute('data-readonly'),'another person’s task does not make the frame read only');assert.equal(shell.dataset.task,'hof-b1');
 assert.equal(row('hof-b1').getAttribute('aria-current'),'true');
 const probe=doc.createElement('button');probe.setAttribute('data-app-write','');$('app-tab-body').append(probe);
 for(const n of [probe,shell.querySelector('.app-tabstrip [data-app-action="new-tab"]'),shell.querySelector('.app-tabstrip [data-app-action="command"]')])assert.equal(w.getComputedStyle(n).display,'none','a write control shows on another person’s task: '+n.outerHTML.slice(0,60));
 await w.refresh();await settle();await openLeft();
 assert(shell.hasAttribute('data-readonly')&&row('hof-b1').getAttribute('aria-current')==='true','a refresh loses the open task');
 row('hof-w1').click();await tick();
 assert.equal(seen[1].readOnly,false);assert(!shell.hasAttribute('data-readonly'),'my task is read only');assert.notEqual(w.getComputedStyle(probe).display,'none','my task hides write controls');
 assert(!row('hof-b1').hasAttribute('aria-current'),'two rows are current');
 probe.remove();
 // Keys: ArrowDown/ArrowUp move through the rows, Enter opens one, N is New task.
 await openLeft();
 const rows=[...box().querySelectorAll('.app-task,.app-repo')];rows[0].focus();
 key('ArrowDown');assert.equal(doc.activeElement,rows[1],'ArrowDown does not move');
 key('ArrowDown');key('ArrowUp');assert.equal(doc.activeElement,rows[1],'ArrowUp does not move');
 const f1=row('hof-f1');f1.focus();key('Enter');await tick();assert.equal(seen[seen.length-1].id,'hof-f1','Enter does not open the task');
 // The + button is New task's (#564), which enables it; N only presses it.
 const nb=doc.querySelector('#app-shell [data-app-action="new-task"]');nb.removeAttribute('aria-disabled');let newClicks=0;nb.addEventListener('click',()=>newClicks++);
 key('n');await tick();assert.equal(newClicks,1,'N does not press New task');
 assert(!doc.querySelector('dialog[open].sheet,.sheet[open]'),'N opens the team dash’s sheet in app mode');
 // Folding a repository hides its tasks and is kept.
 await openLeft();box().querySelector('.app-repo[data-repo="p:acme/api"]').click();await tick();
 assert(!row('hof-f1')&&row('hof-w1'),'folding acme/api');assert.equal(box().querySelector('.app-repo[data-repo="p:acme/api"]').getAttribute('aria-expanded'),'false');
 assert.deepEqual(JSON.parse(w.localStorage.getItem('dash-app-collapsed')),['p:acme/api']);
 box().querySelector('.app-repo[data-repo="p:acme/api"]').click();await tick();assert(row('hof-f1'),'unfolding');
 // Tasks: every task as a table over the centre; a filter; a row opens its task and goes back to the workspace.
 await openLeft();const navTasks=doc.querySelector('#app-shell [data-app-nav="tasks"]');assert(!navTasks.hasAttribute('aria-disabled'));
 navTasks.click();await tick();const page=$('app-page');
 assert(page&&shown(page),'Tasks does not open');assert.equal(navTasks.getAttribute('aria-current'),'page');assert(body.classList.contains('app-paged'));
 assert(!shown($('app-tab-body')),'the workspace shows under Tasks');
 assert.deepEqual([...page.querySelectorAll('th')].map(n=>n.textContent),['ID','Title / context','From','Status','Spend','Updated']);
 assert.equal(page.querySelectorAll('tbody tr').length,9,'Tasks lists every task');
 assert(/bob · read only/.test(page.querySelector('tr[data-task-id="hof-b1"]').textContent),'Tasks does not mark others read only');
 const filt=page.querySelector('.app-pfilter');filt.value='acme/api';filt.dispatchEvent(new w.Event('input',{bubbles:true}));await tick();
 assert.deepEqual([...$('app-page').querySelectorAll('tbody tr')].map(n=>n.dataset.taskId).sort(),['hof-b2','hof-f1','hof-o1','hof-q1'],'filter');
 $('app-page').querySelector('tr[data-task-id="hof-q1"]').click();await tick();
 assert(!shown($('app-page'))&&!body.classList.contains('app-paged'),'opening a task leaves Tasks open');assert.equal(seen[seen.length-1].id,'hof-q1');
 // Triggers: read only, the commands, no request to the routes an app does not serve.
 await openLeft();doc.querySelector('#app-shell [data-app-nav="triggers"]').click();await tick();
 assert(shown($('app-page'))&&/agentd schedule list/.test($('app-page').textContent)&&/Read only/.test($('app-page').textContent),'Triggers: '+$('app-page').textContent);
 assert(!$('app-page').querySelector('input,textarea,select,form'),'Triggers has a control');assert(!hits['/api/triggers'],'Triggers asked /api/triggers');
 key('Escape',{},doc.body);await tick();assert(!shown($('app-page')),'Escape does not close Triggers');
 // Add a repository: the terminal's command, never a request.
 await openLeft();doc.querySelector('#app-shell [data-app-action="add-repo"]').click();await tick();
 assert(shown($('app-repo-pop'))&&/agentd repo add/.test($('app-repo-pop').textContent),'add a repository');
 key('Escape',{},doc.body);await tick();assert(!shown($('app-repo-pop')),'Escape does not close it');
 // Phone: opening a task closes the drawer.
 if(phone){await openLeft();row('hof-w1').click();await tick();assert(!body.classList.contains('app-left-open'),'the drawer stays open after a task is opened')}
 // A server without mine (before #563): every task is mine, no others group.
 snap=app({handoff_list:list.map(({mine,...h})=>h),done:done.map(({mine,...h})=>h)});await w.refresh();await settle();await openLeft();
 assert(!box().querySelector('.app-repo[data-repo="others"]'),'others group without mine');assert(row('hof-b1')&&!row('hof-b1').hasAttribute('data-readonly'));
 // No tasks: a note with the command.
 snap=app({handoff_list:[],done:[]});await w.refresh();await settle();
 assert(/agentd new/.test(box().textContent),'empty list: '+box().textContent);assert.equal(bell.querySelector('.app-count').textContent,'0');
 // Team mode: nothing of this, and n is the team dash's again.
 snap={...base};await w.refresh();await settle();assert(!body.classList.contains('app-mode'));
 newClicks=0;key('n',{},doc.body);await tick();assert.equal(newClicks,0,'N presses the app’s button in team mode');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_appsidebar: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
