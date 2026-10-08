'use strict';
const fs = require('node:fs'), path = require('node:path');
module.exports = async context => {
  if (context.electronPlatformName !== 'win32' || context.arch !== 1) throw new Error('WINDOWS_X64_REQUIRED');
  for (const file of ['agora_node_ext.node', 'agora_rtc_sdk.dll', 'AgoraRtcWrapper.dll']) {
    const target = path.join(context.packager.info.appDir, 'node_modules/agora-electron-sdk/build/Release', file);
    if (!fs.existsSync(target)) throw new Error('NATIVE_RUNTIME_MISSING: ' + file);
    const handle = fs.openSync(target, 'r'), magic = Buffer.alloc(2);
    try { fs.readSync(handle, magic, 0, 2, 0); } finally { fs.closeSync(handle); }
    if (magic.toString() !== 'MZ') throw new Error('WINDOWS_NATIVE_BINARY_REQUIRED');
  }
};
