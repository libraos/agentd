// The task page on a team server, for a task like hof-taskpage01 (its codex worker stopped at its 30m budget,
// its check timed out, verdict act, a linked PR): (1) under All tasks it shows the task, its title, status and
// text, for a server task and for one mirrored from a device (one column, not the crumb alone on the left);
// (2) the message box is in the main column under the history, never in the right column; (3) a task that
// reads Needs you always shows what the person can do: the buttons the server offers (Start again, Take over,
// Cancel task) and, for what has no button (Raise budget, or every step on a mirrored task), the exact command
// with Copy, and the linked PR; for waiting_answer, blocked, parked and approval states the matching step;
// never Needs you with nothing; (4) the top-right Account control shows the signed-in person's name, or Shared
// token, with Account kept as its accessible name and title. Owner and dev. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_taskpage.cjs dash.html
'use strict';
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const html=fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8');
const ID='hof-taskpage01',PR='acme/app#1040',GOAL='Fix CI on PR acme/app#1040 (branch fix/agentd-70, this worktree, already pushed): TestOnboardEndToEnd fails '+evil;
const ACCEPT='The whole internal/agentd package passes, not only the named test\nCloud Workers not set up stays optional and never fails doctor or onboarding';
const attempt={tool:'codex',model:'gpt-6.2-sol',started:'2026-11-23T19:12:51+00:00',end_reason:'budget_stopped',check:'timed out after 10m0s (limit 10m0s)',minutes:31,usd:1.87,running:false};
const cli=(rest)=>'agentd handoff '+rest;
// The snapshot's row for it, as /api/dash sends an offered handoff whose worker the budget sweep stopped.
const row=(o={})=>({id:ID,state:'offered',from:'claude-sessn00001',from_user:'alice',to:'any',claimer:null,goal:GOAL,updated_ago:'11h',project:'acme/app',worker:'codex',worker_tool:'codex',
 worker_state:null,dispatched:true,attempts:[attempt],prs:[PR],mark:'needs_you',attention_status:'needs',check:'go test ./internal/agentd -count=1 -timeout 40m && go vet ./internal/agentd',
 retry:{cwd:'/srv/core',tool:'codex',budget:'30m',may:true},takeover:{may:true,cli:cli('claim '+ID+' --takeover')},cancel:{may:true,cli:cli('done '+ID+' --cancel --reason TEXT')},...o});
const log=[{state:'offered',actor:'claude-sessn00001',note:'to any, worker codex, budget 30m',ago:'11h'},{state:'claimed',actor:'codex-workr00001',note:'report: Committed the test-only fix at a46cfb57.',ago:'11h'},
 {state:'claimed',actor:'codex-workr00001',note:'check timed out after 10m0s (limit 10m0s)',ago:'11h'},{state:'offered',actor:'agentd',note:'budget used up (30m, 31 of 30 min): worker pid 1552351 already gone; no checkpoint',ago:'11h'},
 {state:'offered',actor:'agentd',note:'linked PR '+PR+' by its head commit',ago:'10h'}];
// /api/issue for a server handoff, shaped as issueDetail answers: kind handoff, its tree row (dispatched, branch, log), its body's fields.
const detail=h=>({kind:'handoff',ref:ID,root:ID,tree:[{id:ID,goal:GOAL,state:h.state,focus:true,depth:0,from:h.from,claimer:null,worker:'codex',dispatched:true,branch:'fix/agentd-70',prs:[PR],attempts:[attempt],log,updated_ago:'11h',worker_state:h.worker_state}],
 prs:[{ref:PR,state:'MERGED',title:'Fix onboarding test'}],issues:[],body:{goal:GOAL,accept:ACCEPT,paths:'.'}});
// /api/issue for the same handoff mirrored from a device (mirrorIssueDetail): one tree row, read only, only its goal's first line.
const mirrorDetail={kind:'handoff',ref:ID,title:'Fix CI on PR acme/app#1040 '+evil,mirror:true,read_only:true,node:'alice-desk',person:'alice',mirrored:'2026-11-24T06:00:00Z',mirrored_ago:'20m',state:'offered',issues:[],
 body:{goal:'Fix CI on PR acme/app#1040 '+evil},tree:[{id:ID,state:'offered',goal:'Fix CI on PR acme/app#1040 '+evil,focus:true,worker:'codex',worker_state:null,dispatched:true,project:'acme/app',prs:[PR],
  origin:'host',host:'alice-desk',mirror:{node:'alice-desk',person:'alice',read_only:true},read_only:true,branch:'fix/agentd-70',check:'timed out',log:[],minutes:31,usd:1.87,updated_ago:'11h',attempts:[attempt]}]};
const mirrorRow={id:ID,state:'offered',from_user:'alice',goal:mirrorDetail.title,updated_ago:'11h',worker:'codex',worker_state:null,dispatched:true,attempts:[attempt],origin:'host',host:'alice-desk',
 mirror:{node:'alice-desk',person:'alice',read_only:true},read_only:true,prs:[PR],project:'acme/app',attention_status:'needs',other_mirror:false};
function page(dash,issue,o={}){const errors=[],posts=[],copied=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
 const json=(body,status=200)=>({ok:status<300,status,json:async()=>body,text:async()=>JSON.stringify(body)});
 const dom=new JSDOM(html,{url:'https://40.49.10.13:21490/#issues/'+ID,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  if(o.token!==false)w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
  w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{}]};
  Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async t=>{if(o.denyCopy)throw new Error('denied');copied.push(t)}}});
  w.fetch=async(url,opt)=>{const u=new URL(url,w.location.href);
   if(u.pathname==='/api/auth')return {ok:true,status:204};
   if(u.pathname==='/api/dash')return json(dash);
   if(u.pathname==='/api/issues')return json({issues:[]});
   if(u.pathname==='/api/issue')return json(issue);
   if(u.pathname==='/api/action'){posts.push(JSON.parse(opt.body));return json({ok:true})}
   if(u.pathname==='/api/review')return json({handoff:ID,enabled:true,branch:'fix/agentd-70',files:[],commits:1,pr:{ref:PR,state:'MERGED'}});
   if(u.pathname==='/api/log')return json({lines:[],running:false});
   if(u.pathname==='/api/files')return json({files:[],changed:0});
   if(u.pathname==='/api/checks')return json({check:'',runs:[]});
   if(u.pathname==='/api/taskmsg')return json(o.msg||{may:true,live:false,followup:true,followup_note:'A message starts a worker again on the task’s branch.'});
   if(u.pathname==='/api/team')return json({roles:[],members:[],handoff_roles:{}});
   return json({})}}});
 return {dom,w:dom.window,doc:dom.window.document,errors,posts,copied}}
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<8;i++)await tick()};
const base={now,team:true,dispatch:true,done:[],sessions:[],left:[],waiting:[],claims:[],messages:[],inbox:[],checkouts:['/srv/core'],terminal:false};
const needs=doc=>doc.querySelector('#issue-detail [data-need-actions]');
const needKeys=doc=>{const b=needs(doc);return b?[...b.querySelectorAll('[data-need]')].map(li=>li.dataset.need):[]};
const needCli=(doc,k)=>{const li=needs(doc)&&needs(doc).querySelector('[data-need="'+k+'"]');return li&&li.querySelector('code')&&li.querySelector('code').textContent};
const topActs=doc=>[...doc.querySelectorAll('#issue-detail .tw-top .tw-acts button')].map(b=>b.textContent);
const usable=doc=>[...doc.querySelectorAll('#issue-detail .tw-top .tw-acts button')].filter(b=>b.getAttribute('aria-disabled')!=='true');
(async()=>{
 // A. The owner, on the server's own row: the page under All tasks is the task, the message box is in the main column.
 {const dash={...base,user:'alice',role:'owner',handoff_list:[row()]};const {w,doc,errors,posts,copied}=page(dash,detail(row()));await settle();
  const box=doc.getElementById('issue-detail'),top=box.querySelector('.tw-top');
  assert(top,'no task top: '+box.textContent.slice(0,200));
  const crumb=top.querySelector('.icrumb');assert(crumb&&/All tasks/.test(crumb.textContent),'no All tasks crumb');
  assert.equal(crumb.nextElementSibling.tagName,'H2','the title is not right under All tasks');assert.equal(top.querySelector('.ititle').textContent,GOAL,'the title is not the goal');
  assert(top.querySelector('.tw-status [data-mark="needs_you"]'),'the status does not read Needs you');
  const text=box.querySelector('.tw-main .itext');assert(text&&text.textContent.includes('Acceptance criteria')&&text.textContent.includes('Cloud Workers not set up'),'the task text is not under the title');
  assert(!box.querySelector('img'),'the goal became markup');
  // (2) the message box: in the main column, after the history, not in the right column.
  const msg=box.querySelector('.tw-msgbox');assert(msg&&!msg.hidden,'no message box');
  assert(box.querySelector('.tw-main').contains(msg),'the message box is not in the main column');assert(!box.querySelector('.tw-side').contains(msg),'the message box is in the right column');
  const hist=box.querySelector('.tw-main .tw-conv-box');assert(hist,'no history');assert(hist.compareDocumentPosition(msg)&w.Node.DOCUMENT_POSITION_FOLLOWING,'the message box is not under the history');
  assert(msg.querySelector('textarea[aria-label="Follow up on this task"]'),'the box has no labelled input');
  // (3) Needs you: Start again, Take over and Cancel task as buttons; Raise budget as its command; the PR as a link.
  assert.deepEqual(topActs(doc),['Start again','Change check','Take over','Cancel task'],'top bar: '+JSON.stringify(topActs(doc)));assert(usable(doc).length===4,'the owner\'s buttons are disabled');
  assert.deepEqual(needKeys(doc),['budget','pr'],'what you can do');
  assert.equal(needCli(doc,'budget'),'libraos-engine handoff budget '+ID+' --budget 60m','the raise command');
  const link=needs(doc).querySelector('[data-need-link]');assert.equal(link.getAttribute('href'),'https://github.com/acme/app/pull/1040');assert.equal(link.getAttribute('rel'),'noopener noreferrer');
  const copy=needs(doc).querySelector('[data-need="budget"] button.need-copy');assert(copy&&/Copy the command/.test(copy.getAttribute('aria-label')),'no labelled Copy');
  copy.click();await settle();assert.deepEqual(copied,['libraos-engine handoff budget '+ID+' --budget 60m'],'Copy did not copy the command');
  // The buttons post the server's actions.
  usable(doc).find(b=>b.textContent==='Take over').click();await settle();[...doc.querySelectorAll('dialog.sheet .sheet-foot button')].find(b=>b.textContent==='Take over').click();await settle();
  assert.deepEqual(posts.pop(),{action:'takeover',id:ID});
  // (4) the username on Account; Account stays its name and title.
  const sum=doc.querySelector('#account>summary');assert.equal(doc.getElementById('account-name').textContent,'alice','Account does not show the username');
  assert(/^Account and settings/.test(sum.getAttribute('aria-label')),'Account lost its accessible name');assert(/^Account/.test(sum.title),'Account lost its title');
  assert(!errors.length,errors.join('\n'));w.close()}
 // B. A dev who did not send it: the server's buttons are there with its reasons, and the steps with no button still show.
 {const r=row({takeover:{may:false,why_not:'only the handoff\'s sender or an owner may take it over',cli:cli('claim '+ID+' --takeover')},cancel:{may:false,why_not:'only the handoff\'s sender or an owner may cancel it',cli:cli('done '+ID+' --cancel --reason TEXT')},retry:{cwd:'/srv/core',tool:'codex',budget:'30m',may:false,why_not:'only the handoff sender, claimer or an owner may start again'}});
  const dash={...base,user:'dana',role:'dev',handoff_list:[r]};const {w,doc,errors}=page(dash,detail(r));await settle();
  assert.deepEqual(topActs(doc),['Start again','Take over','Cancel task']);assert.equal(usable(doc).length,0,'a dev who may not got enabled buttons');
  assert(needKeys(doc).length>=1,'Needs you with nothing to do for a dev');assert(needKeys(doc).includes('pr'),'the dev has no PR link');
  assert.equal(doc.getElementById('account-name').textContent,'dana');
  assert(!errors.length,errors.join('\n'));w.close()}
 // C. A dash where starting work is off: Dispatch again has no button, so it is a command.
 {const dash={...base,dispatch:false,user:'alice',role:'owner',handoff_list:[row()]};const {w,doc,errors}=page(dash,detail(row()));await settle();
  assert.deepEqual(topActs(doc),['Change check','Take over','Cancel task']);assert.deepEqual(needKeys(doc),['dispatch','budget','pr']);
  assert.equal(needCli(doc,'dispatch'),'libraos-engine handoff dispatch '+ID);
  assert(!errors.length,errors.join('\n'));w.close()}
 // D. Mirrored from a device: one column under All tasks with the title and status, no button that acts, and every step as a command.
 {const dash={...base,user:'alice',role:'owner',attention_version:1,handoff_list:[mirrorRow]};const {w,doc,errors,posts,copied}=page(dash,mirrorDetail);await settle();
  const box=doc.getElementById('issue-detail'),wrap=box.querySelector('.idetail.mirror-detail');assert(wrap,'no mirrored page');
  assert.deepEqual([...wrap.children].map(n=>n.className),['icrumb','mirror-item'],'the mirrored page is not crumb then the task');
  assert(/\.idetail\.mirror-detail\{grid-template-columns:minmax\(0,1fr\)/.test(html),'the mirrored page is not one column');
  const item=wrap.querySelector('.mirror-item');assert.equal(item.firstElementChild.tagName,'H2','the title is not first under All tasks');assert(item.firstElementChild.textContent.startsWith('Fix CI on PR'),'no title');
  // A mirrored row has no server mark: its status is the attention the snapshot sent, Needs attention.
  assert(item.querySelector('.mirror-status .s-needs'),'the mirrored status does not read Needs you: '+item.querySelector('.mirror-status').textContent);
  assert(item.querySelector('.mirror-status').textContent.includes('last run: Stopped at its budget'),'it does not say how the last run ended');
  assert.deepEqual(needKeys(doc),['dispatch','budget','takeover','cancel','pr'],'what you can do on a mirrored task');
  assert.equal(needCli(doc,'takeover'),'libraos-engine handoff claim '+ID+' --takeover');assert.equal(needCli(doc,'cancel'),'libraos-engine handoff done '+ID+' --cancel --reason TEXT');
  assert(/on alice-desk/.test(needs(doc).querySelector('.need-h').textContent),'it does not say where to run them');
  assert.deepEqual([...box.querySelectorAll('button,textarea,input,select')].filter(b=>!b.classList.contains('need-copy')).map(b=>b.outerHTML.slice(0,80)),[],'a mirrored page has a control other than Copy');
  assert(!box.querySelector('[data-write],[data-task-act],.tw-msgbox'),'a mirrored page has a write');
  needs(doc).querySelector('[data-need="cancel"] .need-copy').click();await settle();assert.deepEqual(copied,['libraos-engine handoff done '+ID+' --cancel --reason TEXT']);assert.equal(posts.length,0,'Copy wrote');
  assert(!box.querySelector('img'),'the goal became markup');
  assert(!errors.length,errors.join('\n'));w.close()}
 // E. The shared token: Account says so.
 {const dash={...base,user:'',role:'',handoff_list:[row()]};const {w,doc,errors}=page(dash,detail(row()));await settle();
  assert.equal(doc.getElementById('account-name').textContent,'Shared token');assert(/^Account and settings/.test(doc.querySelector('#account>summary').getAttribute('aria-label')));
  assert(!errors.length,errors.join('\n'));w.close()}
 // G. Redraws keep one block; a viewer is told who runs the steps; a denied clipboard says so, never Copied; a username is text.
 {const dash={...base,user:'<b>v</b>',role:'viewer',handoff_list:[row({retry:undefined,takeover:undefined,cancel:undefined})]};const {w,doc,errors,posts}=page(dash,detail(row()),{denyCopy:true});await settle();
  assert.equal(doc.getElementById('account-name').textContent,'<b>v</b>','the username is not shown as text');assert(!doc.querySelector('#account-name *,#userstate *'),'the username became markup');
  assert.equal(doc.querySelectorAll('#issue-detail [data-need-actions]').length,1);
  for(let i=0;i<3;i++){await w.eval('refresh()');await settle()}
  assert.equal(doc.querySelectorAll('#issue-detail [data-need-actions]').length,1,'a redraw doubled the block');
  assert.deepEqual(needKeys(doc),['dispatch','budget','takeover','cancel','pr'],'a viewer sees no step');
  assert(/read-only access/.test(needs(doc).querySelector('.need-h').textContent),'the viewer is not told who runs them');
  needs(doc).querySelector('[data-need="budget"] .need-copy').click();await settle();
  assert(!/^Copied/.test(doc.getElementById('toast').textContent),'a denied copy said Copied');assert.equal(posts.length,0,'Copy wrote');
  // Copy is a button reached from the keyboard, with a name that says what it copies.
  for(const b of needs(doc).querySelectorAll('.need-copy')){assert.equal(b.tagName,'BUTTON');assert.equal(b.getAttribute('type'),'button');assert(b.getAttribute('aria-label').includes(b.dataset.copy))}
  assert(!errors.length,errors.join('\n'));w.close()}
 // F. Every Needs you state has something to do: waiting_answer, blocked, parked, an approval the person cannot answer, stopped, and bare.
 {const dash={...base,user:'alice',role:'owner',handoff_list:[row()]};const {w,doc,errors}=page(dash,detail(row()));await settle();
  const what=(h,have,o)=>JSON.parse(w.eval('JSON.stringify(needWhat('+JSON.stringify(h)+',new Set('+JSON.stringify(have||[])+'),'+!!(o&&o.mirror)+','+JSON.stringify((o&&o.rows)||[])+'))'));
  const keys=(h,have,o)=>what(h,have,o).map(x=>x.key);
  const b={id:'hof-x',state:'claimed',to:'any',worker:'claude',dispatched:true,attempts:[{end_reason:'',running:true}]};
  assert.deepEqual(keys({...b,worker_state:'waiting_answer',mark:'needs_you'}),['answer']);assert.equal(what({...b,worker_state:'waiting_answer'})[0].cli,'libraos-engine handoff answer hof-x --text "..."');
  assert.deepEqual(keys({...b,worker_state:'blocked',mark:'needs_you'}),['show','takeover','cancel']);
  assert.deepEqual(keys({...b,worker_state:'blocked',mark:'needs_you'},['takeover','cancel']),['show']);
  assert.deepEqual(keys({...b,parked:'finalization',mark:'needs_you'}),['resume']);
  assert.deepEqual(keys({...b,mark:'needs_you'},[],{rows:[{what:'approval',ref:'apr-1',handoff:'hof-x',can_answer:false,required_role:'owner'}]}),['approval']);
  assert.deepEqual(keys({...b,mark:'needs_you'}),['show'],'a bare Needs you has nothing');
  assert.deepEqual(keys({...b,mark:'needs_you'},['inbox']),[],'an approval row with buttons got a command too');
  assert.deepEqual(keys({...b,state:'offered',worker_state:'gone',mark:'needs_you',attempts:[{end_reason:'lost',running:false}]}),['dispatch','takeover','cancel']);
  assert.deepEqual(keys({...b,state:'claimed',worker_state:'stopped',mark:'needs_you'}),['takeover','cancel'],'a claimed task was offered Dispatch again');
  assert.deepEqual(keys({...b,state:'offered',budget_state:'stopped',budget:'90m,$5',attempts:[attempt]}).slice(0,2),['dispatch','budget']);
  assert.equal(what({...b,state:'offered',budget:'90m,$5',attempts:[attempt]}).find(x=>x.key==='budget').cli,"libraos-engine handoff budget hof-x --budget '180m,$10'");
  // The rule: wherever needsPerson holds, the page has a button for it or the block lists something.
  for(const h of [{...b,worker_state:'waiting_answer'},{...b,worker_state:'blocked'},{...b,parked:'x',mark:'needs_you'},{...b,mark:'needs_you'},{...b,mark:'failed'},{...b,attention_status:'needs'},{...b,state:'offered',worker_state:'stopped'},{...b,state:'held',mark:'needs_you'}]){
   assert(w.eval('needsPerson('+JSON.stringify(h)+')'),'not Needs you: '+JSON.stringify(h));
   for(const have of [[],['dispatch','takeover','cancel']])assert(have.length||keys(h,have).length,'Needs you with no action: '+JSON.stringify(h));
   assert(w.eval('!!needBlock('+JSON.stringify(h)+',new Set())'),'no block for '+JSON.stringify(h))}
  for(const h of [{...b,mark:'working'},{...b,state:'done',mark:'done'},{...b,mark:'not_started'}])assert(!w.eval('needBlock('+JSON.stringify(h)+',new Set())'),'a block on a task that does not need a person: '+JSON.stringify(h));
  assert(!errors.length,errors.join('\n'));w.close()}
 console.log('dash_taskpage: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');
})().catch(e=>{console.error(e);process.exit(1)});
