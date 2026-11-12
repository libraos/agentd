// New task (#453, a page since #482): two kinds, Implement and Review a PR;
// acceptance criteria, a check and an issue, with the checkout's task file filled
// in from GET /api/taskdefaults. An implement task with neither criteria nor a
// check is refused on the page before anything is sent; what is sent is what
// agentd new takes. The page has the task in the centre and "Where it runs"
// beside it (agent, repository, workspace, branch, other repositories, role,
// budget, the estimate for the task's type), keeps a draft across a reload until
// Start or Cancel, and saves without starting. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_newtask.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const html=fs.readFileSync(process.argv[2],'utf8');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const dash={user:'alice',role:'owner',now,dispatch:true,dispatch_budget:'30m',checkouts:['/plain','/filed'],handoff_list:[],sessions:[],done:[],claims:[],messages:[],
 waiting:[{what:'PR',ref:'acme/repo#7',title:'Fix the parser',project:'acme/repo',age:'1m'},{what:'issue',ref:'acme/repo#3',title:'Not a PR',project:'acme/repo',age:'1m'}]};
const defaults={'/plain':{cwd:'/plain',accept:[],workspace:'worktree',branch_from:'main'},'/filed':{cwd:'/filed',file:'/filed/.agentd/tasks.toml',accept:['go vet is clean '+evil],check:'go test ./...',check_from:'/filed/.agentd/tasks.toml:1',workspace:'checkout',branch_from:'feature '+evil}};
const estimates={implement:{type:'implement',label:'implementation',n:7,workers:7,bench:0,low:1.2,median:2,high:3.5,line:'estimated $1.20–3.50 (implementation, median $2, 7 past jobs)'},review:{type:'review',label:'review',n:0,workers:0,bench:0,line:'no estimate (review, 0 past jobs with a known cost; 5 needed)'}};
const issues={issues:[{ref:'acme/repo#3',repo:'acme/repo',title:'Open issue',state:'OPEN',handoffs:[],prs:[]},{ref:'acme/repo#4',repo:'acme/repo',title:'Closed issue',state:'CLOSED',handoffs:[],prs:[]}]};
const errors=[],writes=[],asked=[],estAsked=[];let failNext=0,roleList=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
// open makes a window on url; storage carries localStorage across a "reload".
const open=(url,storage)=>new JSDOM(html,{url:'http://127.0.0.1:21620/'+url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 for(const [k,v] of Object.entries(storage||{}))w.localStorage.setItem(k,v);
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.crypto.getRandomValues=a=>{for(let i=0;i<a.length;i++)a[i]=i;return a};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/taskdefaults'){const cwd=u.searchParams.get('cwd');asked.push(cwd);body=defaults[cwd]}
  else if(u.pathname==='/api/estimate'){estAsked.push(u.search);body=estimates[u.searchParams.get('type')]}
  else if(u.pathname==='/api/issues')body=issues;
  else if(u.pathname==='/api/templates')body={templates:[],can_save:true};
  else if(u.pathname==='/api/action'){if(failNext){failNext--;throw new TypeError('Failed to fetch')}writes.push(JSON.parse(opts.body));body={ok:true,handoff:'hof-new'}}
  else if(u.pathname==='/api/chat')body={chats:[],roles:[],gateway_ready:false};
  else if(u.pathname==='/api/team')body={roles:roleList,members:[],default_tool:'claude',handoff_roles:{}};
  return {ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)}}}});
let dom=open('#issues'),w=dom.window;
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<5;i++)await tick()};
const pageEl=()=>w.document.getElementById('page-new'),form=()=>w.document.getElementById('nt-form');
const field=name=>form()&&[...form().querySelectorAll('.sheet-field input,.sheet-field select,.sheet-field textarea')].find(n=>n.id.endsWith('-'+name));
const box=name=>field(name).closest('.sheet-field'),set=(name,value)=>{const n=field(name);n.value=value;n.dispatchEvent(new w.Event('input',{bubbles:true}));n.dispatchEvent(new w.Event('change',{bubbles:true}))};
const submit=async()=>{form().dispatchEvent(new w.Event('submit',{cancelable:true}));await settle()};
const button=label=>[...form().querySelectorAll('.nt-foot button')].find(b=>b.textContent===label);
const pick=(name,label)=>{const b=[...box(name).querySelectorAll('.views button')].find(n=>n.textContent===label);assert(b,'no '+label+' button');b.click()};
const draft=()=>w.localStorage.getItem('dash-newtask-draft');
const openPage=async()=>{w.eval('newHandoffSheet()');await settle();assert.equal(w.location.hash,'#new','New task did not open its page');assert(!pageEl().hidden&&form(),'the page did not open');assert(!w.document.querySelector('dialog.sheet'),'New task opened a sheet')};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // New task opens as a page, not a sheet, with both parts.
 await openPage();
 const main=form().querySelector('section.nt-main'),side=form().querySelector('aside.nt-side');
 assert(main&&side,'the page lacks its two parts');assert.equal(side.getAttribute('aria-label'),'Where it runs');assert(side.querySelector('.nt-tabs').textContent.includes('Where it runs'));
 assert.equal(w.document.getElementById('page-title').textContent,'New task');
 assert.equal(w.document.querySelector('[data-rail="issues"]').getAttribute('aria-current'),'page','Tasks is not the current rail item on New task');
 // Every field of the old sheet is here, the task's in the centre and where it runs beside it.
 for(const f of ['kind','pr','goal','state','accept','check','issue'])assert(main.contains(field(f)),'the centre lacks '+f);
 for(const f of ['tool','cwd','also','role','budget'])assert(side.contains(field(f)),'Where it runs lacks '+f);
 assert(main.querySelector('#tpl-pick'),'no template picker');
 for(const b of ['Start worker','Save without starting','Save as template','Cancel'])assert(button(b),'no '+b);
 assert.equal(box('tool').querySelector('label').textContent,'Agent (optional)');assert.equal(box('cwd').querySelector('label').textContent,'Repository');
 assert.deepEqual([...box('tool').querySelectorAll('.views button')].map(b=>b.textContent),['Claude','Codex','opencode']);
 assert.equal(field('budget').value,'30m','the budget is not preset');
 assert.equal(field('kind').value,'implement');assert(box('pr').hidden,'the PR picker shows on an implement task');
 assert.equal(box('goal').querySelector('label').textContent,'Goal');
 // Where it runs: workspace and branch, as the checkout's defaults say, as text.
 const where=w.document.getElementById('nt-where');assert.equal(where.querySelector('.views .on').textContent,'New worktree',where.textContent);assert.equal(w.document.getElementById('nt-branch').textContent,'main');
 // The estimate for the kind: a range from history.
 assert(estAsked.some(q=>q.includes('type=implement')),'no estimate asked for');assert(w.document.getElementById('nt-estimate').textContent.includes('estimated $1.20–3.50'),w.document.getElementById('nt-estimate').textContent);
 // The Tasks page's open issues are the issue field's choices.
 const list=w.document.getElementById(field('issue').getAttribute('list'));assert(list,'the issue field has no choices');
 assert.deepEqual([...list.querySelectorAll('option')].map(o=>o.value),['acme/repo#3'],'issue choices are not the open issues');
 // The first checkout has no task file: the check starts empty, no note.
 assert.equal(asked[0],'/plain');assert.equal(field('check').value,'');assert(box('accept').querySelector('.newtask-file').hidden);
 // Neither criteria nor a check: refused on the page with the reason, nothing sent.
 set('goal','Add a flag');await submit();
 assert.equal(writes.length,0,'an implement task with neither criteria nor a check was sent');
 assert.equal(field('accept').getAttribute('aria-invalid'),'true');
 assert(box('accept').querySelector('.field-error').textContent.includes('needs acceptance criteria or a check'),'no reason given');
 // A draft survives a reload: a new window on the same storage has what was typed.
 set('accept','the flag is documented\na test covers it');set('check','go test ./...');set('issue','acme/repo#3');set('state','It was asked for '+evil);
 assert(draft()&&JSON.parse(draft()).values.goal==='Add a flag','no draft kept');
 const store={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);store[k]=w.localStorage.getItem(k)}
 dom.window.close();dom=open('#new',store);w=dom.window;await settle();
 assert(form(),'the page did not come back after a reload');
 for(const [f,v] of [['goal','Add a flag'],['accept','the flag is documented\na test covers it'],['check','go test ./...'],['issue','acme/repo#3'],['state','It was asked for '+evil]])assert.equal(field(f).value,v,f+' was not kept across a reload');
 assert(!pageEl().querySelector('img'),'draft text became markup');
 // Two criteria, a check and an issue: sent as agentd new takes them, with one key
 // for every retry; a failed send keeps the page and the draft.
 failNext=1;await submit();
 assert.equal(writes.length,0);assert(!form().querySelector('.sheet-error').hidden,'a failed send said nothing');assert(draft(),'a failed send dropped the draft');assert.equal(w.location.hash,'#new');
 const key=JSON.parse(draft()).key;
 await submit();
 assert.equal(writes.length,1,'the task was not sent');
 const sent=writes[0];
 assert.equal(sent.action,'offer');assert.equal(sent.kind,'implement');assert.equal(sent.goal,'Add a flag');assert.equal(sent.state,'It was asked for '+evil);
 assert.equal(sent.accept,'the flag is documented\na test covers it');assert.equal(sent.check,'go test ./...');assert.equal(sent.issue,'acme/repo#3');assert.equal(sent.cwd,'/plain');assert.equal(sent.worker,'claude');assert.equal(sent.budget,'30m');
 assert(/^[0-9a-f]{24}$/.test(sent.key),'no client key');assert.equal(sent.key,key,'a retry sent a new key');assert(!('pr' in sent),'an implement task sent a PR');assert(!('start' in sent),'Start sent start');assert(!('also' in sent),'an empty also was sent');
 // After Start the draft is gone and the task opens.
 assert.equal(draft(),null,'the draft outlived Start');assert.equal(w.location.hash,'#issues/hof-new','Start did not open the task');
 // A checkout with a task file: its check is filled in, its criteria named as
 // text, and they count, so a task without criteria of its own may go; it is
 // worked in place on its branch.
 await openPage();assert.equal(field('goal').value,'','a new page kept the started task');set('cwd','/filed');await settle();
 assert.equal(field('check').value,'go test ./...','the task file\'s check is not filled in');
 const note=box('accept').querySelector('.newtask-file');assert(!note.hidden,'the task file is not named');
 assert(note.textContent.includes('go vet is clean '+evil)&&note.textContent.includes('/filed/.agentd/tasks.toml:1'),note.textContent);assert(!pageEl().querySelector('img'),'the task file\'s text became markup');
 assert.equal(w.document.getElementById('nt-where').querySelector('.views .on').textContent,'Main checkout');assert.equal(w.document.getElementById('nt-branch').textContent,'feature '+evil);
 // Save without starting: the same request with start:false, other repositories as typed, Codex chosen.
 set('goal','Use the file');set('check','');pick('tool','Codex');set('also','/other\n/third');button('Save without starting').click();await settle();
 assert.equal(writes.length,2,'the file\'s criteria did not count');assert.equal(writes[1].check,'','an emptied check was not sent as none');
 assert.equal(writes[1].start,false,'Save without starting started');assert.equal(writes[1].also,'/other\n/third');assert.equal(writes[1].worker,'codex');assert.equal(writes[1].cwd,'/filed');
 assert.equal(draft(),null,'the draft outlived Save');
 // Review a PR: pick an open PR; it goes as a review task linked to it; the estimate
 // follows the kind and says when there is no history.
 await openPage();pick('kind','Review a PR');await settle();
 assert(!box('pr').hidden,'the PR picker is hidden on a review');assert.equal(box('goal').querySelector('label').textContent,'Goal (optional)');
 assert(estAsked.some(q=>q.includes('type=review')),'the estimate did not follow the kind');
 assert(w.document.getElementById('nt-estimate').textContent.includes('No history yet for review tasks'),w.document.getElementById('nt-estimate').textContent);
 assert.deepEqual([...field('pr').options].map(o=>o.value),['','acme/repo#7'],'the PR choices are not the open PRs');
 await submit();assert.equal(writes.length,2,'a review without a PR was sent');assert.equal(field('pr').getAttribute('aria-invalid'),'true');
 set('pr','acme/repo#7');await submit();
 assert.equal(writes.length,3,'the review was not sent');
 assert.equal(writes[2].kind,'review');assert.equal(writes[2].pr,'acme/repo#7');assert.equal(writes[2].goal,'');
 // Cancel drops the draft and goes back.
 await openPage();set('goal','Never mind');assert(draft(),'no draft');button('Cancel').click();await settle();
 assert.equal(draft(),null,'the draft outlived Cancel');assert.notEqual(w.location.hash,'#new','Cancel stayed on the page');
 await openPage();assert.equal(field('goal').value,'','Cancel kept the goal');
 // A dollar budget asks for the estimate with that cap.
 set('budget','90m,$5');await settle();assert(estAsked.some(q=>q.includes('budget=%245')),'the dollar cap was not asked: '+estAsked.join(' '));
 // Assign work to a role opens the same page with the role set.
 roleList=[{name:'fixer',checkouts:[{dir:'/plain'}]}];w.eval("TEAM.lists={roles:[{name:'fixer',checkouts:[{dir:'/plain'}]}],members:[],default_tool:'claude',handoff_roles:{}}");
 w.eval("location.hash='#issues'");await settle();w.eval("teamFormOpen('fixer')");await settle();
 assert.equal(field('role').value,'fixer');assert.equal(w.document.getElementById('nt-title').textContent,'Assign work to fixer');assert.equal(field('tool').value,'','a role task did not use the role settings');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_newtask: ok');process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
