// Overview (libraos/agentd-core#907 step 1): the team dash's landing page. A bare address
// opens it; an owner reads the three load cards (Server, Tasks, Agents, from GET /api/load)
// and the running tasks table (GET /api/running: task, user, project, node, tool and model,
// elapsed, spend against budget, state) without a click, each row opening its task. Both are
// read every 10 s while it shows. A read that fails after a good one keeps its rows under
// "Couldn't refresh · last updated TIME" with Retry (#904 step 1); a first read that fails
// says so with Retry; a 401 or 403 drops what was read. Read only; titles are text.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_overview.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const load={at:now,server:{started:'2026-11-18T08:00:00Z',up_s:9000,store:'postgres',queue_depth:3,lease_pass_at:now,lease_pass_age_s:4,latency:{window_s:300,requests:120,p50_ms:8.2,p95_ms:41},host:{cpus:8,load1:2,cpu_pct:25,mem_total_mb:16384,mem_available_mb:8192,mem_used_pct:50},server_mode:'server'},
 tasks:{running:2,queued:3,blocked:1,waiting_person:1,approvals_pending:2,finished_today:7,day_since:'2026-11-18T00:00:00Z'},
 agents:{nodes:{idle:1,busy:2,not_ready:0,offline:1},nodes_total:4,leases:3,capacity:6,sessions:5,sessions_per_person:[{person:'ann',sessions:3},{person:null,sessions:2}]}};
const running={at:now,running:[
 {id:'hof-run1',goal:'Fix login '+evil,person:'ann',project:'acme/app',stage:'implement',node:'box-1',where:'remote',tool:'codex',model:'gpt-5.4',started:now,elapsed_min:12,spend_usd:1.5,spend_unpriced:0,budget:{text:'30m,$5',minutes:30,usd:5,state:'ok'},worker_state:'running',parked:false},
 {id:'hof-run2',goal:'Write the docs',person:'bob',project:'acme/site',stage:'implement',node:'srv',where:'local',tool:'claude',model:null,started:now,elapsed_min:3,spend_usd:null,spend_unpriced:1,budget:{text:'',minutes:null,usd:null,state:''},worker_state:'blocked',parked:false}]};
const status={load:200,running:200};
let dash={user:'ann',role:'owner',now,team:true,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],waiting:[],claims:[],messages:[],inbox:[],checkouts:[]};
const requests=[],errors=[];let intervals=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=(body,st=200)=>({ok:st<400,status:st,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 const si=w.setInterval.bind(w);w.setInterval=(f,ms,...a)=>{const id=si(f,ms,...a);intervals.push(ms);return id};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);requests.push((opts.method||'GET')+' '+u.pathname);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/load')return status.load===200?json(load):json({error:'down'},status.load);
  if(u.pathname==='/api/running')return status.running===200?json(running):json({error:'down'},status.running);
  if(u.pathname==='/api/issues')return json({issues:[]});
  if(u.pathname==='/api/team')return json({roles:[],members:[],problems:[],handoff_roles:{}});
  if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:false});
  return json({})}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
const body=()=>doc.getElementById('ov-body'),card=k=>body().querySelector('[data-ov-card="'+k+'"]'),fig=(k,f)=>card(k).querySelector('[data-ov-fig="'+f+'"]').textContent;
const stale=k=>body().querySelector('[data-feed-stale="'+k+'"]'),failed=k=>body().querySelector('[data-feed-error="'+k+'"]');
const count=p=>requests.filter(r=>r==='GET '+p).length;
const poll=async()=>{w.eval('LOAD.at=0;RUNNING.at=0;ovPoll(false)');await settle()};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // A bare address lands on Overview, the first rail item, with no click.
 assert(!doc.getElementById('page-overview').hidden,'a bare address does not land on Overview');
 assert.equal(doc.querySelector('.rail-item[aria-current="page"]').dataset.rail,'overview');assert.equal(doc.querySelector('#rail .rail-item').dataset.rail,'overview','Overview is not first in the rail');
 assert.equal(doc.querySelector('#page-title').textContent,'Overview');
 // The three cards, in order, each saying how fresh it is.
 assert.deepEqual([...body().querySelectorAll('[data-ov-card]')].map(c=>c.querySelector('h3').textContent),['Server','Tasks','Agents']);
 for(const k of ['server','tasks','agents'])assert(/^updated \d/.test(card(k).querySelector('[data-ov-fresh]').textContent),k+' card does not say how fresh it is');
 assert.equal(fig('server','store'),'postgres');assert.equal(fig('server','queue'),'3');assert(/p50 8 ms · p95 41 ms/.test(fig('server','latency')),'latency: '+fig('server','latency'));
 assert.equal(fig('server','cpu'),'25% of 8 cores');assert.equal(fig('server','mem'),'50% used of 16.0 GB');assert(/up 2h 30m/.test(fig('server','up')),'up: '+fig('server','up'));assert.equal(fig('server','lease'),'4s ago');
 assert.equal(fig('tasks','running'),'2');assert.equal(fig('tasks','queued'),'3');assert.equal(fig('tasks','blocked'),'1');assert.equal(fig('tasks','waiting'),'1');assert.equal(fig('tasks','approvals'),'2');assert.equal(fig('tasks','finished'),'7');
 assert.equal(fig('agents','nodes'),'1 idle · 2 busy · 0 not ready · 1 offline');assert.equal(fig('agents','leases'),'3 of 6');assert.equal(fig('agents','sessions'),'5');
 assert(/ann 3/.test(fig('agents','people'))&&/no user 2/.test(fig('agents','people')),'sessions per user: '+fig('agents','people'));
 // The running tasks: a row each, its columns, opening its task; a goal is text.
 const rows=[...body().querySelectorAll('tr[data-running]')];assert.deepEqual(rows.map(r=>r.dataset.running),['hof-run1','hof-run2']);
 assert.deepEqual([...body().querySelectorAll('.ov-table th')].map(t=>t.textContent),['Task','User','Project','Node','Tool and model','Elapsed','Spend','State']);
 const cells=r=>[...r.querySelectorAll('td')].map(t=>t.textContent);
 assert.deepEqual(cells(rows[0]).slice(1),['ann','acme/app','box-1','Codex · gpt-5.4','12 min of 30 min','$1.50 of $5.00','running']);
 assert.deepEqual(cells(rows[1]).slice(1),['bob','acme/site','srv (this host)','Claude','3 min','unknown','waiting on a prompt']);
 const a=rows[0].querySelector('a');assert.equal(a.getAttribute('href'),'#issues/hof-run1');assert(a.textContent.includes(evil)&&!body().querySelector('img'),'a goal became markup');
 assert.equal(body().querySelector('[data-ov-count]').textContent,'2');
 rows[1].querySelector('td:nth-child(3)').click();await settle();assert.equal(w.location.hash,'#issues/hof-run2','a row click does not open its task');
 w.location.hash='#overview';await settle();assert(body().querySelector('tr[data-running="hof-run1"]'),'Overview did not come back');
 // Needs a person (#907): the two numbers from /api/load, the tasks behind them, each opening its task; Approvals opens Needs me's Approvals.
 {const needs=()=>body().querySelector('[data-ov-needs]');assert(needs(),'no Needs a person block');assert.equal(needs().querySelector('h3').textContent,'Needs a person');
  assert.equal(needs().querySelector('[data-ov-need="waiting"]').textContent,'1 waiting on a person');
  const ap=needs().querySelector('[data-ov-need="approvals"] a');assert(ap&&ap.getAttribute('href')==='#inbox/approvals'&&ap.textContent==='2 approvals pending','approvals do not link to Needs me\'s Approvals');
  assert.deepEqual([...needs().querySelectorAll('[data-ov-need-row]')].map(r=>r.dataset.ovNeedRow),['hof-run2'],'the blocked task is not listed');
  const row=needs().querySelector('[data-ov-need-row="hof-run2"]');assert.equal(row.querySelector('a').getAttribute('href'),'#issues/hof-run2');assert(/waiting on a prompt · asked by bob/.test(row.textContent),row.textContent);
  assert(!needs().querySelector('[data-ov-need-all]'),'All in Tasks with five or fewer');assert.equal(needs().querySelector('[data-ov-needs-me]').getAttribute('href'),'#inbox');
  // A handoff the snapshot says is blocked joins the list, once; more than five link to all in Tasks.
  dash={...dash,handoff_list:[{id:'hof-run2',goal:'Write the docs',worker_state:'blocked'},...[1,2,3,4,5].map(i=>({id:'hof-b'+i,goal:'Blocked '+i+evil,worker_state:i%2?'blocked':'waiting_answer',worker_wait:'a question',from_user:'cy'}))]};
  w.eval('refresh()');await settle();
  assert.deepEqual([...needs().querySelectorAll('[data-ov-need-row]')].map(r=>r.dataset.ovNeedRow),['hof-run2','hof-b1','hof-b2','hof-b3','hof-b4'],'not capped at five, or listed twice');
  assert.equal(needs().querySelector('[data-ov-need-all]').getAttribute('href'),'#issues?view=needs');assert(!needs().querySelector('img'),'a goal became markup');
  // No task waits and no approval: says so, the approvals figure is not a link.
  const quiet={...load,tasks:{...load.tasks,waiting_person:0,approvals_pending:0}},saved=running.running;
  dash={...dash,handoff_list:[]};running.running=saved.filter(r=>r.worker_state!=='blocked');w.eval('refresh()');await settle();
  w.eval('LOAD.data='+JSON.stringify(quiet)+';RUNNING.data='+JSON.stringify(running)+';ovDraw()');assert(needs().querySelector('[data-ov-need-empty]'),'an empty list is not said');assert(!needs().querySelector('[data-ov-need="approvals"] a'),'zero approvals is a link');
  running.running=saved;w.eval('refresh()');await poll()}
 // Polled every 10 s while it shows.
 assert(intervals.includes(10000),'no 10 s poll: '+intervals);assert.equal(w.eval('OV_EVERY'),10000);
 {const b=count('/api/load'),c=count('/api/running');await poll();assert(count('/api/load')>b&&count('/api/running')>c,'a due poll did not read both feeds')}
 {const b=count('/api/load');w.eval('ovPoll(false)');await settle();assert.equal(count('/api/load'),b,'a feed read again before 10 s')}
 // /api/load fails after a good read: the cards stay under the notice with Retry; their freshness says as of then.
 status.load=503;await poll();assert(card('server'),'the cards went with a failed refresh');
 const n=stale('load');assert(n,'a failed /api/load looks live: '+body().textContent.slice(0,200));assert(/Couldn.t refresh · last updated \S/.test(n.textContent),n.textContent);
 assert(/^as of /.test(card('tasks').querySelector('[data-ov-fresh]').textContent),'a stale card still says updated');
 assert(!stale('running'),'the running table is marked stale with it');
 status.load=200;{const b=count('/api/load');n.querySelector('button').click();await settle();assert(count('/api/load')>b,'Retry did not ask for /api/load')}
 assert(!stale('load'),'the notice stayed after a good read');assert(/^updated /.test(card('tasks').querySelector('[data-ov-fresh]').textContent));
 // /api/running fails after a good read: the same.
 status.running=500;await poll();assert(body().querySelector('tr[data-running="hof-run1"]'),'running rows went with a failed refresh');
 const rn=stale('running');assert(rn&&/Couldn.t refresh/.test(rn.textContent),'a failed /api/running looks live');assert(rn.querySelector('button').textContent==='Retry');
 status.running=200;{const b=count('/api/running');rn.querySelector('button').click();await settle();assert(count('/api/running')>b,'Retry did not ask for /api/running')}assert(!stale('running'));
 // A 403 drops what was read; it is not shown as stale.
 status.load=403;status.running=401;await poll();assert(!card('server'),'a 403 on /api/load still shows the cards');assert(!body().querySelector('tr[data-running]'),'a 401 on /api/running still shows rows');
 assert(!stale('load')&&!stale('running'),'a 403 is shown as stale');assert(failed('load')&&failed('running'),'a refused read says nothing');
 // A first read that fails says so, with Retry.
 status.load=502;status.running=502;await poll();assert(failed('load').querySelector('button'),'a failed first read of /api/load has no Retry');assert(failed('running').querySelector('button'),'a failed first read of /api/running has no Retry');
 status.load=200;status.running=200;failed('load').querySelector('button').click();await settle();assert(card('server'),'Retry did not bring the cards');
 // Leaving stops the poll.
 w.location.hash='#issues';await settle();{const b=count('/api/load');w.eval('LOAD.at=0;ovPoll(false)');await settle();assert.equal(count('/api/load'),b,'Overview polls while another page shows')}
 assert(!requests.some(r=>!r.startsWith('GET ')&&!r.endsWith('/api/auth')),'the page wrote: '+requests.filter(r=>!r.startsWith('GET ')));
 assert(!errors.length,errors.join('\n'));
 console.log('dash_overview: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');w.close()})().catch(e=>{console.error(e);process.exit(1)});
