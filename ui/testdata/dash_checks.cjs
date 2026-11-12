// A task's Checks section (GET /api/checks): the command, one row per run newest
// first with the values the API sends, a failed run's failing test and output
// tail as text, and one line for a task with no check. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_checks.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const task=id=>({id,title:'Task '+id,goal:'Task '+id,state:'claimed',claimer:'s-alice',from:'s-alice',from_user:'alice',claimer_user:'alice',to:'any',project:'acme/repo',stage:'implement',updated_ago:'1m',age:'1m'});
const dash={user:'alice',role:'owner',now,handoff_list:[task('hof-runs'),task('hof-none')],sessions:[],done:[],waiting:[],claims:[],messages:[]};
// What the API sends for hof-runs: fail, fail, pass, newest first, as handoff show lists them.
const runs=[
 {actor:'s-bob',user:'bob',result:'passed',command:'go test ./...',dir:'/w',at:'2026-11-12T10:30:00Z',exit:0,tests:'6 tests',revert_test:'not evidence: the 2 tests pass with the change\'s 1 non-test file(s) reverted, so the check does not show the change works',wall_s:7},
 {actor:'s-alice',user:'alice',result:'failed',command:'go test ./...',dir:'/w',at:'2026-11-12T10:20:00Z',exit:1,wall_s:5,failure:'TestBeta',tail:'--- FAIL: TestBeta '+evil},
 {actor:'s-alice',result:'timed_out',command:'go test ./...',dir:'/w',at:'2026-11-12T10:10:00Z',tests:'4 tests',wall_s:600}];
const checks={'hof-runs':{handoff:'hof-runs',check:'go test ./...',runs},'hof-none':{handoff:'hof-none',check:'',runs:[],none:'This task has no check.'}};
const errors=[],asked=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#issues',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.fetch=async(url)=>{const u=new URL(url,w.location.href);let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/checks'){const id=u.searchParams.get('id');asked.push(id);if(!checks[id])return {ok:false,status:404,json:async()=>({}),text:async()=>'unknown handoff '+id+'\n'};body=checks[id]}
  else if(u.pathname==='/api/workitem'){const id=u.searchParams.get('ref');body={kind:'handoff',ref:id,tree:[{...task(id),focus:true}],prs:[]}}
  else if(u.pathname==='/api/issue'){const id=u.searchParams.get('ref');body={kind:'handoff',ref:id,title:'Task '+id,body:{goal:'Task '+id},tree:[{...task(id),focus:true}],prs:[]}}
  else if(u.pathname==='/api/issues')body={issues:[]};
  else if(u.pathname==='/api/result')body={files:[]};
  else if(u.pathname==='/api/review')body={handoff:u.searchParams.get('id'),branch:null};
  else if(u.pathname==='/api/chat')body={chats:[],roles:[],gateway_ready:false};
  return {ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)}}}});
const w=dom.window,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // The Issues item page.
 w.location.hash='#issues/hof-runs';await settle();
 let sec=w.document.querySelector('#issue-detail section.checks');assert(sec,'the Issues item page has no Checks section');
 const check=box=>{
  assert(box.textContent.includes('go test ./...'),'no check command');
  const rows=[...box.querySelectorAll('.check-run')];assert.equal(rows.length,3,'want three runs');
  assert.deepEqual(rows.map(r=>r.dataset.result),['passed','failed','timed_out'],'runs not newest first');
  assert.deepEqual(rows.map(r=>r.querySelector('.check-result').textContent),['passed','failed','timeout']);
  const [p,f,t]=rows;
  for(const want of ['bob · s-bob','6 tests','7s','not evidence','Revert test: not evidence: the 2 tests pass'])assert(p.textContent.includes(want),'passed run lacks '+want+': '+p.textContent);
  assert.equal(p.querySelector('time').getAttribute('datetime'),'2026-11-12T10:30:00Z');
  for(const want of ['alice · s-alice','5s','tests not counted','Failing: TestBeta','--- FAIL: TestBeta '+evil])assert(f.textContent.includes(want),'failed run lacks '+want+': '+f.textContent);
  assert(!f.textContent.includes('not evidence'),'not evidence on a run the revert test did not mark');
  assert(!box.querySelector('img'),'output tail became markup');
  assert(f.querySelector('pre.check-tail').textContent.endsWith(evil),'tail not shown as text');
  for(const want of ['s-alice','4 tests','10 min'])assert(t.textContent.includes(want),'timed out run lacks '+want+': '+t.textContent);
  assert(!t.querySelector('.check-noev')&&!t.querySelector('pre'),'timed out run has extras');};
 check(sec);
 // A redraw keeps the loaded rows without a flash of Loading.
 w.eval('drawDetail()');sec=w.document.querySelector('#issue-detail section.checks');assert.equal(sec.querySelectorAll('.check-run').length,3,'redraw lost the runs');
 // A task with no check: one line.
 w.location.hash='#issues/hof-none';await settle();
 sec=w.document.querySelector('#issue-detail section.checks');assert(sec,'no Checks section on a task without a check');
 assert.equal(sec.querySelector('.checks-none').textContent,'This task has no check.');assert.equal(sec.querySelectorAll('.check-run').length,0);
 // The work item drawer, which the Chat side panel draws with too.
 w.location.hash='#issues';await settle();
 w.eval("showWorkItem('hof-runs')");await settle();
 sec=w.document.querySelector('#hist section.checks');assert(sec,'the work item has no Checks section');check(sec);
 w.eval('closeHistory()');
 const panel=w.eval("chatWorkBody({handoff:'hof-runs',data:{kind:'handoff',ref:'hof-runs',tree:[{id:'hof-runs',focus:true}],prs:[]}})");w.document.body.append(panel);await settle();
 sec=panel.querySelector('section.checks');assert(sec,'the Chat side panel has no Checks section');check(sec);
 // Refused by the API: says so, shows no rows.
 const refused=w.eval("checksPanel('hof-other')");w.document.body.append(refused);await settle();
 assert(refused.textContent.includes('could not be read: unknown handoff hof-other'),refused.textContent);assert.equal(refused.querySelectorAll('.check-run').length,0);
 // A PR item asks for no checks.
 assert(!asked.some(id=>/#/.test(id)),'checks asked for a non-task');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_checks: ok');process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
