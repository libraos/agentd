// The server as an installable app (#465): the head links the manifest and the
// iOS icon agentd serves, says the page may run in its own window, and its
// theme-color tags give an installed window bar the page's own background, in
// the system theme and in one chosen in Settings. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_install.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const html=fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),theme=process.env.DASH_UI_THEME||'light',phone=process.env.DASH_UI_PHONE==='1';
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
 // The LibraOS mark: a gold L and a blue ring, on the tab and in the rail; no trace of the old 'a' tile or 'd' mark (dash_brandmark.cjs pins the artwork).
 {const href=decodeURIComponent(one('link[rel="icon"]').getAttribute('href'));assert(href.includes("d='M15.748 141.995H75.5134")&&/#D3A036/.test(href)&&/conic-gradient/.test(href),'the tab icon is not the LibraOS mark');assert(!/0a66d6|M9 22V13|<rect x='147.5'|M148\.13/.test(href),'the tab icon still has an old mark');
  const isMark=(box,what)=>{assert(box,what+': no mark');const s=box.querySelector('svg.brand-mark');assert(s&&box.textContent.trim()==='',what+' still shows the old "a" mark');assert.equal(s.getAttribute('viewBox'),'0 0 200 200',what);assert(!s.querySelector('rect')&&s.querySelector('path[fill^="url(#"]').getAttribute('d').startsWith('M15.748 141.995H75.5134')&&s.querySelector('mask path').getAttribute('d').startsWith('M86.1052 191.812C104.403'),what+': not the LibraOS L and ring');for(const ref of [...s.querySelectorAll('[fill^="url(#"],[mask^="url(#"],[clip-path^="url(#"]')].map(n=>(n.getAttribute('fill')||n.getAttribute('mask')||n.getAttribute('clip-path')).slice(5,-1)))assert.equal(d.querySelectorAll('[id="'+ref+'"]').length,1,what+': '+ref+' is not one of a kind')};
  isMark(d.querySelector('.rail-mark'),'the rail');isMark(d.querySelector('.app-logo'),'the app header')}
 // The LibraOS rebrand (libraos/core#1038): the page is LibraOS Core Server and
 // says AgentD nowhere, in its text, attributes or comments; the rail keeps its class.
 assert(!/AgentD/.test(html),'the page still says AgentD');
 assert(html.includes('<title>LibraOS Core Server</title>'),'the served title');
 assert(/· LibraOS Core Server$/.test(d.title),'the route title: '+d.title);
 assert.equal(d.querySelector('.rail-mark').getAttribute('title'),'LibraOS Core Server','the rail mark title');
 assert.equal(d.querySelector('.app-name').textContent,'LibraOS Core','the app header name');
 assert.equal(d.querySelector('.ap-brand').textContent,'LibraOS Core','the panel header brand');
 assert(/^<!doctype html>\n<!-- LibraOS Core dash\. Copyright/.test(html),'the copyright header');
 // Its own window, with its own name, on Android, iOS and desktop.
 for(const [name,want] of [['mobile-web-app-capable','yes'],['apple-mobile-web-app-capable','yes'],['apple-mobile-web-app-title','LibraOS Core'],['application-name','LibraOS Core'],['apple-mobile-web-app-status-bar-style','default']])
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
