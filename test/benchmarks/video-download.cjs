'use strict';
// Loopback-only comparison: identical bytes/latencies, isolated client RSS and
// real ordered temporary-file writes. No authenticated/CDN requests.
const fs=require('node:fs'),fsp=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),http=require('node:http'),{fork,execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const {context}=require('../helpers/replay-download-runtime.cjs');
const count=160,size=64*1024,configs=[['batch',12],['pool',12],['pool',16],['pool',20],['batch',6],['pool',6]];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
(async()=>{
 if(process.argv[2]==='client'){
  const cfg=JSON.parse(process.argv[3]),folder=await fsp.mkdtemp(path.join(os.tmpdir(),'fromm-video-bench-')),target=path.join(folder,'video.ts');let handle;
  try{
   handle=await fsp.open(target,'w');const html=cfg.mode==='batch'?fs.readFileSync(cfg.baseline,'utf8'):undefined;
   const runtime=context({html,mobile:cfg.concurrency===6});let ready=0,peakReady=0,active=0,peakRequests=0;
   if(cfg.mode==='batch'){const original=runtime.fetchReplayBuffer;runtime.fetchReplayBuffer=async url=>{active++;peakRequests=Math.max(peakRequests,active);try{const data=await original(url);ready+=data.byteLength;peakReady=Math.max(peakReady,ready);return data;}finally{active--}};}
   const sink={writable:{async write(bytes){let done=0;while(done<bytes.byteLength){const result=await handle.write(bytes,done,bytes.byteLength-done);if(!result.bytesWritten)throw Error('short disk write');done+=result.bytesWritten}},async close(){await handle.sync();await handle.close();handle=null},async abort(){try{await handle?.close()}catch{}handle=null}},chunks:null};
   global.gc?.();const startMemory=process.memoryUsage();let peak={...startMemory};const sample=()=>{const m=process.memoryUsage();for(const k of ['rss','heapUsed','external','arrayBuffers'])peak[k]=Math.max(peak[k],m[k]);};const timer=setInterval(sample,5);
   const began=performance.now();let result;
   try{result=await runtime.downloadReplayStream(cfg.url,sink,(done,total)=>{if(cfg.mode==='batch'&&(done%cfg.concurrency===0||done===total))ready=0;},{concurrency:cfg.concurrency});}finally{sample();clearInterval(timer)}
   if(result){peakReady=result.peakReadyBytes;peakRequests=result.peakRequests;}
   const elapsedMs=performance.now()-began,stat=await fsp.stat(target);const hash=createHash('sha256');for await(const bytes of fs.createReadStream(target))hash.update(bytes);
   process.send({mode:cfg.mode,concurrency:cfg.concurrency,elapsedMs,bytes:stat.size,bytesPerSecond:stat.size/(elapsedMs/1000),sha256:hash.digest('hex'),peakRss:peak.rss,rssIncrease:peak.rss-startMemory.rss,peakArrayBuffers:peak.arrayBuffers,peakHeapUsed:peak.heapUsed,peakCompletedBytes:peakReady,peakRequests,peakReservedBytes:result?.peakReservedBytes||null});
  }finally{try{await handle?.close()}catch{}await fsp.rm(folder,{recursive:true,force:true});}
  return;
 }
 const destination=process.env.VIDEO_BENCH_OUT||path.resolve('video-benchmark.json'),baseline=process.env.VIDEO_BENCH_BASELINE||path.join(os.tmpdir(),'fromm-video-baseline-da18d7b.html'),rounds=Number(process.env.VIDEO_BENCH_ROUNDS||3),profiles=['uniform','jitter','bandwidth'];
 if(!process.env.VIDEO_BENCH_BASELINE)fs.writeFileSync(baseline,execFileSync('git',['show','da18d7b44316ccc42e3f3989acb4c3bcebc4bc75:index.html'],{maxBuffer:4e6}));
 const payloads=Array.from({length:count},(_,i)=>Buffer.alloc(size,i%251));const expected=sha(Buffer.concat(payloads));
 let active=new Set(),peak=0,streams=[],profile='uniform',tokens=0;
 const flush=setInterval(()=>{if(profile!=='bandwidth')return;tokens=Math.min(tokens+4*1024*1024/100,4*1024*1024/50);let spins=streams.length*4;while(tokens>=1024&&streams.length&&spins-->0){const item=streams.shift();if(item.res.destroyed)continue;const n=Math.min(8192,Math.floor(tokens),size-item.offset);item.res.write(item.body.subarray(item.offset,item.offset+n));item.offset+=n;tokens-=n;if(item.offset===size)item.res.end();else streams.push(item);}},10);
 const server=http.createServer((req,res)=>{
  active.add(res);peak=Math.max(peak,active.size);res.on('close',()=>active.delete(res));const u=new URL(req.url,'http://fixture');
  if(u.pathname==='/list.m3u8'){res.end('#EXTM3U\n'+payloads.map((_,i)=>`#EXTINF:4,\n/segment/${i}.ts`).join('\n')+'\n#EXT-X-ENDLIST');return;}
  const i=Number(u.pathname.match(/\/segment\/(\d+)\.ts/)?.[1]);if(!Number.isInteger(i)||i<0||i>=count){res.writeHead(404);res.end();return;}
  const random=((i*1103515245+12345)>>>8)%100,latency=profile==='uniform'?12:random<15?140:random<40?45:8;
  setTimeout(()=>{if(res.destroyed)return;res.writeHead(200,{'content-length':size});if(profile==='bandwidth')streams.push({res,body:payloads[i],offset:0});else res.end(payloads[i]);},latency);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/list.m3u8?Policy=synthetic`;
 const results=[];
 try{for(const p of profiles)for(let round=0;round<rounds;round++)for(let step=0;step<configs.length;step++){
  const [mode,concurrency]=configs[(step+round)%configs.length];profile=p;peak=0;streams=[];tokens=0;
  const value=await new Promise((resolve,reject)=>{const child=fork(__filename,['client',JSON.stringify({mode,concurrency,url,baseline})],{execArgv:['--expose-gc'],stdio:['ignore','inherit','inherit','ipc']});let data;child.on('message',m=>data=m);child.on('error',reject);child.on('exit',code=>code||!data?reject(Error('benchmark client failed '+code)):resolve(data));});
  if(value.sha256!==expected||value.bytes!==count*size||value.peakRequests>concurrency||peak>concurrency)throw Error('integrity/concurrency mismatch '+JSON.stringify(value));
  results.push({...value,profile:p,round,peakServerRequests:peak});process.stdout.write(`${p} ${round+1} ${mode}${concurrency}: ${value.elapsedMs.toFixed(0)}ms, RSS ${(value.peakRss/1048576).toFixed(1)}MiB\n`);
 }}finally{clearInterval(flush);server.closeAllConnections();await new Promise(r=>server.close(r));}
 const median=xs=>{const values=[...xs].sort((a,b)=>a-b);return values[Math.floor(values.length/2)]};
 const summary=profiles.flatMap(p=>configs.map(([mode,concurrency])=>{const group=results.filter(r=>r.profile===p&&r.mode===mode&&r.concurrency===concurrency);return{profile:p,mode,concurrency,medianMs:median(group.map(x=>x.elapsedMs)),medianBytesPerSecond:median(group.map(x=>x.bytesPerSecond)),maxRss:Math.max(...group.map(x=>x.peakRss)),maxArrayBuffers:Math.max(...group.map(x=>x.peakArrayBuffers)),maxCompletedBytes:Math.max(...group.map(x=>x.peakCompletedBytes)),maxRequests:Math.max(...group.map(x=>x.peakRequests))}}));
 const report={node:process.version,platform:process.platform,cpu:os.cpus()[0]?.model,count,segmentBytes:size,rounds,expectedSha256:expected,note:'Loopback HTTP and container temporary-file fsync. Mobile rows use the mobile6 configuration on the same Node host, not physical phone measurements.',results,summary};fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,JSON.stringify(report,null,2));console.log('Saved '+destination);
})().catch(e=>{console.error(e);process.exitCode=1});
