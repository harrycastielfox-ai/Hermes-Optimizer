param(
  [switch]$RegenerateBeta,
  [switch]$RegenerateDrop
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseRoot = Join-Path $root ".release"
$betaRoot = Join-Path $releaseRoot "beta-handoff"
$dropRoot = Join-Path $releaseRoot "beta-test-drop"

function Read-JsonOrNull {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return $null
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Invoke-Step {
  param(
    [string]$Title,
    [string]$ScriptPath,
    [string[]]$Arguments = @()
  )

  Write-Host ""
  Write-Host "== $Title =="
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ScriptPath @Arguments | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "Falha na etapa: $Title"
  }
}

$latestReadyPath = Join-Path $betaRoot "latest-beta-ready.json"
$latestReady = Read-JsonOrNull -Path $latestReadyPath
$needsBeta = $RegenerateBeta -or -not $latestReady -or [string]$latestReady.status -ne "OK"

if ($needsBeta) {
  Invoke-Step -Title "Gerando beta interno" -ScriptPath (Join-Path $PSScriptRoot "run-beta-internal.ps1")
  $latestReady = Read-JsonOrNull -Path $latestReadyPath
} else {
  Write-Host "Beta interno atual reaproveitado: $($latestReady.handoffName)"
}

Invoke-Step -Title "Validando beta pronto para envio" -ScriptPath (Join-Path $PSScriptRoot "verify-beta-ready-to-send.ps1")

$latestDropPath = Join-Path $dropRoot "latest-beta-test-drop.json"
$latestDrop = Read-JsonOrNull -Path $latestDropPath
$dropMatchesBeta = $latestDrop -and
  $latestReady -and
  [string]$latestDrop.betaPackage -eq [string]$latestReady.handoffName -and
  -not [string]::IsNullOrWhiteSpace([string]$latestDrop.dropRoot) -and
  (Test-Path -LiteralPath ([string]$latestDrop.dropRoot) -PathType Container)
$needsDrop = $RegenerateDrop -or -not $dropMatchesBeta

if ($needsDrop) {
  Invoke-Step -Title "Gerando drop beta para VM/testador" -ScriptPath (Join-Path $PSScriptRoot "create-beta-test-drop.ps1")
} else {
  Write-Host "Drop beta atual reaproveitado: $($latestDrop.dropName)"
  Invoke-Step -Title "Validando drop beta atual" -ScriptPath (Join-Path $PSScriptRoot "verify-beta-test-drop.ps1")
}

Invoke-Step -Title "Empacotando drop beta em ZIP" -ScriptPath (Join-Path $PSScriptRoot "package-beta-test-drop.ps1")
Invoke-Step -Title "Atualizando progresso curto" -ScriptPath (Join-Path $PSScriptRoot "show-release-progress.ps1") -Arguments @("-Refresh")

$latestPackagePath = Join-Path $dropRoot "latest-beta-test-drop-package.json"
$latestPackage = Read-JsonOrNull -Path $latestPackagePath
if (-not $latestPackage) {
  throw "Pacote ZIP do beta drop nao encontrado: $latestPackagePath"
}

$summary = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  status = "BETA_SHIP_READY"
  betaPackage = [string]$latestPackage.betaPackage
  dropName = [string]$latestPackage.dropName
  zipPath = [string]$latestPackage.zipPath
  zipSha256 = [string]$latestPackage.zipSha256
  zipSha256Path = [string]$latestPackage.zipSha256Path
  nextCommand = "npm run release:beta:drop:open"
  checkCommand = [string]$latestPackage.checkCommand
  receiveCommand = [string]$latestPackage.receiveCommand
}

$jsonPath = Join-Path $dropRoot "latest-beta-ship.json"
$mdPath = Join-Path $dropRoot "latest-beta-ship.md"
$summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$markdown = @"
# Hermes Beta Ship

- Status: $($summary.status)
- Beta: $($summary.betaPackage)
- Drop: $($summary.dropName)
- ZIP: $($summary.zipPath)
- SHA256: $($summary.zipSha256)
- SHA file: $($summary.zipSha256Path)

## Testar agora

~~~powershell
$($summary.nextCommand)
~~~

## Depois da VM/maquina limpa

~~~powershell
$($summary.checkCommand)
$($summary.receiveCommand)
~~~
"@
$markdown | Set-Content -LiteralPath $mdPath -Encoding UTF8

Write-Host ""
Write-Host "Beta pronto para envio/teste."
Write-Host "ZIP: $($summary.zipPath)"
Write-Host "SHA256: $($summary.zipSha256)"
Write-Host "Resumo: $mdPath"
Write-Host "JSON: $jsonPath"
