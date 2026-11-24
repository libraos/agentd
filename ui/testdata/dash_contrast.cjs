// Contrast of the colour tokens (layout review, section N): reads the light and dark
// token blocks and the few rules built on them, and checks the ratios axe
// color-contrast measured: muted, red and green text on the selected-row background,
// the Agents list's latest-activity line, the rail's Help label, the keyboard focus
// ring (3:1), the chosen segment of a dark segmented control, the dark dialog
// backdrop and the Overview chart's member-host bars.
// node testdata/dash_contrast.cjs dash.html
const fs=require('fs'),assert=require('assert');
const page=fs.readFileSync(process.argv[2]||__dirname+'/../dash.html','utf8');
const css=page.match(/<style>([\s\S]*?)<\/style>/)[1];
const block=re=>{const m=css.match(re);assert(m,'token block missing: '+re);const t={};for(const [,k,v] of m[1].matchAll(/--([\w-]+):([^;]+);/g))t[k]=v.trim();return t};
const light=block(/:root\{([\s\S]*?)\n\}/);
const darkMedia=block(/:root:not\(\[data-theme="light"\]\)\{([\s\S]*?)\n\}\}/),darkPick={...light,...block(/:root\[data-theme="dark"\]\{([\s\S]*?)\n\}/)};
const dark={...light,...darkMedia};
// The dark theme picked in Settings and the system's dark theme are the same tokens.
for(const k of Object.keys(darkMedia))assert.equal(darkPick[k],darkMedia[k],'dark token --'+k+' differs between the two dark blocks');
const hex=h=>{h=h.replace('#','');if(h.length===3)h=[...h].map(c=>c+c).join('');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16))};
const lum=rgb=>{const c=rgb.map(v=>v/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const over=(fg,a,bg)=>fg.map((v,i)=>v*a+bg[i]*(1-a));
// col resolves a token to [rgb, alpha]: a hex, var(--x), or color-mix(in srgb,var(--x) N%,transparent|#hex).
const col=(t,v)=>{v=v.trim();let m;
 if(v.startsWith('#'))return [hex(v),1];
 if((m=v.match(/^var\(--([\w-]+)\)$/)))return col(t,t[m[1]]);
 if((m=v.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/)))return [[+m[1],+m[2],+m[3]],+m[4]];
 if((m=v.match(/^color-mix\(in srgb,(.+?) (\d+)%,(.+)\)$/))){const [a]=col(t,m[1]),p=m[2]/100;if(m[3]==='transparent')return [a,p];const [b]=col(t,m[3]);return [a.map((x,i)=>x*p+b[i]*(1-p)),1]}
 throw new Error('cannot read colour '+v)};
const on=(t,fg,bg)=>{const [b]=col(t,'var(--'+bg+')'),[f,a]=col(t,fg.startsWith('#')||fg.startsWith('color-mix')?fg:'var(--'+fg+')');return ratio(over(f,a,b),b)};
const rule=sel=>{const i=css.indexOf(sel+'{');assert(i>=0,'rule missing: '+sel);return css.slice(i+sel.length+1,css.indexOf('}',i))};
const themes={light,dark};
for(const [name,t] of Object.entries(themes)){
 const need=(fg,bg,min,what)=>{const r=on(t,fg,bg);assert(r>=min,`${name}: ${what} is ${r.toFixed(2)}:1 (${fg} on --${bg}), needs ${min}:1`)};
 // Text on the selected-row background: Agents rows, Inbox, Changes files, search results.
 for(const fg of ['fg','mute','red','green'])need(fg,'sel',4.5,'--'+fg+' text on the selected row');
 // Muted text on the panels the Agents list and the rail sit on.
 for(const bg of ['sidebar','panel','bg','hover'])need('mute',bg,4.5,'muted text on --'+bg);
 // Muted text (a view's count) inside the chosen segment of a segmented control.
 need('mute','seg-on',4.5,'muted text on the chosen segment');
 // Status colours on the panel (Diagnostics fail and warn among them).
 for(const fg of ['red','amber','green'])need(fg,'panel',4.5,'--'+fg+' on the panel');
 // The keyboard focus ring: 3:1 against every surface it is drawn on.
 for(const bg of ['bg','panel','sidebar','sel','hover'])need('focus',bg,3,'the focus ring on --'+bg);
 // Member-host bars are lighter than the server's solid bars in both themes, as the legend says.
 for(const c of ['accent','green','red']){const m=css.match(new RegExp('fill:color-mix\\(in srgb,var\\(--'+c+'\\) (\\d+)%,(#[0-9a-f]+)\\)'));assert(m,'member-host fill for --'+c);
  const [solid]=col(t,'var(--'+c+')'),[member]=col(t,'color-mix(in srgb,var(--'+c+') '+m[1]+'%,'+m[2]+')');
  assert(lum(member)>lum(solid),`${name}: member-host ${c} bar is not lighter than the solid bar`)}
}
// Dark: the chosen segment stands out from its group; the dialog backdrop dims the page.
assert(on(dark,'seg-on','sunk')>=1.3,'dark: the chosen segment is too close to its group');
assert(col(dark,dark.scrim)[1]>=.65,'dark: the dialog backdrop barely dims the page');
assert(col(light,light.scrim)[1]<=.5,'light: the backdrop changed');
// The rules that made the failures: none dims text by opacity or uses --faint for text.
assert(!/color:var\(--faint\)/.test(rule('.ag-act')),'.ag-act uses --faint');
assert(!/opacity/.test(rule('.rail-aux')),'.rail-aux is dimmed by opacity');
assert(!/opacity/.test(rule('.ov-member')),'.ov-member is drawn by opacity');
assert(/var\(--member-line\)/.test(rule('.ov-member')),'.ov-member outline is not themed');
assert(/background:var\(--seg-on\)/.test(rule('.views button.on')),'.views button.on does not use --seg-on');
assert(/color:var\(--fg\)/.test(rule('.ov-range button[aria-pressed="true"]')),'the pressed range button keeps accent text on --sel');
for(const sel of [':focus-visible','button:focus-visible,a:focus-visible,summary:focus-visible'])assert(/outline:3px solid var\(--focus\)/.test(rule(sel)),sel+' does not use --focus');
assert(/color:var\(--red\)/.test(rule('.doctor-fail'))&&/color:var\(--amber\)/.test(rule('.doctor-warn')),'Diagnostics fail/warn colours');
// App mode (libraos-core app) draws its buttons' focus ring from its own tokens: 3:1 on its surfaces.
const appBlock=re=>{const m=css.match(re);assert(m,'app token block missing: '+re);const t={};for(const [,k,v] of m[1].matchAll(/--([\w-]+):([^;]+);/g))t[k]=v.trim();return t};
const appLight=appBlock(/\.app-shell\{([^}]*)\}/),appDark={...appLight,...appBlock(/:root\[data-theme="dark"\] \.app-shell\{([^}]*)\}/)};
assert(/outline:2px solid var\(--o-mfg\)/.test(rule('.app-shell button:focus-visible')),'app buttons do not use a 3:1 focus ring');
for(const [name,t] of Object.entries({appLight,appDark}))for(const bg of ['o-bg','o-card','o-sidebar','o-wsb','o-muted']){const r=ratio(hex(t['o-mfg']),hex(t[bg]));assert(r>=3,`${name}: app focus ring on --${bg} is ${r.toFixed(2)}:1`)}
console.log('dash_contrast: ok');
