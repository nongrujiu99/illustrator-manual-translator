param(
  [ValidateSet(9, 10, 11, 12)]
  [int]$CepMajor = 9,
  [switch]$EnableUnsigned,
  [switch]$Update,
  [string]$InstallRoot
)

$ErrorActionPreference = 'Stop'
$extensionId = 'com.codex.manualtranslator'
$source = Join-Path $PSScriptRoot 'extension'
$sourceManifestPath = Join-Path $source 'CSXS\manifest.xml'
if (-not (Test-Path -LiteralPath $sourceManifestPath -PathType Leaf)) {
  throw "Package is incomplete: $sourceManifestPath"
}
[xml]$sourceManifest = Get-Content -LiteralPath $sourceManifestPath -Raw -Encoding UTF8
if ($sourceManifest.ExtensionManifest.ExtensionBundleId -ne $extensionId) {
  throw 'Package extension identity does not match.'
}

if ([string]::IsNullOrWhiteSpace($InstallRoot)) {
  if ([string]::IsNullOrWhiteSpace($env:APPDATA)) { throw 'APPDATA is not available.' }
  $InstallRoot = Join-Path $env:APPDATA 'Adobe\CEP\extensions'
}
$InstallRoot = [System.IO.Path]::GetFullPath($InstallRoot)
$destination = Join-Path $InstallRoot $extensionId
New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null

if (Test-Path -LiteralPath $destination) {
  if (-not $Update) { throw "Already installed: $destination. Rerun with -Update to replace this extension." }
  $installedManifestPath = Join-Path $destination 'CSXS\manifest.xml'
  if (-not (Test-Path -LiteralPath $installedManifestPath -PathType Leaf)) { throw 'Existing folder has no extension manifest; refusing to replace it.' }
  [xml]$installedManifest = Get-Content -LiteralPath $installedManifestPath -Raw -Encoding UTF8
  if ($installedManifest.ExtensionManifest.ExtensionBundleId -ne $extensionId) { throw 'Installed extension identity does not match; refusing to replace it.' }
  $backupRoot = Join-Path (Split-Path -Parent $InstallRoot) 'extension-backups'
  New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
  $backup = Join-Path $backupRoot ($extensionId + '-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
  if (Test-Path -LiteralPath $backup) { throw "Backup already exists: $backup" }
  Copy-Item -LiteralPath $destination -Destination $backup -Recurse
  Get-ChildItem -LiteralPath $source -Force | Copy-Item -Destination $destination -Recurse -Force
  Write-Output "Previous installation backed up: $backup"
} else {
  Copy-Item -LiteralPath $source -Destination $destination -Recurse
}

$sourceFiles = Get-ChildItem -LiteralPath $source -File -Recurse
foreach ($file in $sourceFiles) {
  $relative = $file.FullName.Substring($source.Length).TrimStart('\', '/')
  $installedFile = Join-Path $destination $relative
  if (-not (Test-Path -LiteralPath $installedFile -PathType Leaf)) { throw "Installed file missing: $relative" }
  if ((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $installedFile -Algorithm SHA256).Hash) {
    throw "Installed file differs: $relative"
  }
}

if ($EnableUnsigned) {
  $key = "HKCU:\Software\Adobe\CSXS.$CepMajor"
  New-Item -Path $key -Force | Out-Null
  New-ItemProperty -Path $key -Name PlayerDebugMode -PropertyType String -Value '1' -Force | Out-Null
  Write-Output "Unsigned CEP $CepMajor loading enabled for the current Windows user."
}
Write-Output "Installed and verified: $destination"
Write-Output 'Restart Illustrator, then open Window > Extensions > Manual Translator.'
