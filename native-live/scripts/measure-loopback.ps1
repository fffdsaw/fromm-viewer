param([ValidateRange(3, 90)][int]$Seconds = 48)
$ErrorActionPreference = 'Stop'
try {
  Add-Type -Path (Join-Path $PSScriptRoot 'loopback-probe.cs')
  $probe = [FrommBenchmark.LoopbackProbe]::new()
  try {
    Write-Output '{"stage":"audio-loopback-ready","synthetic":true,"mediaVerified":false}'
    $result = $probe.Measure($Seconds)
    $result | ConvertTo-Json -Depth 4 -Compress
  } finally { $probe.Dispose() }
} catch {
  Write-Output '{"stage":"audio-loopback-unavailable","hardwareAudioVerified":false,"synthetic":true,"mediaVerified":false}'
  exit 2
}
