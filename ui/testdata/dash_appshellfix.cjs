// The personal app's shell defects from the 2026-11-25 review (refresh item 2):
// B1  the task workspace's + and Command menus carry the frame's tokens (mounted inside #app-shell), so their
//     computed background is the card colour, never transparent, with the frame's font, in light and dark;
// M2  /panel's column is full width up to 600 px in a 1440 px window, not a strip;
// M3  Home's titles wrap in their own column and never run under the state chip, whose column is one fixed width;
// m1  Session's Conversation and History rows lead with inline SVG icons, not ⏺ ⎿ ✻;
// m2  the bell's count is a positioned badge on the bell, shown only above 0;
// m3  with no task open on a phone, the centre is a button "Open the task list" that opens the drawer;
// m4  the right sidebar is hidden on pages with no task (Home, Tasks, Triggers, Settings, nothing open) and back
//     when a task opens.
// jsdom has no layout, so sizes are read as the computed rules that make them; var() is resolved by hand
// against the element's computed custom properties, as a browser would.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_appshellfix.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',theme=process.env.DASH_UI_THEME||'light',now=new Date().toISOString();
const html=fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8');
const long='Rework the login client so a retry after a dropped connection keeps the session cookie and does not log the person out of every open tab';
const task=(id,o)=>({id,title:'Fix login '+id,goal:'Fix the login retry '+id,accept:['retry is added'],state:'claimed',claimer:'w-'+id,from:'s-alice',from_user:'alice',mine:true,worker:'claude',worker_tool:'claude',to:'any',project:'acme/demo-repo',stage:'implement',source:'interactive',updated_ago:'1m',dispatched:now,check:'go test ./...',
  attempts:[{tool:'claude',running:true}],retry:{tool:'claude',cwd:'/r/demo',budget:'30m',may:true},takeover:{cli:'agentd handoff claim '+id+' --takeover',may:true},cancel:{cli:'agentd handoff done '+id+' --cancel --reason R',may:true},...o});
const list=[task('hof-s1',{title:long}),task('hof-s2',{worker_state:'blocked',worker_wait:'input'})];
const base={user:'alice',role:'owner',now,handoff_list:list,done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:['/r/demo'],dispatch:true,terminal:true};
let snap={...base,mode:'app',watchdog:{running:true},spend_today:{usd:1,workers:1,unpriced:0,pending:0}};
const conv={turns:[{role:'user',text:'agentd started you to take handoff hof-s1'},{role:'assistant',text:'Reading the login client.'},{role:'tool',text:'Shell(go test ./...)'},{role:'result',text:'ok  acme/login'},{role:'error',text:'exit 1'}]};
const workitem=id=>({tree:[{id,log:[{note:'report: tests pass',ago:'2m',actor:'w-'+id},{note:'message m1 from user alice to its worker w: add a test',ago:'1m'},{note:'claimed',ago:'5m',actor:'w-'+id}]}]});
const load=(path,width)=>{const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
 const dom=new JSDOM(html,{url:'http://127.0.0.1:21470'+path,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  if(width){Object.defineProperty(w,'innerWidth',{value:width,configurable:true});Object.defineProperty(w,'innerHeight',{value:900,configurable:true})}
  w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',theme);
  w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
  w.WebSocket=class{constructor(){this.readyState=0}send(){}close(){this.readyState=3}};w.Terminal=class{open(){}onData(){}resize(){}write(){}focus(){}dispose(){}};w.Notification=undefined;
  w.fetch=async(url)=>{const u=new URL(url,w.location.href),id=u.searchParams.get('id')||u.searchParams.get('ref')||u.searchParams.get('handoff');let body={};
   if(u.pathname==='/api/auth')return {ok:true,status:204};
   if(u.pathname==='/api/dash')body=snap;
   else if(u.pathname==='/api/workitem')body=workitem(id);
   else if(u.pathname==='/api/session')body=conv;
   else if(u.pathname==='/api/taskmsg')body={may:true,live:true};
   else if(u.pathname==='/api/review')body={handoff:id,enabled:true,may:true,branch:'agentd/'+id,base_branch:'main',files:[]};
   else if(u.pathname==='/api/files')body={files:[]};
   else if(u.pathname==='/api/checks')body={check:'go test ./...',runs:[]};
   else if(u.pathname==='/api/taskdetail')body={handoff:id,state:'claimed',tool:'claude'};
   return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
 return {w:dom.window,doc:dom.window.document,errors}};
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
// resolved: a computed property with var() replaced from the element's computed custom properties.
const resolved=(w,n,prop)=>{const cs=w.getComputedStyle(n);let v=cs.getPropertyValue(prop).trim();
  for(let i=0;i<6&&/var\(/.test(v);i++)v=v.replace(/var\((--[\w-]+)(?:,([^()]*))?\)/g,(_,k,d)=>cs.getPropertyValue(k).trim()||(d||'').trim());return v};
const opaque=v=>!!v&&!/var\(/.test(v)&&!/^(transparent|none|initial|rgba\(0, 0, 0, 0\))$/i.test(v)&&!/^rgba\([^)]*,\s*0\)$/.test(v);
(async()=>{
 const {w,doc,errors}=load('/'),$=id=>doc.getElementById(id),q=(s,n)=>(n||doc).querySelector(s),qa=(s,n)=>[...(n||doc).querySelectorAll(s)];
 const click=n=>{assert(n,'nothing to click');n.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}))};
 const key=(k,o={})=>doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true,...o}));
 const display=n=>w.getComputedStyle(n).display,right=$('app-right'),body=doc.body;
 await settle();assert(!errors.length,errors.join('\n'));assert(body.classList.contains('app-mode'),'app mode is off');
 // m2: the bell's count is a badge on the bell: inside it, positioned, filled, shown only while something waits.
 const bell=q('#app-shell [data-app-action="bell"]'),badge=$('app-bell-count');
 assert(bell.contains(badge),'the count is not on the bell');assert.equal(w.getComputedStyle(bell).position,'relative');assert.equal(w.getComputedStyle(badge).position,'absolute','the count is not positioned');
 assert(opaque(resolved(w,badge,'background')),'the badge has no fill: '+resolved(w,badge,'background'));assert(opaque(resolved(w,badge,'color')),'the badge has no text colour');
 assert(Number(badge.textContent)>0&&!badge.hidden&&display(badge)!=='none','the badge is hidden with '+badge.textContent+' waiting');
 assert(!q('.app-bdot',bell),'the old dot is still drawn beside the badge');
 // m3: no task open. A phone's centre is a button that opens the task list drawer; a desktop with the list in view says "on the left".
 const empty=()=>q('#app-tab-body .app-empty[data-k="no-task"]'),openBtn=()=>q('[data-app-action="open-tasks"]',empty());
 assert(empty(),'no empty state');
 if(phone){assert(openBtn()&&/^Open the task list$/.test(openBtn().textContent),'the phone empty state is not a button: '+empty().textContent);assert(!/on the left/.test(empty().textContent),'a phone is told to look left');
  assert(!body.classList.contains('app-left-open'),'the drawer is open at load');click(openBtn());await tick();assert(body.classList.contains('app-left-open'),'the button does not open the task list');
  assert(!$('app-scrim').hidden,'no scrim behind the drawer');click($('app-scrim'));await tick();assert(!body.classList.contains('app-left-open'),'the drawer does not close')}
 else{assert(!openBtn()&&/Pick one on the left/.test(empty().textContent),'desktop empty state: '+empty().textContent);
  key('b',{ctrlKey:true});await tick();assert(openBtn(),'with the list hidden the empty state still points left');click(openBtn());await tick();
  assert(body.classList.contains('app-left-open'),'the button does not show the task list');assert(!openBtn()&&/on the left/.test(empty().textContent),'the text does not come back')}
 // m4: no task open: the right sidebar and its toggle are hidden; so on every page; a task brings it back.
 assert.equal(display(right),'none','the right sidebar shows with no task open');assert.equal(display(q('.app-righttoggle')),'none','the right toggle shows with no task open');
 w.appPage('home');await settle();assert.equal(display(right),'none','the right sidebar shows on Home');
 // M3: a long Home title wraps in its own column; the chip has its own.
 const row=q('#app-page .home-row[data-home-row="hof-s1"]');assert(row,'no Home row for the long title');
 const rs=w.getComputedStyle(row),chip=q('.home-chip',row),main=q('.home-main',row),title=q('.home-open',row);
 assert.equal(rs.display,'grid','the Home row is not a grid');assert(/minmax\(0(px)?, ?1fr\)/.test(rs.gridTemplateColumns)&&/\s\d+(\.\d+)?(rem|em|px)$/.test(rs.gridTemplateColumns.trim()),'no fixed chip column: '+rs.gridTemplateColumns);
 assert.equal(w.getComputedStyle(chip).gridColumn.split('/')[0].trim(),'2','the chip is not in its column');assert.equal(w.getComputedStyle(main).gridColumn.split('/')[0].trim(),'1','the title is not in its column');
 assert(/^0(px)?$/.test(w.getComputedStyle(main).minWidth),'the title column can grow past its track');assert.equal(w.getComputedStyle(title).whiteSpace,'normal','the title button does not wrap');
 assert.equal(title.textContent.length>40,true);
 for(const page of ['tasks','triggers','settings']){w.appPage(page);await settle();assert.equal(display(right),'none','the right sidebar shows on '+page)}
 w.appPage('');await settle();assert.equal(display(right),'none','the right sidebar shows with nothing open');
 w.appTaskOpen('hof-s1');await settle();
 if(!phone){assert.notEqual(display(right),'none','the right sidebar does not come back when a task opens');assert.equal(q('#app-shell [data-app-action="toggle-right"][aria-expanded]').getAttribute('aria-expanded'),'true')}
 else{assert.equal(display(right),'none','a phone opened the right drawer by itself');click(q('.app-righttoggle'));await tick();assert(body.classList.contains('app-right-open')&&display(right)!=='none','the right drawer does not open on a task');
  w.appPage('tasks');await settle();assert(!body.classList.contains('app-right-open')&&$('app-scrim').hidden,'a page left the right drawer and its scrim open');w.appTaskOpen('hof-s1');await settle()}
 if(!phone){w.appPage('tasks');await settle();assert.equal(display(right),'none','the right sidebar shows on Tasks over an open task');w.appPage('');await settle();assert.notEqual(display(right),'none','closing the page does not bring the sidebar back')}
 // m1: Session's rows lead with SVG icons; none of the terminal glyphs a host's fonts may lack.
 const tb=$('app-tab-body');assert(!/[⏺⎿✻]/.test(tb.textContent),'Session still draws ⏺ ⎿ ✻: '+tb.textContent.match(/.{0,20}[⏺⎿✻].{0,20}/));
 const c=q('[data-k="conversation"]',tb);for(const r of ['assistant','tool','result','error']){const n=q('[data-role="'+r+'"]',c);assert(n,'no '+r+' row');assert(q('.app-fi svg path',n),r+' row has no icon')}
 assert.equal(q('[data-role="assistant"] .app-fi',c).dataset.icon,'dot');assert.equal(q('[data-role="result"] .app-fi',c).dataset.icon,'corner');
 assert(/Reading the login client/.test(q('[data-role="assistant"]',c).textContent),'the assistant text is gone');
 for(const k of ['report','step'])assert(q('[data-k="'+k+'"] .app-fi svg',tb),'History '+k+' row has no icon');
 assert(/tests pass/.test(q('[data-k="report"]',tb).textContent)&&/claimed/.test(q('[data-k="step"]',tb).textContent),'History text is gone');
 // B1: the + and Command menus are inside the frame, with its card background, text colour and font, in this theme.
 const card=w.getComputedStyle($('app-shell')).getPropertyValue('--o-card').trim();assert.equal(card,theme==='dark'?'#171717':'#fff','the frame card token');
 for(const [btn,kind] of [['new-tab','new'],['command','command']]){click(q('#app-center [data-app-action="'+btn+'"]'));await tick();const m=q('.app-menu[data-menu="'+kind+'"]');assert(m,'no '+kind+' menu');
  assert($('app-shell').contains(m),'the '+kind+' menu is outside #app-shell, so it has no tokens');const bg=resolved(w,m,'background');
  assert(opaque(bg),'the '+kind+' menu background is transparent: '+JSON.stringify(bg));assert.equal(bg,card,'the '+kind+' menu is not the card colour');
  const fg=resolved(w,m,'color');assert(opaque(fg)&&fg!==bg,'the '+kind+' menu text colour: '+fg);assert(/Geist/.test(w.getComputedStyle(m).fontFamily),'the '+kind+' menu has not the frame font');
  const it=q('.app-mitem',m);assert(it&&opaque(resolved(w,it,'color')),'a '+kind+' item has no text colour');assert.equal(w.getComputedStyle(it).whiteSpace,'normal','a '+kind+' item does not wrap, so its note and command run off the menu');
  if(kind==='command'){const code=q('.app-mitem code',m);assert(code&&/SF Mono|monospace/.test(resolved(w,code,'font')),'the command line has no mono font: '+(code&&resolved(w,code,'font')))}
  key('Escape');await tick();assert(!q('.app-menu'),'Escape does not close the '+kind+' menu')}
 assert(!errors.length,errors.join('\n'));
 // M2: /panel in a 1440 x 900 window: the column takes the width up to 600 px, centred, not a strip.
 {const p=load('/panel',1440);await settle();assert(!p.errors.length,p.errors.join('\n'));const ap=p.doc.getElementById('app-panel');assert(ap&&!ap.hidden&&p.doc.body.classList.contains('panel-mode'),'no panel at /panel');
  assert.equal(p.w.innerWidth,1440);const cs=p.w.getComputedStyle(ap);assert.equal(cs.width,'100%','the panel is not full width at 1440');assert.equal(cs.maxWidth,'600px');assert.equal(cs.boxSizing,'border-box');
  assert(/auto/.test(cs.marginLeft)&&/auto/.test(cs.marginRight),'the panel is not centred');assert(p.doc.querySelector('#app-panel .ap-row,#app-panel [data-task-id],#ap-list'),'the panel has no list')}
 console.log('dash_appshellfix: ok',phone?'phone':'desktop',theme);process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
