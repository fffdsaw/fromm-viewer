/* Ordered HLS downloading. Independent implementation; no playback ownership. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.FrommVideoDownload=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const MiB=1024*1024;
  class DownloadError extends Error{
    constructor(code,message,status=0){super(message);this.name='DownloadError';this.code=code;this.status=status;}
  }
  function create(options={}){
    const mobile=!!options.mobile,concurrency=Math.max(1,Math.min(20,options.concurrency||(mobile?6:16)));
    const maxSegmentBytes=options.maxSegmentBytes||64*MiB;
    const maxBufferedBytes=options.maxBufferedBytes||(mobile?160:256)*MiB;
    const ordinaryBudget=maxBufferedBytes-2*maxSegmentBytes;
    if(ordinaryBudget<0)throw new RangeError('Video buffer budget is too small');
    const ahead=Math.max(concurrency,options.ahead||2*concurrency);
    const fetcher=options.fetcher||globalThis.fetch.bind(globalThis),crypto=options.crypto||globalThis.crypto;
    const controller=new AbortController(),waiters=new Set(),keys=new Map();
    const metrics={concurrency,ahead,maxBufferedBytes,maxSegmentBytes,activeRequests:0,peakRequests:0,
      reservedBytes:0,peakReservedBytes:0,readyBytes:0,peakReadyBytes:0,peakAhead:0,retries:0,writtenBytes:0,writtenSegments:0};
    let failure=null,nextWrite=0,nextIssue=0,disposed=false;
    const snapshot=()=>({...metrics});
    const emit=()=>options.onMetrics?.(snapshot());
    const notify=()=>{for(const wake of [...waiters])wake();};
    function abort(error){
      if(controller.signal.aborted)return;
      if(!failure)failure=error instanceof Error?error:new DownloadError('CANCELLED','영상 다운로드가 취소되었습니다.');
      if(!controller.signal.aborted)controller.abort(failure);
      notify();
    }
    function check(){
      if(controller.signal.aborted)throw failure;
      if(options.current&&!options.current())abort(new DownloadError('SESSION_CHANGED','채널 또는 로그인 세션이 변경되었습니다.'));
      if(controller.signal.aborted)throw failure||new DownloadError('CANCELLED','영상 다운로드가 취소되었습니다.');
    }
    function until(predicate){
      check();if(predicate())return Promise.resolve();
      return new Promise((resolve,reject)=>{
        const wake=()=>{try{check();if(!predicate())return;waiters.delete(wake);resolve();}catch(e){waiters.delete(wake);reject(e);}};
        waiters.add(wake);wake();
      });
    }
    async function resize(token,size){
      if(size>maxBufferedBytes)throw new DownloadError('SEGMENT_LIMIT','영상 조각이 안전한 메모리 한도를 초과했습니다.');
      const available=()=>metrics.reservedBytes-token.size+size<=(token.index===nextWrite?maxBufferedBytes:ordinaryBudget);
      for(;;){
        check();if(available()){metrics.reservedBytes+=size-token.size;token.size=size;break;}
        await until(available);
      }
      metrics.peakReservedBytes=Math.max(metrics.peakReservedBytes,metrics.reservedBytes);emit();notify();
    }
    function release(token){if(token&&token.size){metrics.reservedBytes-=token.size;token.size=0;emit();notify();}}
    const externalAbort=()=>abort(new DownloadError('CANCELLED','영상 다운로드가 취소되었습니다.'));
    options.signal?.addEventListener('abort',externalAbort,{once:true});
    if(options.signal?.aborted)externalAbort();
    const sessionTimer=options.current?setInterval(()=>{try{check();}catch{}},100):null;
    sessionTimer?.unref?.();
    async function delay(ms){
      check();await new Promise((resolve,reject)=>{
        const cancel=()=>{clearTimeout(timer);controller.signal.removeEventListener('abort',cancel);reject(failure);};
        const timer=setTimeout(()=>{controller.signal.removeEventListener('abort',cancel);resolve();},ms);
        controller.signal.addEventListener('abort',cancel,{once:true});
      });check();
    }
    async function bytes(url,limit,index=null){
      const retries=options.retries??2;
      for(let attempt=0;;attempt++){
        check();let token=null,reader=null,timer=null,expired=false,response=null,complete=false,counted=true;
        const request=new AbortController(),relay=()=>request.abort();
        controller.signal.addEventListener('abort',relay,{once:true});
        const disarm=()=>{clearTimeout(timer);timer=null;};
        const arm=()=>{disarm();timer=setTimeout(()=>{expired=true;request.abort();},options.idleTimeoutMs||30000);};
        metrics.activeRequests++;metrics.peakRequests=Math.max(metrics.peakRequests,metrics.activeRequests);emit();
        try{
          arm();response=await fetcher(url,{cache:'no-store',signal:request.signal});check();
          if(!response.ok){
            const error=new DownloadError('HTTP',`영상 다운로드 HTTP ${response.status}`,response.status);
            const retryAfter=response.headers?.get('retry-after');
            if(retryAfter){const seconds=Number(retryAfter);error.retryAfterMs=Number.isFinite(seconds)?Math.max(0,seconds*1000):Math.max(0,Date.parse(retryAfter)-Date.now());}
            throw error;
          }
          let declared=Number(response.headers?.get('content-length'))||0;
          if(response.headers?.get('content-encoding')&&!/^identity$/i.test(response.headers.get('content-encoding')))declared=0;
          if(declared>limit)throw new DownloadError('SEGMENT_LIMIT','영상 조각이 안전한 메모리 한도를 초과했습니다.');
          let capacity=Math.max(1,Math.min(limit,declared||256*1024)),length=0;
          if(index!==null){token={index,size:0};disarm();await resize(token,2*capacity);check();arm();}
          let data=new Uint8Array(capacity);
          if(response.body?.getReader){
            reader=response.body.getReader();
            for(;;){
              arm();const part=await reader.read();check();if(part.done)break;
              const needed=length+part.value.byteLength;
              if(needed>limit)throw new DownloadError('SEGMENT_LIMIT','영상 조각이 안전한 메모리 한도를 초과했습니다.');
              if(needed>capacity){
                let grown=capacity;while(grown<needed)grown=Math.min(limit,grown*2);
                disarm();if(token)await resize(token,2*grown);check();
                const next=new Uint8Array(grown);next.set(data.subarray(0,length));data=next;capacity=grown;arm();
              }
              data.set(part.value,length);length=needed;
            }
          }else{
            // Older Response adapters need a trustworthy finite length before
            // arrayBuffer(); normal supported browsers use the bounded reader.
            if(!declared)throw new DownloadError('STREAM_UNSUPPORTED','이 브라우저에서 안전한 대용량 영상 읽기를 지원하지 않습니다.');
            data=new Uint8Array(await response.arrayBuffer());length=data.byteLength;check();
            if(length>limit||length>capacity)throw new DownloadError('SEGMENT_LIMIT','영상 조각의 크기를 확인하지 못했습니다.');
          }
          if(index!==null&&length===0)throw new DownloadError('EMPTY_SEGMENT','빈 영상 조각 응답을 받았습니다.');
          complete=true;return{data:data.subarray(0,length),token};
        }catch(error){
          release(token);check();
          const transient=error.code==='HTTP'?[408,429,500,502,503,504].includes(error.status):expired||error instanceof TypeError||error.code==='EMPTY_SEGMENT';
          const wait=Math.max((options.backoffMs??250)*2**attempt,error.retryAfterMs||0);
          if(!transient||attempt>=retries||wait>(options.maxRetryDelayMs??8000)){
            if(error instanceof DownloadError)throw error;
            throw new DownloadError(expired?'TIMEOUT':'NETWORK',expired?'영상 다운로드 응답이 지연되었습니다.':'영상 다운로드 네트워크 오류입니다.');
          }
          // Drop the failed body and its slot before the abortable backoff.
          disarm();request.abort();try{await reader?.cancel();}catch{}
          try{await response?.body?.cancel();}catch{}
          metrics.activeRequests--;counted=false;emit();metrics.retries++;emit();
          controller.signal.removeEventListener('abort',relay);
          await delay(wait);response=null;continue;
        }finally{
          disarm();controller.signal.removeEventListener('abort',relay);
          if(!complete){request.abort();try{await reader?.cancel();}catch{}try{await response?.body?.cancel();}catch{}}
          try{reader?.releaseLock();}catch{}
          // A retried attempt already released its network slot above.
          if(counted){metrics.activeRequests--;emit();}
        }
      }
    }
    async function key(info){
      if(!crypto?.subtle)throw new DownloadError('CRYPTO','이 브라우저에서 Replay AES 복호화를 지원하지 않습니다.');
      if(!keys.has(info.url)){
        const pending=(async()=>{
          const {data}=await bytes(info.url,16);check();
          if(data.byteLength!==16)throw new DownloadError('CRYPTO','Replay AES 키 길이가 올바르지 않습니다.');
          return crypto.subtle.importKey('raw',data,{name:'AES-CBC'},false,['decrypt']);
        })();
        keys.set(info.url,pending);if(keys.size>64)keys.delete(keys.keys().next().value);
      }
      return keys.get(info.url);
    }
    async function transfer(segments,sink,onProgress,iv){
      const ready=new Map();let writer=sink.writable,stage=null;
      try{
        check();
        if(!Array.isArray(segments)||!segments.length)throw new DownloadError('PLAYLIST','영상 조각을 찾지 못했습니다.');
        if(!writer&&options.storageRoot){
          stage=await options.storageRoot(controller.signal);check();writer=stage?.writer;
        }
        const memoryLimit=options.maxMemoryFileBytes||(mobile?128:256)*MiB;
        const take=async()=>{for(;;){check();if(nextIssue>=segments.length)return -1;if(nextIssue<nextWrite+ahead)return nextIssue++;await until(()=>nextIssue>=segments.length||nextIssue<nextWrite+ahead);}};
        const worker=async()=>{
          for(;;){
            const index=await take();if(index<0)return;const segment=segments[index];
            metrics.peakAhead=Math.max(metrics.peakAhead,nextIssue-nextWrite);emit();
            const loaded=await bytes(segment.url,maxSegmentBytes,index);
            let data=loaded.data;
            try{
              if(segment.key){
                const cryptoKey=await key(segment.key);check();
                try{data=new Uint8Array(await crypto.subtle.decrypt({name:'AES-CBC',iv:iv(segment.sequence,segment.key.iv)},cryptoKey,data));}
                catch{throw new DownloadError('CRYPTO','Replay AES 영상 복호화에 실패했습니다.');}
              }
              check();ready.set(index,{data,token:loaded.token});
              metrics.readyBytes+=data.buffer.byteLength;metrics.peakReadyBytes=Math.max(metrics.peakReadyBytes,metrics.readyBytes);emit();notify();
            }catch(e){release(loaded.token);throw e;}
          }
        };
        const workers=Array.from({length:Math.min(concurrency,segments.length)},()=>worker().catch(abort));
        try{
          for(;nextWrite<segments.length;){
            await until(()=>ready.has(nextWrite));const entry=ready.get(nextWrite);check();
            if(writer)await writer.write(entry.data);
            else{
              if(metrics.writtenBytes+entry.data.byteLength>memoryLimit)throw new DownloadError('MEMORY_LIMIT','메모리 저장 한도를 초과했습니다. 파일 직접 저장이 가능한 Chrome·Edge를 이용해주세요.');
              sink.chunks.push(entry.data);
            }
            check();metrics.writtenBytes+=entry.data.byteLength;metrics.writtenSegments++;
            ready.delete(nextWrite);metrics.readyBytes-=entry.data.buffer.byteLength;release(entry.token);nextWrite++;notify();emit();
            onProgress(metrics.writtenSegments,segments.length);
          }
          await Promise.all(workers);check();
          if(writer){await writer.close();check();}
          if(sink.writable){sink.writable=null;return{mode:'direct',...snapshot()};}
          let blob;
          if(stage)blob=new Blob([await stage.file()],{type:'video/mp2t'});
          else{blob=new Blob(sink.chunks,{type:'video/mp2t'});sink.chunks.length=0;}
          check();return{mode:stage?'staged':'memory',blob,discard:stage?.discard,...snapshot()};
        }catch(error){abort(error);throw error;}
        finally{
          await Promise.allSettled(workers);
          for(const entry of ready.values())release(entry.token);ready.clear();metrics.readyBytes=0;
        }
      }catch(error){
        abort(error);try{await writer?.abort?.();}catch{}
        try{await stage?.discard?.();}catch{}
        if(sink.chunks)sink.chunks.length=0;
        throw error;
      }
    }
    function dispose(){
      if(disposed)return;disposed=true;clearInterval(sessionTimer);
      options.signal?.removeEventListener('abort',externalAbort);keys.clear();
    }
    return{abort,dispose,transfer,snapshot,signal:controller.signal,async text(url){const {data}=await bytes(url,8*MiB);return new TextDecoder().decode(data);}};
  }
  return Object.freeze({create,DownloadError});
});
