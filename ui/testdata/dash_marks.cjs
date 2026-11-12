// One set of task marks (#454): a task reads the same mark (word, glyph,
// colour class) on the board, in Chat and in the Agents list, for each of the
// six; the strip over the board counts each mark and choosing one shows exactly
// that many cards; the legend explains every mark. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_marks.cjs dash.html
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
// markIn: the one mark drawn inside node, as [key, word, glyph, colour class].
const markIn=(node,what)=>{const ms=node.querySelectorAll('.tmark');assert.equal(ms.length,1,what+': want one mark, got '+ms.length+' in '+node.textContent);const m=ms[0];
 return [m.dataset.mark,m.textContent.replace(m.querySelector('.tm-g').textContent,''),m.querySelector('.tm-g').textContent,[...m.classList].find(c=>c.startsWith('m-'))]};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // The board: every task card carries its server mark, word and glyph beside it.
 const seen={};
 for(const [id,key] of Object.entries(want)){const card=doc.querySelector('#board [data-ref="'+id+'"]');assert(card,'no board card for '+id);
  const m=markIn(card.querySelector('.ktop'),'board '+id);assert.equal(m[0],key,'board '+id);assert.equal(m[1],words[key],'board word '+id);assert.equal(m[3],'m-'+key);assert(m[2].trim(),'board '+id+' has no glyph: colour alone');
  const g=w.getComputedStyle(card.querySelector('.tmark')).display;assert.notEqual(g,'none','the mark is hidden on the board for '+id);seen[key]=m}
 assert.equal(Object.keys(seen).length,6,'the board shows all six marks');
 assert.equal(new Set(Object.values(seen).map(m=>m[2])).size,6,'two marks share a glyph');
 assert(!doc.querySelector('#board img'),'a task title became markup');
 assert(!doc.querySelector('[data-ref="acme/repo#9"] .tmark'),'a pull request is not a task and has no mark');
 // The strip: six counts, each a link; choosing one shows exactly that many cards, every one with that mark.
 const strip=()=>doc.querySelector('#mark-strip-box .mark-strip');assert(strip(),'no count strip over the board');
 const links=()=>[...strip().querySelectorAll('a[data-mark-pick]')];assert.equal(links().length,6);
 const counts={};for(const a of links()){counts[a.dataset.markPick]=+a.querySelector('.n').textContent;assert(a.getAttribute('href').startsWith('#issues'),'a count is not a link')}
 const expect={};for(const k of Object.values(want))expect[k]=(expect[k]||0)+1;
 assert.deepEqual(counts,{needs_you:expect.needs_you,failed:1,working:2,waiting:1,not_started:1,done:1});
 for(const layout of ['board','list'])for(const key of Object.keys(words)){
  w.location.hash='#issues?view=all&layout='+layout;await settle();
  links().find(a=>a.dataset.markPick===key).click();await settle();
  assert(w.location.hash.includes('mark='+key),'the pick is not in the address: '+w.location.hash);
  const cards=[...doc.querySelectorAll('#board .kcard')];
  assert.equal(cards.length,counts[key],layout+': '+key+' shows '+cards.length+' cards, the strip says '+counts[key]);
  for(const c of cards)assert.equal(markIn(c,'picked '+key)[0],key,'a card of another mark under '+key);
  for(const c of cards)assert.notEqual(w.getComputedStyle(c).display,'none','a counted card is hidden');
  const on=links().find(a=>a.dataset.markPick===key);assert.equal(on.getAttribute('aria-current'),'true');
  // Choosing it again shows every card.
  on.click();await settle();assert(!w.location.hash.includes('mark='),'choosing again does not clear the pick');assert(doc.querySelectorAll('#board .kcard').length>counts[key]||counts[key]===7)}
 // A pick read from the address, as a shared link opens it.
 w.location.hash='#issues?view=all&mark=working';await settle();assert.equal(doc.querySelectorAll('#board .kcard').length,2,'mark= in the address is not applied');
 doc.querySelector('#mark-strip-box button[data-mark-pick=""]').click();await settle();assert(!w.location.hash.includes('mark='));
 // The legend: reachable from the strip, one entry per mark, each with the same mark and a line of text.
 const legend=strip().querySelector('details.mark-legend');assert(legend,'no legend in the strip');legend.querySelector('summary').click();await settle();
 const dts=[...strip().querySelectorAll('.mark-legend dt')];assert.equal(dts.length,6);
 for(const dt of dts){const m=markIn(dt,'legend');assert.equal(m[2],seen[m[0]][2],'legend glyph differs for '+m[0]);assert(dt.nextElementSibling.textContent.length>10,'legend lacks text for '+m[0])}
 assert(strip().querySelector('details.mark-legend').open,'the legend closes on a refresh');
 // The Agents list (which replaced Team > Working now, #479): every open task reads as on the board.
 w.location.hash='#team/working';await settle();assert(doc.querySelector('#team-view [data-moved="working"]'),'#team/working does not say where Working now went');
 for(const id of ['hof-work','hof-work2','hof-ask','hof-wait','hof-new']){const a=doc.querySelector('#agents-rows [data-agent-id="'+id+'"]');assert(a,'the Agents list lacks '+id);const m=markIn(a,'agents '+id);assert.deepEqual(m,seen[want[id]],'the Agents list reads '+id+' differently')}
 // A task's own page and its drawer read as on the board.
 for(const id of ['hof-ask','hof-wait']){w.location.hash='#issues/'+id;await settle();const props=[...doc.querySelectorAll('#issue-detail .k')].find(k=>k.textContent==='Status');assert(props,'no Status on the page of '+id);
  assert.deepEqual(markIn(props.nextElementSibling,'page '+id),seen[want[id]],'the page of '+id+' reads differently');
  w.eval("showWorkItem('"+id+"')");await settle();const dk=[...doc.querySelectorAll('#hist .k')].find(k=>k.textContent==='Status');assert(dk,'no Status in the drawer of '+id);
  assert.deepEqual(markIn(dk.nextElementSibling,'drawer '+id),seen[want[id]],'the drawer of '+id+' reads differently');w.location.hash='#issues'}
 // Chat: each task's card reads as on the board.
 w.location.hash='#chat';await settle();w.eval("chatOpen('chat-m')");await settle();
 const chat=[...doc.querySelectorAll('#chat-cards .chat-card, #chat-msgs .chat-card')];assert.equal(chat.length,7,'want seven chat cards, got '+chat.length);
 for(const [id,key] of Object.entries(want)){const card=chat.find(c=>c.textContent.includes(chatCards.find(h=>h.id===id).goal.slice(0,12)));assert(card,'no chat card for '+id);assert.deepEqual(markIn(card,'chat '+id),seen[key],'Chat reads '+id+' differently')}
 assert(!doc.querySelector('#chat-cards img'),'a chat goal became markup');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_marks: ok',process.env.DASH_UI_PHONE==='1'?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
