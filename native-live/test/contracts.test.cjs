'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { deflateSync } = require('node:zlib');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { salt32, enterEnvelope, apiRequest, safeDiagnostic } = require('../src/contracts.cjs');
function token(account = 'viewer-account', channel = 'room-id', expired = false) {
  const parts = [];
  const u16 = n => { const b = Buffer.alloc(2); b.writeUInt16LE(n); parts.push(b); };
  const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n); parts.push(b); };
  const str = s => { const b = Buffer.from(s); u16(b.length); parts.push(b); };
  u16(32); parts.push(Buffer.alloc(32)); str('1'.repeat(32));
  u32(Math.floor(Date.now() / 1000) - (expired ? 10000 : 1)); u32(3600); u32(7);
  u16(1); u16(1); u16(1); u16(1); u32(3600); str(channel); str(account);
  return '007' + deflateSync(Buffer.concat(parts)).toString('base64');
}
function envelope() { return { data: { liveRoom: { id: 'room-id', user: { userId: 'viewer-account' },
  encryptionKey: 'ab'.repeat(32), encryptionSalt: Buffer.from(Array.from({ length: 48 }, (_, i) => i)).toString('base64') }, agoraToken: { token: token() } } }; }
test('immutable 1.06 baseline hash', () => {
  const b = fs.readFileSync(path.join(__dirname, '../vendor/index.html'));
  assert.equal(crypto.createHash('sha256').update(b).digest('hex'), '12be0bed8cce3ecd5f32dda2ed0dd8dab96413159e143b0f398fb04d8b2ad481');
});
test('passes 64-byte key untouched and Android first 32 decoded salt bytes', () => {
  const input = envelope(), out = enterEnvelope(input, 'room-id');
  assert.equal(out.encryptionKey, input.data.liveRoom.encryptionKey);
  assert.equal(Buffer.byteLength(out.encryptionKey), 64);
  assert.deepEqual(out.encryptionKdfSalt, Array.from({ length: 32 }, (_, i) => i));
  assert.equal(out.userAccount, 'viewer-account'); assert.equal(out.channelName, 'room-id'); assert.equal(out.encryptionMode, 8);
});
test('rejects mismatched room/account/channel, expired token, missing RTC token', () => {
  assert.throws(() => enterEnvelope(envelope(), 'other-room'));
  for (const t of [token('other-account'), token('viewer-account', 'wrong-channel'), token('viewer-account', 'room-id', true)]) {
    const input = envelope(); input.data.agoraToken.token = t; assert.throws(() => enterEnvelope(input, 'room-id'));
  }
  const input = envelope(); delete input.data.agoraToken;
  input.data.liveChat = { token: token() }; assert.throws(() => enterEnvelope(input, 'room-id'));
});
test('rejects short, invalid and zero salt; leaves non-ASCII key unchanged', () => {
  for (const s of ['!', Buffer.alloc(31, 1).toString('base64'), Buffer.alloc(32).toString('base64')]) assert.throws(() => salt32(s));
  const input = envelope(); input.data.liveRoom.encryptionKey = '가'.repeat(22);
  assert.equal(enterEnvelope(input, 'room-id').encryptionKey, '가'.repeat(22));
});
test('API transport rejects arbitrary hosts, credentials, HTTP and header injection', () => {
  for (const url of ['http://api.frommyarti.com/a', 'https://evil.test/', 'https://api.frommyarti.com.evil.test/', 'https://x:y@api.frommyarti.com/', 'https://api.frommyarti.com:444/']) assert.throws(() => apiRequest({ url }));
  assert.throws(() => apiRequest({ url: 'https://api.frommyarti.com/a', headers: { authorization: 'x\r\ny' } }));
  assert.throws(() => apiRequest({ url: 'https://api.frommyarti.com/a', headers: { host: 'evil.test' } }));
  assert.equal(apiRequest({ url: 'https://channel-api.frommyarti.com/live/entrances' }).method, 'GET');
});
test('diagnostics whitelist excludes secrets, URLs, identities, raw errors', () => {
  const out = safeDiagnostic({ stage: 'join-failed', code: -2, encryptionKey: 'SECRET', rtcToken: 'SECRET', url: 'https://secret', error: 'SECRET', userAccount: 'SECRET', keyBytes: 64 });
  assert.deepEqual(out, { stage: 'join-failed', code: -2, keyBytes: 64 });
});
