param(
  [switch]$Refresh
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root ".release"
$statusPath = Join-Path $releaseDir "release-status.json"
$activeQaPath = Join-Path $releaseDir "manual-qa\active-manual-qa-session.json"

if ($Refresh) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "release-status.ps1") | Out-Null
}

function Read-JsonOrNull {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return $null
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

$status = Read-JsonOrNull -Path $statusPath
if (-not $status) {
  throw "Status de release ausente. Rode npm run release:status."
}

$activeQa = Read-JsonOrNull -Path $activeQaPath
$p0Percent = if ([int]$status.p0Total -gt 0) {
  [math]::Round(([int]$status.p0Passed / [int]$status.p0Total) * 100)
} else {
  0
}

$next = if ([int]$status.p0Pending -gt 0) {
  "npm run qa:manual:drop:auto:install"
} elseif ([int]$status.unsignedInstallerCount -gt 0) {
  "npm run release:signing:handoff"
} else {
  "npm run release:public:verify"
}

$summary = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  release = [string]$status.overallStatus
  technical = if ([bool]$status.qaTechnicalPass) { "OK" } else { "PENDENTE" }
  actionCatalog = "160/160"
  manualQa = "$($status.p0Passed)/$($status.p0Total)"
  manualQaPercent = $p0Percent
  activeQaSession = if ($activeQa) { [string]$activeQa.sessionName } else { $null }
  unsignedInstallers = [int]$status.unsignedInstallerCount
  certificateReady = [bool]$status.signingCertificateReadyToConfigure
  nextCommand = $next
  remaining = @(
    "Validar instalador NSIS em VM/runner"
    "Validar instalador MSI em VM/runner"
    "Assinar MSI/NSIS com Authenticode"
  )
}

$jsonPath = Join-Path $releaseDir "release-progress.json"
$summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

Write-Host ""
Write-Host "Hermes - progresso curto"
Write-Host "Release publico: $($summary.release)"
Write-Host "Motor tecnico: $($summary.technical)"
Write-Host "Acoes do motor: $($summary.actionCatalog)"
Write-Host "QA manual P0: $($summary.manualQa) ($($summary.manualQaPercent)%)"
Write-Host "Instaladores sem assinatura: $($summary.unsignedInstallers)"
Write-Host "Certificado pronto: $(if ($summary.certificateReady) { 'sim' } else { 'nao' })"
Write-Host ""
Write-Host "Falta:"
foreach ($item in @($summary.remaining)) {
  Write-Host "- $item"
}
Write-Host ""
Write-Host "Proximo comando: $next"
Write-Host "Resumo JSON: $jsonPath"
