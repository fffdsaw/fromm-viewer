'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {probe} = require('../web-live-chat-probe.js');
const token = 'synthetic-chat-token';
const roomId = 'synthetic-live-room';
const room = {success: true, data: {liveChatRoom: {isFrozen: false, isBanned: false, muteExpiresAt: null}}};
const messages = {success: true, data: {messages: [{id: 'private-message-id', content: 'private-comment-text'}], deletedMessages: ['private-deleted-id'], cursor: 1792140000000}};
function harness(responses = [room, messages, messages]) {
  const calls = [];
  return {calls, args: {roomId, token, wait: async () => {}, fetcher: async (url, options) => {
    calls.push({url, options});
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next instanceof Response ? next : new Response(JSON.stringify(next), {status: 200});
  }}};
}
test('official read-only room and two cursor samples use only separate chat-token auth and redact results', async () => {
  const h = harness(), result = await probe(h.args);
  assert.equal(result.status, 'messages-received');
  assert.deepEqual(result.samples.map(sample => sample.messageCount), [1, 1]);
  assert.equal(h.calls.length, 3);
  for (const call of h.calls) {
    assert.equal(new URL(call.url).origin, 'https://live-chat-api.frommyarti.com');
    assert.equal(call.options.method, 'GET'); assert.equal(call.options.redirect, 'error');
    assert.equal(call.options.credentials, 'omit'); assert.equal(call.options.headers.Authorization, 'Bearer ' + token);
    assert.deepEqual(Object.keys(call.options.headers).sort(), ['Accept', 'Authorization']);
    assert.equal(call.options.body, undefined);
  }
  assert.equal(new URL(h.calls[0].url).pathname, '/live-chat/rooms/' + roomId);
  assert.equal(new URL(h.calls[1].url).pathname, '/live-chat/' + roomId + '/messages');
  assert.equal(new URL(h.calls[2].url).searchParams.get('cursor'), String(messages.data.cursor));
  assert.doesNotMatch(JSON.stringify(result), /synthetic|private|1792140000000|chatToken|Authorization/);
});
test('an authorized empty response is distinct from receipt of actual messages', async () => {
  const empty = {success: true, data: {messages: [], deletedMessages: [], cursor: null}};
  const h = harness([room, empty, empty]), result = await probe(h.args);
  assert.equal(result.status, 'connected-no-messages'); assert.equal(result.samples.length, 2);
});
test('missing or malformed context sends no request and never substitutes another token', async () => {
  for (const patch of [{token: ''}, {token: null}, {token: 'bad\nsecret'}, {token: 'x'.repeat(16385)}, {roomId: ''}, {roomId: null}]) {
    const h = harness(); await assert.rejects(probe({...h.args, ...patch}), error => error.code === 'missing-chat-context');
    assert.equal(h.calls.length, 0);
  }
});
for (const status of [401, 403, 429, 500]) test('HTTP ' + status + ' stops without retry or raw body disclosure', async () => {
  const h = harness([new Response('private-error-token', {status})]);
  await assert.rejects(probe(h.args), error => error.code === 'http-error' && error.httpStatus === status && !error.message.includes('private'));
  assert.equal(h.calls.length, 1);
});
test('banned room does not request messages; frozen/mute are reported without inventing send permission', async () => {
  const h = harness([{success: true, data: {liveChatRoom: {isFrozen: true, isBanned: true, muteExpiresAt: 'private-time'}}}]);
  const result = await probe(h.args); assert.equal(result.status, 'banned'); assert.equal(h.calls.length, 1);
  assert.deepEqual(result.policy, {frozen: true, banned: true, mutePresent: true});
  assert.doesNotMatch(JSON.stringify(result), /private|canSend/);
});
test('unknown API envelopes, room schemas and message schemas cannot report success', async () => {
  for (const responses of [[{success: false, data: room.data}], [{success: true, data: {}}], [room, {success: true, data: {messages: ['unexpected'], deletedMessages: [], cursor: null}}], [room, {success: true, data: {...messages.data, cursor: 'unexpected'}}], [new Response('<html>private</html>')]]) {
    const h = harness(responses); await assert.rejects(probe(h.args), error => ['api-rejected', 'unknown-room-response', 'unknown-messages-response', 'unknown-response'].includes(error.code));
  }
});
test('response size cap prevents inspecting an unbounded chat payload', async () => {
  const h = harness([new Response('private', {headers: {'content-length': '2000000'}})]);
  await assert.rejects(probe(h.args), error => error.code === 'response-too-large');
});
test('room or account invalidation discards in-flight data and never starts a later sample', async () => {
  const h = harness(); let current = true;
  const fetcher = h.args.fetcher;
  h.args.fetcher = async (...args) => { const response = await fetcher(...args); current = false; return response; };
  await assert.rejects(probe({...h.args, current: () => current}), error => error.code === 'cancelled');
  assert.equal(h.calls.length, 1);
});
test('abort and stale state before a request send nothing', async () => {
  for (const context of [{current: () => false}, {signal: AbortSignal.abort()}]) {
    const h = harness(); await assert.rejects(probe({...h.args, ...context}), error => error.code === 'cancelled');
    assert.equal(h.calls.length, 0);
  }
});
