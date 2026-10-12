'use strict';
// Hosted Windows VMs use a smaller synthetic input; throughput gates remain
// identical. The local default keeps the full 720x1280 capture verification.
function benchmarkSize(argv) {
  const sizes = argv.filter(value => value.startsWith('--benchmark-size='));
  if (sizes.length > 1) throw new Error('BENCHMARK_SIZE_INVALID');
  if (!sizes.length || sizes[0] === '--benchmark-size=720x1280') return { width: 720, height: 1280 };
  if (sizes[0] === '--benchmark-size=360x640') return { width: 360, height: 640 };
  throw new Error('BENCHMARK_SIZE_INVALID');
}
module.exports = { benchmarkSize };
