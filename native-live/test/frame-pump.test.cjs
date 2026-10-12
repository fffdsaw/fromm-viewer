'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { FramePump } = require('../src/frame-pump.cjs');
function setup(capture = async () => 'synthetic-frame') {
  let time = 0, interval;
  const sent = [];
  const pump = new FramePump({ capture, send: f => sent.push(f), now: () => time, setTimer: (_callback, ms) => { interval = ms; return 1; }, clearTimer() {} });
  pump.start();
  return { pump, sent, setTime: t => { time = t; }, interval: () => interval };
}
test('30fps scheduler waits for matching browser ACK and never queues old frames', async () => {
  const h = setup(); assert.equal(h.interval(), 1000 / 30);
  await h.pump.tick();
  for (let t = 33; t < 400; t += 33) { h.setTime(t); await h.pump.tick(); }
  assert.equal(h.sent.length, 1);
  h.pump.acknowledge(999); await h.pump.tick(); assert.equal(h.sent.length, 1);
  h.pump.acknowledge(h.sent[0].sequence); await h.pump.tick(); assert.equal(h.sent.length, 2);
});
test('an unresponsive or hidden browser recovers with a fresh frame after bounded timeout', async () => {
  const h = setup(); await h.pump.tick(); h.setTime(501); await h.pump.tick();
  assert.equal(h.sent.length, 2);
  h.pump.acknowledge(h.sent[0].sequence); await h.pump.tick(); assert.equal(h.sent.length, 2);
  h.pump.acknowledge(h.sent[1].sequence); await h.pump.tick(); assert.equal(h.sent.length, 3);
});
test('slow JPEG encoding permits only one encoder and stopping discards its result', async () => {
  let resolve, captures = 0;
  const h = setup(() => { captures++; return new Promise(r => { resolve = r; }); });
  const current = h.pump.tick(); await h.pump.tick(); assert.equal(captures, 1);
  h.pump.stop(); resolve('late-frame'); await current; assert.equal(h.sent.length, 0);
});
test('capture completing from an earlier playback session cannot overwrite a restarted session', async () => {
  let resolve, calls = 0;
  const h = setup(() => ++calls === 1 ? new Promise(r => { resolve = r; }) : Promise.resolve('new-frame'));
  const old = h.pump.tick(); h.pump.start(); await h.pump.tick(); resolve('old-frame'); await old;
  assert.deepEqual(h.sent.map(f => f.jpeg), ['new-frame']); assert.ok(h.pump.pending);
});
test('missing/oversized canvas capture sends nothing and the next valid frame still works', async () => {
  let valid = false;
  const h = setup(async () => valid ? 'good-frame' : null); await h.pump.tick(); assert.equal(h.sent.length, 0);
  valid = true; await h.pump.tick(); assert.equal(h.sent.length, 1);
});
test('only matching ACK records RTT and a timeout records pressure without releasing a newer frame', async () => {
  const h = setup(), metrics = [];
  h.pump.onMetric = (name, value) => metrics.push([name, value]);
  await h.pump.tick(); h.setTime(40); await h.pump.tick();
  h.pump.acknowledge(999); assert.equal(metrics.some(([name]) => name === 'ackRoundTrip'), false);
  h.pump.acknowledge(1); assert.deepEqual(metrics.at(-1), ['ackRoundTrip', 40]);
  await h.pump.tick(); h.setTime(541); await h.pump.tick();
  assert.ok(metrics.some(([name]) => name === 'ackTimeouts'));
  assert.ok(metrics.some(([name]) => name === 'ackWaitTicks'));
  h.pump.acknowledge(2); assert.equal(h.pump.pending.sequence, 3);
});
