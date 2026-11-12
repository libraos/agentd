// Typed filters on the board (#456): agent:codex status:review in the box shows
// the same cards as choosing Codex and In review in the dropdowns; the filter is
// q= in the address, so a reload brings it back; an unknown key or value is
// named under the box, not ignored silently; pr:, project:, person: and free
// words narrow the board. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_filter.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const base={from:'s-alice',from_user:'alice',to:'any',project:'acme/repo',updated_ago:'1m',age:'1m'};
const open=[
 {...base,id:'hof-cr',goal:'Codex review of the parser',state:'claimed',stage:'review',claimer:'s-w1',claimer_user:'bob',worker:'codex',dispatched:true,prs:['acme/repo#9']},
 {...base,id:'hof-cr3',goal:'Codex review elsewhere',state:'claimed',stage:'review',claimer:'s-w3',worker:'codex',dispatched:true,project:'other/thing'},
 {...base,id:'hof-clr',goal:'Claude review',state:'claimed',stage:'review',claimer:'s-w2',worker:'claude',dispatched:true},
 {...base,id:'hof-cp',goal:'Codex implements the lexer',state:'claimed',stage:'implement',claimer:'s-w4',worker:'codex',dispatched:true},
 {...base,id:'hof-todo',goal:'Not started yet '+evil,state:'offered',from_user:'carol',project:'other/thing'}];
const done=[
 {...base,what:'handoff',ref:'hof-cd',title:'Codex finished the docs',state:'done',worker:'codex',prs:['acme/repo#7']},
 {what:'PR',ref:'acme/repo#7',title:'Docs PR',state:'MERGED',age:'2h'}];
const dash={user:'alice',role:'owner',now,handoff_list:open,done,sessions:[],waiting:[{what:'PR',ref:'acme/repo#9',title:'Parser PR',age:'1m'}],claims:[],messages:[],inbox:[]};
const errors=[];
async function page(hash){
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
 const json=body=>({ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)});
 const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/'+hash,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
  w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
  w.fetch=async(url)=>{const u=new URL(url,w.location.href);
   if(u.pathname==='/api/auth')return {ok:true,status:204};
   if(u.pathname==='/api/dash')return json(dash);
   if(u.pathname==='/api/issues')return json({issues:[]});
   if(u.pathname==='/api/team')return json({roles:[],members:[],handoff_roles:{}});
   return json({})}}});
 const w=dom.window;for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,25));return w}
const settle=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setTimeout(r,25))};
// refs: the cards the board shows, sorted.
const refs=w=>[...w.document.querySelectorAll('#board .kcard')].map(c=>c.dataset.ref).sort();
const type=async(w,text)=>{const box=w.document.getElementById('board-filter');box.value=text;box.dispatchEvent(new w.Event('input',{bubbles:true}));box.dispatchEvent(new w.Event('change',{bubbles:true}));await settle()};
const pick=async(w,k,v)=>{const s=w.document.querySelector('select[data-bf="'+k+'"]');assert(s,'no '+k+' dropdown');assert([...s.options].some(o=>o.value===v),k+' dropdown lacks '+v);s.value=v;s.dispatchEvent(new w.Event('change',{bubbles:true}));await settle()};
const q=w=>new URLSearchParams(w.location.hash.split('?')[1]||'').get('q');
(async()=>{
 for(const layout of ['board','list']){
  const w=await page('#issues?view=all&layout='+layout),doc=w.document;assert(!errors.length,errors.join('\n'));
  const box=doc.getElementById('board-filter');assert(box,'no filter box on the board');assert.notEqual(w.getComputedStyle(box).display,'none','the filter box is hidden');
  const all=refs(w);assert(all.length>=7,layout+': want every card unfiltered, got '+all);
  // Typed.
  await type(w,'agent:codex status:review');const typed=refs(w);
  assert.deepEqual(typed,['hof-cr','hof-cr3'],layout+': agent:codex status:review shows '+typed);
  assert.equal(q(w),'agent:codex status:review','the filter is not in the address: '+w.location.hash);
  assert.equal(doc.querySelector('select[data-bf="agent"]').value,'codex','the Agent dropdown does not follow the box');
  assert.equal(doc.querySelector('select[data-bf="status"]').value,'review','the Status dropdown does not follow the box');
  // The dropdowns, from nothing.
  await type(w,'');assert.deepEqual(refs(w),all,'clearing the box does not show every card');assert.equal(q(w),null);
  await pick(w,'agent','codex');await pick(w,'status','review');
  assert.deepEqual(refs(w),typed,layout+': the dropdowns show '+refs(w)+', the box '+typed);
  assert.equal(box.value,'agent:codex status:review','the dropdowns do not write the box');
  assert.equal(q(w),'agent:codex status:review','the dropdowns do not write the address');
  // Other keys and free words.
  for(const [text,want] of [['pr:merged',['acme/repo#7','hof-cd']],['pr:open',['acme/repo#9','hof-cr']],['pr:none status:todo',['hof-todo']],['project:thing',['hof-cr3','hof-todo']],['project:other/thing agent:codex',['hof-cr3']],['person:carol',['hof-todo']],['person:bob',['hof-cr']],['lexer',['hof-cp']],['Codex REVIEW',['hof-cr','hof-cr3']],['agent:claude',['hof-clr']]]){
   await type(w,text);assert.deepEqual(refs(w),want,layout+': '+text+' shows '+refs(w))}
  // Not understood: named under the box, the rest still applies.
  await type(w,'colour:red agent:codex status:review pr:maybe');const bad=doc.getElementById('board-filter-bad');
  assert(!bad.hidden&&w.getComputedStyle(bad).display!=='none','an unknown key is not shown');
  assert(bad.textContent.includes('colour:red')&&bad.textContent.includes('pr:maybe'),'the note does not name what it did not understand: '+bad.textContent);
  assert(/Not understood/.test(bad.textContent));assert.equal(box.getAttribute('aria-invalid'),'true');
  assert.deepEqual(refs(w),typed,'an unknown key changed what the known ones show');
  await type(w,'agent:codex');assert(bad.hidden,'the note stays after the filter is fixed');assert.equal(box.getAttribute('aria-invalid'),'false');
  // Clear filters clears the box too.
  doc.getElementById('issue-clear').click();await settle();assert.equal(box.value,'');assert.equal(q(w),null);
  assert(!doc.querySelector('#board img'),'a title became markup');
  w.close()}
 // A reload of the address restores the filter, the dropdowns and the note.
 const w=await page('#issues?view=all&layout=board&q='+encodeURIComponent('agent:codex status:review frobnicate:x')),doc=w.document;
 assert.equal(doc.getElementById('board-filter').value,'agent:codex status:review frobnicate:x','a reload loses the box');
 assert.deepEqual(refs(w),['hof-cr','hof-cr3'],'a reload loses the filter: '+refs(w));
 assert.equal(doc.querySelector('select[data-bf="status"]').value,'review');
 assert(doc.getElementById('board-filter-bad').textContent.includes('frobnicate:x'),'a reload drops the not-understood note');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_filter: ok',process.env.DASH_UI_PHONE==='1'?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
