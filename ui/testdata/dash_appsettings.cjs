// Personal app refresh item 6: Settings gains Agents on this computer, About (version, who is signed in,
// documentation), an honestly labelled feedback copy (review m7) and Sign out.
//   Agents   the server's Settings > Agents table, the same renderer (settingsAgentsTable) and data: GET
//            /api/settings, then ?agents=1 for an owner (both read only, which the app serves). Preview is the
//            server's connect action; the app takes no connect yet, so its 404 shows the two terminal commands
//            (preview, then connect). A server that does take it previews, connects and reads the table again.
//            Someone who is not an owner sees each agent's configured model and no ?agents=1 request is made.
//   About    product and version (the snapshot's version when a server sends one, else "Not reported" with the
//            terminal command that prints it), who is signed in, documentation.
//   Feedback a sheet that builds CLI feedback with the words quoted for the shell and copies it; nothing is posted.
//   Sign out POST /api/logout, then the token is forgotten; a refused logout keeps it and says so.
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_appsettings.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const phone=process.env.DASH_UI_PHONE==='1',theme=process.env.DASH_UI_THEME||'light',now=new Date().toISOString(),evil='<img src=x onerror=alert(1)>';
const html=fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8');
const snap={user:'alice',role:'owner',now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{},checkouts:['/r/demo'],dispatch:true,terminal:true,
  mode:'app',watchdog:{running:true},spend_today:{usd:0,workers:0,unpriced:0,pending:0,user:'alice'}};
const obState={flowVersion:4,closedAt:12345,outcome:'completed',lastCompletedStep:5,checklist:{},surface:'terminal',defaultAgent:'codex',theme:'system',sound:'system',notifications:false,guideHidden:true,toursSeen:['tasks'],toastShown:true};
const obFacts={os:'linux',repositories:[],task_files:0,clients:[],default_tool:'codex',first_task:{done:true,handoff:null,count:1},gh:'connected',linear:false,commands:{}};
const agents={checked_at:now,agents:[
  {tool:'claude',name:'Claude Code',installed:true,install_status:'pass',connected:'connected',parts:[{label:'MCP server',ok:true},{label:'Hooks',ok:true}],model:'claude-opus-5-5',model_source:'[dispatch] claude_model'},
  {tool:'codex',name:'Codex',installed:true,install_status:'pass',connected:'partly connected',parts:[{label:'MCP server',ok:true},{label:'Approval '+evil,ok:false}],model:'gpt-5.4',model_source:'the tool’s own default'},
  {tool:'opencode',name:'opencode',installed:false,install_status:'warn',install_fix:'npm i -g opencode',connected:'not installed',parts:[],model:null,model_source:'the tool’s own default'}]};
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
// o.owner (default true), o.settings (status of GET /api/settings), o.connect (status of the connect action: 404 as the app serves it today),
// o.logout (its status), o.version (the snapshot's), o.os.
async function boot(o={}){const errors=[],vc=new VirtualConsole(),clip=[],calls=[],posts=[];const st={settings:o.settings||200,connect:o.connect||404,logout:o.logout||200};
  vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
  const dom=new JSDOM(html,{url:'http://127.0.0.1:21470/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',theme);
    Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{writeText:async t=>{clip.push(t)}}});
    w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
    w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
    w.WebSocket=class{constructor(){this.readyState=0}send(){}close(){this.readyState=3}};w.Terminal=class{open(){}onData(){}resize(){}write(){}focus(){}dispose(){}};
    w.Notification=class{static get permission(){return 'default'}static requestPermission(){return Promise.resolve('default')}};
    w.fetch=async(url,init)=>{const u=new URL(url,w.location.href),method=(init&&init.method)||'GET';let body={},status=200;
      if(u.pathname==='/api/auth')return {ok:true,status:204};
      calls.push(method+' '+u.pathname+u.search);if(method!=='GET'&&u.pathname!=='/api/onboarding')posts.push({path:u.pathname,body:init.body?JSON.parse(init.body):null});
      if(u.pathname==='/api/dash')body={...snap,...(o.version!==undefined?{version:o.version}:{})};
      else if(u.pathname==='/api/onboarding')body={user:'alice',state:obState,facts:{...obFacts,os:o.os||'linux'}};
      else if(u.pathname==='/api/logout'){status=st.logout;body=status<400?{}:{error:'nope'}}
      else if(u.pathname==='/api/settings'){
        if(method==='POST'){const b=JSON.parse(init.body);status=st.connect;body=status===404?null:{tool:b.tool,dry_run:b.dry_run,ok:true,exit:0,output:[b.dry_run?'would add the MCP server '+evil:'added the MCP server'],backups:b.dry_run?[]:['/home/x/.claude.json.bak']};
          if(status===404)return {ok:false,status:404,json:async()=>{throw new SyntaxError('404 page not found')},text:async()=>'404 page not found'}}
        else if(u.search==='?agents=1'){if(o.owner===false){status=403;body={error:'Agents require an owner'}}else body=agents}
        else{status=st.settings;body=status<400?{owner:o.owner!==false,config:{'dispatch.claude_model':'claude-opus-5-5'}}:{error:'Settings are down'}}}
      return {ok:status<400,status,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
  const w=dom.window,doc=w.document;await settle();assert(!errors.length,errors.join('\n'));assert(doc.body.classList.contains('app-mode'),'app mode is off');
  const t={w,doc,clip,calls,posts,errors,st,$:id=>doc.getElementById(id),q:(s,n)=>(n||doc).querySelector(s),qa:(s,n)=>[...(n||doc).querySelectorAll(s)],
    click:async n=>{assert(n,'nothing to click');n.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));await settle()},
    settings:async()=>{if(phone){t.q('[data-app-action="toggle-left"]').click();await settle()}t.q('[data-app-action="settings"]').click();await settle();const p=t.$('app-page');assert(p&&!p.hidden,'Settings does not open');return p},
    sec:id=>t.q('#app-page [data-app-section="'+id+'"]'),sheet:()=>t.q('dialog.sheet'),
    ok:()=>assert(!errors.length,errors.join('\n'))};
  return t}
(async()=>{
 // --- an owner: the Agents table, from the same data and renderer as the server's Settings > Agents ---
 let t=await boot();let p=await t.settings();
 const ag=t.sec('agents');assert(ag,'Settings has no Agents section');assert.equal(t.q('h2',ag).textContent,'Agents on this computer');
 assert(p.contains(ag)&&ag.compareDocumentPosition(t.sec('about'))&t.w.Node.DOCUMENT_POSITION_FOLLOWING,'Agents is not before About in Settings');
 assert(t.calls.includes('GET /api/settings')&&t.calls.includes('GET /api/settings?agents=1'),'Agents does not read the server’s data: '+t.calls.join(', '));
 assert.deepEqual(t.qa('th',ag).map(h=>h.textContent),['Agent','Installed','Connected to LibraOS Engine','Default model',''],'not the server’s Agents columns');
 const rows=t.qa('tbody tr',ag);assert.equal(rows.length,3,'one row per agent');
 assert(t.q('.tablewrap.phone-rows',ag),'the table is not the shared renderer’s (phone rows)');assert.equal(t.q('td[data-label="Installed"]',rows[0]).getAttribute('data-label'),'Installed','no data-label for the phone layout');
 assert.equal(t.q('[data-agent-installed="claude"]',ag).firstChild.textContent,'Installed');assert.equal(t.q('[data-agent-connected="claude"]',ag).dataset.state,'connected');
 assert(/Partly connected/.test(t.q('[data-agent-connected="codex"]',ag).textContent)&&/Missing: Approval/.test(t.q('[data-agent-connected="codex"]',ag).textContent),'partly connected and what is missing');
 assert(!ag.querySelector('img'),'an agent detail renders as HTML');
 assert(/Not installed/.test(t.q('[data-agent-installed="opencode"]',ag).textContent)&&/npm i -g opencode/.test(rows[2].textContent),'not installed and its fix');
 assert(/claude-opus-5-5/.test(rows[0].textContent)&&/\[dispatch\] claude_model/.test(rows[0].textContent)&&/gpt-5\.4/.test(rows[1].textContent),'default models');
 assert(t.q('[data-connect-preview="claude"]',ag)&&t.q('[data-connect-preview="codex"]',ag)&&!t.q('[data-connect-preview="opencode"]',ag),'Preview only for installed agents');
 // Preview: the app's server takes no connect action (404), so the two terminal commands are shown in full, with copy icons.
 await t.click(t.q('[data-connect-preview="codex"]',ag));
 assert.deepEqual(t.posts.map(x=>[x.path,x.body.action,x.body.tool,x.body.dry_run]),[['/api/settings','connect','codex',true]],'Preview is not the connect dry run');
 const out=t.q('[data-app-connect]',ag);assert(out&&!out.hidden,'no connect result box');const term=t.q('[data-connect-terminal="codex"]',out);assert(term,'a 404 connect is not turned into the terminal steps: '+out.textContent);
 assert.deepEqual(t.qa('code',term).map(c=>c.textContent),['libraos-engine connect codex --dry-run','libraos-engine connect codex'],'the terminal steps');
 assert(!/HTTP 404|Could not read/.test(out.textContent),'the raw 404 is shown');
 await t.click(t.q('.cli-copy',term));assert.deepEqual(t.clip,['libraos-engine connect codex --dry-run'],'the copy icon copies the preview command');
 // Settings redraws (a preference changes) keep the table and the result where they were.
 await t.click(t.q('#app-page [data-app-pref="cli"]'));assert(t.q('[data-connect-terminal="codex"]',t.sec('agents')),'a redraw loses the connect result');assert(t.q('[data-agent-installed="claude"]',t.sec('agents')),'a redraw loses the table');
 await t.click(t.q('#app-page [data-app-pref="cli"]'));
 // Refresh reads both again and clears the result.
 const n0=t.calls.filter(c=>c==='GET /api/settings?agents=1').length;await t.click(t.q('[data-app-agents-refresh]'));
 assert.equal(t.calls.filter(c=>c==='GET /api/settings?agents=1').length,n0+1,'Refresh does not read the agents again');assert(t.q('[data-app-connect]').hidden,'Refresh keeps an old result');
 // --- About: product, version (none sent: the command that prints it), signed in as, documentation ---
 const ab=t.sec('about');assert(ab,'Settings has no About');const dd=k=>{const dt=t.qa('dt',ab).find(n=>n.textContent===k);assert(dt,'About has no '+k);return dt.nextElementSibling};
 assert.equal(dd('Product').textContent,'LibraOS Engine');assert(/Not reported by this app/.test(dd('Version').textContent),'no version, said: '+dd('Version').textContent);
 assert.equal(t.q('.cli-copy',dd('Version')).dataset.cli,'libraos-engine version','the version command');assert.equal(dd('Signed in as').textContent,'alice');
 const doc=t.q('a',dd('Documentation'));assert.equal(doc.getAttribute('target'),'_blank');assert.equal(doc.getAttribute('rel'),'noopener noreferrer');assert(/^https:\/\//.test(doc.href));
 // --- Feedback (m7): an honestly labelled copy; the words are quoted for the shell; nothing is sent ---
 const fb=t.q('[data-app-pref="feedback"]',ab);assert.equal(fb.textContent,'Copy the feedback command…');assert(/does not send feedback itself/.test(ab.textContent),'About does not say the app cannot send');
 await t.click(fb);let sh=t.sheet();assert(sh&&sh.open,'no feedback sheet');assert.equal(t.q('h2',sh).textContent,'Copy the feedback command');assert(/does not send feedback itself/.test(sh.textContent),'the sheet promises to send');
 assert.equal(t.q('button[type=submit]',sh).textContent,'Copy command');
 const ta=t.q('textarea',sh);ta.value="It's great\n$(whoami)\u0007"+evil;ta.dispatchEvent(new t.w.Event('input',{bubbles:true}));
 const want="libraos-engine feedback 'It'\\''s great $(whoami) "+evil+"'";// one line, no control characters; $() stays literal in single quotesassert.equal(t.q('[data-feedback-cmd]',sh).textContent,want,'the preview is not the quoted command');assert(!sh.querySelector('img'),'feedback text renders as HTML');
 const before=t.posts.length;t.q('form',sh).requestSubmit();await settle();assert(!t.sheet(),'the sheet stays open');assert.deepEqual(t.clip.slice(-1),[want],'Copy command does not copy it');assert.equal(t.posts.length,before,'feedback posted something');
 // Empty: required, nothing copied.
 await t.click(fb);sh=t.sheet();const c0=t.clip.length;t.q('form',sh).requestSubmit();await settle();assert(t.sheet()&&/required/.test(t.sheet().textContent),'an empty feedback is copied');assert.equal(t.clip.length,c0);
 await t.click(t.qa('button',t.sheet()).find(b=>b.textContent==='Cancel'));assert(!t.sheet());
 // The Help menu's item opens the same sheet.
 await t.click(t.q('#app-left [data-app-action="help"]'));const hi=t.q('[data-ob="menu-feedback"]');assert(hi&&hi.textContent==='Copy the feedback command…','Help says Send feedback');await t.click(hi);assert(t.sheet()&&/Copy the feedback command/.test(t.sheet().textContent),'Help does not open the feedback sheet');
 await t.click(t.qa('button',t.sheet()).find(b=>b.textContent==='Cancel'));
 // --- Sign out: a confirm, then POST /api/logout and the token is gone ---
 const so=t.q('[data-app-pref="signout"]',ab);assert.equal(so.textContent,'Sign out');await t.click(so);sh=t.sheet();assert(sh&&/libraos-engine app/.test(sh.textContent),'Sign out does not say how to come back');
 assert.equal(t.posts.filter(x=>x.path==='/api/logout').length,0,'Sign out posted before the confirm');
 t.q('form',sh).requestSubmit();await settle();assert.equal(t.posts.filter(x=>x.path==='/api/logout').length,1,'Sign out does not post /api/logout');assert.equal(t.w.localStorage.getItem('dash-token'),null,'the token stays after Sign out');
 // Nothing else was written: the only POSTs were the connect preview and the logout.
 assert.deepEqual(t.posts.map(x=>x.path+(x.body&&x.body.action?' '+x.body.action:'')),['/api/settings connect','/api/logout'],'Settings wrote something else');
 t.ok();t.w.close();
 // A refused logout keeps the sign-in and says so in the sheet.
 t=await boot({logout:500});await t.settings();await t.click(t.q('[data-app-pref="signout"]'));t.q('form',t.sheet()).requestSubmit();await settle();
 assert(t.sheet()&&/Could not sign out/.test(t.sheet().textContent),'a refused logout is hidden');assert.equal(t.w.localStorage.getItem('dash-token'),'fixture','a refused logout drops the token');t.ok();t.w.close();
 // --- a server that takes connect: Preview, then Connect, then the table is read again ---
 t=await boot({connect:200});await t.settings();await t.click(t.q('[data-connect-preview="claude"]'));
 let box=t.q('[data-app-connect]');assert(/Preview for claude: nothing has changed yet/.test(box.textContent)&&!box.querySelector('img'),'preview output');
 const n1=t.calls.filter(c=>c==='GET /api/settings?agents=1').length;await t.click(t.q('[data-connect-apply="claude"]',box));
 assert.deepEqual(t.posts.map(x=>x.body.dry_run),[true,false],'Connect is not the real run after the preview');assert(/Connected claude/.test(box.textContent)&&/\.claude\.json\.bak/.test(box.textContent),'connect result and backups');
 assert(t.calls.filter(c=>c==='GET /api/settings?agents=1').length>n1,'Connect does not read the table again');t.ok();t.w.close();
 // --- not an owner: each agent's configured model; no ?agents=1 request; no Preview ---
 t=await boot({owner:false});await t.settings();const ag2=t.sec('agents');
 assert(!t.calls.includes('GET /api/settings?agents=1'),'a non-owner asks for the owner-only agents read');assert.equal(t.qa('tbody tr',ag2).length,3);
 assert(/Owners see this/.test(ag2.textContent)&&/claude-opus-5-5/.test(ag2.textContent)&&!t.q('[data-connect-preview]',ag2),'the member view');t.ok();t.w.close();
 // --- Settings unreadable: said, and Refresh tries again ---
 t=await boot({settings:500});await t.settings();assert(/Settings are down/.test(t.sec('agents').textContent),'a failed Settings read is hidden');
 assert(t.q('[data-app-pref="theme"]'),'the personal preferences wait for the Agents read');
 t.st.settings=200;await t.click(t.q('[data-app-agents-refresh]'));assert(t.q('[data-agent-installed="claude"]',t.sec('agents')),'Refresh does not recover');t.ok();t.w.close();
 // --- a server that sends its version; a Windows host quotes feedback for its shell ---
 t=await boot({version:'0.1.22',os:'windows'});await t.settings();const v=t.qa('#app-page [data-app-section="about"] dt').find(n=>n.textContent==='Version').nextElementSibling;
 assert.equal(v.textContent,'0.1.22','the snapshot’s version');assert(!t.q('.cli-copy',v),'a version and its command');
 await t.click(t.q('[data-app-pref="feedback"]'));const ta2=t.q('dialog.sheet textarea');ta2.value='say "hi" %PATH% $(whoami) `a` !x! it\'s';ta2.dispatchEvent(new t.w.Event('input',{bubbles:true}));
 // cmd expands % and !, PowerShell $ and ` inside double quotes: they are left out, and the sheet says so.
 assert.equal(t.q('[data-feedback-cmd]').textContent,'libraos-engine feedback "say hi PATH (whoami) a x it\'s"','Windows quoting');assert(/are left out/.test(t.q('dialog.sheet').textContent),'the sheet does not say what Windows leaves out');t.ok();t.w.close();
 // --- the server's own Settings > Agents keeps its boxes (the same functions, called without the app's) ---
 const css=html.match(/Settings' Agents and About \(refresh item 6\)[\s\S]*?\.app-feedback-cmd/);assert(css&&/var\(--o-border\)/.test(css[0])&&/var\(--o-fg\)/.test(css[0]),'the Agents table is not drawn in the app’s tokens');
 console.log('dash_appsettings: ok',phone?'phone':'desktop',theme);
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
