// Home's counted links open the set they counted (libraos/agentd-core#904 item 3); Home is Overview on
// the team server since #907, so this keeps the Tasks side: a creator and project in the address narrow it.
// "All N in Tasks" keeps the creator as well as the project, so Tasks shows the same N;
// a link that opens a wider list carries no count and says Browse Tasks. Group labels
// say whose they are: Needs attention (team), Waiting on another task, Review and
// validation, Closed recently; Your Inbox stays the signed-in person's.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_home_links.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString();
const base={from:'s-ann',from_user:'ann',to:'any',project:'acme/app',source:'interactive',updated_ago:'1m',age:'1m'};
const need=(id,user)=>({...base,id,goal:'Needs '+id,state:'claimed',stage:'implement',claimer:'s-w-'+id,worker:'claude',dispatched:true,worker_state:'blocked',from:'s-'+user,from_user:user});
const open=[...[1,2,3,4,5,6].map(n=>need('hof-a'+n,'ann')),...[1,2].map(n=>need('hof-b'+n,'bob')),
  ...[1,2,3,4,5,6].map(n=>({...base,id:'hof-k'+n,goal:'Blocked '+n,state:'blocked',blocked_by:['hof-a1']})),{...base,id:'hof-t1',goal:'To do',state:'offered'}];
const snap={user:'ann',role:'owner',now,team:true,handoff_list:open,done:[],sessions:[],left:[],unlinked:[],waiting:[],claims:[],messages:[],inbox:[],checkouts:[],counts:{},handoffs:{},host_states:{}};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21620/#home?by=person%3Aann&project=acme%2Fapp',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url)=>{const u=new URL(url,w.location.href);let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=snap;else if(u.pathname==='/api/issues')body={issues:[]};
  else if(u.pathname==='/api/team')body={roles:[],members:[],handoff_roles:{}};else if(u.pathname==='/api/chat')body={chats:[],roles:[],gateway_ready:false};
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // #home is Overview on the team server since #907 step 4; the counted link it had opens the same set from Overview's Needs a person.
 assert(!doc.getElementById('page-overview').hidden,'#home does not open Overview');
 const counted='#issues?view=needs&by=person%3Aann&project=acme%2Fapp';
 // Following the counted link: Tasks shows the same 6.
 w.location.hash=counted;await settle();
 assert(!doc.getElementById('page-work').hidden||!doc.getElementById('page-issues')?.hidden,'Tasks did not open');
 const shown=w.eval("(()=>{const o=[...document.querySelectorAll('#board-column option')].find(o=>o.value==='needs');return o?o.textContent:''})()");
 assert(/· 6$/.test(shown),'Tasks shows a different set from the 6 counted: '+shown);
 const note=doc.querySelector('[data-by-filter]');assert(note&&/ann/.test(note.textContent),'Tasks does not say it is narrowed to ann');
 // Its own filter can be removed; then Tasks shows everyone's 8.
 note.querySelector('button').click();await settle();
 assert(!new URLSearchParams(w.location.hash.split('?')[1]).has('by'),'the creator stayed in the address');
 const all=w.eval("(()=>{const o=[...document.querySelectorAll('#board-column option')].find(o=>o.value==='needs');return o?o.textContent:''})()");assert(/· 8$/.test(all),'without the creator Tasks should show 8: '+all);
 assert(!errors.length,errors.join('\n'));
 console.log('dash_home_links: ok');w.close()})().catch(e=>{console.error(e);process.exit(1)});
