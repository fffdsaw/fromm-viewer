$ErrorActionPreference = 'Stop'
$taskInstallRoot = $PSScriptRoot
$taskElectronExe = Join-Path $taskInstallRoot 'node_modules\electron\dist\electron.exe'
if (-not (Test-Path -LiteralPath $taskElectronExe)) { throw 'LIVE runtime is missing. Install dependencies or use the Windows bundle.' }
$taskIdentity = Get-Content -LiteralPath (Join-Path $taskInstallRoot 'extension-identity.json') -Raw | ConvertFrom-Json
$taskManifestFile = Join-Path $taskInstallRoot 'com.fromm.viewer.native_live.json'
$taskHostManifest = @{
  name = 'com.fromm.viewer.native_live'
  description = 'Fromm Viewer Native LIVE'
  path = (Join-Path $taskInstallRoot 'native-host.cmd')
  type = 'stdio'
  allowed_origins = @("chrome-extension://$($taskIdentity.id)/")
}
$taskManifestJson = $taskHostManifest | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText($taskManifestFile, $taskManifestJson, [System.Text.UTF8Encoding]::new($false))
foreach ($taskBrowser in @('Google\Chrome', 'Microsoft\Edge')) {
  $taskRegistryPath = "HKCU:\Software\$taskBrowser\NativeMessagingHosts\com.fromm.viewer.native_live"
  New-Item -Path $taskRegistryPath -Force | Out-Null
  Set-Item -Path $taskRegistryPath -Value $taskManifestFile
}
Write-Host 'Web LIVE connection registered. Load chrome_extension, then refresh Fromm Viewer.'
