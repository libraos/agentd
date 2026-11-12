// Layout fixes on the put-together redesign (#489), as far as jsdom can see them:
// Tasks has no second panel (panel:false): its views, with counts of open tasks,
// and its project filter, with counts in its options, are in the board's filter
// row, and addresses that pick a view or a project still work. Board card titles
// wrap at spaces, not inside a word. An open task's top bar is not the shell's
// header (which is one 44px row): its status line and its tabs are separate rows.
// The three "need you" numbers say what each counts: the Agents list tasks, the
// board's strip the tasks on the board, the Inbox badge Inbox items.
// Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_layout.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString();
const base={from:'s-alice',from_user:'alice',to:'any',updated_ago:'1m',age:'1m'};
const run={...base,id:'hof-run',goal:'Finish validation and installation of the new worker',project:'acme/alpha',state:'claimed',claimer:'s-w',worker:'claude',dispatched:true,may_stop:true,branch:'agentd/hof-run',change:{files:1,added:3,deleted:1},spend:{minutes:11,usd:2.71},attempts:[{tool:'claude',model:'m',running:true,minutes:11,usd:2.71}],mark:'working'};
const ask={...base,id:'hof-ask',goal:'A worker that asks something',project:'acme/alpha',state:'claimed',claimer:'s-a',worker:'claude',dispatched:true,worker_state:'blocked',mark:'needs_you'};
const todo={...base,id:'hof-todo',goal:'Not started yet',project:'acme/beta',state:'offered',mark:'not_started'};
const bob={...base,id:'hof-bob',goal:'Bob\'s task',from_user:'bob',from:'s-bob',project:'acme/beta',state:'offered',mark:'not_started'};
const sessions=[{id:'s-w',tool:'claude',status:'active',host_state:'busy',cwd:'/srv/alpha',user:'alice'}];
// Two Inbox items on one task: the Agents list counts the task once, the Inbox both items.
const inbox=[{id:'blocked:hof-ask',kind:'blocked',title:'worker asks',handoff:'hof-ask',from:'s-a',at:now},{id:'approval:ap-1',what:'approval',kind:'approval',ref:'ap-1',title:'push?',handoff:'hof-ask',from:'s-a',at:now}];
const dash={user:'alice',role:'owner',now,handoff_list:[run,ask,todo,bob],done:[],sessions,left:[],waiting:[],claims:[],messages:[],inbox,dispatch:true,checkouts:['/srv/alpha'],terminal:false,handoff_sources:['interactive'],handoff_stages:['implement']};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=body=>({ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)});
function load(url){return new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async url=>{const u=new URL(url,w.location.href),id=u.searchParams.get('id');
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/issues')return json({issues:[]});
  if(u.pathname==='/api/issue'){const ref=u.searchParams.get('ref'),h=dash.handoff_list.find(x=>x.id===ref);return json({kind:'handoff',ref,title:h.goal,body:{goal:h.goal},tree:[{...h,focus:true,log:[]}],prs:[]})}
  if(u.pathname==='/api/review')return json({handoff:id,enabled:true,branch:null,why_not:'none'});
  if(u.pathname==='/api/taskmsg')return json({may:true,live:true});
  if(u.pathname==='/api/team')return json({roles:[],members:[],handoff_roles:{}});
  return json({})}}})}
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
(async()=>{
 let dom=load('http://127.0.0.1:21620/#issues?view=all&layout=board'),w=dom.window,doc=w.document;await settle();
 const go=async h=>{w.location.hash=h;await settle()};
 assert(!errors.length,errors.join('\n'));
 // Tasks has no second panel, like Inbox and Team; its element stays, empty.
 assert.equal(w.eval("PAGES.issues.panel"),false,'Tasks still has a second panel');assert(doc.body.classList.contains('no-panel'),'the page lays out with a panel');
 const pi=doc.getElementById('panel-issues');assert(pi&&!pi.children.length,'the Tasks panel element is gone or not empty');
 // The views, with counts of open tasks, are a control in the board's filter row.
 const row=doc.getElementById('wfilter'),views=doc.getElementById('issue-views');assert(views&&row.contains(views),'the views are not in the filter row');
 assert(!doc.getElementById('side').contains(views),'the views are still in the panel');
 const vs=()=>[...views.querySelectorAll('button[data-view]')].map(b=>[b.dataset.view,b.querySelector('span').textContent,b.querySelector('[data-view-n]').textContent,b.getAttribute('aria-pressed')]);
 assert.deepEqual(vs(),[['needs','Needs attention','1','false'],['mine','Started by me','3','false'],['agents','Running now','1','false'],['all','All','4','true']]);
 // The projects are the project filter, each with its count; picking one narrows the board and the address.
 const pick=doc.getElementById('issue-projects');assert(pick&&row.contains(pick)&&pick.tagName==='SELECT','the projects are not a filter in the row');
 assert.deepEqual([...pick.options].map(o=>[o.value,o.textContent]),[['','All projects · 4'],['acme/alpha','acme/alpha · 2'],['acme/beta','acme/beta · 2']]);
 assert.equal(pick.options[1].title,'acme/alpha: 2 open, 0 finished');
 pick.value='acme/beta';pick.dispatchEvent(new w.Event('change'));await settle();
 assert(/project=acme%2Fbeta/.test(w.location.hash),'the project is not in the address: '+w.location.hash);
 const titles=()=>[...doc.querySelectorAll('#board .kcard .ktitle')].map(t=>t.textContent).join('|');
 assert(/Not started yet/.test(titles())&&!/asks something/.test(titles()),'the project filter did not narrow the board: '+titles());
 // A view counts within the chosen project; choosing one is in the address.
 assert.deepEqual(vs().map(v=>v[2]),['','1','','2']);
 views.querySelector('[data-view="mine"]').click();await settle();assert(/view=mine/.test(w.location.hash));assert.equal(views.querySelector('[aria-pressed=true]').dataset.view,'mine');
 assert.equal(pick.options[2].textContent,'acme/beta · 1','a project counts within the chosen view');
 // Addresses that pick a view or a project keep working, as on a reload.
 await go('#issues?view=needs&project=acme%2Falpha&layout=board');
 assert.equal(views.querySelector('[aria-pressed=true]').dataset.view,'needs');assert.equal(pick.value,'acme/alpha');assert(/asks something/.test(titles())&&!/Finish validation/.test(titles()),'view and project from the address: '+titles());
 // Card titles wrap at spaces: the board's later rule replaces overflow-wrap:anywhere.
 const css=[...doc.querySelectorAll('style')].map(s=>s.textContent).join('\n'),at=css.indexOf('overflow-wrap:anywhere;color:var(--fg)}'),fix=css.indexOf('.ktitle{overflow-wrap:break-word;word-break:normal}');
 assert(at>=0&&fix>at,'card titles can still break inside a word');assert(/\.kcol \.ktop\{flex-wrap:wrap/.test(css),'a card\'s title and state do not wrap as a row');
 // The strip counts the tasks on this board, and says so.
 await go('#issues?view=all&layout=board');
 const strip=doc.querySelector('#mark-strip-box .mark-strip');assert.equal(strip.getAttribute('aria-label'),'Tasks on this board by mark');
 const need=strip.querySelector('[data-mark-pick="needs_you"]');assert.equal(need.querySelector('.n').textContent,'1');
 assert(/1 task on this board \(its view, project and filters\) marked Needs you/.test(need.title)&&/Agents list counts every open task/.test(need.title)&&/Inbox counts items, not tasks/.test(need.title),'the strip does not say what it counts: '+need.title);
 // The Agents list counts tasks, each once; the Inbox badge counts Inbox items (here two on that one task).
 if(!phone){const c=doc.getElementById('agents-counts');assert.equal(c.textContent,'1 task needs you1 working0 waiting');assert(/each counted once/.test(c.firstChild.title)&&/Inbox badge counts Inbox items/.test(c.firstChild.title),'the Agents list does not say what it counts')}
 const badge=doc.getElementById('inbox-badge');assert.equal(badge.textContent,'2');assert(/^2 Inbox items need you\b/.test(badge.title),badge.title);assert(/^Inbox, 2 items need you\b/.test(doc.querySelector('[data-rail="inbox"]').getAttribute('aria-label')));
 // An open task's top bar: not the shell's header element, the status line and the tabs on their own rows.
 await go('#issues/hof-run');
 const top=doc.querySelector('#issue-detail .tw-top');assert(top,'no top bar');assert.notEqual(top.tagName,'HEADER','the top bar is a header, so the shell\'s 44px one-row header rule applies to it');
 assert(!top.closest('header'),'the top bar is inside a header');
 const bar=top.querySelector(':scope > .tw-bar'),status=bar&&bar.querySelector(':scope > .tw-status');assert(status&&/agentd\/hof-run/.test(status.textContent),'no status line row in the top bar');
 const tabs=doc.querySelector('#issue-detail .tw-main > .tw-tabs');assert(tabs&&!top.contains(tabs)&&!status.contains(tabs),'the tabs share the status line\'s row');
 assert(top.compareDocumentPosition(tabs)&w.Node.DOCUMENT_POSITION_FOLLOWING,'the tabs are not below the top bar');
 const cs=w.getComputedStyle(top);assert.notEqual(cs.position,'sticky');assert.notEqual(cs.height,'44px');assert.equal(cs.display,'grid');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_layout: ok');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
