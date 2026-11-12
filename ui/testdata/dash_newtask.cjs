// The new task sheet (#453): two kinds, Implement and Review a PR; acceptance
// criteria, a check and an issue, with the checkout's task file filled in from
// GET /api/taskdefaults. An implement task with neither criteria nor a check is
// refused in the sheet before anything is sent; what is sent is what agentd new
// takes. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_newtask.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const dash={user:'alice',role:'owner',now,dispatch:true,dispatch_budget:'30m',checkouts:['/plain','/filed'],handoff_list:[],sessions:[],done:[],claims:[],messages:[],
 waiting:[{what:'PR',ref:'acme/repo#7',title:'Fix the parser',project:'acme/repo',age:'1m'},{what:'issue',ref:'acme/repo#3',title:'Not a PR',project:'acme/repo',age:'1m'}]};
const defaults={'/plain':{cwd:'/plain',accept:[]},'/filed':{cwd:'/filed',file:'/filed/.agentd/tasks.toml',accept:['go vet is clean '+evil],check:'go test ./...',check_from:'/filed/.agentd/tasks.toml:1'}};
const issues={issues:[{ref:'acme/repo#3',repo:'acme/repo',title:'Open issue',state:'OPEN',handoffs:[],prs:[]},{ref:'acme/repo#4',repo:'acme/repo',title:'Closed issue',state:'CLOSED',handoffs:[],prs:[]}]};
const errors=[],writes=[],asked=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#issues',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.crypto.getRandomValues=a=>{for(let i=0;i<a.length;i++)a[i]=i;return a};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/taskdefaults'){const cwd=u.searchParams.get('cwd');asked.push(cwd);body=defaults[cwd]}
  else if(u.pathname==='/api/issues')body=issues;
  else if(u.pathname==='/api/action'){writes.push(JSON.parse(opts.body));body={ok:true,handoff:'hof-new'}}
  else if(u.pathname==='/api/chat')body={chats:[],roles:[],gateway_ready:false};
  else if(u.pathname==='/api/team')body={roles:[],members:[],default_tool:'claude',handoff_roles:{}};
  return {ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)}}}});
const w=dom.window,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const sheetEl=()=>w.document.querySelector('dialog.sheet'),field=name=>[...sheetEl().querySelectorAll('input,select,textarea')].find(n=>n.id.endsWith('-'+name));
const box=name=>field(name).closest('.sheet-field'),set=(name,value)=>{const n=field(name);n.value=value;n.dispatchEvent(new w.Event('input'));n.dispatchEvent(new w.Event('change'))};
const submit=async()=>{sheetEl().querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle()};
const pick=(name,label)=>{const b=[...box(name).querySelectorAll('.views button')].find(n=>n.textContent===label);assert(b,'no '+label+' button');b.click()};
const open=async()=>{w.eval('newHandoffSheet()');await settle();assert(sheetEl(),'the sheet did not open')};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // An implement task is the default kind; the PR picker is hidden.
 await open();
 for(const f of ['kind','goal','accept','check','issue','cwd','budget'])assert(field(f),'the sheet lacks '+f);
 assert.equal(field('kind').value,'implement');assert(box('pr').hidden,'the PR picker shows on an implement task');
 assert.equal(box('goal').querySelector('label').textContent,'Goal');
 // The Tasks page's open issues are the issue field's choices.
 const list=w.document.getElementById(field('issue').getAttribute('list'));assert(list,'the issue field has no choices');
 assert.deepEqual([...list.querySelectorAll('option')].map(o=>o.value),['acme/repo#3'],'issue choices are not the open issues');
 // The first checkout has no task file: the check starts empty, no note.
 assert.equal(asked[0],'/plain');assert.equal(field('check').value,'');assert(box('accept').querySelector('.newtask-file').hidden);
 // Neither criteria nor a check: refused in the sheet with the reason, nothing sent.
 set('goal','Add a flag');await submit();
 assert.equal(writes.length,0,'an implement task with neither criteria nor a check was sent');
 assert.equal(field('accept').getAttribute('aria-invalid'),'true');
 assert(box('accept').querySelector('.field-error').textContent.includes('needs acceptance criteria or a check'),'no reason given');
 // Two criteria, a check and an issue: sent as agentd new takes them.
 set('accept','the flag is documented\na test covers it');set('check','go test ./...');set('issue','acme/repo#3');await submit();
 assert.equal(writes.length,1,'the task was not sent');assert(!sheetEl(),'the sheet stayed open');
 const sent=writes[0];
 assert.equal(sent.action,'offer');assert.equal(sent.kind,'implement');assert.equal(sent.goal,'Add a flag');
 assert.equal(sent.accept,'the flag is documented\na test covers it');assert.equal(sent.check,'go test ./...');assert.equal(sent.issue,'acme/repo#3');assert.equal(sent.cwd,'/plain');
 assert(!('pr' in sent),'an implement task sent a PR');
 // A checkout with a task file: its check is filled in, its criteria named as
 // text, and they count, so a task without criteria of its own may go.
 await open();set('cwd','/filed');await settle();
 assert.equal(field('check').value,'go test ./...','the task file\'s check is not filled in');
 const note=box('accept').querySelector('.newtask-file');assert(!note.hidden,'the task file is not named');
 assert(note.textContent.includes('go vet is clean '+evil)&&note.textContent.includes('/filed/.agentd/tasks.toml:1'),note.textContent);assert(!sheetEl().querySelector('img'),'the task file\'s text became markup');
 set('goal','Use the file');set('check','');await submit();
 assert.equal(writes.length,2,'the file\'s criteria did not count');assert.equal(writes[1].check,'','an emptied check was not sent as none');
 // Review a PR: pick an open PR; it goes as a review task linked to it.
 await open();pick('kind','Review a PR');
 assert(!box('pr').hidden,'the PR picker is hidden on a review');assert.equal(box('goal').querySelector('label').textContent,'Goal (optional)');
 assert.deepEqual([...field('pr').options].map(o=>o.value),['','acme/repo#7'],'the PR choices are not the open PRs');
 await submit();assert.equal(writes.length,2,'a review without a PR was sent');assert.equal(field('pr').getAttribute('aria-invalid'),'true');
 set('pr','acme/repo#7');await submit();
 assert.equal(writes.length,3,'the review was not sent');
 assert.equal(writes[2].kind,'review');assert.equal(writes[2].pr,'acme/repo#7');assert.equal(writes[2].goal,'');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_newtask: ok');process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
