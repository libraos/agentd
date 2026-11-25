// #460: the Triggers page, for owners. It draws what GET /api/triggers sends
// (the same status `agentd trigger status` prints: settings, why they cannot
// fire, latest offers) and the templates; Write sends the template through the
// Settings route and never turns triggers on; a non-owner gets the refusal and
// nothing else. #484: the new layout (a state card with the terminal command,
// templates first, Settings now and Latest runs beside them, each run linking
// to its task, an empty list saying so) and read-only Improve and Signals
// cards; every request the page makes is a read or a template write, and none
// turns triggers, improve or signals on. #907 step 4: it sits under Settings > Server and is shown
// to owners only. It is also an owner's rail item (the account menu's link on a phone), current while
// #triggers is open, with an Off badge once the page has read that triggers are off; a non-owner has
// neither. Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_triggers.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const toml='[triggers]\nenabled = false # on from a terminal: agentd config set triggers.enabled true\nrepos = ["o/r"]\nauthors = ["alice"]\nbudget = "30m"\nmax_per_day = 3\n\n[triggers.dirs]\n"o/r" = "/w/r"\n';
const templates=[{name:'ci-red',title:'Fix red CI on my PRs',about:'When CI goes red.',budget:'30m',max_per_day:3,toml},
 {name:'issue-label',title:'Fix issues I label, and red CI',about:'When labelled.',label:'agentd:fix',budget:'45m',max_per_day:3,toml:toml.replace('budget = "30m"','label = "agentd:fix"\nbudget = "45m"')}];
// on is what the server sends while triggers are on and cannot fire.
const on={enabled:true,problem:'[triggers] authors is empty'+evil,problem_when_enabled:'',repos:['o/r','o/other'],authors:[],label:'',budget:'30m',max_per_day:4,dirs:{'o/r':'/w/r'},not_in_sync_repos:['o/other'],
 offers:[{key:'pr:o/r#12:x',kind:'pr',repo:'o/r',number:12,head_sha:'0123456789abcdef0123',handoff:'hof-12',error:null,created:now,updated:now},
  {key:'issue:o/r#7',kind:'issue',repo:'o/r',number:7,head_sha:null,handoff:null,error:'git fetch failed'+evil,created:now,updated:now}]};
const off={enabled:false,problem:'',problem_when_enabled:'[triggers.dirs] has no checkout for o/r',repos:['o/r'],authors:['alice'],label:'',budget:'30m',max_per_day:3,dirs:{},not_in_sync_repos:[],offers:[]};
// improveOn has a problem and a counted pair and an offer; improveOff and signals have nothing yet.
const improveOn={enabled:true,problem:'[improve] dir is not set'+evil,failed_run_threshold:3,window_days:7,max_per_day:2,repo:'o/r',dir:'',budget:'20m',
 pending:[{scorer:'judge',role:'none',failures:2,needed:3}],offers:[{id:'imp-1',scorer:'judge',role:'fixer',state:'offered',handoff:'hof-imp',pr:null,error:null,created:now}]};
const improveOff={enabled:false,problem:'[improve] repo is not set',failed_run_threshold:3,window_days:7,max_per_day:2,repo:'',dir:'',budget:'',pending:[],offers:[]};
const signalsOn={enabled:true,max_per_day:3,offered_today:1,offers:[{id:'hof-sig',goal:'agentd status flags failing_repeat/p/a at 3.'+evil,signal:'failing_repeat/p/a',signal_value:3,signal_result:null,state:'offered',created:now}]};
const signalsOff={enabled:false,max_per_day:3,offered_today:0,offers:[]};
let mode='on',triggerGets=[];const posts=[],requests=[];
const page=()=>({status:mode==='off'?off:on,templates,repo:'o/r',author:mode==='off'?'alice':'',dir:'/w/r',enable:'agentd config set triggers.enabled true',
 improve:mode==='off'?improveOff:improveOn,improve_enable:'agentd config set improve.enabled true',signals:mode==='off'?signalsOff:signalsOn,signals_enable:'agentd config set signals.enabled true'});
const dash={user:'alice',role:'owner',now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{}};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21620/#inbox',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.navigator.clipboard={writeText:async t=>{w.copied=t}};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);let body={},status=200;requests.push({path:u.pathname,method:opts.method||'GET',body:opts.body||''});
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/issues')body={issues:[]};
  else if(u.pathname==='/api/triggers'){triggerGets.push(u.search);if(mode==='denied'){status=403;body={ok:false,error:'Triggers are for owners'}}else body=page()}
  else if(u.pathname==='/api/settings'&&opts.method==='POST'){posts.push(JSON.parse(opts.body));body={changed:true,enabled:false}}
  return {ok:status<400,status,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()},route=async h=>{w.location.hash=h;await settle()};
const body=()=>doc.getElementById('trig-body'),pairs=(sel='[data-trig=settings]')=>{const out={};const dl=body().querySelector(sel+' dl');for(const dt of dl.querySelectorAll('dt'))out[dt.textContent]=dt.nextElementSibling.textContent;return out};
const button=(root,text)=>[...root.querySelectorAll('button')].find(b=>b.textContent===text);
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // Settings links to it.
 assert(doc.querySelector('#set-triggers a[href="#triggers"]'),'Settings has no link to Triggers');
 // An owner's rail item: a link with an icon and a label, just above Chat, not current yet, no badge
 // before the page has read anything (no request is made for it).
 const railTrig=()=>doc.querySelector('#rail [data-rail="triggers"]'),badge=()=>doc.getElementById('triggers-badge'),acctTrig=()=>doc.querySelector('#account .acct-links a[href="#triggers"]');
 assert(railTrig()&&!railTrig().hidden,'an owner has no Triggers rail item');assert.equal(railTrig().tagName,'A');assert.equal(railTrig().getAttribute('href'),'#triggers');
 assert.equal(railTrig().querySelector('.rail-label').textContent,'Triggers');assert(railTrig().querySelector('.rail-icon svg[aria-hidden="true"]'),'the rail item has no icon');
 assert.equal(railTrig().nextElementSibling.dataset.rail,'chat','Triggers is not just above Chat');assert(!railTrig().hasAttribute('aria-current'));
 assert(badge().hidden,'the Off badge shows before anything was read');assert.equal(triggerGets.length,0,'the rail read /api/triggers');
 assert(acctTrig()&&!acctTrig().hidden,'an owner has no Triggers in the account menu');
 // On, and cannot fire: the CLI's settings, reason and latest offers. Opened from the rail.
 railTrig().focus();assert.equal(doc.activeElement,railTrig(),'the rail item cannot take the focus');
 railTrig().click();await settle();assert.equal(w.location.hash,'#triggers','the rail item does not open #triggers');
 assert(!doc.getElementById('page-triggers').hidden,'the Triggers page is hidden');
 assert.equal(railTrig().getAttribute('aria-current'),'page','the rail item is not current on #triggers');assert(!doc.querySelector('#rail [data-rail="settings"]').hasAttribute('aria-current'),'Settings is current on #triggers');
 assert(badge().hidden,'the Off badge shows while triggers are on');assert.equal(railTrig().getAttribute('aria-label'),'Triggers');
 let p=pairs();const state=()=>body().querySelector('[data-trig=state]');
 assert(state(),'no state card');assert.equal(body().firstElementChild,state(),'the state card is not first');
 assert.equal(state().querySelector('strong').textContent,'On, but cannot fire: [triggers] authors is empty'+evil);
 assert(/libraos-core config set triggers\.enabled false/.test(state().textContent),'the state card has no terminal command to turn triggers off');
 assert(!state().querySelector('[data-trig=later]'),'shows a later reason while on');
 assert.equal(doc.getElementById('trig-meta').textContent,'On · owners only');
 // The state is a chip beside the title, not a line floating between it and Refresh.
 assert(doc.getElementById('trig-meta').parentElement.querySelector('h2'),'the state is not beside the title');assert.equal(doc.getElementById('trig-meta').dataset.on,'true');
 // Templates first, then Settings now, Improve and Signals beside them; Latest runs full width under both (#907 review: its six columns squeezed into the side column).
 const cols=body().querySelector('.trig-cols');assert(cols,'no columns');assert.equal(cols.children[0].dataset.trig,'templates','templates are not first');
 assert.deepEqual([...cols.children[1].children].map(n=>n.dataset.trig),['settings','improve','signals']);
 assert.deepEqual([...body().children].map(n=>n.dataset.trig||n.className),['state','trig-cols','offers'],'Latest runs is not under the columns');assert(!cols.querySelector('[data-trig=offers]'),'Latest runs is still in a column');
 assert.equal(p['Repositories'],'o/r, o/other');assert.equal(p['Authors'],'Not configured');assert.equal(p['Issue label'],'Not set: issues start nothing');
 assert.equal(p['Budget'],'30m');assert.equal(p['Most a day'],'4');assert.equal(p['Checkouts'],'o/r: /w/r');assert.equal(p['Not in [sync] repos'],'o/other');
 const rows=[...body().querySelectorAll('[data-trig=offers] tbody tr')];assert.equal(rows.length,2,'want two offers');
 const cells=r=>Object.fromEntries([...r.querySelectorAll('td')].map(td=>[td.dataset.label,td.textContent]));
 assert.deepEqual({...cells(rows[0]),When:''},{When:'',Kind:'PR went red',For:'o/r#12',Commit:'0123456789ab',Task:'hof-12',Error:'—'});
 assert(rows[0].querySelector('a[href="#issues/hof-12"]'),'the offer does not open its task');
 // Each run's time is relative, with the exact time as its tooltip.
 const when=rows[0].querySelector('time');assert(when&&when.textContent==='just now'&&when.title===now,'a run time is not relative with its exact time');
 assert.deepEqual({...cells(rows[1]),When:''},{When:'',Kind:'Labelled issue',For:'o/r#7',Commit:'—',Task:'—',Error:'git fetch failed'+evil});
 assert(!doc.querySelector('#page-triggers img'),'server text became markup');
 // Templates: the text to copy, and Write refused while triggers are on.
 const tpl=body().querySelector('[data-template=ci-red]');assert(tpl,'no ci-red template');assert.equal(tpl.querySelector('pre').textContent,toml);
 assert.equal(tpl.querySelector('.trig-kind').textContent,'Pull requests');assert.equal(body().querySelector('[data-template=issue-label] .trig-kind').textContent,'Issues');
 button(tpl,'Copy config').click();await settle();assert.equal(w.copied,toml,'Copy did not copy the template');
 const write=button(tpl,'Write to config.toml');assert.equal(write.getAttribute('aria-disabled'),'true','Write is live while triggers are on');
 // A refused Write says why, on the page and not only in its tooltip.
 assert.equal(tpl.querySelector('[data-write-why]').textContent,'Triggers are on. Turn them off from a terminal before writing a template.');assert.equal(write.title,tpl.querySelector('[data-write-why]').textContent);
 write.click();await settle();assert(!doc.querySelector('dialog'),'Write opened a sheet while triggers are on');assert.equal(posts.length,0);
 // Improve and signals, read-only: state, settings, latest offers linking to their tasks, and no control.
 const imp=body().querySelector('[data-trig=improve]'),sig=body().querySelector('[data-trig=signals]');
 assert.equal(imp.querySelector('[data-trig=problem]').textContent,'On, but cannot offer: [improve] dir is not set'+evil);
 p=pairs('[data-trig=improve]');assert.equal(p['Repository'],'o/r');assert.equal(p['Checkout'],'Not configured');assert.equal(p['Budget'],'20m');assert.equal(p['Failures before an offer'],'3');assert.equal(p['Counted over'],'7 days');assert.equal(p['Most a day'],'2');
 assert.equal(p['Counting now'],'judge · none: 2 of 3 failures');
 const irows=[...imp.querySelectorAll('tbody tr')];assert.equal(irows.length,1);assert.deepEqual({...cells(irows[0]),When:''},{When:'',Scorer:'judge',Role:'fixer',State:'Unassigned',Task:'hof-imp',PR:'—',Error:'—'});
 assert(irows[0].querySelector('a[href="#issues/hof-imp"]'),'the improve offer does not open its task');
 assert.equal(sig.querySelector('[data-trig=problem]').textContent,'On and able to offer');
 p=pairs('[data-trig=signals]');assert.equal(p['Most a day'],'3');assert.equal(p['Offered in 24 hours'],'1');
 const srows=[...sig.querySelectorAll('tbody tr')];assert.equal(srows.length,1);assert.equal(cells(srows[0]).Signal,'failing_repeat/p/a');assert.equal(cells(srows[0]).State,'Unassigned');
 assert(srows[0].querySelector('a[href="#issues/hof-sig"]'),'the signal offer does not open its task');
 for(const card of [imp,sig])assert(!card.querySelector('button,input,select,textarea,form,[contenteditable]'),card.dataset.trig+' has a control');
 assert(!doc.querySelector('#page-triggers img'),'server text became markup');
 // Off: the enable command, what would stop it, and Write through Settings.
 mode='off';button(doc.getElementById('page-triggers'),'Refresh').click();await settle();p=pairs();
 assert.equal(state().querySelector('strong').textContent,'Off. Nothing starts a worker on its own.');
 assert.equal(state().querySelector('.trig-small').textContent,'Off. Turned on from a terminal: agentd config set triggers.enabled true. Would still not fire: [triggers.dirs] has no checkout for o/r');
 assert.equal(state().querySelector('[data-trig=later]').textContent,'[triggers.dirs] has no checkout for o/r');
 assert.equal(doc.getElementById('trig-meta').textContent,'Off · owners only');
 assert(!badge().hidden&&badge().textContent==='Off','the rail item has no Off badge while triggers are off');assert.equal(railTrig().getAttribute('aria-label'),'Triggers, off');
 // An empty list says so, for runs and for both offer lists.
 assert.equal(body().querySelector('[data-trig=offers] [data-trig=empty]').textContent,'Nothing recorded yet. Each run links to the task it started.');
 assert(!body().querySelector('[data-trig=offers] table'),'an empty run list draws a table');
 assert.equal(body().querySelector('[data-trig=improve] [data-trig=problem]').textContent,'Off. Turned on from a terminal: agentd config set improve.enabled true. Would still not offer: [improve] repo is not set');
 assert.equal(body().querySelector('[data-trig=signals] [data-trig=problem]').textContent,'Off. Turned on from a terminal: agentd config set signals.enabled true.');
 for(const k of ['improve','signals'])assert.equal(body().querySelector('[data-trig='+k+'] [data-trig=empty]').textContent,'Nothing offered yet.');
 // Runs moves to the list of runs.
 let scrolled=null;body().querySelector('[data-trig=offers]').scrollIntoView=function(){scrolled=this};button(state(),'Runs').click();
 assert.equal(scrolled,body().querySelector('[data-trig=offers]'),'Runs does not go to the runs');assert.equal(doc.activeElement,scrolled);
 const tpl2=body().querySelector('[data-template=issue-label]'),write2=button(tpl2,'Write to config.toml');assert.equal(write2.getAttribute('aria-disabled'),'false');assert(!tpl2.querySelector('[data-write-why]'),'a live Write gives a reason');
 const gets=triggerGets.length;write2.click();await settle();const dlg=doc.querySelector('dialog');assert(dlg,'Write opened no sheet');assert(/nothing fires until/i.test(dlg.textContent),'the sheet does not say triggers stay off');
 dlg.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
 assert.deepEqual(posts,[{action:'trigger_template',template:'issue-label',repo:'o/r',author:'alice'}]);
 assert(!JSON.stringify(posts).includes('enabled'),'the page sent enabled');
 // Every request the page made reads, or writes a template: none can turn anything on.
 const writes=requests.filter(r=>r.method!=='GET');assert(writes.length>0);
 for(const r of writes){assert.equal(r.path,'/api/settings',r.method+' '+r.path);assert.equal(JSON.parse(r.body).action,'trigger_template');assert(!/enabled|improve|signals/.test(r.body),r.body)}assert(triggerGets.length>gets,'the page did not read status again after the write');
 // Fill in asks for templates for another repository and author.
 doc.getElementById('trig-repo').value='acme/app';doc.getElementById('trig-author').value='bob';body().querySelector('form.trig-fill').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
 assert.equal(triggerGets.at(-1),'?repo=acme%2Fapp&author=bob');
 // A non-owner: the refusal, and none of the page.
 mode='denied';button(doc.getElementById('page-triggers'),'Refresh').click();await settle();
 // The server's refusal is the same owner-only card as below, in place of the intro, never a bare line.
 const ownerOnly=()=>{assert(doc.getElementById('trig-error').hidden,'the refusal is a bare error line');assert(doc.getElementById('trig-intro').hidden,'the intro shows beside the refusal');
  assert.equal(body().children.length,1,'a non-owner sees triggers');const card=body().querySelector('[data-trig=owner-only]');assert(card&&card.classList.contains('state'),'no owner-only card');assert(/^Triggers are owner-only\. Ask an owner( \([^)]+\))? to change them\.$/.test(card.textContent),card.textContent)};
 ownerOnly();assert.equal(doc.getElementById('trig-meta').textContent,'','a non-owner sees the state');
 // A user who is not an owner (#907 step 4): Triggers is not shown anywhere (no rail item, no Settings
 // section or line, not in Help), and its address says it is for owners without reading /api/triggers.
 assert(badge().hidden,'the Off badge outlives the refusal');
 mode='on';dash.role='dev';dash.user='dave';w.eval('refresh()');await settle();await route('#settings/workers');
 assert(railTrig().hidden,'a non-owner sees Triggers in the rail');assert(acctTrig().hidden,'a non-owner sees Triggers in the account menu');
 assert(![...doc.querySelectorAll('a[href="#triggers"]')].some(a=>{for(let x=a;x;x=x.parentElement)if(x.hidden)return false;return true}),'a non-owner has a link to Triggers');
 assert(!doc.querySelector('#settings-sections a[data-section="triggers"]'),'a non-owner sees Triggers in Settings');assert(doc.getElementById('set-triggers').hidden,'a non-owner sees the Triggers line');
 assert([...doc.querySelectorAll('[data-owner-only]')].every(n=>n.hidden),'an owner-only mention shows to a non-owner');
 const ownerGets=triggerGets.length;await route('#triggers');assert.equal(triggerGets.length,ownerGets,'a non-owner read /api/triggers');
 ownerOnly();
 // Back to an owner: the section, the line and the page again.
 dash.role='owner';dash.user='alice';w.eval('refresh()');await settle();await route('#settings/workers');
 assert(doc.querySelector('#settings-sections a[data-section="triggers"][href="#triggers"]'),'an owner has no Triggers section');assert(!doc.getElementById('set-triggers').hidden);
 assert(!railTrig().hidden&&!acctTrig().hidden,'an owner does not see Triggers in the rail and menu again');
 await route('#triggers');assert(body().children.length>0,'an owner does not see triggers again');assert(!doc.getElementById('trig-intro').hidden,'the intro stays hidden for an owner');
 // Phone: the config text scrolls in its box rather than widening the page.
 const css=[...doc.querySelectorAll('style')].map(n=>n.textContent).join('\n');assert(/@media\(max-width:860px\)\{\.trig-cols\{grid-template-columns:minmax\(0,1fr\)\}/.test(css),'the columns do not stack on a phone');assert(/\.trig-tpl pre\{[^}]*overflow-x:auto/.test(css)&&/\.trig-tpl>\*\{min-width:0\}/.test(css),'template text does not scroll in place');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_triggers: ok',process.env.DASH_UI_PHONE==='1'?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
