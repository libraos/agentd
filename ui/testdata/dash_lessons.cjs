// Lessons in the Inbox (#1055 follow-up). Done when:
//  1. a proposed lesson shows its title, what happened, why, next time and its
//     count, and says when a model worded it;
//  2. Show, Edit, Approve and Reject send the server's lesson_* actions with
//     the lesson's id and never a person's name (the server records the one
//     signed in); Edit sends only the fields changed;
//  3. an approved lesson LibraOS Engine suggests retiring has Retire (reason required);
//  4. a viewer, a developer and the shared token get no write button, only the
//     terminal command; lesson text is text.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_lessons.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>',phone=process.env.DASH_UI_PHONE==='1';
const proposed={id:'lesson:lsn-a1',kind:'lesson',title:'Lesson proposed (seen 3 time(s)): Check stopped at its time limit (10m0s)',from:'agentd',age:'2h',mine:true,lesson:'lsn-a1',count:3,lesson_state:'proposed',lesson_version:1,
 lesson_text:{title:'Check stopped at its time limit (10m0s)',happened:'A dispatched task had its check stopped at the time limit. '+evil,why:'The check ran longer than its limit.',next:'Give a long check a limit of its own (--check-timeout).',reason:'check_timeout'}};
const drafted={...proposed,id:'lesson:lsn-b2',lesson:'lsn-b2',count:1,drafted_by:'model:gw-small',lesson_text:{title:'Ask, do not wait on a prompt',happened:'The worker waited on a prompt.',why:'Nobody sees it.',next:'Use handoff ask.',reason:'waiting_input'}};
const retire={id:'lesson-retire:lsn-c3',kind:'lesson',title:'Suggest retiring lesson lsn-c3',from:'agentd',age:'1d',mine:true,lesson:'lsn-c3',lesson_state:'approved',suggest_retire:{id:'lsn-c3',title:'Old advice',given:12,pct_delivered:40,holdout_pct_delivered:50,why:'given 12 times in 90d; 40.0% of those tasks delivered against 50.0% of the holdout\'s 8'}};
const errors=[],writes=[];
const load=async(user,role,token)=>{
 const dash={user,role,now,dispatch:true,checkouts:[],handoff_list:[],done:[],sessions:[],left:[],waiting:[],claims:[],messages:[],inbox:[proposed,drafted,retire]};
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
 const json=body=>({ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)});
 const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#inbox',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  if(token)w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
  w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
  w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{}]};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
  w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);
   if(u.pathname==='/api/auth')return token?{ok:true,status:204}:json({user,role});
   if(u.pathname==='/api/dash')return json(dash);
   if(u.pathname==='/api/action'){writes.push(JSON.parse(opts.body));return json({ok:true})}
   if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:true});
   if(u.pathname==='/api/team')return json({roles:[],members:[],handoff_roles:{}});
   return json({})}}});
 const w=dom.window,d=w.document;await settle(w);return {w,d}};
const tick=w=>new Promise(r=>w.setTimeout(r,25)),settle=async w=>{for(let i=0;i<4;i++)await tick(w)};
const button=(root,text)=>[...root.querySelectorAll('button')].find(b=>b.textContent===text);
const dialog=d=>d.querySelector('dialog');
const submit=async(w,d,values)=>{const dlg=dialog(d);assert(dlg,'no sheet');for(const [k,v] of Object.entries(values||{})){const f=[...dlg.querySelectorAll('input,textarea')].find(n=>n.id.endsWith('-'+k));assert(f,'no field '+k);f.value=v;f.dispatchEvent(new w.Event('input'))}
 dlg.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle(w)};
const open=async(w,id)=>{w.location.hash='#inbox?item='+encodeURIComponent(id);await settle(w);const p=w.document.getElementById('inbox-detail');assert.equal(p.dataset.id,id);return p};
(async()=>{
 // An owner signed in with their own name.
 let {w,d}=await load('alice','owner',false);
 assert(!errors.length,errors.join('\n'));
 const rows=[...d.getElementById('inbox-rows').querySelectorAll('.ib-row')].map(r=>r.dataset.id);
 for(const id of ['lesson:lsn-a1','lesson:lsn-b2','lesson-retire:lsn-c3'])assert(rows.includes(id),'Needs you lacks '+id+': '+rows);
 let p=await open(w,'lesson:lsn-a1');
 // 1. Its fields, its count, text as text.
 assert(/Check stopped at its time limit/.test(p.querySelector('h3').textContent));
 for(const want of ['What happened','Why','Next time','--check-timeout','3 times'])assert(p.textContent.includes(want),'detail lacks '+want);
 assert(!p.querySelector('img')&&p.textContent.includes('<img'),'lesson text became markup');
 assert(p.querySelector('.ib-tag').textContent==='Lesson');
 // 2. Show reads; no write.
 button(p,'Show').click();await settle(w);assert(dialog(d)&&dialog(d).textContent.includes('Give a long check'),'Show sheet');dialog(d).querySelector('button[type=button]').click();await settle(w);assert(!dialog(d));
 assert.equal(writes.length,0);
 // Edit: only the changed field, no name.
 p=await open(w,'lesson:lsn-a1');button(p,'Edit').click();await settle(w);
 await submit(w,d,{});assert(dialog(d)&&/Change at least one field/.test(dialog(d).textContent),'an unchanged edit was sent');
 await submit(w,d,{next:'Raise --check-timeout and go test -timeout together.'});
 assert.deepEqual(writes.pop(),{action:'lesson_edit',id:'lsn-a1',next:'Raise --check-timeout and go test -timeout together.'});
 // Approve with a note.
 p=await open(w,'lesson:lsn-a1');button(p,'Approve').click();await settle(w);await submit(w,d,{note:'good'});
 assert.deepEqual(writes.pop(),{action:'lesson_approve',id:'lsn-a1',note:'good'});
 // Reject needs a reason.
 p=await open(w,'lesson:lsn-a1');button(p,'Reject').click();await settle(w);await submit(w,d,{});assert(dialog(d),'reject without a reason');assert.equal(writes.length,0);
 await submit(w,d,{note:'too general'});assert.deepEqual(writes.pop(),{action:'lesson_reject',id:'lsn-a1',note:'too general'});
 // A model's wording is said.
 p=await open(w,'lesson:lsn-b2');assert(/Worded by/.test(p.textContent)&&/gw-small/.test(p.textContent),'drafted text not marked');
 button(p,'Approve').click();await settle(w);assert(/worded by a model/.test(dialog(d).textContent));dialog(d).querySelector('button[type=button]').click();await settle(w);
 // 3. Retire suggestion.
 p=await open(w,'lesson-retire:lsn-c3');assert.equal(p.querySelector('.ib-tag').textContent,'Suggest retire');assert(/40\.0%/.test(p.textContent));
 assert(!button(p,'Approve')&&!button(p,'Edit'),'a retire suggestion offers approve or edit');
 button(p,'Retire').click();await settle(w);await submit(w,d,{note:'no better than the holdout'});
 assert.deepEqual(writes.pop(),{action:'lesson_retire',id:'lsn-c3',note:'no better than the holdout'});
 for(const b of writes)assert(!('user' in b)&&!('by' in b),'a write named a person');
 assert(!errors.length,errors.join('\n'));
 w.close();
 // 4. A viewer, a developer, the shared token: no write buttons, the command instead.
 for(const [user,role,token,want] of [['vic','viewer',false,/Only an owner/],['dev','dev',false,/Only an owner/],['','',true,/not with the shared token/]]){
  ({w,d}=await load(user,role,token));
  p=await open(w,'lesson:lsn-a1');
  for(const t of ['Edit','Approve','Reject'])assert(!button(p,t),role+' sees '+t);
  assert(button(p,'Show'),'Show is for everyone');
  assert(want.test(p.textContent)&&/libraos-engine lesson approve lsn-a1/.test(p.textContent),'no terminal command for '+(role||'the token')+': '+p.textContent);
  p=await open(w,'lesson-retire:lsn-c3');assert(!button(p,'Retire'),role+' sees Retire');
  assert(!errors.length,errors.join('\n'));w.close()}
 console.log('dash_lessons: ok');process.exit(0)
})().catch(e=>{console.error(e);process.exit(1)});
