param(
  [string]$OutputPath,
  [switch]$SkipRefresh
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root ".release"
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

function Read-JsonOrNull {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return $null
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Add-Step {
  param(
    [System.Collections.Generic.List[object]]$Steps,
    [string]$Id,
    [string]$Title,
    [string]$Status,
    [string]$Why,
    [string[]]$Commands,
    [string[]]$Evidence
  )

  $Steps.Add([pscustomobject]@{
    id       = $Id
    title    = $Title
    status   = $Status
    why      = $Why
    commands = @($Commands)
    evidence = @($Evidence)
  })
}

if (-not $SkipRefresh) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "release-status.ps1")
}

$releaseStatusPath = Join-Path $releaseDir "release-status.json"
$releaseStatus = Read-JsonOrNull -Path $releaseStatusPath
if (-not $releaseStatus) {
  throw "Release status ausente. Rode npm run release:status."
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path $releaseDir "release-launch-plan.md"
}

$jsonPath = [System.IO.Path]::ChangeExtension($OutputPath, ".json")
$steps = New-Object System.Collections.Generic.List[object]

$technicalStatus = if ([bool]$releaseStatus.qaTechnicalPass) { "done" } else { "blocked" }
Add-Step `
  -Steps $steps `
  -Id "technical-gates" `
  -Title "Fechar gates tecnicos" `
  -Status $technicalStatus `
  -Why "Mantem build, CSP, permissoes, modo seguro, catalogo de 150+ acoes e preservacao de rotas sob controle." `
  -Commands @("npm run verify:release-gates", "npm run lint", "npm run qa:release") `
  -Evidence @(".release/qa-latest.json", ".release/release-status.json")

$manualQaStatus = if ([string]$releaseStatus.manualDecision -eq "GO") { "done" } else { "blocked" }
$manualQaCommands = @(
  "npm run qa:manual:drop:open",
  "npm run qa:manual:drop:zip",
  "npm run qa:manual:drop:check",
  "npm run qa:manual:drop:receive",
  "npm run qa:manual:verify"
)
Add-Step `
  -Steps $steps `
  -Id "manual-clean-machine-qa" `
  -Title "Executar QA manual em VM ou maquina limpa" `
  -Status $manualQaStatus `
  -Why "E o bloqueio principal para provar instalacao, navegacao, scroll, redimensionamento, Dashboard, Otimizar, Anti-Cheat, Defender, Manutencao e Configuracoes fora da maquina de desenvolvimento." `
  -Commands $manualQaCommands `
  -Evidence @(
    [string]$releaseStatus.latestManualQaTestDrop,
    [string]$releaseStatus.latestManualQaDropZip,
    [string]$releaseStatus.latestManualQa
  )

$signingStatus = if ([int]$releaseStatus.unsignedInstallerCount -eq 0 -and [bool]$releaseStatus.signingAllInstallersSigned) {
  "done"
} elseif ([bool]$releaseStatus.signingReadyToSign) {
  "ready"
} else {
  "blocked"
}
Add-Step `
  -Steps $steps `
  -Id "authenticode-signing" `
  -Title "Assinar instaladores Authenticode" `
  -Status $signingStatus `
  -Why "Sem assinatura valida, Windows SmartScreen/Defender pode barrar o instalador e o release publico continua NO-GO." `
  -Commands @(
    "npm run release:signing:certs",
    "npm run release:signing:preflight",
    "npm run release:signing:handoff",
    "npm run build:windows:real:signed"
  ) `
  -Evidence @(".release/signing-certificate-candidates.md", ".release/signing-preflight.md", ".release/signing-handoff.md")

$finalBuildStatus = if ([string]$releaseStatus.overallStatus -eq "GO") { "ready" } else { "blocked" }
Add-Step `
  -Steps $steps `
  -Id "final-release-candidate" `
  -Title "Gerar pacote final publicavel" `
  -Status $finalBuildStatus `
  -Why "Depois de QA manual GO e Authenticode Valid, o Hermes pode gerar o candidato final para distribuicao." `
  -Commands @("npm run release:internal", "npm run release:candidate", "npm run release:candidate:verify", "npm run release:status") `
  -Evidence @(".release/candidates", ".release/release-status.md")

$nextOperationalCommand = if ([string]$releaseStatus.manualDecision -ne "GO") {
  "npm run qa:manual:drop:open"
} elseif ([int]$releaseStatus.unsignedInstallerCount -gt 0) {
  "npm run release:signing:handoff"
} else {
  "npm run release:internal"
}

$plan = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  overallStatus = [string]$releaseStatus.overallStatus
  nextOperationalCommand = $nextOperationalCommand
  manualQa = [pscustomobject]@{
    decision = [string]$releaseStatus.manualDecision
    p0Passed = [int]$releaseStatus.p0Passed
    p0Total = [int]$releaseStatus.p0Total
    p0Pending = [int]$releaseStatus.p0Pending
    p0FailedOrBlocked = [int]$releaseStatus.p0FailedOrBlocked
    drop = [string]$releaseStatus.latestManualQaTestDrop
    dropZip = [string]$releaseStatus.latestManualQaDropZip
    dropZipSha256 = [string]$releaseStatus.latestManualQaDropZipSha256
  }
  signing = [pscustomobject]@{
    unsignedInstallerCount = [int]$releaseStatus.unsignedInstallerCount
    readyToSign = [bool]$releaseStatus.signingReadyToSign
    allInstallersSigned = [bool]$releaseStatus.signingAllInstallersSigned
    certificateReadyToConfigure = [bool]$releaseStatus.signingCertificateReadyToConfigure
    certificateCandidateCount = [int]$releaseStatus.signingCertificateCandidateCount
  }
  blockers = @($releaseStatus.blockers)
  warnings = @($releaseStatus.warnings)
  steps = @($steps.ToArray())
  outputPath = $OutputPath
  jsonPath = $jsonPath
}

$plan | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# Hermes Launch Plan")
$markdown.Add("")
$markdown.Add("Plano operacional curto para transformar o Hermes de RC tecnico em release publicavel.")
$markdown.Add("")
$markdown.Add("- Status atual: **$($plan.overallStatus)**")
$markdown.Add("- Proximo comando recomendado: ``$($plan.nextOperationalCommand)``")
$markdown.Add("- QA manual P0: $($plan.manualQa.p0Passed)/$($plan.manualQa.p0Total) aprovados")
$markdown.Add("- Instaladores sem Authenticode Valid: $($plan.signing.unsignedInstallerCount)")
if ($plan.manualQa.dropZip) {
  $markdown.Add("- ZIP para VM: ``$($plan.manualQa.dropZip)``")
}
if ($plan.manualQa.dropZipSha256) {
  $markdown.Add("- ZIP SHA256: ``$($plan.manualQa.dropZipSha256)``")
}
$markdown.Add("")
$markdown.Add("## Passos")
$markdown.Add("")
foreach ($step in @($plan.steps)) {
  $markdown.Add("### $($step.title)")
  $markdown.Add("")
  $markdown.Add("- Status: **$($step.status)**")
  $markdown.Add("- Motivo: $($step.why)")
  $markdown.Add("- Comandos:")
  foreach ($command in @($step.commands)) {
    $markdown.Add("  - ``$command``")
  }
  $evidenceItems = @($step.evidence | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
  if ($evidenceItems.Count -gt 0) {
    $markdown.Add("- Evidencias:")
    foreach ($evidence in $evidenceItems) {
      $markdown.Add("  - ``$evidence``")
    }
  }
  $markdown.Add("")
}

$markdown.Add("## Bloqueios")
$markdown.Add("")
if (@($plan.blockers).Count -gt 0) {
  foreach ($blocker in @($plan.blockers)) {
    $markdown.Add("- $blocker")
  }
} else {
  $markdown.Add("- Nenhum bloqueio ativo.")
}
$markdown.Add("")
$markdown.Add("## Avisos")
$markdown.Add("")
if (@($plan.warnings).Count -gt 0) {
  foreach ($warning in @($plan.warnings)) {
    $markdown.Add("- $warning")
  }
} else {
  $markdown.Add("- Nenhum aviso ativo.")
}

$markdown | Set-Content -LiteralPath $OutputPath -Encoding UTF8

Write-Host "Launch plan gerado:"
Write-Host "- $OutputPath"
Write-Host "- $jsonPath"
Write-Host "Status: $($plan.overallStatus)"
Write-Host "Proximo comando: $($plan.nextOperationalCommand)"
