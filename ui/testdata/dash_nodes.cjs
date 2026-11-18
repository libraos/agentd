// Worker nodes under each account (#831): GET /api/nodes (each card names its
// person, null for a dedicated worker an owner enrolled). Account > Your nodes
// lists the signed-in person's nodes only (name, state, leases/capacity; "No
// nodes yet" when none); Team > Nodes lists every node grouped by person with
// Server last: name, kind, host, tools, repositories, state with its why,
// leases/capacity, last seen. Read only: no actions. Polls with the refresh.
// Nodes and devices (libraos/agentd-core#900): the tab also lists, under each person,
// their devices from GET /api/devices (kind, created, last seen, state), Server's last;
// a node whose version is older than server_version is marked older release, one with
// no version is not; drain and revoke are shown as terminal commands, never buttons;
// a server without /api/devices (404) says so and still lists its nodes.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_nodes.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const card=(name,person,extra)=>({name,person,kind:'worker',host:name+'.lan',protocol:2,tools:['codex'],models:[],labels:[],repos:['acme/alpha'],capacity:2,accept_server_work:true,state:'idle',why:null,local_workers:0,leases:0,drained:false,registered:now,seen:now,seen_ago:'5s',offline:false,state_at:null,...extra});
let nodes=[card('zed-box',null,{leases:1}),card('alice-laptop','alice',{kind:'cli',state:'busy',why:'session s1 active '+evil,capacity:1}),card('alice-desk','alice',{accept_server_work:false,kind:'desktop'}),card('bob-host','bob',{offline:true,seen_ago:'3h'}),card('c2-03',null,{drained:true})];
const ago=ms=>new Date(Date.now()-ms).toISOString();
let devices=null,devicesStatus=404,serverVersion='v0.1.14';
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
  if(u.pathname==='/api/nodes')return json({nodes,server_version:serverVersion,mirror_hosts:[]});
  if(u.pathname==='/api/devices')return devicesStatus===200?json(devices):json({error:'no'},devicesStatus);
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
 // A server without /api/devices: says so, nodes as before; the tab is renamed.
 assert.equal(tab.firstChild.textContent,'Nodes and devices');
 assert(view().querySelector('[data-devices-note="missing"]'),'a 404 from /api/devices is not explained');assert(!view().querySelector('[data-device]'));
 // Versions: older than the server's is marked; null, equal (with a suffix) or newer is not.
 nodes=nodes.map(n=>({...n,version:{'alice-laptop':'v0.1.12','alice-desk':null,'bob-host':'0.1.13','zed-box':'v0.1.15','c2-03':'v0.1.14-rc1'}[n.name]}));
 devices={scope:'all',devices:[
  {id:'dev-a2',kind:'desktop',person:'alice',worker:null,label:'old desk',created:ago(30*864e5),last_seen:ago(20*864e5),protocol:2,state:'revoked',revoked:ago(3*36e5),revoked_by:'alice'},
  {id:'dev-a1',kind:'cli',person:'alice',worker:null,label:'laptop '+evil,created:ago(2*864e5),last_seen:ago(5*6e4),protocol:2,state:'active',revoked:null,revoked_by:null},
  {id:'dev-c1',kind:'cli',person:'carol',worker:null,label:null,created:ago(36e5),last_seen:null,protocol:2,state:'active',revoked:null,revoked_by:null},
  {id:'dev-w1',kind:'worker',person:null,worker:'zed-box',label:null,created:ago(864e5),last_seen:ago(1e4),protocol:2,state:'active',revoked:null,revoked_by:null}]};devicesStatus=200;
 w.eval('NODES.at=0;DEVICES.at=0;refresh()');await settle();assert(!errors.length,errors.join('\n'));
 assert(requests.includes('GET /api/devices'),'the tab never asks for /api/devices');
 assert(!view().querySelector('[data-devices-note]'),'an owner\'s full list has a note');
 assert.equal(doc.querySelector('#team-tabs a[data-tab="nodes"] .n').textContent,'9','the tab does not count nodes and devices');
 assert.deepEqual([...view().querySelectorAll('[data-node-group]')].map(g=>g.dataset.nodeGroup),['alice','bob','carol','Server']);
 const order=g=>[...view().querySelectorAll('[data-node-group="'+g+'"] .tm-row')].map(r=>r.dataset.node||'dev:'+r.dataset.device);
 assert.deepEqual(order('alice'),['alice-desk','alice-laptop','dev:dev-a1','dev:dev-a2'],'nodes, then devices (active first)');
 assert.deepEqual(order('carol'),['dev:dev-c1']);assert.deepEqual(order('Server'),['c2-03','zed-box','dev:dev-w1']);
 assert.equal(view().querySelector('[data-node-group="alice"] .n').textContent,'4');
 const dev=id=>view().querySelector('[data-device="'+id+'"]');
 const a1=dev('dev-a1').textContent;for(const want of ['cli device','dev-a1','active','created ','seen 5 min ago','agentd server devices revoke dev-a1'])assert(a1.includes(want),'device row lacks '+want+': '+a1);
 assert(a1.includes(evil)&&!dev('dev-a1').querySelector('img'),'a device label became markup');
 const a2=dev('dev-a2').textContent;assert(a2.includes('desktop device')&&a2.includes('revoked')&&a2.includes('3h ago by alice'),'revoked row: '+a2);assert(!a2.includes('devices revoke'),'a revoked device offers revoke');
 assert(dev('dev-c1').textContent.includes('never seen'));assert(dev('dev-w1').textContent.includes('worker device')&&dev('dev-w1').textContent.includes('worker zed-box'));
 const older=n=>!!row(n).querySelector('[data-older]');
 assert(older('alice-laptop')&&row('alice-laptop').textContent.includes('older release')&&row('alice-laptop').textContent.includes('v0.1.12'),'v0.1.12 under a v0.1.14 server is not marked');
 assert(older('bob-host'),'0.1.13 (no v) is not marked');
 assert(!older('alice-desk')&&row('alice-desk').textContent.includes('release unknown'),'a null version is marked');
 assert(!older('zed-box')&&!older('c2-03'),'a newer or equal release is marked');
 serverVersion=null;w.eval('NODES.at=0;refresh()');await settle();assert(!view().querySelector('[data-older]'),'marked with no server version');serverVersion='v0.1.14';
 // Read only: the commands show, no button.
 assert(row('alice-laptop').querySelector('code').textContent==='agentd server workers drain alice-laptop');assert(row('c2-03').querySelector('code').textContent==='agentd server workers undrain c2-03');
 assert(!view().querySelector('button'),'Nodes and devices has a button');
 // A failing /api/devices: said, nodes stay.
 devicesStatus=500;w.eval('DEVICES.at=0;refresh()');await settle();assert(view().querySelector('[data-devices-note="error"]'),'a device error is not said');assert(row('alice-laptop'));devicesStatus=200;
 w.eval('DEVICES.at=0;refresh()');await settle();
 // Polls with the refresh: a new node shows after the next refresh.
 nodes=[...nodes,card('alice-new','alice')];w.eval('NODES.at=0;refresh()');await settle();
 assert(mineNames().includes('alice-new'),'Your nodes did not refresh');assert(row('alice-new'),'Team > Nodes did not refresh');
 // Another person: only their nodes in the menu; none: No nodes yet.
 dash={...dash,user:'carol',role:'dev'};w.eval('NODES.at=0;refresh()');await settle();
 assert.deepEqual(mineNames(),[]);assert(mine().textContent.includes('No nodes yet'));
 devices={scope:'own',devices:devices.devices.filter(v=>v.person==='carol')};w.eval('DEVICES.at=0;refresh()');await settle();
 assert(view().querySelector('[data-devices-note="own"]'),'a person\'s own list does not say so');assert(dev('dev-c1')&&!dev('dev-a1'));
 // Not signed in: no Your nodes block.
 dash={...dash,user:null,role:null};w.eval('refresh()');await settle();assert(mine().hidden,'Your nodes shows with no one signed in');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_nodes: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');w.close()})().catch(e=>{console.error(e);process.exit(1)});
