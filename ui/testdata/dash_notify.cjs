// Browser notifications for new Inbox items (#452): with permission and the tab in
// the background, a new blocked worker of the signed-in person raises exactly one
// notification (kind and goal, as text), clicking it opens the item; never again on
// a refresh or a reload; none with the tab in front, none for another person's item;
// Settings > Notifications > In this browser asks once and says when it is denied or
// unsupported. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_notify.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const html=fs.readFileSync(process.argv[2],'utf8'),now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const task=(id,user)=>({id,title:'Task '+id,goal:'Goal of '+id+' '+evil,state:'claimed',claimer:'s-'+user,from:'s-'+user,from_user:user,claimer_user:user,to:'any',project:'acme/repo',stage:'implement',updated_ago:'1m',age:'1m',dispatched:now,worker_state:'blocked'});
const blocked=(id,extra)=>({id:'blocked:'+id+':'+now,kind:'blocked',title:'claude worker waiting: permission',goal:'Goal of '+id+' '+evil,handoff:id,claimer:'s-alice',worker:'claude',from:'s-alice',age:'1m',at:now,read:false,mine:true,...extra});
const dash={user:'alice',role:'owner',now,handoff_list:[task('hof-old','alice'),task('hof-new','alice'),task('hof-front','alice'),task('hof-bob','bob')],sessions:[],left:[],done:[],waiting:[],claims:[],messages:[],inbox:[blocked('hof-old')]};
const settings={owner:true,config:{},models:{},personal:{email:'alice@example.invalid',waiting:true,blocked:true,failed:true,finished:false},email:{},telegram:{},members:[],invites:[]};
// One browser: a page load over a localStorage that outlives it (a reload is a new page on the same store).
function browser(){const store=new Map(),shown=[],posts=[];let permission='granted',hidden=false,supported=true,asked=0,answer='granted';
  function load(){const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
    const dom=new JSDOM(html,{url:'http://127.0.0.1:21620/#inbox',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
      w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');for(const [k,v] of store)w.localStorage.setItem(k,v);
      const P=w.Storage.prototype,set=P.setItem,del=P.removeItem;P.setItem=function(k,v){if(this===w.localStorage)store.set(k,String(v));return set.call(this,k,v)};P.removeItem=function(k){if(this===w.localStorage)store.delete(k);return del.call(this,k)};
      w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.focus=()=>{};
      Object.defineProperty(w.document,'hidden',{configurable:true,get:()=>hidden});
      if(supported){class N{constructor(title,opts){this.title=title;this.opts=opts||{};this.closed=false;shown.push(this)}close(){this.closed=true}static get permission(){return permission}static requestPermission(){asked++;permission=answer;return Promise.resolve(permission)}}w.Notification=N}
      w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);let body={};
        if(opts.method==='POST')posts.push({path:u.pathname,body:opts.body?JSON.parse(opts.body):null});
        if(u.pathname==='/api/auth')return {ok:true,status:204};
        if(u.pathname==='/api/dash')body=dash;
        else if(u.pathname==='/api/settings')body=settings;
        else if(u.pathname==='/api/workitem'||u.pathname==='/api/issue'){const id=u.searchParams.get('ref');body={kind:'handoff',ref:id,title:'Task '+id,body:{goal:'Task '+id},tree:[{...task(id,'alice'),focus:true}],prs:[]}}
        else if(u.pathname==='/api/issues')body={issues:[]};
        else if(u.pathname==='/api/chat')body={chats:[],roles:[],gateway_ready:false};
        else if(u.pathname==='/api/checks')body={handoff:u.searchParams.get('id'),check:'',runs:[],none:'This task has no check.'};
        else if(u.pathname==='/api/action')body={ok:true};
        return {ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)}}}});
    return {w:dom.window,errors}}
  return {load,shown,posts,store,get asked(){return asked},set permission(v){permission=v},set hidden(v){hidden=v},set supported(v){supported=v},set answer(v){answer=v}}}
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const refresh=async w=>{await w.eval('refresh()');await settle()};
(async()=>{
 // 1. Granted, tab in the background. The first look only remembers what is already there.
 const b=browser();b.hidden=true;let {w,errors}=b.load();await settle();assert(!errors.length,errors.join('\n'));
 assert.equal(b.shown.length,0,'an item already there when the browser first looked raised a notification');
 assert(JSON.parse(b.store.get('dash-notified:alice')).includes('blocked:hof-old:'+now),'the items seen were not remembered');
 // A new blocked worker of alice's, one for bob (another person: the server marks it not hers,
 // as it does an approval on bob's work) and nothing else: exactly one notification.
 dash.inbox=[blocked('hof-old'),blocked('hof-new'),blocked('hof-bob',{mine:false,claimer:'s-bob',from:'s-bob'})];
 dash.waiting=[{what:'approval',ref:'apr-bob',title:'bob asks to push',from:'s-bob',handoff:'hof-bob',age:'1m',can_answer:true}];
 await refresh(w);
 assert.equal(b.shown.length,1,'want exactly one notification, got '+b.shown.map(n=>n.title+': '+n.opts.body).join('; '));
 const n=b.shown[0];assert.equal(n.title,'Worker blocked');assert(n.opts.body.startsWith('Goal of hof-new'),'body is not the task goal: '+n.opts.body);
 assert(n.opts.body.includes('<img'),'the goal is passed as text');assert(!n.opts.body.includes('permission'),'the item text went into the notification');
 assert.equal(n.opts.tag,'agentd-blocked:hof-new:'+now);
 // Refreshing again raises nothing.
 await refresh(w);await refresh(w);assert.equal(b.shown.length,1,'a refresh raised the same item again');
 // Clicking it opens that item and marks it read.
 n.onclick();await settle();
 assert.equal(w.location.hash,'#issues/hof-new','clicking did not open the item');assert(n.closed,'the notification stayed open');
 assert(b.posts.some(p=>p.body&&p.body.action==='inbox_mark'&&p.body.id==='blocked:hof-new:'+now&&p.body.mark==='read'),'clicking did not mark the item read: '+JSON.stringify(b.posts));
 assert(!errors.length,errors.join('\n'));w.close();
 // 2. A reload (a new page on the same browser) raises nothing for what was already raised.
 ({w,errors}=b.load());await settle();assert.equal(b.shown.length,1,'a reload raised an item again');
 // 3. Tab in front: a new item raises nothing, now or once the tab goes to the background.
 b.hidden=false;dash.inbox=[...dash.inbox,blocked('hof-front')];await refresh(w);assert.equal(b.shown.length,1,'an item arriving with the tab in front raised a notification');
 b.hidden=true;await refresh(w);assert.equal(b.shown.length,1,'an item seen in front was raised later');
 // A finished task and a failed one are items too.
 dash.inbox=[...dash.inbox,{id:'review:hof-old:1',kind:'review',title:'ready',goal:'Goal of hof-old',handoff:'hof-old',age:'1m',read:false,mine:true},{id:'failed:run-9',kind:'failed',title:'claude worker failed: lost',goal:'Goal of hof-front',handoff:'hof-front',age:'1m',read:false,mine:true}];
 await refresh(w);assert.deepEqual(b.shown.slice(1).map(n=>n.title).sort(),['Task done: ready for review','Task failed']);
 // 4. Settings: granted says On, and can be turned off in this browser.
 const personal=async()=>{w.location.hash='#settings/personal';await settle();return w.document.querySelector('#set-browser-notify')};
 let sec=await personal();assert(sec,'no In this browser section');assert(sec.textContent.includes('In this browser'));assert(sec.textContent.includes('On.'),sec.textContent);
 [...sec.querySelectorAll('button')].find(x=>x.textContent==='Turn off in this browser').click();await settle();
 sec=w.document.querySelector('#set-browser-notify');assert(sec.textContent.includes('Off in this browser'),sec.textContent);
 dash.inbox=[...dash.inbox,blocked('hof-off')];await refresh(w);assert.equal(b.shown.length,3,'turned off, and it still raised one');
 [...sec.querySelectorAll('button')].find(x=>x.textContent==='Turn on notifications').click();await settle();
 assert(w.document.querySelector('#set-browser-notify').textContent.includes('On.'));
 assert(!errors.length,errors.join('\n'));w.close();
 // 5. Not asked yet: the setting asks the browser once.
 const c=browser();c.permission='default';c.answer='granted';({w,errors}=c.load());await settle();
 sec=await personal();assert(sec.textContent.includes('Off.'),sec.textContent);assert.equal(c.asked,0,'asked for permission before the person chose to');
 [...sec.querySelectorAll('button')].find(x=>x.textContent==='Turn on notifications').click();await settle();
 assert.equal(c.asked,1,'want one permission prompt');assert(w.document.querySelector('#set-browser-notify').textContent.includes('On.'),'granted, and the setting does not say On');
 assert(!errors.length,errors.join('\n'));w.close();
 // 6. Denied: the setting says so, has no button, and a new item raises nothing and breaks nothing.
 const d=browser();d.permission='denied';d.hidden=true;({w,errors}=d.load());await settle();
 sec=await personal();assert(sec.textContent.includes('blocked for this dash'),sec.textContent);assert(!sec.querySelector('button'),'a denied setting offers a button that cannot work');
 dash.inbox=[...dash.inbox,blocked('hof-denied')];await refresh(w);assert.equal(d.shown.length,0,'denied, and it raised one');
 assert(w.document.querySelector('#inbox-badge').textContent,'the inbox stopped drawing');assert(!errors.length,errors.join('\n'));w.close();
 // 7. Unsupported: the setting says so, nothing breaks.
 const e=browser();e.supported=false;e.hidden=true;({w,errors}=e.load());await settle();
 assert.equal(typeof w.Notification,'undefined');
 sec=await personal();assert(sec.textContent.includes('cannot show notifications'),sec.textContent);assert(!sec.querySelector('button'));
 dash.inbox=[...dash.inbox,blocked('hof-none')];await refresh(w);
 assert(w.document.querySelector('#set-personal').textContent.includes('Your email address'),'the rest of Notifications is gone');
 assert(!errors.length,errors.join('\n'));w.close();
 console.log('dash_notify: ok');process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
