// The Inbox as a list and a detail pane (#481). Done when:
//  1. the two-pane Inbox shows every item kind it shows today, each in its tab
//     with the tab's count, and each opens in the detail pane;
//  2. a question (a blocked worker) is answered, and an approval approved or
//     rejected, without leaving the page, under the existing role rules;
//  3. the detail shows the task's change size, check and spend (GET /api/inboxitem).
// Also: j/k and Enter move and open, Mark resolved stays, a draft answer
// survives the 10 s redraw, item text is text, a phone shows one pane at a time.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_inbox.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>',phone=process.env.DASH_UI_PHONE==='1';
const base={from:'s-alice',from_user:'alice',to:'any',project:'acme/repo',updated_ago:'1m'};
const open=[
 {...base,id:'hof-ask',goal:'Strict multi-org ingest',state:'claimed',claimer:'s-work',claimer_user:'alice',worker:'claude',dispatched:now,worker_state:'blocked',worker_wait:'May it change the ingest API? '+evil,attempts:[{running:true,minutes:38}]},
 {...base,id:'hof-fail',goal:'Air gap check',state:'offered',worker:'codex',dispatched:now,attempts:[{running:false,minutes:5,end_reason:'failed'}]},
 {...base,id:'hof-apr',goal:'Release notes',state:'claimed',claimer:'s-work',claimer_user:'alice'},
 {...base,id:'hof-misc',goal:'Misc work',state:'claimed',claimer:'s-work',claimer_user:'alice'}];
const inbox=[
 {id:'blocked:hof-ask:1',kind:'blocked',title:'claude worker waiting: input',handoff:'hof-ask',claimer:'s-work',from:'s-work',worker:'claude',age:'5h',report_note:'Required or optional? '+evil,report_ago:'5h'},
 {id:'failed:res-1',kind:'failed',title:'codex worker failed: failed',goal:'Air gap check',handoff:'hof-fail',from:'s-work',worker:'codex',age:'2h',failure:'check timed out three times'},
 {id:'spec:hof-misc',kind:'spec',title:'Spec ready for approval',approval:'apr-spec',handoff:'hof-misc',from:'s-work',age:'1h'},
 {id:'validator:hof-misc',kind:'validator',title:'Validator waiting',handoff:'hof-misc',from:'s-work',age:'1h'},
 {id:'linked:hof-misc',kind:'linked_done',title:'Linked work finished',handoff:'hof-misc',from:'s-work',age:'1h'},
 {id:'improve:1',kind:'improve',title:'Proposal: retry flaky test',from:'s-work',age:'1h'},
 {id:'review:hof-misc:abc',kind:'review',title:'Ready for review',goal:'Misc work',handoff:'hof-misc',from:'s-work',age:'1h',summary:'Changed two files'},
 {id:'result:hof-misc',kind:'result',title:'Report ready',goal:'Misc work',handoff:'hof-misc',from:'s-work',age:'1h',deliverables:['out/report.md']},
 {id:'answered:1',kind:'answered',title:'Answered: use stable',from:'s-work',age:'1h'},
 {id:'stale:hof-old',kind:'stale',title:'Offer expired',goal:'Old offer',handoff:'hof-old',from:'s-alice',age:'9d'}];
const waiting=[
 {what:'approval',ref:'apr-1',title:'Open a draft PR for the air gap check: gh pr create --draft',from:'s-work',handoff:'hof-apr',about:'acme/repo#12',can_answer:true,age:'4d'},
 {what:'approval',ref:'apr-2',title:'Push to main',from:'s-work',handoff:'hof-apr',can_answer:false,required_role:'owner',age:'4d'},
 {what:'issue',ref:'acme/repo#7',title:'Reply needed on issue',age:'3d'},
 {what:'PR',ref:'acme/repo#3',title:'Ship fix',age:'2m'}];
const sessions=[{id:'s-work',label:'worker',tool:'claude',status:'active',user:'alice',cwd:'/src/acme',seen_ago:'1m'},{id:'s-alice',label:'alice',tool:'claude',status:'active',user:'alice',cwd:'/src/acme',seen_ago:'1m'}];
const dash={user:'alice',role:'owner',now,dispatch:true,checkouts:['/src/acme'],handoff_list:open,done:[],sessions,left:[],waiting,claims:[],messages:[],inbox};
const item={handoff:'hof-ask',change:{files:3,added:84,deleted:12,live:true},check:{cmd:'go test ./...',result:'passed',ago:'2m'},runs:2,running:true,minutes:38,usd:1.5,tokens:1800};
const errors=[],requests=[],writes=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=body=>({ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#inbox',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{}]};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);requests.push(u.pathname+u.search);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/inboxitem')return json(u.searchParams.get('id')==='hof-ask'?item:{handoff:u.searchParams.get('id'),check:{cmd:''},runs:0,minutes:0});
  if(u.pathname==='/api/action'){const b=JSON.parse(opts.body);writes.push(b);return json(b.action==='prompt'?{ok:true,via:'inbox',note:'its terminal door is closed'}:{ok:true})}
  if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:true});
  if(u.pathname==='/api/team')return json({roles:[],members:[],handoff_roles:{}});
  return json({})}}});
const w=dom.window,d=w.document,$=id=>d.getElementById(id),tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const go=async hash=>{w.location.hash=hash;await settle()};
const detail=()=>$('inbox-detail'),rows=()=>[...$('inbox-rows').querySelectorAll('.ib-row')].map(r=>r.dataset.id);
const button=(root,text)=>[...root.querySelectorAll('button')].find(b=>b.textContent===text);
const key=(target,k)=>{const e=new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true});target.dispatchEvent(e);return e};
const submitSheet=async(note)=>{const dlg=d.querySelector('dialog');assert(dlg,'no confirm sheet');if(note!==undefined)dlg.querySelector('textarea').value=note;dlg.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle()};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // 1. Every kind, in the tab it had as a side filter, with the tab's count.
 assert($('inbox-panes')&&$('inbox-rows')&&detail(),'the Inbox is not two panes');
 const tabs=Object.fromEntries([...$('inbox-tabs').querySelectorAll('a')].map(a=>[a.dataset.tab,a]));
 assert.deepEqual(Object.keys(tabs),['needs','approvals','blocked','failed','mine','expired']);
 const counts=Object.fromEntries(Object.entries(tabs).map(([k,a])=>[k,a.querySelector('.n').textContent]));
 assert.deepEqual(counts,{needs:'11',approvals:'2',blocked:'1',failed:'1',mine:'11',expired:'1'},JSON.stringify(counts));
 assert.equal(tabs.needs.getAttribute('aria-current'),'page');
 // The side filters are gone (the design has none beside the Agents list): the tabs above are the filters, with the same counts.
 assert(d.body.classList.contains('no-panel')&&!$('panel-inbox').children.length,'the Inbox still has a second panel');
 const needs=rows();
 for(const id of ['blocked:hof-ask:1','failed:res-1','apr-1','spec:hof-misc','validator:hof-misc','linked:hof-misc','improve:1','review:hof-misc:abc','result:hof-misc','answered:1','acme/repo#7'])assert(needs.includes(id),'Needs you lacks '+id+': '+needs);
 assert(!needs.includes('apr-2'),'an approval the person cannot answer is in Needs you');
 assert(!needs.includes('stale:hof-old')&&$('inbox-rows').textContent.includes('1 expired, kept under Expired'));
 assert(!$('inbox-rows').querySelector('img')&&!detail().querySelector('img'),'item text became markup');
 // Each row opens in the detail pane, by the address, and every kind draws there.
 for(const id of needs){await go('#inbox?item='+encodeURIComponent(id));assert.equal(detail().dataset.id,id,'detail for '+id);assert(detail().querySelector('h3').textContent,'no title for '+id);
  assert.equal($('inbox-rows').querySelector('.ib-row.on').dataset.id,id);assert(!errors.length,errors.join('\n'))}
 await go('#inbox/expired');assert.deepEqual(rows(),['stale:hof-old']);assert(button(detail(),'Clear'),'expired item lost Clear');
 await go('#inbox/failed');assert.deepEqual(rows(),['failed:res-1']);assert(/check timed out three times/i.test(detail().textContent));
 await go('#inbox?item=acme%2Frepo%237');assert([...detail().querySelectorAll('a')].some(a=>a.textContent==='Open on GitHub'));

 // 3. What it has done so far: change size, check and spend, from GET /api/inboxitem.
 await go('#inbox/blocked');assert.equal(detail().dataset.id,'blocked:hof-ask:1');
 assert(requests.includes('/api/inboxitem?id=hof-ask'),'the detail did not read /api/inboxitem');
 const prog=detail().querySelector('.ib-prog');assert(prog,'no progress card');
 assert.equal(prog.querySelector('[data-k="change"]').textContent,'3 files +84 −12 so far');
 assert.equal(prog.querySelector('[data-k="check"]').textContent,'check passed 2m ago');
 assert.equal(prog.querySelector('[data-k="spend"]').textContent,'$1.50');
 assert.equal(prog.querySelector('[data-k="time"]').textContent,'38 min, running');
 assert([...prog.querySelectorAll('a')].some(a=>a.textContent==='Open the workspace to see the changes'&&a.getAttribute('href')==='#issues/hof-ask'));
 const reads=requests.filter(r=>r.startsWith('/api/inboxitem')).length;await w.eval('refresh()');await settle();
 assert.equal(requests.filter(r=>r.startsWith('/api/inboxitem')).length,reads,'the 10 s redraw read /api/inboxitem again');

 // 2a. The question is answered in place; a draft survives the redraw.
 assert(detail().querySelector('h3').textContent.startsWith('Worker asks: May it change the ingest API?'));
 assert(detail().querySelector('.ib-msg').textContent.includes(evil),'the question is not shown as text');
 let box=detail().querySelector('textarea[aria-label="Your answer"]');assert(box,'no answer box');
 box.value='Accept the old shape for one release';box.dispatchEvent(new w.Event('input'));await w.eval('refresh()');await settle();
 box=detail().querySelector('textarea[aria-label="Your answer"]');assert.equal(box.value,'Accept the old shape for one release','the draft was lost on redraw');
 const hashBefore=w.location.hash;button(detail(),'Send answer').click();await settle();
 assert.deepEqual(writes.at(-1),{action:'prompt',to:'s-work',text:'Accept the old shape for one release'});assert.equal(w.location.hash,hashBefore,'answering left the page');
 assert(!detail().querySelector('textarea[aria-label="Your answer"]').value,'the box keeps the sent answer');
 assert($('toast').textContent.includes('its terminal door is closed'));
 // Mark resolved stays, beside the actions.
 button(detail(),'Mark resolved').click();await settle();await submitSheet();assert.deepEqual(writes.at(-1),{action:'inbox_mark',id:'blocked:hof-ask:1',mark:'resolved'});

 // 2b. An approval: Approve and Reject in place, with what it releases; Reject needs a reason.
 await go('#inbox/approvals?item=apr-1');assert.equal(detail().dataset.id,'apr-1');
 assert(detail().querySelector('.ib-msg').textContent.includes('gh pr create --draft'),'the exact request is not shown');
 assert([...detail().querySelectorAll('a')].some(a=>a.textContent.startsWith('acme/repo#12')),'the PR it releases is not linked');
 const n=writes.length;button(detail(),'Approve').click();await settle();await submitSheet('ok');
 assert.deepEqual(writes.at(-1),{action:'approval_answer',id:'apr-1',decision:'approve',note:'ok'});assert(w.location.hash.startsWith('#inbox/approvals'),'approving left the page');
 button(detail(),'Reject').click();await settle();await submitSheet('');assert.equal(writes.length,n+1,'a reject without a reason was sent');await submitSheet('Not this week');
 assert.deepEqual(writes.at(-1),{action:'approval_answer',id:'apr-1',decision:'reject',note:'Not this week'});
 // An approval this person's role cannot answer is not theirs: as before, it is in no list (the server says can_answer false).
 await go('#inbox/approvals?item=apr-2');assert(!rows().includes('apr-2'));assert.notEqual(detail().dataset.id,'apr-2');
 // A viewer gets no answer box, and Approve is a write the read-only lock disables.
 w.eval("TOKEN='';COOKIE=true;USER='vera';ROLE='viewer'");await go('#inbox/approvals?item=apr-1');const ap=button(detail(),'Approve');assert(ap&&ap.hasAttribute('data-write'),'Approve is not a write');assert.equal(ap.getAttribute('aria-disabled'),'true','a viewer may approve');
 await go('#inbox/blocked?item=blocked%3Ahof-ask%3A1');
 assert(!detail().querySelector('textarea[aria-label="Your answer"]'),'a viewer can answer');assert(/owner or developer/.test(detail().textContent));
 w.eval("TOKEN='fixture';COOKIE=false;USER='alice';ROLE='owner'");

 // j/k move through the list and Enter opens the row, as on the board.
 await go('#inbox');const first=rows();d.body.focus();
 if(!phone||!$('inbox-panes').classList.contains('picked')){
  key(d.body,'j');assert.equal(d.activeElement.closest('.ib-row').dataset.id,first[0]);key(d.activeElement,'j');assert.equal(d.activeElement.closest('.ib-row').dataset.id,first[1]);
  key(d.activeElement,'k');key(d.activeElement,'j');const target=d.activeElement;key(target,'Enter');await settle();
  assert.equal(new URLSearchParams(w.location.hash.split('?')[1]).get('item'),first[1],'Enter did not open the row');assert.equal(detail().dataset.id,first[1])}

 // Phone: one pane at a time; an opened item shows its detail with a way back.
 await go('#inbox');
 if(phone){assert(!$('inbox-panes').classList.contains('picked'),'a phone opens on the detail, not the list');
  $('inbox-rows').querySelector('.ib-pick').click();await settle();assert($('inbox-panes').classList.contains('picked'),'opening a row did not show its detail');
  const back=detail().querySelector('.ib-back');assert(back);back.click();await settle();assert(!$('inbox-panes').classList.contains('picked'),'Back did not return to the list')}
 else assert.equal(detail().dataset.id,first[0],'the desktop opens on the first item');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_inbox: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);console.error('DOM errors:',errors);process.exit(1)});
