// libraos/agentd-core#564: New task in the personal app, Orca's "Create worktree" dialog.
// One goal box; below it repository (default: the selected one), agent (default: the
// checkout's task file, else config's default_tool) and budget (default 30m);
// acceptance criteria, check and issue under Advanced. The dialog shows the
// `agentd new GOAL --cwd REPO --worker W --budget B` line its request equals, sends
// the team sheet's own offer, and selects the new task. Team mode keeps its page.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_appnewtask.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const base={user:'alice',role:'owner',now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},
 checkouts:['/w/alpha','/w/beta'],dispatch:true,dispatch_budget:'30m',default_tool:'codex'};
const app=o=>({...base,mode:'app',watchdog:{running:true},spend_today:{usd:0,workers:0,unpriced:0,pending:0},...o});
// beta has a committed task file naming a worker, a check and a criterion; alpha has none.
const defaults={'/w/beta':{cwd:'/w/beta',accept:['go vet is clean'],check:'make test',check_from:'.agentd/tasks.toml:1',file:'.agentd/tasks.toml',worker:'opencode'},'/w/alpha':{cwd:'/w/alpha',accept:[]}};
let snap=app(),posts=[],answer={ok:true,handoff:'hof-new1'};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21470/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opt={})=>{const u=new URL(url,w.location.href);let body={},status=200;
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=snap;
  if(u.pathname==='/api/taskdefaults')body=defaults[u.searchParams.get('cwd')]||{error:'unknown'};
  if(u.pathname==='/api/action'){const b=JSON.parse(opt.body);posts.push(b);body=answer;if(answer.ok===false)status=400}
  return {ok:status<300,status,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const $=id=>doc.getElementById(id);
const shown=n=>{for(let x=n;x&&x!==doc;x=x.parentElement)if(x.hidden)return false;return true};
const key=(k,o={},t=doc)=>t.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true,...o}));
const type=(n,v)=>{n.value=v;n.dispatchEvent(new w.Event('input',{bubbles:true}))};
const choose=(n,v)=>{n.value=v;n.dispatchEvent(new w.Event('change',{bubbles:true}))};
const css=[...doc.querySelectorAll('style')].map(n=>n.textContent).join('\n');
const dlg=()=>$('app-newtask'),cmd=()=>$('appnt-cmd').textContent,agent=()=>{const c=dlg().querySelector('[role=radio][aria-checked="true"]');return c&&c.dataset.agent};
const newBtn=()=>$('app-left').querySelector('[data-app-action="new-task"]');
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 assert(doc.body.classList.contains('app-mode'),'app mode is not on');
 // The + in the Projects header opens the dialog; it is live now.
 assert(!newBtn().hasAttribute('aria-disabled'),'the new task button is still disabled');
 // The selected repository (APP.repo, set by the task list) is the default.
 w.eval("APP.repo='/w/beta'");
 newBtn().click();await settle();
 const d=dlg();assert(d&&d.open,'the dialog does not open '+!!d+' '+errors.join('; '));assert(doc.getElementById('app-shell').contains(d),'the dialog is not inside the app frame');
 assert.equal(d.getAttribute('aria-labelledby'),'appnt-title');assert.equal($('appnt-title').textContent,'New task');
 assert.equal(doc.activeElement,$('appnt-goal'),'the goal box does not take focus');
 // One goal box, then repository, agent, budget; Advanced holds criteria, check and issue.
 const order=[...d.querySelectorAll('.appnt-body > .appnt-field, .appnt-body > .appnt-advbtn')].map(n=>n.className.replace(/.*appnt-(goal|cwd|tool|budget|advbtn).*/,'$1')).filter(x=>/^(goal|cwd|tool|budget|advbtn)$/.test(x));
 assert.deepEqual(order,['goal','cwd','tool','budget','advbtn'],'field order: '+order);
 assert.equal(d.querySelectorAll('textarea#appnt-goal').length,1,'not one goal box');
 const adv=$('appnt-advanced');assert(!shown(adv),'Advanced is open at first');
 for(const n of ['accept','check','issue'])assert(adv.contains($('appnt-'+n)),n+' is not under Advanced');
 // Defaults: the selected repository, the task file's worker, budget 30m, the file's check in its field.
 assert.equal($('appnt-cwd').value,'/w/beta','the repository default is not the selected one');
 assert.equal(agent(),'opencode','the agent default is not the task file\'s');
 assert.equal($('appnt-budget').value,'30m','the budget default is not 30m');
 assert.equal($('appnt-check').value,'make test','the task file\'s check is not in its field');
 assert(/go vet is clean/.test($('appnt-file').textContent),'the file\'s criteria are not named');
 // The shown command, as the request equals it.
 type($('appnt-goal'),'Add a flag');
 assert.equal(cmd(),"agentd new 'Add a flag' --cwd /w/beta --worker opencode --budget 30m",'command: '+cmd());
 // Another repository with no task file: the agent is config's default_tool; nothing is checked, so --no-check.
 choose($('appnt-cwd'),'/w/alpha');await settle();
 assert.equal(agent(),'codex','the agent default is not config\'s default_tool');
 assert.equal($('appnt-check').value,'','alpha has no check');
 assert.equal(cmd(),"agentd new 'Add a flag' --cwd /w/alpha --worker codex --budget 30m --no-check",'command: '+cmd());
 // A person's own pick stays when the repository changes.
 d.querySelector('[data-agent="claude"]').click();choose($('appnt-cwd'),'/w/beta');await settle();
 assert.equal(agent(),'claude','the person\'s agent was replaced by the default');
 // Advanced: criteria, another check and an issue are --accept, --verify and --issue.
 d.querySelector('.appnt-advbtn').click();await tick();assert(shown(adv),'Advanced does not open');
 assert.equal(d.querySelector('.appnt-advbtn').getAttribute('aria-expanded'),'true');
 type($('appnt-accept'),"it is documented\n- it has a test");type($('appnt-check'),'go vet ./...');type($('appnt-issue'),'libraos/agentd-core#564');type($('appnt-budget'),'45m');
 assert.equal(cmd(),"agentd new 'Add a flag' --cwd /w/beta --worker claude --budget 45m --accept 'it is documented' --accept 'it has a test' --verify 'go vet ./...' --issue libraos/agentd-core#564",'command: '+cmd());
 // The server's and the goal's text stays text.
 type($('appnt-goal'),'Add '+evil);assert(cmd().includes(evil)&&!d.querySelector('img'),'the goal is not shown as text');
 type($('appnt-goal'),"Fix the parser's input");
 assert(cmd().startsWith("agentd new 'Fix the parser'\\''s input' --cwd"),'a quote in the goal is not shell-quoted: '+cmd());
 // Ctrl+Enter submits the team sheet's own offer.
 key('Enter',{ctrlKey:true},$('appnt-goal'));await settle();
 assert.equal(posts.length,1,'no request was sent');const p=posts[0];
 assert(/^[0-9a-f]{24}$/.test(p.key),'no retry key: '+p.key);delete p.key;
 assert.deepEqual(p,{action:'offer',kind:'implement',goal:"Fix the parser's input",cwd:'/w/beta',worker:'claude',budget:'45m',accept:"it is documented\n- it has a test",issue:'libraos/agentd-core#564',check:'go vet ./...'},'request: '+JSON.stringify(p));
 // The new task is the selected one, under its repository; the dialog is gone.
 assert(!dlg(),'the dialog stays after Create');
 assert.equal(w.eval('APP.task'),'hof-new1','the new task is not selected');assert.equal(w.eval('APP.repo'),'/w/beta','its repository is not the selected one');
 assert(/hof-new1/.test($('toast').textContent),'no word that it was made: '+$('toast').textContent);
 // n opens it too, with the defaults again; the file's check sent back unchanged is no --verify.
 let selected=null;doc.addEventListener('app:select',e=>{selected=e.detail});
 key('n');await settle();assert(dlg()&&dlg().open,'n does not open the dialog in app mode');assert.equal(w.location.hash,'','n left the app for the team page');
 assert.equal($('appnt-check').value,'make test');type($('appnt-goal'),'Second');
 assert.equal(cmd(),'agentd new Second --cwd /w/beta --worker opencode --budget 30m','command: '+cmd());
 answer={ok:true,handoff:'hof-new2'};dlg().querySelector('.appnt-create').click();await settle();
 assert.deepEqual({...posts[1],key:''},{action:'offer',kind:'implement',goal:'Second',cwd:'/w/beta',worker:'opencode',budget:'30m',accept:'',issue:'',check:'make test',key:''},'defaults request: '+JSON.stringify(posts[1]));
 assert.deepEqual(selected,{handoff:'hof-new2',repo:'/w/beta'},'no app:select event: '+JSON.stringify(selected));
 // Refusals stay in the dialog: no goal, then no criteria and no check, then the server's own.
 newBtn().focus();newBtn().click();await settle();const n0=posts.length;
 dlg().querySelector('.appnt-create').click();await settle();
 assert.equal(posts.length,n0,'an empty goal was sent');assert(!$('appnt-goal-error').hidden&&/Goal is required/.test($('appnt-goal-error').textContent),'no goal error');
 choose($('appnt-cwd'),'/w/alpha');await settle();type($('appnt-goal'),'Vague');dlg().querySelector('.appnt-create').click();await settle();
 assert.equal(posts.length,n0,'a task with no criteria and no check was sent');assert(shown($('appnt-advanced'))&&!$('appnt-accept-error').hidden,'the criteria error does not show under Advanced');
 type($('appnt-accept'),'it is clear');answer={ok:false,error:'refused: '+evil};dlg().querySelector('.appnt-create').click();await settle();
 const err=dlg().querySelector('.appnt-error');assert(dlg()&&shown(err)&&err.textContent.includes(evil)&&!err.querySelector('img'),'the server\'s refusal is not shown as text in the dialog');
 // Escape closes it and gives focus back to the button that opened it.
 key('Escape',{},$('appnt-goal'));await tick();assert(!dlg(),'Escape does not close the dialog');
 if(!phone)assert.equal(doc.activeElement,newBtn(),'focus does not go back to the + button');
 // Read-only: the dialog says why and Create is off.
 snap=app({role:'viewer'});await w.refresh();await settle();newBtn().click();await settle();
 assert(dlg().querySelector('.appnt-create').disabled,'a viewer can press Create');assert(/read-only/i.test(dlg().querySelector('.appnt-why').textContent),'no reason shown');
 key('Escape',{},dlg());await tick();
 // Orca's dialog values and its own CSS region.
 assert(/region:css-app-newtask/.test(css),'no css-app-newtask region');
 for(const re of [/\.appnt\{[^}]*max-width:512px/,/\.appnt\{[^}]*padding:24px/,/\.appnt\{[^}]*border-radius:10px/,/\.appnt::backdrop\{background:rgb\(0 0 0\/\.55\)\}/,/\.appnt-title\{[^}]*font-size:16px[^}]*font-weight:600/,/\.appnt-label\{font-size:12px;font-weight:500/,/\.appnt-body\{[^}]*gap:16px/])assert(re.test(css),'css: '+re);
 // The team dash coming back closes an open dialog with the frame.
 newBtn().click();await settle();assert(dlg()&&dlg().open,'the dialog does not open again');
 // Team mode: n still opens the New task page.
 snap={...base};await w.refresh();await settle();assert(!doc.body.classList.contains('app-mode'),'team mode did not come back');assert(!dlg(),'the dialog stays open in team mode');
 key('n');await settle();assert(/^#new/.test(w.location.hash),'team mode n does not open the New task page: '+w.location.hash);assert(!dlg(),'the app dialog opened in team mode');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_appnewtask: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
