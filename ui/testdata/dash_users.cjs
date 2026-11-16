// Users and password sign-in: Settings > Members and roles has a Users section for
// owners (create with a temporary password or an invitation, reset, disable, enable,
// each behind the confirmation sheet), the unlock sheet leads to a name and password
// sign-in (locked, https_required and wrong credentials named), and a session that
// must change its password gets a full-page form that replaces the app until the
// change succeeds, whether the snapshot says so or any call answers 403
// password_change_required. No password, temporary or typed, is left in the page,
// storage, the address, the console or a toast. Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_users.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const html=fs.readFileSync(process.argv[2],'utf8'),phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const TEMP=['Tmp-Create-9f3kQ2xLmN7p','Tmp-Reset-4hR8sW1zYc6v','Tmp-Enable-2bN5tJ7qXe3k','Tmp-Again-8mD2fG6hKp1r','Tmp-Third-5sV9wB3nLq7t','Tmp-Invite-7cW3pK9sQm2x'],TYPED=['Typed-Wrong-pw-77','Typed-Right-pw-88','Old-Password-0001','New-Password-0002','Invitee-Own-pw-03','agentd_sk_KeyOnly04'];
const secrets=[...TEMP,...TYPED];
const dashBase={user:'alice',role:'owner',now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{}};
const users=()=>[{name:'alice',role:'owner',state:'active',must_change:false,last_login:now,has_password:true,has_key:true},
 {name:'bob',role:'dev',state:'active',must_change:true,last_login:null,has_password:true,has_key:false},
 {name:'dave',role:'viewer',state:'disabled',must_change:false,last_login:'2026-11-01T10:00:00Z',has_password:true,has_key:false},
 {name:evil,role:'dev',state:'pending',must_change:true,last_login:null,has_password:false,has_key:false}];
const settingsBase=()=>({owner:true,config:{},models:{},members:[{name:'alice',role:'owner'},{name:'bob',role:'dev'}],invites:[],users:users(),personal:null,email:{},telegram:{},history:[],chat_roles:[]});

// One page: fixture answers in `api`, every request and console line kept.
function page(url,api,token='fixture'){
 const calls=[],logs=[],errors=[],vc=new VirtualConsole();
 vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
 for(const k of ['log','info','warn','error','debug'])vc.on(k,(...a)=>logs.push(a.map(String).join(' ')));
 const dom=new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  if(token)w.localStorage.setItem('dash-token',token);w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
  w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
  Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async()=>{}},configurable:true});
  w.fetch=async(u0,opts={})=>{const u=new URL(u0,w.location.href),body=opts.body?JSON.parse(opts.body):null;calls.push({path:u.pathname,method:opts.method||'GET',body,search:u.search});
   const [status,data]=api(u,opts.method||'GET',body)||[200,{}];
   const res={ok:status>=200&&status<300,status,json:async()=>JSON.parse(JSON.stringify(data)),text:async()=>JSON.stringify(data),clone(){return res}};return res}}});
 return {dom,w:dom.window,doc:dom.window.document,calls,logs,errors};
}
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<5;i++)await tick()};
const dialog=doc=>[...doc.querySelectorAll('dialog')].find(d=>d.open);
const field=(doc,name)=>dialog(doc).querySelector('input[id$="-'+name+'"],select[id$="-'+name+'"]');
const submit=async (w,doc)=>{dialog(doc).querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle()};
const btn=(root,text)=>[...root.querySelectorAll('button')].find(b=>b.textContent===text);
const setv=(w,input,v)=>{input.value=v;input.dispatchEvent(new w.Event('input'))};
// Nothing secret in the page, storage, the address, the console or the toast.
function clean(p,where,except=[]){
 const hay=[p.doc.documentElement.outerHTML,...[...p.doc.querySelectorAll('input,textarea')].map(n=>n.value),JSON.stringify({...p.w.localStorage}),JSON.stringify({...p.w.sessionStorage}),p.w.location.href,String(p.w.history.state),p.logs.join('\n'),p.doc.getElementById('toast').textContent].join('\n');
 for(const s of secrets)if(!except.includes(s))assert(!hay.includes(s),where+': '+s.slice(0,9)+'… left behind');
}

async function usersPanel(){
 let settings=settingsBase(),answer=null;
 const p=page('http://127.0.0.1:21620/#settings/members',(u,method,body)=>{
  if(u.pathname==='/api/auth')return [204,{}];
  if(u.pathname==='/api/dash')return [200,dashBase];
  if(u.pathname==='/api/settings'){if(method!=='POST')return [200,settings];const a=answer;answer=null;return a||[200,{changed:true}]}
  return [200,{}]});
 const {w,doc,calls}=p,posts=()=>calls.filter(c=>c.method==='POST'&&c.path==='/api/settings').map(c=>c.body);
 await settle();assert(!p.errors.length,p.errors.join('\n'));
 const sec=()=>doc.getElementById('set-users');
 assert(sec(),'no Users section under Members and roles');assert(doc.getElementById('set-members').contains(sec()),'Users is not in Members and roles');
 const rows=()=>[...sec().querySelectorAll('tbody tr')];
 const cells=rows().map(r=>[...r.children].map(td=>td.textContent));
 assert.deepEqual(cells.map(r=>r.slice(0,3)),[['alice','owner','Active'],['bob','dev','Active'],['dave','viewer','Disabled'],[evil,'dev','Pending']],'name, role, state');
 assert.equal(cells[1][3],'Never','last login of someone who never signed in');assert(cells[2][3].includes('2026-11-01'),cells[2][3]);
 assert.equal(cells[1][4],'Yes');assert.equal(cells[0][4],'No');
 assert(!sec().querySelector('img'),'a name became markup');
 // Per row: Reset password and Disable or Enable; nobody disables themselves here.
 assert(!btn(rows()[0],'Disable'),'an owner can disable themselves');
 assert(btn(rows()[1],'Reset password')&&btn(rows()[1],'Disable')&&!btn(rows()[1],'Enable'),'bob actions');
 assert(btn(rows()[2],'Enable')&&!btn(rows()[2],'Disable'),'dave actions');

 // Create user with a temporary password: shown once, cleared on Dismiss.
 btn(sec(),'Create user').click();await tick();
 assert(dialog(doc),'no Create user sheet');assert.equal(field(doc,'role').value,'dev','role default');
 assert.deepEqual([...field(doc,'role').options].map(o=>o.value),['dev','viewer','owner']);
 assert.equal(field(doc,'delivery').value,'password','default delivery');
 setv(w,field(doc,'name'),'carol');answer=[200,{user:'carol',role:'dev',temp_password:TEMP[0]}];
 await submit(w,doc);assert(!dialog(doc),'sheet left open');
 assert.deepEqual(posts().at(-1),{action:'user_create',name:'carol',role:'dev'},'user_create body (no empty email)');
 const box=doc.getElementById('set-invite-once');
 assert(!box.hidden&&box.querySelector('input').value===TEMP[0],'temporary password not shown');
 assert(box.textContent.includes('carol')&&/once/i.test(box.textContent),'the box does not say whose or that it is shown once');
 assert(box.querySelector('input').readOnly,'the copy box is editable');
 assert(btn(box,'Copy password'),'no copy button');btn(box,'Copy password').click();await tick();
 btn(box,'Dismiss').click();await tick();assert(box.hidden&&!box.children.length,'Dismiss left the box');
 clean(p,'after Dismiss');

 // With an email and owner role; leaving the page clears the box.
 btn(sec(),'Create user').click();await tick();
 setv(w,field(doc,'name'),'erin');setv(w,field(doc,'email'),'erin@example.invalid');field(doc,'role').value='owner';
 answer=[200,{user:'erin',role:'owner',temp_password:TEMP[3]}];await submit(w,doc);
 assert.deepEqual(posts().at(-1),{action:'user_create',name:'erin',role:'owner',email:'erin@example.invalid'});
 assert.equal(box.querySelector('input').value,TEMP[3]);
 w.location.hash='#board';await settle();clean(p,'after leaving Settings');
 w.location.hash='#settings/members';await settle();assert(box.hidden,'the box came back');

 // Send an invitation instead: the existing invite action, which needs an email.
 btn(sec(),'Create user').click();await tick();
 setv(w,field(doc,'name'),'fay');field(doc,'delivery').value='invite';const before=posts().length;
 await submit(w,doc);assert(dialog(doc),'an invitation without email was sent');assert.equal(posts().length,before);
 assert(/email/i.test(dialog(doc).textContent),'no email error');
 setv(w,field(doc,'email'),'fay@example.invalid');answer=[200,{user:'fay',link:'https://h.test/login?invite=abc',temp_password:TEMP[5]}];await submit(w,doc);
 assert.deepEqual(posts().at(-1),{action:'invite',name:'fay',email:'fay@example.invalid',role:'dev'});
 // A new person's invitation comes with a one-time password, shown once beside the link.
 const inputs=()=>[...box.querySelectorAll('input')].map(i=>i.value);
 assert(inputs().includes('https://h.test/login?invite=abc'),'invite link not shown');
 assert(inputs().includes(TEMP[5]),'the invitation\'s one-time password not shown');assert(/once/i.test(box.textContent)&&box.textContent.includes('fay'),'the box does not say whose or that it is shown once');
 btn(box,'Dismiss').click();await tick();assert(box.hidden&&!box.children.length,'Dismiss left the box');clean(p,'after the invitation');
 // Emailed (no link on the page): the one-time password is still shown once, never sent.
 btn(sec(),'Create user').click();await tick();setv(w,field(doc,'name'),'gil');field(doc,'delivery').value='invite';setv(w,field(doc,'email'),'gil@example.invalid');
 answer=[200,{user:'gil',sent:true,temp_password:TEMP[5]}];await submit(w,doc);
 assert(inputs().includes(TEMP[5])&&/emailed/i.test(box.textContent),'emailed invitation: '+box.textContent);btn(box,'Dismiss').click();await tick();clean(p,'after the emailed invitation');

 // Reset: the sheet names the effect; Cancel sends nothing.
 btn(rows()[1],'Reset password').click();await tick();
 assert(/signs bob out of the dash and AgentD Desktop/i.test(dialog(doc).textContent)&&!/out everywhere/i.test(dialog(doc).textContent)&&/Disable, then Enable/.test(dialog(doc).textContent),'reset sheet does not name the effect: '+dialog(doc).textContent);
 const n=posts().length;btn(dialog(doc),'Cancel').click();await tick();assert.equal(posts().length,n,'Cancel sent a reset');
 btn(rows()[1],'Reset password').click();await tick();answer=[200,{user:'bob',temp_password:TEMP[1]}];await submit(w,doc);
 assert.deepEqual(posts().at(-1),{action:'user_reset_password',name:'bob'});assert.equal(box.querySelector('input').value,TEMP[1]);
 assert(box.textContent.includes('bob'));
 // An identity change clears it.
 w.eval("USER='other';settingsAccess()");await settle();assert(box.hidden&&!box.children.length,'identity change left the password');clean(p,'after identity change');
 w.eval("USER='alice';settingsAccess()");await settle();

 // Disable and Enable, each behind the sheet; Enable shows the new password.
 btn(rows()[1],'Disable').click();await tick();
 assert(/signs bob out everywhere/i.test(dialog(doc).textContent),'disable sheet does not name the effect');
 await submit(w,doc);assert.deepEqual(posts().at(-1),{action:'user_disable',name:'bob'});
 btn(rows()[2],'Enable').click();await tick();assert(/dave/.test(dialog(doc).textContent));
 answer=[200,{user:'dave',state:'active',temp_password:TEMP[2]}];await submit(w,doc);
 assert.deepEqual(posts().at(-1),{action:'user_enable',name:'dave'});assert.equal(box.querySelector('input').value,TEMP[2]);
 btn(box,'Dismiss').click();await tick();
 // A refused action keeps the sheet open with the server's reason and shows no password.
 btn(rows()[1],'Reset password').click();await tick();answer=[403,{error:'owner only'}];await submit(w,doc);
 assert(dialog(doc)&&dialog(doc).textContent.includes('owner only'),'refusal not shown');btn(dialog(doc),'Cancel').click();await tick();
 assert(box.hidden,'a refused reset showed the box');
 clean(p,'owner panel');

 // Someone who is not an owner sees no Users section.
 settings={...settingsBase(),owner:false,users:[users()[1]]};w.eval("TOKEN='';COOKIE=true;USER='bob';ROLE='dev';settingsAccess()");await settle();
 assert(!sec(),'a non-owner sees the Users section');
 // The existing members table and invitations stay.
 settings=settingsBase();w.eval("USER='alice';ROLE='owner';settingsAccess()");await settle();
 assert(doc.getElementById('set-members').textContent.includes('Invite member'),'Invite member gone');
 assert(!p.errors.length,p.errors.join('\n'));
}

async function passwordSignIn(){
 let answer=null,signedIn=false;
 const p=page('http://127.0.0.1:21620/?unlock',(u,method,body)=>{
  if(u.pathname==='/api/auth'){if(method==='POST'){const a=answer;answer=null;if(a&&a[0]<300)signedIn=true;return a}return [signedIn?204:401,{}]}
  if(u.pathname==='/api/dash')return signedIn?[200,{...dashBase,user:'bob',role:'dev'}]:[401,{error:'unauthorized'}];
  return [200,{}]},'');
 const {w,doc,calls}=p;await settle();assert(!p.errors.length,p.errors.join('\n'));
 // The unlock sheet keeps its token field and offers a password sign-in beside it.
 assert(dialog(doc)&&field(doc,'token'),'the unlock sheet changed');
 btn(dialog(doc),'Sign in with a password').click();await tick();
 assert(field(doc,'name')&&field(doc,'password'),'no name and password fields');assert.equal(field(doc,'password').type,'password');
 const auths=()=>calls.filter(c=>c.path==='/api/auth'&&c.method==='POST');
 const attempt=async(pw,a)=>{setv(w,field(doc,'name'),'bob');setv(w,field(doc,'password'),pw);answer=a;await submit(w,doc)};
 // Wrong credentials and an unknown user read the same.
 await attempt(TYPED[0],[401,{error:'unauthorized'}]);
 assert.deepEqual(auths().at(-1).body,{name:'bob',password:TYPED[0]});
 const wrong=dialog(doc).querySelector('.sheet-error').textContent;assert(/name or password/i.test(wrong),wrong);
 assert.equal(field(doc,'password').value,'','the password stayed in the field');
 await attempt(TYPED[0],[403,{error:'forbidden'}]);assert.equal(dialog(doc).querySelector('.sheet-error').textContent,wrong,'a 403 reads differently');
 await attempt(TYPED[0],[429,{error:'locked'}]);assert(/locked/i.test(dialog(doc).querySelector('.sheet-error').textContent)&&/15 minutes/.test(dialog(doc).querySelector('.sheet-error').textContent),'locked not named');
 await attempt(TYPED[0],[403,{error:'https_required'}]);assert(/HTTPS/.test(dialog(doc).querySelector('.sheet-error').textContent),'https_required not named');
 clean(p,'failed sign-ins');
 // A password with spaces at its ends is sent as typed.
 await attempt(' '+TYPED[1]+' ',[200,{user:'bob',role:'dev'}]);
 assert.equal(auths().at(-1).body.password,' '+TYPED[1]+' ','the password was trimmed');
 assert(!dialog(doc),'sheet left open after sign-in');await settle();
 assert.equal(doc.getElementById('userstate').textContent,'bob · dev','not signed in');
 assert(doc.getElementById('pwchange').hidden,'change form shown without must_change');
 clean(p,'after sign-in');
 assert(!p.errors.length,p.errors.join('\n'));
}

async function mustChange(){
 let required=true,answer=null;
 const p=page('http://127.0.0.1:21620/#board',(u,method,body)=>{
  if(u.pathname==='/api/auth')return [204,{}];
  if(u.pathname==='/api/logout')return [204,{}];
  if(u.pathname==='/api/settings'&&method==='POST'&&body.action==='password_change'){const a=answer;answer=null;if(a)return a;required=false;return [200,{ok:true}]}
  if(required&&!(u.pathname==='/api/settings'&&method==='GET'))return [403,{error:'password_change_required'}];
  if(u.pathname==='/api/dash')return [200,dashBase];
  return [200,{}]},'');
 const {w,doc,calls}=p;await settle();assert(!p.errors.length,p.errors.join('\n'));
 const form=doc.getElementById('pwchange'),err=()=>doc.getElementById('pwchange-error');
 assert(!form.hidden,'403 password_change_required did not show the change form');
 assert(doc.querySelector('.shell').hasAttribute('inert'),'the app is still usable behind the form');
 assert(doc.getElementById('dasherror').hidden,'shown as not connected: '+doc.getElementById('dasherror').textContent);
 const cur=doc.getElementById('pwchange-current'),nw=doc.getElementById('pwchange-new'),conf=doc.getElementById('pwchange-confirm');
 for(const n of [cur,nw,conf])assert.equal(n.type,'password');
 const posts=()=>calls.filter(c=>c.method==='POST'&&c.path==='/api/settings');
 const go=async(c,n,f)=>{cur.value=c;nw.value=n;conf.value=f;form.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle()};
 await go(TYPED[2],'short-pw',  'short-pw');assert(/12/.test(err().textContent),'short password allowed: '+err().textContent);
 await go(TYPED[2],TYPED[2],TYPED[2]);assert(/differ/i.test(err().textContent),'same password allowed: '+err().textContent);
 await go(TYPED[2],TYPED[3],TYPED[3]+'x');assert(/match/i.test(err().textContent),'mismatch allowed: '+err().textContent);
 assert.equal(posts().length,0,'an invalid change was sent');
 answer=[403,{error:'wrong current password'}];await go(TYPED[2],TYPED[3],TYPED[3]);
 assert(!form.hidden&&err().textContent.includes('wrong current password'),'server refusal not shown');
 assert.equal(cur.value,'','current password kept after a refusal');
 await go(TYPED[2],TYPED[3],TYPED[3]);
 assert.deepEqual(posts().at(-1).body,{action:'password_change',current:TYPED[2],new:TYPED[3]});
 assert(form.hidden,'form still shown after the change');assert(!doc.querySelector('.shell').hasAttribute('inert'),'the app stayed inert');
 for(const n of [cur,nw,conf])assert.equal(n.value,'','a password stayed in the form');
 await settle();assert.equal(doc.getElementById('userstate').textContent,'alice · owner','the app did not load after the change');
 clean(p,'after the change');
 // Any later call answering 403 password_change_required brings it back.
 required=true;await w.eval("fetch('/api/handoff/x',{headers:auth()})");await settle();assert(!form.hidden,'a later 403 did not show the form');
 // So does a snapshot that says must_change_password.
 required=false;w.eval("pwChangeHide()");await settle();
 const p2=page('http://127.0.0.1:21620/#board',u=>u.pathname==='/api/dash'?[200,{...dashBase,must_change_password:true}]:[204,{}],'');
 await settle();assert(!p2.doc.getElementById('pwchange').hidden,'must_change_password in the snapshot did not show the form');
 // Sign out is offered and ends the session.
 btn(p2.doc.getElementById('pwchange'),'Sign out').click();await settle();
 assert(p2.calls.some(c=>c.path==='/api/logout'&&c.method==='POST'),'Sign out did not call /api/logout');
 assert(!p.errors.length,p.errors.join('\n'));
}

// The invitee's side: open the link (signed in, held), give the one-time password,
// choose their own, and the dash works. An invitation from before that rule has no
// password: the form does not ask for one, and the change goes through without it.
// A key-only person is asked for their sign-in key instead.
async function inviteFlow(){
 for(const acct of [{has_password:true,has_key:false},{has_password:false,has_key:false},{has_password:false,has_key:true}]){
  let required=true;
  const p=page('http://127.0.0.1:21620/#board',(u,method,body)=>{
   if(u.pathname==='/api/auth')return [204,{}];
   if(u.pathname==='/api/settings'&&method==='POST'&&body.action==='password_change'){
    const want=acct.has_password?TEMP[5]:acct.has_key?TYPED[5]:'';if(body.current!==want)return [400,{error:'the current password is not right'}];required=false;return [200,{ok:true}]}
   if(u.pathname==='/api/settings'&&method==='GET')return [200,{...settingsBase(),owner:false,users:[],account:{...acct,must_change:true}}];
   if(required)return [403,{error:'password_change_required',...acct}];
   if(u.pathname==='/api/dash')return [200,{...dashBase,user:'fay',role:'dev'}];
   return [200,{}]},'');
  const {w,doc,calls}=p;await settle();assert(!p.errors.length,p.errors.join('\n'));
  const form=doc.getElementById('pwchange'),label=doc.getElementById('pwchange-current-label'),text=doc.getElementById('pwchange-text').textContent;
  assert(!form.hidden,'the invitee is not shown the change form');
  const cur=doc.getElementById('pwchange-current'),nw=doc.getElementById('pwchange-new'),conf=doc.getElementById('pwchange-confirm');
  if(acct.has_password){assert(!label.hidden&&/current password/i.test(label.textContent),'the one-time password is not asked for');assert(/set by an owner/i.test(text),text)}
  else if(acct.has_key){assert(!label.hidden&&/sign-in key/i.test(label.textContent),'a key-only person is not asked for their key: '+label.textContent);assert(!/set by an owner/i.test(text),'wrong text for a key-only person: '+text)}
  else{assert(label.hidden,'asked for a current password someone never had');assert(!/set by an owner/i.test(text),'wrong text for an invitation: '+text)}
  if(!label.hidden)cur.value=acct.has_password?TEMP[5]:TYPED[5];nw.value=TYPED[4];conf.value=TYPED[4];
  form.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
  assert.equal(doc.getElementById('pwchange-error').textContent,'','refused: '+doc.getElementById('pwchange-error').textContent);
  const post=calls.filter(c=>c.method==='POST'&&c.path==='/api/settings').at(-1);
  assert(post&&post.body.new===TYPED[4],'no change sent');
  assert(form.hidden,'form still shown after the change');await settle();
  assert.equal(doc.getElementById('userstate').textContent,'fay · dev','the dash did not load after the change');
  clean(p,'after the invitee set a password');assert(!p.errors.length,p.errors.join('\n'));
 }
}

(async()=>{
 await usersPanel();await passwordSignIn();await mustChange();await inviteFlow();
 console.log('dash_users: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
