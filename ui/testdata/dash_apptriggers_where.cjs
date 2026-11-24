// Where triggers run, on the app's Triggers page: with a team server's where and nodes, the header chip and a
// Where triggers run card lead with where they run (not this server's own Off) and list each joined host with
// its state as a word and a mark: on, cannot fire with the problem, off, stale with when it last reported and
// what it said, not reported. A stale or unreported host never reads as on. The server's own card stays,
// titled as this server's, and the page says a host's triggers are changed on that host. Each issue run's
// outcome_state shows its label as on GitHub, pending or failed with the reason. A server that sends none of
// this renders as before. Fixture names are neutral. Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_apptriggers_where.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),ago=m=>new Date(Date.now()-m*60000).toISOString(),evil='<img src=x onerror=alert(1)>';
const base={user:'alice',role:'owner',now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:[],dispatch:true,
 mode:'app',watchdog:{running:true},spend_today:{usd:0,workers:0,unpriced:0,pending:0,user:'alice'}};
const run=(n,o)=>({key:'issue:acme/app#'+n,kind:'issue',repo:'acme/app',number:n,head_sha:null,handoff:'hof-where0'+n,error:null,created:now,updated:now,mode:'new',phase:'triage',triage:'needs_info',confidence:null,dup_of:null,fix_state:null,fix_handoff:null,fix_error:null,approved_by:null,...o});
const own={enabled:false,problem:'',problem_when_enabled:'',repos:['acme/app'],authors:['alice'],label:'agentd:fix',budget:'30m',max_per_day:3,dirs:{},not_in_sync_repos:[],issues:'new',triage:true,
 outcome_labels:{fix:'agentd:fixing',wontfix:'agentd:wontfix',needs_info:'agentd:needs-info',duplicate:'agentd:duplicate',fix_proposed:'agentd:fix-proposed'},
 offers:[run(1,{outcome_state:{outcome:'needs_info',label:'agentd:needs-info',state:'applied'}}),run(2,{outcome_state:{outcome:'needs_info',label:'agentd:needs-info',state:'pending'}}),
  run(3,{outcome_state:{outcome:'needs_info',label:'agentd:needs-info',state:'failed',reason:'gh_missing',failures:4}}),run(4,{})]};
const old={...own,offers:own.offers.map(({outcome_state,...o})=>o)};
const nodes=[{node:'alice-desk',person:'alice',kind:'cli',device:'dev-a1',last_seen:ago(1),reported_at:ago(1),state:'on',
  triggers:{enabled:true,issues:'label',triage:false,repos:['acme/app','acme/web'],max_per_day:4,offers_today:1,problem:'',issue_problem:'',last_issue_sync:ago(2),last_pr_sync:null}},
 {node:'bob-laptop',person:'bob',kind:'cli',device:'dev-b1',last_seen:ago(1),reported_at:ago(1),state:'cannot_fire',triggers:{enabled:true,issues:'new',triage:true,repos:['acme/app'],max_per_day:5,offers_today:0,problem:'gh is not signed in'+evil,issue_problem:'',last_issue_sync:null,last_pr_sync:null}},
 {node:'carol-box',person:'carol',kind:'cli',device:'dev-c1',last_seen:ago(90),reported_at:ago(95),state:'stale',triggers:null,last_reported_enabled:false},
 {node:'dave-mac',person:'dave',kind:'cli',device:'dev-d1',last_seen:ago(5),reported_at:null,state:'not_reported',triggers:null}];
const where={kind:'hosts',text:'on 1 joined host',server:false,server_cannot_fire:false,hosts:1,hosts_cannot_fire:1,hosts_off:0,hosts_stale:1,hosts_not_reported:1};
let answer={status:old};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21472/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async(url)=>{const u=new URL(url,w.location.href);let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=base;
  if(u.pathname==='/api/triggers')body={templates:[],repo:'acme/app',author:'alice',enable:'libraos-core config set triggers.enabled true',schedules:{schedules:[]},...answer};
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const $=id=>doc.getElementById(id),body=doc.body,page=()=>$('app-page'),q=s=>page().querySelector(s);
const openLeft=async()=>{if(phone&&!body.classList.contains('app-left-open')){doc.querySelector('#app-shell [data-app-action="toggle-left"]').click();await tick()}};
const openTriggers=async()=>{await openLeft();const nav=doc.querySelector('#app-shell [data-app-nav="triggers"]');if(nav.getAttribute('aria-current')==='page'){nav.click();await tick()}nav.click();await settle()};
const host=n=>q('[data-host="'+n+'"]'),word=n=>host(n).querySelector('[data-host-state]').lastChild.textContent;
const label=n=>[...page().querySelectorAll('[data-appt="trigger"] [data-contextual-tour-target="triggers-runs"] tbody tr')].find(r=>r.dataset.taskId==='hof-where0'+n).querySelector('[data-triage=label]');
const noJunk=()=>{const t=page().textContent;assert(!/undefined|NaN|null|\[object/.test(t),'the page shows junk: '+t);assert(!page().querySelector('img'),'server text became markup')};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // An older server: Off in the chip, the card as before, no Where card, labels implied by the verdict.
 await openTriggers();
 assert.equal(q('.app-navnote').textContent,'Off');assert(!q('[data-appt="where"]'),'an older server has a Where card');
 assert.equal(q('[data-appt="trigger"] .appt-title b').textContent,'Red CI and labelled issues');
 assert.equal(q('[data-appt="state"]').textContent,'Off. Nothing starts a worker on its own.');
 assert.equal(label(1).textContent,'Label agentd:needs-info');assert(!q('[data-outcome]'));
 noJunk();
 // where kind hosts: the chip and the first card lead with the host; this server's card is titled as its own.
 answer={status:own,where,nodes};await openTriggers();
 assert.equal(q('.app-navnote').textContent,'On · 1 host');
 const cards=[...page().querySelectorAll('[data-appt="where"],[data-appt="trigger"]')].map(n=>n.dataset.appt);assert.deepEqual(cards,['where','trigger'],'Where does not lead');
 assert.equal(q('[data-appt="where-head"]').textContent,'Triggers run on 1 joined host.');
 assert.equal(q('[data-appt="where-rest"]').textContent,'Other joined hosts: 1 cannot fire, 1 stale, 1 not reported.');
 assert.equal(q('[data-appt="trigger"] .appt-title b').textContent,'This server’s triggers');assert(/^Off on this server/.test(q('[data-appt="state"]').textContent),'own: '+q('[data-appt="state"]').textContent);
 assert(/changed on that host/.test(q('[data-trig="hosts-note"]').textContent));
 assert.deepEqual([...page().querySelectorAll('[data-host]')].map(n=>[n.dataset.host,word(n.dataset.host)]),[['alice-desk','On'],['bob-laptop','Cannot fire'],['carol-box','Stale'],['dave-mac','Not reported']]);
 {const dl={};for(const dt of host('alice-desk').querySelectorAll('dt'))dl[dt.textContent]=dt.nextElementSibling.textContent;
  assert.deepEqual(Object.keys(dl),['Issues','Triage first','Repositories','Offers today','Last sync']);assert.equal(dl.Repositories,'acme/app, acme/web');assert.equal(dl['Offers today'],'1 of 4 a day');assert(/^issues 2 min ago, PRs never$/.test(dl['Last sync']),dl['Last sync'])}
 assert(host('bob-laptop').querySelector('.appt-problem').textContent.includes('Cannot fire: gh is not signed in'+evil));
 assert(!host('carol-box').querySelector('dl')&&/when it said its triggers were off/.test(host('carol-box').textContent),'stale: '+host('carol-box').textContent);
 assert(!host('dave-mac').querySelector('dl')&&/older release, or no pass yet/.test(host('dave-mac').textContent));
 // The run's label: on GitHub, pending, failed with the reason; absent as before.
 assert.equal(label(1).textContent,'Label agentd:needs-info on GitHub');assert.equal(label(2).textContent,'Label agentd:needs-info pending: set at the next sync');
 assert.equal(label(3).textContent,'Label agentd:needs-info failed: gh is not installed, 4 tries; each sync tries again');assert.equal(label(4).textContent,'Label agentd:needs-info');
 // Every control is still a button, reachable by keyboard; the host rows add none that a mouse alone reaches.
 assert(!page().querySelector('[data-appt="where"] [onclick],[data-appt="where"] [tabindex="-1"]'));
 noJunk();
 // nowhere: Off leads the chip again; the Where card says so.
 answer={status:own,where:{...where,kind:'nowhere',text:'nowhere: nothing starts a worker on its own',hosts:0},nodes:[nodes[2]]};await openTriggers();
 assert.equal(q('.app-navnote').textContent,'Off');assert(/^Off\. Nothing starts a worker on its own/.test(q('[data-appt="where-head"]').textContent));assert.equal(word('carol-box'),'Stale');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_apptriggers_where: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
