// libraos/agentd-core#566: notifications and keyboard shortcuts in the personal app (/api/dash mode "app").
// Notifications reuse #468's permission and memory: with permission and the tab in the background, a task
// of mine that turns to needs you, done, or failed (its check, or its worker) raises exactly one
// notification (title and task, as text), never again on a refresh, a reload or in a second tab; the first
// look only remembers; none with the tab in front, none for another person's task, none without
// permission; clicking one opens the task. Shortcuts follow the reference app's (SPEC.md §8, Mod = Ctrl here): Mod+1…9,
// Mod+Shift+Up/Down and Mod+Shift+0 for the task list, Alt+1…9, Mod+Shift+]/[, Mod+Alt+]/[, Mod+T and
// Mod+W for the workspace tabs, Mod+Shift+E/G for Files and Changes, Mod+N for New task; ? opens the app's
// own overlay (also from Help's Keyboard shortcuts), not the team server's; nothing fires while typing.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_appkeys.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const html=fs.readFileSync(process.argv[2],'utf8'),phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const task=(id,o)=>({id,title:'Task '+id,goal:'Task '+id,state:'claimed',claimer:'w-'+id,from:'s-alice',from_user:'alice',worker:'claude',worker_tool:'claude',to:'any',project:'acme/web',stage:'implement',source:'interactive',updated_ago:'1m',dispatched:now,mine:true,mark:'working',check:'go test ./...',attempts:[{tool:'claude',running:true,usd:0.5}],...o});
let list,done;
function reset(){list=[task('hof-a',{title:'Fix login '+evil}),task('hof-b'),task('hof-c'),task('hof-bob',{from:'s-bob',from_user:'bob',mine:false})];done=[]}
reset();
const snap=(mode)=>({user:'alice',role:'owner',now,mode:mode||'app',watchdog:{running:true},spend_today:{usd:1,workers:1,unpriced:0,pending:0},handoff_list:list,done,sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:['/r/web'],dispatch:true,terminal:true});
// One browser: page loads over a localStorage that outlives them (a reload, or a second tab, is a new page on the same store).
function browser(){const store=new Map(),shown=[];let permission='granted',hidden=true;
  function load(o={}){const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
    const dom=new JSDOM(html,{url:'http://127.0.0.1:21470/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
      w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');for(const [k,v] of store)w.localStorage.setItem(k,v);
      const P=w.Storage.prototype,set=P.setItem,del=P.removeItem;P.setItem=function(k,v){if(this===w.localStorage)store.set(k,String(v));return set.call(this,k,v)};P.removeItem=function(k){if(this===w.localStorage)store.delete(k);return del.call(this,k)};
      if(o.mac)Object.defineProperty(w.navigator,'platform',{configurable:true,get:()=>'MacIntel'});
      w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.focus=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
      w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
      w.WebSocket=class{constructor(u){this.url=u;this.readyState=0}send(){}close(){this.readyState=3}};w.Terminal=class{open(){}onData(){}resize(){}write(){}focus(){}dispose(){}};
      Object.defineProperty(w.document,'hidden',{configurable:true,get:()=>hidden});
      class N{constructor(title,opts){this.title=title;this.opts=opts||{};this.closed=false;shown.push(this)}close(){this.closed=true}static get permission(){return permission}static requestPermission(){return Promise.resolve(permission)}}w.Notification=N;
      w.fetch=async(url)=>{const u=new URL(url,w.location.href);let body={};
        if(u.pathname==='/api/auth')return {ok:true,status:204};
        if(u.pathname==='/api/dash')body=snap(o.mode);
        else if(u.pathname==='/api/taskmsg')body={may:true,live:true};
        else if(u.pathname==='/api/log')body={lines:[],running:true};
        else if(u.pathname==='/api/workitem')body={tree:[{id:u.searchParams.get('ref'),log:[]}]};
        return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
    return {w:dom.window,doc:dom.window.document,errors}}
  return {load,shown,store,set permission(v){permission=v},set hidden(v){hidden=v}}}
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<5;i++)await tick()};
const refresh=async w=>{await w.eval('refresh()');await settle()};
const set=(id,o)=>{const i=list.findIndex(h=>h.id===id);list[i]={...list[i],...o}};
const key=(w,k,o={})=>{const t=o.target||w.document.activeElement||w.document.body,e=new w.KeyboardEvent('keydown',{key:k,code:o.code||'',bubbles:true,cancelable:true,ctrlKey:!!o.ctrl,metaKey:!!o.meta,shiftKey:!!o.shift,altKey:!!o.alt});t.dispatchEvent(e);return e};
(async()=>{
 // --- Notifications ---------------------------------------------------------------------------
 const b=browser();let {w,doc,errors}=b.load();await settle();assert(!errors.length,errors.join('\n'));assert(doc.body.classList.contains('app-mode'),'app mode is off');
 assert.equal(b.shown.length,0,'the first look raised a notification');assert(b.store.has('dash-app-notified:alice'),'the first look remembered nothing');
 await refresh(w);assert.equal(b.shown.length,0,'a refresh with nothing new raised one');
 // Needs you: one notification, title and task as text, tagged per task and event.
 set('hof-a',{mark:'needs_you',worker_state:'blocked'});await refresh(w);
 assert.equal(b.shown.length,1,'needs you raised '+b.shown.length);let n=b.shown[0];
 assert.equal(n.title,'Needs you');assert(n.opts.body.includes('Fix login')&&n.opts.body.includes('<img'),'the body is not the task title as text: '+n.opts.body);assert.equal(n.opts.tag,'agentd-app-hof-a:needs_you');
 await refresh(w);await refresh(w);assert.equal(b.shown.length,1,'a refresh repeated it');
 // A reload, or a second tab on the same browser, does not repeat it.
 ({w,doc,errors}=b.load());await settle();assert(!errors.length,errors.join('\n'));assert.equal(b.shown.length,1,'a reload repeated it');
 const tab2=b.load();await settle();assert.equal(b.shown.length,1,'a second tab repeated it');tab2.w.close();
 // Its check failed: "Check failed", with the check's result.
 set('hof-b',{mark:'failed',attempts:[{tool:'claude',running:false,end_reason:'done',check:'failed: 2 tests'}]});await refresh(w);
 assert.equal(b.shown.length,2,'check failed raised '+(b.shown.length-1));n=b.shown[1];assert.equal(n.title,'Check failed');assert(/Task hof-b/.test(n.opts.body)&&/failed: 2 tests/.test(n.opts.body),n.opts.body);
 await refresh(w);assert.equal(b.shown.length,2,'check failed repeated');
 // Done: the task leaves the open list for today's done list.
 list=list.filter(h=>h.id!=='hof-c');done=[{what:'handoff',ref:'hof-c',title:'Task hof-c',from_user:'alice',mine:true,project:'acme/api',failed:false,mark:'done',check:'passed',end_reason:'done'}];await refresh(w);
 assert.equal(b.shown.length,3,'done raised '+(b.shown.length-2));assert.equal(b.shown[2].title,'Task done');assert(/Task hof-c/.test(b.shown[2].opts.body));
 await refresh(w);({w,doc}=b.load());await settle();assert.equal(b.shown.length,3,'done repeated');
 // A worker that ended badly (not its check) is "Task failed".
 done=[...done,{what:'handoff',ref:'hof-x',title:'Task hof-x',from_user:'alice',mine:true,project:'acme/web',failed:true,mark:'failed',check:null,end_reason:'lost'}];await refresh(w);
 assert.equal(b.shown.length,4,'a failed worker raised '+(b.shown.length-3));assert.equal(b.shown[3].title,'Task failed');
 // Another person's task never raises one.
 set('hof-bob',{mark:'needs_you',worker_state:'blocked'});await refresh(w);assert.equal(b.shown.length,4,'another person’s task raised one');
 // Needing me again after going back to work is a new event.
 set('hof-a',{mark:'working',worker_state:null});await refresh(w);set('hof-a',{mark:'needs_you',worker_state:'blocked'});await refresh(w);
 assert.equal(b.shown.length,5,'needs you again did not raise');
 // Clicking a notification opens its task.
 b.shown[4].onclick();await settle();assert.equal(w.eval('APP.task'),'hof-a','the click did not open the task');assert(b.shown[4].closed,'the notification stayed open');
 // With the tab in front it is remembered, not shown, and not shown later either.
 b.hidden=false;set('hof-b',{mark:'needs_you',attempts:[]});await refresh(w);assert.equal(b.shown.length,5,'a tab in front raised one');
 b.hidden=true;await refresh(w);assert.equal(b.shown.length,5,'an event seen in front was raised later');
 // Without permission, or turned off in this browser (#468's switch), nothing is raised.
 b.permission='default';set('hof-b',{mark:'done'});await refresh(w);assert.equal(b.shown.length,5,'raised without permission');
 b.permission='granted';w.localStorage.setItem('dash-notify-off','1');set('hof-b',{mark:'failed',attempts:[{end_reason:'lost'}]});await refresh(w);assert.equal(b.shown.length,5,'raised while turned off');
 w.localStorage.removeItem('dash-notify-off');

 // --- Shortcuts -------------------------------------------------------------------------------
 reset();const k=browser();k.hidden=false;({w,doc,errors}=k.load());await settle();assert(!errors.length,errors.join('\n'));
 const $=id=>doc.getElementById(id),q=s=>doc.querySelector(s),qa=s=>[...doc.querySelectorAll(s)];
 const rows=()=>qa('#app-projects .app-task').map(n=>n.dataset.taskId),tabs=()=>qa('#app-tabs [role=tab]').map(t=>t.dataset.tab),curTab=()=>{const t=q('#app-tabs [aria-selected="true"]');return t&&t.dataset.tab};
 assert.deepEqual(rows(),['hof-a','hof-b','hof-c','hof-bob'],'unexpected list order: '+rows());
 // ? opens the app's overlay, listing the list's and the tabs' keys; it is not the team server's.
 let e=key(w,'?',{shift:true});await settle();assert(e.defaultPrevented,'? was not taken');
 let sh=$('app-keys-sheet');assert(sh&&sh.open,'? did not open the app’s shortcuts');assert(!$('keys-sheet'),'the team server’s sheet opened');
 for(const s of ['tasks','workspace','general'])assert(sh.querySelector('[data-keys="'+s+'"]'),'no '+s+' group');
 assert(/Previous or next task/.test(sh.textContent)&&/Next or previous tab/.test(sh.textContent)&&/New terminal tab/.test(sh.textContent),'the overlay misses list or tab keys');
 assert(qa('#app-keys-sheet kbd').some(n=>n.textContent==='Ctrl'),'keycaps are not Ctrl off a Mac');
 const before=$('app-keys-sheet');key(w,'1',{code:'Digit1',ctrl:true,target:before});await settle();assert.equal(w.eval('APP.task'),'','a key worked under the overlay');
 before.querySelector('.sheet-foot button:not([hidden])').click();await settle();assert(!$('app-keys-sheet'),'Close left the overlay');
 // Help's Keyboard shortcuts (keysSheet) opens the same overlay in app mode.
 w.keysSheet();await settle();assert($('app-keys-sheet'),'keysSheet opened another sheet in app mode');$('app-keys-sheet').querySelector('.sheet-foot button:not([hidden])').click();await settle();
 // Mod+1…9 opens that task in the list; Mod+Shift+Down/Up the next and previous, wrapping.
 e=key(w,'2',{code:'Digit2',ctrl:true});await settle();assert(e.defaultPrevented);assert.equal(w.eval('APP.task'),'hof-b','Ctrl+2');
 key(w,'ArrowDown',{ctrl:true,shift:true});await settle();assert.equal(w.eval('APP.task'),'hof-c','Ctrl+Shift+Down');
 key(w,'ArrowUp',{ctrl:true,shift:true});key(w,'ArrowUp',{ctrl:true,shift:true});await settle();assert.equal(w.eval('APP.task'),'hof-a','Ctrl+Shift+Up');
 key(w,'ArrowUp',{ctrl:true,shift:true});await settle();assert.equal(w.eval('APP.task'),'hof-bob','Ctrl+Shift+Up does not wrap');
 e=key(w,'9',{code:'Digit9',ctrl:true});assert(!e.defaultPrevented,'Ctrl+9 with no ninth task was taken from the browser');
 key(w,'1',{code:'Digit1',ctrl:true});await settle();assert.equal(w.eval('APP.task'),'hof-a');
 // Mod+Shift+0 focuses the task list on the open task.
 key(w,')',{code:'Digit0',ctrl:true,shift:true});await settle();assert.equal(doc.activeElement.dataset.taskId,'hof-a','Ctrl+Shift+0 did not focus the list');
 // Workspace tabs: Mod+T opens terminals, Alt+N picks tab N, Mod+Shift+]/[ walk all tabs, Mod+Alt+]/[ those of one kind, Mod+W closes.
 doc.body.focus();assert.deepEqual(tabs(),['session']);
 key(w,'t',{ctrl:true});await settle();key(w,'t',{ctrl:true});await settle();assert.deepEqual(tabs(),['session','term:1','term:2'],'Ctrl+T: '+tabs());assert.equal(curTab(),'term:2');
 doc.body.focus();key(w,'1',{code:'Digit1',alt:true});await settle();assert.equal(curTab(),'session','Alt+1');
 doc.body.focus();key(w,'3',{code:'Digit3',alt:true});await settle();assert.equal(curTab(),'term:2','Alt+3');
 doc.body.focus();key(w,'}',{code:'BracketRight',ctrl:true,shift:true});await settle();assert.equal(curTab(),'session','Ctrl+Shift+] wraps to Session');
 doc.body.focus();key(w,'{',{code:'BracketLeft',ctrl:true,shift:true});await settle();assert.equal(curTab(),'term:2','Ctrl+Shift+[');
 doc.body.focus();key(w,']',{code:'BracketRight',ctrl:true,alt:true});await settle();assert.equal(curTab(),'term:1','Ctrl+Alt+] stays among terminals');
 doc.body.focus();e=key(w,'w',{ctrl:true});await settle();assert(e.defaultPrevented);assert.deepEqual(tabs(),['session','term:2'],'Ctrl+W: '+tabs());
 doc.body.focus();key(w,'1',{code:'Digit1',alt:true});key(w,'w',{ctrl:true});await settle();assert.deepEqual(tabs(),['session','term:2'],'Ctrl+W closed Session');
 // Mod+Shift+G and E switch the right sidebar to Changes and Files.
 key(w,'G',{ctrl:true,shift:true});await settle();assert.equal(w.eval('APP.panel'),'changes','Ctrl+Shift+G');assert(!$('app-panel-changes').hidden);
 key(w,'E',{ctrl:true,shift:true});await settle();assert.equal(w.eval('APP.panel'),'files','Ctrl+Shift+E');
 // Another person's task has no terminal: Mod+T opens none.
 key(w,'4',{code:'Digit4',ctrl:true});await settle();assert.equal(w.eval('APP.task'),'hof-bob');doc.body.focus();key(w,'t',{ctrl:true});await settle();assert(!tabs().some(t=>t.startsWith('term:')),'a terminal opened on another person’s task');
 // Nothing fires while typing in a field.
 const ta=q('#app-tab-body textarea')||doc.body.appendChild(doc.createElement('textarea'));ta.focus();
 e=key(w,'2',{code:'Digit2',ctrl:true,target:ta});key(w,'?',{shift:true,target:ta});await settle();assert(!e.defaultPrevented&&w.eval('APP.task')==='hof-bob'&&!$('app-keys-sheet'),'a shortcut fired while typing');
 // Mod+N opens New task (the Projects header's +).
 doc.body.focus();let clicked=0;for(const n of qa('#app-shell [data-app-action="new-task"]'))n.addEventListener('click',()=>clicked++);
 e=key(w,'n',{ctrl:true});await settle();assert(e.defaultPrevented&&clicked===1,'Ctrl+N did not start New task');
 assert(q('#app-shell [data-app-action="new-task"]').getAttribute('aria-keyshortcuts').includes('Control+N'));
 // On a Mac, Mod is Cmd: Ctrl+1 picks a tab there, Cmd+1 a task, and the keycaps say ⌘.
 const m=browser();m.hidden=false;const mac=m.load({mac:true});await settle();assert(!mac.errors.length,mac.errors.join('\n'));
 for(const d of mac.doc.querySelectorAll('dialog[open]'))d.close();
 key(mac.w,'2',{code:'Digit2',meta:true});await settle();assert.equal(mac.w.eval('APP.task'),'hof-b','Cmd+2 on a Mac');
 mac.doc.body.focus();key(mac.w,'t',{meta:true});await settle();key(mac.w,'1',{code:'Digit1',ctrl:true});await settle();
 assert.equal(mac.doc.querySelector('#app-tabs [aria-selected="true"]').dataset.tab,'session','Ctrl+1 on a Mac picks tab 1');assert.equal(mac.w.eval('APP.task'),'hof-b','Ctrl+1 on a Mac opened a task');
 mac.w.keysSheet();await settle();assert([...mac.doc.querySelectorAll('#app-keys-sheet kbd')].some(n=>n.textContent==='⌘'),'no ⌘ keycap on a Mac');
 // The team dash keeps its own sheet: outside app mode keysSheet is #457's.
 const t=browser();const team=t.load({mode:'team'});await settle();assert(!team.doc.body.classList.contains('app-mode'));team.w.keysSheet();await settle();
 assert(team.doc.getElementById('keys-sheet')&&!team.doc.getElementById('app-keys-sheet'),'the team server lost its shortcuts sheet');
 console.log('dash app keys ok');process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
