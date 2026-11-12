// A Linear issue (agentd issue sync-linear, #464) on the Issues board and its
// item page: its card links to #issues/linear:TEAM-N and shows TEAM-N, its page
// opens from that address, links to the issue's https url in Linear (never a
// GitHub address, never a non-https url), and asks no text from GitHub. A GitHub
// issue beside it keeps its GitHub link. Run in every mode:
// DASH_UI_DOM_MODULE=/path/to/jsdom DASH_UI_PHONE=0|1 DASH_UI_THEME=light|dark node testdata/dash_linear.cjs dash.html
const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const now=new Date().toISOString(),url='https://linear.app/example/issue/ENG-12/fix-it';
const lin={ref:'linear:ENG-12',repo:'linear:ENG',number:12,title:'Linear issue twelve',state:'OPEN',labels:'bug',url,updated:now,handoffs:[],prs:[]};
const bad={ref:'linear:OPS-3',repo:'linear:OPS',number:3,title:'Odd url',state:'OPEN',url:'javascript:alert(1)',updated:now,handoffs:[],prs:[]};
const gh={ref:'acme/repo#3',repo:'acme/repo',number:3,title:'GitHub issue',state:'OPEN',updated:now,handoffs:[],prs:[]};
const dash={user:'alice',role:'owner',now,handoff_list:[],sessions:[],done:[],waiting:[],claims:[],messages:[]};
const errors=[],asked=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Could not parse CSS|Not implemented:.*(scroll|navigation)/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{url:'http://127.0.0.1:21620/#issues?view=all',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('dash-token','fixture');w.localStorage.setItem('dash-theme',process.env.DASH_UI_THEME||'light');
 w.matchMedia=q=>({matches:process.env.DASH_UI_PHONE==='1'&&q.includes('max-width'),addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:x=>x};w.scrollTo=()=>{};
 w.fetch=async(u0)=>{const u=new URL(u0,w.location.href);let body={};asked.push(u.pathname+u.search);
  if(u.pathname==='/api/auth')return {ok:true,status:204};
  if(u.pathname==='/api/dash')body=dash;
  else if(u.pathname==='/api/issues')body={issues:[lin,bad,gh],closed_total:0,closed_shown:0};
  else if(u.pathname==='/api/issue'){const ref=u.searchParams.get('ref'),it=[lin,bad,gh].find(x=>x.ref===ref);if(!it)return {ok:false,status:404,json:async()=>({}),text:async()=>'no PR or issue '+ref};
   const {handoffs,prs,...issue}=it;body={kind:'issue',ref,title:it.title,issue,issues:[issue],tree:[],prs:[]}}
  else if(u.pathname==='/api/issuetext')body={ref:u.searchParams.get('ref'),text:'GitHub text'};
  else if(u.pathname==='/api/chat')body={chats:[],roles:[],gateway_ready:false};
  return {ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)}}}});
const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,25)),settle=async()=>{for(let i=0;i<5;i++)await tick()};
(async()=>{
 await settle();assert(!errors.length,errors.join('\n'));
 // The board: a card per issue, the Linear one linking to its own item page.
 const page=doc.getElementById('page-work');assert(page,'no Issues page');
 const card=[...page.querySelectorAll('a')].find(a=>a.getAttribute('href')==='#issues/linear:ENG-12');
 assert(card,'no card links to #issues/linear:ENG-12: '+page.textContent.slice(0,400));
 assert(page.textContent.includes('Linear issue twelve'),'the Linear issue is not on the board');
 assert(page.textContent.includes('ENG-12'),'the card does not show ENG-12');
 assert(!page.textContent.includes('#undefined')&&!/#\s*Linear issue/.test(page.textContent),'a GitHub-style number on the Linear card');
 assert([...page.querySelectorAll('a')].some(a=>a.getAttribute('href')==='#issues/acme/repo/3'),'the GitHub issue lost its card link');
 for(const a of doc.querySelectorAll('a[href]'))assert(!/github\.com\/linear:/.test(a.getAttribute('href'))&&!/^javascript:/i.test(a.getAttribute('href')),'bad link '+a.getAttribute('href'));
 // Its item page, from that address.
 w.location.hash='#issues/linear:ENG-12';await settle();
 const det=doc.getElementById('issue-detail');
 assert(asked.includes('/api/issue?ref=linear%3AENG-12'),'the item page did not ask for linear:ENG-12: '+asked.join(' '));
 assert(det.textContent.includes('Linear issue twelve'),'the item page lacks the title: '+det.textContent.slice(0,300));
 assert(!/not valid/.test(det.textContent),'the address was refused');
 const out=[...det.querySelectorAll('a')].find(a=>a.textContent==='On Linear');
 assert(out&&out.getAttribute('href')===url,'no On Linear link to its url');
 assert(![...det.querySelectorAll('a')].some(a=>/GitHub/.test(a.textContent)),'a GitHub link on a Linear issue');
 assert(!asked.some(x=>x.startsWith('/api/issuetext')),'asked GitHub for a Linear issue\'s text');
 const note=det.querySelector('.linear-text');assert(note&&note.querySelector('a').getAttribute('href')===url,'no note that the text stays in Linear');
 // A url that is not https is not made a link.
 w.location.hash='#issues/linear:OPS-3';await settle();
 const odd=[...det.querySelectorAll('a')].find(a=>a.textContent==='On Linear');
 assert(!odd||!odd.hasAttribute('href'),'a javascript: url became a link');
 // A GitHub issue still opens on GitHub and has its text read.
 w.location.hash='#issues/acme/repo/3';await settle();
 const ghl=[...det.querySelectorAll('a')].find(a=>a.textContent==='On GitHub');
 assert(ghl&&ghl.getAttribute('href')==='https://github.com/acme/repo/issues/3','the GitHub issue lost its GitHub link');
 assert(asked.some(x=>x.startsWith('/api/issuetext?ref=acme')),'the GitHub issue\'s text was not read');
 assert(!errors.length,errors.join('\n'));
 console.log('dash_linear: ok',process.env.DASH_UI_PHONE||'0',process.env.DASH_UI_THEME||'light');
 w.close();
})().catch(e=>{console.error(e);process.exit(1)});
