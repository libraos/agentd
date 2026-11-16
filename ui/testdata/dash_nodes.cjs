// Worker nodes under each account (#831): GET /api/nodes (each card names its
// person, null for a dedicated worker an owner enrolled). Account > Your nodes
// lists the signed-in person's nodes only (name, state, leases/capacity; "No
// nodes yet" when none); Team > Nodes lists every node grouped by person with
// Server last: name, kind, host, tools, repositories, state with its why,
// leases/capacity, last seen. Read only: no actions. Polls with the refresh.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_nodes.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const card=(name,person,extra)=>({name,person,kind:'worker',host:name+'.lan',protocol:2,tools:['codex'],models:[],labels:[],repos:['acme/alpha'],capacity:2,accept_server_work:true,state:'idle',why:null,local_workers:0,leases:0,drained:false,registered:now,seen:now,seen_ago:'5s',offline:false,state_at:null,...extra});
let nodes=[card('zed-box',null,{leases:1}),card('alice-laptop','alice',{kind:'cli',state:'busy',why:'session s1 active '+evil,capacity:1}),card('alice-desk','alice',{accept_server_work:false,kind:'desktop'}),card('bob-host','bob',{offline:true,seen_ago:'3h'}),card('c2-03',null,{drained:true})];
let dash={user:'alice',role:'owner',now,team:true,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],waiting:[],claims:[],messages:[],inbox:[],checkouts:[]};
const requests=[],errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=(body,status=200)=>({ok:status<400,status,json:async()=>body,text:async()=>JSON.stringify(body)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#team/nodes',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);requests.push((opts.method||'GET')+' '+u.pathname);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/nodes')return json({nodes});
  if(u.pathname==='/api/team')return json({roles:[],members:[{name:'alice',role:'owner'},{name:'bob',role:'dev'}],problems:[],handoff_roles:{}});
  if(u.pathname==='/api/repositories')return json({repositories:[]});
  if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:false});
  return json({})}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
const go=async h=>{w.location.hash=h;await settle()};
const mine=()=>doc.querySelector('#account-nodes'),view=()=>doc.querySelector('#team-view');
const mineNames=()=>[...mine().querySelectorAll('[data-node]')].map(n=>n.dataset.node);
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 assert(requests.includes('GET /api/nodes'),'the dash never asks for /api/nodes');
 // Account > Your nodes: alice's two, not bob's nor the Server's.
 assert(mine()&&!mine().hidden,'no Your nodes in the Account menu');assert(mine().textContent.includes('Your nodes'));
 assert.deepEqual(mineNames().sort(),['alice-desk','alice-laptop']);
 const laptop=mine().querySelector('[data-node="alice-laptop"]');assert(laptop.textContent.includes('busy'),'state missing: '+laptop.textContent);assert(laptop.textContent.includes('0/1'),'leases/capacity missing: '+laptop.textContent);
 assert(mine().querySelector('[data-node="alice-desk"]').textContent.includes('not accepting'));
 // Team > Nodes: a tab with the count; groups by person, Server last.
 const tab=doc.querySelector('#team-tabs a[data-tab="nodes"]');assert(tab,'no Nodes tab');assert.equal(tab.getAttribute('aria-current'),'page');assert.equal(tab.querySelector('.n').textContent,'5');
 const groups=[...view().querySelectorAll('[data-node-group]')].map(g=>g.dataset.nodeGroup);assert.deepEqual(groups,['alice','bob','Server']);
 const inGroup=g=>[...view().querySelectorAll('[data-node-group="'+g+'"] [data-node]')].map(n=>n.dataset.node);
 assert.deepEqual(inGroup('alice'),['alice-desk','alice-laptop']);assert.deepEqual(inGroup('bob'),['bob-host']);assert.deepEqual(inGroup('Server'),['c2-03','zed-box']);
 const row=n=>view().querySelector('[data-node="'+n+'"]');
 const lt=row('alice-laptop').textContent;for(const want of ['alice-laptop','cli','alice-laptop.lan','codex','acme/alpha','busy','session s1 active','0/1','5s ago'])assert(lt.includes(want),'laptop row lacks '+want+': '+lt);
 assert(lt.includes(evil)&&!row('alice-laptop').querySelector('img'),'a why became markup');
 assert(row('bob-host').textContent.includes('offline')&&row('bob-host').textContent.includes('3h ago'));
 assert(row('c2-03').textContent.includes('drained'));assert(row('zed-box').textContent.includes('1/2'));
 assert(!view().querySelector('button[data-write]'),'Nodes has an action');
 // Polls with the refresh: a new node shows after the next refresh.
 nodes=[...nodes,card('alice-new','alice')];w.eval('NODES.at=0;refresh()');await settle();
 assert(mineNames().includes('alice-new'),'Your nodes did not refresh');assert(row('alice-new'),'Team > Nodes did not refresh');
 // Another person: only their nodes in the menu; none: No nodes yet.
 dash={...dash,user:'carol',role:'dev'};w.eval('NODES.at=0;refresh()');await settle();
 assert.deepEqual(mineNames(),[]);assert(mine().textContent.includes('No nodes yet'));
 // Not signed in: no Your nodes block.
 dash={...dash,user:null,role:null};w.eval('refresh()');await settle();assert(mine().hidden,'Your nodes shows with no one signed in');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_nodes: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');w.close()})().catch(e=>{console.error(e);process.exit(1)});
