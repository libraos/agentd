// Runs the page tests the way agentd's own test suite does: the three plain
// checks, then the DOM suite in every mode. jsdom comes from DASH_UI_DOM_MODULE
// or from this directory's node_modules (npm install).
'use strict';
const {spawnSync}=require('child_process'),path=require('path');
process.chdir(__dirname);
if(!process.env.DASH_UI_DOM_MODULE){try{process.env.DASH_UI_DOM_MODULE=path.dirname(require.resolve('jsdom/package.json'))}catch(e){console.error('jsdom is not installed: npm install, or set DASH_UI_DOM_MODULE');process.exit(2)}}
const run=(script,env)=>{const r=spawnSync(process.execPath,[script,'dash.html'],{stdio:'inherit',env:{...process.env,...env}});if(r.status!==0){console.error(`${script} failed`,env||'');process.exit(r.status||1)}};
for(const s of ['dash_ui','dash_openpr','dash_chat'])run(`testdata/${s}.cjs`);
for(const phone of ['0','1'])for(const theme of ['light','dark'])for(const s of ['dash_dom','dash_voice','dash_changes','dash_checks','dash_log','dash_search','dash_notify','dash_newtask','dash_marks','dash_env','dash_filter','dash_keys','dash_templates','dash_files','dash_filter_marks','dash_linear','dash_triggers','dash_connect','dash_install','dash_terminal','dash_shell','dash_workspace','dash_inbox','dash_chat_sources','dash_insights','dash_team','dash_settings','dash_setup','dash_layout','dash_preload','dash_taskactions','dash_appwatchdog','dash_app','dash_appnewtask','dash_appsidebar','dash_apponboard'])run(`testdata/${s}.cjs`,{DASH_UI_PHONE:phone,DASH_UI_THEME:theme});
console.log('ui: all page tests passed');
