// The dash as an installable app (#465): the head links the manifest and the
// iOS icon agentd serves, says the page may run in its own window, and its
// theme-color tags give an installed window bar the page's own background, in
// the system theme and in one chosen in Settings. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_install.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const html=fs.readFileSync(process.argv[2],'utf8'),theme=process.env.DASH_UI_THEME||'light',phone=process.env.DASH_UI_PHONE==='1';
const dash={user:'alice',role:'owner',now:new Date().toISOString(),handoff_list:[],done:[],sessions:[],waiting:[],claims:[],messages:[],inbox:[]};
const errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=body=>({ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)});
const dom=new JSDOM(html,{url:'http://127.0.0.1:21620/#inbox',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',theme);
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url)=>{const u=new URL(url,w.location.href);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/team')return json({roles:[],members:[],handoff_roles:{}});
  if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:true});
  return json({})}}});
const w=dom.window,d=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const head=d.head,one=sel=>{const all=head.querySelectorAll(sel);assert.equal(all.length,1,'the head has '+all.length+' of '+sel);return all[0]};
// The page's background per theme, read from its own CSS, so the bar cannot drift from it.
const bg=re=>{const m=html.match(re);assert(m,'no --bg for '+re);return m[1].toLowerCase()};
const BG={light:bg(/:root\{\s*--bg:(#[0-9a-fA-F]{6})/),dark:bg(/:root\[data-theme="dark"\]\{\s*--bg:(#[0-9a-fA-F]{6})/)};
const bars=()=>[...head.querySelectorAll('meta[name="theme-color"]')].map(m=>[(m.getAttribute('media')||'').replace(/\s/g,''),m.content.toLowerCase()]);
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));

 // Installability: the manifest and icons, at the paths agentd serves.
 assert.equal(one('link[rel="manifest"]').getAttribute('href'),'/manifest.webmanifest');
 assert.equal(one('link[rel="apple-touch-icon"]').getAttribute('href'),'/icons/apple-touch-icon.png');
 assert(one('link[rel="icon"]').getAttribute('href').startsWith('data:image/svg+xml'),'the tab icon changed');
 // The AgentD mark: a blue ring and a gold stem, on the tab and in the rail; no trace of the old 'a' tile.
 {const href=decodeURIComponent(one('link[rel="icon"]').getAttribute('href'));assert(/stroke='url\(#b\)'/.test(href)&&/#D3A036/.test(href)&&/<rect x='147.5'/.test(href),'the tab icon is not the AgentD mark');assert(!/0a66d6|M9 22V13/.test(href),'the tab icon still has the old mark');
  const isMark=(box,what)=>{assert(box,what+': no mark');const s=box.querySelector('svg.brand-mark');assert(s&&box.textContent.trim()==='',what+' still shows the old "a" mark');assert.equal(s.getAttribute('viewBox'),'17 14 170 170',what);assert(s.querySelector('path[stroke^="url(#"]')&&s.querySelector('rect[fill^="url(#"]'),what+': not the ring and stem');for(const ref of [...s.querySelectorAll('[stroke^="url(#"],[fill^="url(#"]')].map(n=>(n.getAttribute('stroke')||n.getAttribute('fill')).slice(5,-1)))assert.equal(d.querySelectorAll('[id="'+ref+'"]').length,1,what+': gradient '+ref+' is not one of a kind')};
  isMark(d.querySelector('.rail-mark'),'the rail');isMark(d.querySelector('.app-logo'),'the app header')}
 // Its own window, with its own name, on Android, iOS and desktop.
 for(const [name,want] of [['mobile-web-app-capable','yes'],['apple-mobile-web-app-capable','yes'],['apple-mobile-web-app-title','agentd'],['application-name','agentd'],['apple-mobile-web-app-status-bar-style','default']])
  assert.equal(one('meta[name="'+name+'"]').content,want,name);
 // The phone layout keeps its viewport; standalone mode needs no zoom lock.
 const vp=one('meta[name="viewport"]').content;assert(/width=device-width/.test(vp)&&/initial-scale=1/.test(vp)&&!/user-scalable=no/.test(vp),'viewport: '+vp);
 // None of the tags ended up in the body.
 assert(!d.body.querySelector('link[rel="manifest"],meta[name="theme-color"],meta[name$="web-app-capable"]'),'an install tag is in the body');

 // The window bar: one tag per system theme; the theme chosen here (Settings) wins on both.
 assert.deepEqual(bars(),[['(prefers-color-scheme:light)',BG[theme]],['(prefers-color-scheme:dark)',BG[theme]]],'theme '+theme+': '+JSON.stringify(bars()));
 const other=theme==='light'?'dark':'light';
 w.setTheme(other);await tick();
 assert.deepEqual(bars().map(b=>b[1]),[BG[other],BG[other]],'after choosing '+other+': '+JSON.stringify(bars()));
 // System again: each tag follows its own media query.
 w.setTheme('system');await tick();
 assert.deepEqual(bars(),[['(prefers-color-scheme:light)',BG.light],['(prefers-color-scheme:dark)',BG.dark]],'system: '+JSON.stringify(bars()));
 w.setTheme(theme);await tick();assert.deepEqual(bars().map(b=>b[1]),[BG[theme],BG[theme]]);
 assert(!errors.length,errors.join('\n'));
 console.log('dash_install: ok ('+(phone?'phone':'desktop')+', '+theme+')');w.close();
})().catch(e=>{console.error(e);process.exit(1)});
