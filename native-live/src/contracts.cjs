'use strict';
const { inflateSync } = require('node:zlib');
const API_HOSTS = new Set(['api.frommyarti.com', 'account-api.frommyarti.com', 'channel-api.frommyarti.com']);
function fail(code) { const e = new Error(code); e.code = code; throw e; }
function apiRequest(input) {
  if (!input || typeof input.url !== 'string') fail('INVALID_API_REQUEST');
  const u = new URL(input.url);
  if (u.protocol !== 'https:' || !API_HOSTS.has(u.hostname) || u.port || u.username || u.password) fail('API_TARGET_DENIED');
  const method = input.method || 'GET';
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) fail('API_METHOD_DENIED');
  const headers = {};
  for (const [k, v] of Object.entries(input.headers || {})) {
    if (!['authorization', 'uuid', 'channel-id', 'accept', 'content-type'].includes(k.toLowerCase()) || typeof v !== 'string' || /[\r\n]/.test(v) || v.length > 16384) fail('API_HEADERS_DENIED');
    headers[k.toLowerCase()] = v;
  }
  if (input.body != null && (typeof input.body !== 'string' || Buffer.byteLength(input.body) > 4 * 1024 * 1024)) fail('API_BODY_DENIED');
  return { url: u, method, headers, body: input.body == null ? undefined : input.body };
}
function salt32(value) {
  if (typeof value !== 'string') fail('SALT_INVALID');
  const b64 = value.replace(/[\t\n\r ]/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || b64.length % 4 === 1) fail('SALT_INVALID');
  const all = Buffer.from(b64, 'base64');
  if (all.length < 32) fail('SALT_SHORT');
  const result = Array.from(all.subarray(0, 32));
  all.fill(0);
  if (!result.some(Boolean)) fail('SALT_ZERO');
  return result;
}
// Read structure only. The Agora service verifies the signature; no token is minted here.
function token007(token) {
  if (typeof token !== 'string' || !/^007[A-Za-z0-9+/=_-]+$/.test(token) || token.length > 16384) fail('RTC_TOKEN_INVALID');
  let b;
  try { b = inflateSync(Buffer.from(token.slice(3), 'base64'), { maxOutputLength: 65536 }); } catch { fail('RTC_TOKEN_INVALID'); }
  let p = 0;
  function need(n) { if (p + n > b.length) fail('RTC_TOKEN_INVALID'); }
  function u16() { need(2); const x = b.readUInt16LE(p); p += 2; return x; }
  function u32() { need(4); const x = b.readUInt32LE(p); p += 4; return x; }
  function bytes() { const n = u16(); need(n); const x = b.subarray(p, p + n); p += n; return x; }
  function str() { return new TextDecoder('utf-8', { fatal: true }).decode(bytes()); }
  try {
    if (bytes().length !== 32) fail('RTC_TOKEN_INVALID');
    const appId = str(), issueTs = u32(), expire = u32(); u32();
    const count = u16(), rtc = [];
    for (let i = 0; i < count; i++) {
      const type = u16(), privileges = {};
      const n = u16(); for (let j = 0; j < n; j++) { const key = u16(); privileges[key] = u32(); }
      if (type === 1) rtc.push({ channelName: str(), userAccount: str(), privileges });
      else if ([2, 5, 8].includes(type)) { str(); if (type === 8) fail('RTC_SERVICE_UNSUPPORTED'); }
      else if ([3, 6].includes(type)) { str(); str(); }
      else if (type === 7) { str(); str(); u16(); }
      else if (type !== 4) fail('RTC_SERVICE_UNSUPPORTED');
    }
    if (p !== b.length || rtc.length !== 1 || !/^[a-f0-9]{32}$/i.test(appId) || !Object.hasOwn(rtc[0].privileges, 1)) fail('RTC_TOKEN_INVALID');
    const expiresAt = issueTs + expire;
    const joinExpiresAt = rtc[0].privileges[1] ? issueTs + rtc[0].privileges[1] : expiresAt;
    return { appId, ...rtc[0], expiresAt, joinExpiresAt };
  } finally { b.fill(0); }
}
function enterEnvelope(response, roomId, now = Date.now() / 1000) {
  const roots = [response?.data, response?.result, response?.payload, response];
  for (const root of roots) {
    if (!root || typeof root !== 'object') continue;
    const room = root.liveRoom || root.room || root.live?.room;
    if (!room || room.id !== roomId) continue;
    let token;
    for (const key of ['agoraToken', 'rtcToken', 'token']) {
      const candidate = root[key];
      const raw = typeof candidate === 'string' ? candidate : candidate?.token;
      if (typeof raw === 'string' && raw.startsWith('007')) { token = raw; break; }
    }
    if (!token) fail('ENTER_RTC_TOKEN_MISSING');
    const parsed = token007(token);
    if (parsed.channelName !== room.id || parsed.userAccount !== room.user?.userId) fail('RTC_IDENTITY_MISMATCH');
    if (parsed.expiresAt <= now || parsed.joinExpiresAt <= now) fail('RTC_TOKEN_EXPIRED');
    if (typeof room.encryptionKey !== 'string' || !room.encryptionKey || room.encryptionKey.includes('\0')) fail('KEY_INVALID');
    if (Buffer.byteLength(room.id) >= 64 || !parsed.userAccount || Buffer.byteLength(parsed.userAccount) > 255) fail('RTC_IDENTITY_INVALID');
    // Do not trim, decode, hash, truncate, or otherwise transform this key.
    return { appId: parsed.appId, channelName: room.id, userAccount: room.user.userId,
      rtcToken: token, encryptionMode: 8, encryptionKey: room.encryptionKey,
      encryptionKdfSalt: salt32(room.encryptionSalt), expiresAt: parsed.expiresAt,
      joinExpiresAt: parsed.joinExpiresAt };
  }
  fail('ENTER_ROOM_MISSING');
}
function safeDiagnostic(value) {
  const out = { stage: /^[a-z0-9-]{1,64}$/.test(value?.stage) ? value.stage : 'unknown' };
  for (const k of ['code', 'keyBytes', 'saltBytes', 'channelBytes', 'accountBytes', 'width', 'height', 'elapsedMs']) {
    if (Number.isFinite(value?.[k])) out[k] = value[k];
  }
  for (const k of ['tokenPresent', 'mediaVerified', 'synthetic']) if (typeof value?.[k] === 'boolean') out[k] = value[k];
  return out;
}
module.exports = { API_HOSTS, apiRequest, salt32, token007, enterEnvelope, safeDiagnostic, fail };
