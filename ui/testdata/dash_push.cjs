const fs=require('fs'),vm=require('vm'),assert=require('assert');
const page=fs.readFileSync(process.argv[2],'utf8');
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
const ids={},ctx={console,Node:N,localStorage:{getItem(){return ''}},setTimeout(){return 1},clearTimeout(){},CSS:{escape:x=>x},document:{activeElement:null,createElement:t=>new N(t),createTextNode:t=>String(t),getElementById:id=>ids[id]??=new N(),addEventListener(){},querySelectorAll(){return []},querySelector(){return new N('main')},body:new N('body')},refresh(){},render(){},settingsAccess(){},nameOf:x=>x,teamHref:(k,id)=>'#team/'+k+'/'+id,inboxRead(){},itemHash:(i,id)=>'#issues/'+id};
ctx.document.activeElement=new N('button');vm.createContext(ctx);
// The draft-PR region: the diff view, the proposal's buttons, the confirm sheet, and Merge on a draft.
let core=page.split('// region:core\n')[1].split('function meter(')[0];
vm.runInContext(core,ctx);
vm.runInContext(page.split('// region:openpr')[1].split('// end:openpr')[0].replace(/^/,'//'),ctx);
vm.runInContext(page.split('// region:changes')[1].split('// end:changes')[0].replace(/^/,'//'),ctx);
// Push branch (#461): its button beside Open a draft PR, its confirm sheet and what it sends.
assert(page.includes('// region:push'),'no region:push in the page');
vm.runInContext(page.split('// region:push')[1].split('// end:push')[0].replace(/^/,'//'),ctx);
const run=s=>vm.runInContext(s,ctx),event={preventDefault(){},stopPropagation(){}};
run("lockState=function(){};ghHref=(r,k)=>'https://github.com/'+r;fmtMin=m=>Math.round(m)+' min';toast=function(m,g){toast.last=m;toast.good=g}");
const evil='<img src=x onerror=alert(1)>';
const review={handoff:'hof-1',enabled:true,branch:'agentd/hof-1',head:'abc1234',base:'0001111',base_branch:'main',repo:'o/r',remote:'origin',proposed:true,may:true,may_why:'',may_push:true,may_push_why:'',inbox_id:'review:hof-1:abc1234',dismissed:false,
 title:'Add a greeting',body:'## Goal',check:'passed',added:3,deleted:1,files:[{path:'README.md',added:3,deleted:1,diff:'+hello'}]};
let writes=[],reply={ok:true,pushed:true,branch:'agentd/hof-1'},fail='';
ctx.fetch=async(url,opts)=>{if(url.startsWith('/api/review'))return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(review))};writes.push({url,body:JSON.parse(opts.body)});
 if(fail)return {ok:false,status:400,json:async()=>({ok:false,error:fail}),text:async()=>JSON.stringify({ok:false,error:fail})};return {ok:true,status:200,json:async()=>reply}};
const current=()=>run('activeSheet&&activeSheet.dialog'),submit=()=>current().children[0].onsubmit(event);
const all=n=>[n,...n.querySelectorAll('button,span,code,p,img')];
const button=(n,text)=>all(n).find(b=>b.tagName==='BUTTON'&&b.textContent===text);
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 run("TOKEN='test';CONNECTED=true");
 const box=run('el("section",{})');ctx.box=box;run('openPRFill(box,'+JSON.stringify(review)+')');
 // Beside Open a draft PR, in the same row.
 const labels=box.querySelectorAll('button').map(b=>b.textContent);
 assert(labels.includes('Open a draft PR')&&labels.includes('Push branch'),'buttons: '+labels);
 assert.equal(labels.indexOf('Push branch'),labels.indexOf('Open a draft PR')+1,'Push branch is not beside Open a draft PR');
 assert(!button(box,'Push branch').dataset.disabledReason,'allowed person sees a disabled Push branch');
 // The sheet says what is pushed; Cancel writes nothing.
 button(box,'Push branch').listeners.click[0]();let text=current().textContent;
 for(const want of ['Push this branch?','agentd/hof-1','origin','o/r','abc1234','No pull request is opened and nothing is merged','never force-pushes'])assert(text.includes(want),'sheet lacks '+want);
 run('activeSheet.cancel()');assert.equal(writes.length,0,'Cancel pushed');
 // Confirm sends exactly that branch's handoff and the commit the person saw.
 button(box,'Push branch').listeners.click[0]();await submit();
 assert.deepEqual(writes.map(w=>w.body),[{action:'push_branch',id:'hof-1',head:'abc1234'}]);assert.equal(run('toast.last'),'Pushed agentd/hof-1 to origin');
 // A push that fails: the sheet stays with the server's reason, nothing else is sent.
 writes=[];fail='the push was rejected: branch protection';button(box,'Push branch').listeners.click[0]();const r=await submit();
 assert(current(),'a failed push closed the sheet');assert(current().textContent.includes('the push was rejected: branch protection'),'failure reason not shown: '+current().textContent);
 assert.equal(writes.length,1);run('activeSheet.cancel()');fail='';
 // Refused (a viewer, another developer): disabled with the server's reason.
 run('openPRFill(box,'+JSON.stringify({...review,may_push:false,may_push_why:'user vic has role viewer, which is read-only'})+')');
 assert.equal(button(box,'Push branch').dataset.disabledReason,'user vic has role viewer, which is read-only');
 run('openPRFill(box,'+JSON.stringify({...review,may_push:undefined,may_push_why:undefined,may:false,may_why:'only the handoff sender, claimer or an owner may open a pull request'})+')');
 assert(button(box,'Push branch').dataset.disabledReason.includes('only the handoff sender'),'an older server: no reason');
 // Pushed: a status as text with the history line, no second button; Open a draft PR stays.
 const note='pushed branch agentd/hof-1 at abc1234 to origin (o/r), by alice '+evil;
 run('openPRFill(box,'+JSON.stringify({...review,pushed:{note,at:'2026-11-12T10:00:00Z'}})+')');
 assert(!button(box,'Push branch')&&button(box,'Open a draft PR'),'pushed state still offers Push branch');
 const done=all(box).find(n=>n.tagName==='SPAN'&&n.textContent==='Branch pushed to origin');assert(done&&done.attrs.title===note,'pushed state lacks the history line');
 assert(!all(box).some(n=>n.tagName==='IMG'),'history text became markup');
 // No proposal (a linked PR, report only): no Push branch either.
 run('openPRFill(box,'+JSON.stringify({...review,proposed:false,pr:{ref:'o/r#77',state:'OPEN'}})+')');assert(!button(box,'Push branch'),'Push branch with a linked PR');
 console.log('push branch: beside Open a draft PR, confirm sheet, exact request, failure kept, refusals, pushed state passed');
})().catch(e=>{console.error(e);process.exitCode=1});
