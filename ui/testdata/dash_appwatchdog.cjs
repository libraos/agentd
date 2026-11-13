// libraos/agentd-core#560: agentd app's /api/dash says mode "app" and, in watchdog, whether a
// watchdog runs. While none does the page says so at the top with the command that starts one;
// with one running, and on the team dash (mode "team", no watchdog field), it shows nothing.
// Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_appwatchdog.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const base={user:'boss',role:'owner',now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{}};
const cases=[
 {name:'app, no watchdog',dash:{...base,mode:'app',watchdog:{running:false,start:'systemctl --user enable --now agentd-watchdog.timer'+evil,note:'no watchdog is running: offered tasks do not start'}},shown:true},
 {name:'app, watchdog runs',dash:{...base,mode:'app',watchdog:{running:true}},shown:false},
 {name:'team dash',dash:{...base,mode:'team'},shown:false},
 {name:'team dash before mode existed',dash:{...base,watchdog:{running:false,start:'x'}},shown:false},
];
const load=async dash=>{
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
 const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21470/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
  w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.fetch=async(url)=>{const u=new URL(url,w.location.href);let body={};
   if(u.pathname==='/api/auth')return {ok:true,status:204};
   if(u.pathname==='/api/dash')body=dash;
   return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
 const tick=()=>new Promise(r=>setTimeout(r,25));for(let i=0;i<6;i++)await tick();
 return {w:dom.window,doc:dom.window.document,errors};
};
(async()=>{
 for(const c of cases){
  const {w,doc,errors}=await load(c.dash);
  assert(!errors.length,c.name+': '+errors.join('\n'));
  const n=doc.getElementById('appwatchdog');assert(n,'no #appwatchdog');
  if(!c.shown){assert(n.hidden,c.name+': the notice shows');assert.equal(n.textContent,'',c.name+': the hidden notice has text');w.close();continue}
  assert(!n.hidden,c.name+': no notice');assert.equal(n.getAttribute('role'),'status');
  assert(/no watchdog is running: offered tasks do not start/.test(n.textContent),c.name+': '+n.textContent);
  const code=n.querySelector('code');assert(code,c.name+': no command');
  assert.equal(code.textContent,c.dash.watchdog.start,c.name+': the command differs');
  assert(!n.querySelector('img'),c.name+': the command became markup');
  w.close();
 }
 const css=fs.readFileSync(process.argv[2],'utf8');
 assert(/#appwatchdog\[hidden\]\{display:none\}/.test(css),'the hidden notice still takes space');
 assert(/#appwatchdog code\{overflow-wrap:anywhere/.test(css),'a long command does not wrap on a phone');
 console.log('dash_appwatchdog: ok',process.env.DASH_UI_PHONE==='1'?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
