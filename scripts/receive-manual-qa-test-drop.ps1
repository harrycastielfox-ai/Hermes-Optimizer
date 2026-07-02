param(
  [string]$DropRoot,
  [string]$OutputRoot,
  [switch]$CheckOnly,
  [switch]$AllowOverwrite,
  [switch]$AllowWithoutInstallSmoke
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $root ".release\manual-qa-test-drop"
}
if ([string]$env:HERMES_QA_ALLOW_WITHOUT_INSTALL_SMOKE -eq "1") {
  $AllowWithoutInstallSmoke = $true
}

function Read-JsonFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "JSON nao encontrado: $Path"
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

if ([string]::IsNullOrWhiteSpace($DropRoot)) {
  $latestPath = Join-Path $OutputRoot "latest-manual-qa-test-drop.json"
  $latest = Read-JsonFile -Path $latestPath
  $DropRoot = [string]$latest.dropRoot
}

if ([string]::IsNullOrWhiteSpace($DropRoot) -or -not (Test-Path -LiteralPath $DropRoot -PathType Container)) {
  throw "Drop de QA manual nao encontrado: $DropRoot"
}

$manifestPath = Join-Path $DropRoot "manual-qa-test-drop-manifest.json"
$manifest = Read-JsonFile -Path $manifestPath
$evidenceDropPath = Join-Path ([string]$manifest.extractedPackage) "HermesQA"

if (-not (Test-Path -LiteralPath $evidenceDropPath -PathType Container)) {
  if ($CheckOnly) {
    $report = [pscustomobject]@{
      generatedAt      = (Get-Date).ToString("o")
      dropRoot         = (Resolve-Path -LiteralPath $DropRoot).Path
      sessionPath      = [string]$manifest.sessionPath
      evidenceDropPath = $evidenceDropPath
      manualEvidence   = $null
      smokeDirectories = @()
      checkOnly        = $true
      exitCode         = 2
      status           = "NOT_READY"
      message          = "HermesQA ainda nao existe. Rode RODAR-QA-HERMES-NA-VM.ps1 dentro da VM primeiro."
    }
    $reportPath = Join-Path $DropRoot "manual-qa-test-drop-receive-check.json"
    $report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportPath -Encoding UTF8

    Write-Host "Drop ainda nao esta pronto para recebimento."
    Write-Host "HermesQA: $evidenceDropPath"
    Write-Host $report.message
    Write-Host "Relatorio: $reportPath"
    exit 2
  }

  throw "HermesQA ainda nao existe no drop: $evidenceDropPath. Rode RODAR-QA-HERMES-NA-VM.ps1 dentro da VM primeiro."
}

$manualEvidence = Get-ChildItem -LiteralPath $evidenceDropPath -Filter "manual-qa-evidence.json" -File -ErrorAction SilentlyContinue |
  Select-Object -First 1
$smokeDirs = @(Get-ChildItem -LiteralPath $evidenceDropPath -Directory -Filter "install-smoke-*" -ErrorAction SilentlyContinue)

if (-not $manualEvidence -and $smokeDirs.Count -eq 0) {
  if ($CheckOnly) {
    $report = [pscustomobject]@{
      generatedAt      = (Get-Date).ToString("o")
      dropRoot         = (Resolve-Path -LiteralPath $DropRoot).Path
      sessionPath      = [string]$manifest.sessionPath
      evidenceDropPath = $evidenceDropPath
      manualEvidence   = $null
      smokeDirectories = @()
      checkOnly        = $true
      exitCode         = 2
      status           = "NOT_READY"
      message          = "HermesQA ainda nao tem evidencias. Rode RODAR-QA-HERMES-NA-VM.ps1 dentro da VM primeiro."
    }
    $reportPath = Join-Path $DropRoot "manual-qa-test-drop-receive-check.json"
    $report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportPath -Encoding UTF8

    Write-Host "Drop ainda nao esta pronto para recebimento."
    Write-Host "HermesQA: $evidenceDropPath"
    Write-Host "manual-qa-evidence.json: ausente"
    Write-Host "install-smoke dirs: 0"
    Write-Host $report.message
    Write-Host "Relatorio: $reportPath"
    exit 2
  }

  throw "HermesQA ainda nao tem evidencias no drop: $evidenceDropPath. Rode RODAR-QA-HERMES-NA-VM.ps1 dentro da VM primeiro."
}

$report = [pscustomobject]@{
  generatedAt      = (Get-Date).ToString("o")
  dropRoot         = (Resolve-Path -LiteralPath $DropRoot).Path
  sessionPath      = [string]$manifest.sessionPath
  evidenceDropPath = $evidenceDropPath
  manualEvidence   = if ($manualEvidence) { $manualEvidence.FullName } else { $null }
  smokeDirectories = @($smokeDirs | ForEach-Object { $_.FullName })
  checkOnly        = [bool]$CheckOnly
  exitCode         = 0
  status           = "READY"
}

if ($CheckOnly) {
  $reportPath = Join-Path $DropRoot "manual-qa-test-drop-receive-check.json"
  $report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportPath -Encoding UTF8

  Write-Host "Drop pronto para recebimento."
  Write-Host "Drop: $DropRoot"
  Write-Host "HermesQA: $evidenceDropPath"
  Write-Host "manual-qa-evidence.json: $(if ($manualEvidence) { $manualEvidence.FullName } else { 'ausente' })"
  Write-Host "install-smoke dirs: $($smokeDirs.Count)"
  Write-Host "Relatorio: $reportPath"
  exit 0
}

$receiveScript = Join-Path $PSScriptRoot "receive-manual-qa-evidence.ps1"
$args = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $receiveScript,
  "-SessionPath", ([string]$manifest.sessionPath),
  "-EvidenceDropPath", $evidenceDropPath
)

if ($AllowOverwrite) {
  $args += "-AllowOverwrite"
}
if ($AllowWithoutInstallSmoke) {
  $args += "-AllowWithoutInstallSmoke"
}

& powershell.exe @args
$receiveExitCode = $LASTEXITCODE

$report.exitCode = $receiveExitCode
$report.status = if ($receiveExitCode -eq 0) { "OK" } else { "FAILED" }

$reportPath = Join-Path $DropRoot "manual-qa-test-drop-receive.json"
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportPath -Encoding UTF8

Write-Host ""
Write-Host "Recebimento do drop: $(if ($receiveExitCode -eq 0) { 'OK' } else { 'FAILED' })"
Write-Host "Exit code: $receiveExitCode"
Write-Host "Relatorio: $reportPath"
exit $receiveExitCode
