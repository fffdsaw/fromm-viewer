'use strict';
// Bundle the current repository UI; never replace the immutable 1.06 fixture.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, '../index.html'), 'utf8');
if (!source.includes('web-native-live.js?')) throw new Error('LATEST_UI_ADAPTER_MISSING');
const html = source.replace('<head>', '<head><script src="fromm://viewer/fetch-adapter.js"></script>');
fs.mkdirSync(path.join(root, 'ui'), { recursive: true });
fs.writeFileSync(path.join(root, 'ui/index.html'), html);
fs.copyFileSync(path.join(root, '../web-native-live.js'), path.join(root, 'ui/web-native-live.js'));
process.stdout.write('Current Viewer UI prepared (no session data).\n');
