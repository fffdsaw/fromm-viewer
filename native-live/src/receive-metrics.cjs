'use strict';
// Agora 4.6.2 RemoteVideoStats/RemoteAudioStats. Never copy a callback object:
// uid/connection/credentials must stay inside the player.
const VIDEO_FIELDS = {
  width: 'receivedWidth', height: 'receivedHeight',
  decoderOutputFrameRate: 'decoderFps', rendererOutputFrameRate: 'rendererFps',
  receivedBitrate: 'receivedBitrateKbps', frameLossRate: 'frameLossPercent',
  packetLossRate: 'packetLossPercent', rxStreamType: 'rxStreamType',
  e2eDelay: 'videoE2eDelayMs', avSyncTimeMs: 'nativeAvSyncMs',
  totalFrozenTime: 'videoFrozenMs', frozenRate: 'videoFrozenPercent'
};
const AUDIO_FIELDS = {
  networkTransportDelay: 'audioNetworkDelayMs', jitterBufferDelay: 'audioJitterBufferMs',
  audioLossRate: 'audioLossPercent', receivedBitrate: 'audioBitrateKbps', e2eDelay: 'audioE2eDelayMs'
};
const RTC_FIELDS = Object.freeze([...Object.values(VIDEO_FIELDS), ...Object.values(AUDIO_FIELDS)]);
function remoteStats(stats, audio = false) {
  const result = { stage: audio ? 'rtc-audio-stats' : 'rtc-video-stats', synthetic: false };
  for (const [sdk, name] of Object.entries(audio ? AUDIO_FIELDS : VIDEO_FIELDS)) {
    const value = stats?.[sdk];
    if (Number.isFinite(value) && (value >= 0 || name === 'nativeAvSyncMs')) result[name] = value;
  }
  return result;
}
// Bounded, interval aggregates. No arrays of frames or callback objects retained.
class LatencyWindow {
  constructor() { this.reset(); }
  reset() { this.values = new Map(); }
  add(name, ms) {
    if (!Number.isFinite(ms) || ms < 0 || ms > 60000) return;
    const item = this.values.get(name) || { count: 0, total: 0, max: 0 };
    item.count++; item.total += ms; item.max = Math.max(item.max, ms); this.values.set(name, item);
  }
  take() {
    const out = {};
    for (const [name, v] of this.values) {
      out[name + 'AvgMs'] = Math.round(v.total / v.count * 10) / 10;
      out[name + 'MaxMs'] = Math.round(v.max * 10) / 10;
      out[name + 'Samples'] = v.count;
    }
    this.reset(); return out;
  }
}
const PIPELINE_FIELDS = Object.freeze(['captureEncode', 'ackRoundTrip', 'nativeIpc', 'transport', 'imageLoadDecode', 'imageDecode', 'repaintWait']
  .flatMap(name => [name + 'AvgMs', name + 'MaxMs', name + 'Samples']));
module.exports = { RTC_FIELDS, PIPELINE_FIELDS, remoteStats, LatencyWindow };
