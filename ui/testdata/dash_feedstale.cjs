// A feed that failed to refresh does not look live (libraos/agentd-core#904 item 1).
// Team > Nodes and devices (/api/nodes, /api/devices) and Who is on what
// (/api/presence): when a poll fails after one succeeded, the rows stay under
// "Couldn't refresh · last updated TIME" with Retry, and their ages read as of that
// read; the next good poll (or Retry) clears the notice. A 401 or 403, or a different
// signed-in person, never shows the earlier rows.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_feedstale.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString();
const nodes={server_version:'v0.1.13',nodes:[{name:'box-1',person:'cid',kind:'worker',state:'idle',leases:0,capacity:2,seen_ago:'4s',seen:now,version:'v0.1.13'}]};
const devices={scope:'all',devices:[{id:'dev-1',label:'cid laptop',person:'cid',kind:'cli',state:'active',created:now,last_seen:now}]};
const presence={host:'srv',overlap_count:0,sessions:[{session:'s-cid',user:'cid',node:'srv',tool:'claude',activity:'fixing login',since:now,age:'5m',trees:[],files:[],claims:[],issues:[]}]};
const status={nodes:200,devices:200,presence:200};
let dash={user:'cid',role:'owner',now,team:true,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],waiting:[],claims:[],messages:[],inbox:[],checkouts:[]};
const requests=[],errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=(body,st=200)=>({ok:st<400,status:st,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#team/nodes',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);requests.push((opts.method||'GET')+' '+u.pathname);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  for(const [k,body] of [['nodes',nodes],['devices',devices],['presence',presence]])if(u.pathname==='/api/'+k)return status[k]===200?json(body):json({error:'down'},status[k]);
  if(u.pathname==='/api/team')return json({roles:[],members:[],problems:[],handoff_roles:{}});
  if(u.pathname==='/api/repositories')return json({repositories:[]});
  if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:false});
  return json({})}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
const view=()=>doc.querySelector('#team-view'),stale=k=>view().querySelector('[data-feed-stale="'+k+'"]');
const poll=async()=>{w.eval('NODES.at=0;DEVICES.at=0;PRESENCE.at=0;refresh()');await settle()};
const count=p=>requests.filter(r=>r==='GET '+p).length;
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // A good read: rows, no notice.
 assert(view().querySelector('[data-node="box-1"]'),'no node row after a good read');assert(view().querySelector('[data-device="dev-1"]'),'no device row after a good read');
 assert(!stale('nodes')&&!stale('devices'),'a stale notice after a good read');
 // Nodes fail after a good read: the rows stay, under the notice with Retry; ages as of then.
 status.nodes=503;await poll();
 assert(view().querySelector('[data-node="box-1"]'),'the node rows went with a failed refresh');
 const n=stale('nodes');assert(n,'a failed refresh of /api/nodes looks live: '+view().textContent.slice(0,300));
 assert(/Couldn.t refresh · last updated \S/.test(n.textContent),'notice text: '+n.textContent);assert(/as of/.test(n.textContent),'ages are not said to be as of that read: '+n.textContent);
 const retry=n.querySelector('button');assert(retry&&retry.textContent==='Retry','no Retry on the notice');
 // The account menu's Your nodes says so too.
 assert(/Couldn.t refresh/.test(doc.getElementById('account-nodes').textContent),'Your nodes looks live after a failed refresh');
 // Retry asks again; a good answer clears the notice.
 status.nodes=200;const before=count('/api/nodes');retry.click();await settle();
 assert(count('/api/nodes')>before,'Retry did not ask for /api/nodes');assert(!stale('nodes'),'the notice stayed after a good read');
 assert(!/Couldn.t refresh/.test(doc.getElementById('account-nodes').textContent),'Your nodes kept the notice after a good read');
 // Devices: the same.
 status.devices=500;await poll();assert(view().querySelector('[data-device="dev-1"]'),'the device rows went with a failed refresh');
 assert(stale('devices'),'a failed refresh of /api/devices looks live');assert(!stale('nodes'));
 status.devices=200;await poll();assert(!stale('devices'),'the devices notice stayed after a good read');
 // A 403 shows no earlier rows.
 status.nodes=403;status.devices=401;await poll();
 assert(!view().querySelector('[data-node="box-1"]'),'a 403 on /api/nodes still shows the earlier rows');
 assert(!view().querySelector('[data-device="dev-1"]'),'a 401 on /api/devices still shows the earlier rows');
 assert(!stale('nodes'),'a 403 is shown as a stale read');assert(view().querySelector('[role="alert"]'),'a 403 says nothing');
 assert(!doc.querySelector('#account-nodes [data-node]'),'Your nodes kept rows after a 403');
 status.nodes=200;status.devices=200;await poll();assert(view().querySelector('[data-node="box-1"]'),'rows did not come back after a good read');
 // Another person signed in: the earlier person's rows are not shown when the read fails.
 status.nodes=503;dash={...dash,user:'bob'};await poll();
 assert(!view().querySelector('[data-node="box-1"]'),'another person\'s earlier rows are shown');
 dash={...dash,user:'cid'};status.nodes=200;await poll();
 // Who is on what: the same rule.
 w.location.hash='#team/who';await settle();await poll();
 assert(view().querySelector('[data-presence="s-cid"]'),'no presence row after a good read');assert(!stale('presence'));
 status.presence=502;await poll();
 assert(view().querySelector('[data-presence="s-cid"]'),'presence rows went with a failed refresh');
 const p=stale('presence');assert(p&&/Couldn.t refresh · last updated/.test(p.textContent),'a failed refresh of /api/presence looks live');
 assert(!view().querySelector('[data-presence="s-cid"] .dot[title="live"]'),'a stale presence row still says live');
 status.presence=200;const pb=count('/api/presence');p.querySelector('button').click();await settle();
 assert(count('/api/presence')>pb,'Retry did not ask for /api/presence');assert(!stale('presence'),'the presence notice stayed after a good read');
 status.presence=401;await poll();assert(!view().querySelector('[data-presence="s-cid"]'),'a 401 on /api/presence still shows the earlier rows');
 // Nothing writes.
 assert(!requests.some(r=>!r.startsWith('GET ')&&!r.endsWith('/api/auth')),'the page wrote: '+requests.filter(r=>!r.startsWith('GET ')));
 assert(!errors.length,errors.join('\n'));
 console.log('dash_feedstale: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');w.close()})().catch(e=>{console.error(e);process.exit(1)});
