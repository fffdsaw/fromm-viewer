'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {probe, messageStore, applyMessages} = require('../web-live-chat-probe.js');
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
test('read policy uses the same official nullable defaults as sending', async () => {
  for (const liveChatRoom of [{isFrozen: false}, {isFrozen: false, isBanned: null, muteExpiresAt: null}]) {
    const h = harness([{success: true, data: {liveChatRoom}}, messages, messages]);
    const result = await probe(h.args);
    assert.deepEqual(result.policy, {frozen: false, banned: false, mutePresent: false});
  }
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

const comment = (id, createdAt = 1) => ({messageId: id, content: 'fixture content ' + id, nickname: 'fixture name', createdAt, userId: 'private-user-id'});
test('comment batches deduplicate IDs and apply deletions before late arrivals', () => {
  const store = messageStore();
  assert.equal(applyMessages(store, [comment('a'), comment('a')], []).addedCount, 1);
  assert.equal(store.items.size, 1);
  applyMessages(store, [comment('a'), comment('b', 2)], ['a']);
  assert.deepEqual([...store.items.keys()], ['b']);
  applyMessages(store, [comment('a')], []); assert.equal(store.items.size, 1);
  assert.equal(JSON.stringify([...store.items.values()]).includes('private-user-id'), false);
});
test('comment storage is bounded, retains newest timestamps and ignores evicted duplicates', () => {
  const store = messageStore(), batch = Array.from({length: 250}, (_, index) => comment('m' + index, index)).reverse();
  assert.equal(applyMessages(store, batch, []).addedCount, 250);
  assert.equal(store.items.size, 100); assert.equal(Math.min(...[...store.items.values()].map(item => item.createdAt)), 150);
  assert.equal(applyMessages(store, batch, []).addedCount, 0); assert.equal(store.items.size, 100);
  applyMessages(store, [], Array.from({length: 700}, (_, index) => 'd' + index)); assert.equal(store.deleted.size, 500);
});
test('unknown comment field types are counted without inventing rendered content', () => {
  const store = messageStore();
  const result = applyMessages(store, [{id: 'wrong', content: 'not the official model'}, {...comment('a'), createdAt: 'bad'}], []);
  assert.equal(result.invalidCount, 2); assert.equal(store.items.size, 0);
});
test('a long read stream continues cursors and retains only bounded sanitized sample metadata', async () => {
  const responses = [room, ...Array.from({length: 10}, (_, index) => ({success: true, data: {
    messages: [comment('private-' + index, index)], deletedMessages: [], cursor: 1792140000000 + index
  }}))];
  const h = harness(responses), pages = [];
  const result = await probe({...h.args, sampleLimit: 10, onPage: page => pages.push(page)});
  assert.equal(h.calls.length, 11); assert.equal(pages.length, 10); assert.equal(result.samples.length, 8);
  assert.doesNotMatch(JSON.stringify(result), /private|fixture|179214/);
  assert.equal(new URL(h.calls.at(-1).url).searchParams.get('cursor'), '1792140000008');
});
test('ban policy refresh ends an active read stream before more messages are fetched', async () => {
  const empty = {success: true, data: {messages: [], deletedMessages: [], cursor: 1}};
  const banned = {success: true, data: {liveChatRoom: {isFrozen: false, isBanned: true, muteExpiresAt: null}}};
  const h = harness([room, ...Array(30).fill(empty), banned]); let clock = 0;
  const result = await probe({...h.args, sampleLimit: Infinity, now: () => clock, wait: async ms => {clock += ms;}});
  assert.equal(result.status, 'banned'); assert.equal(h.calls.length, 32);
  assert.ok(h.calls.at(-1).url.includes('/live-chat/rooms/'));
});
test('poll cadence subtracts response time, never overlaps requests and adds no delay to a slow response', async () => {
  const empty = {success: true, data: {messages: [], deletedMessages: [], cursor: 1}};
  for (const latency of [300, 1500]) {
    const h = harness([room, empty, empty, empty]); let clock = 0, active = 0;
    const starts = [], waits = [];
    await probe({...h.args, sampleLimit: 3, now: () => clock, wait: async ms => {waits.push(ms); clock += ms;}, fetcher: async (url, options) => {
      assert.equal(active++, 0);
      if (!url.includes('/rooms/')) starts.push(clock);
      const response = await h.args.fetcher(url, options); clock += latency; active--; return response;
    }});
    assert.deepEqual(starts.slice(1).map((start, index) => start - starts[index]), [Math.max(1000, latency), Math.max(1000, latency)]);
    assert.deepEqual(waits, latency < 1000 ? [1000 - latency, 1000 - latency] : []);
  }
});
test('a slower periodic policy refresh cannot bunch successive message requests', async () => {
  const empty = {success: true, data: {messages: [], deletedMessages: [], cursor: 1}};
  const h = harness([room, empty, room, empty, empty]); let clock = 0, jumped = false;
  const starts = [];
  await probe({...h.args, sampleLimit: 3, now: () => clock, wait: async ms => {
    clock += ms; if (!jumped) {clock += 30000; jumped = true;}
  }, fetcher: async (url, options) => {
    const isPolicy = url.includes('/rooms/'); if (!isPolicy) starts.push(clock);
    const response = await h.args.fetcher(url, options); clock += isPolicy ? 800 : 100; return response;
  }});
  assert.equal(starts.length, 3); assert.equal(starts[2] - starts[1], 1000);
});
test('stop during the interval cannot start another cursor request or deliver late messages', async () => {
  const h = harness(), owner = new AbortController(); let pages = 0;
  await assert.rejects(probe({...h.args, sampleLimit: Infinity, signal: owner.signal,
    onPage: () => {pages++;}, wait: async () => owner.abort()}), error => error.code === 'cancelled');
  assert.equal(pages, 1); assert.equal(h.calls.length, 2);
});
