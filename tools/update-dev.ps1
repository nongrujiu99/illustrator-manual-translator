$ErrorActionPreference = 'Stop'
$sourceDir = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\extension')).Path
$destination = Join-Path $env:APPDATA 'Adobe\CEP\extensions\com.codex.manualtranslator'
$manifest = Join-Path $destination 'CSXS\manifest.xml'
if (-not (Test-Path -LiteralPath $manifest)) { throw "Expected installed extension not found: $manifest" }
if (-not (Select-String -LiteralPath $manifest -Pattern 'com.codex.manualtranslator.panel' -Quiet)) { throw 'Installed extension identity does not match.' }
Get-ChildItem -LiteralPath $sourceDir -Force | Copy-Item -Destination $destination -Recurse -Force
Write-Output "Updated: $destination"
