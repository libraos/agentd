// Chat (#483): the conversation list in the second panel (New, Roles, Recent)
// switches conversations in place and New starts one; the right pane's Sources
// tab lists the records the selected answer read, each opening its task, PR or
// run, and says so when an answer read none; a proposal opens New task with its
// fields filled, and no worker starts without the person's Start worker.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_chat_sources.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),yesterday=new Date(Date.now()-86400000).toISOString();
const dash={user:'alice',role:'owner',now,handoff_list:[{id:'hof-469',goal:'Parent-level acceptance',project:'libraos/agentd-core',state:'claimed',from:'s-a',to:'any',mark:'working',updated_ago:'1m',age:'1m'}],done:[],sessions:[],left:[],waiting:[],claims:[],messages:[],inbox:[],dispatch:true,checkouts:['/srv/alpha']};
const roles=[{name:'assistant',description:'Answers from the ledger; can start a task',model:'vendor/model',tools:['kb_search','ledger_progress','handoff_offer']},{name:'writer',description:'Writes draft documents',model:'vendor/model',tools:[]}];
const chats=[{id:'chat-a',title:'What ran today, and what failed?',role:'assistant',updated:now,pinned:0},{id:'chat-b',title:'Architecture <b>diagram</b>',role:'writer',updated:yesterday,pinned:0}];
const read=[{id:'handoff/hof-469',snippet:'# Handoff hof-469\n\n- from: s-a, to: any, state: claimed'},{id:'pr/libraos/agentd-core#475-chunk-2',snippet:'# PR libraos/agentd-core#475: dash shell\n\n- state: MERGED'}];
const threadA={chat:chats[0],busy:false,dispatch:true,handoffs:[],messages:[
 {seq:1,role:'user',content:'What ran today, and what failed?',created:now},
 {seq:2,role:'assistant',content:'',tool_calls:[{id:'c1',function:{name:'kb_search',arguments:'{"query":"failed"}'}},{id:'c2',function:{name:'ledger_progress',arguments:'{}'}}],created:now},
 {seq:3,role:'tool',tool_call_id:'c1',content:JSON.stringify(read),created:now},
 {seq:4,role:'tool',tool_call_id:'c2',content:JSON.stringify([{project:'acme',arm:'base',key:'run-1',status:'fail',checks:'3/4'}]),created:now},
 {seq:5,role:'assistant',content:'Parent-level acceptance is working: handoff/hof-469. The shell merged in pr/libraos/agentd-core#475. See also handoff/hof-999.',model:'vendor/model',created:now},
 {seq:6,role:'user',content:'Anything else?',created:now},
 {seq:7,role:'assistant',content:'No, that is all.',model:'vendor/model',created:now}],
 proposals:[{id:'proposal-a',state:'pending',created:now,task:{goal:'Draw the architecture diagram',accept:'out/arch.svg exists',check:'test -f out/arch.svg',state:'Asked for in Chat',cwd:'/srv/alpha',worker:'claude',budget:'30m'},network:'Web access follows this worker\'s permissions.'}]};
const threadB={chat:chats[1],busy:false,dispatch:true,handoffs:[],proposals:[],messages:[{seq:1,role:'user',content:'Draw the architecture',created:yesterday},{seq:2,role:'assistant',content:'Here is the outline.',model:'vendor/model',created:yesterday}]};
const errors=[],writes=[],confirms=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=body=>({ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#chat/chat-a',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href),method=opts.method||'GET';if(method!=='GET')writes.push(method+' '+u.pathname);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/chat')return json({chats,roles,gateway_ready:true});
  if(u.pathname==='/api/chat/chat-a')return json(threadA);
  if(u.pathname==='/api/chat/chat-b')return json(threadB);
  if(/^\/api\/chat\/chat-[ab]\/files$/.test(u.pathname))return json({files:[]});
  if(u.pathname==='/api/chat/chat-a/proposals/proposal-a/confirm'){confirms.push(opts.body?JSON.parse(opts.body):null);threadA.proposals[0].state='confirmed';threadA.proposals[0].handoff='hof-new';return json({state:'confirmed',handoff:'hof-new'})}
  if(u.pathname==='/api/workitem'||u.pathname==='/api/issue'){const id=u.searchParams.get('ref');return json({kind:'handoff',ref:id,title:id,body:{goal:id},tree:[{id,goal:id,state:'claimed',focus:true}],prs:[]})}
  if(u.pathname==='/api/team')return json({roles:[],members:[],handoff_roles:{}});
  return json({})}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
const button=(root,text)=>[...root.querySelectorAll('button')].find(b=>b.textContent===text);
(async()=>{
 await settle();w.__samePage=true;
 assert(!doc.getElementById('page-chat').hidden,'Chat did not open');
 // The Agents list gives way to the conversation list on Chat (desktop: collapsed; phone: a closed drawer).
 if(!phone)assert(doc.body.classList.contains('agents-collapsed'),'the Agents list still shows on Chat');
 // 1. Conversations are listed and switch in place; New starts one.
 const side=doc.getElementById('panel-chat');
 assert.deepEqual([...side.querySelectorAll('h3.chat-group')].map(n=>n.textContent),['Roles','Recent']);
 assert.deepEqual([...doc.querySelectorAll('#chat-roles .chat-role b')].map(n=>n.textContent),['Assistant','Writer']);
 assert(doc.getElementById('chat-roles').textContent.includes('Writes draft documents'));
 const rowOf=id=>doc.querySelector('#chat-list [data-chat-id="'+id+'"]');
 assert(rowOf('chat-a')&&rowOf('chat-b'),'the conversations are not listed');assert(rowOf('chat-b').textContent.includes('Architecture <b>diagram</b>'),'a title is not text');assert(!doc.querySelector('#chat-list b'));
 assert.equal(rowOf('chat-a').querySelector('.chat-row').getAttribute('aria-current'),'true');
 assert(doc.getElementById('chat-msgs').textContent.includes('No, that is all.'));
 rowOf('chat-b').querySelector('.chat-row-open').click();await settle();
 assert.equal(w.location.hash,'#chat/chat-b');assert(w.__samePage,'switching reloaded the page');assert(!doc.getElementById('page-chat').hidden);
 assert(doc.getElementById('chat-msgs').textContent.includes('Here is the outline.'));assert(!doc.getElementById('chat-msgs').textContent.includes('No, that is all.'),'the old conversation stayed');
 assert.equal(rowOf('chat-b').querySelector('.chat-row').getAttribute('aria-current'),'true');assert.equal(rowOf('chat-a').querySelector('.chat-row').getAttribute('aria-current'),null);
 const newButton=doc.getElementById('chat-new');assert.equal(newButton.textContent,'New');assert(!newButton.disabled);newButton.click();await settle();
 assert.equal(w.eval('CHAT.draft'),'assistant','New did not start a conversation with the role that can start a task');assert(!doc.getElementById('chat-composer').hidden);assert.equal(w.location.hash,'#chat?role=assistant');
 assert.deepEqual(writes,[],'New wrote before the first message');
 // 2. An answer with sources shows them in the right pane; one without says so.
 rowOf('chat-a').querySelector('.chat-row-open').click();await settle();assert.equal(w.location.hash,'#chat/chat-a');
 const pane=doc.getElementById('chat-sources'),tab=doc.getElementById('chat-tab-sources');
 assert.equal(tab.getAttribute('aria-selected'),'true');assert(!tab.hidden);assert(doc.getElementById('chat-tab-canvas').hidden,'Canvas tab with nothing in it');
 if(!phone){assert(doc.getElementById('page-chat').classList.contains('has-canvas'),'the right pane is not shown');assert(!pane.hidden)}
 // The latest answer is selected: it read nothing, and says so.
 assert(pane.querySelector('.chat-sources-none'),'an answer without sources does not say so');assert(pane.textContent.includes('read no records'));assert(pane.textContent.includes('Anything else?'));assert(!pane.querySelector('.chat-source'));
 const answers=[...doc.querySelectorAll('#chat-msgs .chat-reply[data-answer]')];assert.equal(answers.length,2);
 assert.equal(answers[1].querySelector('.chat-sources-open').textContent,'No sources');assert.equal(answers[1].querySelector('.chat-sources-open').getAttribute('aria-pressed'),'true');
 const first=answers[0].querySelector('.chat-sources-open');assert.equal(first.textContent,'Sources (4)');first.click();await settle();
 if(phone){const d=doc.querySelector('dialog');assert(d&&d.querySelector('#chat-sources'),'on a phone Sources does not open in a sheet');}
 const src=[...doc.querySelectorAll('#chat-sources .chat-source')];
 assert.deepEqual(src.map(n=>n.dataset.kind+' '+n.dataset.ref),['handoff hof-469','pr libraos/agentd-core#475','run run-1','handoff hof-999']);
 assert.deepEqual(src.map(n=>n.getAttribute('href')),['#issues/hof-469','#issues/libraos/agentd-core/475','#insights/metrics','#issues/hof-999']);
 assert(src[0].textContent.startsWith('task · Handoff hof-469'));assert(src[0].textContent.includes('cited in the answer'));assert(src[1].textContent.includes('dash shell'));assert(src[2].textContent.includes('acme · base'));assert(src[2].textContent.includes('fail'));
 assert(src[3].textContent.includes('not among what it read'),'a cited record it did not read is not told apart');
 assert(doc.getElementById('chat-sources').textContent.includes('The records this answer read'));assert(doc.getElementById('chat-sources').textContent.includes('What ran today, and what failed?'));
 assert.equal(first.getAttribute('aria-pressed'),'true');assert(answers[0].classList.contains('chat-answer-on'));
 // In the answer, a cited task links to its workspace.
 assert.deepEqual([...answers[0].querySelectorAll('.chat-ref-open')].map(a=>a.getAttribute('href')),['#issues/hof-469','#issues/libraos/agentd-core/475','#issues/hof-999']);
 if(phone){button(doc.querySelector('dialog .sheet-foot'),'Close').click();await settle()}
 // A source opens where it lives: the task opens its workspace on Tasks.
 doc.querySelector('#chat-sources .chat-source[data-kind="handoff"]')?.click();await settle();
 if(w.location.hash!=='#issues/hof-469'){w.location.hash='#issues/hof-469';await settle()}
 assert(!doc.getElementById('page-work').hidden,'a task source does not open Tasks');assert(w.__samePage);
 w.location.hash='#chat/chat-a';await settle();assert(!doc.getElementById('page-chat').hidden);
 // 3. A proposal opens New task with its fields filled; no worker starts without the confirm.
 const cards=doc.getElementById('chat-msgs').parentElement;await w.eval('chatPoll()');await settle();assert.equal(confirms.length,0,'opening or polling started a worker');
 const openNew=()=>{const b=button(cards,'Open in New task');assert(b,'the proposal has no Open in New task');assert(!b.disabled,b.title);b.click()};
 openNew();let d=doc.querySelector('dialog');assert(d,'New task did not open');assert.equal(d.querySelector('h2').textContent,'New task');
 const field=n=>d.querySelector('textarea[id$="-'+n+'"],input[id$="-'+n+'"],select[id$="-'+n+'"]');
 assert.equal(field('goal').value,'Draw the architecture diagram');assert.equal(field('accept').value,'out/arch.svg exists');assert.equal(field('check').value,'test -f out/arch.svg');assert.equal(field('state').value,'Asked for in Chat');assert.equal(field('budget').value,'30m');assert.equal(field('cwd').value,'/srv/alpha');assert.equal(field('tool').value,'claude');
 assert(d.textContent.includes('Nothing starts until you press Start worker'));
 button(d.querySelector('.sheet-foot'),'Cancel').click();await settle();assert(!doc.querySelector('dialog'));assert.equal(confirms.length,0,'Cancel started a worker');
 openNew();d=doc.querySelector('dialog');field('goal').value='Draw the architecture diagram as SVG';field('goal').dispatchEvent(new w.Event('input'));field('budget').value='45m';
 assert.equal(confirms.length,0,'filling New task started a worker');
 button(d.querySelector('.sheet-foot'),'Start worker').click();await settle();
 assert.equal(confirms.length,1,'Start worker did not confirm, or confirmed twice');
 assert.deepEqual(confirms[0],{goal:'Draw the architecture diagram as SVG',accept:'out/arch.svg exists',check:'test -f out/arch.svg',state:'Asked for in Chat',budget:'45m',cwd:'/srv/alpha',worker:'claude'});
 assert(!doc.querySelector('dialog'),'New task stayed open after Start worker');
 assert(!errors.length,'DOM errors: '+errors.join('\n'));
 console.log('dash_chat_sources: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');w.close();
})().catch(e=>{console.error(e);console.error('DOM errors:',errors);process.exit(1)});
