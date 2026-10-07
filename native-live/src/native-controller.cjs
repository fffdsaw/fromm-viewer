'use strict';
const { Decoder, encode } = require('./native-wire.cjs');
const { enterEnvelope, token007, safeDiagnostic, fail } = require('./contracts.cjs');
const { net } = require('electron');
function createController({ join, leave, show, renew, quit, acknowledge, input = process.stdin, sendMessage }) {
  let credentials = null, envelope = null, busy = Promise.resolve(), serial = 0;
  const send = sendMessage || (value => process.stdout.write(encode(value, true)));
  function clear() { serial++; credentials = null; if (envelope) { envelope.encryptionKey = ''; envelope.rtcToken = ''; envelope.encryptionKdfSalt.fill(0); } envelope = null; }
  async function request(suffix, body) {
    if (!credentials) fail('LOGIN_REQUIRED');
    const url = new URL(`https://channel-api.frommyarti.com/live/agora/rooms/${encodeURIComponent(credentials.roomId)}/${suffix}`);
    if (suffix === 'enter') url.searchParams.set('channelId', credentials.channelId);
    const response = await net.fetch(url.toString(), { method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(25000),
      headers: { authorization: /^Bearer\s/i.test(credentials.authToken) ? credentials.authToken : `Bearer ${credentials.authToken}`,
        uuid: credentials.uuid, 'channel-id': credentials.channelId, 'content-type': 'application/json',
        origin: 'https://channel.frommyarti.com', referer: 'https://channel.frommyarti.com/' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok || data?.success === false || data?.ok === false) fail('FROMM_ACCESS_DENIED');
    return data;
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
    busy = busy.then(async () => {
      try {
        if (message.method === 'hello') send({ id: message.id, ok: true, version: 2, inlineVideo: true, frameAck: true, targetFps: 30 });
        else if (message.method === 'leave') { clear(); leave(); send({ id: message.id, ok: true }); }
        else if (message.method === 'show') { show(); send({ id: message.id, ok: true }); }
        else {
          clear(); leave();
          const p = message.params;
          if (!p || Object.keys(p).some(k => !['roomId', 'channelId', 'uuid', 'authToken'].includes(k))) fail('JOIN_INPUT_INVALID');
          for (const key of ['roomId', 'channelId', 'uuid', 'authToken']) if (typeof p[key] !== 'string' || !p[key] || p[key].length > (key === 'authToken' ? 16384 : 255) || /[\r\n]/.test(p[key])) fail('JOIN_INPUT_INVALID');
          credentials = { roomId: p.roomId, channelId: p.channelId, uuid: p.uuid, authToken: p.authToken };
          const data = await request('enter', { role: 'subscriber' });
          envelope = enterEnvelope(data, credentials.roomId);
          send({ type: 'status', value: { stage: 'enter-authorized', tokenPresent: true } });
          await join(envelope);
          send({ id: message.id, ok: true });
        }
      } catch (error) { clear(); leave(); send({ id: message.id, ok: false, code: /^[A-Z_]{1,64}$/.test(error?.code) ? error.code : 'NATIVE_FAILED' }); }
      finally { if (message.params) message.params.authToken = ''; }
    });
  });
  input.on('data', chunk => { try { decoder.push(chunk); } catch { clear(); leave(); quit(); } });
  input.on('end', () => { clear(); leave(); quit(); });
  input.on('error', () => { clear(); leave(); quit(); });
  return {
    status(value) { send({ type: 'status', value: safeDiagnostic(value) }); if (value.stage === 'token-renew-needed') renewToken(); },
    frame(value) { if (envelope && Number.isSafeInteger(value?.sequence) && value.sequence > 0 && typeof value.jpeg === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value.jpeg) && value.jpeg.length < 800000) send({ type: 'frame', jpeg: value.jpeg, sequence: value.sequence }); }
  };
}
module.exports = { createController };
