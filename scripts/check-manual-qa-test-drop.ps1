param(
  [string]$DropRoot,
  [string]$OutputRoot
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $root ".release\manual-qa-test-drop"
}

function Read-JsonFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "JSON nao encontrado: $Path"
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Add-Finding {
  param(
    [System.Collections.Generic.List[string]]$List,
    [string]$Message
  )

  $List.Add($Message)
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
$failures = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$checks = New-Object System.Collections.Generic.List[string]

$requiredFiles = @(
  @{ path = [string]$manifest.qaPortableZip; label = "ZIP QA portatil" },
  @{ path = "$([string]$manifest.qaPortableZip).sha256"; label = "SHA256 do ZIP QA" },
  @{ path = [string]$manifest.vmRunnerPath; label = "Runner da VM" },
  @{ path = [string]$manifest.sandboxPath; label = "Windows Sandbox" },
  @{ path = [string]$manifest.readmePath; label = "README do drop" },
  @{ path = Join-Path ([string]$manifest.extractedPackage) "VERIFY-QA-PACKAGE.ps1"; label = "Verificador extraido" },
  @{ path = Join-Path ([string]$manifest.extractedPackage) "RUN-INSTALL-SMOKE.ps1"; label = "Smoke extraido" },
  @{ path = Join-Path ([string]$manifest.extractedPackage) "RUN-MANUAL-QA-EVIDENCE.ps1"; label = "Coletor manual extraido" },
  @{ path = Join-Path ([string]$manifest.extractedPackage) "RUN-MANUAL-QA-QUICK-PASS.ps1"; label = "Coletor rapido extraido" },
  @{ path = Join-Path $DropRoot "evidencias\manual-qa-action-plan.md"; label = "Plano de QA" },
  @{ path = Join-Path $DropRoot "evidencias\manual-qa-summary.md"; label = "Resumo QA" },
  @{ path = Join-Path $DropRoot "evidencias\manual-qa-package-doctor.md"; label = "Doctor QA" }
)

foreach ($file in $requiredFiles) {
  if (Test-Path -LiteralPath $file.path -PathType Leaf) {
    Add-Finding -List $checks -Message "$($file.label) encontrado."
  } else {
    Add-Finding -List $failures -Message "$($file.label) ausente: $($file.path)"
  }
}

if (Test-Path -LiteralPath ([string]$manifest.qaPortableZip) -PathType Leaf) {
  $actualHash = (Get-FileHash -LiteralPath ([string]$manifest.qaPortableZip) -Algorithm SHA256).Hash
  if ($actualHash -ne [string]$manifest.qaPortableZipSha256) {
    Add-Finding -List $failures -Message "SHA256 do ZIP diverge do manifesto."
  } else {
    Add-Finding -List $checks -Message "SHA256 do ZIP confere."
  }
}

$readme = if (Test-Path -LiteralPath ([string]$manifest.readmePath) -PathType Leaf) {
  Get-Content -LiteralPath ([string]$manifest.readmePath) -Raw
} else {
  ""
}

foreach ($requiredText in @("RODAR-QA-HERMES-NA-VM.ps1", "RUN-MANUAL-QA-QUICK-PASS.ps1", "qa:manual:drop:receive", "qa:manual:receive", "modo teste", "Code Signing")) {
  if ($readme -notmatch [regex]::Escape($requiredText)) {
    Add-Finding -List $failures -Message "README do drop nao contem: $requiredText"
  }
}

$runner = if (Test-Path -LiteralPath ([string]$manifest.vmRunnerPath) -PathType Leaf) {
  Get-Content -LiteralPath ([string]$manifest.vmRunnerPath) -Raw
} else {
  ""
}

foreach ($requiredText in @("QuickPassAll", "VERIFY-QA-PACKAGE.ps1", "RUN-INSTALL-SMOKE.ps1", "RUN-MANUAL-QA-EVIDENCE.ps1", "RUN-MANUAL-QA-QUICK-PASS.ps1")) {
  if ($runner -notmatch [regex]::Escape($requiredText)) {
    Add-Finding -List $failures -Message "Runner da VM nao contem: $requiredText"
  }
}

$sandbox = if (Test-Path -LiteralPath ([string]$manifest.sandboxPath) -PathType Leaf) {
  Get-Content -LiteralPath ([string]$manifest.sandboxPath) -Raw
} else {
  ""
}

foreach ($requiredText in @("<MappedFolder>", "HermesManualQA", "LEIA-ME-QA-MANUAL.md")) {
  if ($sandbox -notmatch [regex]::Escape($requiredText)) {
    Add-Finding -List $failures -Message "Arquivo .wsb nao contem: $requiredText"
  }
}

$status = if ($failures.Count -gt 0) { "FAILED" } else { "OK" }
$report = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  status = $status
  dropRoot = (Resolve-Path -LiteralPath $DropRoot).Path
  manifestPath = (Resolve-Path -LiteralPath $manifestPath).Path
  qaPortableZip = [string]$manifest.qaPortableZip
  qaPortableZipSha256 = [string]$manifest.qaPortableZipSha256
  receiveCommand = [string]$manifest.receiveCommand
  autoReceivePath = Join-Path ([string]$manifest.extractedPackage) "HermesQA"
  checks = @($checks)
  warnings = @($warnings)
  failures = @($failures)
}

$jsonPath = Join-Path $DropRoot "manual-qa-test-drop-verification.json"
$mdPath = Join-Path $DropRoot "manual-qa-test-drop-verification.md"
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# Hermes Manual QA Test Drop Verification")
$markdown.Add("")
$markdown.Add("- Status: **$status**")
$markdown.Add("- Drop: $($report.dropRoot)")
$markdown.Add("- ZIP: $($report.qaPortableZip)")
$markdown.Add("- SHA256: $($report.qaPortableZipSha256)")
$markdown.Add("- Recebimento: $($report.receiveCommand)")
$markdown.Add("")
$markdown.Add("## Falhas")
$markdown.Add("")
if ($failures.Count -gt 0) {
  foreach ($failure in $failures) {
    $markdown.Add("- $failure")
  }
} else {
  $markdown.Add("- Nenhuma falha encontrada.")
}
$markdown.Add("")
$markdown.Add("## Checks")
$markdown.Add("")
foreach ($check in $checks) {
  $markdown.Add("- $check")
}
$markdown | Set-Content -LiteralPath $mdPath -Encoding UTF8

Write-Host "Manual QA test drop: $status"
Write-Host "Drop: $DropRoot"
Write-Host "Relatorio: $jsonPath"
Write-Host "Resumo: $mdPath"

if ($failures.Count -gt 0) {
  exit 1
}
