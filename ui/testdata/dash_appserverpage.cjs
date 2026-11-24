// The personal layout (agentd app, mode "app") is unchanged by the server page's rebuild
// (libraos/core#907 steps 1 to 4): agentd app answers 404 for /api/load, /api/running,
// /api/grants, /api/policies, /api/insights and /api/devices, so the page never asks for them in app mode, from a bare
// address, #overview, #team/permissions, #team/users, #insights, #settings/repositories or any refresh; Overview and Team stay hidden and the
// app's frame shows. Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_appserverpage.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),html=fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8');
const snap={user:'alice',role:'owner',now,mode:'app',handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:[],watchdog:{running:true,start:'agentd install'},spend_today:{usd:0,workers:0,unpriced:0,pending:0,user:'alice'}};
const NEW=/^\/api\/(load|running|grants|policies|insights|devices)$/;
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
(async()=>{
 for(const start of ['','#overview','#team/permissions','#team','#insights/success','#team/users']){const hits=[],errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
  const dom=new JSDOM(html,{url:'http://127.0.0.1:21470/'+start,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
   w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
   w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
   w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);hits.push(u.pathname);if(NEW.test(u.pathname))return {ok:false,status:404,json:async()=>({}),text:async()=>'404 page not found'};let body={};
    if(u.pathname==='/api/auth')return {ok:true,status:204};if(u.pathname==='/api/dash')body=snap;
    return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
  const w=dom.window,doc=w.document;await settle();
  assert(doc.body.classList.contains('app-mode'),start+': app mode is not on');assert(!doc.getElementById('app-shell').hidden,start+': the app frame is hidden');assert(doc.querySelector('.shell').hidden,start+': the team shell shows');
  // The page's own polls and a few refreshes, then the routes again by hash.
  w.eval('refresh()');await settle();w.eval('ovPoll(true)');await settle();for(const h of ['#overview','#team/permissions','#team/users','#home','#insights','#insights/cost','#insights/usage','#settings/repositories','#settings/members','#triggers','#inbox']){w.location.hash=h;await settle()}w.eval('refresh()');await settle();
  const asked=hits.filter(p=>NEW.test(p));assert(!asked.length,start+': app mode asked for '+asked.join(', '));
  assert(!errors.length,errors.join('\n'));w.close()}
 console.log('dash_appserverpage: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light')})().catch(e=>{console.error(e);process.exit(1)});
