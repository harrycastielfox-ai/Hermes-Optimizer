param(
  [string]$DropRoot,
  [string]$OutputRoot,
  [string]$EvidenceDropPath,
  [switch]$CheckOnly,
  [switch]$AllowOverwrite,
  [switch]$AllowWithoutInstallSmoke
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $root ".release\beta-test-drop"
}

function Read-JsonFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "JSON nao encontrado: $Path"
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Find-EvidenceRoot {
  param(
    [object]$Manifest,
    [string]$OverridePath
  )

  $candidates = New-Object System.Collections.Generic.List[string]
  if (-not [string]::IsNullOrWhiteSpace($OverridePath)) {
    $candidates.Add($OverridePath)
  }

  $extracted = [string]$Manifest.extractedPackage
  if (-not [string]::IsNullOrWhiteSpace($extracted)) {
    $candidates.Add((Join-Path $extracted "HermesQA"))
    $candidates.Add($extracted)
  }

  $candidates.Add("C:\Temp\HermesQA")
  $candidates.Add("C:\Temp")

  foreach ($candidate in $candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate) -or -not (Test-Path -LiteralPath $candidate -PathType Container)) {
      continue
    }

    $sourcePath = (Resolve-Path -LiteralPath $candidate).Path
    $hermesQaPath = Join-Path $sourcePath "HermesQA"
    if (Test-Path -LiteralPath $hermesQaPath -PathType Container) {
      $sourcePath = $hermesQaPath
    }

    $manualEvidence = Get-ChildItem -LiteralPath $sourcePath -Filter "manual-qa-evidence.json" -File -ErrorAction SilentlyContinue |
      Select-Object -First 1
    $smokeDirs = @(Get-ChildItem -LiteralPath $sourcePath -Directory -Filter "install-smoke-*" -ErrorAction SilentlyContinue)

    if ($manualEvidence -or $smokeDirs.Count -gt 0) {
      return [pscustomobject]@{
        sourcePath = $sourcePath
        manualEvidence = if ($manualEvidence) { $manualEvidence.FullName } else { $null }
        smokeDirectories = @($smokeDirs | ForEach-Object { $_.FullName })
      }
    }
  }

  return $null
}

if ([string]::IsNullOrWhiteSpace($DropRoot)) {
  $latestPath = Join-Path $OutputRoot "latest-beta-test-drop.json"
  $latest = Read-JsonFile -Path $latestPath
  $DropRoot = [string]$latest.dropRoot
}

if ([string]::IsNullOrWhiteSpace($DropRoot) -or -not (Test-Path -LiteralPath $DropRoot -PathType Container)) {
  throw "Drop beta nao encontrado: $DropRoot. Rode npm run release:beta:drop primeiro."
}

$manifestPath = Join-Path $DropRoot "beta-test-drop-manifest.json"
$manifest = Read-JsonFile -Path $manifestPath

$verifyDropScript = Join-Path $PSScriptRoot "verify-beta-test-drop.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verifyDropScript -DropRoot $DropRoot -OutputRoot $OutputRoot | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Drop beta atual falhou na verificacao. Rode npm run release:beta:drop para gerar outro."
}

$evidence = Find-EvidenceRoot -Manifest $manifest -OverridePath $EvidenceDropPath
$report = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  dropRoot = (Resolve-Path -LiteralPath $DropRoot).Path
  betaPackage = [string]$manifest.betaPackage
  evidenceDropPath = if ($evidence) { $evidence.sourcePath } else { $null }
  manualEvidence = if ($evidence) { $evidence.manualEvidence } else { $null }
  smokeDirectories = if ($evidence) { @($evidence.smokeDirectories) } else { @() }
  checkOnly = [bool]$CheckOnly
  status = if ($evidence) { "READY" } else { "NOT_READY" }
  exitCode = if ($evidence) { 0 } else { 2 }
  message = if ($evidence) {
    "HermesQA encontrado e pronto para recebimento."
  } else {
    "HermesQA ainda nao encontrado. Rode RODAR-DENTRO-DA-VM.ps1 dentro da VM/maquina limpa primeiro."
  }
}

$reportPath = Join-Path $DropRoot "beta-test-drop-receive-check.json"
if (-not $CheckOnly -and $evidence) {
  $reportPath = Join-Path $DropRoot "beta-test-drop-receive.json"
}
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportPath -Encoding UTF8

if (-not $evidence) {
  Write-Host "Drop beta ainda nao esta pronto para recebimento."
  Write-Host "Drop: $DropRoot"
  Write-Host $report.message
  Write-Host "Locais verificados:"
  Write-Host "- $([string]$manifest.extractedPackage)\HermesQA"
  Write-Host "- C:\Temp\HermesQA"
  Write-Host "Relatorio: $reportPath"
  exit 2
}

if ($CheckOnly) {
  Write-Host "Drop beta pronto para recebimento."
  Write-Host "HermesQA: $($evidence.sourcePath)"
  Write-Host "manual-qa-evidence.json: $(if ($evidence.manualEvidence) { $evidence.manualEvidence } else { 'ausente' })"
  Write-Host "install-smoke dirs: $(@($evidence.smokeDirectories).Count)"
  Write-Host "Relatorio: $reportPath"
  exit 0
}

$receiveScript = Join-Path $PSScriptRoot "receive-manual-qa-evidence.ps1"
$args = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $receiveScript,
  "-EvidenceDropPath", ([string]$evidence.sourcePath)
)
if ($AllowOverwrite) {
  $args += "-AllowOverwrite"
}
if ($AllowWithoutInstallSmoke) {
  $args += "-AllowWithoutInstallSmoke"
}

& powershell.exe @args
$receiveExitCode = $LASTEXITCODE

$report.status = if ($receiveExitCode -eq 0) { "OK" } else { "FAILED" }
$report.exitCode = $receiveExitCode
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportPath -Encoding UTF8

Write-Host ""
Write-Host "Recebimento do beta drop: $(if ($receiveExitCode -eq 0) { 'OK' } else { 'FAILED' })"
Write-Host "Exit code: $receiveExitCode"
Write-Host "Relatorio: $reportPath"
exit $receiveExitCode
