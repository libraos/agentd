// The task workspace (#480): an open task is two panes. A top bar (title, status
// line, Stop and the other actions, Push branch and Open a draft PR once the
// change is ready); centre tabs Session, Log and Terminal (Terminal only where
// the dash offers one); right tabs Changes, Files, Checks and Details, each with
// what its old section held. Changes shows a running worker's diff. The message
// box under Session sends task_msg for who may, says when the worker is gone,
// and is not there for who may not. The tabs are remembered per browser; on a
// phone the right pane's tabs join the centre's. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_workspace.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const base={from:'s-alice',from_user:'alice',to:'any',updated_ago:'1m',age:'1m',project:'acme/alpha'};
const run={...base,id:'hof-run',goal:'Parent-level acceptance',state:'claimed',claimer:'s-w',worker:'claude',dispatched:true,may_stop:true,check:'go test ./...',branch:'agentd/hof-run',change:{files:1,added:3,deleted:1},spend:{minutes:11,usd:2.71},attempts:[{tool:'claude',model:'m',running:true,minutes:11,usd:2.71}],mark:'working'};
const gone={...base,id:'hof-gone',goal:'A worker that left',state:'claimed',claimer:'s-g',worker:'claude',dispatched:true,worker_state:'gone',mark:'failed'};
const nope={...base,id:'hof-nope',goal:'Someone else\'s task',from_user:'bob',state:'claimed',claimer:'s-b',worker:'claude',dispatched:true,may_stop:false,why_not:'only the handoff sender, claimer or an owner may stop its worker',mark:'working'};
const done={...base,id:'hof-done',goal:'Finished, ready for review',state:'done',claimer:'s-d',worker:'codex',dispatched:true,mark:'done'};
const logs={'hof-run':[{state:'claimed',actor:'s-w',ago:'20m'},{state:'claimed',actor:'s-w',note:'report: Read the brief. '+evil,ago:'12m'},{state:'claimed',actor:'s-me',note:'message m-1 from user alice to its worker s-w: please add a test',ago:'5m'},{state:'claimed',actor:'s-w',note:'report: Tests added; running the check.',ago:'2m'}]};
const sessions=[{id:'s-w',tool:'claude',status:'active',host_state:'busy',cwd:'/srv/alpha',user:'alice'}];
let dash={user:'alice',role:'owner',now,handoff_list:[run,gone,nope],done:[{...done,title:done.goal}],sessions,left:[],waiting:[],claims:[],messages:[],inbox:[],dispatch:true,checkouts:['/srv/alpha'],terminal:false};
const review={'hof-run':{handoff:'hof-run',enabled:true,state:'claimed',branch:'agentd/hof-run',head:'abc1234',files:[{path:'internal/a.go',added:3,deleted:1,diff:'@@ -1 +1 @@\n-old\n+new '+evil}],added:3,deleted:1,proposed:false,may:false},
 'hof-gone':{handoff:'hof-gone',enabled:true,state:'claimed',branch:'todo-clear',foreign:true,why_not:'the worker\'s branch todo-clear is not agentd/hof-gone, the branch agentd made for this handoff, so agentd will not push it',head:'4865e61',commits:1,files:[{path:'todo.js',added:68,deleted:1,diff:'+x'}],added:68,deleted:1,proposed:false,may:false},
 'hof-done':{handoff:'hof-done',enabled:true,state:'done',branch:'agentd/hof-done',head:'def5678',files:[{path:'b.go',added:1,deleted:0,diff:'+b'}],added:1,deleted:0,proposed:true,may:true,may_push:true,title:'t',body:'b'}};
const taskmsg={'hof-run':{may:true,live:true},'hof-gone':{may:true,live:false,gone:'The worker has gone: its session ended, so a message would not be read.'},'hof-nope':{may:false,why_not:'only the handoff sender, claimer or an owner may message its worker'},'hof-done':{may:true,live:false,gone:'The task is done: no worker is on it any more, so a message would not be read.'}};
const errors=[],posts=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=body=>({ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)});
function load(url,storage){return new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');for(const [k,v] of Object.entries(storage||{}))w.localStorage.setItem(k,v);
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.fetch=async(url,opt)=>{const u=new URL(url,w.location.href),id=u.searchParams.get('id');
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/issues')return json({issues:[]});
  if(u.pathname==='/api/action'){const b=JSON.parse(opt.body);posts.push(b);return json({ok:true,handoff:b.id,to:'s-w'})}
  if(u.pathname==='/api/issue'){const ref=u.searchParams.get('ref'),h=[...dash.handoff_list,...dash.done].find(x=>x.id===ref);return json({kind:'handoff',ref,title:h.goal,body:{goal:h.goal,accept:'every criterion has a test'},tree:[{...h,focus:true,log:logs[ref]||[]}],prs:[]})}
  if(u.pathname==='/api/review')return json(review[id]||{handoff:id,enabled:true,branch:null,why_not:'no worker branch is recorded for '+id});
  if(u.pathname==='/api/log')return json({lines:['LOGLINE of '+id],running:id==='hof-run'});
  if(u.pathname==='/api/files')return json({files:[{path:'internal/a.go',changed:'modified'}],changed:1});
  if(u.pathname==='/api/checks')return json({check:'go test ./...',runs:[{result:'passed',actor:'s-w',at:now,tests:'12 tests'}]});
  if(u.pathname==='/api/result')return json({});
  if(u.pathname==='/api/taskmsg')return json(taskmsg[id]);
  if(u.pathname==='/api/team')return json({roles:[],members:[],handoff_roles:{}});
  return json({})}}})}
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
(async()=>{
 let dom=load('http://127.0.0.1:21620/#issues/hof-run'),w=dom.window,doc=w.document;await settle();
 const go=async h=>{w.location.hash=h;await settle()};
 const box=()=>doc.querySelector('#issue-detail .idetail.tw');
 const tabs=sel=>[...doc.querySelectorAll('#issue-detail '+sel+' > .tw-tabs > .tw-tab:not(.tw-more)')].map(b=>b.dataset.tab);
 const panel=k=>doc.querySelector('#issue-detail .tw-panel[data-tab="'+k+'"]');
 const click=async(sel,k)=>{doc.querySelector('#issue-detail '+sel+' .tw-tab[data-tab="'+k+'"]').click();await settle()};
 assert(!errors.length,errors.join('\n'));
 // Two panes and the top bar.
 assert(box(),'the task is not the workspace');assert(doc.querySelector('#issue-detail .tw-top h2.ititle').textContent==='Parent-level acceptance');
 assert(doc.querySelector('#issue-detail .tw-main')&&doc.querySelector('#issue-detail .tw-side'),'not two panes');
 const top=doc.querySelector('#issue-detail .tw-top');assert(/agentd\/hof-run/.test(top.textContent)&&/Claude/.test(top.textContent)&&/\$2\.71/.test(top.textContent)&&/1 file/.test(top.textContent),'status line lacks branch, agent, spend or change: '+top.textContent);
 assert([...top.querySelectorAll('button')].some(b=>b.textContent==='Stop'),'no Stop in the top bar');
 // No terminal offered: no Terminal tab. Seven tabs where it is.
 assert.deepEqual(tabs('.tw-main'),['session','log']);assert.deepEqual(tabs('.tw-side'),['changes','files','checks','details']);
 dash.terminal=true;await w.eval('refresh()');await settle();
 assert.deepEqual(tabs('.tw-main'),['session','log','terminal'],'Terminal is not a tab where the dash offers one');
 assert.equal(tabs('.tw-main').length+tabs('.tw-side').length,7);
 assert.equal(doc.querySelector('#issue-detail .tw-side .tw-tab[data-tab="changes"]').textContent,'Changes 1');
 // Session by default: goal, acceptance criteria, the activity, and the history as a conversation, as text.
 assert(!panel('session').hidden&&panel('log').hidden&&panel('terminal').hidden,'Session is not the first tab');
 const s=panel('session');assert(s.textContent.includes('every criterion has a test'),'Session lacks the acceptance criteria');assert(s.querySelector('article.iev[data-ref="hof-run"]'),'Session lacks the activity');
 const msgs=[...s.querySelectorAll('.tw-conv .tw-msg')];assert.equal(msgs.length,3,'reports and messages are not messages');
 assert(msgs[0].textContent.includes('Report')&&msgs[0].textContent.includes('Read the brief. '+evil),'report text');assert(!s.querySelector('.tw-conv img'),'a report became markup');
 assert(msgs[1].classList.contains('tw-me')&&msgs[1].textContent.includes('You')&&msgs[1].textContent.includes('please add a test'),'the person\'s message is not theirs');
 assert(s.querySelector('.tw-conv .tw-step'),'other history steps are gone');
 // Changes (default right tab): the running worker's diff from its branch, as text.
 const ch=panel('changes');assert(!ch.hidden,'Changes is not the first right tab');const cd=ch.querySelector('details.openpr-changes');assert(cd&&cd.open,'Changes has no open diff');
 assert(cd.querySelector('pre.openpr-patch').textContent.includes('+new '+evil),'the running worker\'s diff is missing');assert(!ch.querySelector('img'),'diff became markup');assert(/still on it/.test(ch.textContent),'Changes does not say the worker is still on it');
 // Log: the existing tail, read when the tab opens.
 await click('.tw-main','log');assert(!panel('log').hidden&&panel('session').hidden);const lg=panel('log').querySelector('details.wlog[data-wlog="hof-run"]');assert(lg&&lg.open,'Log tab lacks the log');
 await settle();assert(panel('log').querySelector('pre.wlog-lines').textContent.includes('LOGLINE of hof-run'),'the log tail is not shown');
 // Terminal: the existing section.
 await click('.tw-main','terminal');assert(panel('terminal').querySelector('details.tterm[data-terminal="hof-run"]'),'Terminal tab lacks the terminal');
 // Files, Checks and Details.
 await click('.tw-side','files');assert(!panel('files').hidden&&panel('changes').hidden);await settle();const fl=panel('files').querySelector('details.tfiles[data-files="hof-run"]');assert(fl&&fl.open,'Files tab lacks the files');assert(fl.querySelector('.changes-file'),'files not listed');
 await click('.tw-side','checks');assert(panel('checks').querySelector('section.checks .check-run'),'Checks tab lacks the runs');
 await click('.tw-side','details');const dt=panel('details');assert([...dt.querySelectorAll('.props .k')].some(k=>k.textContent==='Status'),'Details lacks the properties');
 for(const sec of ['Pull requests','Spend, tokens and agent time','Runs'])assert([...dt.querySelectorAll('.sec')].some(n=>n.textContent.startsWith(sec)),'Details lacks '+sec);
 // The tabs are remembered per browser: a fresh load opens the same ones.
 await click('.tw-main','log');await click('.tw-side','files');
 const saved=w.localStorage.getItem('dash-task-tabs');assert.deepEqual(JSON.parse(saved),{main:'log',side:'files',phone:''});
 let again=load('http://127.0.0.1:21620/#issues/hof-run',{'dash-task-tabs':saved});await settle();
 assert(!again.window.document.querySelector('#issue-detail .tw-panel[data-tab="log"]').hidden&&!again.window.document.querySelector('#issue-detail .tw-panel[data-tab="files"]').hidden,'the tabs were not remembered');again.window.close();
 await click('.tw-main','session');
 // Phone: the right pane's tabs are more tabs in the centre's list; picking one shows that pane.
 const more=[...doc.querySelectorAll('#issue-detail .tw-main > .tw-tabs > .tw-more')].map(b=>b.dataset.tab);assert.deepEqual(more,['changes','files','checks','details'],'no right-pane tabs for a phone');
 doc.querySelector('#issue-detail .tw-main .tw-more[data-tab="checks"]').click();await settle();
 assert.equal(box().dataset.phone,'checks');assert(!panel('checks').hidden);assert.equal(doc.querySelector('#issue-detail .tw-main .tw-more[data-tab="checks"]').getAttribute('aria-selected'),'true');
 const css=[...doc.querySelectorAll('style')].map(n=>n.textContent).join('');assert(css.includes('.idetail.tw:not([data-phone]) .tw-side{display:none}')&&css.includes('.idetail.tw[data-phone] .tw-main>.tw-panel{display:none}'),'the phone rules are missing');
 await click('.tw-main','session');assert(!box().dataset.phone,'a centre tab did not leave the right pane on a phone');
 // The message box: typed text survives a redraw; Send posts task_msg to this task.
 let ta=panel('session').querySelector('.tw-msgbox textarea');assert(ta,'no message box for the sender');
 ta.value='also update the docs';ta.dispatchEvent(new w.Event('input'));w.eval('drawDetail()');await settle();
 ta=panel('session').querySelector('.tw-msgbox textarea');assert.equal(ta.value,'also update the docs','the draft was lost on a redraw');
 [...panel('session').querySelectorAll('.tw-msgbox button')].find(b=>b.textContent==='Send').click();await settle();
 assert.deepEqual(posts.pop(),{action:'task_msg',id:'hof-run',body:'also update the docs'});
 // A worker that has gone: the box says so instead.
 await go('#issues/hof-gone');let mb=panel('session').querySelector('.tw-msgbox');assert(mb&&!mb.hidden&&!mb.querySelector('textarea'),'a box for a gone worker');assert(/worker has gone/.test(mb.textContent));
 // #603: commits on a branch agentd did not make are its change; only publishing says it is not pushed.
 const gch=panel('changes');assert(gch.querySelector('.openpr-changes')&&/todo\.js/.test(gch.textContent)&&/branch todo-clear/.test(gch.textContent),'no change on the user\'s branch: '+gch.textContent);
 assert(!/has not committed/.test(gch.textContent)&&/Not published: .*will not push it/.test(gch.querySelector('[data-k="publish"]').textContent),'Changes: '+gch.textContent);
 // Who may not Stop the task gets no box.
 await go('#issues/hof-nope');mb=panel('session').querySelector('.tw-msgbox');assert(!mb||mb.hidden&&!mb.querySelector('textarea'),'a box for who may not stop the task');
 // A finished change: Push branch and Open a draft PR are in the top bar.
 await go('#issues/hof-done');const t2=[...doc.querySelectorAll('#issue-detail .tw-top button')].map(b=>b.textContent);
 assert(t2.includes('Open a draft PR')&&t2.includes('Push branch'),'top bar lacks Push branch or Open a draft PR: '+t2.join(', '));
 assert(!errors.length,errors.join('\n'));
 w.close();console.log('dash_workspace: ok');
})().catch(e=>{console.error(e);console.error('DOM errors:',errors);process.exit(1)});
