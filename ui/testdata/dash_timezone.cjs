// Time zones (libraos/core dash time zone): every time on the page is in the viewer's own zone,
// with a short zone label where a time stands alone and its UTC value in the tooltip, from one
// shared formatter (fmtTime, timeEl, utcTitle). Every day and week request sends the viewer's
// IANA zone (tz=), and each figure names the zone the server answered with (its tz), or UTC
// when an older server sends none. Run under two zones, so a page that read the UTC digits
// of a time string would fail in at least one:
// TZ=Asia/Shanghai|America/New_York DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 node testdata/dash_timezone.cjs dash.html
'use strict';
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',TZ=process.env.TZ||'Asia/Shanghai';
// What the viewer's clock reads for the fixtures' instants, worked out by hand for each zone.
// 2026-11-25T02:30:05Z is 10:30:05 on the 25th in Shanghai and 21:30:05 on the 24th in New York.
const WANT={
 'Asia/Shanghai':{label:'GMT+8',at:'2026-11-25 10:30:05',time:'10:30:05',date:'2026-11-25',day:'Wednesday, November 25, 2026',bucket:'2026-11-25 10:00',bucketEnd:'16:00',tick7d:'11-25 10h',run:'11-25 10:30'},
 'America/New_York':{label:'EST',at:'2026-11-24 21:30:05',time:'21:30:05',date:'2026-11-24',day:'Tuesday, November 24, 2026',bucket:'2026-11-24 21:00',bucketEnd:'2026-11-25 03:00',tick7d:'11-24 21h',run:'11-24 21:30'}}[TZ];
if(!WANT){console.error('dash_timezone: run with TZ=Asia/Shanghai or TZ=America/New_York');process.exit(2)}
process.env.TZ=TZ;
const AT='2026-11-25T02:30:05Z',BUCKET='2026-11-25T02:00:00Z',evil='<img src=x onerror=alert(1)>';
// answerTz: the zone the fixture server answers with; null is an older server that sends none.
let answerTz=TZ;const requests=[],errors=[];
const zoned=o=>answerTz?{...o,tz:answerTz}:o;
const dash={user:'ann',role:'owner',now:AT,team:true,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],waiting:[],claims:[],messages:[],inbox:[],checkouts:[],counts:{},handoffs:{},host_states:{},
 runs:[{key:'run-1',project:'acme/app',arm:'a',status:'ok',checks:'2/2',minutes:3,usd:0.5,started:AT}],spend_today:{usd:1.5,workers:2,unpriced:0,pending:0}};
const load={at:AT,server:{started:AT,up_s:60,store:'sqlite',queue_depth:0,latency:{},host:{}},tasks:{running:0,queued:0,blocked:0,waiting_person:0,approvals_pending:0,finished_today:1,day_since:'2026-11-24T16:00:00Z'},agents:{nodes:{},nodes_total:0,leases:0,capacity:0,sessions:0}};
const series=range=>({range,bucket_s:range==='24h'?3600:21600,buckets:[{start:BUCKET,created:{server:1,hosts:0},done:{server:0,hosts:0},failed:{server:0,hosts:0},usd:{server:0.5,hosts:null},unpriced:{server:0,hosts:0}}],
 host:{name:'srv',cores:2,samples:[{at:AT,cpu_pct:10,mem_pct:20}]},sampling:{every_s:60,keep:'7d',since:AT}});
const factory=()=>({factory:1,since:'2026-11-18T00:00:00+08:00',until:'2026-11-25T10:30:05+08:00',handoffs:1,interactive_left_out:0,total:{handoffs:1,dispatched:1},by_week:[],by_tool:[],by_stage:[],by_agent_model:[],workflow_changes:{n:0,merged_prs:0},
 load:Object.assign({max_workers:2,peak_workers:1,unpriced:0,averages:{days:1,tasks_per_day:1,worker_minutes_per_day:3,usd_per_day:0.5},days:[{day:'2026-11-25',start:'2026-11-25T00:00:00+08:00',dispatched:1,worker_minutes:3,usd:0.5,unpriced:0,peak_workers:1}]},answerTz?{tz:answerTz}:{})});
const rate={not_enough_data:true,n:0,of:0,coverage:{decided:0,all:0},rule:'Fixture rule'},lat={n:0};
const metrics=()=>({tasks:{all:1,accepted:0,failed:0,undecided:1},outcomes:{autonomous_task_success_rate:rate,first_pass_acceptance_rate:rate,human_execution_intervention_rate:rate,cost_per_accepted_task:rate},
 workflow:{latency:{open_to_merge:lat,open_to_first_review:lat,first_review_to_merge:lat},task_execution_time:{...rate,running:0}},reference:{ai_only_commit_rate:rate,infra_failure_rate:rate},cost:{prs:0},coverage:{covered:true},merged:1,
 chart:Object.assign({unit:'day',opened:1,points:[{start:'2026-11-25',start_at:'2026-11-25T00:00:00+08:00',opened:1,merged:1,costed:0,missing:1,floors:0,usd:0}]},answerTz?{tz:answerTz}:{})});
const insights=()=>({since:'2026-10-28T00:00:00+08:00',until:'2026-11-25T10:30:05+08:00',scope:'all',handoffs:1,total:{coverage:{attempts:0},usage:{attempts:0,tasks_per_day:[{day:'2026-11-25',start:'2026-11-25T00:00:00+08:00',handoffs:1}]},success:{},cost:{}},by_person:[],by_model:[],by_project:[],rules:{}});
const usage=()=>({from:'2026-10-26T00:00:00+08:00',to:'2026-11-25T10:30:05+08:00',totals:{workers:1,tokens:10,usd:0.5},daily:[{name:'2026-11-25',start:'2026-11-25T00:00:00+08:00',workers:1,tokens:10,usd:0.5}],by_user:[],by_project:[],by_tool:[],by_model:[],errors:[]});
const history=()=>({rows:[{id:'hof-1',state:'done',goal:'Fix the flaky test',updated:AT}],total:1,groups:1,next:null,limit:50,facets:{states:['done'],sources:[],creators:[]}});
const json=b=>({ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(b)),text:async()=>JSON.stringify(b)});
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21620/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');w.localStorage.setItem('dash-overview-range:ann','7d');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href),p=u.pathname;requests.push({path:p,params:u.searchParams});
  if(p==='/api/auth')return {ok:true,status:204};
  if(p==='/api/dash')return json(answerTz?{...dash,spend_today:{...dash.spend_today,tz:answerTz}}:dash);
  if(p==='/api/load')return json(zoned({...load,tasks:answerTz?{...load.tasks,day_tz:answerTz}:load.tasks}));
  if(p==='/api/running')return json({at:AT,running:[]});
  if(p==='/api/overview/series')return json(zoned(series(u.searchParams.get('range'))));
  if(p==='/api/factory')return json(zoned(factory()));
  if(p==='/api/metrics')return json(zoned(metrics()));
  if(p==='/api/insights')return json(zoned(insights()));
  if(p==='/api/usage')return json(zoned(usage()));
  if(p==='/api/history')return json(zoned(history()));
  if(p==='/api/team')return json(u.searchParams.has('member')?zoned({kind:'member',name:'ann',member:{role:'owner'},from:AT,to:AT,period:{states:{}},grants:[],nodes:[],devices:[],activity:[]}):{members:[{name:'ann',role:'owner'}],roles:[],problems:[],handoff_roles:{}});
  if(p==='/api/bench')return json({rounds:[]});
  if(p==='/api/issues')return json({issues:[]});
  if(p==='/api/chat')return json({chats:[],roles:[],gateway_ready:false});
  return json({})}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()},route=async h=>{w.location.hash=h;await settle()};
const $=id=>doc.getElementById(id);
// Every day and week endpoint, and whether it was asked with the viewer's zone.
const DAY_APIS=['/api/dash','/api/load','/api/overview/series','/api/factory','/api/metrics','/api/insights','/api/usage','/api/history','/api/team?member'];
const asked=api=>requests.filter(r=>api==='/api/team?member'?r.path==='/api/team'&&r.params.has('member'):r.path===api);
const openTable=async kind=>{const d=$('ov-body').querySelector('[data-ov-chart="'+kind+'"] details');d.open=true;d.dispatchEvent(new w.Event('toggle'));await tick();return d};
// visible: the page's text, its scripts and tooltips (title) aside.
const visible=()=>{const out=[],walk=doc.createTreeWalker(doc.body,w.NodeFilter.SHOW_TEXT);for(let n=walk.nextNode();n;n=walk.nextNode())if(!n.parentElement.closest('script,style,template'))out.push(n.nodeValue);return out.join(' ')};
async function visitAll(){
 await route('#overview');await openTable('tasks');await openTable('host');
 await route('#insights/success');await route('#insights/usage');await route('#insights/metrics');await route('#insights/workers');await route('#insights/history');
 await route('#team/member/ann');}
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 assert.equal(w.eval('Intl.DateTimeFormat().resolvedOptions().timeZone'),TZ,'jsdom does not follow TZ');
 // The shared formatter: the viewer's clock, the zone label where a time stands alone, UTC only in the tooltip.
 assert.equal(w.eval('fmtTime('+JSON.stringify(AT)+')'),WANT.at);
 assert.equal(w.eval('fmtTime('+JSON.stringify(AT)+",'time',true)"),WANT.time+' '+WANT.label);
 assert.equal(w.eval('fmtTime("2026-11-25T10:30:05+08:00","datetime")'),WANT.at,'an offset stamp is not the same instant');
 assert.equal(w.eval('utcTitle('+JSON.stringify(AT)+')'),'2026-11-25 02:30:05 UTC');
 assert.equal(w.eval('fmtTime("not a time")'),'');assert.equal(w.eval('fmtTime(null)'),'');
 // The header clock reads the viewer's time; UTC is in its tooltip.
 assert.equal($('now').textContent,WANT.time+' '+WANT.label);assert($('now').title.startsWith('2026-11-25 02:30:05 UTC'),$('now').title);
 await visitAll();assert(!errors.length,errors.join('\n'));
 // (1) Every day and week request sends the viewer's zone.
 for(const api of DAY_APIS){const rs=asked(api);assert(rs.length,'never asked '+api);for(const r of rs)assert.equal(r.params.get('tz'),TZ,api+' asked without the viewer’s zone')}
 // Date inputs are local dates, sent as typed beside the zone.
 $('h-from').value='2026-11-20';$('h-from').dispatchEvent(new w.Event('change',{bubbles:true}));$('h-from').dispatchEvent(new w.Event('input',{bubbles:true}));await settle();
 {const r=asked('/api/history').pop();assert.equal(r.params.get('from'),'2026-11-20','the From date was not sent as the local date');assert.equal(r.params.get('tz'),TZ)}
 assert(/your time zone/.test($('h-from').getAttribute('aria-label')),$('h-from').getAttribute('aria-label'));
 // (2) Figures name the zone the server answered with.
 assert.equal($('ins-period').textContent.endsWith(' ('+TZ+')'),true,$('ins-period').textContent);
 assert.equal($('u-day-h').textContent,'Day ('+TZ+')');
 assert.equal(doc.querySelector('.fload thead th').textContent,'Day ('+TZ+')');
 assert.equal(doc.querySelector('#factory .mchart-title').textContent,'Dispatched and peak workers, per day ('+TZ+')');
 assert.equal(doc.querySelector('#m-body .mtable thead th').textContent,'Day ('+TZ+')');
 assert.equal(doc.querySelector('#m-body .mtable tbody td').title,'2026-11-25T00:00:00+08:00','a day’s start is not in its tooltip');
 await route('#insights/usage');assert.equal(doc.querySelector('[data-ix-days] [data-tz]').textContent,'handoffs created, days in '+TZ);assert($('ix-coverage').textContent.endsWith('Days are in '+TZ+'.'),$('ix-coverage').textContent);
 // (3) Times stand in the viewer's zone. Overview: the bucket table, its caption and the chart tooltip.
 await route('#overview');const tasks=await openTable('tasks');
 assert.equal(tasks.querySelector('thead th').textContent,'Bucket start ('+WANT.label+')');
 const cell=tasks.querySelector('tbody td');assert.equal(cell.textContent,WANT.bucket);assert.equal(cell.querySelector('time').title,'2026-11-25 02:00:00 UTC');
 assert.equal(tasks.querySelector('caption').textContent,'Bucket duration: 6 hours, cut on the '+TZ+' clock');
 const tip=$('ov-body').querySelector('[data-ov-chart="tasks"] .ov-hit title').textContent;assert(tip.startsWith(WANT.bucket+' – '+WANT.bucketEnd+' '+WANT.label),tip);
 assert($('ov-body').querySelector('[data-ov-chart="tasks"] .m-tick[text-anchor="start"]').textContent===WANT.tick7d,'axis tick not local');
 assert(/cut on the .* clock/.test($('ov-body').querySelector('[data-ov-chart="tasks"] .ov-chart-note').textContent));
 assert.equal($('ov-body').querySelector('[data-ov-day-tz]').textContent,'since midnight ('+TZ+') · ');
 const host=await openTable('host');assert.equal(host.querySelector('thead th').textContent,'Sample ('+WANT.label+')');assert.equal(host.querySelector('tbody td').textContent,WANT.bucket.slice(0,11)+WANT.at.slice(11,16));
 // History's Finished is the viewer's date, the UTC time in its tooltip.
 await route('#insights/history');const fin=doc.querySelector('#h-rows td[data-label="Finished"]');assert.equal(fin.textContent,WANT.date);assert.equal(fin.title,'2026-11-25 02:30:05 UTC');
 // Latest runs' Started.
 {const td=[...doc.querySelectorAll('#t-runs td')].pop();assert.equal(td.textContent,WANT.run+' '+WANT.label);assert.equal(td.title,'2026-11-25 02:30:05 UTC')}
 // A session's Started and its feed: event times and day headings on the viewer's clock.
 {const head=w.eval('historyHead('+JSON.stringify({id:'s-1',tool:'claude',started:AT,left_at:'2026-11-25T03:00:00Z',label:'s'})+')');
  const started=[...head.querySelectorAll('time')];assert.equal(started[0].textContent,WANT.at+' '+WANT.label);assert.equal(started[0].title,'2026-11-25 02:30:05 UTC');assert.equal(started.length,2,'left time missing');
  assert(!/UTC/.test(head.textContent),'the session head shows UTC: '+head.textContent);
  const list=doc.createElement('div'),count=doc.createElement('span');
  w.eval('renderTimeline')({items:[{kind:'msg',text:'hello '+evil,ref:'m-1',at:AT,ago:'5m'}],bodies:false},list,count);
  assert.equal(list.querySelector('.day').textContent,WANT.day);assert.equal(list.querySelector('.event-time').textContent,WANT.time+' '+WANT.label+', 5m ago');
  assert.equal(list.querySelector('.event-time time').title,'2026-11-25 02:30:05 UTC');assert(!list.querySelector('img'),'event text was parsed as HTML')}
 // No time on the page is shown as UTC: the word is only in tooltips.
 assert(!/\bUTC\b/.test(visible()),'UTC shown on the page: '+(visible().match(/.{0,60}\bUTC\b.{0,30}/)||[''])[0]);
 // (4) An older server that sends no tz: the page keeps working and labels its day figures UTC.
 answerTz=null;w.eval('INS_READ.metrics=INS_READ.workers=0;IX.at=0');
 await route('#insights/metrics');assert(errors.length===0,errors.join('\n'));
 assert($('ins-period').textContent.endsWith(' (UTC)'),$('ins-period').textContent);
 assert.equal(doc.querySelector('.fload thead th').textContent,'Day (UTC)');assert.equal(doc.querySelector('#m-body .mtable thead th').textContent,'Day (UTC)');
 await route('#insights/workers');assert.equal($('u-day-h').textContent,'Day (UTC)');
 await route('#insights/usage');assert.equal(doc.querySelector('[data-ix-days] [data-tz]').textContent,'handoffs created, days in UTC');
 await route('#overview');w.eval('OV_SERIES.at=0;LOAD.at=0;ovPoll(true)');await settle();
 assert.equal($('ov-body').querySelector('[data-ov-day-tz]').textContent,'since midnight (UTC) · ');
 assert.equal((await openTable('tasks')).querySelector('caption').textContent,'Bucket duration: 6 hours, cut on the UTC clock');
 // Times still read the viewer's clock: only the server's day cut is UTC.
 assert.equal((await openTable('tasks')).querySelector('tbody td').textContent,WANT.bucket);
 assert(!errors.length,errors.join('\n'));
 console.log('dash_timezone: ok '+TZ+' '+(phone?'phone':'desktop'));
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
