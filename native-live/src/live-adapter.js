// Runtime overlay. vendor/index.html stays byte-for-byte GitHub main 1.06.
(() => {
  document.title = 'Fromm Viewer 1.06 · Native prototype';
  const originalStop = stopLivePlayback;
  let currentNative = false;
  liveEncryptionCandidates = room => {
    if (typeof room?.encryptionKey !== 'string' || !room.encryptionKey) throw new Error('KEY_INVALID');
    return [{ mode: 'aes-256-gcm2', key: room.encryptionKey, salt: decodeLiveEncryptionSalt(room.encryptionSalt) }];
  };
  stopLivePlayback = async options => {
    // Clear viewer ownership synchronously before waiting for IPC.
    const stopping = originalStop(options);
    if (currentNative) { currentNative = false; await frommDesktop.leave(); }
    if (options?.clearRoom) await frommDesktop.reset();
    await stopping;
  };
  connectAgoraLive = async () => {
    const room = state.live.room;
    if (!room || !state.live.token || !state.live.tokenInfo) throw new Error('ENTER_REQUIRED');
    resolveAgoraJoinArgs(room, state.live.tokenInfo, state.live.currentLiveRoomId);
    const requestSeq = state.live.requestSeq;
    await stopLivePlayback();
    if (requestSeq !== state.live.requestSeq || state.filter !== 'live') return;
    state.live.phase = 'native-join';
    const result = await frommDesktop.join(room.id);
    if (!result.ok) throw new Error(result.code || 'NATIVE_JOIN_FAILED');
    currentNative = true;
    // Existing UI uses client presence to keep discovery from repeatedly joining.
    state.live.client = { removeAllListeners() {}, leave: async () => {},
      renewToken: async () => { const r = await frommDesktop.renew(); if (!r.ok) throw new Error(r.code); }, remoteUsers: [] };
    liveStatusText('Native LIVE 연결 요청됨 · 별도 재생 창 확인');
  };
  resumeLiveAudio = () => frommDesktop.show();
  ensureAgoraRtcSdk = async () => { throw new Error('이 실험 앱은 Native SDK로 LIVE를 재생합니다.'); };
  runUnencryptedAgoraJoinProbe = async () => { throw new Error('이 실험 앱은 암호화된 정상 입장만 지원합니다.'); };
  frommDesktop.onStatus(value => {
    recordLiveDiagnostic(`native-${value.stage}`, value);
    if (!currentNative) return;
    if (value.stage === 'token-renew-needed') renewLiveToken();
    else if (value.stage === 'join-succeeded') liveStatusText('Native 입장 성공 · 영상/소리 대기 중');
    else if (value.stage === 'video-frame') liveStatusText('Native 영상 프레임 수신됨 · 재생 창 확인');
    else if (value.stage === 'audio-frame') liveStatusText('Native 오디오 프레임 수신됨');
    else if (value.stage.includes('failed') || value.stage === 'encryption-error') liveStatusText(`Native ${value.stage} · code ${value.code ?? '?'}`, true);
    else if (value.stage === 'left') { currentNative = false; state.live.client = null; }
  });
  const label = document.querySelector('#viewerBuildLabel');
  if (label) label.textContent = '1.06 · Native 실험판';
})();
