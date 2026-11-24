// The gateway dialog (agentd-core settings_gateway.go): an owner signed in sets up the
// gateway from Chat's "not set up" line and from Settings > Connections > Gateway, tests
// it (status and the models offered), picks the chat roles' models and saves; Chat then
// loads again and has a model. The key is typed into a password field, sent only in the
// Test and Save requests, cleared after Save and never shown or stored by the page. A
// developer, a viewer and the shared token see no Set up control. Runs in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_gateway.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),phone=process.env.DASH_UI_PHONE==='1',KEY='lk-dash-gateway-key-0123456789',evil='<img src=x onerror=alert(1)>';
const html=fs.readFileSync(process.argv[2],'utf8');
function page(who){
 const state={who,ready:false,url:'',keySet:false,model:'anthropic/claude-opus-5-5',posts:[],chatReads:0};
 const dash={user:who.user,role:who.role,now,handoff_list:[],done:[],sessions:[],left:[],unlinked:[],inbox:[],waiting:[],claims:[],messages:[],counts:{},handoffs:{},host_states:{}};
 const settings=()=>({owner:who.role==='owner'&&!!who.user,config:{'gateway.url':state.url,'gateway.key_file':state.keySet?'configured':'not configured','sync.repos':[],'mcp.tools':'core','mcp.allowed_origins':[],'runtime.url':'','runtime.password_file':'not configured','dash.terminal':false},
  models:{configured:[],used:[],prices:{},gateway_status:state.url?'available':'not configured'},members:[],invites:[],personal:null,email:{},telegram:{},telegram_personal:null,history:[],chat_roles:[{name:'assistant',model:state.model,tools:[]}]});
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
 const dom=new JSDOM(html,{url:'http://127.0.0.1:21620/#chat',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  if(who.token)w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
  if(!who.token)w.document.cookie='agentd_dash_signed_in=1';
  w.matchMedia=q=>({matches:phone&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
  w.fetch=async(url,opts={})=>{const u=new URL(url,w.location.href);let body={},status=200;
   if(u.pathname==='/api/auth')return {ok:true,status:204};
   if(u.pathname==='/api/dash')body=dash;
   else if(u.pathname==='/api/chat'){state.chatReads++;body={chats:[],roles:[{name:'assistant',description:'Answers',model:state.model,tools:[]}],gateway_ready:state.ready,role_problems:[]}}
   else if(u.pathname==='/api/settings'){
    if(opts.method==='POST'){const p=JSON.parse(opts.body);state.posts.push(p);
     if(p.action==='gateway_test')body=p.url.includes('bad')?{gateway:null,status:'refused',message:'bad key '+evil,models:[]}:{gateway:'https://gw.test',status:'available',message:null,models:[{id:'gw/model-one',name:'Model One'},{id:'gw/model-two',name:null}],key_set:!!p.gateway_key||state.keySet};
     else if(p.action==='gateway_set'){if(p.url.includes('refuse')){status=400;body={error:'the saved key is kept only for the gateway it was saved for'}}else{state.url=p.url;state.keySet=!!p.gateway_key||state.keySet&&!p.clear_key;if(p.models&&p.models.assistant)state.model=p.models.assistant;state.ready=true;body={changed:true,gateway:p.url,key_set:state.keySet,key:p.gateway_key?'changed':'kept'}}}
    }else body=settings()}
   else if(u.pathname.startsWith('/api/'))body={};
   return {ok:status<400,status,json:async()=>JSON.parse(JSON.stringify(body)),text:async()=>JSON.stringify(body)}}}});
 return {dom,state,errors};
}
const tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<6;i++)await tick()};
(async()=>{
 // An owner signed in: Chat's line offers Set up.
 {const {dom,state,errors}=page({user:'alice',role:'owner'}),w=dom.window,doc=w.document;await settle();
  w.eval("COOKIE=true;USER='alice';ROLE='owner';TOKEN='';chatLoad()");await settle();
  const fail=doc.getElementById('chat-fail');assert(!fail.hidden,'no chat-fail line');assert(fail.textContent.includes('Chat is not set up'),fail.textContent);
  const setup=fail.querySelector('[data-gateway-setup]');assert(setup&&setup.textContent==='Set up','no Set up in Chat');
  setup.click();await settle();
  let dlg=doc.querySelector('dialog.sheet');assert(dlg&&dlg.open,'no dialog');
  assert.equal(dlg.querySelector('h2').textContent,'Set up the gateway');
  const input=label=>[...dlg.querySelectorAll('label')].find(l=>l.textContent.startsWith(label)).control;
  const url=input('Gateway address'),key=input('Key'),model=input('Model for Assistant');
  assert.equal(key.type,'password','the key is not a password field');assert.equal(model.value,'anthropic/claude-opus-5-5');
  // An address the server would refuse is stopped here first, and nothing is sent.
  url.value='https://user:pw@gw.test/v1';dlg.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
  assert(dlg.querySelector('.field-error:not([hidden])'),'a url with a password was taken');assert.equal(state.posts.length,0);
  // Test: what the gateway offers this key.
  url.value='https://gw.test/v1';key.value=KEY;dlg.querySelector('[data-gateway-test]').click();await settle();
  assert.deepEqual(state.posts.at(-1),{action:'gateway_test',url:'https://gw.test/v1',gateway_key:KEY,clear_key:false});
  const status=dlg.querySelector('[data-gateway-status]').textContent;assert(status.startsWith('Available · 2 models'),status);
  assert.deepEqual([...dlg.querySelectorAll('[data-gateway-models] code')].map(c=>c.textContent),['gw/model-one','gw/model-two']);
  assert.deepEqual([...dlg.querySelectorAll('datalist option')].map(o=>o.value),['gw/model-one','gw/model-two']);
  assert.equal(model.getAttribute('list'),dlg.querySelector('datalist').id,'the role model has no suggestions');
  // A refusal shows its status and message as text.
  url.value='https://bad.gw.test/v1';dlg.querySelector('[data-gateway-test]').click();await settle();
  assert(dlg.querySelector('[data-gateway-status]').textContent.startsWith('Refused: bad key'),'refusal not shown');assert(!dlg.querySelector('img'),'a message became markup');
  // Save: url, key, the role's new model; the key field is cleared, Chat loads again.
  url.value='https://gw.test/v1';model.value='gw/model-one';const reads=state.chatReads;
  dlg.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
  assert.deepEqual(state.posts.at(-1),{action:'gateway_set',url:'https://gw.test/v1',gateway_key:KEY,clear_key:false,models:{assistant:'gw/model-one'}});
  assert.equal(key.value,'','the key stayed in its field');assert(!dlg.open,'the dialog stayed open');
  assert(state.chatReads>reads,'Chat did not load again');assert(doc.getElementById('chat-fail').hidden,'Chat still says it is not set up');
  assert(!doc.documentElement.outerHTML.includes(KEY),'the key is in the page');
  for(let i=0;i<w.localStorage.length;i++)assert(!w.localStorage.getItem(w.localStorage.key(i)).includes(KEY),'the key is in localStorage');
  // Settings > Connections: Change, with the key shown only as set; an empty key field keeps it.
  w.location.hash='#settings/connections';await settle();
  const conn=doc.getElementById('set-connections');assert(conn.textContent.includes('Gateway keySet'),conn.textContent);
  const change=conn.querySelector('[data-gateway-setup]');assert(change&&change.textContent==='Change','no Change in Connections');
  change.click();await settle();dlg=doc.querySelector('dialog.sheet');assert.equal(dlg.querySelector('h2').textContent,'Change the gateway');
  assert(dlg.textContent.includes('A key is saved. Leave this empty to keep it.'),'no saved-key hint');assert(dlg.querySelector('[data-gateway-clear]'),'no Remove the saved key');
  assert.equal(input('Key').value,'','the key was filled back in');
  assert.equal(input('Gateway address').value,'https://gw.test/v1');
  input('Gateway address').value='https://gw.test/llm/v1';dlg.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
  assert.deepEqual(state.posts.at(-1),{action:'gateway_set',url:'https://gw.test/llm/v1',gateway_key:'',clear_key:false,models:{}});
  // A refused save keeps the dialog open with the server's reason.
  doc.getElementById('set-connections').querySelector('[data-gateway-setup]').click();await settle();dlg=doc.querySelector('dialog.sheet');
  input('Gateway address').value='https://refuse.gw.test/v1';input('Key').value=KEY;dlg.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
  assert(dlg.open,'a refused save closed the dialog');assert(dlg.querySelector('.sheet-error').textContent.includes('saved key'),'no reason shown');
  assert.equal(input('Key').value,'','the key stayed after a refusal');
  assert(!errors.length,errors.join('\n'));dom.window.close()}
 // A developer, a viewer and the shared token see no Set up control anywhere.
 for(const who of [{user:'dev',role:'dev'},{user:'viewer',role:'viewer'},{token:true,user:'',role:''}]){
  const {dom,state,errors}=page(who),w=dom.window,doc=w.document;await settle();
  w.eval(who.token?"COOKIE=false;USER='';ROLE='';TOKEN='fixture';chatLoad()":`COOKIE=true;USER='${who.user}';ROLE='${who.role}';TOKEN='';chatLoad()`);await settle();
  assert(!doc.querySelector('#chat-fail [data-gateway-setup]'),(who.user||'token')+' sees Set up in Chat');
  w.location.hash='#settings/connections';await settle();
  assert(!doc.querySelector('#set-connections [data-gateway-setup]'),(who.user||'token')+' sees Change in Connections');
  w.eval('gatewaySheet()');await settle();assert(!doc.querySelector('dialog.sheet'),(who.user||'token')+' opened the dialog');
  assert(!state.posts.some(p=>String(p.action).startsWith('gateway_')),'a non-owner sent a gateway write');
  assert(!errors.length,errors.join('\n'));dom.window.close()}
 console.log('dash_gateway: ok',phone?'phone':'desktop',process.env.DASH_UI_THEME||'light');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
