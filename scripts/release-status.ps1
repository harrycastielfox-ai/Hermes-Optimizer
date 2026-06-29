param(
  [string]$QaReportPath,
  [string]$CandidatesRoot,
  [string]$ManualQaRoot,
  [string]$SigningPreflightPath,
  [string]$SigningCertificateCandidatesPath
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($QaReportPath)) {
  $QaReportPath = Join-Path $root ".release\qa-latest.json"
}
if ([string]::IsNullOrWhiteSpace($CandidatesRoot)) {
  $CandidatesRoot = Join-Path $root ".release\candidates"
}
if ([string]::IsNullOrWhiteSpace($ManualQaRoot)) {
  $ManualQaRoot = Join-Path $root ".release\manual-qa"
}
if ([string]::IsNullOrWhiteSpace($SigningPreflightPath)) {
  $SigningPreflightPath = Join-Path $root ".release\signing-preflight.json"
}
if ([string]::IsNullOrWhiteSpace($SigningCertificateCandidatesPath)) {
  $SigningCertificateCandidatesPath = Join-Path $root ".release\signing-certificate-candidates.json"
}

function Read-JsonFileOrNull {
  param([string]$Path)

  if (Test-Path -LiteralPath $Path -PathType Leaf) {
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  }

  return $null
}

function Get-LatestDirectoryOrNull {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
    return $null
  }

  return Get-ChildItem -LiteralPath $Path -Directory |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

function Get-LatestPortableQaPackageOrNull {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
    return $null
  }

  $manifestFile = Get-ChildItem -LiteralPath $Path -Recurse -File -Filter "hermes-manual-qa-portable-*-manifest.json" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $manifestFile) {
    return $null
  }

  $manifest = Read-JsonFileOrNull -Path $manifestFile.FullName
  if (-not $manifest) {
    return $null
  }

  return [pscustomobject]@{
    path     = $manifestFile.FullName
    manifest = $manifest
  }
}

$qaReport = Read-JsonFileOrNull -Path $QaReportPath
$latestCandidate = Get-LatestDirectoryOrNull -Path $CandidatesRoot
$candidateManifest = $null
$candidateVerification = $null
if ($latestCandidate) {
  $candidateManifest = Read-JsonFileOrNull -Path (Join-Path $latestCandidate.FullName "release-candidate-manifest.json")
  $candidateVerification = Read-JsonFileOrNull -Path (Join-Path $latestCandidate.FullName "release-candidate-verification.json")
}

$latestManualQa = Get-LatestDirectoryOrNull -Path $ManualQaRoot
$manualQaVerification = $null
if ($latestManualQa) {
  $manualQaVerification = Read-JsonFileOrNull -Path (Join-Path $latestManualQa.FullName "manual-qa-verification.json")
}
$latestPortableQaPackage = Get-LatestPortableQaPackageOrNull -Path $ManualQaRoot

$signingPreflight = Read-JsonFileOrNull -Path $SigningPreflightPath
$signingCertificateCandidates = Read-JsonFileOrNull -Path $SigningCertificateCandidatesPath

$blockers = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

if (-not $qaReport) {
  $blockers.Add("QA automatizado ausente. Rode npm run qa:release.")
} elseif (-not [bool]$qaReport.technicalPass) {
  $blockers.Add("QA automatizado falhou.")
}

if (-not $candidateManifest) {
  $blockers.Add("Release candidate ausente. Rode npm run release:candidate.")
}

if (-not $candidateVerification) {
  $blockers.Add("Verificacao do release candidate ausente. Rode npm run release:candidate:verify.")
} elseif (@($candidateVerification.failures).Count -gt 0) {
  $blockers.Add("Release candidate possui falhas de integridade.")
}

if (-not $manualQaVerification) {
  $blockers.Add("QA manual sem resumo. Rode npm run qa:manual:status.")
} else {
  if ($latestCandidate -and [string]$manualQaVerification.candidateName -ne $latestCandidate.Name) {
    $blockers.Add("QA manual pertence a outro RC: $($manualQaVerification.candidateName). Gere uma sessao nova com npm run qa:manual:new.")
  }
  if ([string]$manualQaVerification.manualDecision -ne "GO") {
    $blockers.Add("QA manual ainda esta $($manualQaVerification.manualDecision).")
  }
  if ([int]$manualQaVerification.p0Pending -gt 0) {
    $blockers.Add("$($manualQaVerification.p0Pending) item(ns) P0 pendente(s) no QA manual.")
  }
  if ([int]$manualQaVerification.p0FailedOrBlocked -gt 0) {
    $blockers.Add("$($manualQaVerification.p0FailedOrBlocked) item(ns) P0 falharam/bloquearam.")
  }
}

$unsignedInstallers = @()
if ($qaReport) {
  $unsignedInstallers = @($qaReport.installers | Where-Object { $_.signatureStatus -ne "Valid" })
  if ($unsignedInstallers.Count -gt 0) {
    $blockers.Add("$($unsignedInstallers.Count) instalador(es) sem Authenticode Valid.")
  }
}

if ($unsignedInstallers.Count -gt 0) {
  if (-not $signingPreflight) {
    $blockers.Add("Preflight de assinatura ausente. Rode npm run release:signing:preflight.")
  } else {
    foreach ($signingBlocker in @($signingPreflight.blockers)) {
      $blockers.Add("Assinatura: $signingBlocker")
    }

    foreach ($signingWarning in @($signingPreflight.warnings)) {
      $warnings.Add("Assinatura: $signingWarning")
    }
  }

  if (-not $signingCertificateCandidates) {
    $warnings.Add("Assinatura: candidatos de certificado nao verificados. Rode npm run release:signing:certs.")
  } else {
    if (-not [bool]$signingCertificateCandidates.readyToConfigure) {
      foreach ($certificateBlocker in @($signingCertificateCandidates.blockers)) {
        $blockers.Add("Certificado: $certificateBlocker")
      }
    }

    foreach ($certificateWarning in @($signingCertificateCandidates.warnings)) {
      $warnings.Add("Certificado: $certificateWarning")
    }
  }
}

if ($qaReport -and -not [bool]$qaReport.releaseReady) {
  $warnings.Add("qa-latest.json ainda marca releaseReady=false.")
}

$overallStatus = if ($blockers.Count -gt 0) { "NO-GO" } else { "GO" }
$status = [pscustomobject]@{
  generatedAt              = (Get-Date).ToString("o")
  overallStatus            = $overallStatus
  qaTechnicalPass          = if ($qaReport) { [bool]$qaReport.technicalPass } else { $false }
  qaReleaseReady           = if ($qaReport) { [bool]$qaReport.releaseReady } else { $false }
  latestCandidate          = if ($latestCandidate) { $latestCandidate.FullName } else { $null }
  latestManualQa           = if ($latestManualQa) { $latestManualQa.FullName } else { $null }
  latestManualQaPortableManifest = if ($latestPortableQaPackage) { $latestPortableQaPackage.path } else { $null }
  latestManualQaPortableZip = if ($latestPortableQaPackage) { [string]$latestPortableQaPackage.manifest.zipPath } else { $null }
  latestManualQaPortableZipSha256 = if ($latestPortableQaPackage) { [string]$latestPortableQaPackage.manifest.zipSha256 } else { $null }
  latestManualQaPortableGeneratedAt = if ($latestPortableQaPackage) { [string]$latestPortableQaPackage.manifest.generatedAt } else { $null }
  manualDecision           = if ($manualQaVerification) { $manualQaVerification.manualDecision } else { $null }
  manualPublicDecision     = if ($manualQaVerification) { $manualQaVerification.publicDecision } else { $null }
  p0Passed                 = if ($manualQaVerification) { [int]$manualQaVerification.p0Passed } else { 0 }
  p0Total                  = if ($manualQaVerification) { [int]$manualQaVerification.p0Total } else { 0 }
  p0Pending                = if ($manualQaVerification) { [int]$manualQaVerification.p0Pending } else { 0 }
  p0FailedOrBlocked        = if ($manualQaVerification) { [int]$manualQaVerification.p0FailedOrBlocked } else { 0 }
  unsignedInstallerCount   = $unsignedInstallers.Count
  signingPreflightPath     = if ($signingPreflight) { (Resolve-Path $SigningPreflightPath).Path } else { $null }
  signingCertificateCandidatesPath = if ($signingCertificateCandidates) { (Resolve-Path $SigningCertificateCandidatesPath).Path } else { $null }
  signingReadyToSign       = if ($signingPreflight) { [bool]$signingPreflight.readyToSign } else { $false }
  signingAllInstallersSigned = if ($signingPreflight) { [bool]$signingPreflight.allInstallersSigned } else { $false }
  signingCertificateFound  = if ($signingPreflight) { [bool]$signingPreflight.certificateFound } else { $false }
  signingCertificateHasPrivateKey = if ($signingPreflight) { [bool]$signingPreflight.certificateHasPrivateKey } else { $false }
  signingCertificateReadyToConfigure = if ($signingCertificateCandidates) { [bool]$signingCertificateCandidates.readyToConfigure } else { $false }
  signingCertificateCandidateCount = if ($signingCertificateCandidates) { @($signingCertificateCandidates.candidates).Count } else { 0 }
  blockers                 = @($blockers)
  warnings                 = @($warnings)
}

$statusPath = Join-Path $root ".release\release-status.json"
$status | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $statusPath -Encoding UTF8
$statusMarkdownPath = Join-Path $root ".release\release-status.md"

$manualSummary = if ($manualQaVerification) {
  "$($status.p0Passed)/$($status.p0Total) P0 aprovados"
} else {
  "sem sessao manual"
}

$candidateSummary = if ($latestCandidate) {
  $latestCandidate.Name
} else {
  "ausente"
}

$signingSummary = if ($signingPreflight) {
  "pronto para assinar: $(if ($status.signingReadyToSign) { 'sim' } else { 'nao' }); certificado pronto: $(if ($status.signingCertificateReadyToConfigure) { 'sim' } else { 'nao' })"
} else {
  "preflight ausente"
}

$nextStep = if (-not $qaReport -or -not [bool]$status.qaTechnicalPass) {
  "Rode ``npm run qa:release``."
} elseif (-not $candidateManifest -or -not $candidateVerification) {
  "Rode ``npm run release:internal``."
} elseif (-not $manualQaVerification) {
  "Rode ``npm run qa:manual:status``. Se ainda nao existir sessao manual, rode ``npm run qa:manual:new``."
} elseif ([string]$status.manualDecision -ne "GO" -and $status.p0Pending -gt 0) {
  "Rode ``npm run qa:manual:plan`` para seguir o roteiro compacto de VM/lote, ou ``npm run qa:manual:next`` para tratar item isolado."
} elseif ([string]$status.manualDecision -ne "GO" -and $status.p0FailedOrBlocked -gt 0) {
  "Resolva os P0 bloqueados/falhos em ``.release/manual-qa``. Se o bloqueio for ambiente limpo, rode ``npm run qa:manual:portable`` e execute o ZIP em VM/maquina limpa; depois copie ``HermesQA`` de volta e consolide com ``npm run qa:manual:receive -- -EvidenceDropPath <pasta-HermesQA>``."
} elseif ([string]$status.manualDecision -ne "GO") {
  "Revise ``.release/manual-qa`` e rode ``npm run qa:manual:status`` para atualizar a decisao manual."
} elseif ($status.unsignedInstallerCount -gt 0 -and -not $signingPreflight) {
  "Rode ``npm run release:signing:preflight`` e depois ``npm run build:windows:real:signed``."
} elseif ($status.unsignedInstallerCount -gt 0 -and -not $signingCertificateCandidates) {
  "Rode ``npm run release:signing:certs`` para verificar certificados locais."
} elseif ($status.unsignedInstallerCount -gt 0 -and -not $status.signingCertificateReadyToConfigure) {
  "Rode ``npm run release:signing:handoff`` e instale/importe um certificado Code Signing com chave privada antes de ``npm run build:windows:real:signed``."
} elseif ($status.unsignedInstallerCount -gt 0 -and -not $status.signingReadyToSign) {
  "Resolva os bloqueios em ``.release/signing-preflight.md`` e rode ``npm run build:windows:real:signed``."
} elseif ($status.unsignedInstallerCount -gt 0) {
  "Rode ``npm run build:windows:real:signed``."
} else {
  "Pronto para revisao final de release."
}

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# Hermes Release Status")
$markdown.Add("")
$markdown.Add("- Status: **$overallStatus**")
$markdown.Add("- QA tecnico: $(if ($status.qaTechnicalPass) { 'PASSOU' } else { 'PENDENTE/FALHOU' })")
$markdown.Add("- QA manual: $(if ($manualQaVerification) { $manualQaVerification.manualDecision } else { 'AUSENTE' }) ($manualSummary)")
$markdown.Add("- Release candidate: $candidateSummary")
$markdown.Add("- Pacote QA portatil: $(if ($status.latestManualQaPortableZip) { $status.latestManualQaPortableZip } else { 'ausente' })")
$markdown.Add("- Instaladores sem Authenticode Valid: $($status.unsignedInstallerCount)")
$markdown.Add("- Assinatura: $signingSummary")
$markdown.Add("- Certificados candidatos: $($status.signingCertificateCandidateCount)")
$markdown.Add("")
$markdown.Add("## Bloqueios")
$markdown.Add("")
if ($blockers.Count -gt 0) {
  foreach ($blocker in $blockers) {
    $markdown.Add("- $blocker")
  }
} else {
  $markdown.Add("- Nenhum bloqueio ativo.")
}
$markdown.Add("")
$markdown.Add("## Avisos")
$markdown.Add("")
if ($warnings.Count -gt 0) {
  foreach ($warning in $warnings) {
    $markdown.Add("- $warning")
  }
} else {
  $markdown.Add("- Nenhum aviso ativo.")
}
$markdown.Add("")
$markdown.Add("## Proximo passo")
$markdown.Add("")
$markdown.Add($nextStep)

$markdown | Set-Content -LiteralPath $statusMarkdownPath -Encoding UTF8

Write-Host "Hermes release status: $overallStatus"
Write-Host "QA tecnico: $(if ($status.qaTechnicalPass) { 'PASSOU' } else { 'PENDENTE/FALHOU' })"
Write-Host "QA manual: $(if ($manualQaVerification) { $manualQaVerification.manualDecision } else { 'AUSENTE' })"
Write-Host "P0 manual: $($status.p0Passed)/$($status.p0Total) aprovados"
Write-Host "Pacote QA portatil: $(if ($status.latestManualQaPortableZip) { $status.latestManualQaPortableZip } else { 'ausente' })"
Write-Host "Instaladores sem Authenticode Valid: $($status.unsignedInstallerCount)"

if ($blockers.Count -gt 0) {
  Write-Host ""
  Write-Host "Bloqueios:" -ForegroundColor Yellow
  foreach ($blocker in $blockers) {
    Write-Host "- $blocker" -ForegroundColor Yellow
  }
}

if ($warnings.Count -gt 0) {
  Write-Host ""
  Write-Host "Avisos:" -ForegroundColor DarkYellow
  foreach ($warning in $warnings) {
    Write-Host "- $warning" -ForegroundColor DarkYellow
  }
}

Write-Host ""
Write-Host "Evidencia: $statusPath"
Write-Host "Resumo: $statusMarkdownPath"
