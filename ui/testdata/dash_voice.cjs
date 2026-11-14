// Real composer DOM and embedded Chat code, with synthetic media and transport.
// Run via TestDashUIDOM with DASH_UI_DOM_MODULE pointing at an installed jsdom.
const fs=require('fs'),assert=require('assert'),vm=require('vm');
const {JSDOM,VirtualConsole}=require(process.env.DASH_UI_DOM_MODULE||'jsdom');
const page=fs.readFileSync(process.argv[2],'utf8'),vc=new VirtualConsole();
const dom=new JSDOM(page,{url:'http://vpn.test/#chat',runScripts:'outside-only',virtualConsole:vc});
const w=dom.window,$=id=>w.document.getElementById(id),run=code=>vm.runInContext(code,dom.getInternalVMContext());
const timers=new Map(),intervals=new Map(),requests=[],recorders=[];
let next=1,now=0,stopped=0,micCalls=0,available=true,reply={text:'spoken words'},finishUpload,holdUpload=false;
const ok=body=>({ok:true,status:200,json:async()=>body}),tick=()=>new Promise(resolve=>setImmediate(resolve));
Object.assign(w,{$,TOKEN:'fixture',COOKIE:false,ROLE:'owner',CONNECTED:true,PHONE:{matches:process.env.DASH_UI_PHONE==='1'},ROUTE:{item:'chat'},TEAM:{activityReq:0},CSS:{escape:x=>x},CAN:()=>!!w.TOKEN||w.COOKIE&&!!w.ROLE&&w.ROLE!=='viewer',auth:()=>({Authorization:'Bearer fixture'}),writeReason:()=>'',toast(){},dashPage(){},unlockSheet(){},parseRoute:()=>({item:'chat'}),
 setTimeout(fn,ms){const id=next++;timers.set(id,{fn,ms});return id},clearTimeout(id){timers.delete(id)},setInterval(fn,ms){const id=next++;intervals.set(id,{fn,ms});return id},clearInterval(id){intervals.delete(id)},
 fetch:async(url,opts={})=>{requests.push({url,opts});assert.equal(url,'/api/chat/transcribe','voice created or sent a conversation');assert.equal(opts.headers.Authorization,'Bearer fixture');if(opts.method==='POST'){assert(opts.body instanceof w.FormData);assert(opts.body.get('file').size>0);if(holdUpload)return new Promise(resolve=>{finishUpload=resolve});return reply.error?{ok:false,status:422,json:async()=>reply}:ok(reply)}return ok({available})}
});
w.Date.now=()=>now;
const stream=()=>({getTracks:()=>[{stop(){stopped++}}]});
const media={getUserMedia:async opts=>{assert.equal(opts.audio,true);micCalls++;return stream()}};
Object.defineProperty(w.navigator,'mediaDevices',{configurable:true,value:media});
Object.defineProperty(w,'isSecureContext',{configurable:true,value:true,writable:true});
class Recorder {
 static isTypeSupported(t){return t==='audio/webm;codecs=opus'}
 constructor(stream,opts={}){this.state='inactive';this.mimeType=opts.mimeType;this.stops=0;recorders.push(this)}
 start(){this.state='recording'}
 stop(){assert.notEqual(this.state,'inactive');this.state='inactive';this.stops++;queueMicrotask(()=>{this.ondataavailable({data:new w.Blob(['audio'],{type:this.mimeType})});this.onstop()})}
}
w.MediaRecorder=Recorder;
run(page.split('\n').find(l=>l.startsWith('function el(')));
run(page.split('\n').find(l=>l.startsWith('function modelName(')));
run(page.split('// region:chat\n')[1].split('// end:chat')[0]);
const posts=()=>requests.filter(x=>x.opts.method==='POST');
const ready=()=>run("CHAT.id=null;CHAT.draft='writer';CHAT.chat={role:'writer'};CHAT.loaded=true;CHAT.locked=false;CHAT.gatewayReady=true;CHAT.creating=false;CHAT.uploading=false;CHAT.reclaiming=false;CHAT.busy=false;CHAT.live=null;chatRenderThread()");
const choose=file=>{Object.defineProperty($('chat-voice-file'),'files',{configurable:true,value:file?[file]:[]});$('chat-voice-file').dispatchEvent(new w.Event('change'))};
(async()=>{try{
 ready();await tick();assert(!$('chat-voice').hidden);assert.equal(requests.length,1);
 assert($('chat-voice').title.includes('4 minutes'));assert($('chat-voice').getAttribute('aria-label').includes('4 minutes'));
 assert.equal(w.getComputedStyle($('chat-voice')).minWidth,'44px');assert.equal(w.getComputedStyle($('chat-voice')).minHeight,'44px');
 $('chat-input').value='Typed';$('chat-voice').click();await tick();
 assert.equal(recorders.length,1);assert.equal($('chat-voice').getAttribute('aria-pressed'),'true');assert($('chat-voice-label').textContent.includes('Recording 0:00'));assert(!$('chat-input').disabled);assert($('chat-send').disabled);
 $('chat-form').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(posts().length,0);
 now=65000;run('chatVoiceState()');assert($('chat-voice-label').textContent.includes('1:05'));
 $('chat-input').value+=' while recording';holdUpload=true;$('chat-voice').click();await tick();
 assert.equal(posts().length,1);assert.equal(recorders[0].stops,1);assert(stopped>0);assert.equal(timers.size,0);assert($('chat-voice-label').textContent.includes('Transcribing'));
 $('chat-input').value+=' and waiting';finishUpload(ok({text:'<b>spoken words</b>'}));await tick();
 assert.equal($('chat-input').value,'Typed while recording and waiting <b>spoken words</b>');assert.equal($('chat-input').selectionStart,$('chat-input').value.length);assert.equal(run('CHAT.msgs.length'),0);assert.equal(run('CHAT.id'),null);assert(!$('chat-composer').querySelector('b'));assert(!$('chat-send').disabled);holdUpload=false;
 // Four-minute deadline stops once and includes the final dataavailable chunk.
 assert($('chat-voice').title.includes('4 minutes'));
 await run('chatVoiceStart()');const cap=[...timers.values()].find(x=>x.ms===240000);assert(cap);now+=240000;cap.fn();await tick();assert.equal(recorders.at(-1).stops,1);assert.equal(posts().length,2);assert.equal(timers.size,0);
 // Cancellation before and after permission grants never uploads.
 const beforeCancel=posts().length;await run('chatVoiceStart()');$('chat-voice-cancel').click();await tick();assert.equal(posts().length,beforeCancel);assert.equal(run('VOICE.op'),null);
 let grant;media.getUserMedia=()=>new Promise(resolve=>{grant=resolve});const pending=run('chatVoiceStart()');await run('chatVoiceStart()');$('chat-voice-cancel').click();const beforeStop=stopped;grant(stream());await pending;assert(stopped>beforeStop);assert.equal(posts().length,beforeCancel);media.getUserMedia=async()=>stream();
 // Permission refusal and recorder failure are readable and release resources.
 media.getUserMedia=async()=>{throw new w.DOMException('denied','NotAllowedError')};await run('chatVoiceStart()');assert($('chat-voice-error').textContent.includes('permission was denied'));assert.equal(run('VOICE.op'),null);
 media.getUserMedia=async()=>stream();await run('chatVoiceStart()');recorders.at(-1).onerror();await tick();assert($('chat-voice-error').textContent.includes('recording failed'));assert.equal(posts().length,beforeCancel);
 // Recording also stops on page exit, lost access and the streaming byte limit.
 for(const change of ["window.dispatchEvent(new Event('pagehide'))","CHAT.chat.archived=true;chatComposerState()","CONNECTED=false;chatComposerState()","VOICE.available=false;chatComposerState()"]){
  w.CONNECTED=true;ready();run('VOICE.available=true');await run('chatVoiceStart()');const recorder=recorders.at(-1),wasStopped=stopped;run(change);await tick();assert(stopped>wasStopped);assert.equal(recorder.stops,1);assert.equal(run('VOICE.op'),null);assert.equal(posts().length,beforeCancel);assert.equal(timers.size,0);
 }
 w.CONNECTED=true;ready();run('VOICE.available=true');await run('chatVoiceStart()');recorders.at(-1).ondataavailable({data:new w.Blob([new Uint8Array(50*1024*1024+1)])});await tick();assert($('chat-voice-error').textContent.includes('50 MB'));assert.equal(posts().length,beforeCancel);
 // Insecure pages use the picker even when media APIs happen to exist.
 w.isSecureContext=false;run('chatComposerState()');let picks=0;$('chat-voice-file').click=()=>picks++;const beforeMic=micCalls;$('chat-voice').click();assert.equal(picks,1);assert.equal(micCalls,beforeMic);assert($('chat-voice').title.includes('HTTPS'));assert.equal($('chat-voice-file').accept,'audio/*');assert($('chat-voice-file').hasAttribute('capture'));
 w.isSecureContext=true;Object.defineProperty(w.navigator,'mediaDevices',{configurable:true,value:undefined});run('chatComposerState()');$('chat-voice').click();assert.equal(picks,2);assert.equal(run('VOICE.op'),null);Object.defineProperty(w.navigator,'mediaDevices',{configurable:true,value:media});w.isSecureContext=false;
 choose(null);assert.equal(run('VOICE.op'),null);const file=new w.File(['audio'],'recording.mp4',{type:'audio/mp4'});choose(file);await tick();assert.equal(posts().length,beforeCancel+1);assert.equal(posts().at(-1).opts.body.get('file').name,'recording.mp4');
 // Empty / oversized audio and server/network/empty-transcript errors preserve typing.
 const saved=$('chat-input').value,count=posts().length;
 choose(new w.File([],'empty.wav'));await tick();assert($('chat-voice-error').textContent.includes('No audio'));assert.equal(posts().length,count);
 choose(new w.File([new Uint8Array(8*1024*1024+1)],'large.wav'));await tick();assert($('chat-voice-error').textContent.includes('8 MB'));assert.equal(posts().length,count);
 for(const result of [{error:'No speech was heard'},{text:'   '}]){reply=result;choose(file);await tick();assert(!$('chat-voice-error').hidden);assert.equal($('chat-input').value,saved)}
 reply={text:'later'};const transport=w.fetch;w.fetch=async()=>{throw new w.TypeError('Failed to fetch')};choose(file);await tick();assert($('chat-voice-error').textContent.includes('server did not answer'));w.fetch=transport;
 // Cancel, new draft, logout, role loss and leaving the page discard late results.
 for(const change of ["chatVoiceCancel()","chatClear();CHAT.draft='another'","TOKEN='';COOKIE=false;chatAuthChanged()","TOKEN='';COOKIE=true;ROLE='viewer';chatComposerState()","ROUTE.item='inbox';window.dispatchEvent(new Event('hashchange'))"]){
  w.TOKEN='fixture';w.COOKIE=false;w.ROLE='owner';w.ROUTE.item='chat';ready();run('VOICE.available=true;VOICE.checked=true');$('chat-input').value='Keep';holdUpload=true;choose(file);await tick();const upload=posts().at(-1);run(change);assert(upload.opts.signal.aborted);const after=$('chat-input').value;finishUpload(ok({text:'must not appear'}));await tick();assert.equal($('chat-input').value,after);assert.equal(run('VOICE.op'),null);holdUpload=false;
 }
 w.TOKEN='fixture';w.COOKIE=false;w.ROLE='owner';w.ROUTE.item='chat';ready();available=false;run('VOICE.checked=false');await run('chatVoiceLoad()');assert($('chat-voice').hidden);const noVoice=posts().length;await run('chatVoiceStart()');choose(file);await tick();assert.equal(posts().length,noVoice);
 available=true;run('VOICE.checked=false');await run('chatVoiceLoad()');assert(!$('chat-voice').hidden);w.TOKEN='';w.COOKIE=true;w.ROLE='viewer';run('chatComposerState()');assert($('chat-voice').hidden);await run('chatVoiceStart()');choose(file);await tick();assert.equal(posts().length,noVoice);
 // Conversion uses offline mono rendering at 16 kHz for both picker and recorder.
 w.TOKEN='fixture';w.COOKIE=false;w.ROLE='owner';w.ROUTE.item='chat';ready();run('VOICE.available=true;VOICE.checked=true');reply={text:'converted'};
 const readBlob=blob=>new Promise((resolve,reject)=>{const reader=new w.FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsArrayBuffer(blob)});
 // jsdom has no Blob.arrayBuffer or Web Audio; stub decoding/rendering, test real encoding and upload.
 w.Blob.prototype.arrayBuffer=async function(){return new ArrayBuffer(5)};
 let duration=1.25,decodeError=false,decodeCount=0,renderCount=0,finishDecode,holdDecode=false;
 const decoded=()=>({duration,numberOfChannels:2,sampleRate:48000});
 class Offline {
  constructor(channels,length,rate){assert.equal(channels,1);assert.equal(rate,16000);this.length=length;this.destination={}}
  async decodeAudioData(bytes){decodeCount++;assert.equal(bytes.byteLength,5);if(decodeError)throw new Error('unsupported codec');if(holdDecode)return new Promise(resolve=>{finishDecode=resolve});return decoded()}
  createBufferSource(){const context=this;return {connect(dest){assert.equal(dest,context.destination)},start(){assert.equal(this.buffer.numberOfChannels,2)}}}
  async startRendering(){renderCount++;assert.equal(this.length,Math.ceil(duration*16000));const samples=new Float32Array(this.length);samples.set([-2,-1,-0.5,0,0.5,1,2]);return {getChannelData(channel){assert.equal(channel,0);return samples}}}
 }
 w.OfflineAudioContext=Offline;
 const checkWav=async upload=>{const audio=upload.opts.body.get('file');assert.equal(audio.name,'audio.wav');assert.equal(audio.type,'audio/wav');const bytes=Buffer.from(await readBlob(audio));assert.equal(bytes.length,44+Math.ceil(duration*16000)*2);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.readUInt32LE(4),bytes.length-8);assert.equal(bytes.toString('ascii',8,16),'WAVEfmt ');assert.equal(bytes.readUInt32LE(16),16);assert.equal(bytes.readUInt16LE(20),1);assert.equal(bytes.readUInt16LE(22),1);assert.equal(bytes.readUInt32LE(24),16000);assert.equal(bytes.readUInt32LE(28),32000);assert.equal(bytes.readUInt16LE(32),2);assert.equal(bytes.readUInt16LE(34),16);assert.equal(bytes.toString('ascii',36,40),'data');assert.equal(bytes.readUInt32LE(40),bytes.length-44);assert.deepEqual(Array.from({length:7},(_,i)=>bytes.readInt16LE(44+2*i)),[-32768,-32768,-16384,0,16384,32767,32767])};
 choose(file);await tick();await checkWav(posts().at(-1));
 w.isSecureContext=true;await run('chatVoiceStart()');assert($('chat-voice-label').textContent.includes('/ 4:00'));run('chatVoiceStop()');await tick();await checkWav(posts().at(-1));
 // The sent WAV controls the 8 MB cap; the original has a separate pre-decode cap.
 const large=new w.File([new Uint8Array(8*1024*1024+1)],'large.mp4',{type:'audio/mp4'});
 choose(large);await tick();await checkWav(posts().at(-1));
 let before=posts().length,decodes=decodeCount;
 const tooLarge=new w.File(['x'],'huge.mp4');Object.defineProperty(tooLarge,'size',{value:50*1024*1024+1});choose(tooLarge);await tick();assert.equal(decodeCount,decodes);assert.equal(posts().length,before);assert($('chat-voice-error').textContent.includes('50 MB'));
 duration=300;const renders=renderCount;choose(file);await tick();assert.equal(renderCount,renders);assert.equal(posts().length,before);assert($('chat-voice-error').textContent.includes('at most about 4 minutes'));duration=1.25;
 // Decode failure preserves the original name, type and bytes and exposes gateway errors.
 decodeError=true;reply={error:'only WAV audio is accepted by this provider'};choose(file);await tick();const original=posts().at(-1).opts.body.get('file');assert.equal(original.name,file.name);assert.equal(original.type,file.type);assert.equal(Buffer.from(await readBlob(original)).toString(),'audio');assert($('chat-voice-error').textContent.includes('only WAV audio is accepted'));
 before=posts().length;choose(large);await tick();assert.equal(posts().length,before);assert($('chat-voice-error').textContent.includes('8 MB'));decodeError=false;reply={text:'converted'};
 // Cancelling or changing identity while decode is pending must not upload later.
 for(const change of ['chatVoiceCancel()',"CHAT.draft='another'","CHAT.authSeq++"]){ready();holdDecode=true;choose(file);await tick();const count=posts().length;run(change);finishDecode(decoded());await tick();assert.equal(posts().length,count);run('chatVoiceCancel()');holdDecode=false}
 delete w.OfflineAudioContext;choose(file);await tick();assert.equal(posts().at(-1).opts.body.get('file').name,file.name);
 // A capability response from an old login must not expose voice for the next one.
 w.TOKEN='fixture';w.ROLE='owner';let capability;w.fetch=()=>new Promise(resolve=>{capability=resolve});run('VOICE.checked=false');const old=run('chatVoiceLoad()');run("TOKEN='';COOKIE=false;chatAuthChanged()");capability(ok({available:true}));await old;assert($('chat-voice').hidden);
 console.log('Voice DOM passed: editable draft, no send, cap, cancel, cleanup, fallback, errors, role and identity isolation ('+(w.PHONE.matches?'phone':'desktop')+')');
 }finally{dom.window.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
