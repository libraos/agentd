// Person reports: enter from Users, select a reporting period, keep keyboard
// focus and reject late replies, then check empty, refused and changed-identity
// states. The same page runs in the desktop/phone and light/dark DOM matrix.
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
let dash={user:'owner',role:'owner',team:true,now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],waiting:[],claims:[],messages:[],inbox:[],checkouts:[]};
const members=[{name:'owner',role:'owner'},{name:'alice',role:'dev'}];
const detail=since=>({kind:'member',name:'alice',member:{role:'dev'},from:now,to:now,ip_visible:dash.role==='owner',
 period:{states:{done:4,claimed:1},finished_on_machines:3,commits:2,prs:1,minutes:65,usd:since==='90d'?9:since==='30d'?3:1.25,unpriced:1},
 grants:[{scope:'project:acme/app',role:'developer',granted_by:evil}],
 nodes:[{name:'alice-box',person:'alice',kind:'worker',host:'box.lan',last_ip:dash.role==='owner'?'192.0.2.5':undefined,capacity:2,leases:1,state:'idle',tools:['codex'],repos:['acme/app'],seen:now,seen_ago:'1s'}],
 devices:[{id:'dev-box',kind:'worker',person:'alice',worker:'alice-box',host:'box.lan',last_ip:dash.role==='owner'?'192.0.2.5':undefined,label:evil,created:now,last_seen:now,state:'active'}],
 activity:[{ts:now,actor:'alice',action:'worker:finish',target:'hof-finished',project:'acme/app',result:'ok'}]});
let hold=false,empty=false,code=200;const pending={},calls=[],errors=[];
const json=(body,status=200)=>({ok:status<400,status,json:async()=>body,text:async()=>JSON.stringify(body)});
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21620/#team/users',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);calls.push({path:u.pathname,query:u.search,method:opts.method||'GET'});
  if(u.pathname==='/api/auth')return json({},204);
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/settings')return json({owner:dash.role==='owner',users:members,invites:[],account:{},config:{}});
  if(u.pathname==='/api/devices')return json({scope:dash.role==='owner'?'all':'own',devices:[]});
  if(u.pathname==='/api/nodes')return json({nodes:[]});
  if(u.pathname==='/api/team'){
   if(!u.searchParams.has('member'))return json({members,roles:[],problems:[],handoff_roles:{}});
   if(code!==200)return json({error:'only your own person detail is available'},code);
   const since=u.searchParams.get('since'),d=empty?{...detail(since),period:{states:{}},grants:[],nodes:[],devices:[],activity:[]}:detail(since);
   if(hold)return new Promise(resolve=>{pending[since]=()=>resolve(json(d))});
   return json(d);
  }
  if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:false});
  return json({});
 }}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
const view=()=>doc.getElementById('team-view'),select=()=>doc.querySelector('[aria-label="Person reporting period"]');
const go=async hash=>{w.location.hash=hash;await settle()};
const change=async value=>{const s=select();s.focus();s.value=value;s.dispatchEvent(new w.Event('change'));await settle()};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 const link=view().querySelector('a[href="#team/member/alice"]');assert(link,'the user name is not a detail link');link.click();await settle();
 assert(calls.some(c=>c.path==='/api/team'&&c.query.split('&tz=')[0]==='?member=alice&since=7d'),'detail does not request a period');
 const report=view().querySelector('[data-person-detail="alice"]');assert(report,'no person report');
 assert(doc.getElementById('team-head').textContent.includes('Ledger role: dev'),'role not shown');
 for(const text of ['Finished on their machines','Recorded commits','Pull requests','Worker time','Spend','≥ $1.25','1 attempt has no price.','Handoffs sent or claimed','Permissions','project:acme/app','developer','Hosts and devices','Host: box.lan','Last IP: 192.0.2.5','worker:finish','hof-finished'])assert(report.textContent.includes(text),'report lacks '+text);
 assert.equal(report.querySelector('[data-person-state="done"] b').textContent,'4');
 assert.equal(report.querySelectorAll('[data-machine]').length,1,'worker and device are separate cards');
 assert(report.querySelector('[data-machine="alice-box"] [data-device="dev-box"]'),'worker device is not paired');
 assert(report.textContent.includes(evil)&&!report.querySelector('img'),'untrusted person fields became markup');
 // A second change stays usable while a previous period is loading. Only
 // the newest reply may replace the report, even when replies arrive late.
 hold=true;await change('30d');assert(select(),'loading removed the period picker');assert.equal(doc.activeElement,select(),'loading lost keyboard focus');assert(/Loading report/.test(view().textContent));
 assert(!view().querySelector('.person-metrics'),'old totals shown under the new period');
 await change('90d');assert(pending['30d']&&pending['90d'],'both period requests were not sent');
 pending['90d']();await settle();assert(view().textContent.includes('≥ $9.00'),'latest period not shown');assert.equal(doc.activeElement,select(),'completed period lost keyboard focus');
 pending['30d']();await settle();assert(view().textContent.includes('≥ $9.00')&&!view().textContent.includes('≥ $3.00'),'late reply overwrote the latest period');hold=false;
 // Empty accounts keep their current role and explicit empty states.
 empty=true;await change('7d');for(const text of ['No handoffs in this period.','No scoped grants.','No hosts or devices recorded.','No recorded activity in this period.','not priced'])assert(view().textContent.includes(text),'empty report lacks '+text);
 // A role/identity change discards cached reports and refetches; a refusal
 // has a readable reason, Retry, and a route back to Users.
 empty=false;await change('30d');assert(view().textContent.includes('192.0.2.5'));
 code=403;dash={...dash,user:'bob',role:'dev'};w.eval('refresh()');await settle();
 assert(!view().querySelector('[data-person-detail]')&&!view().textContent.includes('192.0.2.5'),'another identity inherited the owner report');
 assert(view().textContent.includes('only your own person detail'),'refusal not explained');assert(view().querySelector('button')&&view().querySelector('a[href="#team/users"]'),'refusal has no recovery');
 await go('#team/users');assert(!view().querySelector('a[href="#team/member/alice"]'),'non-owner can click another person');
 dash={...dash,user:'alice'};code=200;w.eval('refresh()');await settle();
 assert(view().querySelector('a[href="#team/member/alice"]'),'self detail link missing');await go('#team/member/alice');
 assert(view().querySelector('[data-person-detail]')&&!view().textContent.includes('192.0.2.5'),'self report includes owner-only IP');assert(view().textContent.includes('IP addresses are visible to owners only.'));
 assert(calls.every(c=>c.method==='GET'),'report made a write');assert(!errors.length,errors.join('\n'));
 console.log('dash_person: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');w.close();
})().catch(e=>{console.error(e);process.exit(1)});
