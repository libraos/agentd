// #449: a task's change size on its board card and its header, and Changes as
// a file list beside the first file's diff. Runs in every mode, like dash_dom:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_changes.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const task=(id,goal,o)=>({id,title:goal,goal,state:'claimed',claimer:'codex-w',from:'codex-w',from_user:'alice',claimer_user:'alice',worker:'codex',to:'any',project:'acme/repo',stage:'implement',source:'interactive',updated_ago:'1m',dispatched:now,attempts:[{running:false,minutes:12,end_reason:'done',files:3,added:40,deleted:12}],...o});
// change is what the server sends from the worker branch's diff stat; hof-none has no branch, so none.
const big=task('hof-big','Change three files',{change:{files:3,added:40,deleted:12}}),none=task('hof-none','No branch here',{attempts:[{running:false,minutes:2,end_reason:'done'}]}),one=task('hof-one','Change one file',{change:{files:1,added:2,deleted:0}});
const done={what:'handoff',ref:'hof-done',title:'Finished change',by:'codex-w',from:'codex-w',worker:'codex',at:now,age:'2m',change:{files:3,added:40,deleted:12},attempts:big.attempts};
const dash={user:'alice',role:'owner',now,dispatch:true,checkouts:['/tmp/repo'],handoff_list:[big,none,one],handoff_sources:['interactive'],handoff_stages:['implement'],sessions:[{id:'codex-w',label:'worker',tool:'codex',status:'active',user:'alice',cwd:'/tmp/repo',seen_ago:'1m'}],left:[],unlinked:[],inbox:[],waiting:[],done:[done],counts:{},handoffs:{},host_states:{}};
const review={handoff:'hof-big',enabled:true,branch:'agentd/hof-big',head:'abc1234',base:'0001111',base_branch:'main',repo:'acme/repo',proposed:false,may:true,added:40,deleted:12,terminal:"git -C '/w' diff 0001111..agentd/hof-big",
 files:[{path:'src/first.go',added:30,deleted:2,diff:'diff --git a/src/first.go b/src/first.go\n+first file '+evil},{path:'src/second.go',added:9,deleted:10,diff:'diff --git a/src/second.go b/src/second.go\n+second file'},{path:'logo.png',added:0,deleted:0,binary:true}]};
const tasks={'hof-big':big,'hof-none':none,'hof-one':one};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#issues',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{}]};
 w.fetch=async(url)=>{const u=new URL(url,w.location.href),id=u.searchParams.get('id')||u.searchParams.get('ref');let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/issues')body={issues:[]};
  else if(u.pathname==='/api/issue'){const t=tasks[id];body={kind:'handoff',ref:id,title:t.title,body:{goal:t.goal},tree:[{...t,focus:true,branch:t.change?'agentd/'+id:null}],prs:[]}}
  else if(u.pathname==='/api/review')body=id==='hof-big'?review:{handoff:id,branch:null};
  else if(u.pathname==='/api/result')body={files:[]};
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}};
}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),route=async hash=>{w.location.hash=hash;await tick();await tick();await tick()};
const card=ref=>doc.querySelector('#board [data-ref="'+ref+'"]');
(async()=>{
 await tick();await tick();await route('#issues?view=all');assert(!errors.length,errors.join('\n'));
 // Board cards: the size from the server, the same words the issue asks for; nothing on a task with no branch.
 for(const ref of ['hof-big','hof-done']){const c=card(ref);assert(c,'no card for '+ref);const k=c.querySelector('.kchange');assert(k,ref+' card has no change size');assert.equal(k.textContent,'3 files +40 −12',ref+' card change size')}
 assert.equal(card('hof-one').querySelector('.kchange').textContent,'1 file +2 −0','one file is singular');
 assert(card('hof-none'),'no card for hof-none');assert(!card('hof-none').querySelector('.kchange'),'a task with no worker branch shows a change size');
 // The header on the task's page, and Changes: the file list with the first file's diff, no other click.
 await route('#issues/hof-big');const page=doc.querySelector('#issue-detail');assert(!errors.length,errors.join('\n'));
 const head=page.querySelector('.iev .kmeta .kchange');assert(head,'task header has no change size');assert.equal(head.textContent,'3 files +40 −12');
 const changes=page.querySelector('details.openpr-changes');assert(changes,'no Changes');changes.open=true;
 const list=changes.querySelector('nav.changes-files');assert(list,'Changes has no file list');const files=[...list.querySelectorAll('button.changes-file')];
 assert.deepEqual(files.map(b=>b.querySelector('code').textContent),['src/first.go','src/second.go','logo.png']);assert.equal(files[0].querySelector('.changes-n').textContent,'+30 −2');assert.equal(files[2].querySelector('.changes-n').textContent,'binary');
 assert.equal(files[0].getAttribute('aria-current'),'true','the first file is not the chosen one');let view=changes.querySelector('.changes-view');
 assert(view.querySelector('pre').textContent.includes('first file '+evil),'the first file\'s diff is not open');assert(!view.querySelector('img'),'diff text became markup');assert(!view.textContent.includes('second file'),'more than one file open');
 assert.equal(changes.querySelectorAll('details').length,0,'files are still folded one per details');
 // Choosing a file shows its diff instead, and the choice stays across a redraw.
 files[1].click();view=changes.querySelector('.changes-view');assert(view.textContent.includes('second file')&&!view.textContent.includes('first file'),'choosing a file did not show it');assert.equal(files[1].getAttribute('aria-current'),'true');assert(!files[0].hasAttribute('aria-current'));
 w.eval('drawDetail()');await tick();const again=doc.querySelector('#issue-detail details.openpr-changes .changes-view');assert(again&&again.textContent.includes('second file'),'the chosen file was lost on a redraw');
 // No worker branch: no size in the header, and the Changes tab says there is no change instead of a diff (#480).
 await route('#issues/hof-none');const bare=doc.querySelector('#issue-detail');assert(bare.querySelector('.iev'),'hof-none page did not draw');assert(!bare.querySelector('.kchange'),'header shows a size with no branch');
 const panel=bare.querySelector('.tw-panel[data-tab="changes"]');assert(panel&&!panel.querySelector('details.openpr-changes,.changes-view'),'Changes shown with no branch');assert(/No (change|worker)/.test(panel.textContent),'the Changes tab does not say there is no change: '+panel.textContent);
 // The phone layout puts the list above the diff.
 const css=[...doc.querySelectorAll('style')].map(n=>n.textContent).join('\n');assert(/@media\(max-width:860px\)\{\.changes\{grid-template-columns:minmax\(0,1fr\)\}/.test(css),'no phone rule for Changes');
 assert(!errors.length,errors.join('\n'));
 console.log('changes ('+(process.env.DASH_UI_PHONE==='1'?'phone':'desktop')+', '+(process.env.DASH_UI_THEME||'light')+'): card and header size, file list with the first diff open, none without a branch passed');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
