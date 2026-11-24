// Who is on what (libraos/core#849): Team > Activity (#team/who, #907) reads GET
// /api/presence and lists every live session, grouped by person: host, tool,
// activity, issue, age, and its issues, checkouts, claims and edited files; a
// record another session also holds is marked shared, naming the others.
// Read only: no actions. Polls with the refresh, so a session whose records
// lapsed on the server drops out at the next read.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_presence.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const other=(user,node,session)=>({user,node,session});
const sess=(session,user,node,extra)=>({session,user,node,tool:'claude',activity:'working on '+session,issue:null,handoff:null,local:false,since:now,touched:now,age_s:300,age:'5m',trees:[],files:[],claims:[],issues:[],...extra});
let presence={host:'srv',lease_s:600,truncated:false,overlap_count:2,sessions:[
  sess('s-ann','ann','ann-laptop',{activity:'fixing login '+evil,issue:'acme/app#7',tool:'codex',
    issues:[{resource:'issue:acme/app#7',issue:'acme/app#7',others:[other('bob','bob-desk','s-bob')]}],
    trees:[{resource:'tree:github.com/acme/app@fix-login'}],
    files:[{resource:'repo:github.com/acme/app#src/login.go',others:[other('bob','bob-desk','s-bob')]}]}),
  sess('s-bob','bob','bob-desk',{issue:'acme/app#7',age:'1h',
    issues:[{resource:'issue:acme/app#7',issue:'acme/app#7',others:[other('ann','ann-laptop','s-ann')]}],
    claims:[{resource:'repo:github.com/acme/app#src',mode:'exclusive',others:[other('ann','ann-laptop','s-ann')]}]}),
  sess('s-cid','cid','srv',{local:true,activity:null,trees:[{resource:'tree:github.com/acme/site@main'}]})]};
presence.sessions.forEach(p=>{if(p.issues.some(x=>x.others)||p.files.some(x=>x.others)||p.claims.some(x=>x.others))p.overlaps=[{}]});
let dash={user:'cid',role:'viewer',now,team:true,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],waiting:[],claims:[],messages:[],inbox:[],checkouts:[]};
const requests=[],errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=(body,status=200)=>({ok:status<400,status,json:async()=>body,text:async()=>JSON.stringify(body)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21620/#team/who',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);requests.push((opts.method||'GET')+' '+u.pathname);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/presence')return json(presence);
  if(u.pathname==='/api/nodes')return json({nodes:[]});
  if(u.pathname==='/api/team')return json({roles:[],members:[],problems:[],handoff_roles:{}});
  if(u.pathname==='/api/repositories')return json({repositories:[]});
  if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:false});
  return json({})}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
const view=()=>doc.querySelector('#team-view'),row=s=>view().querySelector('[data-presence="'+s+'"]');
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 assert(requests.includes('GET /api/presence'),'the dash never asks for /api/presence');
 const tab=doc.querySelector('#team-tabs a[data-tab="activity"]');assert(tab,'no Activity tab (Who is on what)');assert.equal(tab.getAttribute('aria-current'),'page');assert.equal(tab.querySelector('.n').textContent,'3');
 // Grouped by person; every live session listed with host, tool, activity, issue and age.
 assert.deepEqual([...view().querySelectorAll('[data-presence-group]')].map(g=>g.dataset.presenceGroup),['ann','bob','cid']);
 const at=row('s-ann').textContent;for(const want of ['fixing login','ann-laptop','acme/app#7','on 5m','s-ann','acme/app@fix-login','src/login.go'])assert(at.includes(want),'ann row lacks '+want+': '+at);
 assert(at.includes(evil)&&!row('s-ann').querySelector('img'),'an activity became markup');
 assert(row('s-bob').textContent.includes('on 1h'));assert(row('s-cid').textContent.includes('this host'),'a local session is not marked as this host');
 assert(row('s-cid').textContent.includes('no activity stated'));
 // Shared records name the others.
 const shared=[...row('s-ann').querySelectorAll('[data-shared]')].map(x=>x.textContent);
 assert.equal(shared.length,2,'ann shares an issue and a file: '+shared);assert(shared.every(t=>t.includes('shared with bob on bob-desk')),shared.join('|'));
 const bobClaim=row('s-bob').querySelector('[data-presence-kind="claims"] [data-shared]');assert(bobClaim&&bobClaim.textContent.includes('exclusive')&&bobClaim.textContent.includes('shared with ann on ann-laptop'),'bob claim not marked');
 assert(!row('s-cid').querySelector('[data-shared]'),'cid shares nothing');
 assert(row('s-ann').classList.contains('pr-overlap')&&!row('s-cid').classList.contains('pr-overlap'));
 assert(view().querySelector('[data-overlap-count]').textContent.includes('2 shared'));
 // Read only: a viewer sees it, and nothing writes.
 assert(!view().querySelector('button[data-write]')&&!view().querySelector('form'),'Who is on what has an action');
 assert(!requests.some(r=>r.startsWith('POST /api/presence')),'the page wrote to /api/presence');
 // Search matches a person, host, tool, task, issue or session. Typing and
 // refreshes keep the control focused and its value, including empty results.
 const search=()=>view().querySelector('input[type=search]');
 const filter=async value=>{const s=search();s.focus();s.value=value;s.dispatchEvent(new w.Event('input'));await settle();assert.equal(doc.activeElement,search(),'search lost keyboard focus')};
 for(const [query,ids] of [['ann',['s-ann']],['bob-desk',['s-bob']],['codex',['s-ann']],['fixing login',['s-ann']],['acme/app#7',['s-ann','s-bob']],['s-cid',['s-cid']]]){
  await filter(query);assert.deepEqual([...view().querySelectorAll('[data-presence]')].map(r=>r.dataset.presence),ids,'search '+query);
 }
 await filter('nothing matches');assert(view().textContent.includes('No sessions match this search.'));
 search().setSelectionRange(3,3);search().dispatchEvent(new w.Event('input'));await settle();assert.equal(search().selectionStart,3,'redraw moved the search caret');
 w.eval('PRESENCE.at=0;refresh()');await settle();assert.equal(search().value,'nothing matches','refresh cleared search');assert.equal(doc.activeElement,search(),'refresh lost search focus');
 await filter('');assert.equal(view().querySelectorAll('[data-presence]').length,3);
 // A session whose records lapsed drops out on the next read.
 presence={...presence,overlap_count:0,sessions:[sess('s-cid','cid','srv',{local:true})]};w.eval('PRESENCE.at=0;refresh()');await settle();
 assert(!row('s-ann')&&!row('s-bob')&&row('s-cid'),'lapsed sessions still shown');assert(!view().querySelector('[data-overlap-count]'));
 // None live, and an error.
 presence={...presence,sessions:[]};w.eval('PRESENCE.at=0;refresh()');await settle();assert(view().textContent.includes('No live sessions'));
 // Read before the snapshot named the person (layout review O): the rows are dropped for the new person and read
 // again at once, never left on an endless Loading until the next 8 s poll.
 {const before=requests.filter(r=>r==='GET /api/presence').length;w.eval("PRESENCE.user='';PRESENCE.at=Date.now();teamDraw()");await settle();
  assert(requests.filter(r=>r==='GET /api/presence').length>before,'a dropped list is not read again');assert(!/Loading…/.test(view().textContent),'Activity stays on Loading: '+view().textContent.slice(0,120))}
 // Refused (a server that keeps Activity to owners): says so, not Loading and not an error.
 {const keep=presence;presence=null;const f=w.fetch;w.fetch=async(url,o)=>new URL(url,w.location.href).pathname==='/api/presence'?json({error:'owners only'},403):f(url,o);
  w.eval('PRESENCE.at=0;refresh()');await settle();assert(view().querySelector('[data-presence-denied]'),'a refused Activity does not say who sees it: '+view().textContent.slice(0,120));w.fetch=f;presence=keep}
 assert(!errors.length,errors.join('\n'));
 console.log('dash_presence: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');w.close()})().catch(e=>{console.error(e);process.exit(1)});
