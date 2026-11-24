// Start anyway after the GitHub issue preflight refuses a start (libraos/core#882): the New
// task page and a task's Dispatch show the refusal with each sign's link and Start anyway, which posts
// the dispatch action again with anyway true; a task parked for it shows the same box in its view; a
// viewer sees the refusal but no Start anyway. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_issueanyway.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const html=fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const base={from:'s-alice',from_user:'alice',to:'any',updated_ago:'1m',age:'1m',project:'acme/repo',state:'offered'};
const free={...base,id:'hof-free',goal:'Free to dispatch',may_dispatch:true};
const parked={...base,id:'hof-park',goal:'Parked on a taken issue',may_dispatch:true,worker_cwd:'/plain',mark:'attention',
 issue_refusal:{reason:'acme/repo#3 looks taken by someone else:; assigned to bob: https://github.com/acme/repo/issues/3; open PR #9 "x '+evil+'" by bob: https://github.com/acme/repo/pull/9; ask them first',links:['https://github.com/acme/repo/issues/3','https://github.com/acme/repo/pull/9'],may_anyway:true}};
let dash={user:'alice',role:'owner',now,dispatch:true,dispatch_budget:'30m',checkouts:['/plain'],handoff_list:[free,parked],sessions:[],left:[],done:[],claims:[],messages:[],waiting:[],inbox:[]};
const refusal=hid=>({ok:false,error:'handoff '+hid+' was not started: acme/repo#3 looks taken by someone else',handoff:hid,may_anyway:true,anyway:{action:'dispatch',id:hid,anyway:true},
 issue_taken:[{issue:'acme/repo#3',taken:[{kind:'assignee',who:'bob',url:'https://github.com/acme/repo/issues/3'},{kind:'pr',who:'carol '+evil,name:'#9 "wip"',url:'https://github.com/acme/repo/pull/9'}]}]});
const errors=[],posts=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=(body,status=200)=>({ok:status<300,status,json:async()=>body,text:async()=>JSON.stringify(body)});
const open=url=>new JSDOM(html,{url:'http://127.0.0.1:21620/'+url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{}]};
 w.crypto.getRandomValues=a=>{for(let i=0;i<a.length;i++)a[i]=i;return a};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/taskdefaults')return json({cwd:u.searchParams.get('cwd'),accept:[],workspace:'worktree',branch_from:'main'});
  if(u.pathname==='/api/estimate')return json({line:''});
  if(u.pathname==='/api/issues')return json({issues:[]});
  if(u.pathname==='/api/templates')return json({templates:[],can_save:true});
  if(u.pathname==='/api/team')return json({roles:[],members:[],default_tool:'claude',handoff_roles:{}});
  if(u.pathname==='/api/action'){const b=JSON.parse(opts.body);posts.push(b);
   if(b.action==='offer')return json(refusal('hof-new'),400);
   if(b.action==='dispatch'&&!b.anyway)return json(refusal(b.id),400);
   if(b.action==='retry'&&!b.anyway)return json(refusal(b.id),400);
   return json({ok:true,handoff:b.id})}
  if(u.pathname==='/api/issue'){const ref=u.searchParams.get('ref'),h=dash.handoff_list.find(x=>x.id===ref);return json({kind:'handoff',ref,title:h.goal,body:{goal:h.goal},tree:[{...h,focus:true,log:[]}],prs:[]})}
  if(u.pathname==='/api/log')return json({lines:[],running:false});
  if(u.pathname==='/api/files')return json({files:[],changed:0});
  if(u.pathname==='/api/checks')return json({check:'',runs:[]});
  if(u.pathname==='/api/taskmsg')return json({may:false});
  return json({})}}});
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
(async()=>{
 let dom=open('#issues'),w=dom.window,doc=w.document;await settle();assert(!errors.length,errors.join('\n'));
 const anyway=root=>[...root.querySelectorAll('[data-act="start-anyway"]')];
 const links=root=>[...root.querySelectorAll('[data-issue-refusal] a')].map(a=>a.getAttribute('href'));
 // New task: Start is refused; the page keeps the refusal with its links and Start anyway.
 w.eval('newHandoffSheet()');await settle();
 const form=doc.getElementById('nt-form'),field=n=>[...form.querySelectorAll('.sheet-field input,.sheet-field select,.sheet-field textarea')].find(x=>x.id.endsWith('-'+n));
 const set=(n,v)=>{const x=field(n);x.value=v;x.dispatchEvent(new w.Event('input',{bubbles:true}));x.dispatchEvent(new w.Event('change',{bubbles:true}))};
 set('goal','Fix the mode');set('accept','it works');set('issue','acme/repo#3');
 form.dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
 assert.equal(posts.pop().action,'offer');
 const err=form.querySelector('.sheet-error');assert(!err.hidden&&err.querySelector('[data-issue-refusal]'),'the New task page does not show the refusal');
 assert(err.textContent.includes('hof-new is saved but not started'),'the page does not say the task was saved');
 assert.deepEqual(links(err),['https://github.com/acme/repo/issues/3','https://github.com/acme/repo/pull/9']);
 assert(!err.querySelector('img'),'a login became markup');
 assert.equal(anyway(err).length,1,'no Start anyway');
 anyway(err)[0].click();await settle();
 assert.deepEqual(posts.pop(),{action:'dispatch',id:'hof-new',anyway:true,cwd:'/plain'});
 assert.equal(w.location.hash,'#issues/hof-new','Start anyway did not open the task');
 // Dispatch: the sheet keeps the refusal, and Start anyway posts it again with anyway and closes it.
 w.location.hash='#issues';await settle();
 w.eval('dispatchHandoff(lastDash.handoff_list.find(h=>h.id==="hof-free"))');await settle();
 const dialog=()=>doc.querySelector('dialog.sheet');assert(dialog(),'Dispatch opened no sheet');
 [...dialog().querySelectorAll('.sheet-foot button')].find(b=>b.textContent==='Dispatch').click();await settle();
 assert.equal(posts.pop().anyway,undefined,'the first Dispatch already said anyway');
 const se=dialog().querySelector('.sheet-error');assert(!se.hidden&&se.querySelector('[data-issue-refusal]'),'the Dispatch sheet does not show the refusal');
 assert(links(se).includes('https://github.com/acme/repo/pull/9'));
 anyway(se)[0].click();await settle();
 const p=posts.pop();assert.equal(p.action,'dispatch');assert.equal(p.id,'hof-free');assert.equal(p.anyway,true);
 assert(!dialog(),'the sheet stayed open after Start anyway');
 // Start again on a failed worker: the same refusal in its sheet, and Start anyway posts retry with anyway.
 w.eval('window.rt={id:"hof-retry",goal:"Retry me",dispatched:true,retry:{cwd:"/plain",tool:"claude",may:true}};retryHandoff(window.rt)');await settle();
 [...dialog().querySelectorAll('.sheet-foot button')].find(b=>b.textContent==='Confirm and start').click();await settle();
 assert.equal(posts.pop().action,'retry');
 const re=dialog().querySelector('.sheet-error');assert(!re.hidden&&re.querySelector('[data-issue-refusal]'),'Start again does not show the refusal');
 assert(links(re).includes('https://github.com/acme/repo/pull/9'));
 anyway(re)[0].click();await settle();
 const rp=posts.pop();assert.equal(rp.action,'retry');assert.equal(rp.id,'hof-retry');assert.equal(rp.anyway,true);assert.equal(rp.cwd,'/plain');
 assert(!dialog(),'the sheet stayed open after Start anyway');
 // A Chat card for a confirmed task whose start was refused: the box with Start anyway.
 const card=w.eval('window.cc=chatWorkerCard({id:"hof-chat",goal:"Chat task",state:"offered",worker:"claude",worker_cwd:"/plain",issue_refusal:{reason:"acme/repo#3 looks taken",links:["https://github.com/acme/repo/pull/9"],may_anyway:true}})');
 doc.body.append(card);assert(card.querySelector('[data-issue-refusal]'),'the Chat card shows no refusal');
 assert(!card.querySelector('button.chat-card'),'a button nests the refusal box');
 assert.equal(anyway(card).length,1);anyway(card)[0].click();await settle();
 assert.deepEqual(posts.pop(),{action:'dispatch',id:'hof-chat',anyway:true,cwd:'/plain'});card.remove();
 // A parked task's view: the box in place of Dispatch.
 w.location.hash='#issues/hof-park';await settle();
 const det=doc.getElementById('issue-detail')||doc;
 assert(det.querySelector('[data-issue-refusal]'),'the parked task shows no refusal');
 assert(links(det).includes('https://github.com/acme/repo/issues/3'));assert(!det.querySelector('[data-issue-refusal] img'),'the reason became markup');
 assert(anyway(det).length>=1,'the sender sees no Start anyway');
 anyway(det)[0].click();await settle();assert.deepEqual(posts.pop(),{action:'dispatch',id:'hof-park',anyway:true,cwd:'/plain'});
 assert(!errors.length,errors.join('\n'));w.close();
 // A viewer: the refusal, no Start anyway.
 dash={...dash,user:'vic',role:'viewer',handoff_list:[{...parked,may_dispatch:false,why_not:'viewer users have read-only dashboard access',issue_refusal:{...parked.issue_refusal,may_anyway:false}}]};
 dom=open('#issues/hof-park');w=dom.window;doc=w.document;await settle();
 const vdet=doc.getElementById('issue-detail')||doc;
 assert(vdet.querySelector('[data-issue-refusal]'),'the viewer does not see the refusal');
 assert.equal(anyway(doc).length,0,'the viewer is offered Start anyway');
 assert(vdet.querySelector('[data-issue-refusal]').textContent.includes('Only a person who may start this task'),'the viewer is not told who may');
 assert(!errors.length,errors.join('\n'));
 {const vc2=w.eval('window.vc=chatWorkerCard({id:"hof-chat",goal:"Chat task",state:"offered",worker:"claude",worker_cwd:"/plain",issue_refusal:{reason:"acme/repo#3 looks taken",links:["https://github.com/acme/repo/pull/9"],may_anyway:true}})');
  doc.body.append(vc2);assert(vc2.querySelector('[data-issue-refusal]'),'the viewer sees no refusal on the Chat card');assert.equal(anyway(vc2).length,0,'the viewer is offered Start anyway on the Chat card')}
 w.close();console.log('dash_issueanyway: ok');
})().catch(e=>{console.error(e);console.error('DOM errors:',errors);process.exit(1)});
