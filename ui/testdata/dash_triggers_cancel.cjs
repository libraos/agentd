// Bulk cancel of the open tasks triggers made, on the team page's Triggers and the app's. GET /api/triggers
// carries open_tasks {count, tasks, limit, note}; under the runs a button reads "Cancel open tasks (N)" with
// that count. It opens a dialog listing each task (id, issue or PR, state, worker running Yes/No), saying a
// cancel does not queue the issue again, with a required reason and the cause picker. Confirm sends one
// trigger_cancel with each id at the version listed, and the answer's per-id result (cancelled, or refused
// with the reason) shows under the button. No open task: no button. Fixture names are neutral. Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_triggers_cancel.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const html=fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8');
const status={enabled:false,problem:'',problem_when_enabled:'',repos:['acme/app'],authors:['alice'],label:'agentd:fix',budget:'30m',max_per_day:3,dirs:{},not_in_sync_repos:[],
 offers:[{key:'issue:acme/app#7',kind:'issue',repo:'acme/app',number:7,head_sha:null,handoff:'hof-trig0007',error:null,created:now,updated:now}]};
const tasks=[{id:'hof-trig0007',version:3,state:'claimed',ref:'acme/app#7',kind:'issue',project:'acme/app',goal:'Fix issue 7',worker_running:true},
 {id:'hof-trig0008',version:1,state:'offered',ref:'acme/app#8',kind:'issue',project:'acme/app',goal:'Fix issue 8'+evil,worker_running:false},
 {id:'hof-trig0012',version:5,state:'blocked',ref:'acme/app#12',kind:'pr',project:'acme/app',goal:'Fix red CI',worker_running:false}];
const note='Cancelling does not queue the issue or PR again: the trigger has already recorded it and will not start it again by itself.';
const answer={ok:true,cancelled:2,refused:1,note,cli:"agentd trigger cancel --reason 'stale' --cause not_needed --yes",results:[
 {id:'hof-trig0007',ok:true,state:'cancelled',cli:"agentd handoff done hof-trig0007 --cancel --reason 'stale'",worker_stop:'stopped'},
 {id:'hof-trig0008',ok:false,error:'hof-trig0008 changed since it was listed (version 1, now 2): list the tasks again'+evil},
 {id:'hof-trig0012',ok:true,state:'cancelled',cli:"agentd handoff done hof-trig0012 --cancel --reason 'stale'"}]};
const task=(id,o)=>({id,title:'Task '+id,goal:'Task '+id,state:'claimed',claimer:'w-'+id,from:'s-alice',from_user:'alice',worker:'claude',to:'any',project:'acme/app',stage:'implement',source:'trigger',updated_ago:'1m',dispatched:true,mine:true,mark:'working',attempts:[],...o});
function boot(url,dash){
 const st={open:{count:3,tasks:tasks.map(t=>({...t})),limit:200,note},posts:[],fail:''};
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
 const dom=new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
  w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
  w.fetch=async(u0,opts={})=>{const u=new URL(u0,w.location.href);let body={},code=200;
   if(u.pathname==='/api/auth')return {ok:true,status:204};
   if(u.pathname==='/api/dash')body=dash;
   else if(u.pathname==='/api/issues')body={issues:[]};
   else if(u.pathname==='/api/triggers')body={scope:'all',status,templates:[],repo:'acme/app',author:'alice',enable:'agentd config set triggers.enabled true',schedules:{schedules:[]},open_tasks:st.open};
   else if(u.pathname==='/api/action'&&opts.method==='POST'){st.posts.push(JSON.parse(opts.body));if(st.fail){code=403;body={ok:false,error:st.fail}}else{body=answer;st.open={count:1,tasks:[st.open.tasks[1]],limit:200,note}}}
   return {ok:code<400,status:code,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
 return {w:dom.window,doc:dom.window.document,st,errors}}
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
// check runs the same steps on a page: root() is where the Triggers page draws.
async function check(name,b,root){
 const {w,doc,st}=b,dialog=()=>doc.querySelector('dialog.sheet');
 const btn=()=>root().querySelector('[data-trig-action="cancel-open"]');
 const field=n=>[...dialog().querySelectorAll('input,select,textarea')].find(i=>i.id.endsWith('-'+n));
 const submit=async()=>{dialog().querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle()};
 // The button, with the open count, under the runs.
 assert(btn(),name+': no Cancel open tasks button');assert.equal(btn().textContent,'Cancel open tasks (3)');
 // The dialog lists each task: id, issue or PR, state, worker running.
 btn().click();await settle();assert(dialog()&&dialog().open,name+': no dialog');
 assert.equal(dialog().querySelector('h2').textContent,'Cancel 3 open trigger tasks?');
 assert(/does not queue the issue or PR again/.test(dialog().textContent),name+': the dialog does not say a cancel does not re-queue');
 assert(/running worker is stopped and its branch kept/.test(dialog().textContent));
 const rows=[...dialog().querySelectorAll('[data-trig=cancel-list] tbody tr')].map(r=>Object.fromEntries([...r.querySelectorAll('td')].map(td=>[td.dataset.label,td.textContent])));
 assert.deepEqual(rows,[{Task:'hof-trig0007',For:'acme/app#7',State:'claimed','Worker running':'Yes'},{Task:'hof-trig0008',For:'acme/app#8',State:'offered','Worker running':'No'},{Task:'hof-trig0012',For:'acme/app#12',State:'blocked','Worker running':'No'}]);
 // A reason is required; the cause is the single cancel's picker.
 assert.equal(field('reason').getAttribute('aria-required'),'true');assert.equal(field('reason').tagName,'TEXTAREA');
 assert.deepEqual([...field('cause').options].map(o=>o.value),['','wrong_result','refused_in_error','budget','check_timeout','waiting_input','infrastructure','superseded','delivered_by_hand','not_needed','other']);
 await submit();assert.equal(st.posts.length,0,name+': sent with no reason');assert(/Reason is required/.test(dialog().textContent));
 // A refusal of the whole request stays in the dialog.
 st.fail='only an owner may cancel trigger tasks in bulk';field('reason').value='stale';field('cause').value='not_needed';await submit();
 assert.equal(st.posts.length,1);assert(dialog(),name+': the dialog closed on a refusal');assert(/only an owner/.test(dialog().textContent));
 st.fail='';st.posts.length=0;await submit();
 assert.deepEqual(st.posts,[{action:'trigger_cancel',tasks:[{id:'hof-trig0007',version:3},{id:'hof-trig0008',version:1},{id:'hof-trig0012',version:5}],reason:'stale',cause:'not_needed'}]);
 assert(!dialog(),name+': the dialog stays open after a send');
 // The per-id result, under the button that now counts what is left.
 const res=root().querySelector('[data-trig=cancel-result]');assert(res,name+': no result');assert.equal(res.getAttribute('role'),'status');
 assert(/^2 cancelled, 1 refused\./.test(res.textContent),name+': '+res.textContent);
 const items=Object.fromEntries([...res.querySelectorAll('li')].map(li=>[li.dataset.task,li]));
 assert.equal(items['hof-trig0007'].dataset.ok,'true');assert(/Cancelled$/.test(items['hof-trig0007'].textContent));
 assert.equal(items['hof-trig0008'].dataset.ok,'false');assert(items['hof-trig0008'].textContent.includes('Refused: hof-trig0008 changed since it was listed'));
 assert(res.querySelector('code.task-cli, .task-cli code'),name+': no CLI line');assert(/agentd trigger cancel --reason 'stale'/.test(res.textContent));
 assert.equal(btn().textContent,'Cancel open tasks (1)');
 assert(!doc.querySelector('img'),name+': server text became markup');
 assert(!/undefined|NaN|\[object/.test(root().textContent),name+': undefined on the page');
}
(async()=>{
 // The team page.
 const dash={user:'alice',role:'owner',now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{}};
 const team=boot('http://127.0.0.1:21621/#inbox',dash);await settle();
 team.w.location.hash='#triggers';await settle();assert(!team.errors.length,team.errors.join('\n'));
 const trigBody=()=>team.doc.getElementById('trig-body');
 assert(trigBody().querySelector('[data-trig=offers] [data-trig=cancel] [data-trig-action="cancel-open"]'),'the button is not under the runs');
 await check('team',team,trigBody);
 // No open task: no button.
 const team2=boot('http://127.0.0.1:21621/#inbox',dash);await settle();team2.st.open={count:0,tasks:[],limit:200,note};team2.w.location.hash='#triggers';await settle();
 assert(!team2.doc.getElementById('trig-body').querySelector('[data-trig-action="cancel-open"]'),'a button with nothing open');
 assert(!team.errors.length&&!team2.errors.length,team.errors.concat(team2.errors).join('\n'));
 // The app's page.
 const base={user:'alice',role:'owner',now,handoff_list:[task('hof-trig0007')],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:[],dispatch:true,
  mode:'app',watchdog:{running:true},spend_today:{usd:0,workers:0,unpriced:0,pending:0,user:'alice'}};
 const app=boot('http://127.0.0.1:21470/',base);await settle();
 assert(app.doc.body.classList.contains('app-mode'),'app mode is not on');
 if(phone&&!app.doc.body.classList.contains('app-left-open')){app.doc.querySelector('#app-shell [data-app-action="toggle-left"]').click();await tick()}
 app.doc.querySelector('#app-shell [data-app-nav="triggers"]').click();await settle();
 await check('app',app,()=>app.doc.getElementById('app-page'));
 assert(!app.errors.length,app.errors.join('\n'));
 console.log('dash_triggers_cancel: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
