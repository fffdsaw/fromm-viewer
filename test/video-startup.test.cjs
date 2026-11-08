'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const path=require('node:path'),root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const fn=(name,source=html)=>source.match(new RegExp('^(?:async )?function '+name+'\\([^]*?^}', 'm'))[0];
function fixture(observer=true){
 const requests=[],observers=[];
 const images=[-300,1000,90,5000].map((top,i)=>({isConnected:true,dataset:{videoThumb:'https://fixture.test/'+i},getBoundingClientRect:()=>({top,bottom:top+100}),set src(url){requests.push({i,url,priority:this.fetchPriority});}}));
 class Observer{constructor(callback,options){this.callback=callback;this.options=options;this.targets=new Set();observers.push(this);}observe(img){this.targets.add(img);}unobserve(img){this.targets.delete(img);}disconnect(){this.disconnected=true;}}
 const window={innerHeight:900};if(observer)window.IntersectionObserver=Observer;
 const c=vm.createContext({window,document:{querySelectorAll:()=>images.filter(img=>img.dataset.videoThumb)},IntersectionObserver:Observer});
 vm.runInContext('const videoListThumbnails={observer:null};'+fn('bindVideoListThumbnails'),c);
 return {c,images,requests,observers};
}
test('visible thumbnails precede look-ahead; far thumbnails stay unloaded and rerenders do not reload',()=>{
 const h=fixture();h.c.bindVideoListThumbnails();
 assert.deepEqual(h.requests,[{i:2,url:'https://fixture.test/2',priority:'high'}]);
 const observer=h.observers[0];assert.equal(observer.options.rootMargin,'240px 0px');
 observer.callback([{target:h.images[1],isIntersecting:true,boundingClientRect:{top:1000,bottom:1100}}]);
 assert.equal(h.requests[1].priority,'low');assert.equal(h.requests.some(r=>r.i===3),false);
 h.images[3].getBoundingClientRect=()=>({top:80,bottom:180});
 h.c.bindVideoListThumbnails();assert.equal(observer.disconnected,true);
 assert.deepEqual(h.requests.map(r=>r.i),[2,1,3]);
});
test('observer-free browsers retain lazy loading and removed cards never start requests',()=>{
 const h=fixture(false);h.images[2].isConnected=false;h.c.bindVideoListThumbnails();
 // The fallback keeps native lazy loading; no observer or scroll handler is required.
 assert.equal(h.observers.length,0);assert.equal(h.images[3].loading,'lazy');
 assert.equal(h.requests.some(r=>r.i===2),false);
});
test('pagination cleanup restarts pending thumbnails even when the terminal page has no target',()=>{
 const h=fixture();h.c.clearTimeout=clearTimeout;h.c.channelVideoSession=()=>()=>true;
 h.c.state={filter:'live',live:{centerMode:'replay',replayFilter:'all'}};
 h.c.document.querySelector=()=>null;
 vm.runInContext('const videoListAuto={observer:null,timer:null,scope:""};'+fn('disconnectVideoListAuto')+fn('bindVideoListAuto'),h.c);
 h.c.bindVideoListThumbnails();const original=h.observers.at(-1);
 h.c.bindVideoListAuto('replay','all');
 assert.equal(original.disconnected,true);
 assert.notEqual(h.observers.at(-1),original);assert.ok(!h.observers.at(-1).disconnected);
 assert.ok(h.observers.at(-1).targets.has(h.images[3]),'distant image remains observed after finally rebind');
 h.images[3].getBoundingClientRect=()=>({top:100,bottom:200});
 h.observers.at(-1).callback([{target:h.images[3],isIntersecting:true,boundingClientRect:{top:100,bottom:200}}]);
 assert.ok(h.requests.some(r=>r.i===3));
});
// Channel selection now follows a shared first-valid rule; paging behavior is exercised in browser tests.
test('startup changes preserve LIVE/auth/download and automatic pagination source contracts',()=>{
 const baseline=execFileSync('git',['show','b78f2b1:index.html'],{cwd:root,encoding:'utf8',maxBuffer:4e6});
 for(const name of ['frommApiRequest','resolveAgoraJoinArgs','requestViewerToken','renewLiveToken','liveEncryptionCandidates','subscribeLiveUser','connectAgoraLive','resumeLiveAudio','stopLivePlayback','downloadReplayStream','rewriteReplayMediaPlaylist','replaySignedUrl','replayAuthParams','resolveReplayMediaPlaylist','bindVideoListAuto','fetchChannelVideoDetail','fetchReplayPostDetail'])assert.equal(name==='bindVideoListAuto'?fn(name).replace('  bindVideoListThumbnails();\n',''):fn(name),fn(name,baseline),name);
 const slice=(s,start,end)=>s.slice(s.indexOf(start),s.indexOf(end));
 for(const file of ['web-native-live.js','web-live-pip.js','web-live-chat-probe.js']){
  const current=fs.readFileSync(path.join(root,file),'utf8'),previous=execFileSync('git',['show',`b78f2b1:${file}`],{cwd:root,encoding:'utf8'});
  if(file==='web-native-live.js'){
   assert.equal(slice(current,'  function call(','  window.addEventListener'),slice(previous,'  function call(','  window.addEventListener'),'Native bridge requests preserved');
   const frame=s=>slice(s,"    if (value?.type === 'frame'",'  const originalEncryption').replace('max-height:75vh','max-height:100%');
   assert.equal(frame(current),frame(previous),'Native receive/decode/ACK unchanged except image fit');
  }else if(file==='web-live-chat-probe.js')assert.equal(slice(current,'  async function sendNormalComment','  async function probe'),slice(previous,'  async function sendNormalComment','  async function probe'),'fresh permission check and single-POST protocol preserved');
  else assert.equal(current,previous,file);
 }

 // LIVE controls may evolve visually; lifecycle wrappers/readiness wiring stay fixed.
 const controls=fs.readFileSync(path.join(root,'web-live-controls.js'),'utf8'),oldControls=execFileSync('git',['show','b78f2b1:web-live-controls.js'],{cwd:root,encoding:'utf8'});
 const marker='  const originalRender=renderLiveView';assert.ok(controls.includes(marker)&&oldControls.includes(marker));
 assert.equal(controls.slice(controls.indexOf(marker)),oldControls.slice(oldControls.indexOf(marker)),'LIVE lifecycle and receive readiness wiring');
 assert.equal(execFileSync('git',['diff','b78f2b1','--','native-live/','chrome_extension/'],{cwd:root,encoding:'utf8'}),'');
});

test('Replay and Channel share progress and distinguish a confirmed file from browser handoff',async()=>{
 const state={live:{}}, channelVideoState={requestSeq:1}, transitions=[];
 const post={id:'clip',title:'Clip',_streamUrl:'https://fixture.test/clip.m3u8'};
 let sink, write;
 const alerts=[];
 const context=vm.createContext({
  state,channelVideoState,channelVideoSession:()=>()=>true,
  createReplayDownloadSink:async()=>sink, fetchChannelVideoDetail:async()=>post, fetchReplayPostDetail:async()=>post,
  downloadReplayStream:async(url,target,progress)=>{assert.equal(url,post._streamUrl);assert.equal(target,sink);progress(1,2);await write;},
  setDownloadButtonFeedback:(_button,phase='idle',ratio)=>transitions.push([phase,ratio]),
  window:{alert:message=>alerts.push(message)},safeErrorDetail:String
 });
 vm.runInContext('const postDownloadQueue=[],postDownloadKeys=new Set();let postDownloadRunning=false;',context);
 for(const name of ['queuePostDownload','drainPostDownloads','runReplayPostDownload','runChannelVideoDownload','downloadReplayPost','downloadChannelVideo']) vm.runInContext(fn(name),context);
 for(const name of ['downloadReplayPost','downloadChannelVideo']){
  const button={disabled:false};
  const run=()=>context[name](post,button);
  sink=null;
  await run();
  assert.deepEqual(transitions.splice(0),[['picker',undefined],['idle',undefined]]);
  assert.equal(button.disabled,false);

  let finish;
  sink={writable:{}};
  write=new Promise(resolve=>{finish=resolve;});
  const pending=run();
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(transitions.splice(0),[['picker',undefined],['active',undefined],['active',.5]]);
  assert.equal(button.disabled,true);
  finish();
  await pending;
  assert.deepEqual(transitions.splice(0),[['done',undefined]]);
  assert.equal(button.disabled,false);

  sink={chunks:[]};
  await run();
  assert.deepEqual(transitions.splice(0),[['picker',undefined],['active',undefined],['active',.5],['handed-off',undefined]]);
 }
 assert.deepEqual(alerts,[]);
});
