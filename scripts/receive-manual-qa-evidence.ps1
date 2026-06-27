param(
  [string]$SessionPath,
  [string]$SessionsRoot,
  [string]$EvidenceDropPath,
  [string]$EvidencePath,
  [switch]$AllowOverwrite,
  [switch]$AllowWithoutInstallSmoke
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($SessionsRoot)) {
  $SessionsRoot = Join-Path $root ".release\manual-qa"
}

if ([string]::IsNullOrWhiteSpace($SessionPath)) {
  if (-not (Test-Path -LiteralPath $SessionsRoot -PathType Container)) {
    throw "Pasta de sessoes de QA manual nao encontrada: $SessionsRoot"
  }

  $latestSession = Get-ChildItem -LiteralPath $SessionsRoot -Directory |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $latestSession) {
    throw "Nenhuma sessao de QA manual encontrada. Execute npm run qa:manual:new primeiro."
  }

  $SessionPath = $latestSession.FullName
}

if (-not (Test-Path -LiteralPath $SessionPath -PathType Container)) {
  throw "Sessao de QA manual nao encontrada: $SessionPath"
}

function Copy-ExternalEvidenceDrop {
  param(
    [string]$DropPath,
    [string]$TargetSessionPath
  )

  if ([string]::IsNullOrWhiteSpace($DropPath)) {
    return $null
  }

  if (-not (Test-Path -LiteralPath $DropPath -PathType Container)) {
    throw "Pasta de evidencias nao encontrada: $DropPath"
  }

  $resolvedDrop = Resolve-Path -LiteralPath $DropPath
  $sourcePath = $resolvedDrop.Path
  $hermesQaPath = Join-Path $sourcePath "HermesQA"
  if (Test-Path -LiteralPath $hermesQaPath -PathType Container) {
    $sourcePath = $hermesQaPath
  }

  $manualEvidence = Get-ChildItem -LiteralPath $sourcePath -Filter "manual-qa-evidence.json" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  $smokeDirs = @(Get-ChildItem -LiteralPath $sourcePath -Directory -Filter "install-smoke-*" -ErrorAction SilentlyContinue)

  if (-not $manualEvidence -and $smokeDirs.Count -eq 0) {
    throw "Nenhuma evidencia esperada encontrada em $sourcePath. Informe a pasta HermesQA ou uma pasta com manual-qa-evidence.json/install-smoke-*."
  }

  $intakeRoot = Join-Path $TargetSessionPath "incoming-qa"
  New-Item -ItemType Directory -Force -Path $intakeRoot | Out-Null

  $sourceLabel = (Split-Path -Leaf $sourcePath)
  if ([string]::IsNullOrWhiteSpace($sourceLabel)) {
    $sourceLabel = "drop"
  }
  $safeSourceLabel = $sourceLabel -replace "[^a-zA-Z0-9_.-]", "-"
  $dropName = "drop-{0}-{1}" -f (Get-Date -Format "yyyyMMdd-HHmmss"), $safeSourceLabel
  $dropTarget = Join-Path $intakeRoot $dropName
  New-Item -ItemType Directory -Force -Path $dropTarget | Out-Null

  foreach ($smokeDir in $smokeDirs) {
    Copy-Item -LiteralPath $smokeDir.FullName -Destination (Join-Path $dropTarget $smokeDir.Name) -Recurse -Force
  }

  if ($manualEvidence) {
    Copy-Item -LiteralPath $manualEvidence.FullName -Destination (Join-Path $dropTarget $manualEvidence.Name) -Force
  }

  $dropSummary = [pscustomobject]@{
    generatedAt          = (Get-Date).ToString("o")
    sourcePath           = $sourcePath
    targetPath           = $dropTarget
    manualEvidenceCopied = [bool]$manualEvidence
    smokeDirectories     = @($smokeDirs | ForEach-Object { $_.Name })
  }
  $summaryPath = Join-Path $dropTarget "incoming-qa-drop.json"
  $dropSummary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $summaryPath -Encoding UTF8

  return $dropSummary
}

$externalDrop = Copy-ExternalEvidenceDrop -DropPath $EvidenceDropPath -TargetSessionPath $SessionPath

if ([string]::IsNullOrWhiteSpace($EvidencePath)) {
  $latestEvidence = Get-ChildItem -LiteralPath $SessionPath -Recurse -Filter "manual-qa-evidence.json" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($latestEvidence) {
    $EvidencePath = $latestEvidence.FullName
  }
}

Write-Host ""
Write-Host "== Receber evidencias do QA manual =="
Write-Host "Sessao: $SessionPath"
if ($externalDrop) {
  Write-Host "Entrada externa: $($externalDrop.sourcePath)"
  Write-Host "Copiada para: $($externalDrop.targetPath)"
}

$syncScript = Join-Path $PSScriptRoot "sync-manual-qa-automated.ps1"
Write-Host ""
Write-Host "== Sincronizando smoke/prechecks =="
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $syncScript -SessionPath $SessionPath | Out-Host

$manualEvidenceImported = $false
if (-not [string]::IsNullOrWhiteSpace($EvidencePath)) {
  Write-Host ""
  Write-Host "== Importando evidencia manual =="
  $importScript = Join-Path $PSScriptRoot "import-manual-qa-evidence.ps1"
  $importArgs = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $importScript,
    "-SessionPath", $SessionPath,
    "-EvidencePath", $EvidencePath,
    "-SkipSync"
  )
  if ($AllowOverwrite) {
    $importArgs += "-AllowOverwrite"
  }
  if ($AllowWithoutInstallSmoke) {
    $importArgs += "-AllowWithoutInstallSmoke"
  }

  & powershell.exe @importArgs | Out-Host
  $manualEvidenceImported = $true
} else {
  Write-Host ""
  Write-Host "== Evidencia manual =="
  Write-Host "manual-qa-evidence.json nao encontrado. Pulando importacao manual."
}

Write-Host ""
Write-Host "== Status do QA manual =="
$manualStatusScript = Join-Path $PSScriptRoot "verify-manual-qa-session.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $manualStatusScript -SessionPath $SessionPath -AllowPending | Out-Host

Write-Host ""
Write-Host "== Status de release =="
$releaseStatusScript = Join-Path $PSScriptRoot "release-status.ps1"
$manualQaRootForStatus = Split-Path -Parent $SessionPath
& powershell.exe `
  -NoProfile `
  -ExecutionPolicy Bypass `
  -File $releaseStatusScript `
  -ManualQaRoot $manualQaRootForStatus | Out-Host

$sessionJsonPath = Join-Path $SessionPath "manual-qa-session.json"
$session = Get-Content -LiteralPath $sessionJsonPath -Raw | ConvertFrom-Json
$verificationPath = Join-Path $SessionPath "manual-qa-verification.json"
$verification = if (Test-Path -LiteralPath $verificationPath -PathType Leaf) {
  Get-Content -LiteralPath $verificationPath -Raw | ConvertFrom-Json
} else {
  $null
}

$summary = [pscustomobject]@{
  generatedAt             = (Get-Date).ToString("o")
  sessionPath             = (Resolve-Path $SessionPath).Path
  candidateName           = $session.candidateName
  evidenceDropPath        = if ($externalDrop) { $externalDrop.sourcePath } else { $null }
  evidenceDropImportedTo  = if ($externalDrop) { $externalDrop.targetPath } else { $null }
  manualEvidencePath      = if ($manualEvidenceImported) { (Resolve-Path $EvidencePath).Path } else { $null }
  manualEvidenceImported  = $manualEvidenceImported
  p0Passed                = if ($verification) { [int]$verification.p0Passed } else { 0 }
  p0Pending               = if ($verification) { [int]$verification.p0Pending } else { 0 }
  p0FailedOrBlocked       = if ($verification) { [int]$verification.p0FailedOrBlocked } else { 0 }
  unsignedInstallerCount  = if ($verification) { [int]$verification.unsignedInstallerCount } else { 0 }
}
$receiveReportPath = Join-Path $SessionPath "manual-qa-receive-result.json"
$summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $receiveReportPath -Encoding UTF8

Write-Host ""
Write-Host "Recebimento concluido."
Write-Host "Relatorio: $receiveReportPath"
