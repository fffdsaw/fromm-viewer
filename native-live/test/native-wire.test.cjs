'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { encode, Decoder } = require('../src/native-wire.cjs');
test('Chrome frames survive split length, split body and concatenated messages', () => {
  const values = [], d = new Decoder(v => values.push(v));
  const bytes = Buffer.concat([encode({ id: 1, method: 'hello' }), encode({ id: 2, method: 'leave' })]);
  for (const byte of bytes) d.push(Buffer.from([byte]));
  assert.deepEqual(values, [{ id: 1, method: 'hello' }, { id: 2, method: 'leave' }]);
});
test('internal Electron startup whitespace cannot corrupt Chrome stdout framing', () => {
  const values = [], d = new Decoder(v => values.push(v), true);
  d.push(Buffer.concat([Buffer.from('\r\n'), encode({ id: 1, ok: true }, true)]));
  assert.deepEqual(values, [{ id: 1, ok: true }]);
});
test('invalid and oversized protocol messages rejected', () => {
  for (const n of [0, 1024 * 1024 + 1]) { const b = Buffer.alloc(4); b.writeUInt32LE(n); assert.throws(() => new Decoder(() => {}).push(b)); }
  assert.throws(() => encode({ body: 'a'.repeat(1024 * 1024) }));
});
