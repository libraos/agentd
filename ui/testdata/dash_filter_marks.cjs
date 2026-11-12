// The board's typed filter (#456) and the mark count strip (#454) narrow the same
// cards: the strip counts only what the filter lets through, a picked mark with a
// filter shows the cards matching both, and each keeps the other in the address.
// Fixture as in dash_marks.cjs. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_filter_marks.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const base={from:'s-alice',from_user:'alice',to:'any',project:'acme/repo',updated_ago:'1m',age:'1m'};
// What the API sends: each task carries the server's mark.
const open=[
 {...base,id:'hof-work',goal:'Working task',state:'claimed',claimer:'s-w',worker:'codex',dispatched:true,attempts:[{tool:'codex',running:true,minutes:2}],mark:'working'},
 {...base,id:'hof-work2',goal:'Second working task',state:'offered',worker:'codex',dispatched:true,attempts:[{tool:'codex',running:true,minutes:1}],mark:'working'},
 {...base,id:'hof-wait',goal:'Waiting task',state:'offered',worker:'codex',mark:'waiting'},
 {...base,id:'hof-ask',goal:'Needs you task '+evil,state:'claimed',claimer:'s-w2',worker:'codex',dispatched:true,worker_state:'blocked',worker_wait:'a question',attempts:[{tool:'codex',running:true,minutes:3}],mark:'needs_you'},
 {...base,id:'hof-new',goal:'Not started task',state:'offered',mark:'not_started'}];
const done=[
 {...base,what:'handoff',ref:'hof-done',title:'Done task',state:'done',worker:'codex',mark:'done'},
 {...base,what:'handoff',ref:'hof-fail',title:'Failed task',state:'done',worker:'codex',failed:true,end_reason:'crashed',mark:'failed'}];
const dash={user:'alice',role:'owner',now,handoff_list:open,done,sessions:[],waiting:[{what:'PR',ref:'acme/repo#9',title:'An open PR',age:'1m'}],claims:[],messages:[],inbox:[]};
const want={'hof-work':'working','hof-work2':'working','hof-wait':'waiting','hof-ask':'needs_you','hof-new':'not_started','hof-done':'done','hof-fail':'failed'};
const words={working:'Working',waiting:'Waiting',needs_you:'Needs you',done:'Done',failed:'Failed',not_started:'Not started'};
const chatCards=[...open.map(h=>({id:h.id,goal:h.goal,state:h.state,worker:h.worker||'',worker_state:h.worker_state||null,dispatched:!!h.dispatched,mark:h.mark,created:now,updated:now})),
 ...done.map(x=>({id:x.ref,goal:x.title,state:'done',worker:'codex',dispatched:true,result:{end_reason:x.failed?'crashed':'done',check_result:x.failed?'':'passed'},mark:x.mark,created:now,updated:now}))];
const errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=body=>({ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#issues?view=all&layout=board',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.fetch=async(url)=>{const u=new URL(url,w.location.href);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/issues')return json({issues:[]});
  if(u.pathname==='/api/issue'||u.pathname==='/api/workitem'){const id=u.searchParams.get('ref'),h=open.find(x=>x.id===id);return json({kind:'handoff',ref:id,title:h.goal,body:{goal:h.goal},tree:[{...h,focus:true}],prs:[]})}
  if(u.pathname==='/api/team')return json({roles:[],members:[],handoff_roles:{}});
  if(u.pathname==='/api/chat')return json({chats:[{id:'chat-m',title:'Marks',role:'writer',updated:now}],roles:[],gateway_ready:true});
  if(u.pathname==='/api/chat/chat-m')return json({chat:{id:'chat-m',title:'Marks'},messages:[],handoffs:chatCards,proposals:[]});
  if(u.pathname==='/api/chat/chat-m/files')return json({files:[]});
  return json({})}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const strip=()=>doc.querySelector('#mark-strip-box .mark-strip');
const counts=()=>{const o={};for(const a of strip().querySelectorAll('a[data-mark-pick]'))o[a.dataset.markPick]=+a.querySelector('.n').textContent;return o};
const cards=()=>[...doc.querySelectorAll('#board .kcard')].map(c=>c.dataset.ref).sort();
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 assert.deepEqual(counts(),{needs_you:1,failed:1,working:2,waiting:1,not_started:1,done:1},'unfiltered counts');
 // A filter from the address: the strip counts only the matching task.
 w.location.hash='#issues?view=all&layout=board&q=second';await settle();
 assert.deepEqual(cards(),['hof-work2'],'q=second on the board');
 assert.deepEqual(counts(),{needs_you:0,failed:0,working:1,waiting:0,not_started:0,done:0},'the strip counts what the filter hides');
 // Picking a mark keeps the filter, and shows the cards matching both.
 [...strip().querySelectorAll('a[data-mark-pick]')].find(a=>a.dataset.markPick==='working').click();await settle();
 assert(w.location.hash.includes('mark=working')&&w.location.hash.includes('q=second'),'mark and q are not both in the address: '+w.location.hash);
 assert.deepEqual(cards(),['hof-work2'],'working and second');
 // Widening the filter in the box keeps the pick: both working tasks, and the counts grow back.
 const box=doc.getElementById('board-filter');assert(box,'no filter box');
 box.value='task';box.dispatchEvent(new w.Event('input',{bubbles:true}));await settle();
 assert(w.location.hash.includes('mark=working'),'typing in the box dropped the pick: '+w.location.hash);
 assert.deepEqual(cards(),['hof-work','hof-work2'],'working and task');
 assert.equal(counts().working,2);assert.equal(counts().done,1);
 // A pick and a filter that share no task: an empty board that says so, not every card.
 w.location.hash='#issues?view=all&layout=board&mark=done&q=second';await settle();
 assert.deepEqual(cards(),[],'done and second share no task');
 assert(/No task here reads Done/.test(doc.getElementById('board').textContent),'no empty note');
 // A typed key works with the strip as well: agent:codex leaves out the task with no worker.
 w.location.hash='#issues?view=all&layout=board&q=agent:codex';await settle();
 assert.equal(counts().not_started,0,'agent:codex counts the task with no worker');assert.equal(counts().working,2);
 assert(!errors.length,errors.join('\n'));
 console.log('dash_filter_marks: ok',process.env.DASH_UI_PHONE==='1'?'phone':'desktop',process.env.DASH_UI_THEME||'light');process.exit(0)
})().catch(e=>{console.error('dash_filter_marks:',e&&e.stack||e);process.exit(1)});
