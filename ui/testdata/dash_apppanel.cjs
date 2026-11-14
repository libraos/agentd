// libraos/agentd-core#693: agentd app's embedded panel at /panel, for a browser tab inside another agent app.
// The same page draws one column there: no sidebar, top bar or tabs; what needs me at the top (approvals
// with working Approve and Reject); my tasks in the current project (a project switch) with state, check
// result and cost; a task as a narrow panel with its checks and proof, cost and budget, delivery,
// approvals, branch and draft PR, Stop and Cancel, and no chat, files or terminal. At / the full app is
// unchanged, and the team server never draws the panel.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_apppanel.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const task=(id,o)=>({id,title:'Fix login '+id,goal:'Fix the login retry '+id,state:'claimed',claimer:'w-'+id,from:'s-alice',from_user:'alice',mine:true,worker:'claude',worker_tool:'claude',to:'any',project:'acme/demo-repo',stage:'implement',updated_ago:'1m',dispatched:now,check:'go test ./...',check_state:'passed',
  attempts:[{usd:1.25,running:true}],cancel:{cli:'agentd handoff done '+id+' --cancel --reason R',may:true},...o});
const list=[
 task('hof-p1',{title:'Fix login hof-p1 '+evil}),
 task('hof-p2',{check_state:'failed',attempts:[{usd:0.5}]}),
 task('hof-p3',{project:'acme/other',check_state:'not_run',attempts:[]}),
 task('hof-apr',{title:'Draft PR task',check_state:'none'}),
 task('hof-bob',{from:'s-bob',from_user:'bob',mine:false,cancel:null}),
];
const waiting=[
 {what:'approval',ref:'apr-1',title:'Open a draft PR: gh pr create --draft '+evil,from:'s-work',handoff:'hof-apr',can_answer:true,age:'4m',mine:true},
 {what:'approval',ref:'apr-2',title:'Push to main',from:'s-work',handoff:'hof-apr',can_answer:false,required_role:'owner',age:'4m',mine:true},
];
const inbox=[{id:'blocked:hof-p2:1',kind:'blocked',title:'claude worker waiting: input',handoff:'hof-p2',claimer:'w-hof-p2',from:'w-hof-p2',worker:'claude',age:'5m'}];
const base={user:'alice',role:'owner',now,handoff_list:list,done:[],sessions:[],left:[],unlinked:[],inbox,waiting,claims:[],messages:[],counts:{},handoffs:{},host_states:{},dispatch:true,terminal:true};
const checks={check:'go test ./...',runs:[{result:'passed',actor:'worker',at:now,tests:'12 tests',revert_test:'not evidence: the added tests pass without the change'}]};
const detail=id=>({handoff:id,state:'claimed',show:'agentd handoff show '+id,tool:'claude',branch:'agentd/'+id,cost:{minutes:9,usd:1.25},
  budget:{cap:'$2.00',used:'$1.80 of $2.00',fraction:0.9,warn:true,over:false,warn_at:0.85,running:true,raise:'agentd handoff budget '+id+' --budget $4'},delivery:{outcome:'open',reason:'Still claimed '+evil}});
const review=id=>({handoff:id,enabled:true,may:true,branch:'agentd/'+id,base_branch:'main',added:3,deleted:1,files:[{path:'a.go',added:3,deleted:1,diff:'+x'}],...(id==='hof-apr'?{pr:{ref:'acme/demo-repo#7',state:'OPEN'}}:{})});
const load=async(path,dash,store)=>{
 const errors=[],posts=[],hits={},vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
 const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21470'+path,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');for(const [k,v] of Object.entries(store||{}))w.localStorage.setItem(k,v);
  w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
  w.Notification=undefined;
  w.fetch=async(url,o)=>{const u=new URL(url,w.location.href),id=u.searchParams.get('id');hits[u.pathname]=(hits[u.pathname]||0)+1;let body={};
   if(u.pathname==='/api/auth')return {ok:true,status:204};
   if(u.pathname==='/api/action'){posts.push(JSON.parse(o.body));body={ok:true}}
   else if(u.pathname==='/api/dash')body=dash;
   else if(u.pathname==='/api/checks')body=checks;
   else if(u.pathname==='/api/taskdetail')body=detail(id);
   else if(u.pathname==='/api/review')body=review(id);
   return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
 const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25));const settle=async()=>{for(let i=0;i<6;i++)await tick()};await settle();
 return {w,doc,errors,posts,hits,settle};
};
const shown=n=>{for(let x=n;x&&x.nodeType===1;x=x.parentElement)if(x.hidden)return false;return true};
(async()=>{
 const snap={...base,mode:'app',watchdog:{running:false,start:'systemctl --user enable --now agentd-watchdog.timer'},spend_today:{usd:1,workers:1,unpriced:0,pending:0}};
 // At /panel on an app: the panel, and nothing of the full app or the team server.
 let {w,doc,errors,posts,hits,settle}=await load('/panel',snap);
 const $=id=>doc.getElementById(id),q=(s,n)=>(n||doc).querySelector(s),qa=(s,n)=>[...(n||doc).querySelectorAll(s)];
 const click=n=>{assert(n,'nothing to click');n.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}))};
 assert(!errors.length,errors.join('\n'));
 assert(doc.body.classList.contains('panel-mode'),'panel mode is off at /panel');assert(!doc.body.classList.contains('app-mode'),'the full app drew too');
 assert(shown($('app-panel')),'no panel');assert($('app-shell').hidden,'the full app shows');assert(q('.shell').hidden,'the team server shows');
 assert(!q('#app-panel [role=tablist]')&&!q('#app-panel nav'),'the panel has tabs or a nav');
 assert(!q('#app-panel img'),'text went in as markup');
 // No watchdog: one line with the command.
 assert(shown($('ap-watchdog'))&&/systemctl --user enable --now agentd-watchdog\.timer/.test($('ap-watchdog').textContent),'no watchdog line');
 // Needs you at the top: the approval I can answer has its buttons, the one I cannot says who, the blocked worker opens its task.
 const ib=$('ap-inbox');assert(shown(ib),'no Needs you');assert(ib.compareDocumentPosition($('ap-list'))&w.Node.DOCUMENT_POSITION_FOLLOWING,'Needs you is not above the list');
 // An approval I cannot answer is not mine to act on: it waits on its task's panel, saying who may.
 const needs=qa('.ap-need',ib);assert.equal(needs.length,2,'needs: '+needs.map(n=>n.textContent).join(' | '));
 const a1=needs.find(n=>n.dataset.id==='apr-1');assert(a1&&/Approval/.test(a1.textContent)&&/gh pr create --draft/.test(a1.textContent),'no approval apr-1');
 const btns=qa('button',a1).map(b=>b.textContent);assert(btns.includes('Approve')&&btns.includes('Reject')&&btns.includes('Open task'),'apr-1 buttons: '+btns);
 assert(needs.some(n=>n.dataset.kind==='blocked'&&/Worker blocked/.test(n.textContent)),'no blocked worker');
 // A working approval: Approve opens the sheet; submitting posts the app's approval_answer.
 click(qa('button',a1).find(b=>b.textContent==='Approve'));await settle();
 let dlg=q('dialog');assert(dlg&&dlg.open,'no confirm sheet');dlg.querySelector('textarea').value='fine';dlg.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
 assert.deepEqual(posts.at(-1),{action:'approval_answer',id:'apr-1',decision:'approve',note:'fine'});
 click(qa('button',qa('.ap-need',ib).find(n=>n.dataset.id==='apr-1')).find(b=>b.textContent==='Reject'));await settle();
 dlg=q('dialog');dlg.querySelector('textarea').value='not now';dlg.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
 assert.deepEqual(posts.at(-1),{action:'approval_answer',id:'apr-1',decision:'reject',note:'not now'});
 // The list: my tasks in the current project (that of my task that needs me), with state, check result and cost; not bob's.
 const sel=$('ap-project');assert(shown(sel),'no project switch with two projects');assert.equal(sel.value,'acme/demo-repo');
 assert.deepEqual(qa('option',sel).map(o=>o.textContent),['All projects','demo-repo','other']);
 let rows=qa('#ap-list .ap-row');assert.deepEqual(rows.map(r=>r.dataset.apOpen).sort(),['hof-apr','hof-p1','hof-p2'],'rows: '+rows.map(r=>r.dataset.apOpen));
 const r1=rows.find(r=>r.dataset.apOpen==='hof-p1');assert(/Check passed/.test(r1.textContent)&&/\$1\.25/.test(r1.textContent),'row 1: '+r1.textContent);
 assert(/Fix login hof-p1 <img/.test(q('.ap-rtitle',r1).textContent),'the title is not text');
 const r2=rows.find(r=>r.dataset.apOpen==='hof-p2');assert.equal(q('.ap-check',r2).dataset.check,'failed');assert(/Check failed/.test(r2.textContent)&&/\$0\.50/.test(r2.textContent),'row 2: '+r2.textContent);
 assert(q('.app-dot',r2).dataset.dot==='needs_you','the blocked task is not marked as needing me');
 assert(/No check/.test(rows.find(r=>r.dataset.apOpen==='hof-apr').textContent),'a task with no check says so');
 // The switch: another project, then all of mine (never bob's); the choice is kept.
 sel.value='acme/other';sel.dispatchEvent(new w.Event('change',{bubbles:true}));await settle();
 rows=qa('#ap-list .ap-row');assert.deepEqual(rows.map(r=>r.dataset.apOpen),['hof-p3']);assert(/Check not run/.test(rows[0].textContent),'not run');
 assert.equal(w.localStorage.getItem('dash-panel-project'),'acme/other');
 sel.value='*';sel.dispatchEvent(new w.Event('change',{bubbles:true}));await settle();
 rows=qa('#ap-list .ap-row');assert.equal(rows.length,4);assert(!rows.some(r=>r.dataset.apOpen==='hof-bob'),'bob’s task is in my list');
 // A task: checks and their proof, cost and budget with the warning, delivery, branch, Stop and Cancel; no chat, files or terminal.
 click(rows.find(r=>r.dataset.apOpen==='hof-p1'));await settle();
 assert($('ap-list').hidden&&shown($('ap-task')),'the task did not open');const t=$('ap-task');
 assert(hits['/api/checks']&&hits['/api/taskdetail']&&hits['/api/review'],'the task’s reads: '+JSON.stringify(hits));
 const sec=k=>q('[data-ap-sec="'+k+'"]',t);
 assert(/go test \.\/\.\.\./.test(sec('checks').textContent)&&/passed/.test(sec('checks').textContent)&&/12 tests/.test(sec('checks').textContent),'checks: '+sec('checks').textContent);
 assert(q('.check-noev',sec('checks')),'the revert test’s not evidence is missing');
 const cost=sec('cost').textContent;assert(/\$1\.25/.test(cost)&&/\$2\.00/.test(cost)&&/\$1\.80 of \$2\.00/.test(cost)&&/Past 85%/.test(cost)&&/Open/.test(cost),'cost: '+cost);
 assert.equal(q('[role=meter]',sec('cost')).getAttribute('aria-valuenow'),'90');assert(/Still claimed <img/.test(cost)&&!q('img',t),'the reason is not text');
 assert(/agentd\/hof-p1/.test(sec('branch').textContent)&&/main/.test(sec('branch').textContent),'branch: '+sec('branch').textContent);
 assert(q('[data-act="open_pr"]',sec('branch')),'no draft PR button');
 assert(shown(sec('actions'))&&q('[data-act="stop"]',sec('actions'))&&q('[data-act="cancel"]',sec('actions')),'no Stop or Cancel');
 assert(!q('textarea',t)&&!q('[data-ap-sec="files"]',t)&&!q('.app-term,.xterm',t)&&!sec('session'),'the task panel has chat, files or a terminal');
 assert(!sec('approvals')||!shown(sec('approvals')),'a task with no approval shows the section');
 // Stop and Cancel go through the full app's actions.
 click(q('[data-act="stop"]',sec('actions')));await settle();dlg=q('dialog');assert(dlg&&dlg.open,'no Stop sheet');dlg.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
 assert.deepEqual(posts.at(-1),{action:'stop',id:'hof-p1'});
 click(q('[data-act="cancel"]',sec('actions')));await settle();dlg=q('dialog');assert(dlg&&dlg.open&&/Cancel this task/.test(dlg.textContent),'no Cancel sheet');
 dlg.querySelector('textarea, input').value='duplicate';dlg.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
 assert.equal(posts.at(-1).action,'cancel');assert.equal(posts.at(-1).id,'hof-p1');
 // Back, then the task with approvals: they are on its panel with their buttons, and its draft PR's state.
 click(q('[data-ap-back]',t));await settle();assert(shown($('ap-list'))&&$('ap-task').hidden,'Back did not return');
 click(qa('button',qa('.ap-need',ib).find(n=>n.dataset.id==='apr-1')).find(b=>b.textContent==='Open task'));await settle();
 assert.equal($('ap-task').dataset.hid,'hof-apr');assert(!qa('.ap-need',ib).some(n=>n.dataset.id==='apr-1'),'the open task’s approval is in Needs you too');assert(shown(sec('approvals'))&&qa('button',sec('approvals')).some(b=>b.textContent==='Approve'),'the task’s approvals have no buttons');
 const a2=qa('.ap-need',sec('approvals')).find(n=>n.dataset.id==='apr-2');assert(a2&&/Waiting for an owner to answer/.test(a2.textContent)&&!qa('button',a2).some(b=>b.textContent==='Approve'),'apr-2 offers an answer it cannot give');
 assert(/acme\/demo-repo#7/.test(sec('branch').textContent)&&/open/.test(sec('branch').textContent),'no draft PR state: '+sec('branch').textContent);
 assert(!q('[data-act="open_pr"]',sec('branch')),'a task with a PR offers another');
 // Escape goes back to the list.
 $('ap-task').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await settle();assert(shown($('ap-list')),'Escape did not go back');
 // Another person's task: read only, no actions.
 w.apOpen('hof-bob');await settle();assert($('ap-task').hasAttribute('data-readonly')&&/Read only: bob/.test($('ap-task').textContent),'bob’s task is not read only');
 assert(!shown(sec('actions'))&&!q('[data-act="open_pr"]',$('ap-task')),'bob’s task has actions');
 // Theme: the panel's own block uses the page's tokens, so light and dark follow it.
 const css=fs.readFileSync(process.argv[2],'utf8'),block=css.slice(css.indexOf('/* region:css-app-panel'),css.indexOf('/* end:css-app-panel */'));
 assert(block.length>200&&/max-width:600px/.test(block)&&/var\(--bg\)/.test(block)&&/var\(--fg\)/.test(block)&&!/#fff\b|#000\b/.test(block.replace(/color:#fff/g,'')),'the panel’s CSS does not follow the theme');
 assert.equal(doc.documentElement.dataset.theme,process.env.DASH_UI_THEME||'light');
 // Signed out, the panel's sign-in comes back to the panel (the server takes next=/panel only).
 assert(css.includes("if(location.pathname==='/panel')location.replace('/login?next=/panel');else location.replace('/login')"),'a signed-out panel signs in to the full app');
 w.close();
 // An empty panel: no Needs you, a single project needs no switch, and the empty list says what to do.
 ({w,doc,errors}=await load('/panel',{...snap,handoff_list:[],waiting:[],inbox:[],watchdog:{running:true}}));
 assert(!errors.length,errors.join('\n'));assert(doc.getElementById('ap-inbox').hidden,'empty Needs you shows');assert(doc.getElementById('ap-project').hidden,'a switch with no projects');
 assert(doc.getElementById('ap-watchdog').hidden,'the watchdog line shows while one runs');assert(/No tasks yet/.test(doc.getElementById('ap-list').textContent));w.close();
 // At / the full app is unchanged: no panel.
 ({w,doc,errors}=await load('/',snap));assert(!errors.length,errors.join('\n'));
 assert(doc.body.classList.contains('app-mode')&&!doc.body.classList.contains('panel-mode'),'the full app changed at /');assert(doc.getElementById('app-panel').hidden&&!doc.getElementById('app-shell').hidden,'the panel shows at /');w.close();
 // The team server never draws the panel, even at /panel.
 ({w,doc,errors}=await load('/panel',{...base,mode:'team'}));assert(!errors.length,errors.join('\n'));
 assert(!doc.body.classList.contains('panel-mode')&&doc.getElementById('app-panel').hidden&&!doc.querySelector('.shell').hidden,'the team server drew the panel');w.close();
 console.log('dash_apppanel: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
