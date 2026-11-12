// Keyboard shortcuts and their help sheet (#457): ? lists them, g i / g b /
// g c / g m go to Inbox, the board, Chat and Metrics, n opens the new task
// sheet, / opens search, j and k move through a list and Enter opens the row.
// None fires while a text field has the focus, and the sheet is reachable from
// the account menu, on a phone too. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_keys.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const base={from:'s-alice',from_user:'alice',to:'any',project:'acme/repo',updated_ago:'1m',age:'1m'};
const open=[
 {...base,id:'hof-one',goal:'First task '+evil,state:'offered',mark:'not_started'},
 {...base,id:'hof-two',goal:'Second task',state:'offered',mark:'not_started'},
 {...base,id:'hof-three',goal:'Third task',state:'offered',mark:'not_started'}];
const dash={user:'alice',role:'owner',now,dispatch:true,checkouts:['/src/acme'],dispatch_budget:'30m',handoff_list:open,done:[],sessions:[],waiting:[],claims:[],messages:[],inbox:[]};
const errors=[],requests=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=body=>({ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#issues?view=all&layout=board',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{}]};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url)=>{const u=new URL(url,w.location.href);requests.push(u.pathname);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/issues')return json({issues:[]});
  if(u.pathname==='/api/issue'||u.pathname==='/api/workitem'){const id=u.searchParams.get('ref'),h=open.find(x=>x.id===id)||open[0];return json({kind:'handoff',ref:id,title:h.goal,body:{goal:h.goal},tree:[{...h,focus:true}],prs:[]})}
  if(u.pathname==='/api/team')return json({roles:[],members:[],handoff_roles:{}});
  if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:true});
  if(u.pathname==='/api/search')return json({results:[]});
  return json({})}}});
const w=dom.window,d=w.document,$=id=>d.getElementById(id),tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const key=(target,k,o={})=>{const e=new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true,...o});target.dispatchEvent(e);return e};
const sheetOpen=()=>d.querySelector('dialog.sheet');
const closeSheet=async()=>{w.eval('activeSheet&&activeSheet.cancel()');await tick();assert(!sheetOpen(),'the sheet did not close')};
const searchOpen=()=>{const b=$('search-box');return !!(b&&b.open)};
const go=async(target,a,b)=>{key(target,a);key(target,b);await settle()};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 const body=d.body;

 // ? opens a sheet that lists every shortcut, as text.
 const ev=key(body,'?',{shiftKey:true});assert(ev.defaultPrevented,'? was not handled');
 let s=sheetOpen();assert(s,'? did not open a sheet');assert.equal(s.id,'keys-sheet');assert.equal(s.querySelector('h2').textContent,'Keyboard shortcuts');
 const rows=[...s.querySelectorAll('#keys-list dt')].map(dt=>[...dt.querySelectorAll('kbd')].map(k=>k.textContent).join(' '));
 for(const want of ['?','g i','g b','g c','g m','n','/ Ctrl K','j','k','Enter','Esc'])assert(rows.includes(want),'the sheet does not list '+want+': '+rows.join(' | '));
 const text=s.querySelector('#keys-list').textContent;for(const w of ['Inbox','board','Chat','Metrics','New task','Search','Next item','Previous item','Open'])assert(text.includes(w),'the sheet does not say '+w);
 assert(s.contains(d.activeElement)&&d.activeElement.textContent==='Close','the focus is not on Close in the sheet');
 // Inside the sheet the shortcuts are off: g i does not move the page.
 const before=w.location.hash;await go(d.activeElement,'g','i');assert.equal(w.location.hash,before,'g i fired over the open sheet');
 await closeSheet();

 // g i, g b, g c, g m go where the sheet says; a lone i or a slow second key does nothing.
 await go(body,'g','i');assert.equal(w.location.hash,'#inbox','g i did not open Inbox');
 await go(body,'g','c');assert.equal(w.location.hash,'#chat','g c did not open Chat');
 await go(body,'g','m');assert(/^#insights\/metrics(\?|$)/.test(w.location.hash),'g m did not open Metrics: '+w.location.hash);
 await go(body,'g','b');assert(w.location.hash.startsWith('#issues'),'g b did not open the board: '+w.location.hash);
 key(body,'i');await settle();assert(w.location.hash.startsWith('#issues'),'i alone moved the page');
 key(body,'g');w.eval('keysPrefix=Date.now()-5000');key(body,'i');await settle();assert(w.location.hash.startsWith('#issues'),'g then i seconds later moved the page');
 key(body,'g',{ctrlKey:true});key(body,'i');await settle();assert(w.location.hash.startsWith('#issues'),'Ctrl+G then i moved the page');
 // The rail links say which keys reach them.
 assert.equal(d.querySelector('.rail-item[data-rail="inbox"]').getAttribute('aria-keyshortcuts'),'G I');
 assert.equal(d.querySelector('.rail-item[data-rail="chat"]').getAttribute('aria-keyshortcuts'),'G C');

 // j and k move through the board's cards; Enter opens the one with the focus.
 const links=[...d.querySelectorAll('#board .kcard')].filter(c=>!c.closest('[hidden]')).map(c=>c.querySelector('a[href],button:not(:disabled),summary'));
 assert(links.length>=3,'the board has no cards to move through');
 body.focus();assert(key(body,'j').defaultPrevented,'j was not handled');assert.equal(d.activeElement,links[0],'j did not go to the first card');
 key(d.activeElement,'j');assert.equal(d.activeElement,links[1],'j did not go to the next card');
 key(d.activeElement,'j');key(d.activeElement,'k');assert.equal(d.activeElement,links[1],'k did not go back');
 key(d.activeElement,'k');key(d.activeElement,'k');assert.equal(d.activeElement,links[0],'k went past the first card');
 assert(!d.querySelector('#board img'),'a task title became markup');
 const href=links[0].getAttribute('href');assert(href,'the first card has no link to open');
 assert(key(links[0],'Enter').defaultPrevented,'Enter on a card was not handled');await settle();
 assert.equal(w.location.hash,href,'Enter did not open the card');
 w.location.hash='#issues?view=all&layout=board';await settle();

 // n opens the new task sheet; / opens search.
 key(body,'n');s=sheetOpen();assert(s,'n did not open a sheet');assert.equal(s.querySelector('h2').textContent,'New handoff');await closeSheet();
 assert(key(body,'/').defaultPrevented,'/ was not handled');assert(searchOpen(),'/ did not open search');
 // Typing in the search box is typing: n and ? there do not open a sheet.
 key($('search-input'),'n');key($('search-input'),'?');assert(!sheetOpen(),'a key typed in search opened a sheet');
 w.eval('searchClose()');assert(!searchOpen());

 // Nothing fires while a text field, a select or an editable element has the focus.
 const box=d.createElement('div');d.querySelector('main .page:not([hidden])').append(box);
 const fields=[d.createElement('input'),d.createElement('textarea'),d.createElement('select'),(()=>{const n=d.createElement('div');n.setAttribute('contenteditable','true');n.tabIndex=0;return n})(),$('chat-search')];
 fields.slice(0,4).forEach(f=>box.append(f));
 for(const f of fields){f.focus();const at=w.location.hash;
  for(const [a,b] of [['g','i'],['g','c'],['g','m']]){key(f,a);key(f,b)}
  await settle();assert.equal(w.location.hash,at,'a g shortcut fired in a '+f.tagName);
  for(const k of ['?','n','/','j','k']){const e=key(f,k);assert(!e.defaultPrevented,k+' was taken from a '+f.tagName)}
  assert(!sheetOpen(),'a sheet opened while typing in a '+f.tagName);assert(!searchOpen(),'search opened while typing in a '+f.tagName)}
 box.remove();

 // Without dispatch, n says why instead of opening anything.
 w.eval('lastDash.dispatch=false');key(body,'n');assert(!sheetOpen(),'n opened a sheet without dispatch');assert(/dispatch/.test($('toast').textContent),'n did not say why');w.eval('lastDash.dispatch=true');

 // The account menu has Keyboard shortcuts, on a phone too; it opens the same sheet.
 const item=$('keys-open');assert(item,'no Keyboard shortcuts in the menu');assert(item.closest('#account .menu-items'),'Keyboard shortcuts is not in the account menu');
 assert(!item.closest('[hidden]')&&!item.hidden,'Keyboard shortcuts is hidden');
 const css=[...d.querySelectorAll('style')].map(n=>n.textContent).join('\n');assert(!/#keys-open\{[^}]*display:none/.test(css),'Keyboard shortcuts is hidden by CSS');
 $('account').open=true;item.click();s=sheetOpen();assert(s&&s.id==='keys-sheet','the menu item did not open the shortcuts sheet');assert(!$('account').open,'the menu stayed open over the sheet');
 await closeSheet();
 assert(!errors.length,errors.join('\n'));
 console.log('dash_keys: ok',process.env.DASH_UI_PHONE==='1'?'phone':'desktop',process.env.DASH_UI_THEME||'light');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
