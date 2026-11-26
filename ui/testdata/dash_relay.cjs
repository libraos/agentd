// Relayed actions (libraos/core relay.go): on the team server, a task mirrored from the signed-in person's
// device can be acted on from the page. Where a mirrored task that needs a person appears (its task page, the
// Inbox's Needs me, the Agents list's Needs you rows), Approve, Reject, Answer, Unpark and Cancel task open a
// confirm sheet, as local approvals do, and post action relay bound to what the page showed (the approval and
// its text's digest, the worker's attempt and the question's digest, the task's version) with a fresh nonce.
// Each relayed action shows its state (waiting for the device, done, refused, expired) and why. The commands
// to run on the device stay, under a "Same in a terminal" disclosure. A person who may not act sees why, and
// no button; a server that sends no relay view keeps the read-only page. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_relay.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const html=fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8');
const ID='hof-rl1';
const approval={id:'apr-aa11bb',attempt:ID+'#2',required_role:'dev',text:'May I deploy widget to staging? '+evil,digest:'0123456789abcdef0123456789abcdef'};
const question={text:'Postgres or SQLite?',digest:'fedcba9876543210fedcba9876543210',attempt:ID+'#2',asked:now};
const relay={host:'alice-desk',may:true,offline:false,approvals:[approval],question,cancel:{version:5},unpark:{version:5},
 actions:[{id:'rel-0000000a01',person:'alice',kind:'approval_answer',decision:'approve',state:'done',age:'5m'},
  {id:'rel-0000000a02',person:'alice',kind:'cancel',state:'refused',reason:'refused: hof-rl1 changed on alice-desk since the page showed it; reload and look again',age:'3m'},
  {id:'rel-0000000a03',person:'alice',kind:'handoff_answer',state:'pending',reason:'waits for alice-desk to connect',age:'1m'}]};
const row={id:ID,state:'claimed',from_user:'alice',goal:'Ship the parser '+evil,updated_ago:'2m',worker:'claude',worker_state:'waiting_answer',dispatched:true,attempts:[],origin:'host',host:'alice-desk',
 mirror:{node:'alice-desk',person:'alice',read_only:true},read_only:true,project:'acme/app',attention_status:'needs',mark:'needs_you',other_mirror:false,relay};
const detail=rv=>({kind:'handoff',ref:ID,title:row.goal,mirror:true,read_only:true,node:'alice-desk',person:'alice',mirrored:'2026-11-25T06:00:00Z',mirrored_ago:'2m',state:'claimed',issues:[],body:{goal:row.goal},
 tree:[{...row,focus:true,log:[],attempts:[]}],...(rv?{relay:rv}:{})});
function page(url,dash,rv){const errors=[],posts=[];let failNext='';
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
 const json=(body,status=200)=>({ok:status<300,status,json:async()=>body,text:async()=>JSON.stringify(body)});
 const dom=new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
  w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
  w.fetch=async(u0,opt)=>{const u=new URL(u0,w.location.href);
   if(u.pathname==='/api/auth')return {ok:true,status:204};
   if(u.pathname==='/api/dash')return json(dash);
   if(u.pathname==='/api/issues')return json({issues:[]});
   if(u.pathname==='/api/issue')return json(detail(rv));
   if(u.pathname==='/api/action'){const b=JSON.parse(opt.body);posts.push(b);if(failNext){const e=failNext;failNext='';return json({ok:false,error:e},400)}
    return json({ok:true,relay:'rel-0000000b01',state:'pending',host:'alice-desk',note:'alice-desk applies it on its next contact'})}
   if(u.pathname==='/api/load')return json({at:now,tasks:{}});
   if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:false});
   return json({})}}});
 return {w:dom.window,doc:dom.window.document,errors,posts,fail:e=>{failNext=e}}}
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<8;i++)await tick()};
const base={now,team:true,dispatch:true,done:[],sessions:[],left:[],unlinked:[],waiting:[],claims:[],messages:[],inbox:[],checkouts:[],attention_version:1};
(async()=>{
 // The task page: buttons for the approval, the question, unpark and cancel; the relayed actions with their state.
 {const dash={...base,user:'alice',role:'dev',handoff_list:[row],relay_inbox:[]};const {w,doc,errors,posts,fail}=page('http://127.0.0.1:21620/#issues/'+ID,dash,relay);await settle();
  const det=doc.getElementById('issue-detail'),panel=det.querySelector('[data-relay-panel="'+ID+'"]');assert(panel,'no Act from here on the mirrored page: '+det.textContent.slice(0,300));
  assert(/Act on it here: alice-desk applies what you send on its next contact\.$/.test(det.querySelector('.mirror-note').textContent),'note: '+det.querySelector('.mirror-note').textContent);
  assert.deepEqual([...panel.querySelectorAll('[data-relay]')].map(b=>b.dataset.relay),['approve','reject','answer','unpark','cancel'],'buttons on the task page');
  assert(!det.querySelector('img'),'an approval text was drawn as HTML');assert(panel.textContent.includes('May I deploy widget to staging? <img'),'the approval text is not shown as text');
  assert(panel.textContent.includes('Postgres or SQLite?'),'no question');
  // The states of the relayed actions, with why.
  const log=[...panel.querySelectorAll('[data-relay-state]')].map(li=>li.dataset.relayState);assert.deepEqual(log,['done','refused','pending'],'relayed action states');
  assert(panel.querySelector('[data-relay-state=refused]').textContent.includes('reload and look again'),'a refusal does not say why');
  assert(panel.querySelector('[data-relay-state=pending]').textContent.includes('waits for alice-desk to connect'),'a pending action does not say what it waits for');
  // The commands stay, under Same in a terminal.
  const term=det.querySelector('details.need-term');assert(term,'no Same in a terminal disclosure');assert.equal(term.querySelector('summary').textContent,'Same in a terminal');assert(!term.open,'the disclosure is open');
  assert(term.querySelector('.need-cli code'),'no command under the disclosure');assert(!det.querySelector('section.need-acts'),'the commands are still out in the open');
  const dialog=()=>doc.querySelector('dialog.sheet'),foot=l=>[...dialog().querySelectorAll('.sheet-foot button')].find(b=>b.textContent===l),btn=k=>det.querySelector('[data-relay-panel] [data-relay="'+k+'"]');
  // Approve: a confirm sheet; closing it writes nothing; Approve posts the binding and a nonce.
  btn('approve').click();await settle();assert(dialog(),'Approve has no confirm sheet');assert(dialog().textContent.includes('alice-desk applies it on its next contact'),'the sheet does not say where it goes');
  foot('Cancel').click();await settle();assert.equal(posts.length,0,'closing the sheet wrote something');
  btn('approve').click();await settle();const ta=dialog().querySelector('textarea');ta.value='go ahead';ta.dispatchEvent(new w.Event('input'));foot('Approve').click();await settle();
  let p=posts.pop();assert(/^[0-9a-f]{32}$/.test(p.nonce),'nonce: '+p.nonce);const n1=p.nonce;delete p.nonce;
  assert.deepEqual(p,{action:'relay',id:ID,kind:'approval_answer',approval:'apr-aa11bb',attempt:ID+'#2',subject:approval.digest,decision:'approve',note:'go ahead'});
  // Reject needs a reason; each click has its own nonce.
  btn('reject').click();await settle();foot('Reject').click();await settle();assert(dialog(),'a reject without a reason closed the sheet');assert.equal(posts.length,0,'a reject without a reason was posted');
  const tr=dialog().querySelector('textarea');tr.value='not today';tr.dispatchEvent(new w.Event('input'));foot('Reject').click();await settle();
  p=posts.pop();assert.equal(p.decision,'reject');assert.equal(p.note,'not today');assert.notEqual(p.nonce,n1,'two clicks shared a nonce');
  // Answer: the text is required and posted with the question's binding.
  btn('answer').click();await settle();assert(dialog().textContent.includes('Postgres or SQLite?'),'the answer sheet does not quote the question');
  const tq=dialog().querySelector('textarea');tq.value='SQLite';tq.dispatchEvent(new w.Event('input'));foot('Send answer').click();await settle();
  p=posts.pop();delete p.nonce;assert.deepEqual(p,{action:'relay',id:ID,kind:'handoff_answer',attempt:ID+'#2',subject:question.digest,text:'SQLite'});
  // Unpark and Cancel task carry the version the page showed; cancel needs a reason.
  btn('unpark').click();await settle();foot('Unpark').click();await settle();p=posts.pop();delete p.nonce;assert.deepEqual(p,{action:'relay',id:ID,kind:'unpark',version:5});
  btn('cancel').click();await settle();foot('Cancel task').click();await settle();assert(dialog(),'a cancel without a reason closed');
  const tc=dialog().querySelector('textarea');tc.value='not needed';tc.dispatchEvent(new w.Event('input'));foot('Cancel task').click();await settle();
  p=posts.pop();delete p.nonce;assert.deepEqual(p,{action:'relay',id:ID,kind:'cancel',version:5,reason:'not needed'});
  // A refusal stays in the sheet, with the server's reason.
  btn('approve').click();await settle();fail('alice-desk\'s owner turned relayed actions off ([server] relay_actions = false in its config.toml); act on the task there');foot('Approve').click();await settle();
  assert(dialog()&&/relay_actions = false/.test(dialog().querySelector('.sheet-error').textContent),'the refusal is not shown');posts.pop();foot('Cancel').click();await settle();
  assert(!errors.length,errors.join('\n'))}
 // Someone who may not act sees why, and no button; the commands are out in the open as before.
 {const rv={host:'alice-desk',may:false,why:'only alice, whose device alice-desk mirrors this task, its own person or an owner may act on it from here',actions:[]};
  const dash={...base,user:'bob',role:'dev',handoff_list:[{...row,relay:undefined}],relay_inbox:[]};const {doc,errors}=page('http://127.0.0.1:21620/#issues/'+ID,dash,rv);await settle();
  const det=doc.getElementById('issue-detail'),panel=det.querySelector('[data-relay-panel]');assert(panel&&panel.querySelector('[data-relay-why]').textContent.includes('only alice'),'no reason for bob: '+det.textContent.slice(0,300));
  assert(!panel.querySelector('button'),'bob got a button');assert(det.querySelector('.mirror-note').textContent.endsWith('Act on it on that device.'),'the note offers acting here');
  assert(det.querySelector('section.need-acts'),'the commands are hidden for someone who cannot act here');assert(!errors.length,errors.join('\n'))}
 // A server that sends no relay view: the read-only page, no control but Copy.
 {const dash={...base,user:'alice',role:'dev',handoff_list:[{...row,relay:undefined}]};const {doc,errors}=page('http://127.0.0.1:21620/#issues/'+ID,dash,null);await settle();
  const det=doc.getElementById('issue-detail');assert(!det.querySelector('[data-relay-panel]'),'a relay panel with no relay view');
  assert.deepEqual([...det.querySelectorAll('button,textarea,input,select')].filter(b=>!b.classList.contains('need-copy')).map(b=>b.outerHTML.slice(0,60)),[],'controls without a relay view');assert(!errors.length,errors.join('\n'))}
 // The Inbox's Needs me: From your devices, with the same buttons and sheets.
 {const dash={...base,user:'alice',role:'dev',handoff_list:[row],relay_inbox:[{handoff:ID,goal:row.goal,host:'alice-desk',person:'alice',state:'claimed',updated_ago:'2m',relay}]};
  const {w,doc,errors,posts}=page('http://127.0.0.1:21620/#inbox',dash,relay);await settle();
  const box=doc.querySelector('#inbox-rows [data-relay-inbox]');assert(box,'no From your devices in the Inbox: '+doc.getElementById('inbox-rows').textContent.slice(0,300));
  assert(box.querySelector('[data-relay-row="'+ID+'"] a').getAttribute('href').includes(ID),'the row does not open the task');
  assert.deepEqual([...box.querySelectorAll('[data-relay]')].map(b=>b.dataset.relay),['approve','reject','answer','unpark','cancel'],'Inbox buttons');
  box.querySelector('[data-relay=answer]').click();await settle();const d=doc.querySelector('dialog.sheet');assert(d,'Answer in the Inbox has no sheet');
  const t=d.querySelector('textarea');t.value='SQLite';t.dispatchEvent(new w.Event('input'));[...d.querySelectorAll('.sheet-foot button')].find(b=>b.textContent==='Send answer').click();await settle();
  const p=posts.pop();assert.equal(p.kind,'handoff_answer');assert.equal(p.id,ID);assert(!errors.length,errors.join('\n'))}
 // The Agents list's Needs you row: one-click Approve, Reject and Answer under the row (not inside its link).
 {const dash={...base,user:'alice',role:'dev',handoff_list:[row],relay_inbox:[]};const {w,doc,errors,posts}=page('http://127.0.0.1:21620/#agents',dash,relay);await settle();
  const quick=doc.querySelector('#agents-rows [data-relay-quick="'+ID+'"]');assert(quick,'no quick buttons under the Needs you row: '+doc.getElementById('agents-rows').innerHTML.slice(0,400));
  assert(!quick.closest('a'),'buttons inside the row link');assert.equal(quick.previousElementSibling&&quick.previousElementSibling.dataset.agentId,ID,'the buttons are not under their row');
  assert.deepEqual([...quick.querySelectorAll('[data-relay]')].map(b=>b.dataset.relay),['approve','reject','answer'],'quick buttons');
  assert(!doc.querySelector('#agents-rows [data-agent-id="'+ID+'"] .ag-sub').textContent.includes('sent no question'),'a question with text reads as none');
  quick.querySelector('[data-relay=approve]').click();await settle();const d=doc.querySelector('dialog.sheet');assert(d&&d.textContent.includes('Approve this request?'),'quick Approve opens no confirm sheet');
  [...d.querySelectorAll('.sheet-foot button')].find(b=>b.textContent==='Approve').click();await settle();
  const p=posts.pop();assert.equal(p.kind,'approval_answer');assert.equal(p.subject,approval.digest);assert.equal(p.decision,'approve');
  // The right side (wide screens) shows the first Needs you task with its relay panel and the whole question.
  const pv=doc.getElementById('agents-preview');assert(pv&&pv.querySelector('[data-relay-panel="'+ID+'"]'),'the preview has no relay panel: '+(pv?pv.innerHTML.slice(0,300):'no preview'));
  assert(pv.textContent.includes('Postgres or SQLite?'),'the preview does not show the question');
  // A long question with line breaks is quoted whole in the Answer sheet, not clipped into its description.
  const long='Which store?\n'+'x'.repeat(1500)+' END';
  w.eval('relayAnswer('+JSON.stringify(ID)+','+JSON.stringify({...relay,question:{...question,text:long}})+')');await settle();
  const q=doc.querySelector('dialog.sheet [data-relay-quote]');assert(q,'the Answer sheet has no quote');assert.equal(q.textContent,long,'the quote is not the whole question');
  assert(!doc.querySelector('dialog.sheet .sheet-head p').textContent.includes('Which store?'),'the question is still in the description');
  [...doc.querySelectorAll('dialog.sheet .sheet-foot button')].find(b=>b.textContent==='Cancel').click();await settle();
  // No relay view, or one that may not act: no quick buttons.
  assert.equal(w.eval('relayQuick('+JSON.stringify({...row,relay:{may:false,why:'x'}})+')'),null);assert.equal(w.eval('relayQuick('+JSON.stringify({...row,relay:undefined})+')'),null);
  assert(!errors.length,errors.join('\n'))}
 // A question with empty or whitespace-only text: no Answer button or sheet anywhere; the row and panel still say the worker waits.
 for(const text of ['','  \n\t ',undefined]){const rv={...relay,approvals:[],question:{...question,text}},er={...row,relay:rv};
  const says='The worker is waiting but sent no question.';
  // The task page: the waiting line, no Answer; Unpark and Cancel stay.
  {const dash={...base,user:'alice',role:'dev',handoff_list:[er],relay_inbox:[]};const {doc,errors}=page('http://127.0.0.1:21620/#issues/'+ID,dash,rv);await settle();
   const panel=doc.querySelector('#issue-detail [data-relay-panel="'+ID+'"]');assert(panel,'no relay panel for an empty question');
   assert.deepEqual([...panel.querySelectorAll('[data-relay]')].map(b=>b.dataset.relay),['unpark','cancel'],'buttons for an empty question ('+JSON.stringify(text)+')');
   assert(!panel.querySelector('[data-relay-question]'),'an empty question is drawn as a question');
   assert.equal(panel.querySelector('[data-relay-noquestion] .relay-text').textContent,says,'the panel does not say the worker waits');
   assert(!errors.length,errors.join('\n'))}
  // The Inbox: the same.
  {const dash={...base,user:'alice',role:'dev',handoff_list:[er],relay_inbox:[{handoff:ID,goal:row.goal,host:'alice-desk',person:'alice',state:'claimed',updated_ago:'2m',relay:rv}]};
   const {doc,errors}=page('http://127.0.0.1:21620/#inbox',dash,rv);await settle();const box=doc.querySelector('#inbox-rows [data-relay-inbox]');assert(box,'no From your devices for an empty question');
   assert(!box.querySelector('[data-relay=answer]'),'an Answer button in the Inbox for an empty question');assert(box.textContent.includes(says),'the Inbox does not say the worker waits');assert(!errors.length,errors.join('\n'))}
  // The Agents list: the row stays under Needs you and still says it waits, with no quick Answer under it; the preview says it waits.
  {const dash={...base,user:'alice',role:'dev',handoff_list:[er],relay_inbox:[]};const {w,doc,errors}=page('http://127.0.0.1:21620/#agents',dash,rv);await settle();
   const rowEl=doc.querySelector('#agents-rows [data-agent-id="'+ID+'"]');assert(rowEl,'the waiting task has no row');assert.equal(rowEl.dataset.mark,'needs_you','the row does not need you');
   assert(rowEl.querySelector('.ag-sub').textContent.includes('worker waits, sent no question'),'the row does not say the worker waits: '+rowEl.querySelector('.ag-sub').textContent);
   assert(!doc.querySelector('#agents-rows [data-relay-quick="'+ID+'"]'),'quick buttons for an empty question');assert(!doc.querySelector('#agents-rows [data-relay=answer]'),'a quick Answer for an empty question');
   const pv=doc.getElementById('agents-preview');assert(pv.textContent.includes(says),'the preview does not say the worker waits');assert(!pv.querySelector('[data-relay=answer]'),'an Answer in the preview');
   // With an approval too, only Approve and Reject under the row.
   const both=w.eval('relayQuick('+JSON.stringify({...er,relay:{...rv,approvals:[approval]}})+')');assert.deepEqual([...both.querySelectorAll('[data-relay]')].map(b=>b.dataset.relay),['approve','reject'],'quick buttons with an approval and an empty question');
   // No sheet opens, even when called directly.
   assert.equal(w.eval('relayAnswer('+JSON.stringify(ID)+','+JSON.stringify(rv)+')'),null,'relayAnswer opened for an empty question');await settle();
   assert(!doc.querySelector('dialog.sheet[open]'),'an Answer sheet opened for an empty question');assert(!errors.length,errors.join('\n'))}}
 // #1165: once the device refused the person's own Approve, Approve anyway (owner override) takes its place (posting force);
 // the refusals alike fold into one line with their count; a question that is the pending approval asked again gets no
 // second set of buttons.
 {const why='this is your own handoff hof-rl1, so on a team someone else answers it; as an owner you may use Approve anyway (owner override), which is recorded in the task history';
  const own={...approval,text:'May I push to main?'};
  const rv={...relay,approvals:[own],question:{...question,text:'May I push to main?'},unpark:undefined,
   actions:[{id:'rel-0000000c03',person:'alice',kind:'approval_answer',approval:own.id,decision:'approve',state:'refused',reason:why,override:true,age:'1m'},
    {id:'rel-0000000c02',person:'alice',kind:'approval_answer',approval:own.id,decision:'approve',state:'refused',reason:why,override:true,age:'2m'},
    {id:'rel-0000000c01',person:'alice',kind:'cancel',state:'refused',reason:'refused: hof-rl1 changed on alice-desk',age:'9m'}]};
  const er={...row,relay:rv},dash={...base,user:'alice',role:'owner',handoff_list:[er],relay_inbox:[]};
  const {w,doc,errors,posts}=page('http://127.0.0.1:21620/#issues/'+ID,dash,rv);await settle();
  const panel=doc.querySelector('#issue-detail [data-relay-panel="'+ID+'"]');assert(panel,'no relay panel');
  assert.deepEqual([...panel.querySelectorAll('[data-relay]')].map(b=>b.dataset.relay),['approve-override','reject','cancel'],'buttons after a self-approval refusal');
  const ov=panel.querySelector('[data-relay=approve-override]');assert.equal(ov.textContent,'Approve anyway (owner override)');
  assert(!panel.querySelector('[data-relay-question]')&&!panel.querySelector('[data-relay-noquestion]'),'the approval asked again as a question has its own block');
  const lis=[...panel.querySelectorAll('[data-relay-state]')];assert.equal(lis.length,2,'the refusals did not fold: '+lis.map(l=>l.textContent).join(' | '));
  assert.equal(lis[0].dataset.relayCount,'2');assert(lis[0].textContent.includes('Refused (2 times)'),'no count: '+lis[0].textContent);assert(!lis[1].dataset.relayCount,'an unlike refusal folded in');
  const dialog=()=>doc.querySelector('dialog.sheet'),foot=l=>[...dialog().querySelectorAll('.sheet-foot button')].find(b=>b.textContent===l);
  ov.click();await settle();assert(dialog()&&dialog().textContent.includes('Approve your own request?'),'Approve anyway opens no confirm sheet');
  assert(dialog().textContent.includes('owner override is recorded in the task history'),'the sheet does not say the override is recorded');
  foot('Approve anyway').click();await settle();let p=posts.pop();delete p.nonce;
  assert.deepEqual(p,{action:'relay',id:ID,kind:'approval_answer',approval:own.id,attempt:own.attempt,subject:own.digest,decision:'approve',note:'',force:true});
  // Reject stays a plain reject.
  panel.querySelector('[data-relay=reject]').click();await settle();const tr=dialog().querySelector('textarea');tr.value='no';tr.dispatchEvent(new w.Event('input'));foot('Reject').click();await settle();
  p=posts.pop();assert.equal(p.decision,'reject');assert(!('force' in p),'a reject carries force');
  // The row's one-click buttons: one set, the override in place of Approve, no Answer.
  const quick=w.eval('relayQuick('+JSON.stringify(er)+')');assert.deepEqual([...quick.querySelectorAll('[data-relay]')].map(b=>b.dataset.relay),['approve-override','reject'],'quick buttons after a refusal');
  // A question naming the approval's id is the same ask; one that differs keeps its Answer.
  assert.equal(w.eval('relaySameAsk('+JSON.stringify({...rv,question:{...question,text:'Waiting on '+own.id+' before I push'}})+')'),true);
  assert.equal(w.eval('relaySameAsk('+JSON.stringify({...rv,question})+')'),false);
  // With no such refusal: plain Approve.
  assert.deepEqual([...w.eval('relayQuick('+JSON.stringify({...er,relay:{...rv,actions:[]}})+')').querySelectorAll('[data-relay]')].map(b=>b.dataset.relay),['approve','reject']);
  assert(!errors.length,errors.join('\n'))}
 // On a phone the buttons are tap-sized.
 assert(/@media\(max-width:860px\)\{\.relay-btns button,\.ag-relay button\{min-height:44px\}\}/.test(html),'relay buttons are not tap-sized on a phone');
 console.log('relay: task page, Inbox, Agents rows, states, sheets and the terminal disclosure passed'+(phone?' (phone)':''));process.exit(0)
})().catch(e=>{console.error(e);process.exit(1)});
