'use strict';
// Pure manifest fixtures only. No Fromm credentials, account or media requests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
function fn(name, source = html) {
  const found = source.match(new RegExp('^(?:async )?function ' + name + '\\([^]*?^}', 'm'));
  assert.ok(found, `${name} exists`);
  return found[0];
}
function setup() {
  const c = vm.createContext({URL, URLSearchParams});
  for (const name of ['replayAuthParams', 'replaySignedUrl', 'replayManifestAttributes',
    'videoQualityLabel', 'replayVariantsFromMaster', 'replayVariantFromMaster']) vm.runInContext(fn(name), c);
  return c;
}
const base = 'https://cdn.example/artist/master.m3u8';
const emptyAuth = () => new URLSearchParams();
const master = (...entries) => '#EXTM3U\n' + entries.map(([attrs, uri]) => `#EXT-X-STREAM-INF:${attrs}\n${uri}`).join('\n');
const plain = value => JSON.parse(JSON.stringify(value));

test('HLS attribute parsing preserves quoted CODECS commas and normalizes attribute keys', () => {
  const c = setup();
  const attrs = c.replayManifestAttributes('BANDWIDTH=3200000,AVERAGE-BANDWIDTH=2500000,RESOLUTION=1080x1920,CODECS="avc1.640028,mp4a.40.2",AUDIO="group,with,commas",FRAME-RATE=29.970');
  assert.equal(attrs.BANDWIDTH, '3200000');
  assert.equal(attrs['AVERAGE-BANDWIDTH'], '2500000');
  assert.equal(attrs.RESOLUTION, '1080x1920');
  assert.equal(attrs.CODECS, 'avc1.640028,mp4a.40.2');
  assert.equal(attrs.AUDIO, 'group,with,commas');
  assert.equal(attrs['FRAME-RATE'], '29.970');
  assert.equal(c.replayManifestAttributes('bandwidth=1200000,codecs="avc1.4d401f,mp4a.40.2"').BANDWIDTH, '1200000');
});

test('explicit BANDWIDTH wins when AVERAGE-BANDWIDTH appears first', () => {
  const c = setup();
  const variants = c.replayVariantsFromMaster(master(
    ['AVERAGE-BANDWIDTH=500000,BANDWIDTH=4500000,RESOLUTION=1280x720', 'peak.m3u8'],
    ['AVERAGE-BANDWIDTH=3000000,RESOLUTION=1280x720', 'average.m3u8']
  ), base, emptyAuth());
  assert.deepEqual(plain(variants.map(v => v.bandwidth)), [4500000, 3000000]);
  assert.equal(new URL(variants[0].url).pathname, '/artist/peak.m3u8');
});

test('highest supplied resolution wins, then bandwidth and frame rate break ties', () => {
  const c = setup();
  const text = master(
    ['BANDWIDTH=8000000,RESOLUTION=640x360', '360.m3u8'],
    ['BANDWIDTH=2600000,RESOLUTION=1280x720', '720.m3u8'],
    ['BANDWIDTH=2400000,RESOLUTION=1920x1080,FRAME-RATE=30', '1080-30.m3u8'],
    ['BANDWIDTH=2400000,RESOLUTION=1920x1080,FRAME-RATE=60', '1080-60.m3u8'],
    ['BANDWIDTH=2800000,RESOLUTION=1920x1080,FRAME-RATE=24', '1080-high.m3u8']
  );
  const variants = c.replayVariantsFromMaster(text, base, emptyAuth());
  assert.deepEqual(plain(variants.map(v => new URL(v.url).pathname.split('/').at(-1))),
    ['1080-high.m3u8', '1080-60.m3u8', '1080-30.m3u8', '720.m3u8', '360.m3u8']);
  assert.equal(c.replayVariantFromMaster(text, base, emptyAuth()), variants[0].url, 'legacy wrapper still returns best URL');
  assert.equal(variants[1].frameRate, 60);
  assert.equal(variants[0].attrs.RESOLUTION, '1920x1080');
});

test('portrait options use the short dimension and single 540p does not fabricate tiers', () => {
  const c = setup();
  const portrait = c.replayVariantsFromMaster(master(
    ['BANDWIDTH=2000000,RESOLUTION=720x1280', '720.m3u8'],
    ['BANDWIDTH=4000000,RESOLUTION=1080x1920', '1080.m3u8']
  ), base, emptyAuth());
  assert.deepEqual(plain(portrait.map(v => [v.width, v.height, v.label])), [[1080, 1920, '1080p'], [720, 1280, '720p']]);
  assert.equal(c.videoQualityLabel(portrait[0]), '1080p');
  const single = c.replayVariantsFromMaster(master(['BANDWIDTH=1200000,RESOLUTION=960x540', '540.m3u8']), base, emptyAuth());
  assert.equal(single.length, 1);
  assert.equal(single[0].label, '540p');
  assert.equal(c.replayVariantFromMaster('#EXTM3U\n#EXTINF:4,\nsegment.ts\n#EXT-X-ENDLIST', base, emptyAuth()), '');
  assert.deepEqual(plain(c.replayVariantsFromMaster('#EXTM3U\n#EXTINF:4,\nsegment.ts', base, emptyAuth())), []);
});

test('relative rendition URLs retain canonical CloudFront authentication and own URI parameters', () => {
  const c = setup();
  const signed = base + '?CloudFront-Policy=parent-policy&CloudFront-Signature=a%2Bb%2F%3D&CloudFront-Key-Pair-Id=key-id&session=fixture';
  const auth = c.replayAuthParams(signed);
  const variants = c.replayVariantsFromMaster(master(['BANDWIDTH=2000000,RESOLUTION=1280x720', '../video/720.m3u8?Policy=child-policy&part=one']), signed, auth);
  const url = new URL(variants[0].url);
  assert.equal(url.pathname, '/video/720.m3u8');
  assert.equal(url.searchParams.get('Policy'), 'child-policy');
  assert.equal(url.searchParams.get('Signature'), 'a+b/=');
  assert.equal(url.searchParams.get('Key-Pair-Id'), 'key-id');
  assert.equal(url.searchParams.get('session'), 'fixture');
  assert.equal(url.searchParams.get('part'), 'one');
  for (const name of ['CloudFront-Policy', 'CloudFront-Signature', 'CloudFront-Key-Pair-Id']) assert.equal(url.searchParams.has(name), false);
});

test('duplicate rendition URLs and audio-only variants do not create extra video qualities', () => {
  const c = setup();
  const variants = c.replayVariantsFromMaster(master(
    ['BANDWIDTH=4000000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"', 'video.m3u8'],
    ['BANDWIDTH=4000000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"', 'video.m3u8'],
    ['BANDWIDTH=128000,CODECS="mp4a.40.2"', 'aac.m3u8'],
    ['BANDWIDTH=96000,CODECS="opus"', 'opus.m3u8'],
    ['BANDWIDTH=1000000,CODECS="avc1.4d401f,mp4a.40.2"', 'unknown-video.m3u8']
  ), base, emptyAuth());
  assert.equal(variants.length, 2);
  assert.equal(new Set(variants.map(v => v.url)).size, 2);
  assert.equal(variants[0].label, '1080p', 'known resolution remains first');
  assert.ok(variants[1].label.includes('1') && /Mbps/i.test(variants[1].label), 'unknown dimensions use actual bandwidth, not an invented p tier');
  assert.equal(c.videoQualityLabel({width:0, height:0, bandwidth:0}), '원본');
});

test('unusual actual dimensions remain actual options instead of being rounded to presets', () => {
  const c = setup();
  const variants = c.replayVariantsFromMaster(master(
    ['BANDWIDTH=900000,RESOLUTION=854x480', '854.m3u8'],
    ['BANDWIDTH=7000000,RESOLUTION=1440x2560', 'portrait-1440.m3u8'],
    ['BANDWIDTH=1600000,RESOLUTION=1000x562', 'custom.m3u8']
  ), base, emptyAuth());
  assert.deepEqual(plain(variants.map(v => [v.width, v.height, v.label])), [[1440, 2560, '1440p'], [1000, 562, '562p'], [854, 480, '480p']]);
});

test('download format, AES, signature rewriting and authenticated API contracts stay unchanged', () => {
  const baseline = execFileSync('git', ['show', '38fca89:index.html'], {cwd:root, encoding:'utf8', maxBuffer:4e6});
  const normalize = text => text.replace(/\r\n/g, '\n');
  for (const name of ['downloadReplayStream', 'parseReplayDownloadPlaylist', 'replayDownloadIv',
    'rewriteReplayMediaPlaylist', 'replaySignedUrl', 'replayAuthParams', 'frommApiRequest']) {
    assert.equal(normalize(fn(name)), normalize(fn(name, baseline)), name);
  }
});

function runtimeSetup({bodies={}, supported=true, refreshUrl=null}={}) {
  const calls=[], blobs=new Map(), revoked=[], engines=[];
  const listeners=new Map(),documentListeners=new Map();
  let active=true, fatal=0, refreshed=0, id=0;
  const video={currentTime:0,paused:true,volume:.4,muted:true,playbackRate:1.25,duration:120,videoWidth:1920,videoHeight:1080,autoplay:false,src:'',onerror:null,
    addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},
    removeEventListener(name,fn){listeners.get(name)?.delete(fn);},
    emit(name){for(const fn of [...(listeners.get(name)||[])])fn();},
    play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;},load(){this.loads=(this.loads||0)+1;},
    canPlayType(){return 'probably';}};
  class Hls {
    static Events={MANIFEST_PARSED:'manifest',ERROR:'error'};
    static ErrorTypes={NETWORK_ERROR:'network',MEDIA_ERROR:'media'};
    static isSupported(){return supported;}
    constructor(config){this.config=config;this.events=new Map();this.destroyed=false;engines.push(this);}
    on(name,fn){this.events.set(name,fn);}
    loadSource(url){this.source=url;}
    attachMedia(v){this.video=v;}
    destroy(){this.destroyed=true;}
    startLoad(){}
    recoverMediaError(){}
    emit(name,data){this.events.get(name)?.(name,data);}
  }
  const owner={Blob,URL:{createObjectURL(blob){const url=`blob:quality-${++id}`;blobs.set(url,blob);return url;},revokeObjectURL(url){revoked.push(url);}},
    document:{querySelector(){return null;},body:{contains(el){return el===video&&active;}},
      fullscreenElement:null,pictureInPictureElement:null,
      addEventListener(name,fn){if(!documentListeners.has(name))documentListeners.set(name,new Set());documentListeners.get(name).add(fn);},
      removeEventListener(name,fn){documentListeners.get(name)?.delete(fn);},
      emit(name,event){for(const fn of [...(documentListeners.get(name)||[])])fn(event);}},closed:false};
  const read=async url=>{
    calls.push(url);
    const key=new URL(url).pathname;
    let value=bodies[key];
    if(typeof value==='function')value=await value(url);
    if(value==null)throw new Error('Unexpected fixture URL: '+key);
    if(value&&typeof value==='object'&&'status' in value)return {ok:false,status:value.status,text:async()=>''};
    return {ok:true,status:200,text:async()=>value};
  };
  const c=vm.createContext({URL,URLSearchParams,AbortController,DOMException,setTimeout,clearTimeout,
    fetch:read,localProxyUrl:value=>value,state:{live:{replayPlaylistCache:new Map()}},
    channelVideoSession:()=>()=>active,window:owner,navigator:{userAgent:'desktop fixture'},ensureReplayHlsSdk:async()=>Hls});
  vm.runInContext('const videoQualityPlayers={replay:null,channel:null};const videoPlaybackCatalogCache={entries:new Map(),sameSession:null,timer:null};',c);
  for(const name of ['replayAuthParams','replaySignedUrl','replayManifestAttributes','videoQualityLabel','replayVariantsFromMaster',
    'replayVariantFromMaster','videoQualityVariantKey','videoQualityAuth','clearVideoPlaybackCatalogCache','fetchVideoQualityText','videoQualityMediaGroups',
    'videoQualityCatalog','videoQualityLeaf','videoQualityAttributesText','rewriteReplayMediaPlaylist','revokeVideoQualityUrls',
    'prepareVideoQualitySource','updateVideoQualityUi','disposeVideoQualityPlayer','videoQualitySnapshot','restoreVideoQualityPresentation','changeVideoQuality',
    'installModernVideoControls','attachVideoQualityPlayer','resolveReplayMediaPlaylist','parseReplayDownloadPlaylist','replayDownloadIv','downloadReplayStream']) vm.runInContext(fn(name),c);
  c.fetchReplayText=async url=>{const response=await read(url);if(!response.ok)throw Object.assign(new Error('HTTP '+response.status),{status:response.status});return response.text();};
  const attach=async(url=base)=>{
    await c.attachVideoQualityPlayer('replay',url,video,owner,{current:()=>active,onHls(){},onFatal(){fatal++;},
      refreshUrl:refreshUrl?async()=>{refreshed++;return refreshUrl();}:null});
    return vm.runInContext('videoQualityPlayers.replay',c);
  };
  return {c,calls,blobs,revoked,engines,owner,video,bodies,attach,player:()=>vm.runInContext('videoQualityPlayers.replay',c),
    deactivate(){active=false;},get fatal(){return fatal;},get refreshed(){return refreshed;}};
}
const leaf = name => `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:4\n#EXTINF:4,\n${name}.ts\n#EXT-X-ENDLIST`;
const deferred = () => {let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};

test('cold HLS SDK and signed playlists prepare concurrently without creating an engine early',async()=>{
  const h=runtimeSetup({bodies:{'/artist/master.m3u8':master(['BANDWIDTH=3000000,RESOLUTION=1920x1080','high.m3u8']),'/artist/high.m3u8':leaf('high')}});
  const gate=deferred(),sdk=h.c.ensureReplayHlsSdk();h.c.ensureReplayHlsSdk=()=>gate.promise;
  const pending=h.attach();
  for(let i=0;i<12;i++)await Promise.resolve();
  assert.ok(h.calls.some(url=>url.endsWith('/high.m3u8')),'leaf request does not wait for the SDK');
  assert.equal(h.engines.length,0,'no engine before SDK ready');
  gate.resolve(await sdk);await pending;assert.equal(h.engines.length,1);
  h.c.disposeVideoQualityPlayer('replay');
});

test('leaving while SDK is unresolved cancels preparation and releases prepared blobs immediately',async()=>{
  const h=runtimeSetup({bodies:{'/artist/master.m3u8':master(['BANDWIDTH=3000000,RESOLUTION=1920x1080','high.m3u8']),'/artist/high.m3u8':leaf('high')}});
  h.c.ensureReplayHlsSdk=()=>new Promise(()=>{});
  const pending=h.attach();for(let i=0;i<20;i++)await Promise.resolve();
  assert.ok(h.blobs.size>0);h.c.disposeVideoQualityPlayer('replay');await pending;
  assert.equal(h.revoked.length,h.blobs.size);assert.equal(h.engines.length,0);
});

test('master reuse is bounded, session scoped and full signed URL specific; media is always fresh',async()=>{
  const h=runtimeSetup({bodies:{'/artist/master.m3u8':master(['BANDWIDTH=3000000,RESOLUTION=1920x1080','high.m3u8']),'/artist/high.m3u8':leaf('high')}});
  let session=1;h.c.channelVideoSession=()=>{const before=session;return ()=>before===session;};
  for(let i=0;i<2;i++){await h.attach(base+'?Signature=one');h.c.disposeVideoQualityPlayer('replay');}
  assert.equal(h.calls.filter(url=>url.includes('master.m3u8')).length,1);
  assert.equal(h.calls.filter(url=>url.includes('high.m3u8')).length,2,'fresh leaf even on a cache hit');
  await h.attach(base+'?Signature=two');h.c.disposeVideoQualityPlayer('replay');
  assert.equal(h.calls.filter(url=>url.includes('master.m3u8')).length,2);
  session++;await h.attach(base+'?Signature=two');h.c.disposeVideoQualityPlayer('replay');
  assert.equal(h.calls.filter(url=>url.includes('master.m3u8')).length,3,'different session cannot reuse');
  vm.runInContext('for(const value of videoPlaybackCatalogCache.entries.values())value.at-=10001;',h.c);
  await h.attach(base+'?Signature=two');h.c.disposeVideoQualityPlayer('replay');
  assert.equal(h.calls.filter(url=>url.includes('master.m3u8')).length,4,'expired entry fetches again');
  const signal=new AbortController().signal;
  for(let i=0;i<12;i++)await h.c.fetchVideoQualityText(base+'?revision='+i,signal);
  assert.equal(vm.runInContext('videoPlaybackCatalogCache.entries.size',h.c),8);
  h.c.clearVideoPlaybackCatalogCache();
});

test('aborted, no-store, oversized and failed masters are never reusable',async()=>{
  const h=runtimeSetup();let calls=0;
  const signal=new AbortController().signal;
  for(const fixture of [
    {ok:true,headers:{get:()=> 'no-store'},text:async()=> '#EXTM3U\n#EXT-X-STREAM-INF:bad'},
    {ok:true,headers:{get:key=>key==='cache-control'?'public, max-age=0':null},text:async()=> '#EXTM3U\n#EXT-X-STREAM-INF:bad'},
    {ok:true,text:async()=> '#EXT-X-STREAM-INF:'+ 'a'.repeat(65536)},
    {ok:false,status:403,text:async()=> ''}
  ]){
    h.c.fetch=async()=>{calls++;return fixture;};
    for(let i=0;i<2;i++)await h.c.fetchVideoQualityText(base,signal).catch(()=>{});
    assert.equal(vm.runInContext('videoPlaybackCatalogCache.entries.size',h.c),0);
  }
  const abort=new AbortController();abort.abort();
  await assert.rejects(()=>h.c.fetchVideoQualityText(base,abort.signal),/Cancelled/);
  assert.equal(calls,8);
});

test('download resolver follows nested highest masters and retains its independent highest cache', async()=>{
  const h=runtimeSetup({bodies:{
    '/artist/master.m3u8':master(['BANDWIDTH=6000000,RESOLUTION=640x360','low.m3u8'],['BANDWIDTH=4000000,RESOLUTION=1920x1080','nested.m3u8']),
    '/artist/nested.m3u8':master(['BANDWIDTH=600000,RESOLUTION=640x360','low.m3u8'],['BANDWIDTH=3000000,RESOLUTION=1920x1080','highest.m3u8']),
    '/artist/highest.m3u8':leaf('highest'),'/artist/low.m3u8':leaf('low')
  }});
  const url=base+'?CloudFront-Policy=fixture-policy&CloudFront-Signature=fixture-signature';
  const best=await h.c.resolveReplayMediaPlaylist(url);
  assert.equal(new URL(best.mediaUrl).pathname,'/artist/highest.m3u8');
  assert.equal(new URL(best.mediaUrl).searchParams.get('Policy'),'fixture-policy');
  const p=await h.attach(url);h.video.emit('loadedmetadata');
  await h.c.changeVideoQuality(p,1);h.video.emit('loadedmetadata');
  assert.equal(p.variants[p.selectedIndex].label,'360p');
  const cached=await h.c.resolveReplayMediaPlaylist(url);
  assert.strictEqual(cached,best,'manual playback cannot replace the highest download cache');
  const writes=[];let closed=false;
  h.c.fetchReplayBuffer=async segment=>{assert.equal(new URL(segment).pathname,'/artist/highest.ts');return Uint8Array.from([72,73,71,72]).buffer;};
  await h.c.downloadReplayStream(url,{writable:{async write(bytes){writes.push(...bytes);},async close(){closed=true;}},chunks:null});
  assert.deepEqual(writes,[72,73,71,72]);assert.equal(closed,true);
  h.c.disposeVideoQualityPlayer('replay');
});

test('playback preserves separate audio groups and signed AES/map/segment URIs in a one-rendition wrapper',async()=>{
  const rootMaster='#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="stereo",NAME="English",LANGUAGE="en",DEFAULT=YES,AUTOSELECT=YES,URI="audio/master.m3u8?Policy=audio-policy"\n'+
    '#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2",AUDIO="stereo"\nvideo/high.m3u8\n'+
    '#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,CODECS="avc1.640028,mp4a.40.2",AUDIO="stereo"\nvideo/low.m3u8';
  const h=runtimeSetup({bodies:{
    '/artist/master.m3u8':rootMaster,
    '/artist/video/high.m3u8':'#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="../keys/video.key"\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:4,\nvideo.ts\n#EXT-X-ENDLIST',
    '/artist/audio/master.m3u8':master(['BANDWIDTH=64000,CODECS="mp4a.40.2"','64.m3u8'],['BANDWIDTH=128000,CODECS="mp4a.40.2"','128.m3u8']),
    '/artist/audio/128.m3u8':'#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="../keys/audio.key"\n#EXTINF:4,\naudio.aac\n#EXT-X-ENDLIST'
  }});
  const signal=new AbortController().signal;
  const catalog=await h.c.videoQualityCatalog(base+'?Policy=video-policy&Signature=fixture-signature',signal);
  const prepared=await h.c.prepareVideoQualitySource(catalog,catalog.variants[0],h.owner,signal);
  const wrapper=await h.blobs.get(prepared.url).text();
  assert.equal((wrapper.match(/#EXT-X-STREAM-INF:/g)||[]).length,1,'there is no lower rendition for ABR to select');
  assert.ok(wrapper.includes('CODECS="avc1.640028,mp4a.40.2"'));
  const mediaLine=wrapper.split('\n').find(s=>s.startsWith('#EXT-X-MEDIA:'));
  const audioAttrs=h.c.replayManifestAttributes(mediaLine.slice(13));
  assert.equal(audioAttrs['GROUP-ID'],'stereo');
  const audio=await h.blobs.get(audioAttrs.URI).text();
  assert.ok(audio.includes('https://cdn.example/artist/keys/audio.key?Policy=audio-policy&Signature=fixture-signature'));
  assert.ok(audio.includes('https://cdn.example/artist/audio/audio.aac?Policy=audio-policy&Signature=fixture-signature'));
  const videoUrl=wrapper.split('\n').at(-1),video=await h.blobs.get(videoUrl).text();
  assert.ok(video.includes('https://cdn.example/artist/keys/video.key?Policy=video-policy&Signature=fixture-signature'));
  assert.ok(video.includes('https://cdn.example/artist/video/init.mp4?Policy=video-policy&Signature=fixture-signature'));
  assert.equal(h.calls.some(u=>new URL(u).pathname.endsWith('/64.m3u8')),false,'audio-only nested master selects its actual highest bandwidth');
  h.c.revokeVideoQualityUrls(prepared.urls,h.owner);
  assert.equal(h.revoked.length,prepared.urls.length);
});

test('native HLS receives the prepared fixed rendition and never the unrestricted master',async()=>{
  const h=runtimeSetup({supported:false,bodies:{
    '/artist/master.m3u8':master(['BANDWIDTH=500000,RESOLUTION=640x360','low.m3u8'],['BANDWIDTH=3000000,RESOLUTION=1920x1080','high.m3u8']),
    '/artist/high.m3u8':leaf('high'),'/artist/low.m3u8':leaf('low')
  }});
  const p=await h.attach();
  assert.ok(h.video.src.startsWith('blob:'));
  assert.ok((await h.blobs.get(h.video.src).text()).includes('/high.ts'));
  assert.equal(h.engines.length,0);
  assert.equal(p.selectedIndex,0);
  assert.equal(h.video.src===base,false);
  h.c.disposeVideoQualityPlayer('replay');
});

test('late quality responses are ignored and their prepared blobs are revoked',async()=>{
  const slow=deferred();let waiting=false;
  const h=runtimeSetup({bodies:{
    '/artist/master.m3u8':master(['BANDWIDTH=4000000,RESOLUTION=1920x1080','high.m3u8'],['BANDWIDTH=2000000,RESOLUTION=1280x720','slow.m3u8'],['BANDWIDTH=600000,RESOLUTION=640x360','low.m3u8']),
    '/artist/high.m3u8':leaf('high'),'/artist/slow.m3u8':()=>{waiting=true;return slow.promise;},'/artist/low.m3u8':leaf('low')
  }});
  const p=await h.attach();h.video.emit('loadedmetadata');
  h.video.currentTime=42;h.video.pause();h.video.volume=.3;h.video.muted=false;h.video.playbackRate=1.5;
  const first=h.c.changeVideoQuality(p,1);
  for(let n=0;!waiting&&n<20;n++)await Promise.resolve();
  assert.equal(waiting,true);
  await h.c.changeVideoQuality(p,2);h.video.emit('loadedmetadata');
  const engine=h.engines.at(-1);
  assert.equal(p.selectedIndex,2);assert.equal(h.video.currentTime,42);assert.equal(h.video.paused,true);
  assert.equal(h.video.volume,.3);assert.equal(h.video.muted,false);assert.equal(h.video.playbackRate,1.5);
  slow.resolve(leaf('slow'));await first;
  assert.strictEqual(h.engines.at(-1),engine);assert.equal(p.selectedIndex,2);
  const stale=[...h.blobs].filter(([,b])=>b.size>0);
  const slowUrls=[];for(const [url,b] of stale)if((await b.text()).includes('/slow.ts'))slowUrls.push(url);
  assert.ok(slowUrls.length>0);assert.ok(slowUrls.every(url=>h.revoked.includes(url)),'stale prepared blob is never left alive');
  h.c.disposeVideoQualityPlayer('replay');
  assert.ok(h.engines.every(engine=>engine.destroyed));
  assert.ok([...h.blobs.keys()].every(url=>h.revoked.includes(url)),'dispose reclaims all allocated blobs');
});

test('later metadata and manifest events do not undo an ordinary user seek or pause',async()=>{
  const h=runtimeSetup({bodies:{'/artist/master.m3u8':master(['BANDWIDTH=2000000,RESOLUTION=1280x720','high.m3u8']),'/artist/high.m3u8':leaf('high')}});
  await h.attach();h.video.emit('loadedmetadata');
  h.video.currentTime=55;h.video.pause();h.video.playbackRate=1.75;
  h.video.emit('loadedmetadata');h.engines[0].emit('manifest');
  assert.equal(h.video.currentTime,55);assert.equal(h.video.paused,true);assert.equal(h.video.playbackRate,1.75);
  h.c.disposeVideoQualityPlayer('replay');
});

test('an expired manifest refreshes permission URL once without falling back to a lower quality',async()=>{
  let failFresh=false;
  const h=runtimeSetup({refreshUrl:()=>base+'?Policy=fresh',bodies:{
    '/artist/master.m3u8':url=>new URL(url).searchParams.get('Policy')==='fresh'&&!failFresh?master(['BANDWIDTH=3000000,RESOLUTION=1920x1080','high.m3u8'],['BANDWIDTH=500000,RESOLUTION=640x360','low.m3u8']):{status:403},
    '/artist/high.m3u8':leaf('high'),'/artist/low.m3u8':leaf('low')
  }});
  const p=await h.attach(base+'?Policy=expired');
  assert.equal(h.refreshed,1);assert.equal(p.selectedIndex,0);assert.equal(p.variants[0].label,'1080p');
  assert.ok((await h.blobs.get(h.engines[0].source).text()).includes('Policy=fresh'));
  assert.equal(h.calls.some(u=>new URL(u).pathname.endsWith('/low.m3u8')),false);
  h.c.disposeVideoQualityPlayer('replay');
  failFresh=true;
  await assert.rejects(()=>h.attach(base+'?Policy=expired'),/재생목록/);
  assert.equal(h.refreshed,2,'the second attach also gets only one bounded refresh');
  h.c.disposeVideoQualityPlayer('replay');
});

test('cyclic playback and highest-download masters fail with bounded requests',async()=>{
  const h=runtimeSetup({bodies:{'/artist/master.m3u8':master(['BANDWIDTH=2000000,RESOLUTION=1280x720','master.m3u8'])}});
  await assert.rejects(()=>h.c.videoQualityLeaf(base,emptyAuth(),new AbortController().signal),/순환/);
  assert.equal(h.calls.length,1);
  await assert.rejects(()=>h.c.resolveReplayMediaPlaylist(base),/순환/);
  assert.equal(h.calls.length,2);
});

test('pagination state and requests remain equivalent apart from restarting thumbnail observation',()=>{
  const baseline=execFileSync('git',['show','38fca89:index.html'],{cwd:root,encoding:'utf8',maxBuffer:4e6});
  const normalize=text=>text.replace(/\r\n/g,'\n');
  for(const name of ['bindVideoListAuto','loadReplayCenter','loadChannelVideos'])assert.equal(normalize(fn(name)).replace('  bindVideoListThumbnails();\n',''),normalize(fn(name,baseline)),name);
  const declaration=source=>source.match(/^const videoListAuto = .*;$/m)?.[0];
  assert.ok(declaration(html)&&declaration(baseline),'pagination state declarations exist');
  assert.equal(declaration(html),declaration(baseline));
});

test('quality changes restore prior PiP only; ordinary playback and Escape never enter PiP',async()=>{
  const h=runtimeSetup({bodies:{
    '/artist/master.m3u8':master(['BANDWIDTH=3000000,RESOLUTION=1920x1080','high.m3u8'],['BANDWIDTH=500000,RESOLUTION=640x360','low.m3u8']),
    '/artist/high.m3u8':leaf('high'),'/artist/low.m3u8':leaf('low')
  }});
  let entered=0;
  h.video.requestPictureInPicture=async()=>{entered++;h.owner.document.pictureInPictureElement=h.video;};
  const p=await h.attach();h.video.emit('loadedmetadata');
  assert.equal(entered,0,'initial playback never opens PiP');
  h.owner.document.pictureInPictureElement=h.video;
  await h.c.changeVideoQuality(p,1);
  h.owner.document.pictureInPictureElement=null; // Simulate source replacement leaving the old PiP mode.
  h.video.emit('loadedmetadata');
  assert.equal(entered,1,'only a previously active PiP mode is restored');
  assert.strictEqual(h.owner.document.pictureInPictureElement,h.video);
  await h.c.changeVideoQuality(p,0);
  h.owner.document.pictureInPictureElement=null;
  h.owner.document.emit('keydown',{key:'Escape'});
  h.video.emit('loadedmetadata');
  assert.equal(entered,1,'explicit Escape during the transition suppresses restoration');
  h.c.disposeVideoQualityPlayer('replay');
});

test('stale presentation callbacks cannot re-enter fullscreen or PiP',async()=>{
  const h=runtimeSetup();
  let fullscreen=0,pip=0;
  const element={isConnected:true,requestFullscreen:async()=>{fullscreen++;h.owner.document.fullscreenElement=element;}};
  h.video.requestPictureInPicture=async()=>{pip++;h.owner.document.pictureInPictureElement=h.video;};
  const player={resume:{fullscreen:element,pip:true},owner:h.owner,video:h.video};
  h.c.restoreVideoQualityPresentation(player,()=>false);
  await Promise.resolve();
  assert.equal(fullscreen,0);assert.equal(pip,0);
  assert.equal(h.owner.document.fullscreenElement,null);assert.equal(h.owner.document.pictureInPictureElement,null);
});

test('a late signed-detail refresh after session switch cannot populate the reset cache',async()=>{
  let session=1;
  const response=deferred();
  const state={live:{replayDetailCache:new Map(),replayDetailInflight:new Map()}};
  const c=vm.createContext({state,FROMM_CHANNEL_API_BASE:'https://channel.example',
    channelVideoSession:()=>{const captured=session;return ()=>session===captured;},
    frommApiRequest:()=>response.promise,replayStreamUrl:post=>post.url});
  for(const name of ['replayPostKey','fetchReplayPostDetail'])vm.runInContext(fn(name),c);
  const pending=c.fetchReplayPostDetail({id:'one',_channelId:'a',_channelName:'Fixture',_streamUrl:''},{force:true});
  session=2;state.live.replayDetailCache.clear();state.live.replayDetailInflight.clear();
  const replacement=Promise.resolve({id:'new-session'});
  state.live.replayDetailInflight.set('a:one',replacement);
  response.resolve({data:{post:{id:'one',type:'live_record',url:'https://cdn.example/old-session.m3u8?Policy=fixture'}}});
  await assert.rejects(()=>pending,/세션/);
  assert.equal(state.live.replayDetailCache.size,0);
  assert.strictEqual(state.live.replayDetailInflight.get('a:one'),replacement,'old cleanup cannot clear a newer session request');
});

test('failed refreshed catalog is cleared so the next manual retry uses the new signed URL',async()=>{
  let expired=false,freshUnavailable=true;
  const manifest=master(['BANDWIDTH=3000000,RESOLUTION=1920x1080','high.m3u8'],['BANDWIDTH=500000,RESOLUTION=640x360','low.m3u8']);
  const h=runtimeSetup({refreshUrl:()=>base+'?Policy=fresh',bodies:{
    '/artist/master.m3u8':url=>new URL(url).searchParams.get('Policy')==='fresh'&&freshUnavailable?{status:403}:manifest,
    '/artist/high.m3u8':leaf('high'),
    '/artist/low.m3u8':url=>expired&&new URL(url).searchParams.get('Policy')==='old'?{status:403}:leaf('low')
  }});
  const p=await h.attach(base+'?Policy=old');h.video.emit('loadedmetadata');
  const originalEngine=h.engines[0];expired=true;
  await h.c.changeVideoQuality(p,1);
  assert.equal(h.refreshed,1);
  assert.equal(p.catalog,null,'expired catalog may not survive a failed fresh fetch');
  assert.strictEqual(h.engines.at(-1),originalEngine,'failed preparation leaves the original engine active');
  assert.equal(originalEngine.destroyed,false);
  freshUnavailable=false;
  await h.c.changeVideoQuality(p,1);h.video.emit('loadedmetadata');
  assert.equal(h.refreshed,1,'retry reads the fresh URL without refreshing the expired cache again');
  assert.equal(p.selectedIndex,1);
  assert.ok((await h.blobs.get(h.engines.at(-1).source).text()).includes('Policy=fresh'));
  h.c.disposeVideoQualityPlayer('replay');
});

test('nested audio namespaces replace inherited tracks with the nearest signed group definition',async()=>{
  const top='#EXTM3U\n'+
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="stereo",NAME="English",LANGUAGE="en",DEFAULT=YES,AUTOSELECT=YES,URI="obsolete-en.m3u8"\n'+
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="stereo",NAME="French",LANGUAGE="fr",DEFAULT=NO,AUTOSELECT=YES,URI="obsolete-fr.m3u8"\n'+
    '#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2",AUDIO="stereo"\nnested/master.m3u8';
  const nested='#EXTM3U\n'+
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="stereo",NAME="English",LANGUAGE="en",DEFAULT=YES,AUTOSELECT=YES,URI="audio/nearest.m3u8?Policy=nested-audio"\n'+
    '#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2",AUDIO="stereo"\nvideo/high.m3u8';
  const h=runtimeSetup({bodies:{
    '/artist/master.m3u8':top,'/artist/nested/master.m3u8':nested,
    '/artist/nested/video/high.m3u8':leaf('highest'),
    '/artist/nested/audio/nearest.m3u8':'#EXTM3U\n#EXTINF:4,\nnearest.aac\n#EXT-X-ENDLIST'
  }});
  const signal=new AbortController().signal;
  const catalog=await h.c.videoQualityCatalog(base+'?Policy=root-policy&Signature=fixture-signature',signal);
  const prepared=await h.c.prepareVideoQualitySource(catalog,catalog.variants[0],h.owner,signal);
  const wrapper=await h.blobs.get(prepared.url).text();
  const tracks=wrapper.split('\n').filter(line=>line.startsWith('#EXT-X-MEDIA:'));
  assert.equal(tracks.length,1,'redefined namespace does not retain stale language or default tracks');
  assert.equal((wrapper.match(/DEFAULT=YES/g)||[]).length,1);
  const attrs=h.c.replayManifestAttributes(tracks[0].slice(13));
  assert.equal(attrs.NAME,'English');assert.equal(attrs.LANGUAGE,'en');assert.equal(attrs['GROUP-ID'],'stereo');
  const audio=await h.blobs.get(attrs.URI).text();
  assert.ok(audio.includes('https://cdn.example/artist/nested/audio/nearest.aac?Policy=nested-audio&Signature=fixture-signature'));
  assert.equal(h.calls.some(url=>url.includes('obsolete-')),false,'overridden audio URLs are never requested');
  h.c.revokeVideoQualityUrls(prepared.urls,h.owner);
});

test('out-of-order forced signed-detail refreshes keep only the newest cache and inflight owner',async()=>{
  for(const newerFirst of [false,true]) {
    const responses=[deferred(),deferred()];let requested=0;
    const state={live:{replayDetailCache:new Map(),replayDetailInflight:new Map()}};
    const c=vm.createContext({state,FROMM_CHANNEL_API_BASE:'https://channel.example',
      channelVideoSession:()=>()=>true,frommApiRequest:()=>responses[requested++].promise,replayStreamUrl:post=>post.url});
    for(const name of ['replayPostKey','fetchReplayPostDetail'])vm.runInContext(fn(name),c);
    const post={id:'one',_channelId:'a',_streamUrl:''};
    const older=c.fetchReplayPostDetail(post,{force:true}), newer=c.fetchReplayPostDetail(post,{force:true});
    const newestOwner=state.live.replayDetailInflight.get('a:one');
    const result=signature=>({data:{post:{id:'one',type:'live_record',url:`https://cdn.example/master.m3u8?Signature=${signature}`}}});
    if(newerFirst) {
      responses[1].resolve(result('newest'));await newer;
      responses[0].resolve(result('older'));await older;
    } else {
      responses[0].resolve(result('older'));await older;
      assert.equal(state.live.replayDetailCache.size,0,'superseded response cannot cache an older URL');
      assert.strictEqual(state.live.replayDetailInflight.get('a:one'),newestOwner,'old cleanup preserves newer inflight');
      responses[1].resolve(result('newest'));await newer;
    }
    assert.match(state.live.replayDetailCache.get('a:one')._streamUrl,/Signature=newest$/);
    assert.equal(state.live.replayDetailInflight.size,0);
  }
});


test('custom control setup or cleanup faults cannot break highest-quality playback and disposal',async()=>{
  const h=runtimeSetup({bodies:{'/artist/master.m3u8':leaf('highest')}});
  h.c.installModernVideoControls=()=>{throw new Error('fixture UI initialization failure');};
  const p=await h.attach();
  assert.equal(h.video.controls,true,'native controls survive enhanced UI initialization failure');
  assert.equal(h.engines.length,1,'highest-quality engine still attaches');
  p.controlsCleanup=()=>{throw new Error('fixture UI cleanup failure');};
  h.c.disposeVideoQualityPlayer('replay');
  assert.equal(h.engines[0].destroyed,true,'UI cleanup failure cannot prevent HLS cleanup');
});


test('an unsupported HLS browser releases enhanced controls before returning its error',async()=>{
  const h=runtimeSetup({supported:false});let disposed=0;
  h.video.canPlayType=()=>'';
  h.c.installModernVideoControls=()=>()=>{disposed++;};
  await assert.rejects(()=>h.attach(),/지원하지/);
  assert.equal(disposed,1);
  assert.equal(h.engines.length,0);
});


test('quality menu rendering faults cannot interrupt playback or manual switching',async()=>{
  const h=runtimeSetup({bodies:{'/artist/master.m3u8':master(['BANDWIDTH=3000000,RESOLUTION=1920x1080','high.m3u8'],['BANDWIDTH=800000,RESOLUTION=640x360','low.m3u8']),'/artist/high.m3u8':leaf('high'),'/artist/low.m3u8':leaf('low')}});h.c.installModernVideoControls=player=>{player.controlsQualityUpdate=()=>{throw new Error('synthetic UI failure');};return()=>{};};
  const player=await h.attach();h.video.emit('loadedmetadata');assert.equal(h.engines.length,1);await h.c.changeVideoQuality(player,1);assert.equal(h.engines.length,2);assert.equal(h.engines[0].destroyed,true);
});


test('loading presentation is explicit, silent for routine work, and terminates on failure',async()=>{
  const h=runtimeSetup({bodies:{'/artist/master.m3u8':master(['BANDWIDTH=3000000,RESOLUTION=1920x1080','high.m3u8'],['BANDWIDTH=800000,RESOLUTION=640x360','low.m3u8']),'/artist/high.m3u8':leaf('high'),'/artist/low.m3u8':leaf('low')}});
  const states=[];h.c.installModernVideoControls=player=>{player.controlsSetLoading=(busy,failed)=>states.push({busy,failed});return()=>{};};
  const player=await h.attach();assert.ok(states.some(s=>s.busy));h.video.emit('loadedmetadata');assert.equal(states.at(-1).busy,false);
  h.bodies['/artist/low.m3u8']={status:503};await h.c.changeVideoQuality(player,1);assert.deepEqual(states.at(-1),{busy:false,failed:true});
  player.controlsSetLoading=()=>{throw new Error('fixture loading UI failure');};h.c.updateVideoQualityUi(player,'',{loading:true});assert.equal(h.engines.length,1,'spinner faults cannot stop the engine');
});
