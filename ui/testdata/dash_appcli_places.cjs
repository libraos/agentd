// Review M5, the rest (personal app refresh item 5): the places item 5 left showing terminal commands as text
// now put them behind the same disclosure (cliSame: a closed <details> whose lines each have a copy icon), and
// Settings > Terminal commands (dash-cli-inline.USER) shows them inline again as before. Places: onboarding's
// "In the terminal" blocks (a step with no command keeps its note) and the Getting started / Milestones rows,
// the trigger Edit and Pause sheets, the sidebar and Tasks empty states, the watchdog popover, and /panel's
// notes (where to answer an approval or a question, the watchdog line, the empty list).
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_appcli_places.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',theme=process.env.DASH_UI_THEME||'light',now=new Date().toISOString();
const html=fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8');
const WD='systemctl --user enable --now agentd-watchdog.timer',NEW='libraos-engine new "GOAL"',ON='libraos-engine config set triggers.enabled true';
const base={user:'alice',role:'owner',now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:['/r/demo'],dispatch:true,terminal:true,
  mode:'app',watchdog:{running:false,start:WD},spend_today:{usd:0,workers:0,unpriced:0,pending:0,user:'alice'}};
const panelSnap={...base,waiting:[{what:'approval',ref:'apr-1',title:'Open a draft PR',from:'s-work',handoff:'hof-apr',can_answer:true,age:'4m',mine:true}],
  inbox:[{id:'question:hof-q1:1',kind:'question',title:'Keep the old names?',handoff:'hof-q1',from:'w-q1',age:'2m'}]};
const trigStatus=on=>({enabled:on,problem:'',problem_when_enabled:'',repos:['acme/web'],authors:['alice'],label:'fix',budget:'30m',max_per_day:3,dirs:{},offers:[]});
const fresh={flowVersion:4,closedAt:null,outcome:null,lastCompletedStep:-1,checklist:{},surface:'terminal',defaultAgent:null,theme:'system',sound:'system',notifications:false,guideHidden:false,toursSeen:[],toastShown:false};
const closed={...fresh,closedAt:12345,outcome:'completed',lastCompletedStep:5,defaultAgent:'codex',toursSeen:['tasks','workspace-agent-sessions','triggers'],toastShown:true};
const facts={os:'linux',repositories:[],task_files:0,clients:[{tool:'claude',found:true,connected:false},{tool:'codex',found:true,connected:false}],default_tool:'codex',first_task:{done:false,handoff:null,count:0},gh:'not_installed',linear:false,commands:{}};
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
async function boot(o={}){const errors=[],vc=new VirtualConsole(),clip=[],srv={trig:false};
  vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
  const dom=new JSDOM(html,{url:'http://127.0.0.1:21470'+(o.path||'/'),runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',theme);if(o.inline)w.localStorage.setItem('dash-cli-inline.alice','1');
    Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{writeText:async t=>{clip.push(t)}}});w.Notification=undefined;
    w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
    w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
    w.WebSocket=class{constructor(){this.readyState=0}send(){}close(){this.readyState=3}};
    w.fetch=async(url,init)=>{const u=new URL(url,w.location.href);let body={};
      if(u.pathname==='/api/auth')return {ok:true,status:204};
      if(u.pathname==='/api/dash')body=o.snap||base;
      else if(u.pathname==='/api/triggers')body={status:trigStatus(srv.trig),templates:[],repo:'acme/web',author:'alice',enable:ON,schedules:{schedules:[]}};
      else if(u.pathname==='/api/onboarding')body={user:'alice',state:init&&init.method==='POST'?JSON.parse(init.body):o.ob||closed,facts};
      return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
  const w=dom.window,doc=w.document;await settle();assert(!errors.length,errors.join('\n'));
  return {w,doc,clip,srv,$:id=>doc.getElementById(id),q:(s,n)=>(n||doc).querySelector(s),qa:(s,n)=>[...(n||doc).querySelectorAll(s)],
    click:async n=>{assert(n,'nothing to click');n.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));await settle()},
    ok:()=>assert(!errors.length,errors.join('\n'))}}
// behind: in node, cmd sits in a closed "label" disclosure with a copy icon for it, and nowhere else as text.
function behind(node,cmd,label,where){assert(node,where+': not drawn');const d=[...node.querySelectorAll('details.cli-same')].find(x=>x.textContent.includes(cmd));
  assert(d,where+': no disclosure holding '+cmd+': '+node.textContent);assert(!d.open,where+': the disclosure is open');assert.equal(d.querySelector('summary').textContent,label,where+': summary');
  assert([...d.querySelectorAll('.cli-copy')].some(b=>b.dataset.cli.startsWith(cmd)&&b.getAttribute('type')==='button'&&/^Copy\. /.test(b.getAttribute('aria-label'))),where+': no copy icon for '+cmd);
  const c=node.cloneNode(true);for(const x of c.querySelectorAll('details.cli-same'))x.remove();assert(!c.textContent.includes(cmd),where+': the command shows as text outside the disclosure: '+c.textContent);return d}
// shown: inline again, as code, with no disclosure.
function shown(node,cmd,where){assert(node,where+': not drawn');assert(!node.querySelector('details.cli-same'),where+': still a disclosure when inline');
  assert([...node.querySelectorAll('code')].some(c=>c.textContent.includes(cmd))||node.textContent.includes(cmd),where+': the command is not inline: '+node.textContent)}
(async()=>{
 for(const inline of [false,true]){const tag=inline?'inline':'default',see=(n,cmd,label,where)=>inline?shown(n,cmd,where+' ('+tag+')'):behind(n,cmd,label,where);
  // Onboarding: each step's "In the terminal" block; a step with no command keeps its note as before.
  let t=await boot({ob:fresh,inline});let {q,qa,$}=t;assert(q('#appob-layer .appob-modal'),'the wizard does not open');
  const block=()=>q('#appob-layer .appob-cli');
  see(block(),'libraos-engine handoff show ID','In the terminal','step 1');
  if(!inline)assert(/Saved for this page only/.test(q('details.cli-same',block()).textContent),'the step note is not inside the disclosure');
  await t.click(q('#appob-layer [data-ob="seg-agent"]'));see(block(),'libraos-engine config set dispatch.default_tool','In the terminal','agent step');
  await t.click(q('#appob-layer [data-ob="seg-theme"]'));assert(!q('details',block())&&/In the terminal: no command/.test(block().textContent)&&/Saved in this browser/.test(block().textContent),'the theme step lost its note');
  await t.click(q('#appob-layer [data-ob="seg-integrations"]'));see(block(),'libraos-engine issue sync-gh','In the terminal','integrations step');
  if(!inline){t.clip.length=0;await t.click([...qa('.cli-copy',block())].find(b=>b.dataset.cli==='gh auth login'));assert.deepEqual(t.clip,['gh auth login'],'the step copy icon');}
  t.ok();t.w.close();
  // Getting started: the Setup and Milestones rows.
  t=await boot({inline});({q,qa,$}=t);
  await t.click(q('#app-left [data-app-action="help"]'));await t.click(q('[data-ob="menu-milestones"]'));
  const item=id=>q('#appob-layer [data-ob-item="'+id+'"]');assert(item('two-worktrees'),'no Milestones');
  see(item('two-worktrees'),'libraos-engine new "GOAL" --cwd DIR','In the terminal','Milestones row');see(item('add-two-repos'),'libraos-engine repo add DIR','In the terminal','Setup row');
  assert(qa('#appob-layer [data-ob-item]').every(n=>inline?!n.querySelector('details'):!n.querySelector(':scope .appob-itemtext > code')),'a row shows its command as text');
  await t.click(q('#appob-layer [data-ob="guide-close"]'));
  // Sidebar and Tasks empty states.
  const note=q('#app-projects .app-listnote');assert(/No tasks yet\. Start one with \+ \(or N\)/.test(note.textContent),'sidebar empty: '+note.textContent);see(note,NEW,'Or from a terminal','sidebar empty state');
  t.w.appPage('tasks');await settle();const empty=q('#app-page .app-pempty');assert(/No tasks yet/.test(empty.textContent)&&/Start one with \+ in Projects/.test(empty.textContent),'Tasks empty: '+empty.textContent);see(empty,NEW,'Or from a terminal','Tasks empty state');
  // A filter that matches nothing has no command.
  const f=q('#app-page .app-pfilter');f.value='zzz';f.dispatchEvent(new t.w.Event('input'));await settle();assert(!q('#app-page .app-pempty details')&&!/libraos-engine/.test(q('#app-page .app-pempty').textContent),'a filter miss shows a command');
  t.w.appPage('');await settle();
  // The watchdog popover.
  await t.click(q('[data-app-status="watchdog"]'));const pop=$('app-watchdog-pop');assert(!pop.hidden,'the watchdog popover does not open');
  assert(/No watchdog is running/.test(pop.textContent)&&/does not start it for you/.test(pop.textContent),'watchdog popover: '+pop.textContent);see(pop,WD,'Start one from a terminal','watchdog popover');
  if(!inline){const d=q('details',pop);d.open=true;t.clip.length=0;await t.click(q('.cli-copy',d));assert.deepEqual(t.clip,[WD],'the watchdog copy icon');assert(!pop.hidden,'copying closed the popover')}
  // The trigger Edit sheet (triggers off) and Pause sheet (on).
  t.w.appPage('triggers');await settle();await t.click(q('#app-page [data-appt-action="trigger_edit"]'));let dlg=q('dialog.sheet[open]');assert(dlg&&/Edit trigger/.test(dlg.textContent),'no Edit sheet');
  let desc=q('.sheet-head p',dlg).textContent;assert(/It stays off: nothing fires until someone/.test(desc),'Edit description: '+desc);
  if(inline)assert(desc.includes(ON),'inline: the Edit description lost its command');else assert(!desc.includes(ON),'the Edit description still names the command');
  see(inline?dlg:q('.sheet-body',dlg),ON,'Turn on from a terminal','Edit sheet');await t.click([...qa('.sheet-foot button',dlg)].find(b=>b.textContent==='Cancel'));
  t.srv.trig=true;t.w.appPage('');await settle();t.w.appPage('triggers');await settle();await t.click(q('#app-page [data-appt-action="trigger_pause"]'));dlg=q('dialog.sheet[open]');assert(dlg&&/Pause triggers\?/.test(dlg.textContent),'no Pause sheet');
  desc=q('.sheet-head p',dlg).textContent;assert(/start nothing until someone turns them on again from a terminal/.test(desc),'Pause description: '+desc);
  if(inline)assert(desc.includes(ON),'inline: the Pause description lost its command');else assert(!desc.includes(ON),'the Pause description still names the command');
  see(inline?dlg:q('.sheet-body',dlg),ON,'Turn on again from a terminal','Pause sheet');await t.click([...qa('.sheet-foot button',dlg)].find(b=>b.textContent==='Cancel'));
  t.ok();t.w.close();
  // /panel's notes.
  t=await boot({path:'/panel',snap:panelSnap,inline});({q,qa,$}=t);assert(t.doc.body.classList.contains('panel-mode'),'no panel at /panel');
  const wdl=$('ap-watchdog');assert(!wdl.hidden&&/No watchdog: offered tasks do not start/.test(wdl.textContent),'panel watchdog line: '+wdl.textContent);see(wdl,WD,'Start one from a terminal','panel watchdog line');
  const list=q('#ap-list .ap-empty');assert(/No tasks yet\. Start one from your agent/.test(list.textContent),'panel empty: '+list.textContent);see(list,NEW,'Or from a terminal','panel empty list');
  const apr=q('[data-where="approval"]');assert(apr,'no where for the approval');
  for(const c of ['libraos-engine approval answer apr-1 --approve','libraos-engine approval answer apr-1 --reject'])see(apr,c,'The commands','panel approval note');
  assert(inline?/at your own terminal:$/.test(q('.ap-mute',apr).textContent):/at your own terminal\.$/.test(q('.ap-mute',apr).textContent),'approval note text: '+q('.ap-mute',apr).textContent);
  if(inline)assert(qa('.ap-copy',apr).length===2,'inline: the Copy buttons are gone');
  const qn=q('[data-where="question"]');assert(qn,'no where for the question');see(qn,'libraos-engine handoff answer hof-q1 --text "..."','The command','panel question note');
  if(!inline){t.clip.length=0;const d=q('details',apr);d.open=true;await t.click(qa('.cli-copy',d)[1]);assert.deepEqual(t.clip,['libraos-engine approval answer apr-1 --reject'],'the panel copy icon')}
  t.ok();t.w.close()}
 // The Settings toggle redraws the sidebar's empty state at once, without waiting for the next refresh.
 {const t=await boot();t.w.appPage('settings');await settle();
  assert(t.q('#app-projects .app-listnote details.cli-same'),'sidebar: no disclosure before the toggle');
  await t.click(t.q('#app-page [data-app-pref="cli"]'));assert(!t.q('#app-projects .app-listnote details')&&t.q('#app-projects .app-listnote').textContent.includes(NEW),'the sidebar did not follow the toggle');
  assert.equal(t.doc.activeElement,t.q('#app-page [data-app-pref="cli"]'),'focus left the toggle');t.ok();t.w.close()}
 console.log('dash_appcli_places: ok',phone?'phone':'desktop',theme);process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
