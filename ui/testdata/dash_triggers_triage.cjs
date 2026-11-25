// libraos/core#1078 on the team page's Triggers: the issue trigger's settings (which issues, the cap per author,
// triage first, trusted labelers, the outcome labels, the comment) read in Settings now and are edited with
// Edit issue settings, the trigger_edit write, only while triggers are off; it re-sends the rest as it is,
// sends only what changed, and never sends enabled. Latest runs names each Kind (New issue, Labelled issue,
// PR went red) and an issue run's triage: the verdict (a duplicate links the issue it repeats), confidence,
// the label, the fix task as a link, or that a low-confidence fix waits for a person's label. Held back lists
// the issues over a cap with the reason. A server from before any of this shows none of it, and never
// "undefined". Fixture names are neutral. Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_triggers_triage.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const labels={fix:'agentd:fixing',wontfix:'agentd:wontfix',needs_info:'agentd:needs-info',duplicate:'agentd:duplicate',fix_proposed:'agentd:fix-proposed'};
const run=(n,o)=>({key:'issue:acme/app#'+n,kind:'issue',repo:'acme/app',number:n,head_sha:null,handoff:'hof-taskpage0'+n,error:null,created:now,updated:now,mode:'new',phase:'triage',triage:null,confidence:null,dup_of:null,fix_state:null,fix_handoff:null,fix_error:null,approved_by:null,...o});
// old is a server from before #1078: no issue settings, no triage on its runs, no held list.
const old={enabled:false,problem:'',problem_when_enabled:'',repos:['acme/app'],authors:['alice'],label:'agentd:fix',budget:'30m',max_per_day:3,dirs:{},not_in_sync_repos:[],
 offers:[{key:'issue:acme/app#7',kind:'issue',repo:'acme/app',number:7,head_sha:null,handoff:'hof-taskpage07',error:null,created:now,updated:now}]};
const fresh=()=>({...old,issues:'new',max_per_author:3,triage:true,labelers:['alice','bob'],outcome_labels:{...labels},comment:false,new_since:{'acme/app':now},issue_problem:'',issue_problem_when_enabled:'',
 held:[{repo:'acme/app',number:20,held:now,reason:'max_per_author reached for carol',waits_for:'a listed labeler adding the label'},{repo:'acme/app',number:21,held:now,reason:'opened by a bot'+evil,waits_for:'a listed labeler adding the label'}],
 offers:[run(1,{triage:'fix',confidence:'high',fix_state:'offered',fix_handoff:'hof-taskpage09'}),
  run(2,{triage:'duplicate',dup_of:'acme/app#3'}),
  run(4,{triage:'fix',confidence:'low',fix_state:'proposed'}),
  run(5,{mode:'label',triage:'wontfix'}),
  run(6,{triage:'needs_info',error:'gh failed'+evil}),
  run(8,{}),
  {key:'pr:acme/app#12:x',kind:'pr',repo:'acme/app',number:12,head_sha:'0123456789abcdef0123',handoff:'hof-taskpage12',error:null,created:now,updated:now,mode:null,phase:null,triage:null,confidence:null,dup_of:null,fix_state:null,fix_handoff:null,fix_error:null,approved_by:null}]});
let status=old,posts=[],postFail='';
const dash={user:'alice',role:'owner',now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{}};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21621/#inbox',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);let body={},status_=200;
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/issues')body={issues:[]};
  else if(u.pathname==='/api/triggers')body={status,templates:[],repo:'acme/app',author:'alice',enable:'libraos-engine config set triggers.enabled true'};
  else if(u.pathname==='/api/settings'&&opts.method==='POST'){posts.push(JSON.parse(opts.body));if(postFail){status_=400;body={error:postFail}}else body={changed:true,enabled:false}}
  return {ok:status_<400,status:status_,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const body=()=>doc.getElementById('trig-body'),pairs=()=>{const out={};for(const dt of body().querySelectorAll('[data-trig=settings] dl dt'))out[dt.textContent]=dt.nextElementSibling;return out};
const open=async()=>{w.location.hash='#inbox';await settle();w.location.hash='#triggers';await settle()};
const rows=()=>[...body().querySelectorAll('[data-trig=offers] tbody tr')],cells=r=>Object.fromEntries([...r.querySelectorAll('td')].map(td=>[td.dataset.label,td]));
const editBtn=()=>body().querySelector('[data-trig-action="edit-issues"]'),dialog=()=>doc.querySelector('dialog.sheet');
const field=n=>[...dialog().querySelectorAll('input,select')].find(i=>i.id.endsWith('-'+n));
const submit=async()=>{dialog().querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle()};
const noUndefined=()=>{const t=doc.getElementById('page-triggers').textContent;assert(!/undefined|NaN|\[object/.test(t),'the page shows undefined: '+t)};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // An older server: none of the new rows, no Triage column, no Held back, no Edit issue settings, nothing undefined.
 await open();
 let p=pairs();
 for(const k of ['Which issues','Most a day per author','Triage first','Trusted labelers','Outcome labels','Comment on the issue'])assert(!(k in p),'an older server shows '+k);
 assert.equal(p['Issue label'].textContent,'agentd:fix');
 assert.deepEqual([...body().querySelectorAll('[data-trig=offers] th')].map(n=>n.textContent),['When','Kind','For','Commit','Task','Error'],'an older server has a Triage column');
 assert.equal(cells(rows()[0]).Kind.textContent,'Labelled issue');
 assert(!body().querySelector('[data-trig=held]'),'Held back with no held list');assert(!editBtn(),'Edit issue settings on a server that reports no issue settings');
 noUndefined();
 // (1) Settings now: each new setting, read from status.
 status=fresh();await open();p=pairs();
 assert.equal(p['Which issues'].textContent,'Every new issue, by anyone');assert.equal(p['Most a day per author'].textContent,'3');
 assert(/^On/.test(p['Triage first'].textContent),'triage: '+p['Triage first'].textContent);assert.equal(p['Trusted labelers'].textContent,'alice, bob');
 assert.deepEqual([...p['Outcome labels'].querySelectorAll('code')].map(n=>n.textContent),Object.values(labels));assert(/^Fix: agentd:fixing/.test(p['Outcome labels'].textContent));
 assert.equal(p['Comment on the issue'].textContent,'Off');
 // Labelled mode hides the per-author cap (it caps new issues only); no labelers reads what counts instead.
 status={...fresh(),issues:'label',labelers:[]};await open();p=pairs();
 assert.equal(p['Which issues'].textContent,'Labelled by a listed person');assert(!('Most a day per author' in p),'the per-author cap shows in label mode');assert(/None set/.test(p['Trusted labelers'].textContent));
 // (2) Latest runs: the Kind, and each issue run's triage.
 status=fresh();await open();
 assert.deepEqual([...body().querySelectorAll('[data-trig=offers] th')].map(n=>n.textContent),['When','Kind','For','Commit','Task','Triage','Error']);
 const r=Object.fromEntries(rows().map(x=>[cells(x).For.textContent,cells(x)]));
 assert.equal(r['acme/app#1'].Kind.textContent,'New issue');assert.equal(r['acme/app#5'].Kind.textContent,'Labelled issue');assert.equal(r['acme/app#12'].Kind.textContent,'PR went red');
 const tri=n=>r['acme/app#'+n].Triage,part=(n,k)=>tri(n).querySelector('[data-triage="'+k+'"]');
 assert.equal(part(1,'verdict').textContent,'Fix');assert.equal(part(1,'confidence').textContent,'High confidence');assert.equal(part(1,'label').textContent,'Label agentd:fixing');
 assert.equal(part(1,'fix').querySelector('a').getAttribute('href'),'#issues/hof-taskpage09','the fix task is not a link to it');assert(!part(1,'waiting'));
 assert.equal(part(2,'verdict').textContent,'Duplicate of acme/app#3');const dup=part(2,'verdict').querySelector('a');
 assert.equal(dup.getAttribute('href'),'https://github.com/acme/app/issues/3');assert.equal(dup.getAttribute('rel'),'noopener');assert.equal(part(2,'label').textContent,'Label agentd:duplicate');
 assert.equal(part(4,'confidence').textContent,'Low confidence');assert.equal(part(4,'label').textContent,'Label agentd:fix-proposed','a proposed fix shows the fixing label');
 assert.equal(part(4,'waiting').textContent,'Waiting for a person’s label');assert(!part(4,'fix'),'a proposed fix links a task');
 assert.equal(part(5,'verdict').textContent,'Won’t fix');assert.equal(part(5,'label').textContent,'Label agentd:wontfix');assert(!part(5,'confidence'),'a won\'t fix shows a confidence');
 assert.equal(part(6,'verdict').textContent,'Needs info');assert.equal(r['acme/app#6'].Error.textContent,'gh failed'+evil);
 assert.equal(part(8,'verdict').textContent,'No verdict yet');assert(!part(8,'label'),'a run with no verdict shows a label');
 assert.equal(tri(12).textContent,'—','a PR run shows a triage');
 assert(!doc.querySelector('#page-triggers img'),'server text became markup');noUndefined();
 // (3) Held back: its own section with one head, each issue linked with its reason and time.
 const held=body().querySelector('[data-trig=held]');assert(held,'no Held back');assert.equal(held.querySelectorAll('h3').length,1);assert.equal(held.querySelector('h3').textContent,'Held back');
 assert.deepEqual([...body().querySelector('.trig-cols').children[1].children].map(n=>n.dataset.trig),['settings','held'],'Held back is not under Settings now');
 const items=[...held.querySelectorAll('li')];assert.equal(items.length,2);
 assert.equal(items[0].querySelector('a').getAttribute('href'),'https://github.com/acme/app/issues/20');assert(/^acme\/app#20: max per author reached for carol · /.test(items[0].textContent),'held: '+items[0].textContent);
 assert(items[0].querySelector('time[title]'),'a held issue has no time');assert(items[1].textContent.includes('opened by a bot'+evil));
 assert(/Each waits for a listed labeler adding the label/.test(held.textContent));
 // A long held list is short: five and how many more.
 status={...fresh(),held:Array.from({length:8},(_,i)=>({repo:'acme/app',number:30+i,held:now,reason:'max_per_day reached'}))};await open();
 assert.equal(body().querySelectorAll('[data-trig=held] li').length,5);assert(/And 3 more/.test(body().querySelector('[data-trig=held]').textContent));
 // Edit issue settings: live while off; an unchanged save sends only what trigger_edit always took.
 status=fresh();await open();
 assert(editBtn(),'no Edit issue settings');assert.equal(editBtn().getAttribute('aria-disabled'),'false');assert(!body().querySelector('[data-edit-why]'));
 editBtn().click();await settle();assert(dialog()&&dialog().open,'no form');assert(/nothing fires until/i.test(dialog().textContent));
 assert.equal(field('issues').value,'new');assert.equal(field('max_per_author').value,'3');assert.equal(field('triage').value,'on');assert.equal(field('labelers').value,'alice, bob');
 assert.equal(field('outcome_fix').value,'agentd:fixing');assert.equal(field('comment').value,'off');
 for(const n of ['issues','triage','comment'])assert(field(n).closest('.sheet-field').querySelector('.views button'),n+' is not a choice of buttons');
 await submit();assert.deepEqual(posts.pop(),{action:'trigger_edit',repos:['acme/app'],authors:['alice'],label:'agentd:fix',budget:'30m',max_per_day:3});
 // A change sends just that, with the rest as it was.
 editBtn().click();await settle();
 field('max_per_author').value='5';field('labelers').value='alice dave';field('outcome_fix').value='bot:fixing';
 [...field('triage').closest('.sheet-field').querySelectorAll('.views button')].find(b=>b.textContent==='Off').click();
 [...field('comment').closest('.sheet-field').querySelectorAll('.views button')].find(b=>b.textContent==='On').click();
 await submit();
 assert.deepEqual(posts.pop(),{action:'trigger_edit',repos:['acme/app'],authors:['alice'],label:'agentd:fix',budget:'30m',max_per_day:3,
  max_per_author:5,triage:false,labelers:['alice','dave'],outcome_labels:{...labels,fix:'bot:fixing'},comment:true});
 assert(!dialog(),'the form stays open after a save');
 // Checked before it is sent: new issues need a label, a cap of 1 to 50, logins, an outcome label that is not the trigger's.
 editBtn().click();await settle();
 field('label').value='';await submit();assert.equal(posts.length,0,'sent new issues with no label');assert(/needs an issue label/.test(dialog().textContent));
 field('label').value='agentd:fix';field('max_per_author').value='0';await submit();assert.equal(posts.length,0,'sent a cap of 0');
 field('max_per_author').value='3';field('labelers').value='not a/login';await submit();assert.equal(posts.length,0,'sent a bad login');
 field('labelers').value='alice';field('outcome_wontfix').value='agentd:fix';await submit();assert.equal(posts.length,0,'sent the trigger label as an outcome label');assert(/start the trigger again/.test(dialog().textContent));
 // A server that cannot take a changed field says which, in the form, which stays.
 field('outcome_wontfix').value='agentd:wontfix';postFail='Invalid Settings request';await submit();
 assert(dialog()&&/This server cannot save Trusted labelers from the page yet/.test(dialog().textContent),'refusal: '+(dialog()&&dialog().textContent));postFail='';
 dialog().querySelector('.sheet-foot button').click();await settle();posts=[];
 // On: Edit issue settings says why it is off, and opens nothing.
 status={...fresh(),enabled:true};await open();
 assert.equal(editBtn().getAttribute('aria-disabled'),'true','Edit issue settings is live while triggers are on');
 assert(/Turn them off from a terminal before editing/.test(body().querySelector('[data-edit-why]').textContent));
 editBtn().click();await settle();assert(!dialog(),'Edit opened a form while triggers are on');assert.equal(posts.length,0);
 assert(/a new issue starts a worker/.test(body().querySelector('[data-trig=state] strong').textContent),'the state does not say new issues fire');
 // Nothing sent enabled.
 assert(!JSON.stringify(posts).includes('enabled'));
 assert(!errors.length,errors.join('\n'));
 console.log('dash_triggers_triage: ok',process.env.DASH_UI_PHONE==='1'?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
