'use strict';
const { Decoder, encode } = require('./native-wire.cjs');
const { enterEnvelope, token007, safeDiagnostic, fail } = require('./contracts.cjs');
const { net } = require('electron');
function createController({ join, leave, show, renew, quit, acknowledge, input = process.stdin, sendMessage }) {
  let credentials = null, envelope = null, busy = Promise.resolve(), serial = 0, cancellation = 0, disconnected = false, activeRequest;
  const send = sendMessage || (value => process.stdout.write(encode(value, true)));
  function clear() { serial++; activeRequest?.abort(); credentials = null; if (envelope) { envelope.encryptionKey = ''; envelope.rtcToken = ''; envelope.encryptionKdfSalt.fill(0); } envelope = null; }
  async function cancellable(promise, signal) {
    let abort;
    const cancelled = new Promise((_, reject) => {
      abort = () => reject(Object.assign(new Error('JOIN_CANCELLED'), { code: 'JOIN_CANCELLED' }));
      if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
    });
    try { return await Promise.race([promise, cancelled]); }
    finally { signal.removeEventListener('abort', abort); }
  }
  async function request(suffix, body) {
    if (!credentials) fail('LOGIN_REQUIRED');
    const url = new URL(`https://channel-api.frommyarti.com/live/agora/rooms/${encodeURIComponent(credentials.roomId)}/${suffix}`);
    if (suffix === 'enter') url.searchParams.set('channelId', credentials.channelId);
    const requestAbort = activeRequest = new AbortController();
    const signal = AbortSignal.any([requestAbort.signal, AbortSignal.timeout(25000)]);
    try {
    const response = await cancellable(net.fetch(url.toString(), { method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store', signal,
      headers: { authorization: /^Bearer\s/i.test(credentials.authToken) ? credentials.authToken : `Bearer ${credentials.authToken}`,
        uuid: credentials.uuid, 'channel-id': credentials.channelId, 'content-type': 'application/json',
        origin: 'https://channel.frommyarti.com', referer: 'https://channel.frommyarti.com/' }, body: JSON.stringify(body) }), signal);
    const data = await cancellable(response.json(), signal);
    if (!response.ok || data?.success === false || data?.ok === false) fail('FROMM_ACCESS_DENIED');
    return data;
    } finally { if (activeRequest === requestAbort) activeRequest = null; }
  }
  async function renewToken() {
    if (!credentials || !envelope) return;
    const current = serial;
    try {
      const data = await request('token/renew', { role: 'subscriber', currentToken: envelope.rtcToken });
      if (current !== serial) return;
      let token;
      for (const root of [data.data, data.result, data.payload, data]) {
        const candidate = root?.agoraToken || root?.rtcToken || root?.token;
        const raw = typeof candidate === 'string' ? candidate : candidate?.token;
        if (typeof raw === 'string' && raw.startsWith('007')) { token = raw; break; }
      }
      const parsed = token007(token);
      if (parsed.appId !== envelope.appId || parsed.channelName !== envelope.channelName || parsed.userAccount !== envelope.userAccount || parsed.expiresAt <= Date.now() / 1000 || parsed.joinExpiresAt <= Date.now() / 1000) fail('RENEW_IDENTITY_MISMATCH');
      renew(token); envelope.rtcToken = token;
    } catch { send({ type: 'status', value: { stage: 'token-renew-failed' } }); }
  }
  const decoder = new Decoder(message => {
    if (!message || !Number.isSafeInteger(message.id) || !['hello', 'join', 'leave', 'show', 'frame-ack'].includes(message.method)) return;
    if (message.method === 'frame-ack') {
      if (envelope && Object.keys(message.params || {}).length === 1 && Number.isSafeInteger(message.params?.sequence) && message.params.sequence > 0) acknowledge?.(message.params.sequence);
      return;
    }
    // Cancel an in-flight /enter immediately, without waiting for its network timeout.
    if (message.method === 'leave') { cancellation++; clear(); }
    const admission = cancellation;
    busy = busy.then(async () => {
      if (disconnected) return;
      try {
        if (message.method === 'hello') send({ id: message.id, ok: true, version: 3, toolVersion: '0.4.0', backgroundPlayer: true, inlineVideo: true, frameAck: true, targetFps: 30 });
        else if (message.method === 'leave') { clear(); await leave(); send({ id: message.id, ok: true }); }
        else if (message.method === 'show') { send(await show() ? { id: message.id, ok: true } : { id: message.id, ok: false, code: 'NATIVE_DEBUG_DISABLED' }); }
        else {
          clear(); await leave();
          if (disconnected || admission !== cancellation) fail('JOIN_CANCELLED');
          const p = message.params;
          if (!p || Object.keys(p).some(k => !['roomId', 'channelId', 'uuid', 'authToken'].includes(k))) fail('JOIN_INPUT_INVALID');
          for (const key of ['roomId', 'channelId', 'uuid', 'authToken']) if (typeof p[key] !== 'string' || !p[key] || p[key].length > (key === 'authToken' ? 16384 : 255) || /[\r\n]/.test(p[key])) fail('JOIN_INPUT_INVALID');
          credentials = { roomId: p.roomId, channelId: p.channelId, uuid: p.uuid, authToken: p.authToken };
          const current = serial;
          const data = await request('enter', { role: 'subscriber' });
          if (disconnected || current !== serial) fail('JOIN_CANCELLED');
          envelope = enterEnvelope(data, credentials.roomId);
          send({ type: 'status', value: { stage: 'enter-authorized', tokenPresent: true } });
          await join(envelope, () => !disconnected && current === serial);
          if (disconnected || current !== serial) fail('JOIN_CANCELLED');
          send({ id: message.id, ok: true });
        }
      } catch (error) { clear(); await leave(); if (!disconnected) send({ id: message.id, ok: false, code: /^[A-Z_]{1,64}$/.test(error?.code) ? error.code : 'NATIVE_FAILED' }); }
      finally { if (message.params) message.params.authToken = ''; }
    });
  });
  function disconnect() { if (disconnected) return; disconnected = true; cancellation++; clear(); Promise.resolve(leave()).finally(quit); }
  input.on('data', chunk => { try { decoder.push(chunk); } catch { disconnect(); } });
  input.on('end', disconnect);
  input.on('error', disconnect);
  return {
    status(value) { send({ type: 'status', value: safeDiagnostic(value) }); if (value.stage === 'token-renew-needed') renewToken(); },
    frame(value) {
      if (envelope && Number.isSafeInteger(value?.sequence) && value.sequence > 0 && typeof value.jpeg === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value.jpeg) && value.jpeg.length < 800000) {
        const timing = {};
        for (const key of ['sentAt', 'nativeIpcMs']) if (Number.isFinite(value[key]) && value[key] >= 0) timing[key] = value[key];
        send({ type: 'frame', jpeg: value.jpeg, sequence: value.sequence, ...timing, synthetic: false });
      }
    }
  };
}
module.exports = { createController };
