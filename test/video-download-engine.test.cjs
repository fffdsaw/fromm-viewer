'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),{webcrypto,createHash}=require('node:crypto');
const {create}=require('../web-video-download.js');
const {context}=require('./helpers/replay-download-runtime.cjs');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function fixture(t,respond){
 const calls=[],active=new Set();let peak=0;
 const server=http.createServer(async(req,res)=>{calls.push(req.url);active.add(res);peak=Math.max(peak,active.size);res.on('close',()=>active.delete(res));await respond(req,res,calls.length)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r))});
 return{url:`http://127.0.0.1:${server.address().port}`,calls,active,get peak(){return peak}};
}
function sink(){const chunks=[];let closed=false,aborted=false;return{chunks,output:{writable:{async write(data){chunks.push(Buffer.from(data));},async close(){closed=true},async abort(){aborted=true}}},get closed(){return closed},get aborted(){return aborted}}}
const iv=n=>{const b=new Uint8Array(16);new DataView(b.buffer).setUint32(12,n,false);return b};
test('160 out-of-order segments use a sliding window, strict write order and bounded requests/bytes',async t=>{
 const f=await fixture(t,async(req,res)=>{const i=Number(req.url.slice(1));await pause(i===0?100:(i%7)*2);if(res.destroyed)return;const b=Buffer.alloc(512,i%256);res.writeHead(200,{'content-length':b.length});res.end(b)});
 const output=sink(),progress=[];const engine=create({concurrency:6,maxSegmentBytes:1024,maxBufferedBytes:8192,ahead:12});t.after(()=>engine.dispose());
 const result=await engine.transfer(Array.from({length:160},(_,i)=>({url:f.url+'/'+i})),output.output,(done,total)=>progress.push([done,total]),iv);
 assert.deepEqual(Buffer.concat(output.chunks),Buffer.concat(Array.from({length:160},(_,i)=>Buffer.alloc(512,i%256))));
 assert.ok(f.calls.findIndex(x=>x==='/6')<f.calls.findIndex(x=>x==='/0')+12);
 assert.ok(result.peakAhead<=12&&result.peakReservedBytes<=8192&&result.peakRequests<=6);
 assert.ok(result.peakRequests>=2);assert.equal(result.activeRequests,0);assert.equal(result.reservedBytes,0);assert.equal(output.closed,true);
 assert.deepEqual(progress.map(p=>p[0]),Array.from({length:160},(_,i)=>i+1));
});
test('a slow first segment does not create batch barriers; a saturated reorder window stops further lookahead',async t=>{
 let release;const gate=new Promise(r=>release=r);const f=await fixture(t,async(req,res)=>{if(req.url==='/0')await gate;if(!res.destroyed)res.end(Buffer.alloc(8))});
 const output=sink(),engine=create({concurrency:3,ahead:9,maxSegmentBytes:32,maxBufferedBytes:2048});t.after(()=>engine.dispose());
 const work=engine.transfer(Array.from({length:30},(_,i)=>({url:f.url+'/'+i})),output.output,()=>{},iv);
 for(let n=0;n<50&&f.calls.length<9;n++)await pause(5);
 assert.equal(f.calls.length,9,'fast workers immediately fetch beyond the old first batch, then stop at the window');
 await pause(30);assert.equal(f.calls.length,9);assert.equal(output.chunks.length,0);release();await work;
 assert.equal(output.chunks.length,30);
});
test('AES key rotation, explicit IV, media sequence and METHOD=NONE keep exact file bytes and key caching',async t=>{
 const keys=[Buffer.alloc(16,1),Buffer.alloc(16,2)],expected=[],bodies=new Map();let playlist='#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:513\n';
 for(let i=0;i<125;i++){
  const plain=Buffer.alloc(127+i%5,i);expected.push(plain);let body=plain;
  if(i<100){const k=i<50?0:1,explicit=i>=50;playlist+=`#EXT-X-KEY:METHOD=AES-128,URI="/key${k}"${explicit?',IV=0x1234':''}\n`;const key=await webcrypto.subtle.importKey('raw',keys[k],'AES-CBC',false,['encrypt']);const vector=explicit?iv(0x1234):iv(513+i);body=Buffer.from(await webcrypto.subtle.encrypt({name:'AES-CBC',iv:vector},key,plain));}
  else playlist+='#EXT-X-KEY:METHOD=NONE\n';
  playlist+=`#EXTINF:4,\n/${i}.ts\n`;bodies.set('/'+i+'.ts',body);
 }
 const f=await fixture(t,(req,res)=>{const u=new URL(req.url,'http://fixture');assert.equal(u.searchParams.get('Policy'),'signed');const b=u.pathname==='/list.m3u8'?Buffer.from(playlist):u.pathname.startsWith('/key')?keys[Number(u.pathname.at(-1))]:bodies.get(u.pathname);res.writeHead(200,{'content-length':b.length});res.end(b)});
 const c=context(),output=sink();await c.downloadReplayStream(f.url+'/list.m3u8?Policy=signed',output.output,()=>{}, {concurrency:12});
 assert.deepEqual(Buffer.concat(output.chunks),Buffer.concat(expected));assert.equal(output.closed,true);
 assert.equal(f.calls.filter(x=>x.startsWith('/key0?')).length,1);assert.equal(f.calls.filter(x=>x.startsWith('/key1?')).length,1);
});
for(const status of [401,403,404,429,500,502,503])test(`HTTP ${status}: bounded retry policy and no broken completion`,async t=>{
 const f=await fixture(t,(_req,res)=>{res.writeHead(status);res.end('error')});const output=sink(),engine=create({concurrency:1,backoffMs:1});t.after(()=>engine.dispose());
 await assert.rejects(engine.transfer([{url:f.url+'/bad'}],output.output,()=>{},iv),e=>e.code==='HTTP'&&e.status===status);
 assert.equal(f.calls.length,[429,500,502,503].includes(status)?3:1);assert.equal(output.closed,false);assert.equal(output.aborted,true);assert.equal(engine.snapshot().activeRequests,0);
});
test('temporary failures recover; Retry-After beyond the allowed wait never retries early',async t=>{
 const seen=new Map();const f=await fixture(t,(req,res)=>{const n=(seen.get(req.url)||0)+1;seen.set(req.url,n);if(req.url==='/limit'){res.writeHead(429,{'retry-after':'60'});res.end();}else if(n<3){res.writeHead(503);res.end();}else res.end('OK')});
 const output=sink(),engine=create({backoffMs:1});t.after(()=>engine.dispose());await engine.transfer([{url:f.url+'/flaky'}],output.output,()=>{},iv);assert.equal(Buffer.concat(output.chunks).toString(),'OK');assert.equal(engine.snapshot().retries,2);
 const second=create({backoffMs:1});t.after(()=>second.dispose());await assert.rejects(second.transfer([{url:f.url+'/limit'}],sink().output,()=>{},iv),e=>e.status===429);assert.equal(seen.get('/limit'),1);
});
test('account/cancel invalidation aborts pending bodies and prevents further writes/requests',async t=>{
 const f=await fixture(t,async(_req,res)=>{res.writeHead(200,{'content-length':'4096'});res.write(Buffer.alloc(1));await pause(200);if(!res.destroyed)res.end(Buffer.alloc(4095))});
 for(const mode of ['signal','session']){let current=true;const signal=new AbortController(),output=sink(),engine=create({concurrency:4,current:()=>current,signal:signal.signal});t.after(()=>engine.dispose());
  const work=engine.transfer(Array.from({length:50},()=>({url:f.url+'/slow'})),output.output,()=>{},iv);
  await pause(25);const before=f.calls.length;if(mode==='signal')signal.abort();else current=false;
  await assert.rejects(work,e=>['CANCELLED','SESSION_CHANGED'].includes(e.code));await pause(25);assert.equal(f.calls.length,before);assert.equal(output.chunks.length,0);assert.equal(output.closed,false);assert.equal(output.aborted,true);assert.equal(engine.snapshot().activeRequests,0);assert.equal(engine.snapshot().reservedBytes,0);
 }
});
test('unknown lengths and slow disk respect the byte budget, including head priority without deadlock',async t=>{
 const f=await fixture(t,async(_req,res)=>{res.writeHead(200);res.write(Buffer.alloc(200));await pause(1);res.end(Buffer.alloc(200))});
 const output=sink(),write=output.output.writable.write;output.output.writable.write=async b=>{await pause(2);await write(b)};
 const engine=create({concurrency:8,ahead:16,maxSegmentBytes:512,maxBufferedBytes:2048});t.after(()=>engine.dispose());
 const result=await engine.transfer(Array.from({length:101},()=>({url:f.url+'/chunk'})),output.output,()=>{},iv);
 assert.equal(Buffer.concat(output.chunks).length,40400);assert.ok(result.peakReservedBytes<=2048);assert.ok(result.peakAhead<=16);
});
test('oversized fragments and bounded in-memory fallback fail cleanly; disk and staged outputs finalize exactly',async t=>{
 const f=await fixture(t,(_req,res)=>{res.writeHead(200,{'content-length':1024});res.end(Buffer.alloc(1024,7))});
 const small=create({maxSegmentBytes:512,maxBufferedBytes:2048});t.after(()=>small.dispose());await assert.rejects(small.transfer([{url:f.url}],sink().output,()=>{},iv),e=>e.code==='SEGMENT_LIMIT');
 const mem=create({maxMemoryFileBytes:1024});t.after(()=>mem.dispose());const memory={chunks:[],writable:null};await assert.rejects(mem.transfer([{url:f.url},{url:f.url}],memory,()=>{},iv),e=>e.code==='MEMORY_LIMIT');assert.equal(memory.chunks.length,0);
 const ok=create();t.after(()=>ok.dispose());const result=await ok.transfer([{url:f.url}],{writable:null,chunks:[]},()=>{},iv);assert.equal(result.mode,'memory');assert.equal(createHash('sha256').update(Buffer.from(await result.blob.arrayBuffer())).digest('hex'),createHash('sha256').update(Buffer.alloc(1024,7)).digest('hex'));
 const output=sink(),staged=create({storageRoot:async()=>({writer:output.output.writable,file:async()=>new Blob(output.chunks),discard:async()=>{}})});t.after(()=>staged.dispose());const file=await staged.transfer([{url:f.url}],{writable:null,chunks:[]},()=>{},iv);assert.equal(file.mode,'staged');assert.equal(file.blob.size,1024);assert.equal(output.closed,true);
});
test('connection resets and idle timeouts retry at most twice; cancellation cleans up during backoff',async t=>{
 const seen=new Map();const f=await fixture(t,(req,res)=>{
  const n=(seen.get(req.url)||0)+1;seen.set(req.url,n);
  if(req.url==='/reset'&&n<3)return req.socket.destroy();
  if(req.url==='/stall'){res.writeHead(200,{'content-length':100});res.write('x');return;}
  if(req.url==='/backoff'){res.writeHead(503);res.end();return;}
  res.end('recovered');
 });
 const reset=create({backoffMs:1});t.after(()=>reset.dispose());const output=sink();await reset.transfer([{url:f.url+'/reset'}],output.output,()=>{},iv);assert.equal(Buffer.concat(output.chunks).toString(),'recovered');assert.equal(seen.get('/reset'),3);
 const stall=create({backoffMs:1,idleTimeoutMs:30});t.after(()=>stall.dispose());const failed=sink();await assert.rejects(stall.transfer([{url:f.url+'/stall'}],failed.output,()=>{},iv),e=>e.code==='TIMEOUT');assert.equal(seen.get('/stall'),3);assert.equal(failed.aborted,true);assert.equal(stall.snapshot().activeRequests,0);
 const ctrl=new AbortController(),backoff=create({signal:ctrl.signal,backoffMs:500});t.after(()=>backoff.dispose());const pending=backoff.transfer([{url:f.url+'/backoff'}],sink().output,()=>{},iv);for(let n=0;!seen.has('/backoff')&&n<100;n++)await pause(2);ctrl.abort();await assert.rejects(pending,e=>e.code==='CANCELLED');await pause(20);assert.equal(seen.get('/backoff'),1);
});
test('long direct-to-disk stream keeps a constant buffer bound; disk failure and corrupt AES never complete',async t=>{
 const body=Buffer.alloc(8192,9);const f=await fixture(t,(req,res)=>{res.setHeader('content-length',body.length);res.end(body)});
 let bytes=0;const engine=create({concurrency:16,maxSegmentBytes:16384,maxBufferedBytes:131072});t.after(()=>engine.dispose());
 const result=await engine.transfer(Array.from({length:1200},()=>({url:f.url})),{writable:{async write(b){bytes+=b.byteLength},async close(){},async abort(){}}},()=>{},iv);
 assert.equal(bytes,1200*8192);assert.ok(result.peakReservedBytes<=131072);assert.ok(result.peakAhead<=32);assert.equal(result.reservedBytes,0);
 const disk=create();t.after(()=>disk.dispose());let aborted=false,closed=false;
 await assert.rejects(disk.transfer([{url:f.url}],{writable:{async write(){throw new Error('disk full')},async close(){closed=true},async abort(){aborted=true}}},()=>{},iv),/disk full/);assert.equal(aborted,true);assert.equal(closed,false);
 const aes=create();t.after(()=>aes.dispose());const broken=sink();await assert.rejects(aes.transfer([{url:f.url,key:{url:f.url}}],broken.output,()=>{},iv),e=>e.code==='SEGMENT_LIMIT'||e.code==='CRYPTO');assert.equal(broken.closed,false);assert.equal(broken.aborted,true);
});
