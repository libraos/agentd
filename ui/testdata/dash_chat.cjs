// Exercise the embedded Chat functions with no external DOM dependency.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const page=fs.readFileSync(process.argv[2],'utf8');
class N {
  getBoundingClientRect(){return {left:0,right:1000,width:1000,top:0,bottom:700,height:700}}
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attrs={};this.listeners={};this.dataset={};this.style={setProperty(){},removeProperty(){}};this.value='';this.hidden=false;this.open=false;this.className='';this.classList={toggle(){},add(){},remove(){}};}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='hidden')this.hidden=true;if(k==='open')this.open=true;if(k.startsWith('data-'))this.dataset[k.slice(5)]=v;}
 getAttribute(k){return this.attrs[k]}
 addEventListener(k,f){(this.listeners[k]??=[]).push(f)}
 append(...ns){this.children.push(...ns.flat(Infinity))} replaceChildren(...ns){this.children=[];this.append(...ns)}
 get textContent(){return this.children.map(n=>n instanceof N?n.textContent:String(n)).join('')} set textContent(v){this.children=[String(v)]}
 focus(){ctx.document.activeElement=this} select(){} remove(){} setSelectionRange(){}
 querySelector(q){return this.all().find(n=>q.startsWith('.')?n.className.split(' ').includes(q.slice(1)):n.tagName===q)||null}
 all(){return this.children.flatMap(n=>n instanceof N?[n,...n.all()]:[])}
 click(){for(const f of this.listeners.click||[])f({currentTarget:this,target:this})}
}
const ids={},copied=[],ctx={console,Node:N,Map,URL,Blob,Date,encodeURIComponent,decodeURIComponent,CSS:{escape:x=>x},document:{activeElement:null,body:new N('body'),hidden:false,createElement:t=>new N(t),createElementNS:(_,t)=>new N(t),createTextNode:t=>String(t),getElementById:id=>ids[id]??=new N(),querySelector:()=>null,addEventListener(){}},navigator:{clipboard:{writeText:async t=>copied.push(t)}},setInterval(){},setTimeout(){},clearTimeout(){},addEventListener(){},TOKEN:'test',COOKIE:false,ROLE:'owner',CONNECTED:true,PHONE:{matches:false},ROUTE:{item:'chat'},CAN:()=>true,auth:()=>({}),writeReason:()=>'',toast(){},dashPage(){},history:{pushState(){}},location:{hash:'#chat'},parseRoute:()=>({item:'chat'}),fetch(){throw Error('unexpected transport')},$:id=>ids[id]??=new N()};
vm.createContext(ctx);const run=s=>vm.runInContext(s,ctx);
// These declarations are single-line helpers; Chat is a separately delimited region.
run(page.split('\n').find(l=>l.startsWith('function el(')));
run(page.split('\n').find(l=>l.startsWith('function modelName(')));
// The text helpers Chat's cards and list use: plain titles, and role and tool names.
run(page.split("// plainText is a task's own words")[1].split('// Only known identifiers')[0].replace(/^[^\n]*\n/,''));
for(const f of ['capFirst','roleName','toolName'])run(page.split('\n').find(l=>l.startsWith('function '+f+'(')));
run(page.split('// region:chat\n')[1].split('// end:chat')[0]);
for(const id of ['anthropic/claude-opus-5-5','claude-opus-5-5'])assert.equal(ctx.modelName(id),'Claude Opus 5.5');
for(const id of ['vendor/model-a','anthropic/claude-opus-5-5-beta','anthropic/claude-opus-55','Anthropic/Claude-Opus-5-5','anthropic/claude-opus-5.*','toString'])assert.equal(ctx.modelName(id),id);
assert.equal(ctx.modelName(null),'');
const documentText='# Architecture\n\n## Services\n\n- The dashboard reads the shared ledger and lists running workers.\n- The gateway routes requests to the configured model.\n\n## Workflow\n\nReview the work before publishing it.';
assert(ctx.chatIsArtifact(documentText));assert(ctx.chatIsArtifact('**Architecture**\n\n```\n'+('  ┌─── ledger ───┐\n').repeat(10)+'```'));
for(const text of ['A long explanation. '.repeat(100),'I cannot call the gateway.\n\n'+documentText,'# Sorry\n\nI cannot call the gateway.\n\n'+documentText,'# Gateway explanation\n\n## Reason\n\n'+('This is an ordinary explanation. '.repeat(100))+'\n\n## More detail\n\nThis still explains the limitation.','我这里出不了图片文件，下面是 Mermaid 代码。\n\n```mermaid\nflowchart TB\n```'])assert(!ctx.chatIsArtifact(text),'offered non-document: '+text.slice(0,40));
const raw='Source session/a6482cf8-95-chunk-16 and **session/a6482cf8-95-chunk-16**, then `issue/acme/repo#120`.\n\n> Again session/a6482cf8-95-chunk-16.\n\n```mermaid\nflowchart TB\n A["<script>session/raw-chunk-1</script>"] --> B\n```\n\nhttps://example.test/session/keep-url';
const rendered=new N();rendered.append(ctx.chatMarkdown(raw));
const refs=rendered.all().filter(n=>n.className==='chat-ref');assert.deepEqual(refs.map(n=>n.textContent),['[1]','[1]','[2]','[1]']);assert.equal(refs[0].attrs.title,'session/a6482cf8-95-chunk-16');refs[0].click();assert.equal(refs[0].attrs['aria-expanded'],'true');assert(!rendered.querySelector('.chat-ref-id').hidden);refs[0].click();assert(rendered.querySelector('.chat-ref-id').hidden);
const code=rendered.querySelector('.chat-code'),pre=code.querySelector('pre');assert(!pre.querySelector('button'));assert(code.querySelector('.chat-code-head').textContent.includes('Mermaid · source'));code.querySelector('button').click();assert.equal(copied.at(-1),'flowchart TB\n A["<script>session/raw-chunk-1</script>"] --> B');assert(!rendered.querySelector('script'));assert.equal(rendered.querySelector('a').attrs.href,'https://example.test/session/keep-url');
let view;ctx.chatSetView=v=>view=v;
const turn=ctx.chatTurnNode({kind:'reply',parts:[documentText],steps:[],model:'anthropic/claude-opus-5-5',in:30,out:20});assert(!turn.querySelector('.chat-card'));turn.querySelector('.chat-canvas-action').click();assert.equal(view.text,documentText);assert.equal(view.title,'Architecture');assert(turn.textContent.includes('claude-opus-5-5'));
run("CHAT.id='chat-fixture';CHAT.chat={id:CHAT.id,title:'A title',role:'writer',archived:true};CHAT.roles=[{name:'writer',description:'Writes documents',model:'anthropic/claude-opus-5-5'}];CHAT.loaded=true;chatRenderHead();chatRenderSide()");
const head=ids['chat-head'],details=head.querySelector('.chat-head-details');assert(!details.open);assert(head.textContent.includes('A title')&&!details.textContent.includes('A title'),'title sits beside the menu');assert(details.textContent.includes('anthropic/claude-opus-5-5'));assert(details.textContent.includes('Archived'));head.querySelector('.chat-id').querySelector('button').click();assert.equal(copied.at(-1),'chat-fixture');details.open=true;ctx.chatRenderHead();assert(head.querySelector('.chat-head-details').open,'refresh collapsed metadata');run("CHAT.chat.id='chat-other';chatRenderHead()");assert(!head.querySelector('.chat-head-details').open);
assert(ids['chat-roles'].textContent.includes('Writes documents'));assert(ids['chat-roles'].textContent.includes('Claude Opus 5.5'));
run("CHAT.locked=true;chatRenderSide()");assert(!ids['chat-roles'].textContent.includes('Writes documents'));assert(ids['chat-roles'].textContent.includes('login'));
console.log('Chat: exact model names, document detection, safe citations, code toolbar, Mermaid source, canvas action and header passed');
// The conversation's role: in the header and the list, as text; a role that cannot start a worker points to one that can.
const hint=ids['chat-role-hint'],button=n=>n.all().find(x=>x.tagName==='button');
assert.equal(head.querySelector('.chat-head-role').textContent,'Writer','the role is a capitalised name');assert.equal(head.querySelector('.chat-head-role').attrs.title,'Writes documents');assert(hint.hidden,'an archived conversation shows the worker hint');
run("CHAT.locked=false;CHAT.roles=[{name:'writer',description:'Writes <b>drafts</b>',tools:['kb_search']},{name:'helper',tools:['kb_search','handoff_offer']},{name:'assistant',description:'Files work',tools:['kb_search','ledger_progress','handoff_offer','handoff_dispatch']}];CHAT.id='chat-w';CHAT.chat={id:'chat-w',title:'Docs',role:'writer',updated:new Date().toISOString()};CHAT.chats=[CHAT.chat];CHAT.msgs=[{role:'user',seq:1,content:'Ask your copilots and save out/a.md'},{role:'assistant',seq:2,content:'I cannot.'}];chatRenderThread();chatRenderSide()");
const roleChip=ids['chat-head'].querySelector('.chat-head-role');assert.equal(roleChip.textContent,'Writer');assert.equal(roleChip.attrs.title,'Writes <b>drafts</b>');assert(roleChip.children.every(x=>typeof x==='string'),'role text became markup');
const rowInfo=ids['chat-list'].querySelector('.chat-row-info');assert(rowInfo.textContent.startsWith('Writer · '));assert.equal(rowInfo.attrs.title,'Writes <b>drafts</b>');
assert(!hint.hidden);assert(hint.textContent.includes('Writer can answer and search your work, but cannot change files. To start a worker that makes changes, use Assistant'),hint.textContent);assert.equal(button(hint).textContent,'Open in Assistant','prefers assistant over the first role that can file');
ids['chat-input'].value='';button(hint).click();assert.equal(run('CHAT.draft'),'assistant');assert.equal(run('CHAT.chat.role'),'assistant');assert.equal(ids['chat-input'].value,'Ask your copilots and save out/a.md','last message not prefilled');assert.equal(run('CHAT.live'),null);assert(hint.hidden,'assistant shows the worker hint');
run("CHAT.draft=null;CHAT.id='chat-w';CHAT.chat={id:'chat-w',title:'Docs',role:'writer'};CHAT.msgs=[{role:'user',seq:1,content:'Older ask'}];chatRenderThread()");ids['chat-input'].value='  My draft ';button(hint).click();assert.equal(ids['chat-input'].value,'My draft','draft not carried over');
run("CHAT.roles=[{name:'writer',tools:['kb_search']},{name:'quiet',tools:[]}];CHAT.draft=null;CHAT.id='chat-q';CHAT.chat={id:'chat-q',title:'Q',role:'quiet'};chatRenderThread()");assert(hint.textContent.includes('Quiet can answer from this conversation, but cannot search your work or change files. No role here can start a worker'),hint.textContent);assert(!button(hint),'button with no role to open in');
run("CHAT.roles=[{name:'writer',tools:['kb_search']},{name:'assistant',tools:['handoff_offer']}];CHAT.chat={id:'chat-q',title:'Q',role:'writer'};chatRenderThread()");assert(button(hint));ctx.CAN=()=>false;run('chatRenderThread()');assert(!hint.hidden&&!button(hint),'a read-only person gets Open in');ctx.CAN=()=>true;
run("CHAT.chat={id:'chat-q',title:'Q',role:'gone'};chatRenderThread()");assert(hint.hidden,'unknown role shows the hint');
console.log('Chat role: header and list show the role as text, the worker hint and Open in assistant passed');
// Regression: prose drafts qualify without list-heavy formatting.
const prose='# Launch announcement\n\nWe are opening the new service to the first group of customers this week. The initial release includes the dashboard, account settings and saved reports.\n\nThe team will review feedback every Friday and publish an update after each release. Please send your observations through the support channel.';
assert(ctx.chatIsArtifact(prose));assert(ctx.chatIsArtifact('# Design document\n\n'+prose.split('\n\n').slice(1).join('\n\n')+'\n\n## Risks\n\n'+'A dependency may delay the launch. '.repeat(15)+'\n\n| Risk | Owner |\n| --- | --- |\n| Delay | Team |'));
for(const text of ['# Why the request failed\n\n'+prose,'# Draft\n\nSorry, I cannot produce that document.\n\n'+prose,'# An explanation\n\n'+prose])assert(!ctx.chatIsArtifact(text));
for(const source of ['[session/a6482cf8-95-chunk-16]','[ session/a6482cf8-95-chunk-16 ]','[`session/a6482cf8-95-chunk-16`]']){const n=new N();n.append(ctx.chatInline(source));assert.equal(n.textContent,'[1]session/a6482cf8-95-chunk-16');assert.equal(n.all().filter(x=>x.className==='chat-ref').length,1)}
for(const [ending,label] of [['stopped','Stopped'],['incomplete','Cut off, this reply is incomplete'],['complete',''],[null,'']]){const turns=ctx.chatTurns([{role:'assistant',content:'Kept text',ending}]),n=ctx.chatTurnNode(turns[0]);assert.equal(n.querySelector('.chat-ending')?.textContent||'',label);assert(n.textContent.includes('Kept text'))}
assert.equal(ctx.chatTurns([{role:'assistant',content:'Tool preamble',ending:'incomplete'},{role:'assistant',content:'Final answer',ending:'complete'}])[0].ending,'complete');
run("CHAT.locked=false;CHAT.gatewayReady=false;CHAT.loaded=true;chatRenderThread()");assert(!ids['chat-msgs'].textContent.includes('Start a conversation'));assert(!ids['chat-msgs'].querySelector('.chat-card'));assert.equal(ids['chat-input'].placeholder,'Chat is not set up');
run("CHAT.id='chat-recovery';CHAT.live=null;CHAT.busy=false;CHAT.unsent={id:CHAT.id,text:'Lost send',seq:3};CHAT.msgs=[{role:'user',seq:4,content:'Someone else sent this'}]");ids['chat-input'].value='New typing';ctx.chatUnsentBack();assert.equal(ids['chat-input'].value,'Lost send\n\nNew typing');assert.equal(run('CHAT.unsent'),null);
run("CHAT.unsent={id:CHAT.id,text:'Accepted send',seq:3};CHAT.msgs=[{role:'user',seq:4,content:'Accepted send'}]");ids['chat-input'].value='New typing';ctx.chatUnsentBack();assert.equal(ids['chat-input'].value,'New typing');
console.log('Chat regression: prose documents, bracketed citations, persisted endings, setup state and pending text recovery passed');
