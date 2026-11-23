// Community issues on Tasks (#community): GitHub issues filed in the public repositories or by people outside the team,
// from GET /api/issues (per row author, author_association, comments, community, created;
// community_waiting at the top). Done when:
//  1. only rows with community true are listed, open ones first, each with its ref, title,
//     author, age, triage note and waiting_on, linked tasks and PRs with status words, comments;
//  2. a row the server flags community_waiting (open, no comment, no task or PR, older than
//     3 days by the server's clock) is marked as waiting for a first answer, from that flag
//     and not the browser's clock, and the views row shows the top-level community_waiting
//     number on a link to the view; a row without the flag has no mark;
//  3. titles, notes and authors are text: a script tag or an img onerror shows literally;
//  4. a viewer reaches it, in the team layout, and it offers nothing that writes;
//  5. an older server (rows without the fields) renders without errors and says so.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_community.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',nowMs=Date.now(),now=new Date(nowMs).toISOString(),daysAgo=d=>new Date(nowMs-d*86400000).toISOString();
const run={id:'hof-run',goal:'Fix the parser crash',project:'acme/alpha',state:'claimed',claimer:'s-w',from:'s-alice',from_user:'alice',to:'any',worker:'claude',dispatched:true,updated_ago:'1m',issue:'acme/alpha#12',issues:['acme/alpha#12']};
const sessions=[{id:'s-w',tool:'claude',status:'active',host_state:'busy',cwd:'/srv/alpha',user:'alice'},{id:'s-v',tool:'dash',status:'active',user:'vera'}];
// A viewer, on a team server (two people): no write controls anywhere.
const dash={user:'vera',role:'viewer',team:true,now,handoff_list:[run],done:[],sessions,left:[],waiting:[],claims:[],messages:[],inbox:[],dispatch:true,checkouts:['/srv/alpha'],terminal:false,handoff_sources:['interactive'],handoff_stages:['implement']};
const evilTitle='<script>window.pwned=1</script>Crash on start',evilNote='<img src=x onerror="window.pwned=2"> needs a repro',evilAuthor='<b>eve</b>';
const row=(n,x)=>({ref:'acme/alpha#'+n,repo:'acme/alpha',title:'Issue '+n,state:'OPEN',handoffs:[],prs:[],updated_ago:'1h',author:'someone',author_association:'NONE',comments:0,community:true,community_waiting:false,created:daysAgo(1),...x});
const issuesNew={community_waiting:2,issues:[
  row(11,{title:evilTitle,note:evilNote,author:evilAuthor,created:daysAgo(5),waiting_on:'user',community_waiting:true}), // waiting for a first answer
  row(12,{title:'Docs typo',author:'dana',author_association:'CONTRIBUTOR',comments:2,created:daysAgo(2),handoffs:[{id:'hof-run',state:'claimed'}],prs:[{ref:'acme/alpha#40',state:'OPEN'}],note:'Fix is in progress',waiting_on:'reporter'}),
  row(13,{title:'New and quiet',created:daysAgo(1)}),                                                         // no comment yet, too new to count
  row(14,{title:'Team member bug',author:'alice',author_association:'MEMBER',community:false,created:daysAgo(9)}),
  row(15,{title:'Dependabot bump',author:'dependabot[bot]',community:false,created:daysAgo(9)}),
  row(16,{title:'Old and closed',state:'CLOSED',created:daysAgo(30)}),
  row(17,{title:'Commented once',comments:1,created:daysAgo(6)}),
  // Near the cutoff the server's snapshot decides, whatever the browser's clock says:
  row(18,{title:'Just past 3 days here',created:daysAgo(3.01)}),                                            // server: not yet
  row(19,{title:'Just short of 3 days here',created:daysAgo(2.99),community_waiting:true})]};              // server: waiting
// A server with the author fields but no per-row flag: no row is marked, whatever its age.
const issuesNoFlag={community_waiting:1,issues:issuesNew.issues.map(({community_waiting,...r})=>r)};
// An older server: the rows as they were, with no author fields and no community_waiting.
const issuesOld={issues:[{ref:'acme/alpha#11',repo:'acme/alpha',title:evilTitle,state:'OPEN',handoffs:[],prs:[],note:evilNote}]};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=body=>({ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)});
function load(url,issues){const writes=[];const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);if(opts.method&&opts.method!=='GET')writes.push(u.pathname);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/issues')return json(issues);
  if(u.pathname==='/api/team')return json({roles:[],members:[],handoff_roles:{}});
  return json({})}}});dom.writes=writes;return dom}
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<8;i++)await tick()};
(async()=>{
 // The count: on Tasks the views row has a Community link with the server's community_waiting.
 let dom=load('http://127.0.0.1:21620/#issues?view=all&layout=board',issuesNew),w=dom.window,doc=w.document;await settle();
 assert(!errors.length,errors.join('\n'));
 assert(!doc.body.classList.contains('app-mode'),'not the team layout');
 const link=doc.querySelector('#issue-views a[data-community-link]');assert(link,'no Community link in the views row');
 assert.equal(link.getAttribute('href'),'#community');assert.equal(doc.getElementById('community-n').textContent,'2','the link does not carry community_waiting');
 assert.equal(link.title,'2 community issues wait for a first answer');
 link.click();w.location.hash='#community';await settle();
 assert(!doc.getElementById('page-community').hidden,'the Community view did not open');assert(doc.getElementById('page-work').hidden);
 assert.equal(doc.getElementById('page-title').textContent,'Tasks / Community');
 assert.equal(doc.querySelector('[data-rail="issues"]').getAttribute('aria-current'),'page','Tasks is not the current rail item');
 const body=doc.getElementById('community-body'),rows=()=>[...body.querySelectorAll('[data-community-row]')],refs=()=>rows().map(r=>r.dataset.communityRow);
 // The filter: community rows only (not the member's, not the bot's), open first, the closed one last.
 assert.deepEqual(refs(),['acme/alpha#13','acme/alpha#12','acme/alpha#19','acme/alpha#18','acme/alpha#11','acme/alpha#17','acme/alpha#16'],'rows: '+refs().join(','));
 assert(!/Team member bug|Dependabot bump/.test(body.textContent),'a team or bot issue is listed');
 assert.deepEqual(rows().map(r=>r.dataset.open),['1','1','1','1','1','1','0']);
 assert.equal(doc.getElementById('community-count').textContent,'6 open, 2 waiting for a first answer');
 // The waiting mark: the rows the server flags, #19 included and #18 not, though the browser's
 // clock puts #18 past 3 days and #19 short of it; the marks agree with the count.
 const marked=rows().filter(r=>r.querySelector('[data-community-waiting]')).map(r=>r.dataset.communityRow);
 assert.deepEqual(marked,['acme/alpha#19','acme/alpha#11'],'waiting marks: '+marked.join(','));
 assert.equal(rows()[4].querySelector('[data-community-waiting]').textContent,'Waiting for a first answer');
 // A row: ref, title, author, age, note, waiting_on, tasks and PRs with status words, comments.
 const r12=rows()[1],t12=r12.textContent;
 for(const want of ['acme/alpha#12','Docs typo','by dana','(contributor)','2 comments','opened 2d ago','Fix is in progress','waiting on reporter'])assert(t12.includes(want),'row 12 lacks '+want+': '+t12);
 const task=r12.querySelector('[data-community-task="hof-run"]');assert(task&&/In progress/.test(task.textContent),'the linked task lacks its status words: '+(task&&task.textContent));
 const pr=r12.querySelector('[data-community-pr="acme/alpha#40"]');assert(pr&&/PR #40/.test(pr.textContent)&&/In review/.test(pr.textContent),'the linked PR lacks its status words: '+(pr&&pr.textContent));
 assert.equal(pr.querySelector('a').getAttribute('href'),'https://github.com/acme/alpha/pull/40');
 assert.equal(r12.querySelector('a[target=_blank]').getAttribute('href'),'https://github.com/acme/alpha/issues/12');
 assert(rows()[5].textContent.includes('1 comment')&&!rows()[5].textContent.includes('1 comments'));
 assert(rows()[4].textContent.includes('waiting on you'),'waiting_on user is not said as waiting on you');
 // Text, never markup: the script tag, the img onerror and the bold author show literally.
 const r11=rows()[4];
 for(const want of [evilTitle,evilNote,'by '+evilAuthor])assert(r11.textContent.includes(want),'not shown literally: '+want+' in '+r11.textContent);
 assert(!body.querySelector('script,img,b'),'issue text became markup');assert.equal(w.pwned,undefined,'issue text ran');
 assert.equal(r11.querySelector('[data-community-note]').textContent,evilNote);
 // Read only: links and the Open work item buttons, nothing that writes.
 assert(!body.querySelector('[data-write],form,textarea,input,select,details'),'the view has a write control');
 const buttons=[...body.querySelectorAll('button')];assert(buttons.length&&buttons.every(b=>b.title==='Open work item'),'a button that is not Open work item: '+buttons.map(b=>b.textContent).join(','));
 assert.deepEqual(dom.writes,[],'the view wrote: '+dom.writes.join(','));
 // A redraw on refresh keeps the list.
 w.eval('refresh()');await settle();assert.equal(rows().length,7);
 assert(!errors.length,errors.join('\n'));dom.window.close();
 // A server without the per-row flag: the rows list, none is marked.
 dom=load('http://127.0.0.1:21620/#community',issuesNoFlag);w=dom.window;doc=w.document;await settle();
 assert(!errors.length,errors.join('\n'));
 assert.equal(doc.querySelectorAll('#community-body [data-community-row]').length,7);
 assert(!doc.querySelector('#community-body [data-community-waiting]'),'a row without the flag is marked');
 assert.equal(w.pwned,undefined);dom.window.close();
 // An older server: no fields, no errors, and the view says why it is empty.
 dom=load('http://127.0.0.1:21620/#community',issuesOld);w=dom.window;doc=w.document;await settle();
 assert(!errors.length,errors.join('\n'));
 const old=doc.querySelector('#community-body [data-community-old]');assert(old,'no note for an older server: '+doc.getElementById('community-body').textContent);
 assert(/does not report issue authors yet/.test(old.textContent));
 assert(!doc.querySelector('[data-community-row]'),'an older server listed rows');assert.equal(doc.getElementById('community-count').textContent,'');
 assert(!doc.querySelector('#community-body script,#community-body img'));assert.equal(w.pwned,undefined);
 w.location.hash='#issues?view=all';await settle();assert.equal(doc.getElementById('community-n').textContent,'','an older server shows a count');
 assert(!errors.length,errors.join('\n'));
 // An address with more after #community is not a page.
 w.location.hash='#community/x';await settle();
 assert(doc.getElementById('page-community').hidden,'#community/x opened the view');
 console.log('dash_community: ok');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
