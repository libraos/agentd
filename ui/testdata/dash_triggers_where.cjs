// Where triggers run, on the team page's Triggers: [triggers] fire on the host whose config turns them on,
// often a joined machine. A team server's GET /api/triggers may add where (kind server|hosts|
// server_and_hosts|nowhere, with counts) and nodes (each joined host's state and the summary it reported).
// With where the chip, the rail badge and the state card lead with it instead of this server's own Off; a
// Hosts section lists each host with its state as a word and a mark (never colour alone): on, cannot fire
// with the problem, off, stale with when it last reported and what it said, not reported. A stale or
// unreported host never reads as on. The server's own settings stay, titled as this server's, and the page
// says a host's triggers are changed on that host. Each issue run's outcome_state shows its label as on
// GitHub, pending or failed with the reason. A server that sends none of this renders as before. Fixture
// names are neutral. Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_triggers_where.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),ago=m=>new Date(Date.now()-m*60000).toISOString(),evil='<img src=x onerror=alert(1)>';
const run=(n,o)=>({key:'issue:acme/app#'+n,kind:'issue',repo:'acme/app',number:n,head_sha:null,handoff:'hof-where0'+n,error:null,created:now,updated:now,mode:'new',phase:'triage',triage:'wontfix',confidence:null,dup_of:null,fix_state:null,fix_handoff:null,fix_error:null,approved_by:null,...o});
const own={enabled:false,problem:'',problem_when_enabled:'',repos:['acme/app'],authors:['alice'],label:'agentd:fix',budget:'30m',max_per_day:3,dirs:{},not_in_sync_repos:[],issues:'new',triage:true,
 outcome_labels:{fix:'agentd:fixing',wontfix:'agentd:wontfix',needs_info:'agentd:needs-info',duplicate:'agentd:duplicate',fix_proposed:'agentd:fix-proposed'},
 offers:[run(1,{outcome_state:{outcome:'wontfix',label:'agentd:wontfix',state:'applied'}}),
  run(2,{triage:'needs_info',outcome_state:{outcome:'needs_info',label:'agentd:needs-info',state:'pending'}}),
  run(3,{triage:'needs_info',outcome_state:{outcome:'needs_info',label:'agentd:needs-info',state:'pending_retry',reason:'gh_rate_limited',failures:1}}),
  run(4,{triage:'fix',confidence:'high',fix_handoff:'hof-where09',outcome_state:{outcome:'fix',label:'agentd:fixing',state:'failed',reason:'gh_auth',failures:3}}),
  run(5,{outcome_state:{outcome:'wontfix',label:'agentd:wontfix',state:'applied',comment:'failed',reason:'gh_forbidden',failures:3}}),
  run(6,{}),
  {key:'pr:acme/app#12:x',kind:'pr',repo:'acme/app',number:12,head_sha:'0123456789abcdef0123',handoff:'hof-where12',error:null,created:now,updated:now}]};
const summary=o=>({enabled:true,issues:'new',triage:true,repos:['acme/app'],max_per_day:5,offers_today:2,problem:'',issue_problem:'',last_issue_sync:ago(3),last_pr_sync:ago(4),...o});
const nodes=[{node:'alice-desk',person:'alice',kind:'cli',device:'dev-a1',last_seen:ago(1),reported_at:ago(1),state:'on',triggers:summary()},
 {node:'bob-laptop',person:'bob',kind:'cli',device:'dev-b1',last_seen:ago(1),reported_at:ago(1),state:'cannot_fire',triggers:summary({issues:'label',triage:false,offers_today:0,problem:'[triggers.dirs] acme/app: … is not a directory'+evil,last_issue_sync:null,last_pr_sync:null})},
 {node:'carol-box',person:'carol',kind:'cli',device:'dev-c1',last_seen:ago(180),reported_at:ago(181),state:'stale',triggers:null,last_reported_enabled:true},
 {node:'dave-mac',person:'dave',kind:'cli',device:'dev-d1',last_seen:ago(20),reported_at:null,state:'not_reported',triggers:null},
 {node:'erin-pc',person:'erin',kind:'cli',device:'dev-e1',last_seen:ago(2),reported_at:ago(2),state:'off',triggers:{enabled:false}}];
const where={kind:'hosts',text:'on 1 joined host',server:false,server_cannot_fire:false,hosts:1,hosts_cannot_fire:1,hosts_off:1,hosts_stale:1,hosts_not_reported:1};
const old={...own,offers:own.offers.map(({outcome_state,...o})=>o)};
let answer={status:old};
const dash={user:'alice',role:'owner',now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{}};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21623/#inbox',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/issues')body={issues:[]};
  else if(u.pathname==='/api/triggers')body={templates:[],repo:'acme/app',author:'alice',enable:'libraos-core config set triggers.enabled true',...answer};
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const $=id=>doc.getElementById(id),body=()=>$('trig-body'),q=s=>body().querySelector(s);
const open=async()=>{w.location.hash='#inbox';await settle();w.location.hash='#triggers';await settle()};
const host=n=>q('[data-host="'+n+'"]'),hostState=n=>host(n).querySelector('[data-host-state]');
const pairs=n=>{const out={};for(const dt of host(n).querySelectorAll('dt'))out[dt.textContent]=dt.nextElementSibling.textContent;return out};
const rows=()=>Object.fromEntries([...q('[data-trig=offers]').querySelectorAll('tbody tr')].map(r=>{const c=Object.fromEntries([...r.querySelectorAll('td')].map(td=>[td.dataset.label,td]));return [c.For.textContent,c]}));
const css=[...doc.querySelectorAll('style')].map(n=>n.textContent).join('\n');
const noJunk=()=>{const t=$('page-triggers').textContent;assert(!/undefined|NaN|null|\[object/.test(t),'the page shows junk: '+t);assert(!doc.querySelector('#page-triggers img'),'server text became markup')};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // A server with no where, no nodes and no outcome_state: the page as before.
 await open();
 assert.equal($('trig-meta').textContent,'Off · owners only');assert.equal($('triggers-badge').hidden,false,'no Off badge');
 assert.equal(q('[data-trig=state] strong').textContent,'Off. Nothing starts a worker on its own.');
 assert(!q('[data-trig=hosts]')&&!q('[data-trig=where-rest]')&&!q('[data-trig=own]'),'an older server shows hosts');
 assert.equal(q('[data-trig=settings] h3').textContent,'Settings now');assert.equal(q('[data-trig=offers] h3').textContent,'Latest runs');
 {const r=rows();assert.equal(r['acme/app#1'].Triage.querySelector('[data-triage=label]').textContent,'Label agentd:wontfix','an older run lost its implied label');
  assert(!body().querySelector('[data-outcome]'),'an older run shows an outcome state')}
 noJunk();
 // where kind hosts: the lead is where they run, not Off; the badge goes; Hosts lists each host.
 answer={status:own,where,nodes};await open();
 assert.equal($('trig-meta').textContent,'On · 1 host · owners only');assert.equal($('trig-meta').dataset.on,'true');
 assert.equal($('triggers-badge').hidden,true,'the rail still says Off while a host runs triggers');
 const lead=q('[data-trig=state] strong').textContent;assert.equal(lead,'Triggers run on 1 joined host.');assert(!/^Off/.test(lead));
 assert.equal(q('[data-trig=where-rest]').textContent,'Other joined hosts: 1 cannot fire, 1 off, 1 stale, 1 not reported.');
 assert(/^This server’s own triggers: Off\. Turned on from a terminal/.test(q('[data-trig=own]').textContent),'own: '+q('[data-trig=own]').textContent);
 assert.equal(q('[data-trig=settings] h3').textContent,'This server’s settings');assert.equal(q('[data-trig=offers] h3').textContent,'Latest runs on this server');
 assert(/changed on that host/.test(q('[data-trig=hosts-note]').textContent),'no word that a host is changed on that host');
 assert.deepEqual([...body().querySelectorAll('[data-host]')].map(n=>n.dataset.host),['alice-desk','bob-laptop','carol-box','dave-mac','erin-pc']);
 // Each state is a word and a mark beside any colour.
 const words={'alice-desk':'On','bob-laptop':'Cannot fire','carol-box':'Stale','dave-mac':'Not reported','erin-pc':'Off'};
 for(const[n,t]of Object.entries(words)){const s=hostState(n);assert.equal(s.lastChild.textContent,t,n);assert(s.querySelector('.trig-host-mark[aria-hidden=true]').textContent.trim(),n+' has no mark')}
 assert.equal(new Set([...body().querySelectorAll('.trig-host-mark')].map(n=>n.textContent)).size,5,'two states share a mark');
 assert(host('alice-desk').querySelector('b').textContent==='alice-desk'&&/alice/.test(host('alice-desk').querySelector('.trig-host-person').textContent));
 {const p=pairs('alice-desk');assert.equal(p.Issues,'Every new issue');assert.equal(p['Triage first'],'On');assert.equal(p.Repositories,'acme/app');assert.equal(p['Offers today'],'2 of 5 a day');assert(/issues 3 min ago, PRs 4 min ago/.test(p['Last sync']),'sync: '+p['Last sync'])}
 assert(host('alice-desk').querySelector('dd time[title]'),'a sync time has no exact time');
 assert(/Cannot fire: \[triggers\.dirs\] acme\/app: … is not a directory/.test(host('bob-laptop').textContent));assert(host('bob-laptop').textContent.includes(evil),'problem not shown as text');
 {const p=pairs('bob-laptop');assert.equal(p.Issues,'Labelled by a listed person');assert.equal(p['Triage first'],'Off');assert.equal(p['Last sync'],'Never')}
 // Stale and not reported never read as on: no On word, no summary, what it last said and when.
 for(const n of ['carol-box','dave-mac']){assert(!host(n).querySelector('dl'),n+' shows a summary');assert(!/^On$/.test(hostState(n).lastChild.textContent))}
 assert(/Last reported 3h ago, when it said its triggers were on; that may have changed since/.test(host('carol-box').textContent),'stale: '+host('carol-box').textContent);
 assert(/older release, or no pass yet/.test(host('dave-mac').textContent),'not reported: '+host('dave-mac').textContent);
 assert(/Its triggers are off/.test(host('erin-pc').textContent)&&!host('erin-pc').querySelector('dl'),'off host');
 // A stale host whose summary the server still sent (it should not) shows none of it.
 answer={status:own,where,nodes:[{...nodes[2],triggers:summary()}]};await open();assert(!host('carol-box').querySelector('dl'),'a stale host shows its old summary');assert.equal(hostState('carol-box').lastChild.textContent,'Stale');
 // The run's label state: on GitHub, pending, pending after gh failed, failed with the reason, and the comment.
 answer={status:own,where,nodes};await open();
 {const r=rows(),lab=n=>r['acme/app#'+n].Triage.querySelector('[data-triage=label]');
  assert.equal(lab(1).textContent,'Label agentd:wontfix on GitHub');assert.equal(lab(1).dataset.outcome,'applied');
  assert.equal(lab(2).textContent,'Label agentd:needs-info pending: set at the next sync');
  assert.equal(lab(3).textContent,'Label agentd:needs-info pending: GitHub’s rate limit; the next sync tries again');
  assert.equal(lab(4).textContent,'Label agentd:fixing failed: gh is not signed in, 3 tries; each sync tries again');assert(lab(4).classList.contains('trig-problem'));
  assert.equal(lab(5).textContent,'Label agentd:wontfix on GitHub');assert(/Comment failed: gh was refused permission/.test(r['acme/app#5'].Triage.querySelector('[data-triage=comment]').textContent));
  assert.equal(lab(6).textContent,'Label agentd:wontfix','a run with no outcome_state lost its implied label');assert(!lab(6).dataset.outcome);
  assert.equal(r['acme/app#12'].Triage.textContent,'—','a PR run shows a label')}
 noJunk();
 // server_and_hosts and server: the lead names this server; server alone has no Hosts word count.
 answer={status:{...own,enabled:true},where:{...where,kind:'server_and_hosts',server:true,hosts:2,hosts_cannot_fire:0,hosts_off:0,hosts_stale:0,hosts_not_reported:0},nodes:[nodes[0],{...nodes[0],node:'bob-desk',person:'bob'}]};await open();
 assert.equal(q('[data-trig=state] strong').textContent,'Triggers run on this server and 2 joined hosts.');assert.equal($('trig-meta').textContent,'On · server and 2 hosts · owners only');assert(!q('[data-trig=where-rest]'));
 answer={status:{...own,enabled:true},where:{...where,kind:'server',server:true,hosts:0,hosts_cannot_fire:0,hosts_off:0,hosts_stale:0,hosts_not_reported:0},nodes:[]};await open();
 assert.equal(q('[data-trig=state] strong').textContent,'Triggers run on this server.');assert(/No joined host has reported/.test(q('[data-trig=hosts]').textContent));
 // nowhere: Off leads again, and the badge is back.
 answer={status:own,where:{...where,kind:'nowhere',text:'nowhere: nothing starts a worker on its own',hosts:0,hosts_cannot_fire:0,hosts_off:1,hosts_stale:1,hosts_not_reported:0},nodes:[nodes[2],nodes[4]]};await open();
 assert(/^Off\. Nothing starts a worker on its own/.test(q('[data-trig=state] strong').textContent));assert.equal($('trig-meta').textContent,'Off · owners only');assert.equal($('triggers-badge').hidden,false);
 assert.equal(q('[data-trig=where-rest]').textContent,'Joined hosts: 1 off, 1 stale.');assert.equal(hostState('carol-box').lastChild.textContent,'Stale');
 noJunk();
 // The host rows wrap at a phone's width: no fixed width, and long text breaks.
 const hostCss=css.split('\n').filter(l=>/\.trig-host/.test(l)).join('\n');assert(/overflow-wrap:anywhere/.test(hostCss));assert(!/(?:^|[;{])\s*(?:min-)?width:\s*(?:[4-9]\d\d|\d{4,})px/.test(hostCss),'a host row has a fixed width wider than a phone');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_triggers_where: ok',process.env.DASH_UI_PHONE==='1'?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
