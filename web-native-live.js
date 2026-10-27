// Browser LIVE integration. The normal Viewer API/UI remains authoritative.
(() => {
  const pending = new Map();
  let id = 0, nativeSequence = 0, frames = 0;
  let performanceStarted = 0, performanceFrames = 0;
  let repaintFrame;
  let latestDecodedAt = 0, syntheticFrames = false;
  let rtc = null, rtcAt = 0, audio = null, audioAt = 0, web = null, webAt = 0, pipeline = null, pipelineAt = 0, overlay, overlayTimer;
  let metricsEnabled = false, metricsSupported = false, metricEpoch = 0;
  const rtcFields = ['receivedWidth', 'receivedHeight', 'decoderFps', 'rendererFps', 'receivedBitrateKbps',
    'frameLossPercent', 'packetLossPercent', 'rxStreamType', 'videoE2eDelayMs', 'nativeAvSyncMs',
    'videoFrozenMs', 'videoFrozenPercent', 'audioNetworkDelayMs', 'audioJitterBufferMs', 'audioLossPercent', 'audioBitrateKbps', 'audioE2eDelayMs'];
  const latencyNames = ['captureEncode', 'ackRoundTrip', 'nativeIpc', 'transport', 'imageLoadDecode', 'imageDecode', 'repaintWait'];
  const latencyFields = latencyNames.flatMap(name => [name + 'AvgMs', name + 'MaxMs', name + 'Samples']);
  const samples = new Map();
  function sample(name, ms) {
    if (!Number.isFinite(ms) || ms < 0 || ms > 60000) return;
    const v = samples.get(name) || { sum: 0, max: 0, count: 0 };
    v.sum += ms; v.max = Math.max(v.max, ms); v.count++; samples.set(name, v);
  }
  function takeSamples() {
    const out = {};
    for (const [name, v] of samples) {
      out[name + 'AvgMs'] = Math.round(v.sum / v.count * 10) / 10;
      out[name + 'MaxMs'] = Math.round(v.max * 10) / 10; out[name + 'Samples'] = v.count;
    }
    samples.clear(); return out;
  }
  const metricSources = Object.freeze({
    rtcVideo:'Agora SDK 4.6.2 RemoteVideoStats: received resolution, decoder/renderer FPS, Kbps, loss %, stream 0=High/1=Low',
    rtcAudio:'Agora SDK 4.6.2 RemoteAudioStats; delays in ms. Audio state is SDK receiving state, not proof of speaker output.',
    nativeAvSyncMs:'SDK RemoteVideoStats.avSyncTimeMs; positive=audio leads video; negative=audio lags video; excludes JPEG/extension/web delay',
    pipeline:'Native capture+JPEG and matching ACK RTT interval average/max; milliseconds',
    nativeIpc:'player IPC send to Native main receipt; host clocks',
    transport:'Native main IPC receipt to page frame receipt (serialization/extension included); cross-process clock estimate, not network latency',
    imageLoadDecode:'page frame receipt to image load/decode completion; imageDecode is explicit decode() wait only',
    repaintWait:'decoded image to next coalesced requestAnimationFrame; displayFps is page update proxy, compositor presentation UNAVAILABLE',
    sourceResolution:'UNAVAILABLE: received/canvas resolution does not identify original broadcaster resolution'
  });
  function metricsSnapshot() {
    const now=performance.now(), enabled=!!nativeSequence && metricsEnabled;
    const fresh=(value,at)=>enabled && value && now-at<6500 ? {...value} : 'UNAVAILABLE';
    return {schemaVersion:1, enabled, nativeMetricsSupported:metricsSupported, sourceResolution:'UNAVAILABLE',
      rtc:fresh(rtc,rtcAt), audio:fresh(audio,audioAt), web:fresh(web,webAt), pipeline:fresh(pipeline,pipelineAt), sources:{...metricSources}};
  }
  window.FrommLiveMetrics = metricsSnapshot;
  function clearMetrics() {
    rtc=audio=web=pipeline=null;rtcAt=audioAt=webAt=pipelineAt=0;
    samples.clear();performanceStarted=0;performanceFrames=0;latestDecodedAt=0;metricEpoch++;
  }
  async function setMetrics(enabled) {
    const next=enabled===true && !!nativeSequence && metricsSupported;
    if(next===metricsEnabled) return next;
    const connection=nativeSequence;
    metricsEnabled=next;clearMetrics();
    const epoch=metricEpoch;
    clearInterval(overlayTimer);overlayTimer=undefined;
    if(next && typeof setInterval==='function') overlayTimer=setInterval(renderMetrics,1000);
    renderMetrics();
    try { await call('diagnostics',{enabled:next},3000); }
    catch { if(connection===nativeSequence && epoch===metricEpoch){metricsEnabled=false;clearMetrics();clearInterval(overlayTimer);overlayTimer=undefined;renderMetrics();} }
    return metricsEnabled;
  }
  window.FrommSetLiveDiagnostics = setMetrics;
  function renderMetrics() {
    const grid=document.getElementById('liveVideoGrid');
    if(!grid?.after || !nativeSequence) return;
    if(!overlay?.isConnected){
      overlay=document.createElement('details');overlay.id='nativeLiveMetrics';
      overlay.style.cssText='font-size:12px;color:var(--muted,#aab4c2);padding:8px 12px;max-width:100%;box-sizing:border-box';
      const summary=document.createElement('summary');summary.textContent='LIVE 진단';summary.style.cursor='pointer';
      const copy=document.createElement('button');copy.type='button';copy.textContent='진단 JSON 복사';copy.className='btn';
      copy.addEventListener('click',async()=>{
        try{await navigator.clipboard.writeText(JSON.stringify(metricsSnapshot(),null,2));copy.textContent='복사됨';}
        catch{copy.textContent='복사 실패 · 콘솔에서 FrommLiveMetrics() 확인';}
      });
      const text=document.createElement('pre');text.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0;font:inherit;max-height:38vh;overflow:auto;scrollbar-width:thin';
      overlay.append(summary,copy,text);(grid.closest?.('.live-stage') || grid).after(overlay);
      overlay.addEventListener('toggle',event=>{if(event.currentTarget===overlay)void setMetrics(event.currentTarget.open);});
    }
    if(!overlay.open && !metricsEnabled) return;
    const snapshot=metricsSnapshot();
    const n=(value,unit='')=>Number.isFinite(value)?`${value}${unit}`:'UNAVAILABLE';
    const r=snapshot.rtc,a=snapshot.audio,w=snapshot.web,p=snapshot.pipeline;
    const stream=r?.rxStreamType===0?'High':r?.rxStreamType===1?'Low':'UNAVAILABLE';
    overlay.lastChild.textContent=(!metricsSupported?'PC LIVE 0.5.0 + 확장 1.0.9 업데이트가 필요합니다.\n':!metricsEnabled?'진단 수집 꺼짐\n':'')+[
      `수신 해상도: ${n(r?.receivedWidth)} × ${n(r?.receivedHeight)} (원본 송출 해상도: UNAVAILABLE)`,
      `SDK 디코더/Native 렌더러 FPS: ${n(r?.decoderFps)} / ${n(r?.rendererFps)} · 스트림: ${stream}`,
      `수신 비트레이트: ${n(r?.receivedBitrateKbps,' Kbps')} · SDK frameLossRate/packetLossRate: ${n(r?.frameLossPercent,'%')} / ${n(r?.packetLossPercent,'%')}`,
      `캡처+JPEG 평균/최대: ${n(p?.captureEncodeAvgMs,'ms')} / ${n(p?.captureEncodeMaxMs,'ms')} · 캡처 FPS: ${n(p?.captureFps)}`,
      `Native IPC / 웹 전달 추정 평균: ${n(w?.nativeIpcAvgMs,'ms')} / ${n(w?.transportAvgMs,'ms')}`,
      `이미지 로드+해독 / decode() 대기 / rAF 대기 평균: ${n(w?.imageLoadDecodeAvgMs,'ms')} / ${n(w?.imageDecodeAvgMs,'ms')} / ${n(w?.repaintWaitAvgMs,'ms')}`,
      `ACK 왕복 평균/최대: ${n(p?.ackRoundTripAvgMs,'ms')} / ${n(p?.ackRoundTripMaxMs,'ms')} · 타임아웃: ${n(p?.ackTimeouts)}`,
      `웹 갱신 FPS(rAF): ${n(w?.displayFps)}${w?.synthetic?' · SYNTHETIC 실제 LIVE 아님':''} · 모니터 실제 표시 시각: UNAVAILABLE`,
      `SDK 음성 수신 상태: ${typeof a?.audioReceiving==='boolean'?(a.audioReceiving?'수신':'중단'):'UNAVAILABLE'} · 음성 비트레이트: ${n(a?.audioBitrateKbps,' Kbps')}`,
      `SDK 음성 네트워크 / 지터 버퍼 / E2E 지연: ${n(a?.audioNetworkDelayMs,'ms')} / ${n(a?.audioJitterBufferMs,'ms')} / ${n(a?.audioE2eDelayMs,'ms')}`,
      `SDK 영상 E2E 지연: ${n(r?.videoE2eDelayMs,'ms')} · Native AV 차이: ${n(r?.nativeAvSyncMs,'ms')} (양수: 음성 선행, 웹 전달 지연 제외)`,
      '수치는 SDK 콜백·단계별 계측값입니다. 전체 출처·평균/최대/표본 수는 진단 JSON에 포함됩니다.'
    ].join('\n');
  }
  function call(method, params = {}, timeout = 25000) {
    return new Promise((resolve, reject) => {
      const requestId = ++id;
      const timer = setTimeout(() => { pending.delete(requestId); reject(new Error('PC LIVE 연결 도구와 새 확장프로그램을 설치한 뒤 웹을 새로고침해주세요.')); }, timeout);
      pending.set(requestId, { resolve, reject, timer });
      window.postMessage({ protocol: 'fromm-native-v1', direction: 'page', value: { id: requestId, method, params } }, location.origin);
    });
  }
  window.addEventListener('message', event => {
    const m = event.data;
    if (event.source !== window || event.origin !== location.origin || m?.protocol !== 'fromm-native-v1' || m.direction !== 'extension') return;
    const value = m.value;
    if (Number.isSafeInteger(value?.id) && pending.has(value.id)) {
      const p = pending.get(value.id); clearTimeout(p.timer); pending.delete(value.id);
      value.ok ? p.resolve(value) : p.reject(new Error('PC LIVE 연결 실패 · ' + (/^[A-Z_]{1,64}$/.test(value.code) ? value.code : 'NATIVE_FAILED')));
      return;
    }
    if (value?.type === 'status' && value.value?.stage === 'native-disconnected') {
      for (const [key, p] of pending) { clearTimeout(p.timer); p.reject(new Error('PC LIVE 연결 도구를 설치하거나 다시 연결해주세요.')); pending.delete(key); }
    }
    if (!nativeSequence || nativeSequence !== state.live.connectionSeq || state.filter !== 'live' || state.live.centerMode !== 'live') return;
    if (value?.type === 'status') {
      const stage = /^[a-z0-9-]{1,64}$/.test(value.value?.stage) ? value.value.stage : 'unknown';
      if(['rtc-video-stats','rtc-audio-stats','rtc-audio-state','pipeline-performance'].includes(stage) && !metricsEnabled) return;
      const details = { stage };
      for (const key of ['code', 'width', 'height', 'keyBytes', 'saltBytes', ...rtcFields, ...latencyFields,
        'targetFps', 'captureFps', 'ackWaitTicks', 'ackTimeouts', 'captureMisses']) if (Number.isFinite(value.value[key])) details[key] = value.value[key];
      if (typeof value.value.synthetic === 'boolean') details.synthetic = value.value.synthetic;
      recordLiveDiagnostic('native-' + stage, details);
      if(metricsEnabled){
        if(stage==='rtc-video-stats' && details.synthetic===false){rtc=details;rtcAt=performance.now();}
        else if(stage==='rtc-audio-stats' && details.synthetic===false){audio={...audio,...details};audioAt=performance.now();}
        else if(stage==='rtc-audio-state'){audio={...audio,audioReceiving:value.value.audioReceiving===true};audioAt=performance.now();}
        else if(stage==='pipeline-performance'){pipeline=details;pipelineAt=performance.now();}
      }
      if(stage==='rtc-unavailable' || stage==='left' || stage==='native-disconnected') clearMetrics();
      if (stage === 'join-succeeded') liveStatusText('LIVE 연결됨 · 영상 스트림 대기 중');
      else if (stage === 'audio-frame') liveStatusText('LIVE 소리 수신됨 · PC 연결 도구에서 재생');
      else if (stage.includes('failed') || stage === 'encryption-error' || stage === 'native-disconnected') liveStatusText('PC LIVE ' + stage, true);
      else if (stage === 'left') state.live.client=null;
      if(stage==='native-disconnected' || stage==='left'){
        nativeSequence=0;metricsEnabled=false;clearInterval(overlayTimer);overlayTimer=undefined;
        if(repaintFrame!==undefined) cancelAnimationFrame(repaintFrame);repaintFrame=undefined;
        if(overlay?.lastChild) overlay.lastChild.textContent=JSON.stringify(metricsSnapshot(),null,2);
        state.live.client=null;
      }
    }
    if (value?.type === 'frame' && Number.isSafeInteger(value.sequence) && value.sequence > 0 && typeof value.jpeg === 'string' && value.jpeg.length < 800000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value.jpeg)) {
      const grid = document.getElementById('liveVideoGrid'); if (!grid) return;
      let image = document.getElementById('nativeLiveVideo');
      if (!image) {
        grid.replaceChildren(); image = document.createElement('img'); image.id = 'nativeLiveVideo'; image.alt = 'LIVE 영상';
        image.style.cssText = 'display:block;width:100%;height:100%;max-height:75vh;object-fit:contain;background:#000'; grid.append(image);
      }
      const connection = nativeSequence;
      const measuring=metricsEnabled, epoch=metricEpoch;
      const receivedAt = measuring ? performance.now() : 0;
      syntheticFrames = value.synthetic === true;
      if(measuring){sample('nativeIpc', value.nativeIpcMs);sample('transport', performance.timeOrigin + receivedAt - value.sentAt);}
      const acknowledgeFrame = () => {
        if (connection === nativeSequence && connection === state.live.connectionSeq && image.isConnected) window.postMessage({ protocol: 'fromm-native-v1', direction: 'page', value: { id: ++id, method: 'frame-ack', params: { sequence: value.sequence } } }, location.origin);
      };
      image.onload = async () => {
        if (connection !== nativeSequence || connection !== state.live.connectionSeq || !image.isConnected) return;
        const decodeStarted = measuring ? performance.now() : 0;
        try { if (image.decode) await image.decode(); }
        catch { acknowledgeFrame(); return; }
        if (connection !== nativeSequence || connection !== state.live.connectionSeq || !image.isConnected) return;
        if(measuring && metricsEnabled && epoch===metricEpoch){
          const decodedAt=performance.now();sample('imageLoadDecode',decodedAt-receivedAt);
          if(image.decode)sample('imageDecode',decodedAt-decodeStarted);latestDecodedAt=decodedAt;
        }
        acknowledgeFrame();
        if (frames++ === 0) { recordLiveDiagnostic('native-web-frame', { mediaVerified: !syntheticFrames, synthetic: syntheticFrames }); liveStatusText('LIVE 재생 중 · PC 소리 출력'); }
        // At most one pending repaint, including while a web tab is hidden.
        // Several decoded images before one repaint count as one displayed frame.
        if (repaintFrame !== undefined) return;
        repaintFrame = requestAnimationFrame(() => {
          repaintFrame = undefined;
          if (connection !== nativeSequence || !image.isConnected) return;
          const now = performance.now();
          if(measuring && metricsEnabled && epoch===metricEpoch)sample('repaintWait',now-latestDecodedAt);
          // rAF is a scheduling proxy, not proof of compositor presentation.
          if (!performanceStarted) { performanceStarted = now; performanceFrames = 0; return; }
          performanceFrames++;
          if (now - performanceStarted >= 5000) {
            web = { targetFps: 30, displayFps: Math.round(performanceFrames * 10000 / (now - performanceStarted)) / 10,
              ...(metricsEnabled?takeSamples():{}), synthetic: syntheticFrames };
            webAt = now;
            recordLiveDiagnostic('native-web-performance', {targetFps:30,displayFps:web.displayFps,synthetic:syntheticFrames});
            performanceStarted = now; performanceFrames = 0;
          }
        });
      };
      image.onerror = acknowledgeFrame;
      image.src = value.jpeg;
    }
  });
  const originalEncryption = liveEncryptionCandidates;
  const originalConnect = connectAgoraLive;
  const originalStop = stopLivePlayback;
  const originalAudio = resumeLiveAudio;
  liveEncryptionCandidates = room => {
    if (typeof room?.encryptionKey === 'string' && new TextEncoder().encode(room.encryptionKey).length > 62) {
      return [{ mode: 'aes-256-gcm2', key: room.encryptionKey, salt: decodeLiveEncryptionSalt(room.encryptionSalt), native: true }];
    }
    return originalEncryption(room);
  };
  stopLivePlayback = async options => {
    const wasNative = nativeSequence;
    if (repaintFrame !== undefined) cancelAnimationFrame(repaintFrame);
    repaintFrame = undefined;
    nativeSequence = 0; frames = 0; performanceStarted = 0; performanceFrames = 0;
    metricsEnabled=false;metricsSupported=false;clearMetrics();overlay?.remove();overlay=undefined;
    if (overlayTimer !== undefined) clearInterval(overlayTimer); overlayTimer = undefined;
    const stopping = originalStop(options);
    if (wasNative) { try { await call('leave', {}, 3000); } catch {} }
    await stopping;
  };
  connectAgoraLive = async options => {
    const room = state.live.room;
    if (!room || typeof room.encryptionKey !== 'string' || new TextEncoder().encode(room.encryptionKey).length <= 62) return originalConnect(options);
    if (!/Windows/i.test(navigator.userAgent)) throw new Error('이 방송은 Windows PC LIVE 연결 도구로 시청할 수 있습니다.');
    resolveAgoraJoinArgs(room, state.live.tokenInfo, state.live.currentLiveRoomId);
    const requestSeq = state.live.requestSeq, generation = state.scanGeneration;
    await stopLivePlayback();
    if (requestSeq !== state.live.requestSeq || generation !== state.scanGeneration || state.filter !== 'live') return;
    const hello = await call('hello', {}, 4000);
    if (!hello.backgroundPlayer || !hello.frameAck || hello.targetFps !== 30 || !['1.0.7', '1.0.8', '1.0.9'].includes(hello.extensionVersion)) throw new Error('백그라운드 30fps 재생에는 PC LIVE 도구 0.4.0과 최신 확장이 필요합니다. PC LIVE 설치로 업데이트해 주세요.');
    const auth = currentAuth();
    const seq = ++state.live.connectionSeq; nativeSequence = seq; frames = 0;
    metricsSupported=hello.receiveMetrics===true && hello.extensionVersion==='1.0.9';
    renderMetrics();
    state.live.phase = 'native-join';
    state.live.audioBlocked = false;
    liveStatusText('PC LIVE 연결 중...');
    try {
      await call('join', { roomId: room.id, channelId: state.live.entry.channelId, uuid: auth.uuid, authToken: auth.token }, 35000);
      if (seq !== state.live.connectionSeq || requestSeq !== state.live.requestSeq) return;
      state.live.client = { removeAllListeners() {}, leave: async () => {}, remoteUsers: [] };
      liveStatusText('LIVE 연결 요청됨 · 영상 스트림 대기 중');
    } catch (error) { nativeSequence=0;metricsEnabled=false;clearMetrics();overlay?.remove();overlay=undefined;throw error; }
  };
  // Agora Native playout starts with join; browser autoplay does not govern it.
  resumeLiveAudio = () => nativeSequence ? Promise.resolve() : originalAudio();
  window.addEventListener('pagehide', () => { if (nativeSequence) window.postMessage({ protocol: 'fromm-native-v1', direction: 'page', value: { id: ++id, method: 'leave' } }, location.origin); });
})();
