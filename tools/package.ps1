$ErrorActionPreference = 'Stop'
$project = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$source = Join-Path $project 'extension'
$dist = Join-Path $project 'dist'
$name = 'illustrator-manual-translator-0.1.2-windows'
$stage = [System.IO.Path]::GetFullPath((Join-Path $dist $name))
$distFull = [System.IO.Path]::GetFullPath($dist)
if (-not $stage.StartsWith($distFull + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Package stage must be inside dist.'
}
$zip = Join-Path $dist ($name + '.zip')
$files = @(
  'CSXS\manifest.xml',
  'index.html',
  'css\panel.css',
  'host\bootstrap.jsx',
  'js\bridge.js',
  'js\panel.js',
  'js\core\job.js',
  'js\core\provider.js',
  'js\core\profiles.js',
  'js\core\key-vault.js',
  'js\core\segments.js',
  'js\core\translation.js'
)
New-Item -ItemType Directory -Path $dist -Force | Out-Null
if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $stage 'extension') -Force | Out-Null
foreach ($relative in $files) {
  $from = Join-Path $source $relative
  if (-not (Test-Path -LiteralPath $from -PathType Leaf)) { throw "Missing extension file: $relative" }
  $to = Join-Path (Join-Path $stage 'extension') $relative
  New-Item -ItemType Directory -Path (Split-Path -Parent $to) -Force | Out-Null
  Copy-Item -LiteralPath $from -Destination $to
}
Copy-Item -LiteralPath (Join-Path $project 'packaging\install.ps1') -Destination (Join-Path $stage 'install.ps1')
Copy-Item -LiteralPath (Join-Path $project 'packaging\USAGE.md') -Destination (Join-Path $stage 'USAGE.md')
Compress-Archive -LiteralPath $stage -DestinationPath $zip -CompressionLevel Optimal -Force
Write-Output "Package: $zip"
Write-Output "SHA256: $((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash)"
