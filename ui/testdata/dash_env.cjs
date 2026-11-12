// #459: where a task's worker runs (tool, model, sandbox, network, directory,
// branch), on the task page and in its work item drawer, as the server's env
// says; a task never dispatched shows none of it. Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_env.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const task=(id,goal,o)=>({id,title:goal,goal,state:'claimed',claimer:'w-'+id,from:'s-alice',from_user:'alice',worker:'codex',to:'any',project:'acme/repo',stage:'implement',source:'interactive',updated_ago:'1m',dispatched:now,attempts:[{tool:'codex',running:true,minutes:2}],...o});
// env is what GET /api/issue and /api/workitem send (dash_env.go).
const envs={
 'hof-cx':{tool:'codex',model:'gpt-test',sandbox:'workspace-write',network:'off',dir:'/w/repo'+evil,branch:'agentd/hof-cx',running:true},
 'hof-cl':{tool:'claude',model:'claude-test',sandbox:'none',network:'on',dir:'/w/other',branch:'feat/env',running:false},
 'hof-old':{tool:'codex',dir:'/w/old',running:false}};
const tasks={'hof-cx':task('hof-cx','Codex task'),'hof-cl':task('hof-cl','Claude task',{worker:'claude',attempts:[{tool:'claude',running:false,end_reason:'done',minutes:3}]}),
 'hof-old':task('hof-old','Dispatched before it was recorded'),'hof-never':task('hof-never','Never dispatched',{state:'offered',claimer:null,dispatched:null,attempts:[]})};
const want={
 'hof-cx':{tool:'Codex · gpt-test',sandbox:'Sandbox: yes, workspace-write',network:'Network off',dir:'/w/repo'+evil,branch:'agentd/hof-cx'},
 'hof-cl':{tool:'Claude · claude-test',sandbox:'No OS sandbox',network:'Network on',dir:'/w/other',branch:'feat/env'},
 'hof-old':{tool:'Codex · model not known yet',sandbox:'Sandbox not recorded',network:'Network not recorded',dir:'/w/old'}};
const dash={user:'alice',role:'owner',now,handoff_list:Object.values(tasks),done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{}};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#issues',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async(url)=>{const u=new URL(url,w.location.href),id=u.searchParams.get('ref')||u.searchParams.get('id');let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/issues')body={issues:[]};
  else if(u.pathname==='/api/issue'&&tasks[id]){const t=tasks[id];body={kind:'handoff',ref:id,title:t.title,body:{goal:t.goal},tree:[{...t,focus:true,env:envs[id]}],prs:[]}}
  else if(u.pathname==='/api/workitem'&&tasks[id]){const t=tasks[id];body={kind:'handoff',ref:id,tree:[{...t,focus:true}],prs:[],issues:[],env:envs[id]}}
  else if(u.pathname==='/api/review')body={handoff:id,branch:null};
  else if(u.pathname==='/api/result')body={files:[]};
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()},route=async h=>{w.location.hash=h;await settle()};
// read: each part of the env line drawn in node, by its data-env-k.
const read=(node,what)=>{const lines=node.querySelectorAll('[data-env]');assert.equal(lines.length,1,what+': want one env line, got '+lines.length);
 const out={};for(const p of lines[0].querySelectorAll('[data-env-k]'))out[p.dataset.envK]=p.textContent;return out};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // The task page: each task's header row.
 for(const [id,parts] of Object.entries(want)){await route('#issues/'+id);const ev=doc.querySelector('#issue-detail article.iev[data-ref="'+id+'"]');assert(ev,'no task page row for '+id);
  assert.deepEqual(read(ev,'task page '+id),parts,'task page '+id)}
 await route('#issues/hof-never');const bare=doc.querySelector('#issue-detail article.iev[data-ref="hof-never"]');assert(bare,'no task page row for hof-never');
 assert(!bare.querySelector('[data-env]'),'a task never dispatched shows where it runs');assert(!/sandbox|network/i.test(bare.textContent),'a task never dispatched names a sandbox or network');
 // The work item drawer: one Runs in property.
 for(const [id,parts] of Object.entries(want)){w.showWorkItem(id);await settle();const box=doc.getElementById('hist');
  const k=[...box.querySelectorAll('.props .k')].find(n=>n.textContent==='Runs in');assert(k,'drawer of '+id+' has no Runs in');
  assert.deepEqual(read(k.nextElementSibling,'drawer '+id),parts,'drawer '+id)}
 w.showWorkItem('hof-never');await settle();
 assert(![...doc.getElementById('hist').querySelectorAll('.props .k')].some(n=>n.textContent==='Runs in'),'drawer of a task never dispatched has Runs in');
 // Text, never markup; the line wraps on a phone.
 assert(!doc.querySelector('[data-env] img'),'a directory became markup');
 const css=[...doc.querySelectorAll('style')].map(n=>n.textContent).join('\n');assert(/\.wenv\{[^}]*flex-wrap:wrap/.test(css)&&/\.wenv code\{overflow-wrap:anywhere\}/.test(css),'the env line does not wrap');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_env: ok',process.env.DASH_UI_PHONE==='1'?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
