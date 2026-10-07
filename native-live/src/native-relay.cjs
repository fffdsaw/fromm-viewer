'use strict';
// Chrome sees only its official length-prefixed protocol on this process's stdout.
const { spawn } = require('node:child_process');
const net = require('node:net');
const crypto = require('node:crypto');
const path = require('node:path');
const { Decoder, encode } = require('./native-wire.cjs');
const identity = require('../extension-identity.json');
const origin = process.argv[2];
if (origin !== `chrome-extension://${identity.id}/`) process.exit(1);
const root = path.resolve(__dirname, '..');
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const pipeId = crypto.randomBytes(24).toString('hex');
const pipeName = '\\\\.\\pipe\\fromm-native-' + pipeId;
let child, socket;
const queue = [];
const server = net.createServer(stream => {
  if (socket) { stream.destroy(); return; }
  socket = stream;
  const outward = new Decoder(value => process.stdout.write(encode(value)));
  stream.on('data', chunk => { try { outward.push(chunk); } catch { child?.kill(); process.exit(1); } });
  stream.on('error', () => { child?.kill(); process.exit(1); });
  for (const message of queue.splice(0)) stream.write(encode(message));
});
server.listen(pipeName, () => {
  child = spawn(path.join(root, 'node_modules/electron/dist/electron.exe'), [root, '--fromm-native-bridge', '--fromm-extension-id', identity.id, '--fromm-channel', pipeId], { env, cwd: root,
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.resume(); child.stderr.resume();
  child.on('exit', code => process.exit(code || 0));
  child.on('error', () => process.exit(1));
});
const inward = new Decoder(value => { if (socket) socket.write(encode(value)); else { if (queue.length > 8) process.exit(1); queue.push(value); } });
process.stdin.on('data', chunk => { try { inward.push(chunk); } catch { child?.kill(); process.exit(1); } });
process.stdin.on('end', () => { socket?.end(); child?.kill(); process.exit(0); });
