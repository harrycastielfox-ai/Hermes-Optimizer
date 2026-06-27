param(
  [string]$CandidatePath,
  [string]$CandidatesRoot
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($CandidatesRoot)) {
  $CandidatesRoot = Join-Path $root ".release\candidates"
}

if ([string]::IsNullOrWhiteSpace($CandidatePath)) {
  if (-not (Test-Path -LiteralPath $CandidatesRoot -PathType Container)) {
    throw "Pasta de candidates nao encontrada: $CandidatesRoot"
  }

  $latestCandidate = Get-ChildItem -LiteralPath $CandidatesRoot -Directory |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $latestCandidate) {
    throw "Nenhum release candidate encontrado em $CandidatesRoot"
  }

  $CandidatePath = $latestCandidate.FullName
}

if (-not (Test-Path -LiteralPath $CandidatePath -PathType Container)) {
  throw "Release candidate nao encontrado: $CandidatePath"
}

$manifestPath = Join-Path $CandidatePath "release-candidate-manifest.json"
$qaPath = Join-Path $CandidatePath "qa-latest.json"
$readmePath = Join-Path $CandidatePath "LEIA-ME-TESTE.md"

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw "Manifesto ausente: $manifestPath"
}
if (-not (Test-Path -LiteralPath $qaPath -PathType Leaf)) {
  throw "Relatorio QA ausente: $qaPath"
}
if (-not (Test-Path -LiteralPath $readmePath -PathType Leaf)) {
  throw "LEIA-ME de teste ausente: $readmePath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$qaReport = Get-Content -LiteralPath $qaPath -Raw | ConvertFrom-Json
$failures = New-Object System.Collections.Generic.List[string]
$installerReports = @()

foreach ($installer in @($manifest.installers)) {
  $installerPath = Join-Path $CandidatePath ([string]$installer.relativePath)

  if (-not (Test-Path -LiteralPath $installerPath -PathType Leaf)) {
    $failures.Add("Instalador ausente: $($installer.relativePath)")
    continue
  }

  $file = Get-Item -LiteralPath $installerPath
  $sha256 = (Get-FileHash -LiteralPath $installerPath -Algorithm SHA256).Hash
  $signature = Get-AuthenticodeSignature -LiteralPath $installerPath
  $signatureStatus = [string]$signature.Status
  $signerSubject = if ($signature.SignerCertificate) { $signature.SignerCertificate.Subject } else { $null }

  if ($file.Length -ne [int64]$installer.lengthBytes) {
    $failures.Add("Tamanho divergente em $($installer.fileName): manifesto=$($installer.lengthBytes), atual=$($file.Length)")
  }
  if ($sha256 -ne [string]$installer.sha256) {
    $failures.Add("SHA256 divergente em $($installer.fileName)")
  }
  if ($signatureStatus -ne [string]$installer.signatureStatus) {
    $failures.Add("Authenticode divergente em $($installer.fileName): manifesto=$($installer.signatureStatus), atual=$signatureStatus")
  }

  $installerReports += [pscustomobject]@{
    kind            = $installer.kind
    fileName        = $installer.fileName
    lengthBytes     = $file.Length
    sha256          = $sha256
    signatureStatus = $signatureStatus
    signerSubject   = $signerSubject
  }
}

$qaInstallerCount = @($qaReport.installers).Count
if ($qaInstallerCount -ne @($manifest.installers).Count) {
  $failures.Add("Quantidade de instaladores no QA ($qaInstallerCount) difere do manifesto ($(@($manifest.installers).Count)).")
}

$technicalPass = [bool]$qaReport.technicalPass
$releaseReady = [bool]$qaReport.releaseReady
$expectedDecision = if ($releaseReady) { "GO" } else { "NO-GO" }
if ([string]$manifest.publicDecision -ne $expectedDecision) {
  $failures.Add("Decisao publica divergente: manifesto=$($manifest.publicDecision), esperado=$expectedDecision")
}

$verification = [pscustomobject]@{
  generatedAt    = (Get-Date).ToString("o")
  candidatePath  = (Resolve-Path $CandidatePath).Path
  candidateName  = $manifest.candidateName
  version        = $manifest.version
  technicalPass  = $technicalPass
  releaseReady   = $releaseReady
  publicDecision = $expectedDecision
  installers     = $installerReports
  failures       = @($failures)
}

$verificationPath = Join-Path $CandidatePath "release-candidate-verification.json"
$verification | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $verificationPath -Encoding UTF8

Write-Host "Release candidate verificado: $CandidatePath"
Write-Host "Decisao publica: $expectedDecision"
foreach ($installer in $installerReports) {
  Write-Host ("- {0}: {1} | {2}" -f $installer.kind.ToUpperInvariant(), $installer.fileName, $installer.signatureStatus)
}

if ($failures.Count -gt 0) {
  Write-Host ""
  Write-Host "Falhas:" -ForegroundColor Red
  foreach ($failure in $failures) {
    Write-Host "- $failure" -ForegroundColor Red
  }
  exit 1
}

Write-Host "Integridade do pacote RC: OK" -ForegroundColor Green
