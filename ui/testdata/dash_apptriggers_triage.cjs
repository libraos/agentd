// libraos/core#1078 on the app's Triggers page: the issue trigger's settings (which issues, the cap per author,
// triage first, trusted labelers, the outcome labels, the comment) read on the trigger's card and are edited in
// Edit trigger, the trigger_edit write, only while triggers are off; only what changed is sent, and never
// enabled. Runs names each Kind and an issue run's triage: the verdict (a duplicate links the issue it
// repeats), confidence, the label, the fix task (which opens it), or that a low-confidence fix waits for a
// person's label. Held back lists the issues over a cap with the reason. A server from before any of this
// shows none of it, and never "undefined". Fixture names are neutral. Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_apptriggers_triage.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const task=(id,o)=>({id,title:'Task '+id,goal:'Task '+id,state:'claimed',claimer:'w-'+id,from:'s-alice',from_user:'alice',worker:'claude',to:'any',project:'acme/app',stage:'implement',source:'trigger',updated_ago:'1m',dispatched:true,mine:true,mark:'working',attempts:[],...o});
const base={user:'alice',role:'owner',now,handoff_list:[task('hof-taskpage01',{stage:'triage'}),task('hof-taskpage09')],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:[],dispatch:true,
 mode:'app',watchdog:{running:true},spend_today:{usd:0,workers:0,unpriced:0,pending:0,user:'alice'}};
const labels={fix:'agentd:fixing',wontfix:'agentd:wontfix',needs_info:'agentd:needs-info',duplicate:'agentd:duplicate',fix_proposed:'agentd:fix-proposed'};
const run=(n,o)=>({key:'issue:acme/app#'+n,kind:'issue',repo:'acme/app',number:n,head_sha:null,handoff:'hof-taskpage0'+n,error:null,created:now,updated:now,mode:'new',phase:'triage',triage:null,confidence:null,dup_of:null,fix_state:null,fix_handoff:null,fix_error:null,approved_by:null,...o});
const old={enabled:false,problem:'',problem_when_enabled:'',repos:['acme/app'],authors:['alice'],label:'agentd:fix',budget:'30m',max_per_day:3,dirs:{},not_in_sync_repos:[],
 offers:[{key:'issue:acme/app#7',kind:'issue',repo:'acme/app',number:7,head_sha:null,handoff:'hof-taskpage07',error:null,created:now,updated:now}]};
const fresh=()=>({...old,issues:'new',max_per_author:3,triage:true,labelers:['alice','bob'],outcome_labels:{...labels},comment:false,
 held:[{repo:'acme/app',number:20,held:now,reason:'max_per_author reached for carol',waits_for:'a listed labeler adding the label'}],
 offers:[run(1,{triage:'fix',confidence:'high',fix_state:'offered',fix_handoff:'hof-taskpage09'}),run(2,{triage:'duplicate',dup_of:'acme/app#3'}),run(4,{triage:'fix',confidence:'low',fix_state:'proposed'}),
  run(5,{mode:'label',triage:'wontfix'}),{key:'pr:acme/app#12:x',kind:'pr',repo:'acme/app',number:12,head_sha:'a'.repeat(40),handoff:'',error:null,created:now,updated:now,mode:null,phase:null,triage:null}]});
let status=old,posts=[],postFail='';
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21471/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async(url,o={})=>{const u=new URL(url,w.location.href);let body={},code=200;
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=base;
  if(u.pathname==='/api/triggers')body={status,templates:[],repo:'acme/app',author:'alice',enable:'libraos-engine config set triggers.enabled true',schedules:{schedules:[]}};
  if(u.pathname==='/api/settings'&&o.method==='POST'){posts.push(JSON.parse(o.body));if(postFail){code=400;body={error:postFail}}else body={changed:true}}
  return {ok:code<400,status:code,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const $=id=>doc.getElementById(id),body=doc.body,page=()=>$('app-page'),card=()=>page().querySelector('[data-appt="trigger"]');
const openLeft=async()=>{if(phone&&!body.classList.contains('app-left-open')){doc.querySelector('#app-shell [data-app-action="toggle-left"]').click();await tick()}};
const openTriggers=async()=>{await openLeft();const nav=doc.querySelector('#app-shell [data-app-nav="triggers"]');if(nav.getAttribute('aria-current')==='page'){nav.click();await tick()}nav.click();await settle()};
const pairs=()=>{const out={};for(const dt of card().querySelectorAll('.appt-dl dt'))out[dt.textContent]=dt.nextElementSibling;return out};
const head=()=>[...card().querySelectorAll('[data-contextual-tour-target="triggers-runs"] th')].map(n=>n.textContent);
const rows=()=>[...card().querySelectorAll('[data-contextual-tour-target="triggers-runs"] tbody tr')],cells=r=>Object.fromEntries([...r.querySelectorAll('td')].map(td=>[td.dataset.label,td]));
const edit=()=>page().querySelector('[data-appt-action="trigger_edit"]'),dialog=()=>doc.querySelector('dialog.sheet');
const field=n=>[...dialog().querySelectorAll('input,select')].find(i=>i.id.endsWith('-'+n));
const submit=async()=>{dialog().querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle()};
const noUndefined=()=>{const t=page().textContent;assert(!/undefined|NaN|\[object/.test(t),'the page shows undefined: '+t)};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));assert(body.classList.contains('app-mode'),'app mode is not on');
 // An older server: no new rows, no Triage column, no Held back, the form as before, nothing undefined.
 await openTriggers();
 let p=pairs();for(const k of ['Which issues','Most a day per author','Triage first','Trusted labelers','Outcome labels','Comment on the issue'])assert(!(k in p),'an older server shows '+k);
 assert.deepEqual(head(),['When','Kind','For','Task','Error']);assert.equal(cells(rows()[0]).Kind.textContent,'Labelled issue');
 assert(!page().querySelector('[data-appt="held"]'),'Held back with no held list');noUndefined();
 edit().click();await settle();
 for(const n of ['issues','max_per_author','triage','labelers','outcome_fix','comment'])assert(!field(n),'an older server\'s form has '+n);
 await submit();assert.deepEqual(posts.pop(),{action:'trigger_edit',repos:['acme/app'],authors:['alice'],label:'agentd:fix',budget:'30m',max_per_day:3},'an older server is sent a field it does not know');
 // (1) The card reads each new setting.
 status=fresh();await openTriggers();p=pairs();
 assert.equal(p['Which issues'].textContent,'Every new issue, by anyone');assert.equal(p['Most a day per author'].textContent,'3');assert(/^On/.test(p['Triage first'].textContent));
 assert.equal(p['Trusted labelers'].textContent,'alice, bob');assert.deepEqual([...p['Outcome labels'].querySelectorAll('code')].map(n=>n.textContent),Object.values(labels));assert.equal(p['Comment on the issue'].textContent,'Off');
 // (2) Runs: the Kind, and each issue run's triage.
 assert.deepEqual(head(),['When','Kind','For','Task','Triage','Error']);
 const r=Object.fromEntries(rows().map(x=>[cells(x).For.textContent,cells(x)]));
 assert.equal(r['acme/app#1'].Kind.textContent,'New issue');assert.equal(r['acme/app#5'].Kind.textContent,'Labelled issue');assert.equal(r['acme/app#12'].Kind.textContent,'PR went red');
 const part=(n,k)=>r['acme/app#'+n].Triage.querySelector('[data-triage="'+k+'"]');
 assert.equal(part(1,'verdict').textContent,'Fix');assert.equal(part(1,'confidence').textContent,'High confidence');assert.equal(part(1,'label').textContent,'Label agentd:fixing');
 const fix=part(1,'fix').querySelector('[data-open-task]');assert(fix&&fix.tagName==='BUTTON'&&fix.textContent==='hof-taskpage09','the fix task is not a control that opens it');
 assert.equal(part(2,'verdict').querySelector('a').getAttribute('href'),'https://github.com/acme/app/issues/3');
 assert.equal(part(4,'waiting').textContent,'Waiting for a person’s label');assert.equal(part(4,'label').textContent,'Label agentd:fix-proposed');
 assert.equal(part(5,'verdict').textContent,'Won’t fix');assert.equal(r['acme/app#12'].Triage.textContent,'—');
 assert(!page().querySelector('img'),'server text became markup');noUndefined();
 // The fix task opens the fix task, not the row's triage task.
 const seen=[];doc.addEventListener('app-task',e=>seen.push(e.detail.id));fix.click();await tick();assert.deepEqual(seen,['hof-taskpage09'],'the fix link opened '+seen);
 // (3) Held back: one head, each issue linked with its reason.
 await openTriggers();const held=page().querySelector('[data-appt="held"]');assert(held,'no Held back');
 assert.equal(held.previousElementSibling.textContent,'Held back');const li=held.querySelector('li');
 assert.equal(li.querySelector('a').getAttribute('href'),'https://github.com/acme/app/issues/20');assert(/max per author reached for carol/.test(li.textContent));
 // Edit trigger: the new fields; an unchanged save sends only what trigger_edit always took; a change sends just that.
 edit().click();await settle();
 assert.equal(field('issues').value,'new');assert.equal(field('triage').value,'on');assert.equal(field('labelers').value,'alice, bob');assert.equal(field('outcome_needs_info').value,'agentd:needs-info');assert.equal(field('comment').value,'off');
 await submit();assert.deepEqual(posts.pop(),{action:'trigger_edit',repos:['acme/app'],authors:['alice'],label:'agentd:fix',budget:'30m',max_per_day:3});
 edit().click();await settle();
 [...field('issues').closest('.sheet-field').querySelectorAll('.views button')].find(b=>b.textContent==='Labelled by a listed person').click();
 [...field('comment').closest('.sheet-field').querySelectorAll('.views button')].find(b=>b.textContent==='On').click();
 await submit();assert.deepEqual(posts.pop(),{action:'trigger_edit',repos:['acme/app'],authors:['alice'],label:'agentd:fix',budget:'30m',max_per_day:3,issues:'label',comment:true});
 // New issues with no label are refused before sending; a server that cannot take a field says which.
 edit().click();await settle();field('label').value='';await submit();assert.equal(posts.length,0,'sent new issues with no label');
 field('label').value='agentd:fix';[...field('triage').closest('.sheet-field').querySelectorAll('.views button')].find(b=>b.textContent==='Off').click();
 postFail='Invalid Settings request';await submit();assert(dialog()&&/This server cannot save Triage first from the page yet/.test(dialog().textContent),'refusal: '+(dialog()&&dialog().textContent));postFail='';
 dialog().querySelector('.sheet-foot button').click();await settle();posts=[];
 // On: Edit trigger is disabled and says why.
 status={...fresh(),enabled:true};await openTriggers();
 assert(edit().disabled,'Edit trigger is live while triggers are on');assert(/pause them to edit/.test(page().querySelector('[data-appt="edit-why"]').textContent));
 assert(/a new issue starts a worker/.test(page().querySelector('[data-appt="state"]').textContent));
 assert(!JSON.stringify(posts).includes('enabled'));
 assert(!errors.length,errors.join('\n'));
 console.log('dash_apptriggers_triage: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
