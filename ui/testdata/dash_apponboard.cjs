// #569: the personal app's first run, the same as Orca's (SPEC.md §7). A fake /api/onboarding
// keeps one person's state as the Go route does; each scenario boots the page in app mode.
// Per step: shown, what Continue saves (its completion), Set up later / Skip, and resume.
// Per checklist item: shown, its completion condition, Hide. Then the coach marks, Help, the toast.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_apponboard.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const html=fs.readFileSync(process.argv[2],'utf8');
const fresh=()=>({flowVersion:4,closedAt:null,outcome:null,lastCompletedStep:-1,checklist:{addedRepo:false,choseAgent:false,ranFirstAgent:false,ranSecondAgentOnSameTask:false,triedCmdJ:false,shapedSidebar:false,reviewedDiff:false,openedPr:false,addedFolder:false,openedFile:false,ranAgentOnFile:false,dismissed:false},surface:'terminal',defaultAgent:null,theme:'system',sound:'system',notifications:false,guideHidden:false,toursSeen:[],toastShown:false});
const baseFacts=()=>({os:'linux',repositories:[],task_files:0,clients:[{tool:'claude',found:true,connected:false},{tool:'codex',found:true,connected:false},{tool:'opencode',found:false,connected:false}],default_tool:'codex',first_task:{done:false,handoff:null,count:0},gh:'not_installed',linear:false,commands:{repo_add:'agentd repo add DIR',connect:'agentd connect',new:'agentd new "GOAL" --cwd DIR --budget 30m',gh_login:'gh auth login'}});
const snapBase={user:'alice',role:'owner',now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:[]};
const app={...snapBase,mode:'app',watchdog:{running:true,start:'agentd install'},spend_today:{usd:0,workers:0,unpriced:0,pending:0,user:'alice'}};
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
async function boot(o={}){
  const srv={state:o.state||fresh(),facts:{...baseFacts(),...(o.facts||{})},posts:[],gets:0,snap:o.snap||app,notify:o.notify||'default',session:o.session};
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
  const dom=new JSDOM(html,{url:'http://127.0.0.1:21470/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');if(srv.session)w.sessionStorage.setItem('dash-app-onboard-closed',srv.session);
    w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
    srv.notes=[];w.Notification=class{constructor(t,o){srv.notes.push(t+': '+(o&&o.body))}static get permission(){return srv.notify}static requestPermission(){srv.notify='granted';return Promise.resolve('granted')}};
    w.fetch=async(url,init)=>{const u=new URL(url,w.location.href);let body={},status=200;
      if(u.pathname==='/api/auth')return {ok:true,status:204};
      if(u.pathname==='/api/dash')body=srv.snap;
      if(u.pathname==='/api/onboarding'){if(init&&init.method==='POST'){const st=JSON.parse(init.body);srv.posts.push(st);srv.state=st}else srv.gets++;body={user:'alice',state:srv.state,facts:srv.facts}}
      return {ok:status<400,status,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
  const w=dom.window,doc=w.document;await settle();
  const t={w,doc,srv,errors,$:id=>doc.getElementById(id),q:s=>doc.querySelector('#appob-layer '+s),
    shown(n){for(let x=n;x&&x!==doc;x=x.parentElement)if(x.hidden)return false;return !!n},
    text(){return doc.getElementById('appob-layer').textContent.replace(/\s+/g,' ')},
    key(k,opt={},target){(target||doc).dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true,...opt}))},
    async click(sel){const n=typeof sel==='string'?doc.querySelector('#appob-layer '+sel)||doc.querySelector(sel):sel;assert(n,'nothing to click: '+sel);n.click();await settle()},
    step(){const m=doc.querySelector('#appob-layer .appob-modal');return m&&m.dataset.step},
    last(){return srv.posts[srv.posts.length-1]},
    ok(){assert(!errors.length,errors.join('\n'))}};
  return t}
(async()=>{
 // --- a fresh person: the wizard opens on its own, Orca's step 1 ---
 let t=await boot();t.ok();
 assert(t.doc.body.classList.contains('app-mode'),'app mode is not on');
 assert.equal(t.srv.gets,1,'the page does not read /api/onboarding once');
 assert.equal(t.step(),'agent_surface','the wizard does not open on step 1');
 const modal=t.q('.appob-modal');assert.equal(modal.getAttribute('role'),'dialog');assert.equal(modal.getAttribute('aria-modal'),'true');
 assert(/Welcome to agentd/i.test(t.text()),'no eyebrow');assert(/How do you want to work with agents\?/.test(t.text()),'step 1 title');
 assert(/1 of 5/.test(t.text()),'counter: '+t.text().slice(0,200));assert.equal(t.doc.querySelectorAll('#appob-layer .appob-seg').length,5,'five segments without gh and off Windows');
 assert.deepEqual([...t.doc.querySelectorAll('#appob-layer .appob-seg')].map(n=>n.title),['Chat or Terminal','Default Agent','Appearance','Integrations','Notifications']);
 assert(t.q('.appob-cli'),'step 1 shows no command');assert(/agentd handoff show ID/.test(t.q('.appob-cli').textContent));
 assert.equal(t.q('[data-ob="surface-terminal"]').getAttribute('aria-pressed'),'true','Terminal is not the default');
 assert(t.q('[data-ob="later"]'),'no Set up later on step 1');assert(!t.q('[data-ob="back"]'),'Back on the first page');
 assert(/Ctrl ↵|⌘ ↵/.test(t.q('[data-ob="continue"]').textContent),'no key chip');
 // Pick Chat; Continue saves nothing on this page (it shares step 1 with the next).
 await t.click('[data-ob="surface-chat"]');assert.equal(t.q('[data-ob="surface-chat"]').getAttribute('aria-pressed'),'true','Chat does not select');
 await t.click('[data-ob="continue"]');assert.equal(t.step(),'agent','Continue does not reach step 2');assert.equal(t.srv.posts.length,0,'step 1 saved something');
 // --- step 2, default agent ---
 assert(/Pick your default agent/.test(t.text())&&/2 of 5/.test(t.text()),'step 2: '+t.text().slice(0,160));assert(!/Welcome to agentd/i.test(t.text()),'the eyebrow is on page 2');
 assert(/Agents open in\s*Chat UI/.test(t.text()),'the surface pill does not follow step 1');
 assert(/Detected on your system\s*2/.test(t.text()),'detected agents: '+t.text());
 assert(t.q('[data-ob="agent-claude"]')&&t.q('[data-ob="agent-codex"]')&&!t.q('[data-ob="agent-opencode"]'),'only found agents are tiles');
 assert.equal(t.q('[data-ob="agent-codex"]').getAttribute('aria-pressed'),'true','the configured default is not preselected');
 await t.click('[data-ob="agent-claude"]');assert(/agentd connect claude/.test(t.q('.appob-cli').textContent),'the command does not follow the pick');
 assert(/Worker permissions/.test(t.text())&&/config\.toml/.test(t.text()),'no read-only permission row in Yolo mode’s place');
 assert(!t.q('.appob-yolo input'),'a permission switch is on the page');
 await t.click('[data-ob="continue"]');
 let p=t.last();assert.equal(t.srv.posts.length,1);assert.equal(p.defaultAgent,'claude');assert.equal(p.surface,'chat');assert.equal(p.lastCompletedStep,1);assert.equal(p.checklist.choseAgent,true);assert.equal(p.closedAt,null);
 // --- step 3, theme: applied at once ---
 assert.equal(t.step(),'theme');assert(/Make it feel like home/.test(t.text())&&/3 of 5/.test(t.text()));
 for(const v of ['system','dark','light'])assert(t.q('[data-ob="theme-'+v+'"]'),'no '+v+' tile');
 assert(/Match OS/.test(t.text())&&/Easy on the eyes/.test(t.text())&&/Bright & crisp/.test(t.text()),'tile hints');
 await t.click('[data-ob="theme-dark"]');assert.equal(t.doc.documentElement.dataset.theme,'dark','Dark is not applied at once');
 // A progress segment jumps without saving.
 const before=t.srv.posts.length;await t.click('[data-ob="seg-agent_surface"]');assert.equal(t.step(),'agent_surface');assert.equal(t.srv.posts.length,before,'a segment click saved');
 await t.click('[data-ob="seg-theme"]');assert.equal(t.step(),'theme');
 // Ctrl+Enter is Continue.
 t.key('Enter',{ctrlKey:true});await settle();
 p=t.last();assert.equal(p.theme,'dark');assert.equal(p.lastCompletedStep,2);assert.equal(t.step(),'integrations','Ctrl+Enter does not continue');
 // --- step 4, GitHub (gh not installed) ---
 assert(/Set up GitHub tasks/.test(t.text())&&/4 of 5/.test(t.text()));assert(/CLI not installed/.test(t.text()),'gh status');
 assert.equal(t.q('a.appob-btn').getAttribute('href'),'https://cli.github.com','Install gh');assert(t.q('[data-ob="gh-recheck"]'),'no Re-check');
 assert(t.doc.querySelectorAll('#appob-layer .appob-bullets li').length===4,'four bullets');assert(/never merges/.test(t.text()),'the PR bullet promises a merge');
 assert(/gh auth login/.test(t.q('.appob-cli').textContent));
 // Re-check with gh signed in moves on by itself, as Orca does once gh is installed.
 t.srv.facts.gh='connected';await t.click('[data-ob="gh-recheck"]');
 assert.equal(t.step(),'notifications','Re-check does not move on');assert.equal(t.last().lastCompletedStep,3);
 // --- step 5, notifications ---
 assert(/Set up notifications/.test(t.text())&&/5 of 5/.test(t.text()));assert(!t.q('[data-ob="later"]'),'Set up later on the last page');
 const sel=t.q('[data-ob="sound"]');assert.deepEqual([...sel.options].map(o=>o.textContent),['System Default','Two Tone','Bong','Thump','Blip','Sonar','Blop','Ding','Clack','Beep']);
 sel.value='ding';sel.dispatchEvent(new t.w.Event('change',{bubbles:true}));
 // Ctrl+Enter inside the select is not Continue.
 t.key('Enter',{ctrlKey:true},sel);await settle();assert.equal(t.step(),'notifications','Ctrl+Enter in a field continued');
 await t.click('[data-ob="test-notify"]');assert.deepEqual(t.srv.notes,['agentd: This is a test notification.'],'no test notification');
 assert.equal(t.q('[data-ob="continue"]').textContent.replace(/Ctrl ↵|⌘ ↵/,'').trim(),'Add your first project','no repository: the button does not say so');
 await t.click('[data-ob="continue"]');
 p=t.last();assert.equal(p.notifications,true);assert.equal(p.sound,'ding');assert.equal(p.lastCompletedStep,5);assert.equal(p.outcome,'completed');assert(p.closedAt>0,'closedAt');assert.equal(p.toastShown,true);
 assert(!t.q('.appob-modal'),'the wizard stays after the last step');
 // Completion: Add a project (no repository), the toast, the checklist entry.
 assert(/Add a project/.test(t.text())&&/agentd repo add DIR/.test(t.text()),'no Add a project after finishing with none');
 assert(/Onboarding completed!/.test(t.text()),'no completion toast');
 const entry=t.$('appob-entry');assert(t.shown(entry)&&/Onboarding checklist/.test(entry.textContent),'no checklist entry in the sidebar');
 assert(t.$('app-left').contains(entry),'the entry is not in the left sidebar');
 assert(entry.compareDocumentPosition(t.doc.querySelector('[data-app-nav="tasks"]'))&t.w.Node.DOCUMENT_POSITION_FOLLOWING,'the entry is not above Tasks');
 assert(entry.querySelector('svg circle[stroke-dashoffset]'),'no progress ring');
 // Add a project: Re-check closes it once a repository is registered; the command stays text.
 t.srv.facts={...t.srv.facts,repositories:[{path:'/r/a',name:'a',task_file:false}],commands:{...t.srv.facts.commands,repo_add:'agentd repo add '+evil}};
 await t.click('[data-ob="add-recheck"]');assert(!/Add a project/.test(t.text()),'Re-check does not close Add a project');
 // Toast: Send feedback shows the command; Later closes.
 await t.click('[data-ob="toast-feedback"]');assert(/agentd feedback/.test(t.q('.appob-toast').textContent),'feedback command');
 await t.click('[data-ob="toast-later"]');assert(!t.q('.appob-toast'),'Later does not close the toast');
 // --- coach marks: eligible (saw the wizard at first load), no dialog open, a tab open ---
 t.$('app-tabs').append(Object.assign(t.doc.createElement('button'),{type:'button',textContent:'Session'}));t.$('app-tabs').lastChild.setAttribute('role','tab');t.$('app-tabs').lastChild.setAttribute('aria-selected','true');
 for(let i=0;i<20&&!t.q('.appob-tour');i++)await tick();
 let tour=t.q('.appob-tour');assert(tour,'the workspace tour does not start');assert.equal(tour.dataset.tour,'workspace-agent-sessions');
 assert(/New agents start here/.test(tour.textContent),'tour step 1');assert(t.doc.querySelector('[data-app-action="new-tab"]').classList.contains('appob-pulse'),'the target does not pulse');
 const n=phone?1:2;assert(new RegExp('1 of '+n).test(tour.textContent),'N of M counts only targets on screen: '+tour.textContent);
 if(!phone){await t.click('[data-ob="tour-next"]');tour=t.q('.appob-tour');assert(/Start another task in parallel/.test(tour.textContent),'tour step 3');
  // The New task button is still aria-disabled here (its dialog is #564's): Done, not a dead end.
  assert(t.q('[data-ob="tour-next"]')&&/Done/.test(t.q('[data-ob="tour-next"]').textContent),'a disabled action target leaves no way on');
  // Once it is enabled, the action step has no Next: using the target advances.
  const nt=t.doc.querySelector('[data-app-action="new-task"]');nt.removeAttribute('aria-disabled');t.w.eval('obDraw()');assert(!t.q('[data-ob="tour-next"]'),'an action step has Next');
  nt.click();await settle();}
 else{await t.click('[data-ob="tour-next"]')}
 assert(!t.q('.appob-tour'),'the tour does not end');assert.deepEqual(t.last().toursSeen,['workspace-agent-sessions'],'the tour is not remembered');
 // Each tour runs once a session: another tab does not start another.
 t.$('app-tabs').append(t.doc.createElement('span'));await settle();assert(!t.q('.appob-tour'),'a second tour in the same session');
 // --- checklist: Getting started, each item's condition ---
 await t.click('[data-ob="entry"]');assert(/Getting started/.test(t.text())&&/Finish the core workflows/.test(t.text()),'Getting started does not open');
 const items=()=>Object.fromEntries([...t.doc.querySelectorAll('#appob-layer [data-ob-item]')].map(n=>[n.dataset.obItem,n]));
 assert.deepEqual(Object.keys(items()),['notifications','default-agent','agent-capabilities','task-sources','setup-script','add-two-repos','two-worktrees','browser'],'Orca’s eight items in order');
 assert.deepEqual([...t.doc.querySelectorAll('#appob-layer .appob-guidesec h3')].map(h=>h.textContent),['Setup','Milestones']);
 const done=id=>items()[id].classList.contains('done');
 assert(done('notifications'),'notifications: permission granted and on');assert(done('default-agent'),'default agent chosen');assert(done('task-sources'),'gh connected');
 for(const id of ['agent-capabilities','setup-script','add-two-repos','two-worktrees'])assert(!done(id),id+' done too early');
 assert(/Not in agentd/.test(items().browser.textContent)&&!done('browser'),'the browser milestone keeps its place uncounted');
 for(const [id,cmd] of [['agent-capabilities','agentd connect'],['add-two-repos','agentd repo add DIR'],['two-worktrees','agentd new'],['task-sources','gh auth login'],['default-agent','agentd connect claude']])assert(items()[id].querySelector('code').textContent.startsWith(cmd),id+' command');
 assert(/3\/7/.test(t.text()),'progress: '+t.text().slice(0,200));
 // Each remaining condition comes from the facts.
 t.srv.facts={...t.srv.facts,clients:[{tool:'claude',found:true,connected:true}],task_files:1,repositories:[{path:'/r/a'},{path:'/r/b'}],first_task:{done:true,handoff:'hof-1',count:1}};
 await t.click('[data-ob="guide-close"]');await t.click('[data-ob="entry"]');
 for(const id of ['agent-capabilities','setup-script','add-two-repos','two-worktrees'])assert(done(id),id+' not done from its facts');
 // A condition that goes away undoes it: notifications turned off in this browser.
 t.w.localStorage.setItem('dash-notify-off','1');await t.click('[data-ob="guide-close"]');
 assert(!t.shown(t.$('appob-entry'))||true);await t.click('[data-ob="entry"]');assert(!done('notifications'),'notifications off still counts');
 // Hide from sidebar.
 await t.click('[data-ob="guide-hide"]');assert.equal(t.last().guideHidden,true,'Hide is not saved');await t.click('[data-ob="guide-close"]');assert(!t.shown(t.$('appob-entry')),'the entry stays after Hide');
 // Help: the menu, Milestones, Keyboard shortcuts, Onboarding (reopens, resets).
 await t.click('[data-app-action="help"]');assert(t.q('.appob-menu'),'Help has no menu');assert.deepEqual([...t.doc.querySelectorAll('#appob-layer .appob-menu button')].map(b=>b.textContent),['Keyboard shortcuts','Send feedback','Milestones','Onboarding']);
 await t.click('[data-ob="menu-milestones"]');assert(/Getting started/.test(t.text()),'Milestones does not open the checklist');t.key('Escape');await settle();assert(!/Getting started/.test(t.text()),'Escape does not close it');
 await t.click('[data-app-action="help"]');await t.click('[data-ob="menu-onboarding"]');
 p=t.last();assert.equal(p.closedAt,null);assert.equal(p.outcome,null);assert.equal(p.lastCompletedStep,-1);assert.equal(t.step(),'agent_surface','Onboarding does not reopen the wizard at the start');
 // Escape asks; No, keep going keeps it; the backdrop asks too; Skip saves dismissed.
 t.key('Escape');await settle();assert(/Skip onboarding\?/.test(t.text())&&/It won’t take long!/.test(t.text()),'Escape does not ask');
 await t.click('[data-ob="keep"]');assert(!/Skip onboarding\?/.test(t.text())&&t.step(),'No, keep going');
 t.q('.appob-back').click();await settle();assert(/Skip onboarding\?/.test(t.text()),'the backdrop does not ask');
 await t.click('[data-ob="skip"]');p=t.last();assert.equal(p.outcome,'dismissed');assert.equal(p.lastCompletedStep,-1);assert.equal(p.checklist.dismissed,true);assert(p.closedAt>0);assert(!t.step(),'Skip leaves the wizard');
 t.ok();t.w.close();
 // --- resume: a later load opens at the first page past lastCompletedStep ---
 t=await boot({state:{...fresh(),lastCompletedStep:1,defaultAgent:'codex'}});
 assert.equal(t.step(),'theme','resume after step 1 does not open the theme page');assert(/3 of 5/.test(t.text()));
 // Set up later on the theme page: the theme goes back, and it closes as completed.
 const theme0=t.doc.documentElement.dataset.theme;await t.click('[data-ob="theme-'+(theme0==='dark'?'light':'dark')+'"]');await t.click('[data-ob="later"]');
 assert.equal(t.doc.documentElement.dataset.theme,theme0,'Set up later keeps the theme picked on its page');
 p=t.last();assert.equal(p.outcome,'completed');assert.equal(p.lastCompletedStep,5);assert.equal(p.theme,'system','the theme page’s choice was saved');assert(!t.step());
 t.ok();t.w.close();
 t=await boot({state:{...fresh(),lastCompletedStep:3}});assert.equal(t.step(),'notifications','resume after step 3');t.w.close();
 // Set up later on step 2 keeps that page's pick.
 t=await boot({state:{...fresh(),lastCompletedStep:-1}});await t.click('[data-ob="continue"]');await t.click('[data-ob="agent-claude"]');await t.click('[data-ob="later"]');
 p=t.last();assert.equal(p.defaultAgent,'claude');assert.equal(p.outcome,'completed');assert.equal(p.checklist.choseAgent,true);t.w.close();
 // --- gh installed: the GitHub step is skipped (N of 4); a Windows host has its terminal step (N of 6) ---
 t=await boot({facts:{gh:'sign_in'}});assert(/1 of 4/.test(t.text()),'gh installed still shows its step');assert(!t.q('[data-ob="seg-integrations"]'));t.w.close();
 t=await boot({facts:{os:'windows'}});assert(/1 of 6/.test(t.text()),'Windows has no terminal step');await t.click('[data-ob="seg-windows_terminal"]');assert(/Set Windows terminal defaults/.test(t.text()));
 await t.click('[data-ob="continue"]');assert.equal(t.last().lastCompletedStep,4,'the Windows step saves step 4');t.w.close();
 // No agent on PATH: Orca's notice and the popular list; a pick not on PATH is warned of.
 t=await boot({facts:{clients:[{tool:'claude',found:false,connected:false},{tool:'codex',found:false,connected:false},{tool:'opencode',found:false,connected:false}]}});
 await t.click('[data-ob="continue"]');assert(/No agents detected on your PATH/.test(t.text())&&/Popular agents\s*3/.test(t.text()),'no-agent notice');
 await t.click('[data-ob="agent-opencode"]');assert(/opencode isn’t on your PATH yet/.test(t.text()),'not-on-PATH warning');t.w.close();
 // --- an earlier user (closed) sees no wizard, no entry, and no tour ---
 t=await boot({state:{...fresh(),closedAt:Date.now()-1000,outcome:'completed',lastCompletedStep:5}});
 assert(!t.step()&&!t.shown(t.$('appob-entry')),'closed state shows the wizard or the entry');
 t.$('app-tabs').append(Object.assign(t.doc.createElement('button'),{textContent:'Session'}));t.$('app-tabs').lastChild.setAttribute('role','tab');t.$('app-tabs').lastChild.setAttribute('aria-selected','true');await settle();await settle();
 t.w.eval('obTourTry()');await settle();
 assert(!t.q('.appob-tour'),'a tour for someone who did not see the wizard');t.w.close();
 // The entry only in the session it closed (sessionStorage), not on a later launch.
 t=await boot({state:{...fresh(),closedAt:Date.now()-1000,outcome:'completed',lastCompletedStep:5},session:'alice'});assert(t.shown(t.$('appob-entry')),'the entry is gone after a reload in its session');t.w.close();
 // Every counted item done: the entry goes away by itself.
 t=await boot({state:{...fresh(),closedAt:Date.now()-1000,outcome:'completed',lastCompletedStep:5,notifications:true,defaultAgent:'codex'},session:'alice',notify:'granted',facts:{gh:'connected',task_files:1,clients:[{tool:'codex',found:true,connected:true}],repositories:[{path:'/r/a'},{path:'/r/b'}],first_task:{done:true,handoff:'hof-1',count:1}}});
 assert(!t.shown(t.$('appob-entry')),'the entry stays with the checklist complete');t.w.close();
 // --- the team dash: no onboarding, no read ---
 t=await boot({snap:snapBase});assert(!t.doc.body.classList.contains('app-mode'));assert.equal(t.srv.gets,0,'the team dash reads /api/onboarding');assert(!t.doc.querySelector('#appob-layer .appob-modal'),'the wizard in team mode');t.ok();t.w.close();
 // Its own CSS region, Orca's sizes.
 const css=html.match(/region:css-app-onboard[\s\S]*?end:css-app-onboard/);assert(css,'no css-app-onboard region');
 for(const re of [/max-width:1100px/,/max-height:960px/,/font-size:34px/,/rgb\(0 0 0\/\.5\)/,/width:340px/,/width:min\(20rem/,/@media\(max-width:860px\)/])assert(re.test(css[0]),'css: '+re);
 console.log('dash_apponboard: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
