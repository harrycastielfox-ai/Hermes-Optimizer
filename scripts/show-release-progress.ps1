param(
  [switch]$Refresh
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root ".release"
$statusPath = Join-Path $releaseDir "release-status.json"
$activeQaPath = Join-Path $releaseDir "manual-qa\active-manual-qa-session.json"
$releasePolicyPath = Join-Path $root "docs\release-policy.json"
$betaReadyPath = Join-Path $releaseDir "beta-handoff\latest-beta-ready.json"
$betaDropPath = Join-Path $releaseDir "beta-test-drop\latest-beta-test-drop.json"

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
$releasePolicy = Read-JsonOrNull -Path $releasePolicyPath
$latestBetaReady = Read-JsonOrNull -Path $betaReadyPath
$latestBetaDrop = Read-JsonOrNull -Path $betaDropPath
$codeSigningDeferred = $releasePolicy -and
  $releasePolicy.codeSigning -and
  [string]$releasePolicy.codeSigning.status -eq "deferred" -and
  -not [bool]$releasePolicy.codeSigning.allowUnsignedPublicRelease
$betaReady = $latestBetaReady -and [string]$latestBetaReady.status -eq "OK"
$betaDropMatchesCurrentBeta = $latestBetaDrop -and
  $latestBetaReady -and
  [string]$latestBetaDrop.betaPackage -eq [string]$latestBetaReady.handoffName
$betaDropReady = $latestBetaDrop -and
  $betaDropMatchesCurrentBeta -and
  -not [string]::IsNullOrWhiteSpace([string]$latestBetaDrop.dropRoot) -and
  (Test-Path -LiteralPath ([string]$latestBetaDrop.dropRoot) -PathType Container)
$policyNextCommand = if ($releasePolicy -and -not [string]::IsNullOrWhiteSpace([string]$releasePolicy.nextWhenPublicSigningDeferred)) {
  [string]$releasePolicy.nextWhenPublicSigningDeferred
} else {
  "npm run release:beta"
}
$qaP0Passed = if ($status.PSObject.Properties.Name -contains "qaP0Passed") { [int]$status.qaP0Passed } else { [int]$status.p0Passed }
$qaP0Total = if ($status.PSObject.Properties.Name -contains "qaP0Total") { [int]$status.qaP0Total } else { [int]$status.p0Total }
$qaP0Pending = if ($status.PSObject.Properties.Name -contains "qaP0Pending") { [int]$status.qaP0Pending } else { [int]$status.p0Pending }
$qaP0FailedOrBlocked = if ($status.PSObject.Properties.Name -contains "qaP0FailedOrBlocked") { [int]$status.qaP0FailedOrBlocked } else { [int]$status.p0FailedOrBlocked }

$p0Percent = if ($qaP0Total -gt 0) {
  [math]::Round(($qaP0Passed / $qaP0Total) * 100)
} else {
  0
}

$next = if ($qaP0Pending -gt 0) {
  "npm run qa:manual:drop:auto:install"
} elseif ($codeSigningDeferred -and [int]$status.unsignedInstallerCount -gt 0) {
  if (-not $betaReady) {
    $policyNextCommand
  } elseif (-not $betaDropReady) {
    "npm run release:beta:drop"
  } elseif (-not [string]::IsNullOrWhiteSpace([string]$latestBetaDrop.receiveCommand)) {
    [string]$latestBetaDrop.receiveCommand
  } else {
    "npm run qa:manual:drop:check"
  }
} elseif ([int]$status.unsignedInstallerCount -gt 0 -and -not [bool]$status.signingCertificateReadyToConfigure) {
  "npm run release:signing:import-pfx"
} elseif ([int]$status.unsignedInstallerCount -gt 0) {
  "npm run release:signing:handoff"
} else {
  "npm run release:public:verify"
}

$remaining = New-Object System.Collections.Generic.List[string]
if (@($status.blockers | Where-Object { [string]$_ -match "outro RC|RC atual" }).Count -gt 0) {
  $remaining.Add("Alinhar QA aprovado ao RC atual antes do release publico")
}
if ($qaP0Pending -gt 0) {
  $remaining.Add("Fechar P0 funcionais pendentes do QA manual/automatizado")
}
if ($qaP0FailedOrBlocked -gt 0 -and [int]$status.unsignedInstallerCount -eq 0) {
  $remaining.Add("Corrigir P0 funcional falho/bloqueado restante do QA")
}
if ([int]$status.unsignedInstallerCount -gt 0) {
  if ($codeSigningDeferred) {
    $remaining.Add("Release publico assinado segue bloqueado por politica: Code Signing adiado")
    if (-not $betaReady) {
      $remaining.Add("Gerar beta interno controlado")
    } elseif (-not $betaDropReady) {
      $remaining.Add("Gerar drop do beta para VM/testador")
    } else {
      $remaining.Add("Executar beta drop em VM/Windows Sandbox e devolver HermesQA")
    }
  } else {
    $remaining.Add("Assinar MSI/NSIS com Authenticode")
  }
}
if (-not [bool]$status.signingCertificateReadyToConfigure) {
  if ($codeSigningDeferred) {
    $remaining.Add("Usar somente beta interno/controlado enquanto MSI/NSIS estiverem NotSigned")
  } else {
    $remaining.Add("Configurar certificado de assinatura no ambiente de release")
  }
}
if ($remaining.Count -eq 0) {
  $remaining.Add("Rodar gate final de publicacao")
}

$summary = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  release = [string]$status.overallStatus
  technical = if ([bool]$status.qaTechnicalPass) { "OK" } else { "PENDENTE" }
  actionCatalog = "160/160"
  manualQa = "$qaP0Passed/$qaP0Total"
  manualQaPercent = $p0Percent
  releaseGateBlocked = if ($status.PSObject.Properties.Name -contains "releaseGateFailedOrBlocked") { [int]$status.releaseGateFailedOrBlocked } else { 0 }
  activeQaSession = if ($activeQa) { [string]$activeQa.sessionName } else { $null }
  unsignedInstallers = [int]$status.unsignedInstallerCount
  certificateReady = [bool]$status.signingCertificateReadyToConfigure
  codeSigningPolicy = if ($codeSigningDeferred) { "deferred" } else { "active" }
  currentChannel = if ($releasePolicy) { [string]$releasePolicy.currentChannel } else { "public-signed" }
  betaReady = [bool]$betaReady
  betaPackage = if ($latestBetaReady) { [string]$latestBetaReady.handoffName } else { $null }
  betaDropReady = [bool]$betaDropReady
  betaDropMatchesCurrentBeta = [bool]$betaDropMatchesCurrentBeta
  betaDrop = if ($latestBetaDrop) { [string]$latestBetaDrop.dropName } else { $null }
  betaDropReadme = if ($latestBetaDrop) { [string]$latestBetaDrop.readmePath } else { $null }
  nextCommand = $next
  remaining = @($remaining)
}

$jsonPath = Join-Path $releaseDir "release-progress.json"
$summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

Write-Host ""
Write-Host "Hermes - progresso curto"
Write-Host "Release publico: $($summary.release)"
Write-Host "Motor tecnico: $($summary.technical)"
Write-Host "Acoes do motor: $($summary.actionCatalog)"
Write-Host "QA funcional P0: $($summary.manualQa) ($($summary.manualQaPercent)%)"
Write-Host "Gate release bloqueado: $($summary.releaseGateBlocked)"
Write-Host "Instaladores sem assinatura: $($summary.unsignedInstallers)"
Write-Host "Certificado pronto: $(if ($summary.certificateReady) { 'sim' } else { 'nao' })"
Write-Host "Assinatura publica: $(if ($summary.codeSigningPolicy -eq 'deferred') { 'adiada; publico segue bloqueado' } else { 'ativa' })"
Write-Host "Canal atual: $($summary.currentChannel)"
Write-Host "Beta interno: $(if ($summary.betaReady) { $summary.betaPackage } else { 'nao gerado' })"
Write-Host "Beta drop: $(if ($summary.betaDropReady) { $summary.betaDrop } else { 'nao gerado' })"
Write-Host ""
Write-Host "Falta:"
foreach ($item in @($summary.remaining)) {
  Write-Host "- $item"
}
Write-Host ""
Write-Host "Proximo comando: $next"
Write-Host "Resumo JSON: $jsonPath"
