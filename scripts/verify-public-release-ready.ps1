param(
  [string]$ReleaseStatusPath,
  [string]$CandidatePath,
  [switch]$RefreshStatus
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($ReleaseStatusPath)) {
  $ReleaseStatusPath = Join-Path $root ".release\release-status.json"
}

function Read-JsonFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "JSON nao encontrado: $Path"
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
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

if ($RefreshStatus) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "release-status.ps1")
  if ($LASTEXITCODE -ne 0) {
    throw "Nao foi possivel atualizar release-status."
  }
}

$status = Read-JsonFile -Path $ReleaseStatusPath
if ([string]::IsNullOrWhiteSpace($CandidatePath)) {
  $CandidatePath = [string]$status.latestCandidate
}

$failures = New-Object System.Collections.Generic.List[string]
$checks = New-Object System.Collections.Generic.List[string]

if ([string]$status.overallStatus -ne "GO") {
  $failures.Add("Release status esta $($status.overallStatus), esperado GO.")
} else {
  $checks.Add("Release status GO.")
}

if (-not [bool]$status.qaTechnicalPass) {
  $failures.Add("QA tecnico nao passou.")
} else {
  $checks.Add("QA tecnico passou.")
}

if ([string]$status.manualDecision -ne "GO" -or [string]$status.manualPublicDecision -ne "GO") {
  $failures.Add("QA manual/publico nao esta GO. Manual=$($status.manualDecision); Publico=$($status.manualPublicDecision).")
} else {
  $checks.Add("QA manual e publico GO.")
}

$qaP0Passed = if ($status.PSObject.Properties.Name -contains "qaP0Passed") { [int]$status.qaP0Passed } else { [int]$status.p0Passed }
$qaP0Total = if ($status.PSObject.Properties.Name -contains "qaP0Total") { [int]$status.qaP0Total } else { [int]$status.p0Total }

if ($qaP0Passed -lt $qaP0Total) {
  $failures.Add("P0 funcionais incompletos: $qaP0Passed/$qaP0Total.")
} else {
  $checks.Add("Todos os P0 funcionais passaram.")
}

if ([int]$status.unsignedInstallerCount -ne 0) {
  $failures.Add("Ainda existem $($status.unsignedInstallerCount) instalador(es) sem Authenticode Valid.")
} else {
  $checks.Add("Nenhum instalador sem Authenticode Valid.")
}

if (-not [bool]$status.signingAllInstallersSigned) {
  $failures.Add("signingAllInstallersSigned=false.")
} else {
  $checks.Add("Todos instaladores assinados segundo preflight.")
}

if (-not [bool]$status.signingCertificateReadyToConfigure) {
  $failures.Add("Certificado Code Signing ainda nao esta pronto/configurado.")
} else {
  $checks.Add("Certificado Code Signing pronto.")
}

if ([string]::IsNullOrWhiteSpace($CandidatePath) -or -not (Test-Path -LiteralPath $CandidatePath -PathType Container)) {
  $failures.Add("Release candidate nao encontrado: $CandidatePath")
} else {
  $manifestPath = Join-Path $CandidatePath "release-candidate-manifest.json"
  $verificationPath = Join-Path $CandidatePath "release-candidate-verification.json"

  if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    $failures.Add("Manifesto do release candidate ausente: $manifestPath")
  } else {
    $manifest = Read-JsonFile -Path $manifestPath
    if ([string]$manifest.publicDecision -ne "GO") {
      $failures.Add("Manifesto do release candidate esta $($manifest.publicDecision), esperado GO.")
    } else {
      $checks.Add("Manifesto do release candidate GO.")
    }

    foreach ($installer in @($manifest.installers)) {
      $installerPath = Join-Path $CandidatePath ([string]$installer.relativePath)
      if (-not (Test-Path -LiteralPath $installerPath -PathType Leaf)) {
        $failures.Add("Instalador do RC ausente: $($installer.relativePath)")
        continue
      }

      $signature = Get-AuthenticodeSignature -LiteralPath $installerPath
      if ([string]$signature.Status -ne "Valid") {
        $failures.Add("Instalador $($installer.kind) do RC esta com Authenticode $($signature.Status).")
      } else {
        $checks.Add("Instalador $($installer.kind) do RC esta Authenticode Valid.")
      }
    }
  }

  if (-not (Test-Path -LiteralPath $verificationPath -PathType Leaf)) {
    $failures.Add("Verificacao do release candidate ausente: $verificationPath")
  } else {
    $verification = Read-JsonFile -Path $verificationPath
    if ([string]$verification.publicDecision -ne "GO") {
      $failures.Add("Verificacao do release candidate esta $($verification.publicDecision), esperado GO.")
    }
    if (@($verification.failures).Count -gt 0) {
      $failures.Add("Verificacao do release candidate tem falhas.")
    }
  }
}

$report = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  status = if ($failures.Count -eq 0) { "GO" } else { "NO-GO" }
  releaseStatusPath = if (Test-Path -LiteralPath $ReleaseStatusPath -PathType Leaf) { (Resolve-Path -LiteralPath $ReleaseStatusPath).Path } else { $ReleaseStatusPath }
  candidatePath = $CandidatePath
  checks = @($checks)
  failures = @($failures)
}

$outputRoot = Join-Path $root ".release"
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
$jsonPath = Join-Path $outputRoot "public-release-ready.json"
$mdPath = Join-Path $outputRoot "public-release-ready.md"
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# Hermes Public Release Ready")
$markdown.Add("")
$markdown.Add("- Status: **$($report.status)**")
$markdown.Add("- Release status: ``$($report.releaseStatusPath)``")
$markdown.Add("- Candidate: ``$($report.candidatePath)``")
$markdown.Add("")
$markdown.Add("## Falhas")
$markdown.Add("")
if ($failures.Count -gt 0) {
  foreach ($failure in $failures) {
    $markdown.Add("- $failure")
  }
} else {
  $markdown.Add("- Nenhuma falha.")
}
$markdown.Add("")
$markdown.Add("## Checks")
$markdown.Add("")
if ($checks.Count -gt 0) {
  foreach ($check in $checks) {
    $markdown.Add("- $check")
  }
} else {
  $markdown.Add("- Nenhum check concluido.")
}
$markdown | Set-Content -LiteralPath $mdPath -Encoding UTF8

Write-Host "Hermes public release ready: $($report.status)"
Write-Host "Relatorio: $jsonPath"
Write-Host "Resumo: $mdPath"

if ($failures.Count -gt 0) {
  Write-Host ""
  Write-Host "Bloqueios:" -ForegroundColor Yellow
  foreach ($failure in $failures) {
    Write-Host "- $failure" -ForegroundColor Yellow
  }
  exit 1
}
