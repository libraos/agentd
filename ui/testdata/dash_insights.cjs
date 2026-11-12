// #485: Insights > Metrics opens with four cards (autonomous completion, cost per
// accepted task, interventions per task, PR workflow latency), outcomes per week
// as stacked bars whose parts open History filtered to that week and outcome,
// a text table of the same numbers, failure classes and a table by agent and
// model. Every number is the factory report's (/api/factory) for the period, the
// latency /api/metrics'; a value with no data reads "not measured", never 0.
// Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_insights.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const rate={not_enough_data:true,n:0,of:0,coverage:{decided:0,all:0},rule:'Fixture rule'},lat={n:0},exec={not_enough_data:true,n:0,of:0,running:0,rule:'Fixture rule'};
const metrics=()=>({tasks:{all:3,accepted:1,failed:1,undecided:1},outcomes:{autonomous_task_success_rate:rate,first_pass_acceptance_rate:rate,human_execution_intervention_rate:rate,cost_per_accepted_task:rate},
  workflow:{latency:{open_to_merge:latency,open_to_first_review:lat,first_review_to_merge:lat},task_execution_time:exec},reference:{ai_only_commit_rate:rate,infra_failure_rate:rate},cost:{},coverage:{covered:true},merged:4});
let latency={n:4,median_hours:5.25};
const week=(w,since,until,o)=>({week:w,since,until,handoffs:5,dispatched:5,outcomes:o});
const full=()=>({factory:1,since:'2026-10-15T09:00:00Z',until:'2026-10-29T09:00:00Z',handoffs:7,interactive_left_out:2,
  total:{handoffs:7,dispatched:5,autonomous_completion:{n:2,of:5,pct:40,accepted:3},cost_per_accepted:{accepted:3,priced:2,unpriced:1,median_usd:3},interventions:{with_any:2,of:5,mean:0.6,blocked_unanswered:0},wall_time:{n:3,median_min:20,p90_min:40},outcomes:{accepted:1,auto_completed:2,not_delivered:1,failed:1,false_accept:0,open:1}},
  by_week:[week('2026-10-15','2026-10-15T09:00:00Z','2026-10-22T09:00:00Z',{accepted:1,auto_completed:1,not_delivered:1,failed:1,false_accept:0,open:0}),
    week('2026-10-22','2026-10-22T09:00:00Z','2026-10-29T09:00:00Z',{accepted:0,auto_completed:1,not_delivered:0,failed:0,false_accept:1,open:1})],
  by_tool:[],by_stage:[],workflow_changes:{n:0,merged_prs:4,not_labelled:true},
  failure_classes:{attempts:6,running:0,classes:[{class:'none',attempts:3,usd:4,unpriced:0},{class:'unknown',attempts:0,usd:0,unpriced:0},{class:'task',attempts:1,usd:1,unpriced:0},{class:'infrastructure',attempts:2,usd:0.25,unpriced:1},{class:'model',attempts:0,usd:0,unpriced:0}]},
  by_agent_model:[{agent:'claude',model:'m-'+evil,tasks:4,accepted:2,attempts:5,tokens:1500,missing_tokens:1,usd:3.5,missing_usd:1,wall_time:{n:3,median_min:20}},
    {agent:'codex',model:'gpt-x',tasks:1,accepted:1,attempts:1,tokens:150,missing_tokens:0,usd:4,missing_usd:0,wall_time:{n:1,median_min:30}},
    {agent:'claude',model:null,tasks:1,accepted:0,attempts:0,missing_tokens:0,missing_usd:0,wall_time:{not_computable:'no handoff went from claimed to done'}}],
  load:{max_workers:2,peak_workers:0,unpriced:0,days:[],averages:{}}});
let factory=full(),factoryMode='ok',metricsDelay=0;const requests=[];
const dash={user:'alice',role:'owner',now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{}};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#inbox',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);requests.push(u.pathname+u.search);let body={},status=200;
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/issues')body={issues:[]};
  else if(u.pathname==='/api/metrics'){if(metricsDelay)await new Promise(r=>setTimeout(r,metricsDelay));body=metrics()}
  else if(u.pathname==='/api/bench')body={rounds:[]};
  else if(u.pathname==='/api/factory'){if(factoryMode==='denied'){status=401;body='needs the token'}else if(factoryMode==='broken'){status=500;body='ledger is locked'}else body=factory}
  else if(u.pathname==='/api/history')body={rows:[{id:'hof-3',state:'done',goal:'Fix the flaky test',failed:true,updated:now}],total:1,groups:1,next:null,limit:50,facets:{states:['done','cancelled','declined'],sources:[],creators:[]}};
  return {ok:status<400,status,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>typeof body==='string'?body:JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<5;i++)await tick()},route=async h=>{w.location.hash=h;await settle()};
const cards=()=>[...doc.querySelectorAll('#ins-cards .ins-card')].map(c=>[c.querySelector('.ins-label').textContent,c.querySelector('b').textContent,c.querySelector('.ins-note').textContent]);
const cells=sel=>[...doc.querySelectorAll(sel+' tbody tr')].map(r=>[...r.cells].map(c=>c.textContent));
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 await route('#insights/metrics');assert(!doc.getElementById('page-metrics').hidden,'Metrics is hidden');assert(!doc.getElementById('ins-overview').hidden,'the overview is hidden');
 // The period picker sits above the overview, and the factory report is read for it.
 const head=doc.getElementById('ins-head');assert(head.querySelector('#m-range'),'no period picker at the top');assert(head.compareDocumentPosition(doc.getElementById('ins-overview'))&w.Node.DOCUMENT_POSITION_FOLLOWING);
 assert(requests.some(r=>r.startsWith('/api/factory?since=')),'no factory request for the period');assert.equal(doc.getElementById('ins-period').textContent,'2026-10-15 to 2026-10-29');
 // Four cards, in the design's order, with the factory report's figures.
 assert.deepEqual(cards(),[['Autonomous completion','2 of 5','accepted with no intervention · 40%'],['Cost per accepted task','$3.00',"median of the accepted tasks' worker cost · 1 unpriced"],
  ['Interventions per task','0.60','messages, approvals, takeovers · 2 of 5 tasks had one'],['PR workflow latency','5.3 h','open to merge, median · 4 merged PRs']]);
 // Outcomes per week: one bar per week, a part per outcome that has tasks, stacked in the design's order.
 const weeks=[...doc.querySelectorAll('#ins-weeks .ins-week')];assert.equal(weeks.length,2);
 assert.deepEqual([...weeks[0].querySelectorAll('.ins-seg')].map(a=>a.dataset.outcome),['accepted','auto_completed','not_delivered','failed']);
 assert.deepEqual([...weeks[1].querySelectorAll('.ins-seg')].map(a=>a.dataset.outcome),['auto_completed','false_accept']);
 assert.equal(weeks[0].querySelector('.ins-stack').style.height,'100%');assert.equal(weeks[1].querySelector('.ins-stack').style.height,'50%');
 assert.equal(weeks[0].querySelector('.ins-o-failed').style.flexGrow,'1');
 assert.deepEqual([...doc.querySelectorAll('#ins-weeks .ins-key span')].map(s=>s.textContent),['Accepted','Auto completed','Not delivered','Failed','False accept']);
 assert(doc.querySelector('#ins-weeks').textContent.includes('1 still offered or running, not drawn.'));
 const seg=weeks[0].querySelector('.ins-o-failed');assert.equal(seg.getAttribute('aria-label'),'Week of 2026-10-15: 1 failed. Open these tasks');
 const href=new URL(seg.getAttribute('href').replace('#insights/history','http://x/'));assert.deepEqual(Object.fromEntries(href.searchParams),{outcome:'failed',since:'2026-10-15T09:00:00Z',until:'2026-10-22T09:00:00Z'});
 // The text table: always in the page for a screen reader, shown on request.
 const table=doc.getElementById('ins-wtable');assert(table.querySelector('caption').textContent.startsWith('Outcomes per week'));
 assert.deepEqual([...table.querySelectorAll('thead th')].map(c=>c.textContent),['Week of','Accepted','Auto completed','Not delivered','Failed','False accept','Still open']);
 assert.deepEqual(cells('#ins-wtable'),[['2026-10-15','1','1','1','1','0','0'],['2026-10-22','0','1','0','0','1','1']]);
 const toggle=doc.querySelector('#ins-weeks .ins-tabletoggle');assert(!table.classList.contains('open'));toggle.click();assert(table.classList.contains('open'));assert.equal(toggle.getAttribute('aria-expanded'),'true');toggle.click();assert.equal(toggle.getAttribute('aria-expanded'),'false');
 // Dark: every part's colour is a theme variable, so the dark theme recolours it.
 const css=[...doc.querySelectorAll('style')].map(s=>s.textContent).join('\n');
 for(const k of ['accepted','auto_completed','not_delivered','failed','false_accept']){const m=new RegExp('\\.ins-o-'+k+'\\{background:([^}]*)\\}').exec(css);assert(m&&/^var\(--[a-z-]+\)$/.test(m[1]),k+' colour is not a theme variable: '+(m&&m[1]))}
 assert(/@media\(max-width:860px\)\{\.ins-cards\{grid-template-columns:repeat\(2,/.test(css)&&/\.ins-cols\{grid-template-columns:minmax\(0,1fr\)\}/.test(css),'no phone layout for the overview');
 // Failure classes: the failing classes, with what ended with none counted above.
 assert.deepEqual(cells('#ins-classes .ins-classes'),[['unknown','0','–'],['task','1','$1.00'],['infrastructure','2','≥ $0.25'],['model','0','–']]);
 assert.equal(doc.getElementById('ins-classes-n').textContent,'6 ended attempts, 3 with no failure');
 // By agent and model; what was not recorded is "not measured" or a floor.
 assert.deepEqual([...doc.querySelectorAll('#ins-agents thead th')].map(c=>c.textContent),['Agent','Model','Tasks','Accepted','Median minutes','Tokens','Spend']);
 assert.deepEqual(cells('#ins-agents .ins-agents'),[['Claude','m-'+evil,'4','2','20.0','≥ 1.5k','≥ $3.50 (1 unpriced)'],['Codex','gpt-x','1','1','30.0','150','$4.00'],['Claude','not recorded','1','0','not measured','not measured','not measured']]);
 assert(!doc.querySelector('#page-metrics img'),'server text became markup');
 // The Factory detail stays below, as before.
 assert(!doc.getElementById('factory').hidden,'the Factory detail is gone');assert(doc.querySelector('#f-body .fclasses'),'the full failure class table is gone');
 // No data: "not measured" with the reason, never 0.
 factory=full();factory.total.autonomous_completion={not_computable:'no dispatched handoff'};factory.total.cost_per_accepted={not_computable:'no dispatched handoff'};factory.total.interventions={not_computable:'no dispatched handoff'};
 factory.by_week=[week('2026-10-15','2026-10-15T09:00:00Z','2026-10-22T09:00:00Z',{not_computable:'no dispatched handoff'})];factory.failure_classes={attempts:0,running:0,not_computable:'no dispatched handoff in the window has an ended worker attempt'};factory.by_agent_model=[];latency={n:0};
 w.eval("INS_READ.metrics=0;loadMetrics()");await settle();
 assert.deepEqual(cards().map(c=>c[1]),['not measured','not measured','not measured','not measured']);assert.deepEqual(cards().map(c=>c[2]),['no dispatched handoff','no dispatched handoff','no dispatched handoff','no PR merged in this period']);
 assert(!/\$0\.00|NaN|undefined/.test(doc.getElementById('ins-overview').textContent),'no data read as a number: '+doc.getElementById('ins-overview').textContent);
 assert.equal(doc.querySelectorAll('#ins-weeks .ins-seg').length,0);assert(doc.querySelector('#ins-weeks .ins-noend'),'an empty chart says why');
 assert.equal(doc.querySelector('#ins-classes').textContent,'not measured: no dispatched handoff in the window has an ended worker attempt.');assert.equal(doc.querySelector('#ins-agents').textContent,'No dispatched task in this period.');
 // A factory failure says so; a public dash without the token hides the overview.
 factoryMode='broken';w.eval("loadFactory('30d')");await settle();assert(doc.getElementById('ins-weeks').textContent.includes('Could not load the factory report: ledger is locked'));assert.equal(cards()[0][2],'ledger is locked');
 factoryMode='denied';w.eval("loadFactory('30d')");await settle();assert(doc.getElementById('ins-overview').hidden,'the overview shows without access');
 factoryMode='ok';factory=full();latency={n:4,median_hours:5.25};w.eval("INS_READ.metrics=0;loadMetrics()");await settle();assert(!doc.getElementById('ins-overview').hidden);
 // A bar opens History filtered to its week and outcome, and the filter can be removed.
 const before=requests.length;await route(doc.querySelector('#ins-weeks .ins-week .ins-o-failed').getAttribute('href'));
 assert(!doc.getElementById('page-history').hidden,'the bar did not open the task list');
 const hist=requests.slice(before).filter(r=>r.startsWith('/api/history?')).pop();assert(hist,'no history request');const q=new URL('http://x'+hist).searchParams;
 assert.deepEqual([q.get('outcome'),q.get('since'),q.get('until')],['failed','2026-10-15T09:00:00Z','2026-10-22T09:00:00Z']);
 const chip=doc.getElementById('h-outcome');assert(!chip.hidden);assert.equal(chip.textContent,'Failed · week of 2026-10-15 ×');assert(!doc.getElementById('h-clear').hidden,'Clear hidden while filtered');
 assert(doc.getElementById('h-rows').textContent.includes('Fix the flaky test'));
 chip.click();await settle();assert(chip.hidden);const after=requests.filter(r=>r.startsWith('/api/history?')).pop();assert(!new URL('http://x'+after).searchParams.has('outcome'),'the outcome stayed after removing it');assert(!w.location.hash.includes('outcome='));
 // No second panel: Metrics, Usage and History are tabs at the top of the page, Metrics' beside its period picker; addresses unchanged.
 assert.equal(w.eval("PAGES.insights.panel"),false,'Insights still has a second panel');assert(!doc.getElementById('panel-insights').children.length,'the Insights panel element is not empty');
 const tabsAt=async v=>{await route('#insights/'+v);const t=doc.getElementById('ins-tabs');assert(!doc.getElementById('side').contains(t),'the tabs are in the panel');
  assert(doc.body.classList.contains('no-panel'));assert.deepEqual([...t.querySelectorAll('a')].map(a=>[a.getAttribute('href'),a.textContent,a.getAttribute('aria-current')]),['metrics','usage','history'].map(k=>['#insights/'+k,k[0].toUpperCase()+k.slice(1),k===v?'page':null]));return t};
 let t=await tabsAt('metrics');assert.equal(t.parentElement.id,'ins-head','Metrics\' tabs are not beside the period picker');assert(t.parentElement.querySelector('#m-range'));
 t=await tabsAt('usage');assert.equal(t.parentElement.id,'page-usage');assert.equal(t.parentElement.firstElementChild,t,'Usage\'s tabs are not at the top');
 t=await tabsAt('history');assert.equal(t.parentElement.id,'page-history');assert.equal(t.parentElement.firstElementChild,t,'History\'s tabs are not at the top');
 // PR workflow latency: a slow /api/metrics shows Loading, then the value; it never stays loading.
 await route('#insights/metrics');metricsDelay=200;latency={n:3,median_hours:0.48};w.eval("INS_READ.metrics=0;loadMetrics()");await settle();
 assert.deepEqual(cards()[3],['PR workflow latency','…','Loading…']);
 await new Promise(r=>setTimeout(r,300));await settle();assert.deepEqual(cards()[3],['PR workflow latency','0.5 h','open to merge, median · 3 merged PRs']);metricsDelay=0;
 // Dates with no start date read nothing, and the cards say so instead of Loading.
 w.eval("$('m-range').value='dates';$('m-from').value='';INS_READ.metrics=0;loadMetrics()");await settle();
 assert(cards().every(c=>c[1]!=='…'&&c[2]!=='Loading…'),'a card stays loading with no start date: '+JSON.stringify(cards()));assert.equal(cards()[3][2],'choose a start date');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_insights: ok');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
