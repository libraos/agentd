// What each joined host's triggers processed, on the team server's Triggers page. Each joined host is a section
// titled with its name, its person and its last contact, under it its settings and a table of its newest trigger
// events: when, the issue or PR linked to GitHub, its kind, what happened (offered as a task linked to its
// mirrored task page, held back with the reason, an error) and its triage. A host on an older release that sends
// no activity says so. A host's section has no control: edit and pause stay for this server's own [triggers].
// An owner sees every host; a person who is not an owner, on a team server (host_triggers), opens Triggers and
// sees only their own person's hosts (scope own), with nothing of the server's own settings and no control. Host
// text is shown as text, never markup. Fixture names are neutral. Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_triggers_hosts.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),ago=m=>new Date(Date.now()-m*60000).toISOString(),evil='<img src=x onerror=alert(1)>';
const own={enabled:false,problem:'',problem_when_enabled:'',repos:['acme/app'],authors:['alice'],label:'agentd:fix',budget:'30m',max_per_day:3,dirs:{},not_in_sync_repos:[],issues:'label',triage:true,offers:[]};
const summary=o=>({enabled:true,issues:'new',triage:true,repos:['acme/app'],max_per_day:5,offers_today:2,problem:'',issue_problem:'',last_issue_sync:ago(3),last_pr_sync:ago(4),...o});
const events=[
 {key:'held:acme/app#9',kind:'issue',repo:'acme/app',number:9,result:'held',reason:'opened by a bot',created:ago(2),updated:ago(2)},
 {key:'pr:acme/app#7:abc',kind:'pr',repo:'acme/app',number:7,result:'offered',handoff:'hof-host07',created:ago(10),updated:ago(3)},
 {key:'issue:acme/app#2',kind:'issue',repo:'acme/app',number:2,result:'error',error:'git fetch failed [redacted] '+evil,created:ago(20),updated:ago(4)},
 {key:'issue:acme/app#1',kind:'issue',repo:'acme/app',number:1,result:'offered',handoff:'hof-host01',phase:'triage',triage:'fix',confidence:'high',fix_handoff:'hof-host02',outcome_state:{outcome:'fix',label:'agentd:fixing',state:'applied'},created:ago(30),updated:ago(5)}];
const nodes=[{node:'alice-desk',person:'alice',kind:'cli',device:'dev-a1',last_seen:ago(1),reported_at:ago(1),state:'on',triggers:summary(),activity:{last_pass:ago(1),events}},
 {node:'bob-laptop',person:'bob',kind:'cli',device:'dev-b1',last_seen:ago(2),reported_at:ago(2),state:'on',triggers:summary(),activity:null},
 {node:'carol-box',person:'carol',kind:'cli',device:'dev-c1',last_seen:ago(2),reported_at:ago(2),state:'off',triggers:{enabled:false},activity:{last_pass:null,events:[]}}];
const where={kind:'hosts',text:'on 2 joined hosts',server:false,server_cannot_fire:false,hosts:2,hosts_cannot_fire:0,hosts_off:1,hosts_stale:0,hosts_not_reported:0};
let answer={scope:'all',status:own,where,nodes},dash={user:'alice',role:'owner',team:true,host_triggers:true,now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{}};
const gets=[],errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21623/#inbox',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/issues')body={issues:[]};
  else if(u.pathname==='/api/triggers'){gets.push(dash.user);body=answer.scope==='own'?answer:{templates:[],repo:'acme/app',author:'alice',enable:'libraos-engine config set triggers.enabled true',...answer}}
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const $=id=>doc.getElementById(id),body=()=>$('trig-body'),q=s=>body().querySelector(s);
const open=async()=>{w.location.hash='#inbox';await settle();w.location.hash='#triggers';await settle()};
const host=n=>q('[data-host="'+n+'"]');
const evRows=n=>Object.fromEntries([...host(n).querySelectorAll('[data-host-activity=events] tbody tr')].map(r=>{const c=Object.fromEntries([...r.querySelectorAll('td')].map(td=>[td.dataset.label,td]));return [c.For.textContent,c]}));
const noControl=n=>{const s=host(n);assert(!s.querySelector('button,input,select,textarea,form,[data-write],[data-trig-action],[data-disabled-reason]'),n+' has a control: '+s.innerHTML.slice(0,300))};
const noJunk=()=>{const t=$('page-triggers').textContent;assert(!/undefined|NaN|null|\[object/.test(t),'the page shows junk: '+t);assert(!doc.querySelector('#page-triggers img'),'host text became markup')};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // An owner: a section per host, titled with its name, person and last contact.
 await open();
 const secs=[...body().querySelectorAll('[data-trig=hosts] section.trig-host')];
 assert.deepEqual(secs.map(s=>s.dataset.host),['alice-desk','bob-laptop','carol-box']);
 for(const s of secs){const h=s.querySelector('h4.trig-host-head');assert(h,'a host section has no title');assert.equal(s.getAttribute('aria-label'),'Host '+s.dataset.host)}
 {const h=host('alice-desk').querySelector('h4');assert.equal(h.querySelector('b').textContent,'alice-desk');assert(/alice/.test(h.textContent));assert(/Last contact 1 min ago/.test(h.querySelector('[data-host-seen]').textContent),'title: '+h.textContent)}
 // Its settings line stays, then what it processed, newest first.
 assert(host('alice-desk').querySelector('dl'),'the settings went');
 assert(/^Last trigger pass: 1 min ago\.$/.test(host('alice-desk').querySelector('[data-host-activity=last-pass]').textContent));
 {const r=evRows('alice-desk');assert.deepEqual(Object.keys(r),['acme/app#9','acme/app#7','acme/app#2','acme/app#1']);
  assert.deepEqual([...host('alice-desk').querySelectorAll('[data-host-activity=events] th')].map(t=>t.textContent),['When','For','Kind','What happened','Triage']);
  const link=c=>c.For.querySelector('a');
  assert.equal(link(r['acme/app#9']).getAttribute('href'),'https://github.com/acme/app/issues/9');assert.equal(link(r['acme/app#7']).getAttribute('href'),'https://github.com/acme/app/pull/7');assert.equal(link(r['acme/app#7']).getAttribute('target'),'_blank');
  assert.equal(r['acme/app#9'].Kind.textContent,'Issue');assert.equal(r['acme/app#7'].Kind.textContent,'PR');
  assert.equal(r['acme/app#9']['What happened'].textContent,'Held back: opened by a bot');
  assert.equal(r['acme/app#7']['What happened'].textContent,'Offered as task hof-host07');assert.equal(r['acme/app#7']['What happened'].querySelector('a').getAttribute('href'),'#issues/hof-host07');
  assert.equal(r['acme/app#2']['What happened'].textContent,'Error: git fetch failed [redacted] '+evil);assert(r['acme/app#2']['What happened'].querySelector('.trig-problem'));
  const tri=r['acme/app#1'].Triage;assert.equal(tri.querySelector('[data-triage=verdict]').textContent,'Fix');assert.equal(tri.querySelector('[data-triage=confidence]').textContent,'High confidence');
  assert.equal(tri.querySelector('[data-triage=label]').textContent,'Label agentd:fixing on GitHub');assert.equal(tri.querySelector('[data-triage=fix] a').getAttribute('href'),'#issues/hof-host02');
  assert(r['acme/app#1'].When.querySelector('time[title]'),'no exact time')}
 // An older host says it sends no activity; a host that processed nothing says that.
 assert.equal(host('bob-laptop').querySelector('[data-host-activity=none]').textContent,'Sends no trigger activity (older release).');
 assert(!host('bob-laptop').querySelector('table'));
 assert.equal(host('carol-box').querySelector('[data-host-activity=empty]').textContent,'Nothing processed yet.');assert(/Last trigger pass: none yet/.test(host('carol-box').textContent));
 // No control on any host's section; the server's own Edit stays outside them.
 for(const n of ['alice-desk','bob-laptop','carol-box'])noControl(n);
 assert(q('[data-trig-action=edit-issues]'),'the server lost its own Edit');assert(!q('[data-trig=hosts] [data-trig-action]'));
 noJunk();
 // A person who is not an owner on a team server: Triggers is in the rail and lists only their own hosts.
 dash={...dash,user:'bob',role:'dev'};answer={scope:'own',nodes:[nodes[1]]};w.eval('refresh()');await settle();
 const rail=doc.querySelector('#rail [data-rail="triggers"]');assert(!rail.hidden,'no Triggers in the rail for a person with hosts on a team server');
 assert(!doc.querySelector('#account .acct-links a[href="#triggers"]').hidden,'no Triggers in the account menu');
 await open();assert.equal(gets.at(-1),'bob','the page did not read /api/triggers');
 assert.equal($('trig-meta').textContent,'Your hosts');assert($('trig-intro').hidden,'the owner intro shows');
 assert.deepEqual([...body().querySelectorAll('[data-host]')].map(n=>n.dataset.host),['bob-laptop']);
 assert(/An owner sees every host/.test(q('[data-trig=own-scope]').textContent));
 for(const sel of ['[data-trig=state]','[data-trig=settings]','[data-trig=templates]','[data-trig=offers]','[data-trig=improve]','[data-trig=signals]','[data-trig=owner-only]'])assert(!q(sel),'a non-owner sees '+sel);
 assert(!body().querySelector('button,input,select,textarea,form,[data-write]'),'a non-owner has a control');noControl('bob-laptop');
 // With none of their own: a line, not an owner-only refusal.
 answer={scope:'own',nodes:[]};await open();assert.equal(q('[data-trig=no-hosts]').textContent,'None of your hosts has reported to this server.');
 noJunk();
 // Not on a team server (no host_triggers): the page stays an owner's, as before.
 dash={...dash,host_triggers:false};w.eval('refresh()');await settle();assert(rail.hidden,'Triggers in the rail away from a team server');
 const n=gets.length;await open();assert.equal(gets.length,n,'read /api/triggers without access');assert(q('[data-trig=owner-only]'),'no owner-only card');
 // Back to an owner: the full page again.
 dash={...dash,user:'alice',role:'owner',host_triggers:true};answer={scope:'all',status:own,where,nodes};w.eval('refresh()');await settle();await open();
 assert(q('[data-trig=settings]')&&host('alice-desk'),'an owner does not see the full page again');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_triggers_hosts: ok',process.env.DASH_UI_PHONE==='1'?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
