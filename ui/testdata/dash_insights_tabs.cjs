// Insights' Success, Cost and Usage (libraos/core#907 step 3): three tabs read from one
// GET /api/insights answer, with one period and scope control shared by the three (moved to the
// top of the one shown), a coverage line (the period's handoffs, priced and with-token attempts),
// tables by user, model and project that say how many handoffs name their key, a figure the
// server could not compute shown as not measured (never 0), dollars with an unpriced attempt
// as a lower bound (≥), a failed read said with Retry, and nothing written.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_insights_tabs.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),phone=process.env.DASH_UI_PHONE==='1',evil='<img src=x onerror=alert(1)>';
const cov=(a,p,t,extra)=>({attempts:a,priced:p,with_tokens:t,priced_pct:a?100*p/a:0,with_tokens_pct:a?100*t/a:0,...extra});
const group=(key,name,o)=>({[key]:name,handoffs:o.h,dispatched:o.d,success:{autonomous_completion:{n:o.ac,of:o.d,pct:o.d?100*o.ac/o.d:0},delivered:{n:o.dl,of:o.h,pct:100*o.dl/o.h},false_accept:o.fa||{not_computable:'no accepted handoff'},unverified:o.u},
 cost:{usd:o.usd,lower_bound:!!o.lb,unpriced_attempts:o.lb?1:0,running_attempts:0,cost_per_accepted:o.cpa},usage:{attempts:o.a,input_tokens:o.in,output_tokens:o.out,cache_read_tokens:o.cr,cache_write_tokens:0,worker_minutes:o.min},
 coverage:cov(o.a,o.lb?o.a-1:o.a,o.a,{handoffs_in_period:5,key_known_in_period:o.known})});
// Metric 7 in a period under 14 days old: none known yet by design, so what is found so far
// and when the first clean one is confirmed, never "not measured".
const soFarMsg='0 found wrong so far of 3 accepted; clean ones are confirmed 14 days after done (first on 2026-11-30)';
const soFar={not_computable:soFarMsg,message:soFarMsg,found_so_far:0,accepted:3,accepted_unknown:3,first_settle:'2026-11-30'};
const soFarNoDetect={not_computable:'x',message:'0 found wrong so far of 4 accepted; clean ones are confirmed 14 days after done, and none can be yet (a linked PR still open); outcome detection has not run: agentd pr sync-gh / agentd handoff outcome detect',found_so_far:0,accepted:4,accepted_unknown:4,detection_ran:false};
let fail=0,answers=0;
function insights(q){answers++;const since=q.get('since'),scope=q.get('scope')||'all';
 return {since:since==='7d'?'2026-11-11T00:00:00Z':'2026-10-21T00:00:00Z',until:'2026-11-18T00:00:00Z',scope,handoffs:5,
  rules:{success:'Fixture success rule.',cost:'Fixture cost rule',usage:'Fixture usage rule',coverage:'Fixture coverage rule'},
  total:{handoffs:5,dispatched:4,success:{autonomous_completion:{n:3,of:4,pct:75},delivered:{n:4,of:5,pct:80},false_accept:soFar,retired_with_reason:{n:1,of:1,pct:100},unverified:1},
   cost:{usd:12.5,lower_bound:true,unpriced_attempts:1,running_attempts:0,cost_per_accepted:{median_usd:2.25,p90_usd:4,priced:3,unpriced:0},fully_loaded:{per_accepted_usd:4.17,total_usd:12.5,lower_bound:true}},
   usage:{attempts:6,input_tokens:2500000,output_tokens:42000,cache_read_tokens:1800000,cache_write_tokens:9000,worker_minutes:95,tasks_per_day:[{day:'2026-11-16',handoffs:3},{day:'2026-11-17',handoffs:2}]},
   coverage:cov(6,5,6)},
  by_person:[group('person','alice',{h:3,d:3,ac:2,dl:3,u:0,usd:10,lb:true,cpa:{median_usd:2,priced:2},a:4,in:2e6,out:30000,cr:1.5e6,min:70,known:4}),group('person',evil,{h:1,d:1,ac:1,dl:1,u:1,usd:2.5,cpa:{not_computable:'no accepted handoff priced'},a:2,in:5e5,out:12000,cr:3e5,min:25,known:4})],
  by_model:[group('model','model-x',{fa:soFarNoDetect,h:4,d:4,ac:3,dl:4,u:1,usd:12.5,lb:true,cpa:{median_usd:2.25,priced:3},a:6,in:2.5e6,out:42000,cr:1.8e6,min:95,known:4})],
  by_project:[]}}
const requests=[];
const dash={user:'alice',role:'owner',now,team:true,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{}};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21620/#insights',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);requests.push((opts.method||'GET')+' '+u.pathname+u.search);let body={},status=200;
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/insights'){if(fail){status=fail;body={error:fail===400?'bad period':'boom'}}else body=insights(u.searchParams)}
  else if(u.pathname==='/api/issues')body={issues:[]};
  return {ok:status<300,status,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()},route=async h=>{w.location.hash=h;await settle()};
const reads=()=>requests.filter(r=>r.startsWith('GET /api/insights?')).map(r=>new URL('http://x'+r.slice(4)).searchParams);
const shown=()=>['success','cost','usage'].map(v=>doc.getElementById('page-'+v)).find(p=>!p.hidden)||doc;
const card=k=>{const c=shown().querySelector('[data-ix-card="'+k+'"]');return c&&[c.querySelector('b').textContent,c.querySelector('.ins-note').textContent]};
const rows=key=>[...shown().querySelectorAll('[data-ix-group="'+key+'"] tbody tr')].map(r=>[...r.children].map(td=>td.textContent));
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // Bare #insights opens Success, read once for 28 days and all work.
 assert(!doc.getElementById('page-success').hidden,'#insights does not open Success');assert.equal(doc.querySelector('#ins-tabs a[aria-current="page"]').dataset.tab,'success');
 assert.equal(reads().length,1,'read more than once');assert.equal(reads()[0].get('since'),'28d');assert(!reads()[0].has('scope'),'all work sent a scope');
 assert.deepEqual([...doc.querySelectorAll('#ins-tabs > a')].map(a=>a.textContent),['Success','Cost','Usage','Metrics','History','Worker usage']);
 // One control row: period and Whose work, above the tab's numbers, and the coverage line.
 const bar=doc.getElementById('ix-bar');assert(doc.getElementById('page-success').contains(bar));assert(bar.contains(doc.getElementById('ins-scope')),'Whose work is not beside the period');
 const coverage=doc.getElementById('ix-coverage').textContent;
 assert(/Covers 5 handoffs created 2026-10-21 to 2026-11-18 \(all work\)/.test(coverage),coverage);assert(/6 worker attempts: 5 priced \(83\.3%\), 6 with tokens \(100%\)/.test(coverage),coverage);
 // Success: rates as n of of, a figure not computed says not measured with its reason, never 0.
 assert.deepEqual(card('autonomous'),['75%','3 of 4 · accepted with no intervention']);assert.deepEqual(card('delivered'),['80%','4 of 5 · accepted, merged or confirmed']);
 assert.deepEqual(card('false_accept'),['0 so far','of 3 accepted · clean ones confirmed from 2026-11-30'],'a recent period reads not measured');
 assert.equal(shown().querySelector('[data-ix-card="false_accept"]').title,soFarMsg);assert(!/not measured|detection has not run/.test(shown().querySelector('[data-ix-card="false_accept"]').textContent));
 assert.deepEqual(card('unverified'),['1','done with no check']);assert(!doc.querySelector('[data-ix-card="first_pass"]'),'a figure the server did not send is shown');
 assert(/Fixture success rule/.test(doc.querySelector('[data-ix-rule="success"]').textContent),'the rule is not said');assert(!/\.\./.test(doc.querySelector('[data-ix-rule="success"]').textContent),'a rule ends with two full stops');
 const people=rows('person');assert.deepEqual(people.map(r=>r[0]),['alice',evil]);assert.equal(people[0][3],'66.7% (2 of 3)');assert.equal(people[0][5],'not measured');
 // the metrics page's cells read the same: so far, not "not computable"
 const fc=w.eval('factoryCell('+JSON.stringify(soFar)+',m=>m.n+"/"+m.of)');assert.equal(fc.textContent,'0 so far');assert(/2026-11-30/.test(fc.title),fc.title);
 assert.equal(w.eval('factoryFrac('+JSON.stringify(soFar)+',"n")'),'0 so far');assert.equal(w.eval('factoryFrac({n:1,of:2},"n")'),'1/2');
 const mx=rows('model')[0];assert.equal(mx[5],'0 so far');const mxTitle=shown().querySelector('[data-ix-group="model"] tbody tr td:nth-child(6) span').title;
 assert(/outcome detection has not run/.test(mxTitle),'the hint is not kept where detection never ran: '+mxTitle);
 assert(!doc.querySelector('#page-success img'),'a name became markup');
 assert.equal(doc.querySelector('[data-ix-known="person"]').textContent,'4 of 5 handoffs name a user','the group does not say its coverage');
 assert(/No handoff in this period/.test(doc.querySelector('[data-ix-group="project"]').textContent),'an empty group is not said');
 // Cost: a lower bound with an unpriced attempt, per accepted with p90, fully loaded.
 await route('#insights/cost');assert(!doc.getElementById('page-cost').hidden);assert(doc.getElementById('page-cost').contains(bar),'the control row did not follow to Cost');
 assert.equal(reads().length,1,'changing tab read again');
 assert.deepEqual(card('spend'),['≥ $12.50','1 unpriced attempt: a lower bound']);assert.deepEqual(card('per_accepted'),['$2.25','median · p90 $4.00']);assert.equal(card('fully_loaded')[0],'≥ $4.17');
 const pc=rows('person');assert.equal(pc[0][2],'≥ $10.00');assert.equal(pc[1][3],'not measured');assert.equal(pc[0][5],'75% (3 of 4)');
 // Usage: tokens, minutes, tasks per day.
 await route('#insights/usage');assert(!doc.getElementById('page-usage').hidden);
 assert.deepEqual(card('input'),['2.5M','cache inside; 1.8M cache read']);assert.deepEqual(card('minutes'),['1h 35m','of ended attempts']);assert.equal(card('per_day')[0],'2.5');
 assert.deepEqual(rows('model')[0],['model-x','6','2.5M','42.0k','1.8M','1h 35m','100% (6 of 6)']);
 assert.deepEqual([...doc.querySelectorAll('[data-ix-days] tbody tr')].map(r=>r.textContent),['2026-11-163','2026-11-172']);
 // The period and the scope: one change reads once for the three, and goes in the address.
 const range=doc.getElementById('ix-range');range.value='7d';range.dispatchEvent(new w.Event('change'));await settle();
 assert.equal(reads().at(-1).get('since'),'7d');assert(/range=7d/.test(w.location.hash),'the period is not in the address: '+w.location.hash);
 const sel=doc.getElementById('ins-scope');sel.value='hosts';sel.dispatchEvent(new w.Event('change'));await settle();
 assert.equal(reads().at(-1).get('scope'),'hosts');assert(/scope=hosts/.test(w.location.hash));assert(/\(users’ own hosts\)/.test(doc.getElementById('ix-coverage').textContent));
 const n=reads().length;await route('#insights/success?range=7d&scope=hosts');assert.equal(reads().length,n,'the same period and scope read again');
 // A link with a period opens with it; a reload keeps it.
 const re=new JSDOM(fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8'),{url:'http://127.0.0.1:21620/#insights/cost?range=90d&scope=server',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(x){x.localStorage.setItem('dash-token','fixture');x.matchMedia=()=>({matches:false,addEventListener(){}});x.ResizeObserver=class{observe(){}disconnect(){}};x.CSS={escape:v=>v};x.scrollTo=()=>{};
  x.fetch=async(url)=>{const u=new URL(url,x.location.href);requests.push('GET '+u.pathname+u.search);const body=u.pathname==='/api/insights'?insights(u.searchParams):u.pathname==='/api/dash'?dash:{};return {ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)}}}});
 await settle();assert.equal(re.window.document.getElementById('ix-range').value,'90d');assert.equal(reads().at(-1).get('since'),'90d');assert.equal(reads().at(-1).get('scope'),'server');re.window.close();
 // A failed read says so with Retry, and Retry reads again; the last answer is kept on a failed refresh.
 fail=500;w.eval("IX.data=null;IX.key=''");await route('#insights/usage?range=28d');assert(doc.querySelector('[data-ix-error]'),'a failed read is not said');assert(/boom/.test(doc.querySelector('[data-ix-error]').textContent));
 fail=0;doc.querySelector('[data-ix-error] button').click();await settle();assert(!doc.querySelector('[data-ix-error]'),'Retry did not read again');assert(card('input'),'no numbers after Retry');
 fail=500;range.value='90d';range.dispatchEvent(new w.Event('change'));await settle();assert(/Could not load insights/.test(doc.getElementById('ix-usage').textContent));fail=0;
 // Nothing written.
 assert(!requests.some(r=>!r.startsWith('GET ')),'Insights wrote: '+requests.filter(r=>!r.startsWith('GET ')));
 assert(!errors.length,errors.join('\n'));
 console.log('dash_insights_tabs: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');w.close();process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
