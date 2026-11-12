const fs=require('fs'),vm=require('vm'),assert=require('assert');
const page=fs.readFileSync(process.argv[2],'utf8');
// Every inline script parses as a whole: a name declared twice in one script stops the page.
for(const m of page.matchAll(/<script>([\s\S]*?)<\/script>/g))new Function(m[1]);
class N {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.listeners={};this.style={};this.dataset={};this.hidden=false;this.value='';this.disabled=false;this.isConnected=true;this.classList={toggle(){},add(){},remove(){}};this._text='';}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='id')this.id=v;if(k==='hidden')this.hidden=true;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v)}
 getAttribute(k){return this.attrs[k]} removeAttribute(k){delete this.attrs[k]} get attributes(){return Object.entries(this.attrs).map(([name,value])=>({name,value}))}
 addEventListener(k,f){(this.listeners[k]??=[]).push(f)} append(...ns){for(const n of ns.flat(Infinity)){if(n instanceof N)n.parent=this;this.children.push(n)}} replaceChildren(...ns){this.children=[];this.append(...ns)}
 get textContent(){return this._text+this.children.map(n=>n instanceof N?n.textContent:String(n)).join('')} set textContent(v){this.children=[];this._text=String(v)}
 focus(){ctx.document.activeElement=this} closest(){return null} matches(q){return q.split(',').some(x=>x.toUpperCase()===this.tagName)} contains(n){return this===n||this.children.some(c=>c instanceof N&&c.contains(n))} remove(){this.isConnected=false;if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this)}
 showModal(){this.open=true} close(){this.open=false} getClientRects(){return this.hidden?[]:[{}]}
 querySelectorAll(q){return this.children.flatMap(c=>c instanceof N?[...(q.split(',').some(x=>x.trim().split('[')[0].toUpperCase()===c.tagName)?[c]:[]),...c.querySelectorAll(q)]:[])}
}
const ids={},ctx={console,Node:N,localStorage:{getItem(){return ''}},setTimeout(){return 1},clearTimeout(){},CSS:{escape:x=>x},document:{activeElement:null,createElement:t=>new N(t),createTextNode:t=>String(t),getElementById:id=>ids[id]??=new N(),addEventListener(){},querySelectorAll(){return []},querySelector(){return new N('main')},body:new N('body')},refresh(){},render(){},settingsAccess(){},nameOf:x=>x,sessLabel:x=>x,teamHref:(k,id)=>'#team/'+k+'/'+id,inboxRead(){},itemHash:(i,id)=>'#issues/'+id};
ctx.document.activeElement=new N('button');vm.createContext(ctx);
let core=page.split('// region:core\n')[1].split('function meter(')[0];
vm.runInContext(core,ctx);
vm.runInContext(page.split('function approvalDecision(')[1].split('// One row of what waits')[0].replace(/^/,'function approvalDecision('),ctx);
// The missing-dependency note the worker sheets (New handoff, Dispatch, Start again) add.
vm.runInContext(page.split('function depsWarnText(')[1].split('function workerFields(')[0].replace(/^/,'function depsWarnText('),ctx);
vm.runInContext(page.split('function prDisabledReason(')[1].split('/* The board')[0].replace(/^/,'function prDisabledReason('),ctx);
const run=s=>vm.runInContext(s,ctx),event={preventDefault(){},stopPropagation(){}};
let writes=[];ctx.fetch=async(url,opts)=>{writes.push({url,body:JSON.parse(opts.body)});return {ok:true,status:200,json:async()=>({ok:true})}};
const current=()=>run('activeSheet.dialog'),submit=()=>current().children[0].onsubmit(event),input=()=>current().querySelectorAll('textarea,input')[0];
(async()=>{
 run("TOKEN='test'; approvalDecision('apr-1','Deploy release','requester','approve')");input().value='optional';run('activeSheet.cancel()');assert.equal(writes.length,0,'Cancel approved');assert.equal(run('activeSheet'),null);
 run("approvalDecision('apr-1','Deploy release','requester','reject')");await submit();assert.equal(writes.length,0,'empty reason rejected');assert.equal(input().getAttribute('aria-invalid'),'true');input().value='Fix the failing check';await submit();assert.equal(writes[0].body.note,'Fix the failing check');assert.equal(writes[0].body.decision,'reject');
 run("approvalDecision('apr-2','Deploy release','requester','approve',true)");input().value='Reviewed';await submit();assert.equal(writes[1].body.force,true);assert.equal(writes[1].body.note,'Reviewed');
 run("prDecision({ref:'acme/repo#1',title:'Change'},true)");assert.equal(ctx.document.activeElement.textContent,'Cancel','destructive focus');const key={key:'Enter',target:ctx.document.activeElement,preventDefault(){this.prevented=true},stopPropagation(){}};current().listeners.keydown[0](key);assert(key.prevented,'Enter closes PR');run('activeSheet.cancel()');assert.equal(writes.length,2);
 run("prDecision({ref:'acme/repo#1',title:'Change'},false)");assert.equal(ctx.document.activeElement.textContent,'Cancel','Merge initial focus');assert(current().textContent.includes('“Change”. The changes'));const mergeKey={...key,prevented:false,target:ctx.document.activeElement};current().listeners.keydown[0](mergeKey);assert(mergeKey.prevented,'Enter merges PR');ctx.fetch=async()=>{throw new TypeError('Failed to fetch')};await submit();assert(run('activeSheet'),'failed write closed sheet');assert(current().textContent.includes('check whether the change went through'));assert(!current().querySelectorAll('button').at(-1).disabled);run('activeSheet.cancel()');
 assert(run("prDisabledReason({pr_owner:false,merge_repos:['acme/repo']},{ref:'acme/repo#1'})").includes('owner'));
 assert(run("prDisabledReason({pr_owner:true,merge_repos:[]},{ref:'acme/repo#1'})").includes('[sync]'));
 assert.equal(run("prDisabledReason({pr_owner:true,merge_repos:['acme/repo']},{ref:'acme/repo#1'})"),'');
 const rendered=[];ctx.render=()=>rendered.push(run('Object.keys(PENDING).length'));run('lastDash={}');await run("pending('hof-offline','Stopping…',{action:'stop_worker',id:'hof-offline'})");assert.deepEqual(rendered,[1,0],'failed write did not clear the pending row before refresh');assert.equal(run('Object.keys(PENDING).length'),0);
 let reloaded=false,logoutURL='';Object.assign(ctx,{DR:null,selectedSession:null,PAGES:{},ROUTE:{item:'inbox'},chatAuthChanged(){},location:{reload(){reloaded=true}}});ctx.fetch=async url=>{logoutURL=url;return {ok:true,status:204}};run("TOKEN='';COOKIE=true;USER='alice';ROLE='owner'");await ids.tokclear.onclick();assert.equal(logoutURL,'/api/logout');assert.equal(run('COOKIE'),false);assert(reloaded,'sign-out retained protected page caches');
 // Start again: a failed work item offers it in place of Stop, and only Confirm and start writes.
 vm.runInContext(page.split('// retryHandoff starts')[1].split('// board draws')[0].replace(/^/,'//'),ctx);
 // This DOM has no <select>: the fields as plain inputs, so their preset values are what is read.
 run("function workerFields(d){return [{name:'tool',label:'Worker',required:true,value:'claude'},{name:'cwd',label:'Checkout',required:true,value:(d.checkouts||[])[0]||''}]}");
 ctx.fetch=async(url,opts)=>{writes.push({url,body:JSON.parse(opts.body)});return {ok:true,status:200,json:async()=>({ok:true})}};ctx.refresh=()=>{};ctx.toast=()=>{};
 run("TOKEN='test';lastDash={dispatch:true,checkouts:['/other','/repo']};failedItem={id:'hof-r',to:'any',state:'offered',dispatched:true,goal:'Fix the parser',accept:['tests pass'],retry:{cwd:'/repo',tool:'codex',budget:'20m'},attempts:[{running:false,end_reason:'failed_to_start',failure:'error: boom'}]}");
 const acts=run('handoffActions(lastDash,failedItem)');assert.equal(acts.length,1);assert.equal(acts[0].textContent,'Start again','failed item lacks Start again');
 assert.equal(run("handoffActions(lastDash,{...failedItem,retry:null})")[0].textContent,'Stop','running item lost Stop');
 const before=writes.length;run('retryHandoff(failedItem)');const text=current().textContent;for(const want of ['Fix the parser','tests pass','20m','error: boom','Confirm and start'])assert(text.includes(want),'retry sheet lacks '+want);
 run('activeSheet.cancel()');assert.equal(writes.length,before,'Cancel started a worker');
 run('retryHandoff(failedItem)');await submit();assert.equal(writes.length,before+1);assert.deepEqual(writes[before].body,{action:'retry',id:'hof-r',tool:'codex',cwd:'/repo'});
 // shortTitle collapses a long path but never cuts a URL.
 assert.equal(run("shortTitle('Fix /home/me/src/app/main.go now')"),'Fix main.go now');
 assert.equal(run("shortTitle(\"Add a link to this repo's GitHub issues page: https://github.com/acme/app/issues\")"),"Add a link to this repo's GitHub issues page: https://github.com/acme/app/issues");
 assert.equal(run("shortTitle('See https://example.com/a/b/c and /srv/x/y/z.txt')"),'See https://example.com/a/b/c and z.txt');
 // Repositories: read-only rows, checks as chips with their fix and a Copy, repository text as text.
 vm.runInContext(page.split('// region:repositories\n')[1].split('// end:repositories')[0],ctx);
 let copied='';Object.assign(ctx,{URLSearchParams,ROUTE:{item:'team',rest:['repositories']},teamDraw(){},chatCopy(t){copied=t}});
 const evil='<img src=x onerror=alert(1)>';
 run("REPOS.at=Date.now();REPOS.data={repositories:[]}");let body=run('reposBody()');const flat=b=>b.map(n=>n.textContent).join('\n');
 assert(flat(body).includes('No repositories yet. Run agentd init inside a repository on this host.'),'empty state');assert(flat(body).includes('not from this page'),'no terminal note');
 run("REPOS.data={repositories:[{path:'/srv/alpha',github:'acme/alpha',default_branch:'main',branch:'main',project:'acme/alpha',worker_worktrees:3,open:2,running:1,last:{id:'hof-1',goal:"+JSON.stringify(evil+' see https://github.com/acme/alpha/issues')+",state:'claimed'},checks:[{name:'trust',ok:false,detail:'not trusted',fix:'agentd trust /srv/alpha'},{name:'sync',ok:true,detail:'listed'},{name:'gh',ok:null,detail:'checking'},{name:'origin',ok:false,detail:'3 commits behind origin/main, fetched 2 min ago',fix:'git -C /srv/alpha pull --ff-only'}]},{path:'/srv/empty',github:null,remote:null,project:'empty',open:0,running:0,last:null,checks:[{name:'commit',ok:false,detail:'no commit',fix:\"cd /srv/empty && git commit -m 'First commit'\"},{name:'origin',ok:null,detail:'does not apply: no origin'}]},{path:'/srv/new',github:'acme/new',project:'acme/new',open:0,running:0,last:null,checks:[{name:'origin',ok:null,detail:'not known yet: agentd fetches origin in the background, at most every 3 minutes'}]}]}");
 body=run('reposBody()');const rtext=flat(body);
 for(const want of ['acme/alpha','/srv/alpha','default branch main','3 worker worktrees on disk','Claude trust: Needs a fix','GitHub sync: OK','gh access: Checking…','agentd trust /srv/alpha','2 open in Tasks','1 worker running','no origin','no tasks yet','First commit: Needs a fix','see https://github.com/acme/alpha/issues','Up to date with GitHub: Needs a fix','3 commits behind origin/main, fetched 2 min ago','git -C /srv/alpha pull --ff-only','Up to date with origin: Does not apply','Up to date with GitHub: Checking…'])assert(rtext.includes(want),'repositories view lacks '+want);
 assert(rtext.includes(evil),'goal not shown as text');const all=body.flatMap(n=>n instanceof ctx.Node?[n,...n.querySelectorAll('img,a,button,code')]:[]);assert(!all.some(n=>n.tagName==='IMG'),'repository text became markup');
 const links=all.filter(n=>n.tagName==='A');assert(links.some(a=>a.getAttribute('href')==='#issues?project=acme%2Falpha'),'no Issues link for the project');assert(links.some(a=>a.getAttribute('href')==='#issues/hof-1'),'no link to the last task');
 const copies=all.filter(n=>n.tagName==='BUTTON');assert.equal(copies.length,3,'a Copy per fix');copies[0].listeners.click[0]({});assert.equal(copied,'agentd trust /srv/alpha');copies[1].listeners.click[0]({});assert.equal(copied,'git -C /srv/alpha pull --ff-only');
 assert(!all.some(n=>n.tagName==='BUTTON'&&n.textContent!=='Copy'),'repositories view has a control that writes');
 assert(!/\b(confirm|prompt)\(/.test(page),'native decision dialog remains');
 console.log('sheets: cancel, required reason, override, destructive Enter, failed writes, PR gates, start again and repositories passed');
 // Start again for someone the server would refuse: disabled, with the server's reason, and a click starts nothing.
 const who='only the handoff sender, claimer or an owner may start again',barred=run("handoffActions(lastDash,{...failedItem,retry:{...failedItem.retry,may:false,why_not:'"+who+"'}})")[0];
 assert.equal(barred.textContent,'Start again');assert.equal(barred.getAttribute('title'),who);assert.equal(barred.dataset.disabledReason,who);assert.equal(barred.getAttribute('aria-disabled'),'true');
 const sheetsBefore=writes.length;run('activeSheet=null');barred.listeners.click[0]();assert.equal(run('activeSheet'),null,'a barred Start again opened the sheet');assert.equal(writes.length,sheetsBefore);
 const allowed=run('handoffActions(lastDash,{...failedItem,retry:{...failedItem.retry,may:true}})')[0];assert.equal(allowed.getAttribute('aria-disabled'),undefined,'an allowed Start again is disabled');assert.equal(allowed.dataset.disabledReason,undefined);
 // A blocked worker's latest report: text, never markup; a long one cut with Show all, which stays open across redraws.
 vm.runInContext(page.split('// workerReport is a blocked')[1].split('function needRow(')[0].replace(/^/,'//'),ctx);
 assert.equal(run("workerReport({handoff:'h1',report_note:'  '})"),null,'empty report rendered');
 const short=run("workerReport({handoff:'h1',report_note:'<img src=x onerror=alert(1)> stable or beta?',report_ago:'2m'})");
 assert(short.textContent.includes('<img src=x onerror=alert(1)> stable or beta?'));assert(short.textContent.includes('2m ago'));assert(!short.querySelectorAll('img').length,'report markup became an element');assert(!short.querySelectorAll('button').length,'short report has Show all');
 run("longNote=['Blocked: the migration needs a decision.','Option 1: keep the column.','Option 2: drop it.','Option 3: rename it.','Option 4: ask the owner.','Option 5: stop.'].join('\\n')");
 const long=run("workerReport({handoff:'h2',report_note:longNote})"),more=long.querySelectorAll('button')[0];
 assert(more&&more.textContent==='Show all','long report lacks Show all');assert(!long.textContent.includes('Option 5'),'long report not cut');assert(long.textContent.includes('…'));assert.equal(more.getAttribute('aria-expanded'),'false');
 more.listeners.click[0]();assert(long.textContent.includes('Option 5: stop.'),'Show all did not show all');assert.equal(more.textContent,'Show less');assert.equal(more.getAttribute('aria-expanded'),'true');
 assert(run("workerReport({handoff:'h2',report_note:longNote})").textContent.includes('Option 5: stop.'),'a redraw closed the report');
 more.listeners.click[0]();assert(!long.textContent.includes('Option 5'));
 assert(run("workerReport({handoff:'h3',report_note:'x'.repeat(600)})").textContent.includes('…'),'one long line not cut');
 assert(!/\b(confirm|prompt)\(/.test(page),'native decision dialog remains');
 // Team permissions: the shared token is read-only on a team, and Stop, Dispatch,
 // the prompt box and approvals follow what the server says this person may do.
 run("TOKEN='t';USER='';ROLE='';ON_TEAM=true");assert.equal(run('CAN()'),false,'the token writes on a team');assert(run('writeReason()').includes('read-only on a team'),'no team reason for the token');
 run("ON_TEAM=false");assert.equal(run('CAN()'),true,'the token lost writes alone');
 run("ON_TEAM=true;USER='alice';ROLE='dev'");assert.equal(run('CAN()'),true,'a signed-in dev on a team cannot write');
 run("ROLE='viewer'");assert.equal(run('CAN()'),false,'a viewer can write');run("ROLE='dev'");
 const stopWhy='only the handoff sender, claimer or an owner may stop its worker';
 const stopBtn=run("handoffActions(lastDash,{id:'hof-s',to:'any',state:'offered',dispatched:true,may_stop:false,why_not:'"+stopWhy+"'})")[0];
 assert.equal(stopBtn.textContent,'Stop');assert.equal(stopBtn.getAttribute('aria-disabled'),'true');assert.equal(stopBtn.getAttribute('title'),stopWhy);
 run('activeSheet=null');stopBtn.listeners.click[0]();assert.equal(run('activeSheet'),null,'a barred Stop opened its sheet');
 assert.equal(run("handoffActions(lastDash,{id:'hof-s',to:'any',state:'offered',dispatched:true,may_stop:true})")[0].getAttribute('aria-disabled'),undefined,'an allowed Stop is disabled');
 const dispBtn=run("handoffActions(lastDash,{id:'hof-d',to:'any',state:'offered',dispatched:false,may_dispatch:false,why_not:'nope'})")[0];
 assert.equal(dispBtn.textContent,'Dispatch');assert.equal(dispBtn.getAttribute('aria-disabled'),'true');dispBtn.listeners.click[0]();assert.equal(run('activeSheet'),null,'a barred Dispatch opened its sheet');
 // Approvals: one's own request is an owner's logged override, or someone else's.
 const own=run("approvalActs('apr-o','Deploy','s1',true)").filter(Boolean);assert.deepEqual(own.map(b=>b.textContent),['Approve anyway (owner override)','Reject']);
 const before2=writes.length;own[0].listeners.click[0]();input().value='checked';await submit();assert.equal(writes[before2].body.force,true,'own approval without force');
 own[1].listeners.click[0]();input().value='not now';await submit();assert.equal(writes[before2+1].body.force,true,'own rejection without force');assert.equal(writes[before2+1].body.decision,'reject');
 assert.deepEqual(run("approvalActs('apr-x','Deploy','s1',false)").filter(Boolean).map(b=>b.textContent),['Approve','Reject'],'someone else’s request offered the override');
 vm.runInContext(page.split('function needNorm(')[1].split('function inboxRead(')[0].replace(/^/,'function needNorm('),ctx);
 Object.assign(ctx,{PENDING:ctx.PENDING||{},moreMenu:(items)=>{const n=new N('details');n.append(items.filter(Boolean));return n}});
 const waitRow=run("needActs(needNorm({what:'approval',ref:'apr-y',title:'Deploy',from:'s1',can_answer:false,self:true,answer_hint:'waiting for someone else (ask boss)'}))");
 const waitText=waitRow.filter(Boolean).map(n=>n.textContent).join(' ');assert(waitText.includes('Waiting for someone else (ask boss)'),'dev’s own request: '+waitText);assert(!waitRow.filter(Boolean).some(n=>n.tagName==='BUTTON'),'dev’s own request has a button');
 // S1: a failed card has one menu (its actions join the need row's), says the failure once, and keeps the CLI next step under Details.
 for(const [from,to] of [['// failureDetail: why','// workerReport is'],['// needRow is one need','function needItems(']])vm.runInContext(page.split(from)[1].split(to)[0].replace(/^/,'//'),ctx);
 ctx.sessLink=id=>id;ctx.moreMenu=items=>{const xs=items.filter(Boolean);if(!xs.length)return null;const n=new N('details');n.setAttribute('class','row-more');n.append(xs);return n};
 const walk=n=>[n,...n.children.filter(c=>c instanceof N).flatMap(walk)];
 ctx.cardStart=new N('button');ctx.cardStart.textContent='Start again';ctx.cardCheck=new N('button');ctx.cardCheck.textContent='Change check';
 const failedNeed={kind:'failed',id:'ib-f',handoff:'hof-r',title:'claude worker failed: failed_to_start',failure:'failed_to_start',next_step:'agentd handoff dispatch hof-r',transcript:'/var/log/w.jsonl',read:false};
 const frow=run('needRow('+JSON.stringify(failedNeed)+',{visible:[cardStart],more:[cardCheck]})'),fnodes=walk(frow);
 assert.equal(fnodes.filter(n=>n.attrs.class==='row-more').length,1,'a failed card has more than one menu');
 const fmenu=fnodes.find(n=>n.attrs.class==='row-more');assert(!fmenu.contains(ctx.cardStart),'Start again hid in the menu');assert(fmenu.contains(ctx.cardCheck),'Change check left the menu');
 assert(['View log','Open work item','Archive'].every(t=>fmenu.textContent.includes(t)),'the need row lost its own actions: '+fmenu.textContent);assert(!fmenu.textContent.includes('Mark read'),'Mark read beside an item that opening marks read');
 assert.equal(frow.textContent.toLowerCase().split('failed to start').length-1,1,'the failure is said more than once: '+frow.textContent);assert(!frow.textContent.includes('worker failed'),'title repeats the Failed status');
 const tech=fnodes.find(n=>n.tagName==='DETAILS'&&String(n.className||'').includes('tech'));assert(tech&&tech.textContent.includes('agentd handoff dispatch'),'the CLI next step is not under Details');assert(!frow.textContent.includes('Next: agentd'),'the CLI next step is the row\'s Next');
 // In the Inbox a failed item's next step is the work item's own Start again button.
 run("lastDash={dispatch:true,checkouts:['/repo'],handoff_list:[failedItem]}");const iacts=run("needActs(needNorm({kind:'failed',id:'ib-g',handoff:'hof-r',title:'x',read:true}),{inbox:true})").filter(Boolean);
 assert(!run("needActs(needNorm({kind:'failed',id:'ib-h',handoff:'hof-r',title:'x',read:true}))").filter(Boolean).some(n=>n.textContent==='Start again'),'a panel need row repeats the work item\'s Start again');
 assert.equal(iacts[0].textContent,'Start again','a failed inbox item leads with '+iacts[0].textContent);
 // New handoff: a budget by default, and one client key for every retry of the same sheet.
 vm.runInContext(page.split('function newHandoffSheet(')[1].split('// retryHandoff starts')[0].replace(/^/,'function newHandoffSheet('),ctx);
 // Its kinds, criteria, check and issue (region:newtask); this DOM has no closest and no options, so no setup and no segments,
 // and no template picker (region:templates, covered by dash_templates.cjs).
 vm.runInContext(page.split('// region:newtask')[1].split('// end:newtask')[0].replace(/^/,'//'),ctx);run('newTaskSetup=()=>{};var newTaskTemplates=()=>{};var newTaskFieldsAll=newTaskFields;newTaskFields=(d,b)=>newTaskFieldsAll(d,b).map(f=>({...f,segment:false}))');
 ctx.crypto=require('crypto').webcrypto;run("var TEAM={lists:{roles:[],default_tool:'claude'}};lastDash={dispatch:true,checkouts:['/repo'],dispatch_budget:'45m'}");
 let offerTries=0;ctx.fetch=async(url,opts)=>{writes.push({url,body:JSON.parse(opts.body)});if(++offerTries===1)throw new TypeError('Failed to fetch');return {ok:true,status:200,json:async()=>({ok:true})}};
 run('activeSheet=null;newHandoffSheet()');const budget=current().querySelectorAll('textarea,input').find(n=>n.id.endsWith('-budget'));assert(budget&&budget.value==='45m','budget not preset: '+(budget&&budget.value));
 current().querySelectorAll('textarea,input').find(n=>n.id.endsWith('-goal')).value='Fix it';const n0=writes.length;
 // An implement task with neither criteria nor a check is refused in the sheet, and nothing is sent.
 await submit();assert.equal(writes.length,n0,'an implement task without criteria or a check was sent');assert.equal(current().querySelectorAll('textarea,input').find(n=>n.id.endsWith('-accept')).getAttribute('aria-invalid'),'true','no reason on the criteria field');
 current().querySelectorAll('textarea,input').find(n=>n.id.endsWith('-accept')).value='It is fixed';await submit();await submit();
 assert.equal(writes.length,n0+2,'offer not retried');assert.equal(writes[n0].body.action,'offer');assert.equal(writes[n0].body.budget,'45m');assert(/^[0-9a-f]{24}$/.test(writes[n0].body.key),'no client key');assert.equal(writes[n0+1].body.key,writes[n0].body.key,'a retry sent a new key');
 // A blocked worker's reply box: shown to whom the server lets type (an owner too), else why not.
 vm.runInContext(page.split('function blockedWorkerReply(')[1].split('// workItemBody')[0].replace(/^/,'function blockedWorkerReply('),ctx);
 const blockedH={id:'hof-b',worker_state:'blocked',worker_wait:'which file?'};
 ctx.sessionRow=()=>({id:'w1',status:'active',may_prompt:false,prompt_why_not:'dash user bob cannot type into a session belonging to alice'});
 let box=run("blockedWorkerReply("+JSON.stringify(blockedH)+",'w1')");assert(box.textContent.includes('cannot type into a session belonging to alice'),'no reason for a barred reply');assert(!box.querySelectorAll('textarea').length,'a barred person got the reply box');
 ctx.sessionRow=()=>({id:'w1',status:'active',may_prompt:true});run("USER='boss';ROLE='owner'");
 box=run("blockedWorkerReply("+JSON.stringify(blockedH)+",'w1')");assert.equal(box.querySelectorAll('textarea').length,1,'an owner lost the reply box');
 run('activeSheet&&activeSheet.cancel()');
 console.log('team permissions: read-only token, Stop, Dispatch, own approvals and offer budget and key passed');
 console.log('sheets: cancel, required reason, override, destructive Enter, failed writes, PR gates, start again and worker reports passed');
})().catch(e=>{console.error(e);process.exitCode=1});
