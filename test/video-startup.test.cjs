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
test('startup changes preserve LIVE/auth/download and automatic pagination source contracts',()=>{
 const baseline=execFileSync('git',['show','b78f2b1:index.html'],{cwd:root,encoding:'utf8',maxBuffer:4e6});
 for(const name of ['frommApiRequest','resolveAgoraJoinArgs','requestViewerToken','renewLiveToken','liveEncryptionCandidates','subscribeLiveUser','connectAgoraLive','resumeLiveAudio','stopLivePlayback','downloadReplayStream','downloadChannelVideo','downloadReplayPost','rewriteReplayMediaPlaylist','replaySignedUrl','replayAuthParams','resolveReplayMediaPlaylist','bindVideoListAuto','loadReplayCenter','loadChannelVideos','fetchChannelVideoDetail','fetchReplayPostDetail'])assert.equal(fn(name),fn(name,baseline),name);
 for(const file of ['web-native-live.js','web-live-controls.js','web-live-pip.js','web-live-chat-probe.js'])assert.equal(fs.readFileSync(path.join(root,file),'utf8'),execFileSync('git',['show',`b78f2b1:${file}`],{cwd:root,encoding:'utf8'}),file);
 assert.equal(execFileSync('git',['diff','b78f2b1','--','native-live/','chrome_extension/'],{cwd:root,encoding:'utf8'}),'');
});
