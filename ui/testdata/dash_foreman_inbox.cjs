// The foreman's human stops in the Inbox (core #94). Done when each of the four kinds the
// foreman files reads as its own row kind with its own actions:
//  1. question: the stage's question, Answer (approve with the answer as the note: the stage
//     runs again) and Stop the item (reject);
//  2. spec: the spec approval, Approve (on to implement), Redo with my note (reject with a
//     note: spec runs again) and Stop the item (reject with no note);
//  3. ready: Open work item and the item's branch, nothing to approve;
//  4. stopped: the reason, and its next_step's terminal commands, each to copy;
// each with Mark resolved; a question or spec is one row though it arrives as its approval
// too, and is an approval (the Approvals tab); one this person's role cannot answer says so.
// The app, which does not answer approvals, says to answer in the dash. A worker's own
// question and an ordinary spec approval render as before.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_foreman_inbox.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>',phone=process.env.DASH_UI_PHONE==='1';
const base={from:'s-alice',from_user:'alice',to:'any',project:'acme/repo',updated_ago:'1m'};
const root=(id,goal)=>({...base,id,goal,state:'claimed',claimer:'s-foreman',claimer_user:'alice'});
const open=[root('hof-fq','Strict ingest'),root('hof-fs','Billing export'),root('hof-fr','Rename flags'),root('hof-fx','Driver upgrade'),
 {...base,id:'hof-w',goal:'Worker work',state:'claimed',claimer:'s-work',claimer_user:'alice',worker:'claude',dispatched:now},
 {...base,id:'hof-sp',goal:'Plain spec',state:'claimed',claimer:'s-work',claimer_user:'alice'}];
const qText='Foreman item hof-fq: implement stage hof-fq2 asks a question: Which schema version? '+evil+'. Approve with your answer as the note to run the stage again with it; reject to stop the item.';
const sText='Foreman item hof-fs: approve the spec from stage hof-fs1 to go on to implement? Reject with a note to have spec redo it with your note, or with none to stop the item.';
const stopNext='libraos-engine foreman retry hof-fx (run the stage again), libraos-engine foreman route hof-fx --to STAGE, or libraos-engine foreman stop hof-fx --reason TEXT, at your own terminal';
// The rows as core's foremanInbox files them: the item's root is the handoff.
const inbox=[
 {id:'stopped:hof-fx:t1',kind:'stopped',title:'foreman item stopped: max_rounds: 3 implement attempts reached',failure:'max_rounds: 3 implement attempts reached',goal:'Driver upgrade',handoff:'hof-fx',foreman:'hof-fx',branch:'agentd/item-hof-fx',from:'s-alice',age:'1h',next_step:stopNext},
 {id:'question:apr-q',kind:'question',title:qText,approval:'apr-q',about:'foreman:hof-fq:hof-fq2',foreman:'hof-fq',handoff:'hof-fq',from:'s-alice',age:'2h',mine:true,next_step:'a person answers approval apr-q in the dash: approve with the answer as the note, or reject to stop the item'},
 {id:'spec:apr-s',kind:'spec',title:sText,approval:'apr-s',about:'foreman:hof-fs:hof-fs1',foreman:'hof-fs',handoff:'hof-fs',from:'s-alice',age:'2h',mine:true,next_step:'a person approves or rejects approval apr-s in the dash; a reject with a note has spec redo it'},
 {id:'ready:hof-fr:t2',kind:'ready',title:'foreman item ready for your merge: review passed',goal:'Rename flags',handoff:'hof-fr',foreman:'hof-fr',branch:'agentd/item-hof-fr',head:'0123456789abcdef0123',from:'s-alice',age:'3h',next_step:'Review and merge the item\'s branch agentd/item-hof-fr yourself (LibraOS Engine never merges it); a merged pull request linked to the item clears this, or libraos-engine foreman stop hof-fr --reason TEXT ends the item'},
 // As before: a worker's own question, and a spec approval that is no foreman's.
 {id:'question:hof-w:t3',kind:'question',title:'claude worker asks: Keep the aliases?',handoff:'hof-w',from:'s-work',claimer:'s-work',worker:'claude',age:'5m'},
 {id:'spec:apr-p',kind:'spec',title:'Spec ready for approval',approval:'apr-p',handoff:'hof-sp',from:'s-work',age:'1h'}];
// The dash's waiting list serves every pending approval, the foreman's too.
const waiting=[
 {what:'approval',ref:'apr-q',title:qText,from:'s-foreman',handoff:null,about:'foreman:hof-fq:hof-fq2',can_answer:true,age:'2h'},
 {what:'approval',ref:'apr-s',title:sText,from:'s-foreman',handoff:null,about:'foreman:hof-fs:hof-fs1',can_answer:true,age:'2h'},
 {what:'approval',ref:'apr-p',title:'Spec ready for approval',from:'s-work',handoff:'hof-sp',can_answer:true,age:'1h'}];
const sessions=[{id:'s-foreman',label:'foreman',tool:'agentd',status:'active',user:'',cwd:'/src/acme',seen_ago:'1m'},{id:'s-work',label:'worker',tool:'claude',status:'active',user:'alice',cwd:'/src/acme',seen_ago:'1m'},{id:'s-alice',label:'alice',tool:'claude',status:'active',user:'alice',cwd:'/src/acme',seen_ago:'1m'}];
const dash={user:'alice',role:'owner',now,dispatch:true,checkouts:['/src/acme'],handoff_list:open,done:[],sessions,left:[],waiting,claims:[],messages:[],inbox};
const errors=[],writes=[],copied=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const json=body=>({ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21620/#inbox',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{}]};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async t=>{copied.push(t)}},configurable:true});
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')return json(dash);
  if(u.pathname==='/api/inboxitem')return json({handoff:u.searchParams.get('id'),check:{cmd:''},runs:0,minutes:0});
  if(u.pathname==='/api/action'){writes.push(JSON.parse(opts.body));return json({ok:true})}
  if(u.pathname==='/api/chat')return json({chats:[],roles:[],gateway_ready:true});
  if(u.pathname==='/api/team')return json({roles:[],members:[],handoff_roles:{}});
  return json({})}}});
const w=dom.window,d=w.document,$=id=>d.getElementById(id),tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const go=async hash=>{w.location.hash=hash;await settle()};
const detail=()=>$('inbox-detail'),rows=()=>[...$('inbox-rows').querySelectorAll('.ib-row')],ids=()=>rows().map(r=>r.dataset.id),row=id=>rows().find(r=>r.dataset.id===id);
const buttons=root=>[...root.querySelectorAll('button')].map(b=>b.textContent);
const button=(root,text)=>[...root.querySelectorAll('button')].find(b=>b.textContent===text);
const tag=id=>row(id).querySelector('.ib-tag').textContent;
const sheetOpen=()=>d.querySelector('dialog');
const submitSheet=async(note)=>{const dlg=sheetOpen();assert(dlg,'no confirm sheet');if(note!==undefined)dlg.querySelector('textarea').value=note;dlg.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle()};
const kact=()=>detail().querySelector('.kact');
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // Each stop is one row, of its own kind, though a question and a spec arrive as their approval too.
 const needs=ids();
 for(const id of ['stopped:hof-fx:t1','question:apr-q','spec:apr-s','ready:hof-fr:t2'])assert(needs.includes(id),'Needs you lacks '+id+': '+needs);
 assert(!needs.includes('apr-q')&&!needs.includes('apr-s'),'a foreman stop shows twice, as its approval too: '+needs);
 assert.deepEqual(['stopped:hof-fx:t1','question:apr-q','spec:apr-s','ready:hof-fr:t2'].map(id=>row(id).dataset.kind),['foreman-stopped','foreman-question','foreman-spec','foreman-ready']);
 assert.deepEqual(['stopped:hof-fx:t1','question:apr-q','spec:apr-s','ready:hof-fr:t2'].map(tag),['Stopped','Foreman question','Foreman spec','Ready to merge']);
 assert(!$('inbox-rows').querySelector('img')&&!detail().querySelector('img'),'item text became markup');
 // A stopped item sorts with the failed, before the approvals; ready and stopped name their task and branch.
 assert(needs.indexOf('stopped:hof-fx:t1')<needs.indexOf('question:apr-q'),'stopped does not lead: '+needs);
 assert(row('stopped:hof-fx:t1').querySelector('.ib-title').textContent.includes('Driver upgrade'),'stopped row does not name its task');
 assert(row('ready:hof-fr:t2').querySelector('.ib-sub code').textContent==='agentd/item-hof-fr','ready row lacks its branch');
 // The foreman's question and spec are approvals.
 await go('#inbox/approvals');const aps=ids();
 for(const id of ['question:apr-q','spec:apr-s'])assert(aps.includes(id),'Approvals lacks '+id+': '+aps);
 assert(!aps.includes('ready:hof-fr:t2')&&!aps.includes('stopped:hof-fx:t1'));

 // 1. question: the question, Answer and Stop the item, Mark resolved.
 await go('#inbox?item='+encodeURIComponent('question:apr-q'));assert.equal(detail().dataset.id,'question:apr-q');
 assert.equal(detail().querySelector('[data-kind]').dataset.kind,'foreman-question');
 assert(detail().querySelector('.ib-msg').textContent.includes('Which schema version? '+evil),'the question is not shown as text');
 assert.deepEqual(buttons(kact()).filter(t=>!/More/.test(t)),['Answer','Stop the item','Mark resolved'],buttons(kact()).join('|'));
 assert(!button(kact(),'Approve')&&!button(kact(),'Reject'),'a foreman question has the generic Approve/Reject');
 let n=writes.length;button(kact(),'Answer').click();await settle();
 assert(sheetOpen().textContent.includes('Which schema version?'),'the answer sheet does not quote the question');
 await submitSheet('');assert.equal(writes.length,n,'an empty answer was sent');
 await submitSheet('Use v2');assert.deepEqual(writes.at(-1),{action:'approval_answer',id:'apr-q',decision:'approve',note:'Use v2'});
 button(kact(),'Stop the item').click();await settle();await submitSheet('Not needed');
 assert.deepEqual(writes.at(-1),{action:'approval_answer',id:'apr-q',decision:'reject',note:'Not needed'});
 button(kact(),'Mark resolved').click();await settle();await submitSheet();assert.deepEqual(writes.at(-1),{action:'inbox_mark',id:'question:apr-q',mark:'resolved'});

 // 2. spec: Approve, Redo with my note (a note required), Stop the item (no note).
 await go('#inbox?item='+encodeURIComponent('spec:apr-s'));assert.equal(detail().dataset.id,'spec:apr-s');
 assert(detail().querySelector('.ib-msg').textContent.includes('approve the spec from stage hof-fs1'));
 assert.deepEqual(buttons(kact()).filter(t=>!/More/.test(t)),['Approve','Redo with my note','Stop the item','Mark resolved'],buttons(kact()).join('|'));
 button(kact(),'Approve').click();await settle();await submitSheet('');
 assert.deepEqual(writes.at(-1),{action:'approval_answer',id:'apr-s',decision:'approve'});
 n=writes.length;button(kact(),'Redo with my note').click();await settle();await submitSheet('');assert.equal(writes.length,n,'a redo without a note was sent (that would stop the item)');
 await submitSheet('Cover the CSV path');assert.deepEqual(writes.at(-1),{action:'approval_answer',id:'apr-s',decision:'reject',note:'Cover the CSV path'});
 button(kact(),'Stop the item').click();await settle();assert(!sheetOpen().querySelector('textarea'),'stopping at the spec asks for a note, which would redo it');
 await submitSheet();assert.deepEqual(writes.at(-1),{action:'approval_answer',id:'apr-s',decision:'reject'});

 // 3. ready: Open work item in view, the branch, nothing to approve.
 await go('#inbox?item='+encodeURIComponent('ready:hof-fr:t2'));assert.equal(detail().dataset.id,'ready:hof-fr:t2');
 const openLink=[...kact().children].find(a=>a.tagName==='A'&&a.textContent==='Open work item');
 assert(openLink,'ready has no Open work item in view');assert.equal(openLink.getAttribute('href'),'#issues/hof-fr');
 const br=detail().querySelector('[data-foreman="branch"]');assert(br&&br.textContent.includes('agentd/item-hof-fr')&&br.textContent.includes('0123456789ab'),'ready lacks its branch');
 button(br,'Copy').click();await settle();assert.equal(copied.at(-1),'agentd/item-hof-fr');
 assert(detail().querySelector('[data-foreman="next"]').textContent.includes('never merges it'));
 assert(!button(kact(),'Approve')&&!button(kact(),'Answer'),'ready offers an answer');assert(button(kact(),'Mark resolved'),'ready lacks Mark resolved');

 // 4. stopped: the reason, each next-step command with Copy, Mark resolved.
 await go('#inbox?item='+encodeURIComponent('stopped:hof-fx:t1'));assert.equal(detail().dataset.id,'stopped:hof-fx:t1');
 assert(detail().querySelector('[data-foreman="why"]').textContent.includes('Max rounds: 3 implement attempts reached'),detail().textContent);
 const cmds=[...detail().querySelectorAll('[data-foreman="next"] code')].map(c=>c.textContent);
 assert.deepEqual(cmds,['libraos-engine foreman retry hof-fx','libraos-engine foreman route hof-fx --to STAGE','libraos-engine foreman stop hof-fx --reason TEXT']);
 button(detail().querySelector('.foreman-cmd'),'Copy').click();await settle();assert.equal(copied.at(-1),'libraos-engine foreman retry hof-fx');
 assert(!button(kact(),'Approve')&&!button(kact(),'Answer'));
 button(kact(),'Mark resolved').click();await settle();await submitSheet();assert.deepEqual(writes.at(-1),{action:'inbox_mark',id:'stopped:hof-fx:t1',mark:'resolved'});

 // As before: a worker's own question and an ordinary spec approval.
 await go('#inbox');assert.equal(row('question:hof-w:t3').dataset.kind,undefined);assert.equal(tag('question:hof-w:t3'),'question');
 assert(ids().includes('apr-p')&&!ids().includes('spec:apr-p'),'the ordinary spec is not one approval row');assert.equal(tag('apr-p'),'Spec approval');
 await go('#inbox?item=apr-p');assert(button(kact(),'Approve')&&button(kact(),'Reject')&&!button(kact(),'Stop the item'),'the ordinary spec lost its Approve/Reject');

 // A stop this person's role cannot answer (the approval says can_answer false) says so, with no Answer.
 dash.waiting=waiting.map(x=>x.ref==='apr-q'?{...x,can_answer:false,required_role:'owner'}:x);await w.eval('refresh()');await settle();
 const all=w.eval('inboxSets(lastDash).needs.map(x=>x.id)');assert(!all.includes('question:apr-q'),'a stop this person cannot answer is in Needs you');
 const qx=w.eval("inboxSets(lastDash).mine.concat(needItems(lastDash).all).find(x=>x.id==='question:apr-q')");assert.equal(qx&&qx.can_answer,false,'the approval\'s can_answer is not on the row');
 dash.waiting=waiting;await w.eval('refresh()');await settle();

 // The card row on the board (needRow): its own kind word and, for stopped, the commands under Details.
 const card=w.eval("needRow(lastDash.inbox.find(x=>x.kind==='stopped'),null,true)");
 assert(card.querySelector('.k').textContent.startsWith('stopped:'),card.textContent);assert(card.textContent.includes('Max rounds'));
 assert.equal(card.querySelectorAll('.foreman-cmd code').length,3,'the card lacks the stopped item\'s commands');

 // The app does not answer approvals: a foreman question says to answer in the dash, with no command to relay.
 w.eval("lastDash.mode='app'");
 const ap=w.eval("apNeedRow(needItems(lastDash).all.find(x=>x.id==='question:apr-q'),false,'data-open-task')");
 assert.equal(ap.dataset.kind,'foreman-question');assert(ap.textContent.startsWith('Foreman question'));
 assert(/Answer it in the dash/.test(ap.textContent)&&!ap.querySelector('code'),'the app row sends the person to a terminal: '+ap.textContent);
 assert(![...ap.querySelectorAll('button')].some(b=>/Answer|Approve|Stop the item/.test(b.textContent)),'the app offers an answer it cannot send');
 const aps2=w.eval("apNeedRow(needItems(lastDash).all.find(x=>x.id==='stopped:hof-fx:t1'),false,'data-open-task')");
 assert.equal(aps2.dataset.kind,'foreman-stopped');assert(aps2.textContent.includes('Max rounds'));
 const apr=w.eval("apNeedRow(needItems(lastDash).all.find(x=>x.id==='ready:hof-fr:t2'),false,'data-open-task')");
 assert(apr.textContent.startsWith('Ready to merge')&&apr.textContent.includes('agentd/item-hof-fr'),apr.textContent);
 w.eval("lastDash.mode=undefined");
 assert(!errors.length,errors.join('\n'));
 console.log('dash_foreman_inbox: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);console.error('DOM errors:',errors);process.exit(1)});
