param(
  [string]$SessionPath,
  [string]$SessionsRoot,
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
