'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {sendNormalComment, parseSendAck, inputLimit} = require('../web-live-chat-probe.js');
const roomId = 'synthetic-room', token = 'synthetic-chat-token', content = '합성 테스트 댓글';
const policy = {isFrozen: false, isBanned: false, muteExpiresAt: null};
const ack = '<?xml version="1.0" encoding="UTF-8"?><SendMessageResponse xmlns="http://queue.amazonaws.com/doc/2012-11-05/"><SendMessageResult><MD5OfMessageBody>0123456789abcdef0123456789abcdef</MD5OfMessageBody><MessageId>synthetic-message-id</MessageId></SendMessageResult><ResponseMetadata><RequestId>synthetic-request-id</RequestId></ResponseMetadata></SendMessageResponse>';
function harness({room = policy, reply = new Response(ack), failAt = -1} = {}) {
  const calls = [];
  return {calls, args: {roomId, token, content, fetcher: async (url, options) => {
    calls.push({url, options});
    if (calls.length === failAt) throw new Error('private-network-error');
    return calls.length === 1 ? new Response(JSON.stringify({success: true, data: {liveChatRoom: room}})) : reply;
  }}};
}
test('one normal-message POST follows a fresh room policy check using only chat auth and the exact APK body', async () => {
  const h = harness(), result = await sendNormalComment(h.args);
  assert.deepEqual(result, {messageId: 'synthetic-message-id'});
  assert.deepEqual(h.calls.map(call => call.options.method), ['GET', 'POST']);
  assert.equal(h.calls[0].url, 'https://live-chat-api.frommyarti.com/live-chat/rooms/' + roomId);
  assert.equal(h.calls[1].url, 'https://live-chat-api.frommyarti.com/live-chat/messages/normal');
  assert.deepEqual(JSON.parse(h.calls[1].options.body), {liveChatRoomId: roomId, chatToken: token, content});
  for (const {options} of h.calls) {
    assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer ' + token);
  }
  assert.equal(h.calls[1].options.headers['Content-Type'], 'application/json');
});
test('missing context or blank, control, oversized text cannot make any request', async () => {
  for (const patch of [{token: ''}, {token: 'bad\nsecret'}, {roomId: ''}, {content: ''}, {content: '  \t'},
    {content: null}, {content: 'x'.repeat(inputLimit + 1)}, {content: 'bad\0text'}]) {
    const h = harness(); await assert.rejects(sendNormalComment({...h.args, ...patch})); assert.equal(h.calls.length, 0);
  }
});
test('APK-nullable fields may be omitted or null; the fresh frozen flag is still required', async () => {
  for (const room of [{isFrozen: false}, {isFrozen: false, isBanned: false}, {isFrozen: false, isBanned: null},
    {isFrozen: false, muteExpiresAt: null}, {...policy, isBanned: null}]) {
    const h = harness({room}); const result = await sendNormalComment(h.args);
    assert.equal(result.messageId, 'synthetic-message-id'); assert.equal(h.calls.length, 2);
  }
});
test('frozen, banned, any mute expiry and unknown required policy types prevent a POST', async () => {
  for (const [room, code] of [[{...policy, isFrozen: true}, 'send-frozen'], [{...policy, isBanned: true}, 'send-banned'],
    [{...policy, muteExpiresAt: '2000-01-01T00:00:00Z'}, 'send-muted'], [{isFrozen: true}, 'send-frozen'],
    [{isFrozen: false, isBanned: true}, 'send-banned'], [{isFrozen: false, muteExpiresAt: false}, 'send-muted'],
    [{isFrozen: 'false'}, 'send-policy-unavailable'], [{...policy, isBanned: 'false'}, 'send-policy-unavailable'],
    [{isBanned: false}, 'send-policy-unavailable'], [null, 'send-policy-unavailable']]) {
    const h = harness({room}); await assert.rejects(sendNormalComment(h.args), error => error.code === code);
    assert.equal(h.calls.length, 1);
  }
});
test('policy schema diagnostics contain only field types, stage and POST presence', async () => {
  const h = harness({room: {isFrozen: 'private-value', isBanned: 'private-value', muteExpiresAt: 'private-date'}});
  await assert.rejects(sendNormalComment(h.args), error => {
    assert.deepEqual(error.shape, {stage: 'policy-schema', postStarted: false, room: 'object', frozen: 'string', banned: 'string', mute: 'string'});
    assert.doesNotMatch(JSON.stringify(error), /private|synthetic/); return true;
  });
  assert.equal(h.calls.length, 1);
});
test('stale session or abort before the fresh check sends nothing; invalidation during GET never posts', async () => {
  for (const patch of [{current: () => false}, {signal: AbortSignal.abort()}]) {
    const h = harness(); await assert.rejects(sendNormalComment({...h.args, ...patch}), error => error.code === 'cancelled');
    assert.equal(h.calls.length, 0);
  }
  const h = harness(); let current = true;
  await assert.rejects(sendNormalComment({...h.args, current: () => current, fetcher: async (...args) => {
    const response = await h.args.fetcher(...args); current = false; return response;
  }}), error => error.code === 'cancelled'); assert.equal(h.calls.length, 1);
});
test('policy transport failure is safe to distinguish from a POST outcome that is unknown', async () => {
  for (const failAt of [1, 2]) {
    const h = harness({failAt});
    await assert.rejects(sendNormalComment(h.args), error => error.code === (failAt === 1 ? 'send-policy-unavailable' : 'send-unconfirmed') &&
      error.shape.stage === (failAt === 1 ? 'policy-request' : 'post-request') && error.shape.postStarted === (failAt === 2) && !JSON.stringify(error).includes('private'));
    assert.equal(h.calls.length, failAt);
  }
});
for (const status of [400, 401, 403, 429, 500, 503]) test('POST HTTP ' + status + ' is not retried and never exposes the raw response', async () => {
  const h = harness({reply: new Response('private server response', {status})});
  await assert.rejects(sendNormalComment(h.args), error => error.code === (status >= 500 ? 'send-unconfirmed' : 'http-error') &&
    error.httpStatus === status && !JSON.stringify(error).includes('private'));
  assert.equal(h.calls.length, 2);
});
test('HTTP success alone, JSON success and malformed/oversized XML cannot claim acceptance', async () => {
  for (const reply of [new Response(''), new Response('{"success":true}'), new Response('<html>MessageId</html>'),
    new Response(ack.replace('MessageId>', 'OtherId>')), new Response(ack, {headers: {'content-length': '20000'}})]) {
    const h = harness({reply}); await assert.rejects(sendNormalComment(h.args), error => error.code === 'send-unconfirmed');
    assert.equal(h.calls.length, 2);
  }
});
test('SQS parser rejects DTD, entities, nested/double IDs, mismatched tags and non-SQS roots', () => {
  assert.equal(parseSendAck(ack), 'synthetic-message-id');
  for (const invalid of ['<!DOCTYPE a>' + ack, ack.replace('synthetic-message-id', '&private;'),
    ack.replace('</MessageId>', '</MessageId><MessageId>duplicate</MessageId>'),
    ack.replace('</MD5OfMessageBody>', '</MD5OfMessageAttributes>'),
    ack.replace('<MessageId>', '<Other><MessageId>').replace('</MessageId>', '</MessageId></Other>'),
    ack.replaceAll('SendMessageResponse', 'ErrorResponse'), ack + '<extra/>']) {
    assert.throws(() => parseSendAck(invalid), error => error.code === 'send-unconfirmed');
  }
});
test('abort after POST begins reports uncertain delivery with no retry', async () => {
  const h = harness(), owner = new AbortController();
  await assert.rejects(sendNormalComment({...h.args, signal: owner.signal, fetcher: async (...args) => {
    const response = await h.args.fetcher(...args); if (h.calls.length === 2) owner.abort(); return response;
  }}), error => error.code === 'send-unconfirmed'); assert.equal(h.calls.length, 2);
});
