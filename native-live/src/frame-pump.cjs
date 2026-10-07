'use strict';
// One frame awaiting acknowledgement and one asynchronous encoder at most.
// Late acknowledgements cannot release a newer frame or a different session.
class FramePump {
  constructor({ capture, send, fps = 30, timeout = 500, now = () => performance.now(), setTimer = setInterval, clearTimer = clearInterval, onError = () => {} }) {
    Object.assign(this, { capture, send, fps, timeout, now, setTimer, clearTimer, onError });
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
    if (this.pending?.sequence === sequence) this.pending = null;
  }
  async tick() {
    if (!this.running || this.encoding || (this.pending && this.now() - this.pending.started < this.timeout)) return;
    const generation = this.generation;
    const captureStarted = this.now();
    this.encoding = true;
    try {
      const jpeg = await this.capture();
      if (!this.running || generation !== this.generation || !jpeg) return;
      const sequence = ++this.sequence;
      this.pending = { sequence, started: this.now() };
      this.send({ jpeg, sequence, captureMs: this.now() - captureStarted });
    } catch { if (generation === this.generation) this.onError(); }
    finally { if (generation === this.generation) this.encoding = false; }
  }
}
module.exports = { FramePump };
