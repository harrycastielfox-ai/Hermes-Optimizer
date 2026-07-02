param(
  [string]$SourceSessionPath,
  [string]$CandidatePath,
  [string]$SessionsRoot,
  [string]$Tester = $env:USERNAME
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($SessionsRoot)) {
  $SessionsRoot = Join-Path $root ".release\manual-qa"
}
if ([string]::IsNullOrWhiteSpace($CandidatePath)) {
  $candidatesRoot = Join-Path $root ".release\candidates"
  $latestCandidate = Get-ChildItem -LiteralPath $candidatesRoot -Directory -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (-not $latestCandidate) {
    throw "Nenhum release candidate encontrado em $candidatesRoot."
  }
  $CandidatePath = $latestCandidate.FullName
}
if ([string]::IsNullOrWhiteSpace($SourceSessionPath)) {
  $activePath = Join-Path $SessionsRoot "active-manual-qa-session.json"
  if (Test-Path -LiteralPath $activePath -PathType Leaf) {
    $active = Get-Content -LiteralPath $activePath -Raw | ConvertFrom-Json
    $SourceSessionPath = [string]$active.sessionPath
  }
  if ([string]::IsNullOrWhiteSpace($SourceSessionPath)) {
    $SourceSessionPath = (Get-ChildItem -LiteralPath $SessionsRoot -Directory |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1).FullName
  }
}

if (-not (Test-Path -LiteralPath $SourceSessionPath -PathType Container)) {
  throw "Sessao de QA fonte nao encontrada: $SourceSessionPath"
}
if (-not (Test-Path -LiteralPath $CandidatePath -PathType Container)) {
  throw "Release candidate alvo nao encontrado: $CandidatePath"
}

$sourceSessionJsonPath = Join-Path $SourceSessionPath "manual-qa-session.json"
$targetManifestPath = Join-Path $CandidatePath "release-candidate-manifest.json"
if (-not (Test-Path -LiteralPath $sourceSessionJsonPath -PathType Leaf)) {
  throw "manual-qa-session.json ausente na sessao fonte."
}
if (-not (Test-Path -LiteralPath $targetManifestPath -PathType Leaf)) {
  throw "release-candidate-manifest.json ausente no RC alvo."
}

$source = Get-Content -LiteralPath $sourceSessionJsonPath -Raw | ConvertFrom-Json
$sourceOriginalCandidateName = [string]$source.candidateName
$targetManifest = Get-Content -LiteralPath $targetManifestPath -Raw | ConvertFrom-Json

if ($sourceOriginalCandidateName -eq [string]$targetManifest.candidateName) {
  Write-Host "QA manual ja esta alinhado ao RC atual: $($targetManifest.candidateName)"
  exit 0
}

function Convert-InstallerMap {
  param([object[]]$Installers)

  $map = @{}
  foreach ($installer in @($Installers)) {
    $kind = [string]$installer.kind
    if (-not [string]::IsNullOrWhiteSpace($kind)) {
      $map[$kind] = [pscustomobject]@{
        sha256 = [string]$installer.sha256
        lengthBytes = [int64]$installer.lengthBytes
        fileName = [string]$installer.fileName
      }
    }
  }
  return $map
}

$sourceInstallers = Convert-InstallerMap -Installers @($source.installers)
$targetInstallers = Convert-InstallerMap -Installers @($targetManifest.installers)
$mismatches = New-Object System.Collections.Generic.List[string]

foreach ($kind in @($targetInstallers.Keys)) {
  if (-not $sourceInstallers.ContainsKey($kind)) {
    $mismatches.Add("Instalador $kind nao existe na sessao fonte.")
    continue
  }
  if ($sourceInstallers[$kind].sha256 -ne $targetInstallers[$kind].sha256) {
    $mismatches.Add("SHA256 divergente em $kind. Fonte=$($sourceInstallers[$kind].sha256); Alvo=$($targetInstallers[$kind].sha256)")
  }
}
foreach ($kind in @($sourceInstallers.Keys)) {
  if (-not $targetInstallers.ContainsKey($kind)) {
    $mismatches.Add("Instalador $kind existe na fonte, mas nao no RC alvo.")
  }
}
if ($mismatches.Count -gt 0) {
  Write-Host "QA nao migrado: instaladores diferentes." -ForegroundColor Yellow
  foreach ($mismatch in $mismatches) {
    Write-Host "- $mismatch" -ForegroundColor Yellow
  }
  exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$targetSessionName = "manual-qa-$($targetManifest.version)-$timestamp-aligned"
$targetSessionPath = Join-Path $SessionsRoot $targetSessionName
New-Item -ItemType Directory -Force -Path $targetSessionPath | Out-Null

$source.generatedAt = (Get-Date).ToString("o")
$source.updatedAt = (Get-Date).ToString("o")
$source.tester = $Tester
$source.status = "in-progress"
$source.candidatePath = (Resolve-Path $CandidatePath).Path
$source.candidateName = [string]$targetManifest.candidateName
$source.version = [string]$targetManifest.version
$source.publicDecision = [string]$targetManifest.publicDecision
$source.installers = @($targetManifest.installers)

$alignmentEvidence = "QA migrado automaticamente de $(Split-Path -Leaf $SourceSessionPath) para $($targetManifest.candidateName): instaladores NSIS/MSI com SHA256 identico."
foreach ($item in @($source.items)) {
  $notes = [string]$item.notes
  if (-not $notes.Contains($alignmentEvidence)) {
    $item.notes = if ([string]::IsNullOrWhiteSpace($notes)) { $alignmentEvidence } else { "$notes $alignmentEvidence" }
  }
}

$newSessionJsonPath = Join-Path $targetSessionPath "manual-qa-session.json"
$source | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $newSessionJsonPath -Encoding UTF8

$alignment = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  sourceSessionPath = (Resolve-Path $SourceSessionPath).Path
  sourceCandidateName = $sourceOriginalCandidateName
  targetSessionPath = (Resolve-Path $targetSessionPath).Path
  targetCandidateName = [string]$targetManifest.candidateName
  version = [string]$targetManifest.version
  migratedBecause = "installer-sha256-identical"
  installers = @($targetManifest.installers | ForEach-Object {
    [pscustomobject]@{
      kind = [string]$_.kind
      fileName = [string]$_.fileName
      sha256 = [string]$_.sha256
      signatureStatus = [string]$_.signatureStatus
    }
  })
}
$alignmentJsonPath = Join-Path $targetSessionPath "manual-qa-alignment.json"
$alignment | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $alignmentJsonPath -Encoding UTF8

@"
# Hermes Manual QA Alignment

Fonte: `$($alignment.sourceCandidateName)`
Alvo: `$($alignment.targetCandidateName)`

Motivo: instaladores NSIS/MSI possuem SHA256 identico ao RC ja testado.

Esta migracao evita repetir QA de instalacao quando o pacote binario nao mudou. Se qualquer SHA256 divergir, o script bloqueia a migracao.
"@ | Set-Content -LiteralPath (Join-Path $targetSessionPath "manual-qa-alignment.md") -Encoding UTF8

$verifyScript = Join-Path $PSScriptRoot "verify-manual-qa-session.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verifyScript -SessionPath $targetSessionPath -AllowPending
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$selectScript = Join-Path $PSScriptRoot "select-manual-qa-session.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $selectScript -SessionPath $targetSessionPath
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host "QA manual alinhado ao RC atual."
Write-Host "- Fonte: $SourceSessionPath"
Write-Host "- Alvo: $targetSessionPath"
Write-Host "- Evidencia: $alignmentJsonPath"
