// Saved task templates in the new task sheet (#458): the picker lists the
// person's own templates and the team's shared ones; choosing one fills the
// sheet, which starts a task as usual; Save as template, Rename and Delete go to
// /api/templates, only on the person's own; a refusal (a credential-shaped
// field) shows in the sheet. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_templates.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const dash={user:'alice',role:'dev',now,dispatch:true,dispatch_budget:'30m',checkouts:['/plain','/other'],handoff_list:[],sessions:[],done:[],claims:[],messages:[],
 waiting:[{what:'PR',ref:'acme/repo#7',title:'Fix the parser',project:'acme/repo',age:'1m'}]};
let templates=[
 {id:'tpl-1',owner:'alice',mine:true,name:'Fix a check',shared:false,kind:'implement',goal:'Fix the failing check',accept:'the check passes\nno test skipped',check:'go test ./...',role:'fixer',budget:'45m'},
 {id:'tpl-2',owner:'bob',mine:false,name:'Review '+evil,shared:true,kind:'review',goal:'',accept:'every finding tagged',check:'',role:'',budget:''}];
let canSave=true,refuse='';
const errors=[],writes=[],tplWrites=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#issues',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.crypto.getRandomValues=a=>{for(let i=0;i<a.length;i++)a[i]=i;return a};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);let body={},status=200;
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/taskdefaults')body={cwd:u.searchParams.get('cwd'),accept:[]};
  else if(u.pathname==='/api/issues')body={issues:[]};
  else if(u.pathname==='/api/action'){writes.push(JSON.parse(opts.body));body={ok:true,handoff:'hof-new'}}
  else if(u.pathname==='/api/templates'){
   if(opts.method==='POST'){const b=JSON.parse(opts.body);tplWrites.push(b);
    if(refuse){status=400;body={ok:false,error:refuse}}
    else if(b.op==='save'){const id='tpl-'+(templates.length+10);templates.push({id,owner:'alice',mine:true,...b});body={ok:true,id}}
    else if(b.op==='rename'){templates.find(t=>t.id===b.id).name=b.name;body={ok:true,id:b.id}}
    else if(b.op==='delete'){templates=templates.filter(t=>t.id!==b.id);body={ok:true,id:b.id}}}
   else body={templates,can_save:canSave}}
  else if(u.pathname==='/api/chat')body={chats:[],roles:[],gateway_ready:false};
  else if(u.pathname==='/api/team')body={roles:[{name:'fixer',checkouts:[{dir:'/plain'}]}],members:[],default_tool:'claude',handoff_roles:{}};
  return {ok:status<400,status,json:async()=>body,text:async()=>JSON.stringify(body)}}}});
const w=dom.window,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const sheetEl=()=>w.document.querySelector('dialog.sheet'),q=s=>sheetEl().querySelector(s),field=name=>[...sheetEl().querySelectorAll('.sheet-field input,.sheet-field select,.sheet-field textarea')].find(n=>n.id.endsWith('-'+name));
const box=name=>field(name).closest('.sheet-field'),set=(name,value)=>{const n=field(name);n.value=value;n.dispatchEvent(new w.Event('input'));n.dispatchEvent(new w.Event('change'))};
const button=label=>[...q('.tpl').querySelectorAll('button')].find(b=>b.textContent===label&&!b.hidden&&!b.closest('[hidden]'));
const choose=async id=>{const p=q('#tpl-pick');p.value=id;p.dispatchEvent(new w.Event('change'));await settle()};
const status=()=>q('.tpl-status');
const submit=async()=>{sheetEl().querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle()};
const open=async()=>{w.eval("TEAM.lists={roles:[{name:'fixer',checkouts:[{dir:'/plain'}]}],members:[],default_tool:'claude',handoff_roles:{}};newHandoffSheet()");await settle();assert(sheetEl(),'the sheet did not open')};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 await open();
 // The picker sits above the sheet's fields and lists own and shared ones.
 const pick=q('#tpl-pick');assert(pick,'no template picker');
 assert(q('.tpl').compareDocumentPosition(box('kind'))&w.Node.DOCUMENT_POSITION_FOLLOWING,'the picker is not above the fields');
 assert.deepEqual([...pick.options].map(o=>o.value),['','tpl-1','tpl-2']);
 assert.equal(pick.options[2].textContent,'Review '+evil+' · shared by bob');assert(!sheetEl().querySelector('img'),'a template name became markup');
 assert(button('Save as template'),'no Save as template');assert(!button('Rename')&&!button('Delete'),'Rename or Delete with nothing chosen');
 // Start from one's own: the sheet is filled in, and the task goes as usual.
 await choose('tpl-1');
 assert.equal(field('goal').value,'Fix the failing check');assert.equal(field('accept').value,'the check passes\nno test skipped');
 assert.equal(field('check').value,'go test ./...');assert.equal(field('budget').value,'45m');assert.equal(field('role').value,'fixer');assert.equal(field('kind').value,'implement');
 assert(status().textContent.includes('Filled in from Fix a check'),status().textContent);
 assert(button('Rename')&&button('Delete'),'own template has no Rename or Delete');
 await submit();
 assert.equal(writes.length,1,'the task from the template was not sent');
 const sent=writes[0];assert.equal(sent.action,'offer');assert.equal(sent.goal,'Fix the failing check');assert.equal(sent.accept,'the check passes\nno test skipped');
 assert.equal(sent.check,'go test ./...');assert.equal(sent.role,'fixer');assert.equal(sent.budget,'45m');assert.equal(sent.cwd,'/plain');
 // A shared one of bob's fills a review; it is not alice's to change.
 await open();await choose('tpl-2');
 assert.equal(field('kind').value,'review');assert(!box('pr').hidden,'the review template did not switch the kind');assert.equal(field('accept').value,'every finding tagged');
 assert(!button('Rename')&&!button('Delete'),'Rename or Delete on another person\'s template');
 // Save as template: the sheet's fields go with the name and the share flag.
 set('kind','implement');set('goal','Bump the deps');set('accept','go build passes');set('check','go build ./...');set('budget','20m');
 button('Save as template').click();await settle();
 const name=q('#tpl-name');assert(!q('.tpl-edit').hidden&&!name.hidden,'no name field');
 name.value='Deps';q('#tpl-shared').checked=true;
 name.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await settle();
 assert(sheetEl(),'Enter in the name submitted the task');assert.equal(writes.length,1,'saving a template started a task');
 const saved=tplWrites.at(-1);
 assert.deepEqual({...saved},{op:'save',name:'Deps',shared:true,kind:'implement',goal:'Bump the deps',accept:'go build passes',check:'go build ./...',role:'',budget:'20m'});
 assert(q('.tpl-edit').hidden,'the name row stayed open');assert.equal(q('#tpl-pick').value,saved&&templates.at(-1).id,'the saved template is not chosen');
 assert(status().textContent.includes('Saved Deps, shared with the team'),status().textContent);
 // Rename it.
 const id=q('#tpl-pick').value;button('Rename').click();await settle();assert.equal(q('#tpl-name').value,'Deps');assert(q('#tpl-shared').closest('label').hidden,'rename shows the share flag');
 q('#tpl-name').value='Dependencies';button('Save name').click();await settle();
 assert.deepEqual(tplWrites.at(-1),{op:'rename',id,name:'Dependencies'});
 assert.equal(q('#tpl-pick').selectedOptions[0].textContent,'Dependencies · shared');
 // A refusal shows in the sheet and keeps the sheet open.
 refuse='refusing: field check looks like a credential (matched credential-shaped value)';
 button('Save as template').click();await settle();q('#tpl-name').value='Leaky';button('Save').click();await settle();
 assert(status().classList.contains('bad')&&status().textContent.includes('looks like a credential'),status().textContent);assert(!q('.tpl-edit').hidden,'the name row closed on a refusal');
 refuse='';button('Close').click();await settle();
 // Delete it, after a confirmation.
 button('Delete').click();await settle();assert(q('.tpl-edit').textContent.includes('Delete the template Dependencies?'));
 assert.equal(tplWrites.at(-1).op,'save','Delete went without a confirmation');
 [...q('.tpl-edit').querySelectorAll('button')].find(b=>b.textContent==='Delete template').click();await settle();
 assert.deepEqual(tplWrites.at(-1),{op:'delete',id});
 assert(![...q('#tpl-pick').options].some(o=>o.value===id),'the deleted template is still listed');assert.equal(q('#tpl-pick').value,'');
 assert(status().textContent.includes('Deleted Dependencies'),status().textContent);
 // Someone who may not save (a viewer) can still start from one, but sees no Save.
 sheetEl().querySelector('.sheet-foot button').click();await settle();
 canSave=false;await open();assert(!button('Save as template'),'Save as template for someone who may not save');
 await choose('tpl-1');assert(!button('Rename')&&!button('Delete'));assert.equal(field('goal').value,'Fix the failing check');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_templates: ok');process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
