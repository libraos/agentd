// Personal app review M1: the app's Inbox page. The left nav reads Search, Home, Tasks, Inbox, Triggers; the Inbox row
// and the bell open a page over the centre built from the embedded panel's Needs-you rows (apNeedRow): Could not finish,
// Approval, Question, Lesson and Worker blocked, each with its whole text (a long approval is never cut), its task and
// what can be done here. Mine by default, Everyone's on a toggle. The personal app's allowlist is unchanged: it never sends
// approval_answer, handoff_answer or a lesson action, so those rows say where to act, with the command to copy, and no
// button pretends to. If the allowlist ever took approval_answer, Approve and Reject open a confirm sheet with the full text.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_appinbox.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const task=(id,o)=>({id,title:'Task '+id,goal:'Task '+id,state:'claimed',claimer:'w-'+id,from:'s-alice',from_user:'alice',worker:'codex',to:'any',project:'acme/web',stage:'implement',source:'interactive',updated_ago:'1m',dispatched:true,mine:true,attempts:[{tool:'codex',running:true,usd:0.5}],...o});
const list=[
 task('hof-a1',{title:'Rename the billing export columns',mark:'needs_you'}),
 task('hof-f1',{title:'Upgrade the database driver',mark:'failed',attempts:[{tool:'codex',running:false,end_reason:'failed',usd:1}]}),
 task('hof-q1',{title:'Keep the old column names',mark:'needs_you',worker_state:'waiting_answer'}),
 task('hof-b1',{title:'Remove the unused flags',mark:'needs_you',worker_state:'blocked'}),
 task('hof-w1',{title:'Working quietly',mark:'working'}),
 task('hof-x1',{title:'Bob’s rollout',from:'s-bob',from_user:'bob',mine:false,mark:'needs_you'})];
const longAsk='Open a draft PR for the billing export rename: gh pr create --draft --base main --title "Rename the billing export columns" --body "Renames three columns and keeps aliases for one release" '+evil;
const waiting=[
 {what:'approval',ref:'apr-1',title:longAsk,from:'w-hof-a1',handoff:'hof-a1',can_answer:true,age:'4m',mine:true},
 {what:'approval',ref:'apr-2',title:'Push the rollout branch',from:'w-hof-x1',handoff:'hof-x1',can_answer:true,age:'9m',mine:false}];
const lesson={id:'lesson:lsn-a1',kind:'lesson',title:'Lesson proposed (seen 3 time(s)): Check stopped at its time limit (10m0s)',from:'agentd',age:'2h',mine:true,lesson:'lsn-a1',count:3,lesson_state:'proposed',lesson_version:1,
 lesson_text:{title:'Check stopped at its time limit',happened:'The check ran out of time',why:'The suite is slow',next:'Raise the check limit'}};
const inbox=[
 {id:'failed:hof-f1:1',kind:'failed',title:'codex worker failed: check failed (3 tests)',failure:'check failed (3 tests)',handoff:'hof-f1',from:'w-hof-f1',age:'20m',mine:true},
 {id:'question:hof-q1:1',kind:'question',title:'codex worker asks: Keep the old column names as aliases for one release?',handoff:'hof-q1',from:'w-hof-q1',claimer:'w-hof-q1',worker:'codex',age:'6m',mine:true,next_step:'agentd handoff answer hof-q1 --text "..."'},
 lesson];
const base={user:'alice',role:'owner',now,handoff_list:list,done:[],sessions:[],left:[],unlinked:[],inbox,waiting,claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:[],dispatch:true};
let snap={...base,mode:'app',watchdog:{running:true,start:'agentd install'},spend_today:{usd:1,workers:1,unpriced:0,pending:0,user:'alice'}};
const posts=[],copied=[],errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21470/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async t=>{copied.push(t)}},configurable:true});
 w.fetch=async(url,o)=>{const u=new URL(url,w.location.href);let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/action'){posts.push(JSON.parse(o.body));body={ok:true}}
  else if(u.pathname==='/api/dash')body=snap;
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const $=id=>doc.getElementById(id),q=(s,n)=>(n||doc).querySelector(s),qa=(s,n)=>[...(n||doc).querySelectorAll(s)],body=doc.body;
const shown=n=>{for(let x=n;x&&x!==doc;x=x.parentElement)if(x.hidden)return false;return w.getComputedStyle(n).display!=='none'};
const click=n=>{assert(n,'nothing to click');n.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}))};
const page=()=>$('app-page'),rows=()=>qa('#app-page .ap-need'),rowOf=id=>rows().find(n=>n.dataset.id===id),btns=n=>qa('button',n).map(b=>b.textContent);
const openLeft=async()=>{if(phone&&!body.classList.contains('app-left-open')){click(q('#app-shell [data-app-action="toggle-left"]'));await tick()}};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));assert(body.classList.contains('app-mode'),'app mode is not on');await openLeft();
 // The nav: Search, Home, Tasks, Inbox, Triggers, in that order (an owner sees Triggers).
 const nav=qa('#app-shell .app-nav > button').filter(shown).map(n=>n.textContent.replace(/\d+$/,'').trim());
 assert.deepEqual(nav,['Search','Home','Tasks','Inbox','Triggers'],'nav: '+nav);
 const navInbox=q('#app-shell [data-app-nav="inbox"]');assert.equal($('app-inbox-count').textContent,'5','the Inbox row counts mine');assert(/Inbox, 5 waiting on you/.test(navInbox.getAttribute('aria-label')));
 // The nav row opens the page over the centre, the window title says so, and on a phone the drawer gives way.
 click(navInbox);await settle();
 assert(page()&&shown(page())&&body.classList.contains('app-paged'),'the Inbox page did not open');assert.equal(navInbox.getAttribute('aria-current'),'page');
 assert.equal(q('.app-phead h2',page()).textContent,'Inbox');assert.equal(doc.title,'Inbox · LibraOS Engine');
 if(phone)assert(!body.classList.contains('app-left-open'),'the drawer stays over the Inbox');
 assert.equal(q('#app-shell [data-app-action="bell"]').getAttribute('aria-pressed'),'true','the bell does not show the Inbox is open');
 // Mine by default: blocked first, then failed, the approval, the question and the lesson; never Bob's approval.
 const scope=k=>q('[data-inbox-scope="'+k+'"]',page());
 assert.equal(scope('mine').getAttribute('aria-pressed'),'true');assert.equal(scope('all').getAttribute('aria-pressed'),'false');
 assert.deepEqual(rows().map(n=>n.dataset.kind),['blocked','failed','approval','question','lesson'],'rows: '+rows().map(n=>n.dataset.kind));
 assert(!rowOf('apr-2'),'Bob’s approval is in Mine');
 const kinds=rows().map(n=>q('.ap-ntext b',n).textContent);assert.deepEqual(kinds,['Worker blocked','Could not finish','Approval','Question','Lesson']);
 // Full text: the approval is whole (no cut, no ellipsis), text and not markup; the CSS never clips it.
 const a1=rowOf('apr-1');assert.equal(q('.ap-ntext',a1).textContent,'Approval '+longAsk,'the approval is cut: '+q('.ap-ntext',a1).textContent);
 assert(!q('img',page()),'a title became markup');
 const css=[...doc.querySelectorAll('style')].map(n=>n.textContent).join('\n'),block=css.slice(css.indexOf('/* region:css-app-inbox'),css.indexOf('/* end:css-app-inbox */'));
 assert(block.length>400&&!/text-overflow|nowrap|line-clamp/.test(block),'the Inbox CSS clips text');
 assert(/var\(--o-card\)/.test(block)&&/var\(--o-fg\)/.test(block)&&!/#[0-9a-f]{3,6}\b/i.test(block),'the Inbox CSS does not follow the app theme');
 assert(/Task: Rename the billing export columns/.test(a1.textContent),'the approval does not name its task');
 // The personal app never answers an approval: no Approve or Reject, but where to answer it and the commands to copy.
 assert(!btns(a1).includes('Approve')&&!btns(a1).includes('Reject'),'the app offers an answer it cannot send: '+btns(a1));
 const where=q('[data-where="approval"]',a1);assert(where&&/does not answer approvals/.test(where.textContent)&&/in the dash, or at your own terminal/.test(where.textContent),'no where for apr-1');
 assert.deepEqual(qa('code',where).map(c=>c.textContent),['libraos-engine approval answer apr-1 --approve','libraos-engine approval answer apr-1 --reject']);
 click(qa('.ap-copy',where)[0]);await settle();assert.deepEqual(copied,['libraos-engine approval answer apr-1 --approve']);
 // The question: answered at a terminal (handoff_answer is not on the app's allowlist), and its task opens.
 const q1=rowOf('question:hof-q1:1');assert(/Keep the old column names as aliases for one release\?/.test(q1.textContent));
 assert.deepEqual(qa('[data-where="question"] code',q1).map(c=>c.textContent),['libraos-engine handoff answer hof-q1 --text "..."']);
 // The lesson: Show reads it; approve and reject are an owner's in the dash or at the host, not here.
 const l1=rowOf('lesson:lsn-a1');assert.deepEqual(btns(l1).filter(t=>t!=='Copy'),['Show'],'lesson buttons: '+btns(l1));
 assert(/The app does not decide lessons/.test(l1.textContent));assert.deepEqual(qa('[data-where="lesson"] code',l1).map(c=>c.textContent),['libraos-engine lesson approve lsn-a1','libraos-engine lesson reject lsn-a1']);
 click(qa('button',l1).find(b=>b.textContent==='Show'));await settle();let dlg=q('dialog.sheet');assert(dlg&&dlg.open&&/Raise the check limit/.test(dlg.textContent),'Show does not read the lesson');
 click(qa('button',dlg).find(b=>b.textContent==='Close'));await settle();
 // The failed worker says why in full; the blocked one opens its task.
 const f1=rowOf('failed:hof-f1:1');assert(/Check failed \(3 tests\)/.test(f1.textContent),'failed: '+f1.textContent);
 const b1=rows().find(n=>n.dataset.kind==='blocked');assert(/Remove the unused flags/.test(b1.textContent));
 click(qa('button',b1).find(b=>b.textContent==='Open task'));await settle();
 assert.equal($('app-shell').dataset.task,'hof-b1','Open task did not open it');assert(!shown(page()),'the Inbox still covers the task');
 // The bell opens it again, and again closes it.
 await openLeft();const bell=q('#app-shell [data-app-action="bell"]');click(bell);await settle();assert(shown(page())&&q('.app-phead h2',page()).textContent==='Inbox','the bell does not open the Inbox');
 // Everyone's: Bob's approval too, which I may answer elsewhere; the choice is not a filter on the badge.
 click(scope('all'));await settle();assert.equal(scope('all').getAttribute('aria-pressed'),'true');assert(rowOf('apr-2'),'Everyone’s lacks Bob’s approval');
 assert(/Task: Bob’s rollout/.test(rowOf('apr-2').textContent));assert.equal($('app-inbox-count').textContent,'5');
 click(scope('mine'));await settle();assert(!rowOf('apr-2'),'Mine came back with Bob’s approval');
 // A redraw (the 10 s refresh) keeps the page and its scope.
 click(scope('all'));await settle();w.eval('appSidebar(lastDash)');await tick();assert(rowOf('apr-2')&&scope('all').getAttribute('aria-pressed')==='true','a redraw lost the scope');click(scope('mine'));await settle();
 // Nothing was written: no approval_answer, no lesson action, no handoff_answer.
 assert.deepEqual(posts,[],'the Inbox wrote: '+JSON.stringify(posts));
 // Home in the app offers no answer it cannot send either.
 w.eval("appPage('home')");await settle();assert(!qa('#app-page button').some(b=>/^Approve|^Reject$/.test(b.textContent)),'Home offers Approve or Reject in the app');
 w.eval("appPage('inbox')");await settle();
 // If the app's allowlist ever took approval_answer, Approve opens the confirm sheet with the request's full text.
 w.eval("APP_ACTIONS.add('approval_answer');appInboxPage()");await tick();
 click(qa('button',rowOf('apr-1')).find(b=>b.textContent==='Approve'));await settle();dlg=q('dialog.sheet');
 assert(dlg&&dlg.open&&/Approve this request/.test(dlg.textContent)&&dlg.textContent.includes(longAsk),'the confirm sheet does not show the full request: '+(dlg&&dlg.textContent));
 click(qa('button',dlg).find(b=>b.textContent==='Cancel'));await settle();
 click(qa('button',rowOf('apr-1')).find(b=>b.textContent==='Reject'));await settle();dlg=q('dialog.sheet');
 assert(dlg&&dlg.open&&/Reject this request/.test(dlg.textContent)&&dlg.textContent.includes(longAsk),'the reject sheet does not show the full request');
 click(qa('button',dlg).find(b=>b.textContent==='Cancel'));await settle();assert.deepEqual(posts,[],'Cancel wrote');
 w.eval("APP_ACTIONS.delete('approval_answer');appInboxPage()");await tick();
 // Escape closes the page.
 doc.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await settle();assert(!shown(page()),'Escape does not close the Inbox');
 // Empty: nothing of mine, but something of everyone's, says so; nothing at all says what shows here.
 snap={...snap,inbox:[],waiting:[waiting[1]],handoff_list:list.filter(h=>!h.mine||h.mark==='working')};await w.eval('refresh()');await settle();
 click(navInbox);await settle();assert(/Nothing waits on you/.test(page().textContent)&&/Everyone’s has 1 item/.test(page().textContent),'empty mine: '+page().textContent);
 assert($('app-inbox-count').hidden,'the Inbox row counts nothing');
 snap={...snap,waiting:[],handoff_list:[list[4]]};await w.eval('refresh()');await settle();
 click(scope('all'));await settle();assert(/Nothing waits on anyone/.test(page().textContent),'empty all: '+page().textContent);
 assert(!errors.length,errors.join('\n'));
 w.close();
 console.log('dash_appinbox: ok ('+(phone?'phone':'desktop')+', '+(process.env.DASH_UI_THEME||'light')+')');
})().catch(e=>{console.error(e);process.exit(1)});
