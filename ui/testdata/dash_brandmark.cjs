// The LibraOS mark (libraos/site, site/assets/brand/libraos-icon.svg: a gold L and a blue ring) is the
// page's only mark: the tab icon, the sign-in page (served with this page's <head> only), the rail and
// the app's top bar. The old lowercase d (AgentD) mark must not come back, and the N mark is LibraOS
// Next's, not this page's. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_brandmark.cjs dash.html
const fs=require('fs'),assert=require('assert'),crypto=require('crypto');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const html=fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),theme=process.env.DASH_UI_THEME||'light',phone=process.env.DASH_UI_PHONE==='1';

// The old d mark: an open ring of three 58-radius arcs and a 17-wide stem at x 147.5, cropped to 17 14 170 170.
const OLD_D=[/M148\.13 94\.57/,/100\.05 177\.86/,/A58 58 0 0 1/,/x[=:]['"]?147\.5\b/,/166\.5/,/17 14 170 170/,/a gold stem/];
for(const re of OLD_D)assert(!re.test(html),'the old d mark is back in the page: '+re);
assert(!/<text[^>]*>\s*[dN]\s*<\/text>/.test(html),'a letter mark (d or N) in the page');

// The artwork as exported: its geometry and the ring's conic paint, pinned to the official file.
const ART='1e94ab61a17eea4539f79e5ee2bb406d590574019563309c8784d08bcc1bf4b9';
const L_START='M15.748 141.995H75.5134',RING_START='M86.1052 191.812C104.403',CLIP_START='M86.1052 191.812L71.1301';
const artOf=svg=>{const d=sel=>{const n=svg.querySelector(sel);assert(n,'no '+sel);return n},
  L=d('path[fill^="url(#"]').getAttribute('d'),ring=d('mask path').getAttribute('d'),clip=d('clipPath path').getAttribute('d'),
  conic=d('foreignObject div').getAttribute('style'),matrix=/matrix\(([^)]+)\)/.exec(d('foreignObject').parentNode.getAttribute('transform'))[1];
  assert(L.startsWith(L_START)&&ring.startsWith(RING_START)&&clip.startsWith(CLIP_START),'not the LibraOS L and ring');
  return crypto.createHash('sha256').update([L,ring,clip,conic,matrix].join('|')).digest('hex')};
// Every url(#id) a copy paints with names exactly one element in the document.
const refsResolve=(svg,doc,what)=>{for(const n of [svg,...svg.querySelectorAll('*')])for(const a of ['fill','mask','clip-path']){const m=/^url\(#([^)]+)\)$/.exec(n.getAttribute(a)||'');if(m)assert.equal(doc.querySelectorAll('[id="'+m[1]+'"]').length,1,what+': '+m[1]+' is not one of a kind')}};
const svgFromURI=(uri,what)=>{assert(uri&&uri.startsWith('data:image/svg+xml,'),what+': not an SVG data URI');const src=decodeURIComponent(uri.slice('data:image/svg+xml,'.length));
  assert(!/figma/.test(src),what+': Figma metadata left in');const doc=new JSDOM(src,{contentType:'image/svg+xml'}).window.document;
  assert.equal(doc.documentElement.getAttribute('viewBox'),'0 0 200 200',what);assert.equal(doc.documentElement.getAttribute('fill'),'none',what);
  assert.equal(doc.querySelector('foreignObject div').namespaceURI,'http://www.w3.org/1999/xhtml',what+': the ring paint is not XHTML');
  assert(/#D3A036/i.test(src)&&/#F1D07F/i.test(src),what+': not the gold gradient');refsResolve(doc.documentElement,doc,what);return doc.documentElement};

const errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=body=>({ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)});
const dash={user:'alice',role:'owner',now:new Date().toISOString(),handoff_list:[],done:[],sessions:[],waiting:[],claims:[],messages:[],inbox:[]};
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
const w=dom.window,d=w.document,tick=()=>new Promise(r=>setTimeout(r,25));
(async()=>{
 for(let i=0;i<4;i++)await tick();assert(!errors.length,errors.join('\n'));

 // The tab icon.
 const icons=d.head.querySelectorAll('link[rel="icon"]');assert.equal(icons.length,1,'one tab icon');
 const icon=icons[0].getAttribute('href');assert.equal(artOf(svgFromURI(icon,'the tab icon')),ART,'the tab icon is not the LibraOS artwork');

 // The sign-in page: the server sends this page's <head> and its own <body class="login-error"><main><h1>…,
 // so its mark is the stylesheet's, above the heading, and the same artwork as the tab icon.
 const head=html.split('</head>')[0];
 const login=/\.login-error main:before\{([^}]*)\}/.exec(head);assert(login,'the sign-in page has no mark');
 assert(/content:""/.test(login[1])&&/display:block/.test(login[1])&&/width:40px;height:40px/.test(login[1]),'the sign-in mark is not a 40px block');
 const loginURI=/url\("([^"]+)"\)/.exec(login[1]);assert(loginURI,'the sign-in mark has no image');assert.equal(loginURI[1],icon,'the sign-in mark is not the tab icon artwork');
 {const page=new JSDOM(head+'</head><body class="login-error"><main><h1>Sign in to LibraOS Core Server</h1></main></body>');assert(page.window.document.querySelector('.login-error main h1'),'the sign-in page shape changed')}

 // The rail and the app's top bar: the inline mark, the artwork exactly, ids of their own; labels kept.
 const isMark=(box,what)=>{assert(box,what+': no mark box');const s=box.querySelectorAll('svg.brand-mark');assert.equal(s.length,1,what+': '+s.length+' marks');assert.equal(box.textContent.trim(),'',what+' shows text, not the mark');
  assert.equal(s[0].getAttribute('viewBox'),'0 0 200 200',what);assert.equal(s[0].getAttribute('aria-hidden'),'true',what);assert(!s[0].querySelector('rect,text'),what+' still has the old mark');
  assert.equal(s[0].querySelector('foreignObject div').namespaceURI,'http://www.w3.org/1999/xhtml',what+': the ring paint is not XHTML');
  assert.equal(artOf(s[0]),ART,what+' is not the LibraOS artwork');refsResolve(s[0],d,what);return s[0]};
 const rail=d.querySelector('.rail-mark'),app=d.querySelector('.app-logo');
 isMark(rail,'the rail');isMark(app,'the app top bar');
 assert.equal(rail.getAttribute('title'),'LibraOS Core Server');assert.equal(rail.getAttribute('aria-label'),'LibraOS Core Server, go to Overview');
 assert.equal(app.getAttribute('aria-hidden'),'true');assert.equal(d.querySelector('.app-name').textContent,'LibraOS Core');
 // More copies (the setup page, onboarding) keep every id one of a kind.
 const more=[w.brandMark(),w.brandMark()];more.forEach(s=>d.body.append(s));more.forEach((s,i)=>{assert.equal(artOf(s),ART,'copy '+i);refsResolve(s,d,'copy '+i)});isMark(rail,'the rail, with more copies');more.forEach(s=>s.remove());

 // Sizes and alignment as before: 22px in the rail's 32px tile, 14px in the top bar's 18px tile.
 const css=html.split('</style>')[0];
 assert(css.includes('.rail-mark .brand-mark{width:22px;height:22px}.app-logo .brand-mark{width:14px;height:14px}.appob-logo .brand-mark{width:20px;height:20px}'),'the mark sizes changed');
 assert(/\.rail-mark\{display:grid;place-items:center;width:32px;height:32px/.test(css)&&/\.app-logo\{display:grid;place-items:center;width:18px;height:18px/.test(css),'the mark tiles changed');

 // On a dark rail the colour mark stays legible: the darker gold and the ring's brightest blue are
 // 3:1 or more on the dark theme's tile (WCAG non-text contrast); the top bar's tile is dark in both themes.
 const lum=hex=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2]};
 const ratio=(a,b)=>{const[x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05)};
 const darkPanel=/:root\[data-theme="dark"\]\{[^}]*--panel:(#[0-9a-fA-F]{6})/.exec(css)[1];
 assert(/\.rail-mark\{[^}]*background:var\(--panel\)/.test(css),'the rail tile is not --panel');
 for(const c of ['#D3A036','#75A4FF'])assert(ratio(c,darkPanel)>=3,c+' on the dark rail '+darkPanel+': '+ratio(c,darkPanel).toFixed(2));
 assert(/\.app-logo\{[^}]*background:#171717/.test(css)&&/\.appob-logo\{[^}]*background:#171717/.test(css),'the top bar tile follows the theme again');
 for(const c of ['#D3A036','#75A4FF'])assert(ratio(c,'#171717')>=3,c+' on the top bar tile');
 assert(!/\.(?:rail-mark|app-logo|brand-mark)[^{]*\{[^}]*filter:/.test(css),'the mark is filtered, not the artwork');

 w.close();console.log('dash_brandmark: ok ('+theme+(phone?', phone':'')+')');
})().catch(e=>{console.error(e);process.exit(1)});
