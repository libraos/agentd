// Which task a card is (region:task-refs): every Needs you row on Agents, every Needs attention row on
// the Overview and every Inbox row and item show a short title and, under it, the task's id (a button
// that copies it) and its issues and PRs as links by their short names (next#313, core#1224). A
// trigger's task is titled by its issue's own title, or "Issue next#320" while the issue is not
// synced, never by the trigger's words; other tasks by their goal's first sentence, the whole goal the
// tooltip. A task's own page says the same under its title. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_taskrefs.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const html=fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8');
const boiler=n=>'Issue libraos/next#'+n+' was opened, and every new issue in libraos/next is triaged. Change the code: do what it still asks of this repository, commit, and finish with handoff done --triage fix --reason TEXT.';
const base={from:'s-alice',from_user:'alice',to:'any',updated_ago:'1m',age:'1m',state:'claimed',claimer:'s-w',worker:'claude',dispatched:true,worker_state:'blocked',worker_wait:'which file?',attention_status:'needs',mark:'needs_you'};
// A trigger task whose issue is synced: the server's title is the issue's title.
const titled={...base,id:'hof-titled1',project:'libraos/next',source:'trigger',goal:boiler(313),issue:'libraos/next#313',issues:['libraos/next#313'],prs:['libraos/core#1224'],title:'Relay drops the second frame '+evil};
// A trigger task whose issue is not synced: no title, only the trigger's words.
const bare={...base,id:'hof-bare0001',project:'libraos/next',source:'trigger',goal:boiler(320),issue:'libraos/next#320',issues:['libraos/next#320']};
// A person's task: its goal's first sentence, the rest in the tooltip.
const plain={...base,id:'hof-plain001',project:'libraos/core',goal:'Build the host side of a relayed end-to-end session. Follow the section Relay protocol in docs/relay.md, then add the tests the design names and the handshake.'};
const open=[titled,bare,plain];
const inbox=[{id:'n-blk',kind:'blocked',handoff:'hof-plain001',title:'worker blocked: which file?',worker:'claude',claimer:'s-w',age:'2m',can_answer:true},
 {id:'n-fail',kind:'failed',handoff:'hof-bare0001',title:'worker failed: exit 1',goal:boiler(320),failure:'exit 1',worker:'claude',age:'3m',can_answer:true}];
let dash={user:'alice',role:'owner',now,attention_version:1,handoff_list:open,done:[],sessions:[{id:'s-w',tool:'claude',status:'active',host_state:'busy',cwd:'/srv/next',user:'alice'}],left:[],waiting:[],claims:[],messages:[],inbox,dispatch:true,checkouts:['/srv/next']};
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=body=>({ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)});
const copied=[];
const dom=new JSDOM(html,{url:'http://127.0.0.1:21620/#agents',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async t=>{copied.push(t)}}});
 w.fetch=async url=>{const u=new URL(url,w.location.href);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/load')return json({at:now,tasks:{waiting_person:3,approvals_pending:0}});
  if(u.pathname==='/api/running')return json({at:now,running:[]});
  if(u.pathname==='/api/issues')return json({issues:[]});
  if(u.pathname==='/api/issue'||u.pathname==='/api/workitem'){const id=u.searchParams.get('ref'),h=open.find(x=>x.id===id);
   return json({kind:'handoff',ref:id,title:h.title,body:{goal:h.goal},tree:[{...h,focus:true,log:[]}],prs:(h.prs||[]).map(ref=>({ref,state:'OPEN'})),issues:(h.issues||[]).map(ref=>({ref,state:'OPEN'}))})}
  if(u.pathname==='/api/team')return json({roles:[],members:[],problems:[],handoff_roles:{}});
  if(u.pathname==='/api/inboxitem')return json({runs:0});
  if(u.pathname==='/api/taskmsg')return json({may:false});
  if(u.pathname==='/api/log')return json({lines:[],running:false});
  return json({})}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
const go=async h=>{w.location.hash=h;await settle()};
// refsOf: a refs line's id and its links (short name and href).
const refsOf=n=>{assert(n&&n.matches('[data-task-refs]'),'no line of ids and links: '+(n?n.outerHTML.slice(0,200):'none'));
 return {ids:[...n.querySelectorAll('[data-task-id]')].map(b=>b.textContent),links:[...n.querySelectorAll('a[data-ref-kind]')].map(a=>[a.dataset.refKind,a.textContent,a.getAttribute('href'),a.getAttribute('target')])}};
const want={'hof-titled1':{ids:['hof-titled1'],links:[['issue','next#313','https://github.com/libraos/next/issues/313','_blank'],['pr','core#1224','https://github.com/libraos/core/pull/1224','_blank']]},
 'hof-bare0001':{ids:['hof-bare0001'],links:[['issue','next#320','https://github.com/libraos/next/issues/320','_blank']]},
 'hof-plain001':{ids:['hof-plain001'],links:[]}};
const titles={'hof-titled1':'Relay drops the second frame '+evil,'hof-bare0001':'Issue next#320','hof-plain001':'Build the host side of a relayed end-to-end session.'};
// cards: a card's title line, its number first (the person: 'move the Number upfront').
const cards={'hof-titled1':'next#313 · '+titles['hof-titled1'],'hof-bare0001':'next#320 · New issue','hof-plain001':'hof-plain001 · '+titles['hof-plain001']};
const noBoiler=(root,where)=>assert(!/was opened, and every new issue/.test(root.textContent),where+' shows the trigger\'s words: '+root.textContent.slice(0,300));
(async()=>{await settle();assert(!errors.length,errors.join('\n'));
 // Agents: the Needs you rows, each with its title and the line under it.
 const rows=doc.getElementById('agents-rows');noBoiler(rows,'Agents');assert(!rows.querySelector('img'),'a title became markup');
 for(const [id,refs] of Object.entries(want)){const r=rows.querySelector('[data-agent-id="'+id+'"]');assert(r,'Agents lacks '+id);
  assert.equal(r.querySelector('.ag-title').textContent,cards[id],'Agents title of '+id);
  assert.deepEqual(refsOf(r.nextElementSibling),refs,'Agents line of '+id);assert(!r.nextElementSibling.closest('a'),'the links are inside the row link')}
 assert(rows.querySelector('[data-agent-id="hof-plain001"]').title.includes('docs/relay.md'),'the whole goal is not the tooltip');
 // The id copies, and does not open the task.
 {const before=w.location.hash,b=rows.querySelector('[data-task-id="hof-titled1"]');assert.equal(b.tagName,'BUTTON');assert(b.getAttribute('aria-label').includes('hof-titled1'));b.click();await settle();
  assert.deepEqual(copied,['hof-titled1'],'the id was not copied');assert.equal(w.location.hash,before,'copying the id opened something')}
 // Overview: Needs attention, each row its title and line.
 await go('#overview');const ov=doc.querySelector('[data-ov-needs]');assert(ov,'no Needs attention on the Overview');noBoiler(ov,'Overview');
 for(const [id,refs] of Object.entries(want)){const li=ov.querySelector('[data-ov-need-row="'+id+'"]');assert(li,'Overview lacks '+id);
  assert.equal(li.querySelector('a').textContent,cards[id],'Overview title of '+id);assert.deepEqual(refsOf(li.querySelector('[data-task-refs]')),refs,'Overview line of '+id)}
 // Inbox: each row, and the item it opens.
 await go('#inbox');const list=doc.getElementById('inbox-rows');noBoiler(list,'Inbox');
 for(const [key,id] of [['n-blk','hof-plain001'],['n-fail','hof-bare0001'],['attention:hof-titled1','hof-titled1']]){const row=list.querySelector('.ib-row[data-id="'+key+'"]');assert(row,'the Inbox lacks '+key+': '+[...list.querySelectorAll('.ib-row')].map(r=>r.dataset.id));
  assert.deepEqual(refsOf(row.querySelector('[data-task-refs]')),want[id],'Inbox line of '+key);assert(!row.querySelector('[data-task-refs]').closest('a'),'the Inbox links are inside the row link')}
 assert.equal(list.querySelector('.ib-row[data-id="n-fail"] .ib-title').textContent,cards['hof-bare0001'],'a failed trigger task is titled by the trigger\'s words');
 assert.equal(list.querySelector('.ib-row[data-id="attention:hof-titled1"] .ib-title').textContent,cards['hof-titled1']);
 assert.equal(list.querySelector('.ib-row[data-id="n-blk"] .ib-title').textContent.split(' · ')[0],'hof-plain001','a task with no issue or PR does not lead with its id');
 await go('#inbox?item=n-fail');{const pane=doc.getElementById('inbox-detail');noBoiler(pane.querySelector('h3'),'the Inbox item');assert.deepEqual(refsOf(pane.querySelector('[data-task-refs]')),want['hof-bare0001'],'the Inbox item has no line')}
 // The task's own page: the id and links under its title.
 for(const [id,refs] of Object.entries(want)){await go('#issues/'+id);const top=doc.querySelector('#issue-detail .tw-top');assert(top,'no task page for '+id);
  assert.equal(top.querySelector('h2').textContent,titles[id],'the page title of '+id);noBoiler(top.querySelector('h2'),'the task page');
  const line=top.querySelector('h2').nextElementSibling;assert.deepEqual(refsOf(line),refs,'the page line of '+id);
  // Opening the card shows all of it at the top: the whole goal, never cut, unless the title is the goal.
  const goal=top.querySelector('[data-tw-goal]');assert(goal,'the page of '+id+' has no whole goal at its top');assert.equal(goal.textContent,open.find(x=>x.id===id).goal,'the goal at the top of '+id+' is cut');
  assert(top.querySelector('.tw-status'),'the page of '+id+' has no state line at its top')}
 // At phone width the line wraps and each link is a target to tap.
 const css=[...doc.querySelectorAll('style')].map(n=>n.textContent).join('\n');assert(/\.trefs\{display:flex;flex-wrap:wrap/.test(css),'the line does not wrap');
 if(phone)assert(/@media\(max-width:860px\)\{[^@]*\.trefs \.tref\{min-height:32px/.test(css),'the links are too small to tap on a phone');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_taskrefs: ok '+(phone?'phone':'desktop')+' '+(process.env.DASH_UI_THEME||'light'));w.close()})().catch(e=>{console.error(e);process.exit(1)});
