// Team > Permissions (libraos/agentd-core#907 step 2). Team opens on Users. Permissions lists
// the grants (GET /api/grants) and the approval policies (GET /api/policies). An owner or
// admin changes them: Grant, Revoke, Save policy and Remove POST /api/grants or /api/policies
// with the password asked again in that form, sent with the sign-in cookie and never the
// shared dash token; the field is emptied when the change is sent and the password is in no
// storage. A refusal shows the server's reason. A form being filled in survives the dash's
// refresh. Anyone else (403) reads "Only an owner or admin can read this" and gets no form.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_permissions.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>',SECRET='correct horse '+Math.random().toString(36).slice(2);
const html=fs.readFileSync(process.argv[2],'utf8');
const grants={grants:[{scope:'org:acme',principal:'bob',role:'developer',granted_by:'ann',created:now},{scope:'project:acme/app',principal:'cid '+evil,role:'lead',granted_by:null,created:now}],
 scopes:{orgs:['acme'],teams:['acme/web'],projects:[{name:'acme/app',org:'acme',team:'web'}]},roles:['admin','lead','developer','viewer','worker'],all:true};
const policies={policies:[{project:'acme/app',action:'merge',approver_role:'admin',approvers:2,self_approval:false,updated:now,updated_by:'ann'}],actions:['tool_permission','draft_pr','merge','budget_raise','default'],approver_roles:['admin','lead','developer','viewer'],projects:[{name:'acme/app',org:'acme',team:'web'}],all:true};
const members=[{name:'ann',role:'owner',sessions:1},{name:'bob',role:'dev',sessions:0}];
function boot(user,role,readStatus){const requests=[],posts=[],errors=[],logs=[];let answer=()=>({status:200,body:{ok:true,result:{}}});
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
 for(const k of ['log','info','warn','error','debug'])vc.on(k,(...a)=>logs.push(a.join(' ')));
 const json=(body,st=200)=>({ok:st<400,status:st,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)});
 const dash={user,role,now,team:true,handoff_list:[{id:'hof-r',goal:'Running one',state:'claimed',from_user:'bob',worker_running:true,dispatched:true,attempts:[{running:true}]}],done:[],sessions:[],left:[],unlinked:[],waiting:[],claims:[],messages:[],inbox:[],checkouts:[]};
 const dom=new JSDOM(html,{url:'http://127.0.0.1:21620/#team',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
  w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
  w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);requests.push((opts.method||'GET')+' '+u.pathname);
   if(u.pathname==='/api/auth')return {ok:true,status:204};
   if(u.pathname==='/api/dash')return json(dash);
   if((u.pathname==='/api/grants'||u.pathname==='/api/policies')&&opts.method==='POST'){const b=JSON.parse(opts.body);posts.push({path:u.pathname,body:b,headers:{...(opts.headers||{})},credentials:opts.credentials});const a=answer(u.pathname,b);return json(a.body,a.status)}
   if(u.pathname==='/api/grants')return readStatus===200?json(grants):json({error:'policies are read by an owner or an admin'},readStatus);
   if(u.pathname==='/api/policies')return readStatus===200?json(policies):json({error:'policies are read by an owner or an admin'},readStatus);
   if(u.pathname==='/api/team')return json({roles:[],members,problems:[],handoff_roles:{}});
   if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:false});
   return json({})}}});
 return {dom,w:dom.window,doc:dom.window.document,requests,posts,errors,logs,setAnswer:f=>{answer=f}}}
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
(async()=>{
 // An owner.
 {const t=boot('ann','owner',200),{w,doc}=t,view=()=>doc.querySelector('#team-view'),go=async h=>{w.location.hash=h;await settle()};await settle();assert(!t.errors.length,t.errors.join('\n'));
  // Team opens on Users: each user, their role, and a running task they asked for.
  assert.equal(doc.querySelector('#team-tabs a[aria-current="page"]').dataset.tab,'users','Team does not open on Users');
  assert(view().querySelector('a[href="#team/member/bob"]'),'no user row');assert(/1 running now/.test(view().querySelector('a[href="#team/member/bob"]').textContent),'a user\'s running task is not said');
  assert(view().querySelector('a[href="#settings/members"]'),'Users does not say where to invite, reset or disable');
  assert(!t.requests.some(r=>/\/api\/(grants|policies)$/.test(r)),'Users asked for grants before Permissions opened');
  // Permissions: the grants and the policies, as text.
  await go('#team/permissions');assert.equal(doc.querySelector('#team-tabs a[aria-current="page"]').dataset.tab,'permissions');
  assert.deepEqual([...view().querySelectorAll('[data-grant]')].map(r=>r.dataset.grant),['org:acme bob','project:acme/app cid '+evil]);
  const g0=[...view().querySelector('[data-grant="org:acme bob"]').querySelectorAll('td')].map(c=>c.textContent);assert.deepEqual(g0.slice(0,4),['org:acme','bob','developer','ann']);
  assert(!view().querySelector('img'),'a grant became markup');
  const p0=[...view().querySelector('[data-policy="acme/app merge"]').querySelectorAll('td')].map(c=>c.textContent);assert.deepEqual([p0[0],p0[2],p0[3],p0[4]],['acme/app','admin','2','not allowed']);assert.equal(p0[1],w.eval("word('merge')"));
  // The grant form: where (every org, team and project), user, role (not worker), and the password.
  const gf=()=>view().querySelector('[data-perm-form="grant"]');assert(gf(),'no grant form for an owner');
  assert.deepEqual([...gf().querySelector('select[name=scope]').options].map(o=>o.value),['org:acme','team:acme/web','project:acme/app']);
  assert.deepEqual([...gf().querySelector('select[name=role]').options].map(o=>o.value),['admin','lead','developer','viewer']);
  const pw=()=>gf().querySelector('input[type=password]');assert.equal(pw().getAttribute('autocomplete'),'current-password');
  // What is typed survives the dash's refresh.
  gf().querySelector('input[name=principal]').value='dee';gf().querySelector('select[name=role]').value='viewer';pw().value=SECRET;
  w.eval('refresh()');await settle();assert.equal(gf().querySelector('input[name=principal]').value,'dee','a refresh wiped the grant form');assert.equal(pw().value,SECRET);
  // No password: nothing is sent.
  pw().value='';gf().querySelector('button[type=submit]').click();await settle();assert.equal(t.posts.length,0,'a change went without a password');assert(/password/.test(gf().querySelector('[data-perm-error]').textContent));
  // Refused: the server's reason shows; the field is empty; nothing kept the password.
  t.setAnswer(()=>({status:401,body:{error:'password_refused',message:'enter your password again to change permissions'}}));
  pw().value=SECRET;gf().querySelector('button[type=submit]').click();await settle();
  assert.equal(t.posts.length,1);const p=t.posts[0];assert.equal(p.path,'/api/grants');assert.deepEqual(p.body,{op:'grant',scope:'org:acme',principal:'dee',role:'viewer',password:SECRET});
  assert(!Object.keys(p.headers).some(h=>/x-dash-token|authorization/i.test(h)),'a change sent the dash token: '+JSON.stringify(p.headers));assert.equal(p.credentials,'same-origin');
  const err=gf().querySelector('[data-perm-error]');assert(!err.hidden&&/enter your password again/.test(err.textContent)&&/password_refused/.test(err.textContent),'the refusal\'s reason is not shown: '+err.textContent);
  assert.equal(pw().value,'','the password stayed in its field');
  t.setAnswer(()=>({status:403,body:{error:'role',message:'a grant gives at most your own role'}}));pw().value=SECRET;gf().querySelector('button[type=submit]').click();await settle();
  assert(/at most your own role/.test(gf().querySelector('[data-perm-error]').textContent),'a role refusal is not shown');
  // Granted: the lists are read again.
  t.setAnswer(()=>({status:200,body:{ok:true,result:{}}}));const before=t.requests.filter(r=>r==='GET /api/grants').length;pw().value=SECRET;gf().querySelector('button[type=submit]').click();await settle();
  assert(t.requests.filter(r=>r==='GET /api/grants').length>before,'the grants were not read again after a change');
  // Revoke asks for the password in its own form, then sends the revoke.
  view().querySelector('[data-perm-revoke="org:acme bob"]').click();await settle();const cf=view().querySelector('[data-perm-form="confirm"]');assert(cf,'Revoke did not ask for the password');
  assert(/Revoke bob/.test(cf.textContent));assert(!view().querySelector('[data-perm-form="grant"]'),'the grant form shows beside a pending change');
  cf.querySelector('input[type=password]').value=SECRET;cf.querySelector('button[type=submit]').click();await settle();
  assert.deepEqual(t.posts.at(-1).body,{op:'revoke',scope:'org:acme',principal:'bob',password:SECRET});assert(!view().querySelector('[data-perm-form="confirm"]'),'the confirm stayed after the change');
  // Cancel drops a pending change without sending it.
  view().querySelector('[data-perm-remove="acme/app merge"]').click();await settle();const n=t.posts.length;
  [...view().querySelectorAll('[data-perm-form="confirm"] button')].find(b=>b.textContent==='Cancel').click();await settle();assert.equal(t.posts.length,n);assert(!view().querySelector('[data-perm-form="confirm"]'));
  // Remove a policy.
  view().querySelector('[data-perm-remove="acme/app merge"]').click();await settle();{const f=view().querySelector('[data-perm-form="confirm"]');f.querySelector('input[type=password]').value=SECRET;f.querySelector('button[type=submit]').click();await settle()}
  assert.equal(t.posts.at(-1).path,'/api/policies');assert.deepEqual(t.posts.at(-1).body,{op:'remove',project:'acme/app',action:'merge',password:SECRET});
  // Set a policy.
  {const f=view().querySelector('[data-perm-form="policy"]');assert(f,'no policy form');f.querySelector('select[name=action]').value='draft_pr';f.querySelector('select[name=approver_role]').value='lead';f.querySelector('input[name=approvers]').value='2';f.querySelector('input[name=self_approval]').checked=true;
   f.querySelector('input[type=password]').value=SECRET;f.querySelector('button[type=submit]').click();await settle()}
  assert.deepEqual(t.posts.at(-1).body,{op:'set',project:'acme/app',action:'draft_pr',approver_role:'lead',approvers:2,self_approval:true,password:SECRET});
  // The password is in no storage, no field and no log.
  for(const st of [w.localStorage,w.sessionStorage])for(let i=0;i<st.length;i++)assert(!String(st.getItem(st.key(i))).includes(SECRET),'the password is kept in storage');
  assert(![...doc.querySelectorAll('input')].some(i=>i.value.includes(SECRET)),'the password stayed in a field');assert(!t.logs.some(l=>l.includes(SECRET)),'the password was logged');
  assert(!doc.documentElement.outerHTML.includes(SECRET),'the password is in the page');
  // Nodes and devices and Activity are still Team's tabs.
  await go('#team/nodes');assert.equal(doc.querySelector('#team-tabs a[aria-current="page"]').dataset.tab,'nodes');await go('#team/who');assert.equal(doc.querySelector('#team-tabs a[aria-current="page"]').dataset.tab,'activity');
  assert(!t.errors.length,t.errors.join('\n'));t.w.close()}
 // Not an owner or admin: the server refuses the read; no form.
 for(const [user,role] of [['bob','dev'],['vera','viewer']]){const t=boot(user,role,403),{w,doc}=t,view=()=>doc.querySelector('#team-view');await settle();w.location.hash='#team/permissions';await settle();
  const d=view().querySelector('[data-perm-denied]');assert(d&&d.textContent.includes('Only an owner or admin can read this'),role+': '+view().textContent.slice(0,200));
  assert(!view().querySelector('form,input[type=password],[data-perm-revoke]'),role+' is offered a form');assert.equal(t.posts.length,0);assert(!t.errors.length,t.errors.join('\n'));t.w.close()}
 console.log('dash_permissions: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light')})().catch(e=>{console.error(e);process.exit(1)});
