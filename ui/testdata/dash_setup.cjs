// First-run wizard (#488): four steps shown to an owner when the install has no
// repository or no connected agent, and from Help: 1 agentd doctor, 2 connect
// agents (Preview and Connect), 3 add a repository and choose routing, 4 a first
// task with a 30-minute budget, ending on its workspace. Each step shows its
// terminal command and its real state; "Set up later" is remembered; a
// non-owner never gets it. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_setup.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>',html=fs.readFileSync(process.argv[2],'utf8');
const client=(tool,found,connected)=>({tool,found,connected});
const state=o=>({show:true,reason:'no_repository',later:null,steps:{host:{command:'agentd doctor'},agents:{done:false,clients:[client('claude',true,false),client('codex',true,false),client('opencode',false,false)],command:'agentd connect'},repository:{done:false,repositories:[],command:'agentd repo add DIR --route on'},task:{done:false,handoff:null,budget:'30m',dispatch:true,default_tool:'claude',command:'agentd run "GOAL" --budget 30m'}},...o});
const doctor={doctor:[{id:'ledger',status:'pass',detail:'ok'},{id:'claude-mcp',status:'fail',detail:'not registered',fix:'agentd connect claude'}],services:[],connect:[{tool:'claude',found:true}],checked_at:now};
// boot opens the dash at url as user/role; srv is the server's state, changed by the posts.
function boot(url,user,role,srv){const requests=[],posts=[],errors=[];
  const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
  const json=(body,status=200)=>({ok:status<400,status,json:async()=>body,text:async()=>JSON.stringify(body)});
  const dash={user,role,now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],waiting:[],claims:[],messages:[],inbox:[],dispatch:true,checkouts:[]};
  const dom=new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
    w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
    w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
    w.fetch=async(u0,opts={})=>{const u=new URL(u0,w.location.href),m=opts.method||'GET',b=opts.body?JSON.parse(opts.body):null;requests.push(m+' '+u.pathname+u.search);if(b)posts.push([u.pathname,b]);
      if(u.pathname==='/api/auth')return {ok:true,status:204};
      if(u.pathname==='/api/dash')return json(dash);
      if(u.pathname==='/api/setup'){if(role!=='owner')return json({ok:false,error:'Setting up this host requires a signed-in owner'},403);if(m==='POST'){srv.later=srv.later||now;srv.show=false}return json(state(srv.state()))}
      if(u.pathname==='/api/settings'){if(u.searchParams.get('diagnostics')==='1')return json(doctor);if(b&&b.action==='connect'){if(!b.dry_run)srv.connected=true;return json({tool:b.tool,dry_run:!!b.dry_run,ok:true,output:[b.dry_run?'would change .claude.json':'changed .claude.json (backup /h/.claude.json.bak)'],backups:b.dry_run?[]:['/h/.claude.json.bak']})}return json({owner:true,config:{}})}
      if(u.pathname==='/api/repositories'&&m==='POST'){if(b.dir==='/srv/plain')return json({ok:false,error:'/srv/plain is not a git checkout; clone or git init it in a terminal first'},400);srv.repos.push({path:b.dir,route:b.route});return json({path:b.dir,added:true,route:b.route})}
      if(u.pathname==='/api/action'&&m==='POST'){srv.task='hof-new';return json({ok:true,handoff:'hof-new',dispatch:{status:'started'}})}
      if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:false});
      if(u.pathname==='/api/issues')return json({issues:[]});
      return json({})}}});
  return {w:dom.window,doc:dom.window.document,requests,posts,errors,dom}}
// server is the install's state, read back by GET /api/setup as the real route does.
function server(o){const srv={later:null,show:undefined,connected:false,repos:[],task:null,dispatch:true,...o};
  srv.state=()=>{const conn=srv.connected,reason=!srv.repos.length?'no_repository':!conn?'no_agent':null;
    return {show:srv.show===false?false:!!reason&&!srv.later,reason,later:srv.later,steps:{host:{command:'agentd doctor'},
      agents:{done:conn,clients:[client('claude',true,conn),client('codex',true,false),client('opencode',false,false)],command:'agentd connect'},
      repository:{done:srv.repos.length>0,repositories:srv.repos,command:'agentd repo add DIR --route on'},
      task:{done:!!srv.task,handoff:srv.task,budget:'30m',dispatch:srv.dispatch,default_tool:'claude',command:'agentd run "GOAL" --budget 30m'}}}};return srv}
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<8;i++)await tick()};
const btn=(root,text)=>[...root.querySelectorAll('button')].find(b=>b.textContent===text);
(async()=>{
 // An owner landing on an install with no repository is taken to the wizard.
 let srv=server(),t=boot('http://127.0.0.1:21620/','alice','owner',srv),{w,doc}=t;await settle();assert(!t.errors.length,t.errors.join('\n'));
 assert.equal(w.location.hash,'#setup','the wizard did not open for an owner with no repository');
 const page=()=>doc.querySelector('#page-setup'),body=()=>doc.querySelector('#setup-body'),step=()=>body().querySelector('[data-setup-step]').dataset.setupStep;
 assert(!page().hidden,'the wizard page is hidden');
 // The four steps, numbered, each with its terminal command; it opens on step 1 when nothing is done.
 const steps=()=>[...body().querySelectorAll('#setup-steps button')];
 assert.deepEqual(steps().map(b=>b.dataset.step),['host','agents','repository','task']);assert.equal(step(),'host');
 assert.equal(body().querySelector('[data-setup-count]').textContent,'Step 1 of 4');
 {const d=body().ownerDocument;const isMark=(box,what)=>{assert(box,what+': no mark');const s=box.querySelector('svg.brand-mark');assert(s&&box.textContent.trim()==='',what+' still shows the old "a" mark');assert.equal(s.getAttribute('viewBox'),'17 14 170 170',what);assert(s.querySelector('path[stroke^="url(#"]')&&s.querySelector('rect[fill^="url(#"]'),what+': not the ring and stem');for(const ref of [...s.querySelectorAll('[stroke^="url(#"],[fill^="url(#"]')].map(n=>(n.getAttribute('stroke')||n.getAttribute('fill')).slice(5,-1)))assert.equal(d.querySelectorAll('[id="'+ref+'"]').length,1,what+': gradient '+ref+' is not one of a kind')};isMark(body().querySelector('.setup-head .rail-mark'),'the setup head')}
 const cmd=()=>body().querySelector('[data-setup-command] code').textContent;assert.equal(cmd(),'agentd doctor');
 // Step 1 reflects doctor: one required check fails, with its fix; not marked done.
 assert(t.requests.includes('GET /api/settings?diagnostics=1'),'doctor was not run');
 assert.equal(body().querySelector('[data-setup-state]').dataset.setupState,'fail');assert(body().textContent.includes('agentd connect claude'),'the fix is not shown');
 assert(!steps()[0].classList.contains('done'),'a failing doctor is marked done');
 // Step 2: Preview then Connect (the existing connect); the state is read again and Claude is connected.
 btn(body(),'Skip for now').click();await settle();assert.equal(step(),'agents');assert.equal(cmd(),'agentd connect claude');
 const card=tool=>body().querySelector('[data-setup-agent="'+tool+'"]');
 assert.equal(card('claude').querySelector('[data-setup-state]').textContent,'Installed');assert.equal(card('opencode').querySelector('[data-setup-state]').textContent,'Not installed');assert(!card('opencode').querySelector('button'),'Preview offered for a missing agent');
 card('claude').querySelector('[data-connect-preview]').click();await settle();
 assert.deepEqual(t.posts.at(-1),['/api/settings',{action:'connect',tool:'claude',dry_run:true}]);assert(!srv.connected,'Preview connected');
 const apply=body().querySelector('[data-connect-apply="claude"]');assert(apply,'no Connect after a clean preview');apply.click();await settle();
 assert.deepEqual(t.posts.at(-1),['/api/settings',{action:'connect',tool:'claude',dry_run:false}]);
 assert.equal(card('claude').querySelector('[data-setup-state]').textContent,'Connected','the card does not show the connect');assert(steps()[1].classList.contains('done'),'step 2 not marked done');
 // Step 3: a refusal shows the server's reason; an add lists the checkout with its routing, as text.
 btn(body(),'Continue').click();await settle();assert.equal(step(),'repository');assert.equal(cmd(),'agentd repo add DIR --route on|off');
 const repo=()=>body().querySelector('#setup-repo'),submit=async f=>{f.dispatchEvent(new w.Event('submit',{cancelable:true}));await settle()};
 assert.deepEqual([...repo().querySelectorAll('#setup-repo-route option')].map(o=>o.textContent),['On','Off']);
 repo().querySelector('#setup-repo-dir').value='/srv/plain';await submit(repo());
 assert.deepEqual(t.posts.at(-1),['/api/repositories',{action:'add',dir:'/srv/plain',route:'on'}]);assert(body().querySelector('#setup-repo-msg').textContent.includes('is not a git checkout'),'no reason shown');assert(!steps()[2].classList.contains('done'));
 const odd='/srv/'+evil;repo().querySelector('#setup-repo-dir').value=odd;repo().querySelector('#setup-repo-route').value='off';await submit(repo());
 assert.deepEqual(t.posts.at(-1),['/api/repositories',{action:'add',dir:odd,route:'off'}]);
 const listed=body().querySelector('[data-setup-repos]');assert(listed&&listed.textContent.includes(odd)&&listed.textContent.includes('routing off'),'the added checkout is not listed');assert(!listed.querySelector('img'),'a path became markup');
 assert(steps()[2].classList.contains('done'),'step 3 not marked done');
 // Step 4: a real task with a 30-minute budget, then its workspace.
 btn(body(),'Continue').click();await settle();assert.equal(step(),'task');assert.equal(cmd(),'agentd run "GOAL" --budget 30m');
 assert(body().querySelector('[data-setup-budget]').textContent.includes('30 minutes'));
 const task=()=>body().querySelector('#setup-task');assert.deepEqual([...task().querySelectorAll('#setup-task-tool option')].map(o=>o.value),['claude'],'only connected agents are offered');
 task().querySelector('#setup-task-goal').value='Fix the README typo';await submit(task());
 assert(body().querySelector('#setup-task-msg').textContent.includes('done means'),'a task with no criteria was sent');assert(!t.posts.some(p=>p[0]==='/api/action'));
 task().querySelector('#setup-task-accept').value='The typo is gone';await submit(task());
 const sent=t.posts.find(p=>p[0]==='/api/action');assert(sent,'no task started');const o=sent[1];
 assert.equal(o.action,'offer');assert.equal(o.budget,'30m');assert.equal(o.cwd,odd);assert.equal(o.worker,'claude');assert.equal(o.goal,'Fix the README typo');assert.equal(o.accept,'The typo is gone');assert(o.key,'no idempotency key');
 assert.equal(w.location.hash,'#issues/hof-new','it did not open the task’s workspace');
 // Back on it, every step reads done but doctor's, and the first task links to its workspace.
 w.location.hash='#setup';await settle();assert.deepEqual(steps().map(b=>b.classList.contains('done')),[false,true,true,true]);
 body().querySelector('#setup-steps [data-step="task"]').click();await settle();assert.equal(body().querySelector('[data-setup-first] a').getAttribute('href'),'#issues/hof-new');
 assert(!t.errors.length,t.errors.join('\n'));t.dom.window.close();

 // Set up later: remembered, so the next load does not open it; Help opens it.
 srv=server();t=boot('http://127.0.0.1:21620/#inbox','alice','owner',srv);({w,doc}=t);await settle();assert.equal(w.location.hash,'#setup');
 btn(body(),'Set up later').click();await settle();
 assert.deepEqual(t.posts.at(-1),['/api/setup',{action:'later'}]);assert.equal(w.location.hash,'#issues','Set up later did not leave');t.dom.window.close();
 t=boot('http://127.0.0.1:21620/','alice','owner',srv);({w,doc}=t);await settle();
 assert.notEqual(w.location.hash,'#setup','the wizard opened again after Set up later');assert(page().hidden);
 w.location.hash='#help';await settle();const link=doc.querySelector('#help-setup a[href="#setup"]');assert(link,'Help has no way to the wizard');
 w.location.hash='#setup';await settle();assert(!page().hidden,'Help’s link does not open it');assert.equal(step(),'host');t.dom.window.close();

 // Dispatch off: step 4 says so and gives the terminal command; nothing is sent.
 srv=server({connected:true,repos:[{path:'/srv/a',route:'on'}],dispatch:false});t=boot('http://127.0.0.1:21620/#setup','alice','owner',srv);({w,doc}=t);await settle();
 assert.equal(step(),'task','it does not open on the first step not done');assert(body().querySelector('[data-setup-off]').textContent.includes('agentd config set dash.dispatch true'));assert(!body().querySelector('#setup-task'));t.dom.window.close();

 // An install with a repository and an agent: the wizard does not open on its own.
 srv=server({connected:true,repos:[{path:'/srv/a',route:'on'}]});t=boot('http://127.0.0.1:21620/','alice','owner',srv);({w,doc}=t);await settle();assert.notEqual(w.location.hash,'#setup');t.dom.window.close();

 // A non-owner never gets it: no redirect, no request for it, and #setup says an owner sets up.
 for(const role of ['dev','viewer']){srv=server();t=boot('http://127.0.0.1:21620/','bob',role,srv);({w,doc}=t);await settle();
  assert.notEqual(w.location.hash,'#setup','the wizard opened for a '+role);assert(!t.requests.some(r=>r.includes('/api/setup')),'a '+role+' asked for the setup state');
  w.location.hash='#setup';await settle();assert(body().querySelector('[data-setup-owner]'),'no owner note for a '+role);assert(!body().querySelector('form,[data-connect-preview]'),'a '+role+' got a form');
  assert(!t.requests.some(r=>r.includes('/api/setup')||r.includes('diagnostics')),'a '+role+' read the setup state');assert(!t.errors.length,t.errors.join('\n'));t.dom.window.close()}
 console.log('dash_setup: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light')})().catch(e=>{console.error(e);process.exit(1)});
