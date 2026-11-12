// The Terminal section of a task (region:terminal): DASH_UI_DOM_MODULE=/path/to/jsdom node testdata/dash_terminal.cjs dash.html
// Shown only when /api/dash says terminal; opening it starts nothing until the person asks for a shell; the
// widget comes from /vendor/ on the dash, never another host; keystrokes go out as binary on a same-host
// socket, the shell's bytes go to the widget, the close reason is drawn as text, and closing the section closes
// the socket. Run in the phone layout and both themes (DASH_UI_PHONE, DASH_UI_THEME).
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),errors=[],sockets=[],terms=[];
const h={id:'hof-test',title:'Write the notes',goal:'Write the notes',state:'claimed',claimer:'codex-test',from:'codex-test',from_user:'olga',worker:'codex',to:'any',project:'acme/repo',stage:'implement',source:'interactive',updated_ago:'1m',dispatched:now,attempts:[{running:true,minutes:2}]};
const dash={user:'olga',role:'owner',now,terminal:false,handoff_list:[h],sessions:[{id:'codex-test',label:'worker',tool:'codex',status:'active',user:'olga',cwd:'/tmp/repo',seen_ago:'1m'}],left:[],unlinked:[],inbox:[],waiting:[],done:[],claims:[],prs:[],issues:[]};
const evil='<img src=x onerror=alert(1)>';
let withWidget=true;
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const html=fs.readFileSync(process.argv[2],'utf8');
function page(terminal){dash.terminal=terminal;sockets.length=0;terms.length=0;
 return new JSDOM(html,{url:'http://127.0.0.1:21620/#inbox',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{}]};
 if(withWidget)w.Terminal=class{constructor(o){this.opts=o;this.written=[];this.size=null;terms.push(this)}open(n){this.el=n}onData(f){this.data=f}write(b){this.written.push(Buffer.from(b).toString())}resize(c,r){this.size=[c,r]}focus(){}};
 w.WebSocket=class{constructor(u){this.url=u;this.sent=[];this.readyState=0;this.closed=null;sockets.push(this)}send(d){this.sent.push(d)}close(code){this.readyState=3;this.closed=code||1005}};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);let body={},status=200;
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/workitem')body={kind:'handoff',ref:'hof-test',tree:[h],prs:[]};
  else if(u.pathname==='/api/files')body={handoff:'hof-test',files:[]};
  else if(u.pathname==='/api/log')body={handoff:'hof-test',running:false,lines:[]};
  else if(u.pathname==='/api/result')body={files:[]};
  else if(u.pathname==='/api/review')body={handoff:u.searchParams.get('id'),branch:null};
  else if(u.pathname==='/api/chat')body={chats:[],roles:[],gateway_ready:false};
  return {ok:status<400,status,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}};
}})}
const tick=(ms=25)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 // No terminal from the server: no section, no socket, no widget loaded.
 let dom=page(false),w=dom.window;await tick();await tick();
 w.eval("showWorkItem('hof-test')");await tick();await tick();
 assert(w.document.querySelector('#hist details[data-files="hof-test"]'),'the task view did not draw');
 assert(!w.document.querySelector('[data-terminal]'),'a Terminal section without the server offering it');
 assert(!w.document.querySelector('script[src*="xterm"],link[href*="xterm"]'),'the widget loaded with the terminal off');
 assert.equal(sockets.length,0);dom.window.close();
 // Offered: the section is there, closed, and nothing starts until "Open a shell".
 dom=page(true);w=dom.window;await tick();await tick();assert(!errors.length,errors.join('\n'));
 const css=[...w.document.querySelectorAll('style')].map(n=>n.textContent).join('\n');
 assert(css.includes('region:css-terminal')&&/\.tterm-screen\{[^}]*max-width:100%/.test(css),'the screen must fit the phone layout');
 w.eval("showWorkItem('hof-test')");await tick();await tick();
 const panel=()=>w.document.querySelector('#hist details[data-terminal="hof-test"]');
 let d=panel();assert(d,'no Terminal section');assert.equal(d.querySelector('summary').textContent,'Terminal');assert(!d.open,'Terminal opens closed');
 d.open=true;d.dispatchEvent(new w.Event('toggle'));await tick();
 assert.equal(sockets.length,0,'opening the section started a shell');
 const open=[...panel().querySelectorAll('button')].find(b=>b.textContent==='Open a shell');assert(open,'no Open a shell button');
 open.click();await tick();await tick();
 assert.equal(sockets.length,1,'no socket');const ws=sockets[0];
 assert.equal(ws.url,'ws://127.0.0.1:21620/api/terminal?id=hof-test','the socket goes elsewhere: '+ws.url);
 assert.equal(ws.binaryType,'arraybuffer');assert.equal(terms.length,1);assert(panel().querySelector('.tterm-screen')===terms[0].el,'the widget is not in the section');
 ws.readyState=1;ws.onopen();
 assert.equal(typeof ws.sent[0],'string');const z=JSON.parse(ws.sent[0]);assert(z.cols>=20&&z.rows>=5,'size: '+ws.sent[0]);assert.deepEqual(terms[0].size,[z.cols,z.rows]);
 assert(panel().textContent.includes('What you type runs there.'),'connected status: '+panel().textContent);
 terms[0].data('ls\r');const k=ws.sent[1];assert(k instanceof w.Uint8Array||ArrayBuffer.isView(k),'a keystroke went out as text');assert.equal(Buffer.from(k).toString(),'ls\r');
 ws.onmessage({data:new Uint8Array(Buffer.from('hello '+evil)).buffer});assert.deepEqual(terms[0].written,['hello '+evil]);
 assert(!panel().querySelector('img'),'shell output became markup');
 // A redraw keeps the same screen and socket.
 w.eval("showWorkItem('hof-test')");await tick();await tick();
 assert(panel().open,'a redraw closed the section');assert(panel().querySelector('.tterm-screen')===terms[0].el,'a redraw lost the screen');assert.equal(sockets.length,1,'a redraw opened another socket');
 // The server closing it: its reason is drawn as text.
 ws.onclose({code:1000,reason:'idle 15m0s '+evil});await tick();
 assert(panel().textContent.includes('Closed: idle 15m0s '+evil),'close reason: '+panel().textContent);assert(!panel().querySelector('img'));
 assert([...panel().querySelectorAll('button')].some(b=>b.textContent==='Open again'),'no Open again');
 // Open again, then close the section: the socket closes.
 [...panel().querySelectorAll('button')].find(b=>b.textContent==='Open again').click();await tick();await tick();
 assert.equal(sockets.length,2);sockets[1].readyState=1;sockets[1].onopen();
 d=panel();d.open=false;d.dispatchEvent(new w.Event('toggle'));await tick();
 assert.equal(sockets[1].closed,1000,'closing the section left the socket open');
 // Leaving the page closes it too.
 d.open=true;d.dispatchEvent(new w.Event('toggle'));[...panel().querySelectorAll('button')].find(b=>b.textContent==='Open again').click();await tick();await tick();
 sockets[2].readyState=1;sockets[2].onopen();w.dispatchEvent(new w.Event('pagehide'));assert.equal(sockets[2].closed,1000,'leaving the page left the socket open');
 dom.window.close();
 // Without the widget in the page yet, it is fetched from the dash's own /vendor/, never another host.
 withWidget=false;dom=page(true);w=dom.window;await tick();await tick();w.eval("showWorkItem('hof-test')");await tick();await tick();
 d=panel();d.open=true;d.dispatchEvent(new w.Event('toggle'));[...panel().querySelectorAll('button')].find(b=>b.textContent==='Open a shell').click();await tick();
 const sc=w.document.querySelector('script[data-xterm]'),ln=w.document.querySelector('link[data-xterm]');
 assert(sc&&ln,'the widget was not requested');assert.equal(sc.getAttribute('src'),'/vendor/xterm.js');assert.equal(ln.getAttribute('href'),'/vendor/xterm.css');
 assert(![...w.document.querySelectorAll('script[src],link[href]')].some(n=>/^(https?:)?\/\//.test(n.getAttribute('src')||n.getAttribute('href'))),'the page loads from another host');
 assert.equal(sockets.length,0,'a socket before the widget loaded');
 sc.dispatchEvent(new w.Event('error'));await tick();assert(panel().textContent.includes('The terminal could not start: the terminal widget did not load'),'load failure: '+panel().textContent);
 assert(!errors.length,errors.join('\n'));
 dom.window.close();
 console.log('dash_terminal: ok');
})().catch(e=>{console.error(e);process.exit(1)});
