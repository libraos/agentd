// Team (#486): four tabs, Repositories, Members, Roles and Sessions on this host,
// showing what Team showed before minus Working now (moved to the Agents list);
// Repositories is a table (repository, checkout, routing, open tasks, working, a
// link to its tasks); an owner adds a checkout already on this host from the page
// (POST /api/repositories, the same as agentd repo add DIR --route), it appears in
// the list and in New task's repositories, and a refusal shows the server's
// reason; Clone from URL only says to clone in a terminal; anyone else gets the
// terminal command and no form. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_team.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const repo=(path,extra)=>({path,github:null,remote:null,project:path.split('/').pop(),open:0,running:0,last:null,checks:[],worker_worktrees:0,...extra});
let repos=[repo('/srv/alpha',{github:'acme/alpha',project:'acme/alpha',route:'on',open:3,running:1})];
const hof=(id,goal)=>({id,goal,project:'acme/alpha',state:'offered',from:'s-1',from_user:'alice',to:'any',updated_ago:'1m',age:'1m',mark:'not_started'});
let dash={user:'alice',role:'owner',now,handoff_list:[hof('hof-a','First task'),hof('hof-b','Second task')],done:[],sessions:[{id:'s-1',tool:'claude',status:'active',host_state:'idle',cwd:'/srv/alpha',user:'alice'}],left:[],unlinked:[],waiting:[],claims:[],messages:[],inbox:[],dispatch:true,checkouts:['/srv/alpha']};
const team={roles:[{name:'coder',description:'Writes code',tool:'codex'},{name:'tester',description:'Runs tests'}],members:[{name:'alice',role:'owner'},{name:'bob',role:'dev'}],problems:['agents/bad.md: no front matter '+evil],handoff_roles:{},default_tool:'claude'};
let answer=null;const posts=[],requests=[],errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=(body,status=200)=>({ok:status<400,status,json:async()=>body,text:async()=>JSON.stringify(body)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#team',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);requests.push((opts.method||'GET')+' '+u.pathname+u.search);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/team')return json(u.searchParams.has('activity')?{activity:{}}:u.searchParams.has('role')?{kind:'role',name:u.searchParams.get('role'),role:{name:'coder',path:'/srv/alpha/agents/coder.md',checkouts:[{dir:'/srv/alpha'}]},now:[],recent:[],recent_total:0}:team);
  if(u.pathname==='/api/repositories'){if(opts.method==='POST'){const b=JSON.parse(opts.body);posts.push(b);const a=answer(b);return json(a.body,a.status)}return json({repositories:repos})}
  if(u.pathname==='/api/issues')return json({issues:[]});
  if(u.pathname==='/api/taskdefaults')return json({cwd:u.searchParams.get('cwd'),accept:[]});
  if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:false});
  return json({})}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
const go=async h=>{w.location.hash=h;await settle()},tabs=()=>[...doc.querySelectorAll('#team-tabs a')],current=()=>doc.querySelector('#team-tabs a[aria-current="page"]');
const btn=(root,text)=>[...root.querySelectorAll('button')].find(b=>b.textContent===text);
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // Four tabs with their counts; #team is Repositories; Team has no second panel and no Working now.
 assert.deepEqual(tabs().map(a=>a.dataset.tab),['repositories','members','roles','host']);
 assert.deepEqual(tabs().map(a=>a.firstChild.textContent),['Repositories','Members','Roles','Sessions on this host']);
 assert.deepEqual(tabs().map(a=>(a.querySelector('.n')||{}).textContent||''),['1','2','2','']);
 assert.equal(current().dataset.tab,'repositories');assert(doc.body.classList.contains('no-panel'),'Team still has a second panel');
 assert(!tabs().some(a=>/Working now/.test(a.textContent)),'Working now is a tab');
 // Repositories: a row per checkout with its routing, open tasks, working and a link to its tasks.
 const view=()=>doc.querySelector('#team-view'),rowOf=p=>view().querySelector('.repo-row[data-repo="'+p+'"]');
 let r=rowOf('/srv/alpha');assert(r,'no row for /srv/alpha');
 assert.equal(r.querySelector('[data-route]').textContent,'On');assert.equal(r.querySelector('[data-open]').textContent,'2','open tasks are not counted as Tasks counts them');assert.equal(r.querySelector('[data-working]').textContent,'1');
 assert.equal(r.querySelector('a.repo-tasks').getAttribute('href'),'#issues?project=acme%2Falpha');assert.equal(r.querySelector('.repo-path').textContent,'/srv/alpha');
 assert.deepEqual([...view().querySelectorAll('.repo-colhead span')].map(n=>n.textContent),['Repository','Checkout','Routing','Open tasks','Working','']);
 // The other tabs: Members, Roles (with the role files that could not be read, as text), Sessions on this host.
 await go('#team/members');assert.equal(current().dataset.tab,'members');assert(view().querySelector('a[href="#team/member/bob"]'),'no member row');assert(view().textContent.includes('dev'));assert(doc.querySelector('#repo-add').hidden);
 await go('#team/roles');assert.equal(current().dataset.tab,'roles');assert(view().querySelector('a[href="#team/role/coder"]'),'no role row');
 const prob=view().querySelector('[data-problems]');assert(prob&&prob.textContent.includes('1 role files could not be read'),'the role problems are lost');assert(prob.textContent.includes(evil)&&!prob.querySelector('img'),'a problem became markup');
 await go('#team/host');assert.equal(current().dataset.tab,'host');assert(!doc.querySelector('#team-host').hidden,'no sessions on this host');assert(doc.querySelector('#agents [data-session-id="s-1"]'),'the session is not listed');
 await go('#team/role/coder');assert.equal(current().dataset.tab,'roles','a role page is not under Roles');
 await go('#team/working');assert(view().querySelector('[data-moved="working"]'),'#team/working does not say where it went');assert(!current(),'a tab is marked on #team/working');
 // An owner: Add a repository opens the form; Clone from URL says to clone in a terminal and posts nothing.
 await go('#team');const form=doc.querySelector('#repo-add');assert(form.hidden,'the form shows before it is asked for');
 btn(doc.querySelector('#team-head'),'Add a repository').click();await settle();assert(!form.hidden,'the form did not open');assert.equal(doc.activeElement&&doc.activeElement.id,'repo-add-dir');
 btn(form,'Clone from URL').click();await settle();assert(form.querySelector('[data-clone]').textContent.includes('Clone it in a terminal on this host first'));assert(!form.querySelector('#repo-add-dir'),'Clone from URL has a field');assert(form.textContent.includes('git clone URL DIR'));
 btn(form,'A checkout on this host').click();await settle();assert(form.querySelector('#repo-add-dir'),'no directory field');
 assert.deepEqual([...form.querySelectorAll('#repo-add-route option')].map(o=>o.textContent),['On','Off']);assert(form.textContent.includes('agentd repo add DIR --route on|off'));
 const submit=async()=>{form.dispatchEvent(new w.Event('submit',{cancelable:true}));await settle()};
 // A refusal shows the server's reason; the form keeps what was typed; nothing is added.
 answer=()=>({status:400,body:{ok:false,error:'/srv/plain is not a git checkout (git rev-parse --show-toplevel finds none); clone or git init it in a terminal first'}});
 form.querySelector('#repo-add-dir').value='/srv/plain';await submit();
 assert.deepEqual(posts[0],{action:'add',dir:'/srv/plain',route:'on'});const msg=form.querySelector('#repo-add-msg');assert(!msg.hidden&&msg.textContent.includes('is not a git checkout'),'no reason shown: '+msg.textContent);
 assert(!form.hidden&&form.querySelector('#repo-add-dir').value==='/srv/plain','the form lost what was typed');assert(!rowOf('/srv/plain'));
 // A refresh while the form is open keeps it and what is typed.
 form.querySelector('#repo-add-dir').value='/srv/beta';w.eval('refresh()');await settle();assert(!form.hidden&&form.querySelector('#repo-add-dir').value==='/srv/beta','a refresh wiped the form');
 // Added: the list and New task's repositories show it.
 answer=b=>{repos=[...repos,repo(b.dir,{route:b.route})];dash={...dash,checkouts:[...dash.checkouts,b.dir]};return {status:200,body:{path:b.dir,added:true,route:b.route}}};
 form.querySelector('#repo-add-route').value='off';const before=requests.filter(x=>x==='GET /api/dash').length;await submit();
 assert.deepEqual(posts[1],{action:'add',dir:'/srv/beta',route:'off'});assert(form.hidden,'the form stays open after the add');
 r=rowOf('/srv/beta');assert(r,'the added checkout is not listed');assert.equal(r.querySelector('[data-route]').textContent,'Off');assert.equal(tabs()[0].querySelector('.n').textContent,'2');
 assert(requests.filter(x=>x==='GET /api/dash').length>before,'the snapshot New task reads was not refreshed');
 w.eval('newHandoffSheet()');await settle();const cwd=[...doc.querySelectorAll('dialog.sheet select')].find(n=>n.id.endsWith('-cwd'));assert(cwd,'New task has no repository field');
 assert([...cwd.querySelectorAll('option')].some(o=>o.value==='/srv/beta'),'New task does not offer the added checkout');w.eval('activeSheet&&activeSheet.cancel()');await settle();assert(!doc.querySelector('dialog.sheet'),'the sheet did not close');
 // Anyone else: no Add a repository and no form, the terminal command instead.
 dash={...dash,user:'vera',role:'viewer'};w.eval('refresh()');await settle();await go('#team/repositories');
 assert(!btn(doc.querySelector('#team-head'),'Add a repository'),'a viewer is offered Add a repository');assert(doc.querySelector('#repo-add').hidden);assert(doc.querySelector('#team-head').textContent.includes('agentd repo add DIR'));
 w.eval('repoAddOpen(true)');await settle();assert(doc.querySelector('#repo-add').hidden,'a viewer opened the form');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_team: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');w.close()})().catch(e=>{console.error(e);process.exit(1)});
