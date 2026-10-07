'use strict';
const MAGIC = Buffer.from('FMNM');
const MAX = 1024 * 1024;
function encode(value, magic = false) {
  const body = Buffer.from(JSON.stringify(value));
  if (!body.length || body.length > MAX) throw new Error('MESSAGE_SIZE');
  const header = Buffer.alloc(4); header.writeUInt32LE(body.length);
  return Buffer.concat(magic ? [MAGIC, header, body] : [header, body]);
}
class Decoder {
  constructor(callback, magic = false) { this.callback = callback; this.magic = magic; this.buffer = Buffer.alloc(0); }
  push(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      if (this.magic) {
        const start = this.buffer.indexOf(MAGIC);
        if (start < 0) { if (this.buffer.length > 64) throw new Error('PROTOCOL_INVALID'); return; }
        if (start) this.buffer = this.buffer.subarray(start);
      }
      const offset = this.magic ? 4 : 0;
      if (this.buffer.length < offset + 4) return;
      const length = this.buffer.readUInt32LE(offset);
      if (!length || length > MAX) throw new Error('MESSAGE_SIZE');
      if (this.buffer.length < offset + 4 + length) return;
      const body = this.buffer.subarray(offset + 4, offset + 4 + length);
      const value = JSON.parse(body.toString('utf8'));
      this.buffer = this.buffer.subarray(offset + 4 + length);
      this.callback(value);
    }
  }
}
module.exports = { encode, Decoder };
