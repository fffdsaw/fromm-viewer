'use strict';
// Real browser DNR/CORS evaluation against a loopback TLS fixture. No real API traffic.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fromm-synthetic-cors-'));
  let server, context;
  try {
    const openssl = process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/openssl.exe' : 'openssl';
    execFileSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=synthetic.local',
      '-keyout', path.join(temp, 'key.pem'), '-out', path.join(temp, 'cert.pem')], {stdio: 'ignore'});
    const extension = path.join(temp, 'extension'); fs.mkdirSync(extension);
    // Use the production rules verbatim, without starting the Native messaging bridge.
    fs.copyFileSync(path.join(root, 'chrome_extension/rules.json'), path.join(extension, 'rules.json'));
    fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify({manifest_version: 3, name: 'Synthetic CORS contract', version: '1.0.0',
      permissions: ['declarativeNetRequest'], host_permissions: ['https://*/*'],
      declarative_net_request: {rule_resources: [{id: 'rules', enabled: true, path: 'rules.json'}]}}));
    const posts = [], preflights = [];
    server = https.createServer({key: fs.readFileSync(path.join(temp, 'key.pem')), cert: fs.readFileSync(path.join(temp, 'cert.pem'))}, (request, response) => {
      if (request.method === 'OPTIONS') { preflights.push(request.url); response.writeHead(204); return response.end(); }
      if (request.method === 'POST') {
        posts.push(request.url); response.writeHead(200, {'Content-Type': 'text/xml'});
        return response.end('<SendMessageResponse><SendMessageResult><MessageId>synthetic-ack</MessageId></SendMessageResult></SendMessageResponse>');
      }
      response.writeHead(200, {'Content-Type': 'text/html'}); response.end('<!doctype html><title>Synthetic loopback CORS test</title>');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    context = await chromium.launchPersistentContext(path.join(temp, 'profile'), {headless: true,
      channel: process.env.CORS_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chromium'),
      ignoreDefaultArgs: ['--disable-extensions'], ignoreHTTPSErrors: true,
      args: ['--no-proxy-server', '--ignore-certificate-errors', '--disable-extensions-except=' + extension, '--load-extension=' + extension,
        '--host-resolver-rules=MAP fffdsaw.github.io:443 127.0.0.1:' + port + ', MAP live-chat-api.frommyarti.com:443 127.0.0.1:' + port + ', MAP other.test:443 127.0.0.1:' + port]});
    const page = await context.newPage();
    await page.goto('https://fffdsaw.github.io/fromm-viewer/');
    assert.equal(await page.title(), 'Synthetic loopback CORS test', 'host mapping must reach the fixture before any POST');
    async function attempt(suffix) {
      return page.evaluate(async suffix => {
        try {
          const response = await fetch('https://live-chat-api.frommyarti.com/live-chat/messages/' + suffix, {method: 'POST', credentials: 'omit',
            headers: {Authorization: 'Bearer synthetic-token', 'Content-Type': 'application/json'}, body: JSON.stringify({content: 'synthetic'})});
          return {status: response.status, ack: (await response.text()).includes('<MessageId>synthetic-ack</MessageId>')};
        } catch { return {blocked: true}; }
      }, suffix);
    }
    assert.deepEqual(await attempt('normal'), {status: 200, ack: true});
    assert.equal(posts.length, 1); assert.ok(preflights.length >= 1);
    await page.goto('https://other.test/');
    assert.equal(await page.title(), 'Synthetic loopback CORS test');
    assert.deepEqual(await attempt('normal'), {blocked: true});
    assert.equal(posts.length, 1, 'an unrelated initiator never sends a POST');
    console.log('Production extension 1.0.9 with preserved API rules: real browser TLS preflight/JSON POST/ACK PASS; unrelated origin blocked before POST (loopback synthetic only)');
  } finally {
    await context?.close(); if (server) await new Promise(resolve => server.close(resolve));
    assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temp).startsWith('fromm-synthetic-cors-'));
    fs.rmSync(temp, {recursive: true, force: true});
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
