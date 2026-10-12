'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { benchmarkSize } = require('../src/benchmark-size.cjs');
test('local benchmark preserves full 720x1280 unless the VM preset is explicit', () => {
  assert.deepEqual(benchmarkSize(['electron.exe', '.', '--frame-benchmark']), { width: 720, height: 1280 });
  assert.deepEqual(benchmarkSize(['--benchmark-size=720x1280']), { width: 720, height: 1280 });
  assert.deepEqual(benchmarkSize(['--benchmark-size=360x640']), { width: 360, height: 640 });
});
test('unsupported or duplicate sizes cannot silently change verification dimensions', () => {
  for (const argv of [['--benchmark-size=1x1'], ['--benchmark-size=360X640'], ['--benchmark-size=360x640', '--benchmark-size=720x1280']]) {
    assert.throws(() => benchmarkSize(argv), /BENCHMARK_SIZE_INVALID/);
  }
});
