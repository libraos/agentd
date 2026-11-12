// The dash's search box (#450): the top bar button and Ctrl+K open it, results
// come grouped by kind as text, arrows move, Enter opens the hit's place, Escape
// closes. Run via TestDashUIDOM (DASH_UI_DOM_MODULE=/path/to/jsdom), in the
// phone and desktop layouts, light and dark.
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),errors=[],requests=[],evil='<img src=x onerror=alert(1)>';
const dash={user:'alice',role:'owner',now,handoff_list:[],handoff_sources:[],handoff_stages:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],done:[],runs:[],host_states:{},counts:{},handoffs:{},checkouts:[]};
const task={kind:'handoff',ref:'hof-abc123',title:'Rotate the flamingo ledger keys',state:'claimed',snippet:'Rotate the flamingo ledger keys before Friday'};
const results={
 'hof-abc123':[task],
 'flamingo rotate':[{kind:'msg',ref:'msg-1',session:'claude-alice',snippet:'flamingo '+evil},{kind:'run',ref:'run-9',title:'app main',state:'fail',snippet:'flamingo run'},task,{kind:'pr',ref:'acme/repo#7',title:'Rotate keys '+evil,state:'OPEN',snippet:'flamingo pr'},{kind:'issue',ref:'acme/repo#5',title:'Flamingo keys',state:'OPEN',snippet:'flamingo issue'}],
 'nothing':[]};
let status=200;
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#inbox',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{}]};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{requests.push({url:String(url),headers:opts.headers||{}});const u=new URL(url,w.location.href);let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/search'){if(status!==200)return {ok:false,status,json:async()=>({}),text:async()=>'this dash is public: reads need the token\n'};body={query:u.searchParams.get('q'),results:results[u.searchParams.get('q')]||[]}}
  else if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/issue'||u.pathname==='/api/workitem')body={kind:'handoff',ref:'hof-abc123',title:task.title,body:{goal:task.title},tree:[{id:'hof-abc123',goal:task.title,state:'claimed',focus:true}],prs:[]};
  else if(u.pathname==='/api/issues')body={issues:[]};
  return {ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)}};
}});
const w=dom.window,d=w.document,$=id=>d.getElementById(id),tick=(ms=25)=>new Promise(r=>setTimeout(r,ms));
const key=(target,k,o={})=>target.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true,...o}));
const type=async q=>{const i=$('search-input');i.value=q;i.dispatchEvent(new w.Event('input',{bubbles:true}));await tick(220);await tick()};
const searches=()=>requests.filter(r=>r.url.startsWith('/api/search'));
const selected=()=>d.querySelector('#search-list [aria-selected="true"]');
(async()=>{
 await tick();await tick();assert(!errors.length,errors.join('\n'));
 // The top bar has the button; on a phone the box opens full width.
 const open=$('search-open');assert(open,'no search button in the top bar');assert(open.closest('header'));assert.equal(open.getAttribute('aria-keyshortcuts'),'Control+K Meta+K');
 const css=[...d.querySelectorAll('style')].map(n=>n.textContent).join('\n');
 assert(/@media\(max-width:860px\)\{[^\n]*\.search-box\{inset:0;width:100%;max-width:none;height:100dvh/.test(css),'phone layout does not open the box full width');
 assert(/@media\(max-width:860px\)\{\.search-open\{min-width:44px/.test(css),'phone search button is not a 44px target');

 // Ctrl+K opens it with the focus in the box; typing a handoff id lists that task, Enter opens it.
 key(d.body,'k',{ctrlKey:true});const box=$('search-box');assert(box&&box.open,'Ctrl+K did not open the search box');assert.equal(d.activeElement,$('search-input'));
 await type('hof-abc123');assert.equal(searches().at(-1).url,'/api/search?q=hof-abc123');assert.equal(searches().at(-1).headers['X-Dash-Token'],'fixture');
 assert.equal(d.querySelector('.search-group-name').textContent,'Tasks · 1');let s=selected();assert(s,'first hit is not selected');assert.equal(s.dataset.ref,'hof-abc123');assert(s.textContent.includes(task.title));
 assert.equal($('search-input').getAttribute('aria-activedescendant'),s.id);assert.equal($('search-input').getAttribute('aria-expanded'),'true');
 key($('search-input'),'Enter');assert(!box.open,'Enter did not close the box');assert.equal(w.location.hash,'#issues/hof-abc123');await tick();await tick();
 assert(requests.some(r=>r.url.startsWith('/api/issue?ref=hof-abc123')),'the task did not open');

 // Two words: grouped by kind in a fixed order, as text; a run has no page and is not an option to open.
 key(d.body,'K',{metaKey:true});assert(box.open,'Cmd+K did not open the box');await type('flamingo rotate');
 assert.deepEqual([...d.querySelectorAll('.search-group-name')].map(n=>n.textContent),['Tasks · 1','Pull requests · 1','Issues · 1','Runs · 1','Messages · 1']);
 assert(!$('search-list').querySelector('img'),'result markup became live DOM');assert($('search-list').textContent.includes(evil));
 const run=d.querySelector('[data-kind="run"]');assert.equal(run.getAttribute('aria-disabled'),'true');assert(run.textContent.includes('no page in the dash'));
 // Arrows move through the hits that open, wrapping, skipping the run.
 assert.equal(selected().dataset.kind,'handoff');key($('search-input'),'ArrowDown');assert.equal(selected().dataset.kind,'pr');
 key($('search-input'),'ArrowDown');key($('search-input'),'ArrowDown');assert.equal(selected().dataset.kind,'msg','arrows did not skip the run');
 key($('search-input'),'ArrowDown');assert.equal(selected().dataset.kind,'handoff','ArrowDown did not wrap');key($('search-input'),'ArrowUp');assert.equal(selected().dataset.kind,'msg','ArrowUp did not wrap');
 assert.equal(d.querySelectorAll('#search-list [aria-selected="true"]').length,1);
 key($('search-input'),'ArrowUp');key($('search-input'),'ArrowUp');assert.equal(selected().dataset.kind,'pr');
 key($('search-input'),'Enter');assert(!box.open);assert.equal(w.location.hash,'#issues/acme/repo/7','a PR opens on its Issues page');
 // A message opens its session's console.
 key(d.body,'k',{ctrlKey:true});await type('flamingo rotate');key($('search-input'),'ArrowUp');assert.equal(selected().dataset.kind,'msg');key($('search-input'),'Enter');await tick();
 assert(requests.some(r=>r.url.startsWith('/api/session?id=claude-alice')),'the message did not open its session');assert(new URLSearchParams(w.location.hash.split('?')[1]).get('console'),'claude-alice');w.eval('closeHistory()');await tick();

 // Escape closes it and gives the focus back to what opened it.
 open.focus();open.click();assert(box.open);await type('nothing');assert(!selected());assert.equal(d.querySelectorAll('#search-list [role="option"]').length,0);assert(/Nothing found/.test($('search-status').textContent));
 key($('search-input'),'Enter');assert(box.open,'Enter with nothing to open closed the box');
 key($('search-input'),'Escape');assert(!box.open,'Escape did not close the box');assert.equal(d.activeElement,open);
 // A refused read says so instead of listing anything.
 status=401;open.click();await type('hof-abc123');assert(/Sign in to search/.test($('search-status').textContent));assert.equal(d.querySelectorAll('#search-list [role="option"]').length,0);status=200;key($('search-input'),'Escape');
 // Ctrl+K does not open over a sheet that is already open.
 w.eval("activeSheet={dialog:null,cancel(){}}");key(d.body,'k',{ctrlKey:true});assert(!box.open,'search opened over a sheet');w.eval('activeSheet=null');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_search ok');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
