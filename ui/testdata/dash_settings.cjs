// #487: Settings has a section list in its panel, grouped This host, You and Team,
// in place of tabs. Each section has its own address (#settings/SECTION; #settings
// is Agents), every setting the tabs had sits under one, Agents shows Claude Code,
// Codex and opencode installed and connected from GET /api/settings?agents=1, the
// Terminal shows its value and the config.toml change, and no setting the page
// could not write before is writable now. Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_settings.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),phone=process.env.DASH_UI_PHONE==='1',evil='<img src=x onerror=alert(1)>';
const dash={user:'alice',role:'owner',now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{}};
const config={'dispatch.max_workers':2,'dispatch.default_tool':'codex','dispatch.budget':'90m','dispatch.codex_network':false,'dispatch.claude_model':'claude-test','dash.dispatch':true,'dash.push_prompts':false,'dash.base_url':'','dash.terminal':false,'dash.terminal_remote':false,
 'sync.repos':['acme/one'],'mcp.tools':'core','mcp.allowed_origins':[],'users.strict':false,'gateway.url':'http://gw.test','gateway.key_file':'configured','runtime.url':'','runtime.password_file':'not configured'};
const settings={owner:true,config,models:{configured:[],used:[],prices:{'claude-test':{input:3,output:15}},gateway_status:'none'},members:[{name:'alice',role:'owner'}],invites:[{id:'i1',user:'bob',email:'bob@example.invalid',state:'pending'}],
 personal:{email:'alice@example.invalid',waiting:true,blocked:true,failed:true,finished:false},email:{configured:false},telegram:{},telegram_personal:null,history:[{created:now,actor:'alice',key:'dispatch.max_workers',new_value:'2',state:'applied'}],chat_roles:[{name:'assistant',model:'m',tools:[]}]};
const part=(check,label,ok)=>({check,label,ok,status:ok?'pass':'fail',detail:'',fix:''});
const agents={checked_at:now,connect:[],agents:[
 {tool:'claude',name:'Claude Code',installed:true,install_status:'pass',connected:'connected',parts:[part('claude-mcp','MCP server',true),part('claude-hooks','hooks',true)],model:'claude-test',model_source:'[dispatch] claude_model'},
 {tool:'codex',name:'Codex',installed:true,install_status:'pass',connected:'partly connected',parts:[part('codex-mcp','MCP server',true),part('codex-approval','approval mode',false)],model:evil,model_source:"the tool's own default"},
 {tool:'opencode',name:'opencode',installed:false,install_status:'optional',install_fix:'curl -fsSL https://opencode.ai/v2/install | bash',connected:'not installed',parts:[part('opencode-mcp','MCP server',false)],model:null,model_source:"the tool's own default"}]};
const diag={doctor:[{id:'config',status:'pass',detail:'Config parsed'}],services:[],checked_at:now};
const posts=[],reads=[];
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#settings',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);let body={};
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/settings'){reads.push(u.search);
   if(opts.method==='POST'){posts.push(JSON.parse(opts.body));body={changed:true}}
   else if(u.searchParams.has('agents'))body=agents;else if(u.searchParams.has('diagnostics'))body=diag;else body=settings}
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<4;i++)await tick()};
const go=async h=>{w.location.hash=h;await settle()};
const shown=()=>[...doc.querySelectorAll('#page-settings .set-group')].filter(n=>!n.hidden).map(n=>n.id);
const text=id=>doc.getElementById(id).textContent;
const want=[['This host',[['agents','Agents'],['models','Models and prices'],['workers','Workers'],['connections','Connections'],['terminal','Terminal'],['diagnostics','Diagnostics']]],['You',[['personal','Personal'],['app','Install as an app']]],['Team',[['members','Members and roles'],['history','Change history']]]];
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // The section list replaces the tabs, in the panel, grouped as the design has it.
 assert(!doc.getElementById('set-tabs'),'the tabs are still there');
 assert(!doc.getElementById('page-settings').querySelector('nav'),'a nav of sections left in the page');
 assert(doc.getElementById('side').contains(doc.getElementById('settings-sections')),'sections are not in the panel');
 assert(!doc.getElementById('panel-settings').hidden,'the panel is hidden on Settings');assert(!doc.body.classList.contains('no-panel'),'Settings still has no panel');
 const groups=[...doc.querySelectorAll('#settings-sections .pgroup')].map(g=>[g.querySelector('.pgroup-name').textContent,[...g.querySelectorAll('a[data-section]')].map(a=>[a.dataset.section,a.firstElementChild.firstElementChild.textContent])]);
 assert.deepEqual(groups,want,'groups and sections');
 // #settings is Agents, marked in the list and named in the top bar.
 assert.deepEqual(shown(),['set-agents']);assert.equal(doc.querySelector('#settings-sections [aria-current=page]').dataset.section,'agents');
 assert(doc.getElementById('page-title').textContent.includes('Agents'),doc.getElementById('page-title').textContent);
 // Each section has its own address, reached from its link; a link is a plain href.
 for(const [,list] of want)for(const [id,title] of list){
  const a=doc.querySelector('#settings-sections a[data-section="'+id+'"]');assert.equal(a.getAttribute('href'),'#settings/'+id);
  if(phone){w.eval('setPanel(true)');assert(doc.body.classList.contains('panel-open'),'the drawer did not open')}
  a.click();await settle();
  assert.equal(w.location.hash,'#settings/'+id);assert.deepEqual(shown(),['set-'+id],id);
  assert.equal(text('set-title'),title);assert.equal(a.getAttribute('aria-current'),'page');
  assert.equal(doc.querySelectorAll('#settings-sections [aria-current=page]').length,1);
  if(phone)assert(!doc.body.classList.contains('panel-open'),'choosing '+id+' left the drawer open');}
 // An address typed by hand lands on its section; an unknown one is not found.
 await go('#settings/terminal');assert.deepEqual(shown(),['set-terminal']);
 await go('#settings/nope');assert(!doc.getElementById('page-notfound').hidden,'unknown section was not refused');
 await go('#settings/models/more');assert(!doc.getElementById('page-notfound').hidden);
 // Every setting the tabs had is under one section.
 const under={workers:['Max workers','Default tool','Default budget','Codex network','Start workers from the server','Triggers','Worker rules'],models:['Configured','Actually used','Model prices','claude-test'],
  connections:['Synced repos','acme/one','MCP tools','MCP origins','Gateway','Runtime','Server address','Strict users','Prompt forwarding','Chat roles and tools'],
  personal:['Theme','Keyboard shortcuts','Sign-in','Notifications','Your email address','Gmail','Telegram'],members:['Members','alice','Invite member','Invitations','bob@example.invalid'],
  history:['Change history','dispatch.max_workers'],terminal:['Terminal in the server','Off (the default)','terminal = true','config.toml'],app:['Install as an app','Add to Home Screen']};
 for(const [id,labels] of Object.entries(under)){await go('#settings/'+id);for(const l of labels)assert(text('set-'+id).includes(l),id+' lacks '+l)}
 await go('#settings/diagnostics');assert(text('set-diagnostics').includes('Config parsed'),'doctor is not under Diagnostics');
 // Agents: the three tools, installed and connected from ?agents=1, the default model, Preview for those installed.
 await go('#settings/agents');assert(reads.includes('?agents=1'),'agents not read');
 const rows=[...doc.querySelectorAll('#set-agents-table tbody tr')].map(r=>[...r.children].map(td=>td.textContent));
 assert.deepEqual(rows.map(r=>r[0]),['Claude Code','Codex','opencode']);
 assert(rows[0][1].startsWith('Installed')&&rows[2][1].startsWith('Not installed'),'installed column');assert(rows[2][1].includes('opencode.ai'),'no install line for opencode');
 assert(rows[0][2].startsWith('Connected')&&rows[0][2].includes('MCP server, hooks'),rows[0][2]);
 assert(rows[1][2].startsWith('Partly connected')&&rows[1][2].includes('Missing: approval mode'),rows[1][2]);
 assert.equal(rows[2][2],'—');
 assert(rows[0][3].startsWith('claude-test')&&rows[0][3].includes('[dispatch] claude_model'),rows[0][3]);
 assert(rows[1][3].startsWith(evil),'model not shown as text');assert(!doc.querySelector('#set-agents img'),'a model became markup');
 assert.deepEqual([...doc.querySelectorAll('#set-agents [data-connect-preview]')].map(b=>b.dataset.connectPreview),['claude','codex']);
 assert(text('set-agents').includes('Default for new tasks')&&text('set-agents').includes('Codex'),'default tool missing');
 assert(text('set-agents').includes('Settings that widen access')&&text('set-agents').includes('agentd config set triggers.enabled true'),'widening settings missing');
 // No new setting is writable: outside the Edit and price sheets that existed, the
 // sections that show settings have no control that writes one.
 for(const id of ['agents','connections','terminal','app','history','diagnostics']){
  const sec=doc.getElementById('set-'+id);assert(!sec.querySelector('input,select,textarea'),id+' has an input');
  for(const b of sec.querySelectorAll('button'))assert(b.dataset.connectPreview,id+' has a button '+b.textContent)}
 const keys=new Set();
 for(const id of ['agents','models','workers','connections','terminal','personal','app','members','history']){await go('#settings/'+id);
  const edits=[...doc.querySelectorAll('#set-'+id+' button')].filter(b=>['Edit','Add price'].includes(b.textContent));
  for(let i=0;i<edits.length;i++){const b=[...doc.querySelectorAll('#set-'+id+' button')].filter(b=>['Edit','Add price'].includes(b.textContent))[i];b.click();await tick();
   const sheet=doc.querySelector('dialog');assert(sheet,'no sheet for '+b.textContent);
   for(const f of sheet.querySelectorAll('input'))if(!f.value)f.value=f.name==='model'?'m':'1';
   const before=posts.length;sheet.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
   for(const p of posts.slice(before))keys.add(p.action==='config'?p.key.replace(/^budget\.prices\..*/,'budget.prices.*'):p.action);
   const left=doc.querySelector('dialog');if(left&&left.open){const c=[...left.querySelectorAll('button')].find(n=>n.textContent==='Cancel');if(c)c.click();await tick()}}}
 assert.deepEqual([...keys].sort(),['budget.prices.*','dispatch.budget','dispatch.codex_network','dispatch.default_tool','dispatch.max_workers'],'writable settings changed');
 // A member who is not an owner: no agents read, no Preview, no history.
 const before=reads.filter(r=>r==='?agents=1').length;
 settings.owner=false;w.eval("TOKEN='';COOKIE=true;USER='viewer';ROLE='viewer';settingsAccess()");await settle();
 await go('#settings/agents');assert.equal(reads.filter(r=>r==='?agents=1').length,before,'a non-owner read the agents');
 assert(!doc.querySelector('#set-agents [data-connect-preview]'),'a non-owner sees Preview');assert(text('set-agents-table').includes('Owners see this'));
 assert(text('set-agents-table').includes('claude-test'),'a non-owner does not see the configured model');
 await go('#settings/history');assert(!doc.querySelector('#set-history table'),'a non-owner sees the history');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_settings: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
