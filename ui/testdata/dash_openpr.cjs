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
vm.runInContext(page.split('function prDisabledReason(')[1].split('/* The board')[0].replace(/^/,'function prDisabledReason('),ctx);
const run=s=>vm.runInContext(s,ctx),event={preventDefault(){},stopPropagation(){}};
run("lockState=function(){};ghHref=(r,k)=>'https://github.com/'+r;fmtMin=m=>Math.round(m)+' min';toast=function(m,g){toast.last=m}");
const evil='<img src=x onerror=alert(1)>';
const review={handoff:'hof-1',enabled:true,branch:'agentd/hof-1',head:'abc1234',base:'0001111',base_branch:'main',repo:'o/r',remote:'origin',proposed:true,may:true,may_why:'',inbox_id:'review:hof-1:abc1234',dismissed:false,
 title:'Add a greeting',body:'## Goal\n\nAdd a greeting\n\nOpened from the agentd dashboard by alice',check:'passed',minutes:12,dollars:'$0.40',added:3,deleted:1,too_large:true,terminal:"git -C '/w' diff 0001111..agentd/hof-1",
 files:[{path:'README.md',added:3,deleted:1,diff:'diff --git a/README.md b/README.md\n+'+evil},{path:'big.txt',added:9000,deleted:0,too_large:true}]};
let writes=[],served=review;
ctx.fetch=async(url,opts)=>{if(url.startsWith('/api/review'))return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(served))};writes.push({url,body:JSON.parse(opts.body)});return {ok:true,status:200,json:async()=>({ok:true,ref:'o/r#77'})}};
const current=()=>run('activeSheet.dialog'),submit=()=>current().children[0].onsubmit(event);
const all=n=>[n,...n.querySelectorAll('button,pre,img,code,a,details,summary,h5')];
const button=(n,text)=>all(n).find(b=>b.tagName==='BUTTON'&&b.textContent===text);
(async()=>{
 run("TOKEN='test';CONNECTED=true");
 const box=run('el("section",{})');ctx.box=box;run('openPRFill(box,'+JSON.stringify(review)+')');
 const text=box.textContent;
 for(const want of ['Ready for review: open a pull request?','2 files changed','+3 −1','check passed','12 min','$0.40','branch agentd/hof-1','README.md','too large — see the terminal command',review.terminal,'over 200 KB','only after you confirm; it never merges'])assert(text.includes(want),'panel lacks '+want);
 assert(!all(box).some(n=>n.tagName==='IMG'),'diff text became markup');assert(all(box).some(n=>n.tagName==='PRE'&&n.textContent.includes(evil)),'diff not shown as text');
 assert(button(box,'Open a draft PR')&&button(box,'Not now'),'proposal buttons missing');
 // The confirm sheet says exactly what is pushed, and Cancel writes nothing.
 button(box,'Open a draft PR').listeners.click[0]();let sheetText=current().textContent;
 for(const want of ['agentd/hof-1','origin','o/r','main','abc1234','Add a greeting','Opened from the agentd dashboard by alice','Nothing is merged'])assert(sheetText.includes(want),'sheet lacks '+want);
 run('activeSheet.cancel()');assert.equal(writes.length,0,'Cancel opened a PR');
 // The worker's commits took files that were the user's uncommitted ones: the sheet says so first.
 run('openPRConfirm('+JSON.stringify({...review,warning:'the worker\'s commits change files that had the user\'s uncommitted changes when it started: notes.md'})+')');assert(current().textContent.includes('Check before you push: the worker'),'sheet lacks the worker_dirty warning');assert(!sheetText.includes('Check before you push'),'warning without one');run('activeSheet.cancel()');assert.equal(writes.length,0);
 button(box,'Open a draft PR').listeners.click[0]();await submit();assert.deepEqual(writes[0].body,{action:'open_pr',id:'hof-1',head:'abc1234'});assert(run('toast.last').includes('o/r#77'));
 // Not now dismisses the person's inbox item.
 writes=[];await button(box,'Not now').listeners.click[0]();assert.deepEqual(writes[0].body,{action:'inbox_mark',id:'review:hof-1:abc1234',mark:'resolved'});
 // Someone the server would refuse: disabled with its reason; dismissed: no Not now; no branch: nothing shown.
 run('openPRFill(box,'+JSON.stringify({...review,may:false,may_why:'only the handoff sender, claimer or an owner may open a pull request',dismissed:true})+')');
 const barred=button(box,'Open a draft PR');assert.equal(barred.dataset.disabledReason,'only the handoff sender, claimer or an owner may open a pull request');assert(!button(box,'Not now'),'Not now after dismissal');assert(!box.textContent.includes('Ready for review: open'),'dismissed proposal still asks');
 run('openPRFill(box,'+JSON.stringify({...review,enabled:false})+')');assert(button(box,'Open a draft PR').dataset.disabledReason.includes('open_pr = false'));
 run('openPRFill(box,{handoff:"hof-2",branch:null})');assert(box.hidden,'empty review shown');
 run('openPRFill(box,'+JSON.stringify({...review,proposed:false,pr:{ref:'o/r#77',state:'OPEN'}})+')');assert(box.textContent.includes('o/r#77')&&!button(box,'Open a draft PR'),'linked PR still proposes');
 // Inbox row: summary line and both buttons; Open a draft PR loads the review and opens the sheet.
 const x={id:'review:hof-1:abc1234',kind:'review',handoff:'hof-1',summary:{files:2,added:3,deleted:1,check:'passed'},branch:'agentd/hof-1'};ctx.x=x;
 {const line=run('openPRInboxLine(x)');assert(line.textContent.includes('2 files changed, +3 −1 · check passed'));assert(!line.textContent.includes('agentd/hof-1'),'the branch name is in the inbox row');}
 const acts=run('openPRInboxActs(x)');assert.deepEqual(acts.map(b=>b.textContent),['Open a draft PR','Not now']);
 writes=[];acts[0].listeners.click[0]();await new Promise(r=>setImmediate(r));assert(current().textContent.includes('Push and open draft PR'),'inbox Open did not confirm');run('activeSheet.cancel()');assert.equal(writes.length,0);
 // Merge on a draft: the sheet says it is marked ready first, and the state shows beside the button.
 const pr={ref:'o/r#9',title:'Change',draft:true,pr_state:'draft · checks running'};ctx.pr=pr;
 const pacts=run("prActions({pr_owner:true,merge_repos:['o/r']},pr)");assert(pacts.some(n=>n&&n.textContent==='draft · checks running'),'no PR state');assert.equal(run("prStateText('ready · checks failing · blocked by review or branch protection')"),'Checks failing · blocked by review or branch protection','ready beside what blocks');const merge=pacts.find(n=>n&&n.textContent==='Mark ready and merge');assert(merge,'no Mark ready and merge');
 merge.listeners.click[0]();assert(current().textContent.includes('Mark ready for review, then merge o/r#9?'));assert(current().textContent.includes('Branch protection still applies'));writes=[];await submit();assert.deepEqual(writes[0].body,{action:'pr_merge',repo:'o/r',number:9});
 assert(run("prActions({pr_owner:true,merge_repos:['o/r']},{ref:'o/r#9'})").some(n=>n&&n.textContent==='Merge'),'a ready PR lost Merge');
 // A report-only change: no proposal, no buttons, Report ready with the diff still there.
 run('openPRFill(box,'+JSON.stringify({...review,proposed:false,may:false,may_why:'this task only produced deliverables in out/; nothing to publish to the repository',deliverables_only:true,inbox_id:undefined,files:[{path:'out/agentd-impact-review.md',added:5,deleted:0,diff:'+# Review'}]})+')');
 assert(box.textContent.includes('Report ready')&&box.textContent.includes('nothing to publish'),'report-only panel lacks Report ready');assert(!button(box,'Open a draft PR')&&!button(box,'Not now'),'report-only change offers a PR');assert(!box.textContent.includes('Ready for review: open'),'report-only change still asks');assert(box.textContent.includes('out/agentd-impact-review.md'),'report-only change hides its diff');
 writes=[];// Mixed: the confirm sheet lists the out/ files that would be published too.
 run('openPRConfirm('+JSON.stringify({...review,out_files:['out/report.md','out/chart.png']})+')');sheetText=current().textContent;assert(sheetText.includes('deliverables in out/ and would be published to the repository too')&&sheetText.includes('out/report.md')&&sheetText.includes('out/chart.png'),'sheet lacks the out/ warning');run('activeSheet.cancel()');assert.equal(writes.length,0);
 run('openPRConfirm('+JSON.stringify(review)+')');assert(!current().textContent.includes('would be published to the repository too'),'out/ warning without out/ files');run('activeSheet.cancel()');
 // Changes and a file in it stay open across a redraw.
 run('openPRFill(box,'+JSON.stringify(review)+')');let det=all(box).filter(n=>n.tagName==='DETAILS');const changes=det.find(n=>n.className==='openpr-changes');changes.open=true;changes.listeners.toggle[0]();
 run('openPRFill(box,'+JSON.stringify(review)+')');assert(all(box).find(n=>n.tagName==='DETAILS'&&n.className==='openpr-changes').open,'Changes collapsed on redraw');run('delete OPENPR["hof-1"]');
 run('openPRFill(box,'+JSON.stringify(review)+')');assert(!all(box).find(n=>n.tagName==='DETAILS'&&n.className==='openpr-changes').open,'Changes open by default');
 // Result: the summary and the last report as text, each deliverable a View button that reads /api/result/file.
 const res={handoff:'hof-1',summary:'Three risks '+evil,final:'I read the docs.\n\nSummary: Three risks',report_note:'Halfway '+evil,chat:'chat-9',files:[{name:'agentd-impact-review.md',type:'md',size:2048,source:'canvas'},{name:'chart.png',type:'png',size:10,source:'commit'}]};
 const rbox=run('el("section",{})');ctx.rbox=rbox;run('resultFill(rbox,'+JSON.stringify(res)+',"hof-1")');const rtext=rbox.textContent;
 for(const want of ['Result','Summary: ','Three risks '+evil,'Latest report: ','Halfway '+evil,'View agentd-impact-review.md','View chart.png','Open the conversation'])assert(rtext.includes(want),'result lacks '+want);assert(!all(rbox).some(n=>n.tagName==='IMG'),'result text became markup');
 assert.equal(all(rbox).find(n=>n.tagName==='A'&&n.textContent==='Open the conversation').attrs.href,'#chat/chat-9');
 run('resultFill(rbox,{handoff:"hof-1",files:[]})');assert(rbox.hidden,'empty result shown');
 const fetched=[];const fileBody='# Review\n'+evil;ctx.fetch=async(url)=>{fetched.push(url);if(url.startsWith('/api/result/file'))return {ok:true,status:200,text:async()=>fileBody,blob:async()=>({})};if(url.startsWith('/api/result'))return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(res))};return {ok:true,status:200,json:async()=>(JSON.parse(JSON.stringify(served)))}};
 run('resultFill(rbox,'+JSON.stringify(res)+',"hof-1")');button(rbox,'View agentd-impact-review.md').listeners.click[0]();await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
 assert(fetched.includes('/api/result/file?id=hof-1&name=agentd-impact-review.md'),'View did not read the file: '+fetched);assert(all(current()).some(n=>n.tagName==='PRE'&&n.textContent===fileBody),'deliverable not shown as text');assert(!all(current()).some(n=>n.tagName==='SCRIPT'||n.tagName==='IMG'));run('activeSheet.cancel()');
 // Report ready in the Inbox: its deliverables, and View opens the result with the first one read.
 const rx={id:'result:hof-1:abc1234',kind:'result',handoff:'hof-1',title:'Report ready: Review agentd impact',deliverables:['out/agentd-impact-review.md']};ctx.rx=rx;
 assert(run('resultInboxLine(rx)').textContent.includes('Report: agentd-impact-review.md'));const racts=run('resultInboxActs(rx)');assert.deepEqual(racts.map(b=>b.textContent),['View'],'Report ready offers more than View');
 fetched.length=0;racts[0].listeners.click[0]();for(let i=0;i<4;i++)await new Promise(r=>setImmediate(r));assert(current().textContent.includes('Report ready: Review agentd impact')&&current().textContent.includes('Three risks'),'View did not open the result');assert(fetched.some(u=>u.startsWith('/api/result/file')),'View did not open the first deliverable');assert(all(current()).some(n=>n.tagName==='PRE'&&n.textContent===fileBody));run('activeSheet.cancel()');
 console.log('open PR: diff as text, proposal buttons, confirm sheet, Not now, refusals, inbox row, draft merge, report-only, out/ warning, kept-open Changes, Result and Report ready passed');
})().catch(e=>{console.error(e);process.exitCode=1});
