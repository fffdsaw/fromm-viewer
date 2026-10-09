'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const {webcrypto} = require('node:crypto');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const channelScript = html.match(/<script id="channelVideosScript">([\s\S]*?)<\/script>/)[1];
function fn(name, source = html) {
  const match = source.match(new RegExp('^(?:async )?function ' + name + '\\([^]*?^}', 'm'));
  assert.ok(match, name);
  return match[0];
}
function setup(overrides = {}) {
  const calls = [], alerts = [];
  let auth = {token: 'synthetic-session', uuid: 'synthetic-device', accountKey: 'synthetic-account'};
  const state = {filter: 'live', room: null, live: {centerMode: 'channel', entry: {}, channels: [], channelsLoaded: false, replayPosts: [{id: 'existing-replay'}], replaySelected: {id: 'existing-player'}, replayPlaylistCache: new Map()}};
  const context = vm.createContext({state, Map, URL, URLSearchParams, Blob, Uint8Array, DataView, Intl,
    setTimeout, clearTimeout, navigator: {userAgent: 'Windows'},
    document: {querySelector: () => null, body: {contains: () => true}},
    window: {addEventListener() {}, alert: message => alerts.push(message), crypto: webcrypto},
    $: () => null, currentAuth: () => auth, renderLiveView() {}, safeErrorDetail: value => String(value),
    FROMM_CHANNEL_API_BASE: 'https://channel-api.frommyarti.com',
    replayChannelName: c => c.channelName || c.name || 'Artist', normalizeMediaUrl: value => value,
    isHttpMediaUrl: value => /^https?:\/\//.test(value || ''),
    localProxyUrl: value => value, friendlyNetworkError: e => e,
    frommApiRequest: async (api, options) => {
      calls.push({api, options});
      if (api === '/channels') return {data: {channels: [{id: 'a', channelName: 'A', isSubscribed: true}, {id: 'b', channelName: 'B', isSubscribed: true}, {id: 'locked', isSubscribed: false}]}};
      return {data: {posts: [{id: 'v1', type: 'video', isVisible: true, displayStartAt: 100}, {id: 'r1', type: 'live_record', num: 2, displayStartAt: 90}], isLast: false}};
    }, ...overrides});
  for (const name of ['replayStreamUrl', 'replayAuthParams', 'replaySignedUrl', 'replayCanonicalStreamUrl', 'rewriteReplayMediaPlaylist', 'parseReplayDownloadPlaylist', 'replayDownloadIv']) vm.runInContext(fn(name), context);
  vm.runInContext(channelScript, context);
  const s = vm.runInContext('channelVideoState', context);
  return {context, s, state, calls, alerts, setAuth: value => {auth = value;}};
}
const deferred = () => {let resolve; const promise = new Promise(r => {resolve = r;}); return {resolve, promise};};

test('all inline scripts parse; tab order is LIVE → Replay → Channel', () => {
  for (const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(m[1]);
  const tabs = fn('liveCenterTabsHtml');
  assert.deepEqual([...tabs.matchAll(/data-live-center-mode="([^"]+)"/g)].map(m => m[1]), ['live', 'replay', 'channel']);
});

test('Replay implementation and Native 30fps/bridge sources match latest main baseline', () => {
  const baseline = execFileSync('git', ['show', 'd4d9c2f:index.html'], {cwd: root, encoding: 'utf8', maxBuffer: 4e6});
  const names = [...baseline.matchAll(/^(?:async )?function ((?:\w*Replay\w*)|(?:replay\w+)|(?:visibleReplayPosts)|(?:returnToReplayList))\(/gm)].map(m => m[1]);
  assert.ok(names.length > 30);
  for (const name of names) assert.equal(fn(name), fn(name, baseline), name);
  for (const file of ['web-native-live.js', 'native-live/src/frame-pump.cjs', 'native-live/src/player-preload.cjs', 'chrome_extension/native-background.js', 'chrome_extension/native-content.js']) {
    const bytes = execFileSync('git', ['show', `d4d9c2f:${file}`], {cwd: root});
    assert.equal(fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n'), bytes.toString('utf8').replace(/\r\n/g, '\n'), file);
  }
});

test('only subscribed channels and uploaded visible videos; raw cursor preserves mixed pages', async () => {
  const h = setup();
  await h.context.loadChannelVideos();
  assert.deepEqual(h.state.live.channels.map(c => c.id), ['a', 'b']);
  assert.equal(h.s.channelId, 'a');
  assert.equal(h.s.pages.get('a').posts.length, 1);
  assert.equal(h.s.pages.get('a').lastPost.id, 'r1');
  h.context.frommApiRequest = async (api, options) => {
    assert.deepEqual({...options.query}, {labelId: 0, channelId: 'a', limit: 50, postId: 'r1', num: 2, displayStartAt: 90});
    return {data: {posts: [{id: 'v1', type: 'video', displayStartAt: 100}, {id: 'hidden', type: 'video', isVisible: false}, {id: 'v2', type: 'video', displayStartAt: 50}], isLast: true}};
  };
  await h.context.loadChannelVideos({loadMore: true});
  assert.deepEqual(Array.from(h.s.pages.get('a').posts, p => p.id), ['v1', 'v2']);
  assert.equal(h.s.pages.get('a').isLast, true);
  assert.equal(h.state.live.replayPosts[0].id, 'existing-replay');
  assert.equal(h.state.live.replaySelected.id, 'existing-player');
});

test('a page without uploads still offers pagination; repeated cursors stop without skipping a failed page', async () => {
  const h = setup({frommApiRequest: async api => api === '/channels' ? {data: {channels: [{id: 'a', isSubscribed: true}]}} : {data: {posts: [{id: 'r', type: 'live_record', num: 3, displayStartAt: 80}], isLast: false}}});
  await h.context.loadChannelVideos();
  const p = h.s.pages.get('a');
  assert.equal(p.posts.length, 0);
  assert.equal(p.isLast, false);
  await h.context.loadChannelVideos({loadMore: true});
  assert.match(h.s.error, /다음 페이지/);
  assert.equal(p.lastPost.id, 'r');
});

test('preferred existing channel selection is reused, per-channel pages stay separate', async () => {
  const h = setup(); h.state.live.entry.channelId = 'b';
  await h.context.loadChannelVideos();
  assert.equal(h.s.channelId, 'b');
  await h.context.selectChannelVideos('a');
  assert.equal(h.s.pages.size, 2);
  assert.equal(h.s.pages.get('a').posts[0]._channelId, 'a');
  await h.context.selectChannelVideos('locked');
  assert.equal(h.s.channelId, 'a');
});

test('auth failure remains retryable and does not populate content', async () => {
  const h = setup({frommApiRequest: async () => {throw new Error('HTTP 403');}});
  await h.context.loadChannelVideos();
  assert.match(h.s.error, /403/);
  assert.equal(h.s.loading, false);
  assert.equal(h.s.pages.size, 0);
});

test('logout discards late channel discovery and late media pages', async () => {
  for (const stage of ['channels', 'posts']) {
    const d = deferred();
    const h = setup({frommApiRequest: () => d.promise});
    if (stage === 'posts') {h.state.live.channelsLoaded = true; h.state.live.channels = [{id: 'a'}];}
    const request = h.context.loadChannelVideos();
    await Promise.resolve();
    h.context.resetChannelVideos(); h.setAuth({token: '', uuid: '', accountKey: ''});
    d.resolve({data: {channels: [{id: 'a', isSubscribed: true}], posts: [{id: 'v', type: 'video'}]}});
    await request;
    assert.equal(h.s.pages.size, 0); assert.equal(h.s.loading, false);
    if (stage === 'channels') assert.equal(h.state.live.channelsLoaded, false);
  }
});

test('channel switch rejects an older response and refresh rejects late pages', async () => {
  const d = deferred(); const h = setup();
  await h.context.loadChannelVideos();
  h.context.frommApiRequest = (_api, options) => options.channelId === 'a' ? d.promise : Promise.resolve({data: {posts: [{id: 'b1', type: 'video'}], isLast: true}});
  const old = h.context.loadChannelVideos({loadMore: true});
  await h.context.selectChannelVideos('b');
  d.resolve({data: {posts: [{id: 'stale', type: 'video'}], isLast: true}}); await old;
  assert.equal(h.s.channelId, 'b');
  assert.equal(h.s.pages.get('a').posts.some(p => p.id === 'stale'), false);
  assert.equal(h.s.pages.get('b').posts[0].id, 'b1');
});

test('play permission is fresh and uploaded URL never receives the live_record filename rewrite', async () => {
  const h = setup(); await h.context.loadChannelVideos();
  let count = 0;
  h.context.frommApiRequest = async (api, options) => {
    count++; assert.equal(api, '/media/posts/v1'); assert.equal(options.channelId, 'a');
    return {data: {post: {id: 'v1', type: 'video', url: 'https://cdn.example/upload_original.m3u8?CloudFront-Policy=synthetic'}}};
  };
  await h.context.playChannelVideo('v1');
  assert.match(h.s.selected._streamUrl, /upload_original\.m3u8/);
  await h.context.playChannelVideo('v1'); assert.equal(count, 2);
  h.context.frommApiRequest = async () => {throw new Error('HTTP 403');};
  await h.context.playChannelVideo('v1'); assert.match(h.s.playerError, /403/);
  assert.equal(h.s.selected._streamUrl, undefined);
});

test('non-video, hidden, unsafe detail URL and late playback cannot mount a player', async () => {
  for (const post of [{type: 'live_record'}, {type: 'video', isVisible: false}, {type: 'video', url: 'javascript:alert(1)'}]) {
    const h = setup(); await h.context.loadChannelVideos();
    h.context.frommApiRequest = async () => ({data: {post}});
    await h.context.playChannelVideo('v1'); assert.ok(h.s.playerError);
  }
  const d = deferred(); const h = setup(); await h.context.loadChannelVideos();
  h.context.frommApiRequest = () => d.promise;
  const play = h.context.playChannelVideo('v1'); h.context.stopChannelVideoPlayback();
  d.resolve({data: {post: {type: 'video', url: 'https://cdn.example/a.m3u8'}}}); await play;
  assert.equal(h.s.selected, null);
});

test('HLS player propagates signed parameters, owns blobs/Hls and ignores stale attach', async () => {
  const events = new Map(), instances = [], revoked = [];
  class Hls {static isSupported() {return true;} static Events = {MANIFEST_PARSED: 'ready', ERROR: 'error'}; static ErrorTypes = {NETWORK_ERROR: 'network', MEDIA_ERROR: 'media'};
    constructor() {instances.push(this);} loadSource(url) {this.url = url;} attachMedia(video) {this.video = video;} on(event, cb) {events.set(event, cb);} destroy() {this.destroyed = true;} startLoad() {this.retried = true;}}
  const blobs = [];
  const h = setup({URL: class extends URL {static createObjectURL(b) {blobs.push(b); return 'blob:synthetic';} static revokeObjectURL(url) {revoked.push(url);}},
    ensureReplayHlsSdk: async () => Hls,
    resolveReplayMediaPlaylist: async () => ({authParams: new URLSearchParams('Policy=synthetic'), mediaUrl: 'https://cdn.example/p/list.m3u8', mediaText: '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key"\nsegment.ts'}),
  });
  const video = {play: async () => {}};
  await h.context.attachChannelVideo('https://cdn.example/p/list.m3u8', video, 0);
  assert.equal(instances.length, 1);
  const text = await blobs[0].text(); assert.match(text, /key\?Policy=synthetic/); assert.match(text, /segment.ts\?Policy=synthetic/);
  events.get('error')(null, {fatal: true, type: 'network'}); assert.equal(instances[0].retried, true);
  h.context.stopChannelVideoPlayback(); assert.equal(instances[0].destroyed, true); assert.deepEqual(revoked, ['blob:synthetic']);
  await h.context.attachChannelVideo('https://cdn.example/p/list.m3u8', video, 0); assert.equal(instances.length, 1);
});

test('existing AES-128 downloader decrypts ordered segments using the fresh channel detail', async () => {
  const keyBytes = Uint8Array.from({length: 16}, (_, i) => i);
  const key = await webcrypto.subtle.importKey('raw', keyBytes, 'AES-CBC', false, ['encrypt']);
  const plain = [Uint8Array.from([1, 2, 3]), Uint8Array.from([4, 5, 6])];
  const encrypted = await Promise.all(plain.map((p, i) => {const iv = new Uint8Array(16); new DataView(iv.buffer).setUint32(12, 10 + i, false); return webcrypto.subtle.encrypt({name: 'AES-CBC', iv}, key, p);}));
  const output = [], requested = [];
  const h = setup({createReplayDownloadSink: async () => ({filename: 'synthetic.ts', writable: {write: async b => output.push(Buffer.from(b)), close: async () => {}}, chunks: null}),
    resolveReplayMediaPlaylist: async () => ({authParams: new URLSearchParams('Policy=synthetic'), mediaUrl: 'https://cdn.example/list.m3u8', mediaText: '#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:10\n#EXT-X-KEY:METHOD=AES-128,URI="key"\n1.ts\n2.ts'}),
    fetchReplayBuffer: async url => {requested.push(url); return url.includes('/key?') ? keyBytes.buffer : encrypted[url.includes('/1.ts?') ? 0 : 1];},
  });
  vm.runInContext(fn('downloadReplayStream'), h.context);
  await h.context.loadChannelVideos();
  h.context.frommApiRequest = async () => ({data: {post: {id: 'v1', type: 'video', url: 'https://cdn.example/upload.m3u8?CloudFront-Policy=synthetic'}}});
  await h.context.downloadChannelVideo(h.s.pages.get('a').posts[0]);
  assert.deepEqual(Buffer.concat(output), Buffer.from([1, 2, 3, 4, 5, 6]));
  assert.equal(requested.length, 3); assert.ok(requested.every(url => url.endsWith('?Policy=synthetic')));
  assert.equal(h.alerts.length, 0); assert.equal(h.s.downloading, false);
});

test('cancelled save picker requests no signed URL; denied downloads abort without transfer', async () => {
  const h = setup({createReplayDownloadSink: async () => null}); await h.context.loadChannelVideos();
  const count = h.calls.length;
  await h.context.downloadChannelVideo(h.s.pages.get('a').posts[0]); assert.equal(h.calls.length, count);
  let aborted = false, transfers = 0;
  h.context.createReplayDownloadSink = async () => ({writable: {abort: async () => {aborted = true;}}});
  h.context.frommApiRequest = async () => {throw new Error('HTTP 403');};
  h.context.downloadReplayStream = async () => {transfers++;};
  await h.context.downloadChannelVideo(h.s.pages.get('a').posts[0]);
  assert.equal(aborted, true); assert.equal(transfers, 0); assert.match(h.alerts[0], /403/);
});

test('existing session request helper supplies authorization, stable UUID and channel-id', async () => {
  let request;
  const h = setup({FROMM_API_BASE: 'https://api.frommyarti.com', buildTrustedApiUrl: (api, base) => new URL(api, base), recordApiDiagnostic() {},
    fetch: async (url, options) => {request = {url, options}; return {ok: true, status: 200, text: async () => '{"success":true,"data":{"posts":[]}}'};},
  });
  vm.runInContext(fn('frommApiRequest'), h.context);
  await h.context.frommApiRequest('/media/posts', {base: 'https://channel-api.frommyarti.com', channelId: 'a', query: {labelId: 0, channelId: 'a', limit: 50}});
  assert.equal(request.options.headers.Authorization, 'Bearer synthetic-session');
  assert.equal(request.options.headers.uuid, 'synthetic-device'); assert.equal(request.options.headers['channel-id'], 'a');
  assert.match(request.url, /labelId=0&channelId=a&limit=50/);
  h.setAuth({token: '', uuid: ''});
  await assert.rejects(h.context.frommApiRequest('/channels'), /먼저 연결/);
});
