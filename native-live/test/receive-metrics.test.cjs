'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { remoteStats, LatencyWindow } = require('../src/receive-metrics.cjs');
const { safeDiagnostic } = require('../src/contracts.cjs');
test('SDK remote receive fields use correct units; source resolution and identities are never inferred', () => {
  const stats = remoteStats({ uid: 42, width: 720, height: 1280, decoderOutputFrameRate: 30, rendererOutputFrameRate: 29,
    receivedBitrate: 1600, frameLossRate: 2, packetLossRate: 1, avSyncTimeMs: -12, rxStreamType: 0,
    encryptionKey: 'DO_NOT_COPY', rtcToken: 'DO_NOT_COPY', sourceWidth: 1080 });
  assert.deepEqual(stats, { stage: 'rtc-video-stats', synthetic: false, receivedWidth: 720, receivedHeight: 1280,
    decoderFps: 30, rendererFps: 29, receivedBitrateKbps: 1600, frameLossPercent: 2, packetLossPercent: 1, rxStreamType: 0, nativeAvSyncMs: -12 });
  assert.deepEqual(safeDiagnostic(stats), stats);
});
const sdkTypesPath = path.join(__dirname, '../node_modules/agora-electron-sdk/types/Private/IAgoraRtcEngine.d.ts');
test('installed Agora 4.6.2 declares the mapped remote callback fields', { skip: !fs.existsSync(sdkTypesPath) }, () => {
  const sdkTypes = fs.readFileSync(sdkTypesPath, 'utf8');
  const video = sdkTypes.split('class RemoteVideoStats')[1].split('\n}')[0];
  for (const field of ['width', 'height', 'decoderOutputFrameRate', 'rendererOutputFrameRate', 'receivedBitrate', 'packetLossRate', 'avSyncTimeMs']) assert.ok(video.includes(field + '?: number'));
});
test('absent, invalid and negative metrics remain absent; audio jitter buffer is not network jitter', () => {
  assert.deepEqual(remoteStats({ width: NaN, height: -1, receivedBitrate: '1600', rendererOutputFrameRate: Infinity }), { stage: 'rtc-video-stats', synthetic: false });
  assert.deepEqual(remoteStats({ uid: 99, networkTransportDelay: 15, jitterBufferDelay: 20, audioLossRate: 0 }, true),
    { stage: 'rtc-audio-stats', synthetic: false, audioNetworkDelayMs: 15, audioJitterBufferMs: 20, audioLossPercent: 0 });
});
test('latency windows aggregate and reset without keeping raw frames or secrets', () => {
  const window = new LatencyWindow();
  for (const n of [1, 2, 6, NaN, -1, Infinity, 60001]) window.add('ackRoundTrip', n);
  assert.deepEqual(window.take(), { ackRoundTripAvgMs: 3, ackRoundTripMaxMs: 6, ackRoundTripSamples: 3 });
  assert.deepEqual(window.take(), {});
  assert.deepEqual(safeDiagnostic({ stage: 'pipeline-performance', ackRoundTripAvgMs: 3, token: 'SECRET', uid: 42, connection: { channelId: 'SECRET' }, receivedWidth: 'SECRET' }),
    { stage: 'pipeline-performance', ackRoundTripAvgMs: 3 });
});
