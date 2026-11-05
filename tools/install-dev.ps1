param([switch]$EnableDebug)
$ErrorActionPreference = 'Stop'
$sourceDir = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\extension')).Path
$cepRoot = Join-Path $env:APPDATA 'Adobe\CEP\extensions'
$destination = Join-Path $cepRoot 'com.codex.manualtranslator'
if (Test-Path -LiteralPath $destination) {
  throw "Installation target already exists: $destination"
}
New-Item -ItemType Directory -Path $cepRoot -Force | Out-Null
Copy-Item -LiteralPath $sourceDir -Destination $destination -Recurse
if ($EnableDebug) {
  New-Item -Path 'HKCU:\Software\Adobe\CSXS.9' -Force | Out-Null
  New-ItemProperty -Path 'HKCU:\Software\Adobe\CSXS.9' -Name 'PlayerDebugMode' -PropertyType String -Value '1' -Force | Out-Null
}
Write-Output "Installed: $destination"
Write-Output 'Restart Illustrator, then open Window > Extensions > Manual Translator.'
