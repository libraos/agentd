// The Files section of a task (region:files): DASH_UI_DOM_MODULE=/path/to/jsdom node testdata/dash_files.cjs dash.html
// The worker directory's tree with changed files marked; a Markdown file opens rendered from its text (never as
// HTML from the file), a Go file as text, a binary file named only; a refused path or task says so. Run in the
// phone layout and both themes (DASH_UI_PHONE, DASH_UI_THEME).
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),errors=[],requests=[];
const h={id:'hof-test',title:'Write the notes',goal:'Write the notes',state:'claimed',claimer:'codex-test',from:'codex-test',from_user:'alice',worker:'codex',to:'any',project:'acme/repo',stage:'implement',source:'interactive',updated_ago:'1m',dispatched:now,attempts:[{running:true,minutes:2}]};
const dash={user:'alice',role:'owner',now,handoff_list:[h],sessions:[{id:'codex-test',label:'worker',tool:'codex',status:'active',user:'alice',cwd:'/tmp/repo',seen_ago:'1m'}],left:[],unlinked:[],inbox:[],waiting:[],done:[],claims:[],prs:[],issues:[]};
const evil='<img src=x onerror=alert(1)>';
const tree={handoff:'hof-test',dir:'repo',changed:3,files:[{path:'NOTES.md',changed:'added'},{path:'README.md'},{path:'cmd/main.go',changed:'modified'},{path:'logo.png'},{path:'old.txt',changed:'deleted'}]};
const file={
 'NOTES.md':{path:'NOTES.md',kind:'markdown',size:80,redacted:1,text:'# Notes\n\nSee **this** and `code` '+evil+'\n\n- one\n- two\n\n```\n'+evil+'\n```\n\n[docs](javascript:alert(1)) [site](https://example.com/x)\n'},
 'cmd/main.go':{path:'cmd/main.go',kind:'text',size:30,redacted:0,text:'package main\n\n// '+evil+'\nfunc main() {}\n'},
 'logo.png':{path:'logo.png',kind:'text',size:9000,binary:true},
};
let treeStatus=200;
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#inbox',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{}]};
 w.fetch=async(url,opts={})=>{requests.push(String(url));const u=new URL(url,w.location.href);let body={},status=200,text='';
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/workitem')body={kind:'handoff',ref:'hof-test',tree:[h],prs:[]};
  else if(u.pathname==='/api/files'){const p=u.searchParams.get('path');
   if(p===null){status=treeStatus;body=tree;text='no such task\n'}
   else if(file[p])body=file[p];
   else{status=403;text='a path through a symlink is not shown\n'}}
  else if(u.pathname==='/api/log')body={handoff:'hof-test',running:false,lines:[]};
  else if(u.pathname==='/api/result')body={files:[]};
  else if(u.pathname==='/api/review')body={handoff:u.searchParams.get('id'),branch:null};
  else if(u.pathname==='/api/chat')body={chats:[],roles:[],gateway_ready:false};
  return {ok:status<400,status,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>status>=400?text:JSON.stringify(body)}};
}});
const w=dom.window,tick=(ms=25)=>new Promise(r=>setTimeout(r,ms));
const fileReqs=()=>requests.filter(u=>u.startsWith('/api/files')).length;
const panel=()=>w.document.querySelector('#hist details[data-files="hof-test"]');
const open=async d=>{d.open=true;d.dispatchEvent(new w.Event('toggle'));await tick();await tick()};
const choose=async p=>{const b=panel().querySelector('button.changes-file[data-path="'+p+'"]');assert(b,'no button for '+p);b.click();await tick();await tick()};
const view=()=>panel().querySelector('.changes-view');
(async()=>{
 await tick();await tick();assert(!errors.length,errors.join('\n'));
 const css=[...w.document.querySelectorAll('style')].map(n=>n.textContent).join('\n');
 assert(css.includes('region:css-files')&&/\.tfiles-text\{[^}]*overflow-wrap:anywhere/.test(css)&&/\.tfiles-md\{[^}]*overflow-wrap:anywhere/.test(css),'file text must wrap in the phone layout');
 w.eval("showWorkItem('hof-test')");await tick();await tick();
 let d=panel();assert(d,'the task has no Files section');assert.equal(d.querySelector('summary').textContent,'Files');assert(!d.open,'Files opens closed');
 assert.equal(fileReqs(),0,'a closed Files section read the tree');
 await open(d);d=panel();
 assert.equal(requests.find(u=>u.startsWith('/api/files')),'/api/files?id=hof-test');
 assert(d.textContent.includes('5 files, 3 changed'),'status: '+d.textContent);
 const marks=Object.fromEntries([...d.querySelectorAll('.changes-file')].map(n=>[n.dataset.path,(n.querySelector('.tfiles-mark')||{}).textContent||'']));
 assert.deepEqual(marks,{'NOTES.md':'A','README.md':'','cmd/main.go':'M','logo.png':'','old.txt':'D'},'marks: '+JSON.stringify(marks));
 assert(!d.querySelector('button[data-path="old.txt"]'),'a deleted file can be opened');
 assert(!d.querySelector('textarea,[contenteditable]'),'the Files section takes edits');
 // A changed Markdown file opens rendered, from its text.
 await choose('NOTES.md');let v=view();
 assert.equal(requests.filter(u=>u.includes('path=')).pop(),'/api/files?id=hof-test&path=NOTES.md');
 const md=v.querySelector('.tfiles-md');assert(md,'Markdown not rendered: '+v.innerHTML);
 assert.equal(md.querySelector('h1').textContent,'Notes');assert.equal(md.querySelector('strong').textContent,'this');assert.equal(md.querySelector('code').textContent,'code');
 assert.equal(md.querySelectorAll('ul li').length,2);assert.equal(md.querySelector('pre').textContent,evil);
 assert(!v.querySelector('img,script'),'file text became markup');assert(md.textContent.includes(evil),'the raw tag is not shown as text');
 const links=[...md.querySelectorAll('a')].map(a=>a.getAttribute('href'));assert.deepEqual(links,['https://example.com/x'],'links: '+links);
 assert(v.textContent.includes('1 secret hidden.'),'redaction note: '+v.textContent);
 assert.equal(panel().querySelector('[aria-current="true"]').dataset.path,'NOTES.md');
 // A Go file opens as text.
 await choose('cmd/main.go');v=view();
 const pre=v.querySelector('pre.tfiles-text');assert(pre,'Go file not shown as text');assert.equal(pre.textContent,file['cmd/main.go'].text);
 assert(!v.querySelector('.tfiles-md,img'),'a Go file was rendered');
 // A redraw keeps the section open and the file chosen, without reading it again.
 const before=fileReqs();w.eval("showWorkItem('hof-test')");await tick();await tick();
 assert(panel().open,'a redraw closed the Files section');assert.equal(view().querySelector('pre.tfiles-text').textContent,file['cmd/main.go'].text,'a redraw lost the file');
 assert.equal(fileReqs(),before,'a redraw read the files again');
 // A binary file is named, not shown; a refused path says why.
 await choose('logo.png');assert(view().textContent.includes('Binary file: not shown.'),'binary: '+view().textContent);assert(!view().querySelector('pre,img'));
 await choose('README.md');assert(view().textContent.includes('Not shown: a path through a symlink is not shown'),'refused: '+view().textContent);
 // The filter narrows the list.
 const f=panel().querySelector('input.tfiles-filter');f.value='main';f.dispatchEvent(new w.Event('input'));
 assert.deepEqual([...panel().querySelectorAll('.changes-file')].filter(n=>!n.hidden).map(n=>n.dataset.path),['cmd/main.go']);
 // A task the person cannot see.
 treeStatus=404;w.eval("delete FILES['hof-test']");w.eval("showWorkItem('hof-test')");await tick();await open(panel());
 assert(panel().textContent.includes('You cannot see this task’s files.'),'refused task: '+panel().textContent);assert(!panel().querySelector('.changes-file'));
 // No worker directory.
 treeStatus=200;tree.files=[];tree.note='No worker directory: no worker was started for this task.';w.eval("delete FILES['hof-test']");w.eval("showWorkItem('hof-test')");await tick();await open(panel());
 assert(panel().textContent.includes('No worker directory'),'no dir: '+panel().textContent);
 assert(!errors.length,errors.join('\n'));
 console.log('dash_files ok',process.env.DASH_UI_PHONE==='1'?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
