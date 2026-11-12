// #460: the Triggers page, for owners. It draws what GET /api/triggers sends
// (the same status `agentd trigger status` prints: settings, why they cannot
// fire, latest offers) and the templates; Write sends the template through the
// Settings route and never turns triggers on; a non-owner gets the refusal and
// nothing else. Runs in every mode:
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
let mode='on',triggerGets=[];const posts=[];
const page=()=>({status:mode==='off'?off:on,templates,repo:'o/r',author:mode==='off'?'alice':'',dir:'/w/r',enable:'agentd config set triggers.enabled true'});
const dash={user:'alice',role:'owner',now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{}};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#inbox',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.navigator.clipboard={writeText:async t=>{w.copied=t}};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);let body={},status=200;
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/issues')body={issues:[]};
  else if(u.pathname==='/api/triggers'){triggerGets.push(u.search);if(mode==='denied'){status=403;body={ok:false,error:'Triggers are for owners'}}else body=page()}
  else if(u.pathname==='/api/settings'&&opts.method==='POST'){posts.push(JSON.parse(opts.body));body={changed:true,enabled:false}}
  return {ok:status<400,status,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()},route=async h=>{w.location.hash=h;await settle()};
const body=()=>doc.getElementById('trig-body'),pairs=()=>{const out={};const dl=body().querySelector('[data-trig=settings] dl');for(const dt of dl.querySelectorAll('dt'))out[dt.textContent]=dt.nextElementSibling.textContent;return out};
const button=(root,text)=>[...root.querySelectorAll('button')].find(b=>b.textContent===text);
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // Settings links to it.
 assert(doc.querySelector('#set-triggers a[href="#triggers"]'),'Settings has no link to Triggers');
 // On, and cannot fire: the CLI's settings, reason and latest offers.
 await route('#triggers');assert(!doc.getElementById('page-triggers').hidden,'the Triggers page is hidden');
 let p=pairs();
 assert.equal(p['State'],'On, but cannot fire: [triggers] authors is empty'+evil);
 assert(!('Would stop it once on' in p),'shows a later reason while on');
 assert.equal(p['Repositories'],'o/r, o/other');assert.equal(p['Authors'],'Not configured');assert.equal(p['Issue label'],'Not set: issues start nothing');
 assert.equal(p['Budget'],'30m');assert.equal(p['Most offers a day'],'4');assert.equal(p['Checkouts'],'o/r: /w/r');assert.equal(p['Not in [sync] repos'],'o/other');
 const rows=[...body().querySelectorAll('[data-trig=offers] tbody tr')];assert.equal(rows.length,2,'want two offers');
 const cells=r=>Object.fromEntries([...r.querySelectorAll('td')].map(td=>[td.dataset.label,td.textContent]));
 assert.deepEqual({...cells(rows[0]),When:''},{When:'',Kind:'PR went red',For:'o/r#12',Commit:'0123456789ab',Task:'hof-12',Error:'—'});
 assert(rows[0].querySelector('a[href="#issues/hof-12"]'),'the offer does not open its task');
 assert.deepEqual({...cells(rows[1]),When:''},{When:'',Kind:'Labelled issue',For:'o/r#7',Commit:'—',Task:'—',Error:'git fetch failed'+evil});
 assert(!doc.querySelector('#page-triggers img'),'server text became markup');
 // Templates: the text to copy, and Write refused while triggers are on.
 const tpl=body().querySelector('[data-template=ci-red]');assert(tpl,'no ci-red template');assert.equal(tpl.querySelector('pre').textContent,toml);
 button(tpl,'Copy').click();await settle();assert.equal(w.copied,toml,'Copy did not copy the template');
 const write=button(tpl,'Write to config.toml');assert.equal(write.getAttribute('aria-disabled'),'true','Write is live while triggers are on');
 write.click();await settle();assert(!doc.querySelector('dialog'),'Write opened a sheet while triggers are on');assert.equal(posts.length,0);
 // Off: the enable command, what would stop it, and Write through Settings.
 mode='off';button(doc.getElementById('page-triggers'),'Refresh').click();await settle();p=pairs();
 assert.equal(p['State'],'Off. Nothing fires until it is turned on from a terminal: agentd config set triggers.enabled true.');
 assert.equal(p['Would stop it once on'],'[triggers.dirs] has no checkout for o/r');
 const tpl2=body().querySelector('[data-template=issue-label]'),write2=button(tpl2,'Write to config.toml');assert.equal(write2.getAttribute('aria-disabled'),'false');
 const gets=triggerGets.length;write2.click();await settle();const dlg=doc.querySelector('dialog');assert(dlg,'Write opened no sheet');assert(/nothing fires until/i.test(dlg.textContent),'the sheet does not say triggers stay off');
 dlg.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
 assert.deepEqual(posts,[{action:'trigger_template',template:'issue-label',repo:'o/r',author:'alice'}]);
 assert(!JSON.stringify(posts).includes('enabled'),'the page sent enabled');assert(triggerGets.length>gets,'the page did not read status again after the write');
 // Fill in asks for templates for another repository and author.
 doc.getElementById('trig-repo').value='acme/app';doc.getElementById('trig-author').value='bob';body().querySelector('form.trig-fill').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
 assert.equal(triggerGets.at(-1),'?repo=acme%2Fapp&author=bob');
 // A non-owner: the refusal, and none of the page.
 mode='denied';button(doc.getElementById('page-triggers'),'Refresh').click();await settle();
 assert.equal(doc.getElementById('trig-error').hidden,false);assert.equal(doc.getElementById('trig-error').textContent,'Triggers are for owners');
 assert.equal(body().children.length,0,'a non-owner sees triggers');
 // Phone: the config text scrolls in its box rather than widening the page.
 const css=[...doc.querySelectorAll('style')].map(n=>n.textContent).join('\n');assert(/\.trig-tpl pre\{[^}]*overflow-x:auto/.test(css)&&/\.trig-tpl>\*\{min-width:0\}/.test(css),'template text does not scroll in place');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_triggers: ok',process.env.DASH_UI_PHONE==='1'?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
