$ErrorActionPreference = 'Stop'
$key = 'HKCU:\Software\Adobe\CSXS.9'
New-Item -Path $key -Force | Out-Null
New-ItemProperty -Path $key -Name 'PlayerDebugMode' -PropertyType String -Value '1' -Force | Out-Null
Write-Output 'CEP 9 PlayerDebugMode enabled for current user.'
