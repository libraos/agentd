// Overview: the team dash's landing page. A bare address opens it; an owner reads the
// compact task stats, server health and agents from GET /api/load, three SVG history charts
// from GET /api/overview/series (24h / 7d remembered per viewer, at most once a minute),
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
 tasks:{running:2,running_locations:{server:1,leased:1,member_hosts:0},queued:3,stale_running:0,stale_queued:27,blocked:1,waiting_person:1,approvals_pending:2,finished_today:7,day_since:'2026-11-18T00:00:00Z'},
 agents:{nodes:{idle:1,busy:2,not_ready:0,offline:1},nodes_total:4,leases:1,capacity:6,sessions:5,sessions_per_person:[{person:'ann',sessions:3},{person:null,sessions:2}]}};
const running={at:now,running:[
 {id:'hof-run1',goal:'Fix login '+evil,person:'ann',project:'acme/app',stage:'implement',node:'box-1',where:'remote',tool:'codex',model:'gpt-5.4',started:now,elapsed_min:12,spend_usd:1.5,spend_unpriced:0,budget:{text:'30m,$5',minutes:30,usd:5,state:'ok'},worker_state:'running',parked:false},
 {id:'hof-run2',goal:'Write the docs',person:'bob',project:'acme/site',stage:'implement',node:'srv',where:'local',tool:'claude',model:null,started:now,elapsed_min:3,spend_usd:null,spend_unpriced:1,budget:{text:'',minutes:null,usd:null,state:''},worker_state:'blocked',parked:false}]};
load.tasks.split={server:{running:1,queued:1,blocked:1,waiting_person:0,finished_today:4},hosts:{running:1,queued:2,blocked:0,waiting_person:1,finished_today:3}};
load.tasks.running_locations={server:1,leased:0,member_hosts:1};
load.tasks.hosts=[{node:'ann-laptop',person:'ann',mirrored:now,stale:false,running:1,queued:2,blocked:0,waiting_person:1,finished_today:3}];
function seriesFixture(range){const bucket_s=range==='24h'?3600:21600,n=range==='24h'?24:28,start=Date.parse('2026-11-14T00:00:00Z');return {range,bucket_s,
 buckets:Array.from({length:n},(_,i)=>({start:new Date(start+i*bucket_s*1000).toISOString(),created:{server:i===0?2:0,hosts:i===0?3:0},done:{server:i===0?4:0,hosts:i===0?1:0},failed:{server:i===0?1:0,hosts:i===0?2:0},usd:{server:i===0?1.25:i===1?0:null,hosts:i===0?.75:null},unpriced:{server:i===2?1:0,hosts:i===0?2:0}})),
 host:{name:'server-host '+evil,cores:8,samples:[{at:new Date(start+60000).toISOString(),cpu_pct:25,mem_pct:50},{at:new Date(start+120000).toISOString(),cpu_pct:null,mem_pct:51.5},{at:new Date(start+180000).toISOString(),cpu_pct:30.5,mem_pct:null},{at:new Date(start+240000).toISOString(),cpu_pct:0,mem_pct:0}]},sampling:{every_s:60,keep:'7d',since:new Date(start+60000).toISOString()}}}
const status={load:200,running:200,series:200};let noSamples=false,seriesPending=null,seriesVariant='';
let dash={user:'ann',role:'owner',now,team:true,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],waiting:[],claims:[],messages:[],inbox:[],checkouts:[],session_summary:{total:5,definition:'Agent connections seen within 2 minutes; excludes dashboard sessions.'}};
const requests=[],errors=[];let intervals=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=(body,st=200)=>({ok:st<400,status:st,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21620/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');w.localStorage.setItem('dash-overview-range:ann','7d');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 const si=w.setInterval.bind(w);w.setInterval=(f,ms,...a)=>{const id=si(f,ms,...a);intervals.push(ms);return id};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);requests.push((opts.method||'GET')+' '+u.pathname+u.search);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/load')return status.load===200?json(load):json({error:'down'},status.load);
  if(u.pathname==='/api/running')return status.running===200?json(running):json({error:'down'},status.running);
  if(u.pathname==='/api/overview/series'){assert(['24h','7d'].includes(u.searchParams.get('range')));assert.equal(u.searchParams.getAll('range').length,1);const data=seriesFixture(u.searchParams.get('range'));if(noSamples){data.host.samples=[];data.host.note='Only agentd server samples where /proc is available.'}if(seriesVariant==='zeros'){for(const p of data.buckets){for(const k of ['created','done','failed','unpriced'])p[k]={server:0,hosts:0};p.usd={server:0,hosts:null}}data.host.samples=[{at:data.buckets[0].start,cpu_pct:0,mem_pct:0}]}if(seriesVariant==='nulls'){data.host.samples=[{at:data.buckets[0].start,cpu_pct:null,mem_pct:null}];for(const p of data.buckets)p.usd={server:null,hosts:null}}if(seriesPending){const hold=seriesPending;seriesPending=null;return new Promise(resolve=>{hold.resolve=()=>resolve(json(data))})}return status.series===200?json(data):json({error:'down'},status.series)}
  if(u.pathname==='/api/issues')return json({issues:[]});
  if(u.pathname==='/api/team')return json({roles:[],members:[],problems:[],handoff_roles:{}});
  if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:false});
  return json({})}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
const body=()=>doc.getElementById('ov-body'),card=k=>body().querySelector('[data-ov-card="'+k+'"]'),fig=(k,f)=>(card(k)?.querySelector('[data-ov-fig="'+f+'"]')||body().querySelector('[data-ov-fig="'+f+'"]')).textContent;
const stale=k=>body().querySelector('[data-feed-stale="'+k+'"]'),failed=k=>body().querySelector('[data-feed-error="'+k+'"]');
const count=p=>requests.filter(r=>r.split('?')[0]==='GET '+p).length;
const poll=async()=>{w.eval('LOAD.at=0;RUNNING.at=0;ovPoll(false)');await settle()};
const historyPoll=async()=>{w.eval('OV_SERIES.at=0;ovPoll(false)');await settle()},chart=k=>body().querySelector('[data-ov-chart="'+k+'"]'),range=r=>body().querySelector('[data-ov-range="'+r+'"]');
const table=async kind=>{const d=chart(kind).querySelector('details');d.open=true;d.dispatchEvent(new w.Event('toggle'));await tick();return [...d.querySelectorAll('tbody tr')].map(r=>[...r.cells].map(c=>c.textContent))};
const pointer=(node,type,x=50,pointerType='mouse')=>{const e=new w.Event(type,{bubbles:true});Object.assign(e,{clientX:x,pointerType});node.dispatchEvent(e)};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // A bare address lands on Overview, the first rail item, with no click.
 assert(!doc.getElementById('page-overview').hidden,'a bare address does not land on Overview');
 assert.equal(doc.querySelector('.rail-item[aria-current="page"]').dataset.rail,'overview');assert.equal(doc.querySelector('#rail .rail-item').dataset.rail,'overview','Overview is not first in the rail');
 assert.equal(doc.querySelector('#page-title').textContent,'Overview');
 // Compact stats, smaller stale counts, one health strip, agents, charts, running table.
 assert.deepEqual([...body().querySelectorAll('[data-ov-card]')].map(c=>c.querySelector('h3').textContent),['Tasks','Server health','Agents']);
 assert.deepEqual([...card('tasks').querySelectorAll('dt')].map(c=>c.textContent),['Running','Queued','Waiting on a person','Blocked','Approvals pending','Finished today since midnight (UTC)']);
 assert(body().querySelector('.ov-quiet [data-ov-fig="stale-queued"]'),'stale counts are not apart from active totals');
 assert(card('server').compareDocumentPosition(body().querySelector('.ov-history'))&w.Node.DOCUMENT_POSITION_FOLLOWING);
 assert(body().querySelector('.ov-history').compareDocumentPosition(body().querySelector('.ov-running'))&w.Node.DOCUMENT_POSITION_FOLLOWING);
 for(const k of ['server','tasks','agents'])assert(/^updated \d/.test(card(k).querySelector('[data-ov-fresh]').textContent),k+' card does not say how fresh it is');
 assert.equal(fig('server','store'),'postgres');assert.equal(fig('server','queue'),'3');assert.equal(fig('server','latency'),'p50 8.2 ms · p95 41 ms');
 assert.equal(fig('server','cpu'),'25% of 8 cores');assert.equal(fig('server','mem'),'50% used of 16.0 GB');assert(/up 2h 30m/.test(fig('server','up')),'up: '+fig('server','up'));assert.equal(fig('server','lease'),'4s ago');
 assert.equal(fig('tasks','running'),'21 server ledger · 1 users’ devices1 server workers · 0 node leases · 1 workers on users’ devices');
 for(const [id,value] of [['queued','31 server ledger · 2 users’ devices'],['blocked','11 server ledger · 0 users’ devices'],['waiting','10 server ledger · 1 users’ devices'],['approvals','2Server approval requests'],['finished','74 server ledger · 3 users’ devices'],['stale-queued','27'],['stale-running','0']])assert.equal(fig('tasks',id),value,id+' count or split lost');
 assert.equal(fig('agents','nodes'),'1 idle · 2 busy · 0 not ready · 1 offline');assert.equal(fig('agents','leases'),'1 of 6');assert.equal(fig('agents','sessions'),'5');
 assert.equal(doc.querySelector('#stats [data-session-count]').textContent,fig('agents','sessions'),'header and card disagree on sessions');
 for(const f of body().querySelectorAll('.ov-figure'))assert(f.title,'a figure lost its definition tooltip');
 // Every prior load number remains readable, including health details in help tooltips.
 const help=id=>body().querySelector('[data-ov-fig="'+id+'"]').closest('.ov-figure').title;
 assert(help('cpu').includes('load 2'));assert(help('mem').includes('16384 MiB total')&&help('mem').includes('8192 MiB available'));assert(help('latency').includes('120')&&help('latency').includes('300 seconds'));assert(help('finished').includes(load.tasks.day_since));assert(help('up').includes(load.server.started)&&help('up').includes('9000 seconds'));assert(help('lease').includes(load.server.lease_pass_at)&&help('lease').includes('4 seconds'));assert(help('nodes').startsWith('4 nodes total'));
 assert(/ann 3/.test(fig('agents','people'))&&/Unattributed agent connections 2/.test(fig('agents','people')),'sessions per user: '+fig('agents','people'));
 // Three real SVG charts use the endpoint's nested server/hosts values, never CDN assets.
 assert.equal(range('7d').getAttribute('aria-pressed'),'true','saved range was not restored');
 assert(requests.includes('GET /api/overview/series?range=7d'),'saved range not sent');
 assert.deepEqual([...body().querySelectorAll('[data-ov-chart]')].map(c=>c.dataset.ovChart),['tasks','cost','host']);
 for(const kind of ['tasks','cost','host']){const svg=chart(kind).querySelector('svg');assert(svg&&svg.getAttribute('aria-label').includes('7d'),kind+' lacks a text alternative');assert(!/NaN|Infinity/.test(svg.outerHTML),kind+' has invalid geometry');assert.equal(svg.getAttribute('tabindex'),'0')}
 assert.equal(chart('tasks').querySelectorAll('[data-ov-event]').length,6);
 for(const [event,server,hosts] of [['created',2,3],['done',4,1],['failed',1,2]]){assert.equal(chart('tasks').querySelector('[data-ov-event="'+event+'"][data-ov-source="server"]').dataset.ovValue,String(server));const member=chart('tasks').querySelector('[data-ov-event="'+event+'"][data-ov-source="hosts"]');assert.equal(member.dataset.ovValue,String(hosts));assert(member.classList.contains('ov-member'))}
 assert.equal(chart('cost').querySelector('[data-ov-source="server"]').dataset.ovUsd,'1.25');assert.equal(chart('cost').querySelector('[data-ov-source="hosts"]').dataset.ovUsd,'0.75');
 assert.equal(chart('cost').querySelectorAll('[data-ov-unpriced]').length,2,'unpriced buckets not marked, including one with no dollars');
 assert.equal(chart('cost').querySelector('[data-ov-unpriced="2"]').textContent,'!');
 assert.equal(chart('host').querySelectorAll('[data-ov-line]').length,2);assert.equal((chart('host').querySelector('[data-ov-line="cpu_pct"]').getAttribute('d').match(/M/g)||[]).length,2,'CPU joined across a null sample');
 assert.equal([...chart('host').querySelectorAll('[data-ov-sample="cpu_pct"]')].pop().getAttribute('cy'),'156','zero CPU was lost');
 const tasksTable=await table('tasks');assert.equal(tasksTable.length,28);assert.deepEqual(tasksTable[0].slice(1),['2','3','4','1','1','2']);
 const costTable=await table('cost');assert.deepEqual(costTable[0].slice(1),['$1.25','≥ $0.75 · 2 unpriced','0','2']);assert.deepEqual(costTable[1].slice(1),['$0.00','no priced attempts','0','0']);assert(costTable[2][1].includes('1 unpriced'));
 const hostTable=await table('host');assert.deepEqual(hostTable.map(r=>r.slice(1)),[['25','50'],['not measured','51.5'],['30.5','not measured'],['0','0']]);
 // Hover, touch and keyboard each reveal values; server text stays text.
 for(const kind of ['tasks','cost','host']){const svg=chart(kind).querySelector('svg'),tip=chart(kind).querySelector('.mtip');pointer(svg,'pointermove',kind==='cost'?55:39);assert(!tip.hidden,kind+' lacks a hover tooltip');pointer(svg,'pointerleave',0);assert(tip.hidden);pointer(svg,'pointerdown',kind==='cost'?55:39,'touch');assert(!tip.hidden,kind+' lacks a tap tooltip');pointer(svg,'pointerleave',0,'touch');assert(!tip.hidden,'touch tooltip disappears immediately');svg.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',bubbles:true}));assert(!tip.hidden);svg.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(tip.hidden)}
 pointer(chart('cost').querySelector('svg'),'pointerdown',55,'touch');pointer(card('tasks'),'pointerdown',0,'touch');assert(chart('cost').querySelector('.mtip').hidden,'tap outside did not dismiss the tooltip');
 assert(chart('host').textContent.includes(evil)&&!body().querySelector('img'),'host name became markup');
 // Toggling refetches immediately and persists per viewer; re-entry reads the saved value.
 range('24h').click();await settle();assert.equal(range('24h').getAttribute('aria-pressed'),'true');assert.equal(w.localStorage.getItem('dash-overview-range:ann'),'24h');assert.equal((await table('tasks')).length,24);
 assert(requests.includes('GET /api/overview/series?range=24h'));
 w.eval("OV.viewer=null;OV.range='7d';ovPoll(false)");await settle();assert.equal(range('24h').getAttribute('aria-pressed'),'true','choice not remembered');
 w.eval("USER='bob';ovDraw();ovPoll(false)");await settle();assert.equal(range('24h').getAttribute('aria-pressed'),'true','another viewer inherited ann’s range');range('7d').click();await settle();assert.equal(w.localStorage.getItem('dash-overview-range:bob'),'7d');
 w.eval("USER='ann';ovDraw();ovPoll(false)");await settle();assert.equal(range('24h').getAttribute('aria-pressed'),'true','another viewer changed ann’s preference');
 // Blocked localStorage reads and writes are harmless.
 w.eval("OV.storageGet=Storage.prototype.getItem;OV.storageSet=Storage.prototype.setItem;Storage.prototype.getItem=function(k){if(k.startsWith('dash-overview-range:'))throw new Error('blocked');return OV.storageGet.call(this,k)};Storage.prototype.setItem=function(k,v){if(k.startsWith('dash-overview-range:'))throw new Error('blocked');return OV.storageSet.call(this,k,v)};OV.viewer=null;ovPoll(false)");await settle();range('7d').click();await settle();assert.equal(range('7d').getAttribute('aria-pressed'),'true');
 w.eval('Storage.prototype.getItem=OV.storageGet;Storage.prototype.setItem=OV.storageSet');
 w.localStorage.setItem('dash-overview-range:ann','unsupported');w.eval('OV.viewer=null;ovPoll(false)');await settle();assert.equal(range('24h').getAttribute('aria-pressed'),'true','invalid saved value was sent to the API');range('7d').click();await settle();
 // A late answer for the old range cannot replace the current chart.
 {const pending={};seriesPending=pending;range('24h').click();await tick();assert(pending.resolve);range('7d').click();await settle();pending.resolve();await settle();assert.equal(range('7d').getAttribute('aria-pressed'),'true');assert.equal((await table('tasks')).length,28)}
 // In-flight reads are also invalidated by a viewer switch or leaving Overview.
 {const pending={};seriesPending=pending;w.eval('OV_SERIES.at=0;ovPoll(false)');await tick();w.localStorage.setItem('dash-overview-range:bob','24h');w.eval("USER='bob';ovDraw();ovPoll(false)");await settle();pending.resolve();await settle();assert.equal((await table('tasks')).length,24,'previous viewer’s answer was accepted');w.eval("USER='ann';ovDraw();ovPoll(false)");await settle()}
 {const pending={};seriesPending=pending;range('24h').click();await tick();w.location.hash='#issues';await settle();pending.resolve();await settle();w.location.hash='#overview';await settle();assert(chart('tasks'),'returning during an initial fetch stayed Loading until the minute poll');assert.equal((await table('tasks')).length,24)}
 // No samples explains the server's reason, while task and cost charts remain visible.
 noSamples=true;await historyPoll();assert.equal(chart('host').querySelector('[data-ov-no-samples]').textContent,'No host samples. Only agentd server samples where /proc is available.');assert(chart('tasks').querySelector('svg')&&chart('cost').querySelector('svg'));noSamples=false;await historyPoll();
 // Empty measurements, measured zero and a single resource sample keep valid geometry.
 seriesVariant='zeros';await historyPoll();assert.equal(chart('tasks').querySelectorAll('[data-ov-event]').length,0);assert.equal(chart('cost').querySelectorAll('[data-ov-unpriced]').length,0);assert.equal((await table('cost'))[0][1],'$0.00');assert.equal(chart('host').querySelectorAll('[data-ov-sample]').length,2);assert.equal(chart('host').querySelector('[data-ov-sample]').getAttribute('cy'),'156');
 seriesVariant='nulls';await historyPoll();assert.equal(chart('host').querySelectorAll('[data-ov-line]').length,0);assert.deepEqual((await table('host'))[0].slice(1),['not measured','not measured']);assert((await table('cost'))[0][1].includes('no priced attempts'));
 for(const svg of body().querySelectorAll('.ov-chart svg'))assert(!/NaN|Infinity/.test(svg.outerHTML));seriesVariant='';await historyPoll();
 // Expanded tables and keyboard focus survive the load refresh; observers are replaced.
 await table('tasks');chart('tasks').querySelector('summary').focus();await poll();assert(chart('tasks').querySelector('details').open);assert.equal(doc.activeElement,chart('tasks').querySelector('summary'));assert.equal(w.eval('OV.observers.length'),3);
 // The series shares the 10 s page poll but is read only once a minute, including re-entry.
 {const n=requests.filter(r=>r.startsWith('GET /api/overview/series?')).length;await poll();w.eval('ovPoll(true)');await settle();assert.equal(requests.filter(r=>r.startsWith('GET /api/overview/series?')).length,n,'history fetched before a minute');await historyPoll();assert.equal(requests.filter(r=>r.startsWith('GET /api/overview/series?')).length,n+1)}
 // Its refresh failure retains explicitly stale charts; permission failure removes them.
 status.series=503;await historyPoll();assert(stale('series')&&chart('tasks'),'history refresh failure lost the chart or looks live');assert.equal(body().querySelector('.ov-history [data-ov-fresh]').textContent.slice(0,6),'as of ');status.series=200;stale('series').querySelector('button').click();await settle();assert(!stale('series'));
 status.series=403;await historyPoll();assert(!chart('tasks')&&failed('series')&&!stale('series'),'denied history still displayed');status.series=502;await historyPoll();assert(failed('series').querySelector('button'),'first history failure has no retry');status.series=200;failed('series').querySelector('button').click();await settle();assert(chart('tasks'));
 // The running tasks: a row each, its columns, opening its task; a goal is text.
 const rows=[...body().querySelectorAll('tr[data-running]')];assert.deepEqual(rows.map(r=>r.dataset.running),['hof-run1','hof-run2']);
 assert.deepEqual([...body().querySelectorAll('.ov-table th')].map(t=>t.textContent),['Task','User','Project','Node','Tool and model','Elapsed','Spend','State']);
 const cells=r=>[...r.querySelectorAll('td')].map(t=>t.textContent);
 assert.deepEqual(cells(rows[0]).slice(1),['ann','acme/app','box-1','Codex · gpt-5.4','12 min of 30 min','$1.50 of $5.00','running']);
 assert.deepEqual(cells(rows[1]).slice(1),['bob','acme/site','srv (this host)','Claude','3 min','unknown','waiting on a prompt']);
 const a=rows[0].querySelector('a');assert.equal(a.getAttribute('href'),'#issues/hof-run1');assert(a.textContent.includes(evil)&&!body().querySelector('img'),'a goal became markup');
 assert.equal(body().querySelector('[data-ov-count]').textContent,'2');
 // Stale rows have their own section and reason, never increasing Running.
 running.running.push({...running.running[0],id:'hof-stale',where:'host',node:'quiet-laptop',stale:true,stale_reason:'member host has not mirrored recently',mirrored:now});load.tasks.stale_running=1;await poll();
 assert.equal(body().querySelectorAll('tr[data-running]').length,2);assert.equal(body().querySelectorAll('tr[data-stale-running]').length,1);assert.equal(body().querySelector('[data-ov-count]').textContent,'2');assert.equal(fig('tasks','stale-running'),'1');
 assert(body().querySelector('tr[data-stale-running]').textContent.includes('member host has not mirrored recently'),'stale worker has no visible reason');
 running.running.pop();load.tasks.stale_running=0;await poll();
 rows[1].querySelector('td:nth-child(3)').click();await settle();assert.equal(w.location.hash,'#issues/hof-run2','a row click does not open its task');
 w.location.hash='#overview';await settle();assert(body().querySelector('tr[data-running="hof-run1"]'),'Overview did not come back');
 // Durations round the whole before splitting: never "60 min", "1m 60s" or "55h 60m".
 for(const [expr,want] of [['fmtMin(59.6)','1h 00m'],['fmtMin(3359.7)','56h 00m'],['fmtMin(0.995)','1 min'],['fmtMin(59.4)','59 min'],['fmtMin(125.2)','2h 05m'],
  ['ovDur(59.6*60)','1h 00m'],['ovDur(3359.7*60)','2d 8h'],['ovDur(59.6)','1 min'],['ovDur(86390)','1d 0h'],['ovDur(7199.9)','2h 00m'],
  ['fmtDur(59600)','1m 00s'],['fmtDur(3599600)','1h 00m'],['fmtDur(9960)','10s'],['fmtDur(9940)','9.9s']])assert.equal(w.eval(expr),want,expr);
 // /api/load is asked with the viewer's zone; Finished today says whose midnight it counts from, UTC for an older server.
 {const tz=w.eval('Intl.DateTimeFormat().resolvedOptions().timeZone');assert(requests.includes('GET /api/load?tz='+encodeURIComponent(tz)),'no tz on /api/load: '+requests.filter(r=>r.includes('/api/load')));
  const hint=()=>card('tasks').querySelector('[data-ov-day-tz]');assert.equal(hint().textContent,' since midnight (UTC)','an older server without day_tz is not labelled UTC');
  load.tasks.day_tz='America/New_York';await poll();assert.equal(hint().textContent,' since midnight (America/New_York)');assert(/Finished today since midnight \(America\/New_York\)/.test(hint().closest('dt').textContent));
  assert.equal(fig('tasks','finished'),'74 server ledger · 3 users’ devices','the finished count lost its split');delete load.tasks.day_tz;await poll()}
 // Needs a person lists only what a person can unblock now: not an unconfirmed worker, a quiet host's mirrored task or an offered handoff with no worker.
 {const needs=()=>body().querySelector('[data-ov-needs]'),ids=()=>[...needs().querySelectorAll('[data-ov-need-row]')].map(r=>r.dataset.ovNeedRow);
  running.running.push({...running.running[1],id:'hof-unconf',where:'host',node:'quiet-laptop',stale:true,stale_reason:'member host has not confirmed a live worker',worker_state:'blocked'});
  load.tasks.hosts=[...load.tasks.hosts,{node:'quiet-laptop',person:'cy',mirrored:now,stale:true,running:0,queued:0,blocked:0,waiting_person:0,finished_today:0}];
  dash={...dash,handoff_list:[{id:'hof-unconf',goal:'Unconfirmed',state:'claimed',worker_state:'blocked',origin:'host',host:'quiet-laptop'},
   {id:'hof-quiet',goal:'Quiet host',state:'claimed',worker_state:'waiting_answer',origin:'host',host:'quiet-laptop',mirror:{node:'quiet-laptop',person:'cy'}},
   {id:'hof-released',goal:'Released',state:'offered',worker_state:'blocked'},
   {id:'hof-live',goal:'Live host',state:'claimed',worker_state:'blocked',origin:'host',host:'ann-laptop',mirror:{node:'ann-laptop',person:'ann'}}]};
  w.eval('refresh()');await poll();
  assert.deepEqual(ids(),['hof-run2','hof-live'],'unconfirmed, quiet-host or released rows are listed under Needs a person');
  assert(!needs().textContent.includes('unconfirmed'),'an unconfirmed state shows under Needs a person');
  assert(body().querySelector('tr[data-stale-running="hof-unconf"]'),'the unconfirmed worker left Unconfirmed / stale workers');
  running.running.pop();load.tasks.hosts.pop();dash={...dash,handoff_list:[]};w.eval('refresh()');await poll()}
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
