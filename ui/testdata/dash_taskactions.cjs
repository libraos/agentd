// Take over, Cancel task and Open in editor in the task workspace's top bar (libraos/core#562).
// Each appears only in the state the snapshot offers it (h.takeover once the worker has stopped,
// h.cancel on an open task, h.editor where the worker's directory is on this host and the server may
// start a program here: dash.editor.local), is disabled with the server's reason for a person who may
// not, carries its CLI command, and posts its action: takeover and cancel after a confirmation, cancel
// only with a reason. Raise budget (#1186) on a worker stopped at its budget: before Cancel task, primary, with Cancel
// task plain; its sheet prefills the suggested amount, checks the person's own, shows the command for it and posts it
// with the version shown; disabled with the server's reason for someone who may not. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_taskactions.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const base={from:'s-alice',from_user:'alice',to:'any',updated_ago:'1m',age:'1m',project:'acme/alpha'};
const cmd=(id,rest)=>'agentd handoff '+rest.replace('ID',id);
const stopped={...base,id:'hof-stop',goal:'A worker stopped from the server',state:'claimed',claimer:'s-w',worker:'claude',dispatched:true,worker_state:'stopped',mark:'failed',
 takeover:{may:true,cli:cmd('hof-stop','claim ID --takeover')},cancel:{may:true,cli:cmd('hof-stop','done ID --cancel --reason TEXT')},editor:{may:true,dir:'/srv/wt/it\'s hof-stop'}};
const running={...base,id:'hof-run',goal:'A running worker',state:'claimed',claimer:'s-r',worker:'claude',dispatched:true,may_stop:true,mark:'working',
 cancel:{may:true,cli:cmd('hof-run','done ID --cancel --reason TEXT')},editor:{may:true,dir:'/srv/wt/hof-run'}};
const bobs={...base,id:'hof-bob',goal:'Bob\'s stopped task '+evil,from:'s-bob',from_user:'bob',state:'claimed',claimer:'s-b',worker:'codex',dispatched:true,worker_state:'stopped',mark:'failed',
 takeover:{may:false,why_not:'only the handoff\'s sender or an owner may take it over',cli:cmd('hof-bob','claim ID --takeover')},
 cancel:{may:false,why_not:'only the handoff\'s sender or an owner may cancel it',cli:cmd('hof-bob','done ID --cancel --reason TEXT')},
 editor:{may:false,why_not:'only the handoff sender, claimer or an owner may open it in an editor',dir:'/srv/wt/hof-bob'}};
const budgeted={...base,id:'hof-bud',goal:'A worker stopped at its budget',state:'claimed',claimer:'s-w2',worker:'codex',dispatched:true,budget:'30m,$5',budget_state:'stopped',mark:'needs_you',
 raise:{may:true,cli:cmd('hof-bud',"budget ID --budget '60m,$10'"),suggest:'60m,$10',version:4,budget:'30m,$5'},
 takeover:{may:true,cli:cmd('hof-bud','claim ID --takeover')},cancel:{may:true,cli:cmd('hof-bud','done ID --cancel --reason TEXT')}};
const bobBudget={...budgeted,id:'hof-bob-bud',from:'s-bob',from_user:'bob',raise:{...budgeted.raise,may:false,why_not:'only the handoff\'s sender or an owner may raise its budget',cli:cmd('hof-bob-bud',"budget ID --budget '60m,$10'")},
 takeover:{...budgeted.takeover,may:false,why_not:'only the handoff\'s sender or an owner may take it over'},cancel:{...budgeted.cancel,may:false,why_not:'only the handoff\'s sender or an owner may cancel it'}};
const done={...base,id:'hof-done',goal:'Finished',state:'done',claimer:'s-d',worker:'codex',dispatched:true,mark:'done'};
let dash={user:'alice',role:'dev',now,handoff_list:[stopped,running,bobs,budgeted,bobBudget],done:[{...done,title:done.goal}],sessions:[],left:[],waiting:[],claims:[],messages:[],inbox:[],dispatch:true,checkouts:['/srv/alpha'],terminal:false,editor:{local:true,argv:['code','-n']}};
const errors=[],posts=[];let failNext='';
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=(body,status=200)=>({ok:status<300,status,json:async()=>body,text:async()=>JSON.stringify(body)});
function load(url){return new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{}]};
 w.fetch=async(url,opt)=>{const u=new URL(url,w.location.href),id=u.searchParams.get('id');
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/issues')return json({issues:[]});
  if(u.pathname==='/api/action'){const b=JSON.parse(opt.body);posts.push(b);if(failNext){const e=failNext;failNext='';return json({ok:false,error:e},400)}
   if(b.action==='takeover')return json({ok:true,handoff:b.id,won:true,cli:cmd(b.id,'claim ID --takeover'),next:'work in /srv/wt, then finish it: agentd handoff done '+b.id+' --run-check --session s-dash'});
   if(b.action==='budget')return json({ok:true,handoff:b.id,budget:b.budget,resumed:true,cli:cmd(b.id,'budget ID --budget '+b.budget)});
   if(b.action==='open_editor')return json({ok:true,handoff:b.id,editor:'code',dir:'/srv/wt/hof-run',cli:'code -n /srv/wt/hof-run'});
   return json({ok:true,handoff:b.id})}
  if(u.pathname==='/api/issue'){const ref=u.searchParams.get('ref'),h=[...dash.handoff_list,...dash.done].find(x=>x.id===ref);return json({kind:'handoff',ref,title:h.goal,body:{goal:h.goal},tree:[{...h,focus:true,log:[]}],prs:[]})}
  if(u.pathname==='/api/review')return json({handoff:id,enabled:true,branch:null,why_not:'no worker branch'});
  if(u.pathname==='/api/log')return json({lines:[],running:false});
  if(u.pathname==='/api/files')return json({files:[],changed:0});
  if(u.pathname==='/api/checks')return json({check:'',runs:[]});
  if(u.pathname==='/api/taskmsg')return json({may:true,live:false});
  if(u.pathname==='/api/team')return json({roles:[],members:[],handoff_roles:{}});
  return json({})}}})}
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
(async()=>{
 const dom=load('http://127.0.0.1:21620/#issues/hof-stop'),w=dom.window,doc=w.document;await settle();
 const go=async h=>{w.location.hash=h;await settle()};
 const acts=()=>[...doc.querySelectorAll('#issue-detail .tw-top [data-task-act]')];
 const keys=()=>acts().map(b=>b.dataset.taskAct);
 const btn=k=>acts().find(b=>b.dataset.taskAct===k);
 const dialog=()=>doc.querySelector('dialog.sheet');
 const foot=label=>[...dialog().querySelectorAll('.sheet-foot button')].find(b=>b.textContent===label);
 assert(!errors.length,errors.join('\n'));
 // A stopped worker: Take over, Open in editor and Cancel task, each with its command.
 assert.deepEqual(keys(),['takeover','editor','cancel'],'stopped worker');
 assert.deepEqual(acts().map(b=>b.textContent),['Take over','Open in editor','Cancel task']);
 assert.equal(btn('takeover').dataset.cli,'agentd handoff claim hof-stop --takeover');assert(btn('takeover').title.includes('agentd handoff claim hof-stop --takeover'),'Take over does not show its command');
 assert.equal(btn('cancel').dataset.cli,'agentd handoff done hof-stop --cancel --reason TEXT');
 assert.equal(btn('editor').dataset.cli,"code -n '/srv/wt/it'\\''s hof-stop'",'the editor command is not the found editor on the quoted directory');
 assert(acts().every(b=>b.getAttribute('aria-disabled')!=='true'),'the sender\'s buttons are disabled');
 // Take over: a confirmation with the command; Keep writes nothing; Take over posts the action and says what is next.
 btn('takeover').click();await settle();assert(dialog(),'Take over has no confirmation');assert(dialog().querySelector('.task-cli code').textContent==='agentd handoff claim hof-stop --takeover','the sheet lacks the command');
 foot('Cancel').click();await settle();assert(!dialog());assert.equal(posts.length,0,'closing the sheet wrote something');
 btn('takeover').click();await settle();foot('Take over').click();await settle();
 assert.deepEqual(posts.pop(),{action:'takeover',id:'hof-stop'});assert(/Next: work in \/srv\/wt, then finish it: agentd handoff done hof-stop --run-check/.test(doc.getElementById('toast').textContent),'the toast does not say how to finish');
 // A refusal stays in the sheet.
 btn('takeover').click();await settle();failNext='cannot take over hof-stop: its claude worker is still running; stop it first';foot('Take over').click();await settle();
 assert(dialog()&&/still running/.test(dialog().querySelector('.sheet-error').textContent),'the refusal is not shown');posts.pop();foot('Cancel').click();await settle();
 // Cancel task: a reason is required; it is posted as typed.
 btn('cancel').click();await settle();assert(dialog().querySelector('.task-cli code').textContent.includes('--cancel --reason'),'the cancel sheet lacks the command');
 foot('Cancel task').click();await settle();assert(dialog(),'the sheet closed without a reason');assert.equal(posts.length,0,'a cancel without a reason was posted');
 const ta=dialog().querySelector('textarea');ta.value='superseded by #9 '+evil;ta.dispatchEvent(new w.Event('input'));foot('Cancel task').click();await settle();
 assert.deepEqual(posts.pop(),{action:'cancel',id:'hof-stop',reason:'superseded by #9 '+evil});assert(!dialog(),'the cancel sheet stayed open');
 // A cause from the fixed list is optional (#1054): not chosen, none is posted (above); chosen, it is posted with the reason.
 btn('cancel').click();await settle();const sel=dialog().querySelector('select');assert(sel,'the cancel sheet has no cause');
 assert.deepEqual([...sel.options].map(o=>o.value),['','wrong_result','refused_in_error','budget','check_timeout','waiting_input','infrastructure','superseded','delivered_by_hand','not_needed','other']);assert.equal(sel.value,'','a cause is chosen before the person chose one');
 const ta2=dialog().querySelector('textarea');ta2.value='carried by #9';ta2.dispatchEvent(new w.Event('input'));sel.value='superseded';sel.dispatchEvent(new w.Event('change'));foot('Cancel task').click();await settle();
 assert.deepEqual(posts.pop(),{action:'cancel',id:'hof-stop',reason:'carried by #9',cause:'superseded'});assert(!dialog(),'the cancel sheet stayed open');
 // Open in editor: posts at once and shows the command it ran.
 await go('#issues/hof-run');
 assert.deepEqual(keys(),['editor','cancel'],'a running worker offers no takeover');
 btn('editor').click();await settle();assert.deepEqual(posts.pop(),{action:'open_editor',id:'hof-run'});assert(doc.getElementById('toast').textContent.includes('code -n /srv/wt/hof-run'),'the toast lacks the command');
 // Someone else's task: the buttons are there, disabled with the server's reason, and write nothing.
 await go('#issues/hof-bob');
 assert.deepEqual(keys(),['takeover','editor','cancel']);
 for(const b of acts()){assert.equal(b.getAttribute('aria-disabled'),'true',b.dataset.taskAct+' is not disabled for bob\'s task');assert(/only the handoff/.test(b.title),'no reason on '+b.dataset.taskAct);b.click();await settle()}
 assert(!dialog(),'a disabled action opened a sheet');assert.equal(posts.length,0,'a disabled action wrote something');
 assert(!doc.querySelector('#issue-detail img'),'the goal became markup');
 // Raise budget (#1186): before Cancel task, the primary action; Cancel task is plain while a raise is possible.
 await go('#issues/hof-bud');
 assert.deepEqual(keys(),['takeover','budget','cancel'],'a worker stopped at its budget');assert.equal(btn('budget').textContent,'Raise budget');
 assert(btn('budget').classList.contains('primary'),'Raise budget is not primary');assert(!btn('cancel').classList.contains('no'),'Cancel task is red while a raise is possible');
 assert.equal(btn('budget').dataset.cli,"agentd handoff budget hof-bud --budget '60m,$10'");
 // Every step is a button here, so no step is listed again as an empty bullet.
 for(const li of doc.querySelectorAll('#issue-detail li[data-need]'))assert(li.querySelector('.need-cli code,[data-need-link]').textContent.trim(),'an empty step: '+li.dataset.need);
 assert(!doc.querySelector('#issue-detail li[data-need=budget]'),'Raise budget is listed as a command beside its button');
 btn('budget').click();await settle();assert(dialog(),'Raise budget has no sheet');const inp=dialog().querySelector('input');assert.equal(inp.value,'60m,$10','the suggestion is not prefilled');
 assert.equal(dialog().querySelector('.task-cli code').textContent,"agentd handoff budget hof-bud --budget '60m,$10'");
 for(const bad of ['lots','90m,2h','0m','$1,$2']){inp.value=bad;inp.dispatchEvent(new w.Event('input'));foot('Raise budget').click();await settle();assert(dialog()&&!dialog().querySelector('.field-error').hidden,'no error for '+bad);assert.equal(posts.length,0,'posted '+bad)}
 inp.value='2h';inp.dispatchEvent(new w.Event('input'));assert.equal(dialog().querySelector('.task-cli code').textContent,'agentd handoff budget hof-bud --budget 2h','the command does not follow the amount');
 foot('Raise budget').click();await settle();assert.deepEqual(posts.pop(),{action:'budget',id:'hof-bud',budget:'2h',version:4});assert(!dialog(),'the raise sheet stayed open');
 assert(/Budget raised to 2h: its worker starts again/.test(doc.getElementById('toast').textContent),'the toast does not say the worker starts again');
 // Someone who may not: disabled with the server's reason; Cancel task stays plain red then.
 await go('#issues/hof-bob-bud');
 assert.equal(btn('budget').getAttribute('aria-disabled'),'true');assert(/sender or an owner may raise/.test(btn('budget').title),'no reason on Raise budget');
 btn('budget').click();await settle();assert(!dialog(),'a disabled Raise budget opened a sheet');assert.equal(posts.length,0);
 // A dash that may not start a program here (not on loopback): no Open in editor at all.
 dash={...dash,editor:{local:false,why_not:'open in editor works only on a dash on loopback'}};await w.eval('refresh()');await go('#issues/hof-stop');
 assert.deepEqual(keys(),['takeover','cancel'],'Open in editor offered off loopback');
 // No editor found on the host: the button says why.
 dash={...dash,editor:{local:true,why_not:'no editor found for the server: set VISUAL'}};await w.eval('refresh()');await settle();
 assert.equal(btn('editor').getAttribute('aria-disabled'),'true');assert(/no editor found/.test(btn('editor').title));
 // A finished task: none of them.
 await go('#issues/hof-done');assert.deepEqual(keys(),[],'actions on a finished task');
 assert(!errors.length,errors.join('\n'));
 w.close();console.log('dash_taskactions: ok');
})().catch(e=>{console.error(e);console.error('DOM errors:',errors);process.exit(1)});
