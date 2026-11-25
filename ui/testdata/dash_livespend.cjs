// Spend so far of a running task: GET /api/running's spend_running, spend_live and spend_note,
// and a running attempt's usd_so_far or spend_note. Overview's Running tasks reads "$1.42 so far"
// in the page's money format, the reason instead of a bare "unknown" ("not priced: MODEL", "not
// measured yet"), the final figure once the attempt ended, and an older server's rows as before;
// a task's runs and the app's task rows count a running attempt so far, never as a recorded result.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_livespend.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const load={at:now,server:{started:now,up_s:60,store:'sqlite',queue_depth:0,latency:{},host:{},server_mode:'server'},
 tasks:{running:6,queued:0,stale_running:0,stale_queued:0,blocked:0,waiting_person:0,approvals_pending:0,finished_today:0,day_since:now},
 agents:{nodes:{idle:0,busy:0,not_ready:0,offline:0},nodes_total:0,leases:0,capacity:0,sessions:0,sessions_per_person:[]}};
const row=(id,x)=>({id,goal:'Task '+id,person:'ann',project:'acme/app',stage:'implement',node:'srv',where:'local',tool:'claude',model:'claude-test',started:now,elapsed_min:10,spend_unpriced:0,budget:{text:'',minutes:null,usd:null,state:''},worker_state:'running',parked:false,...x});
const running={at:now,running:[
 // a priced running attempt, against a dollar budget
 row('hof-live',{spend_usd:1.42,spend_running:true,spend_live:{started:now,measured_at:now,usd:1.42,model:'claude-test',tokens:1000},budget:{text:'$5',minutes:null,usd:5,state:'ok'}}),
 // a model with no price, no earlier attempt
 row('hof-unpriced',{spend_usd:null,spend_unpriced:1,spend_running:true,spend_note:'not priced: zz-model '+evil,spend_live:{started:now,measured_at:now,why:'not priced: zz-model '+evil}}),
 // an ended priced attempt, and a running one with no usage log yet: a floor, with its reason
 row('hof-nolog',{spend_usd:1.25,spend_unpriced:1,spend_running:true,spend_note:'not measured yet',spend_live:{started:now,measured_at:now,why:'not measured yet'}}),
 // a device's running task: the device's own figure
 row('hof-host',{where:'host',node:'ann-laptop',host_person:'ann',read_only:true,mirrored:now,spend_usd:0.5,spend_running:true,spend_live:{started:now,measured_at:now,usd:0.5}}),
 // an older server: no running figure, priced and unknown
 row('hof-old',{spend_usd:1.5}),
 row('hof-oldnull',{spend_usd:null,spend_unpriced:1})]};
let dash={user:'ann',role:'owner',now,team:true,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],waiting:[],claims:[],messages:[],inbox:[],checkouts:[]};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=body=>({ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21620/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async url=>{const u=new URL(url,w.location.href);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/load')return json(load);
  if(u.pathname==='/api/running')return json(running);
  if(u.pathname==='/api/overview/series')return json({range:'24h',bucket_s:3600,buckets:[],host:{name:'h',cores:1,samples:[]}});
  if(u.pathname==='/api/issues')return json({issues:[]});
  if(u.pathname==='/api/team')return json({roles:[],members:[],problems:[],handoff_roles:{}});
  if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:false});
  return json({})}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
const body=()=>doc.getElementById('ov-body'),spendCell=id=>body().querySelector('tr[data-running="'+id+'"] td:nth-child(7)');
const poll=async()=>{w.eval('LOAD.at=0;RUNNING.at=0;ovPoll(false)');await settle()};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 assert(!doc.getElementById('page-overview').hidden,'Overview did not open');
 // Running now: dollars so far in the page's money format, the reason when unknown, never a bare "unknown".
 assert.equal(spendCell('hof-live').textContent,'$1.42 so far of $5.00');
 assert(/Spend so far, including the running attempt; measured /.test(spendCell('hof-live').title),'no measured time: '+spendCell('hof-live').title);
 assert.equal(spendCell('hof-unpriced').textContent,'not priced: zz-model '+evil);
 assert.equal(spendCell('hof-nolog').textContent,'≥ $1.25 so far (not measured yet)');
 assert.equal(spendCell('hof-host').textContent,'$0.50 so far');assert(/reported by the device/.test(spendCell('hof-host').title),'a device\'s figure is not said to be its own');
 // An older server sends no running figure: as before.
 assert.equal(spendCell('hof-old').textContent,'$1.50');assert.equal(spendCell('hof-oldnull').textContent,'unknown');assert.equal(spendCell('hof-old').title,'');
 assert(!body().querySelector('img'),'a reason became markup');
 // The attempt ends: the recorded figure, no "so far".
 Object.assign(running.running[0],{spend_usd:1.5,spend_running:undefined,spend_live:undefined});delete running.running[0].spend_running;delete running.running[0].spend_live;await poll();
 assert.equal(spendCell('hof-live').textContent,'$1.50 of $5.00');
 // A task's runs: a running attempt's dollars so far or its reason, never as a recorded result.
 const runs=[{tool:'claude',model:'claude-test',running:true,minutes:10,usd_so_far:1.42,tokens_so_far:1000,end_reason:null},{tool:'claude',model:'zz',running:true,minutes:2,spend_note:'not priced: zz',end_reason:null}];
 w.__runs=runs;
 const strip=w.eval('runStrip({attempts:[__runs[0]]})').textContent;assert(strip.includes('$1.42 so far'),'strip: '+strip);assert(strip.includes(w.eval('fmtTok(1000)')+' tokens'),'a running attempt\'s tokens so far: '+strip);
 const strip2=w.eval('runStrip({attempts:[{tool:"claude",running:false,minutes:5,usd:1.25,tokens:10,end_reason:"done"},__runs[1]]})').textContent;assert(strip2.includes('≥ $1.25')&&strip2.includes('not priced: zz'),'strip with an unpriced run: '+strip2);
 const r0=w.eval('runRow(__runs[0])').textContent,r1=w.eval('runRow(__runs[1])').textContent,r2=w.eval('runRow({tool:"claude",running:true,minutes:1})').textContent;
 assert(r0.includes('$1.42 so far'),'run row: '+r0);assert(r1.includes('not priced: zz')&&!r1.includes('not priced yet'),'run row reason: '+r1);assert(r2.includes('not priced yet'),'an older server\'s running attempt: '+r2);
 // The app's task rows: the total includes a running attempt so far and says so; an older server's rows as before.
 assert.equal(w.eval('apSpend({attempts:[{usd:1},{usd_so_far:0.42,running:true}]})'),'$1.42 so far');
 assert.equal(w.eval('apSpend({attempts:[{usd:1.5}]})'),'$1.50');assert.equal(w.eval('apSpend({attempts:[{running:true}]})'),'');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_livespend: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');w.close()})().catch(e=>{console.error(e);process.exit(1)});
