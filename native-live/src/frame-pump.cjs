'use strict';
// One frame awaiting acknowledgement and one asynchronous encoder at most.
// Late acknowledgements cannot release a newer frame or a different session.
class FramePump {
  constructor({ capture, send, fps = 30, timeout = 500, now = () => performance.now(), setTimer = setInterval, clearTimer = clearInterval, onError = () => {}, onMetric = () => {} }) {
    Object.assign(this, { capture, send, fps, timeout, now, setTimer, clearTimer, onError, onMetric });
    this.sequence = 0; this.generation = 0; this.running = false;
  }
  start() {
    this.stop(); this.running = true;
    this.timer = this.setTimer(() => this.tick(), 1000 / this.fps);
  }
  stop() {
    this.generation++; this.running = false; this.pending = null; this.encoding = false;
    if (this.timer !== undefined) this.clearTimer(this.timer);
    this.timer = undefined;
  }
  acknowledge(sequence) {
    if (this.pending?.sequence === sequence) {
      this.onMetric('ackRoundTrip', this.now() - this.pending.started);
      this.pending = null;
    }
  }
  async tick() {
    if (!this.running || this.encoding) return;
    if (this.pending && this.now() - this.pending.started < this.timeout) { this.onMetric('ackWaitTicks', 1); return; }
    if (this.pending) this.onMetric('ackTimeouts', 1);
    const generation = this.generation;
    const captureStarted = this.now();
    this.encoding = true;
    try {
      const jpeg = await this.capture();
      if (!this.running || generation !== this.generation) return;
      if (!jpeg) { this.onMetric('captureMisses', 1); return; }
      const captureMs = this.now() - captureStarted;
      this.onMetric('captureEncode', captureMs);
      const sequence = ++this.sequence;
      this.pending = { sequence, started: this.now() };
      this.send({ jpeg, sequence, captureMs });
    } catch { if (generation === this.generation) this.onError(); }
    finally { if (generation === this.generation) this.encoding = false; }
  }
}
module.exports = { FramePump };
