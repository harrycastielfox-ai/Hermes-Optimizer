param(
  [string]$DropRoot,
  [string]$OutputRoot
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseRoot = Join-Path $root ".release"
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $releaseRoot "beta-test-drop"
}

function Read-JsonFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "JSON nao encontrado: $Path"
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Add-Message {
  param(
    [System.Collections.Generic.List[string]]$List,
    [string]$Message
  )

  $List.Add($Message)
}

function Test-RequiredFile {
  param(
    [System.Collections.Generic.List[string]]$Checks,
    [System.Collections.Generic.List[string]]$Failures,
    [string]$Path,
    [string]$Label
  )

  if (Test-Path -LiteralPath $Path -PathType Leaf) {
    Add-Message -List $Checks -Message "$Label encontrado."
    return $true
  }

  Add-Message -List $Failures -Message "$Label ausente: $Path"
  return $false
}

function Test-RequiredDirectory {
  param(
    [System.Collections.Generic.List[string]]$Checks,
    [System.Collections.Generic.List[string]]$Failures,
    [string]$Path,
    [string]$Label
  )

  if (Test-Path -LiteralPath $Path -PathType Container) {
    Add-Message -List $Checks -Message "$Label encontrado."
    return $true
  }

  Add-Message -List $Failures -Message "$Label ausente: $Path"
  return $false
}

$failures = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$checks = New-Object System.Collections.Generic.List[string]

$latestDropPath = Join-Path $OutputRoot "latest-beta-test-drop.json"
$latestBetaReadyPath = Join-Path $releaseRoot "beta-handoff\latest-beta-ready.json"

$manifest = $null
if ([string]::IsNullOrWhiteSpace($DropRoot)) {
  if (-not (Test-Path -LiteralPath $latestDropPath -PathType Leaf)) {
    throw "Ponteiro latest-beta-test-drop.json ausente. Rode npm run release:beta:drop."
  }

  $manifest = Read-JsonFile -Path $latestDropPath
  $DropRoot = [string]$manifest.dropRoot
} else {
  $manifestPath = Join-Path $DropRoot "beta-test-drop-manifest.json"
  $manifest = Read-JsonFile -Path $manifestPath
}

$manifestPath = Join-Path $DropRoot "beta-test-drop-manifest.json"
if (Test-RequiredFile -Checks $checks -Failures $failures -Path $manifestPath -Label "Manifesto do beta drop") {
  $manifest = Read-JsonFile -Path $manifestPath
}

Test-RequiredDirectory -Checks $checks -Failures $failures -Path $DropRoot -Label "Pasta do beta drop" | Out-Null

$latestBetaReady = $null
if (Test-Path -LiteralPath $latestBetaReadyPath -PathType Leaf) {
  $latestBetaReady = Read-JsonFile -Path $latestBetaReadyPath
  Add-Message -List $checks -Message "Ponteiro latest-beta-ready.json encontrado."
} else {
  Add-Message -List $failures -Message "Ponteiro latest-beta-ready.json ausente. Rode npm run release:beta."
}

if ($latestBetaReady -and [string]$manifest.betaPackage -ne [string]$latestBetaReady.handoffName) {
  Add-Message -List $failures -Message "Drop pertence a outro beta: drop=$($manifest.betaPackage); atual=$($latestBetaReady.handoffName)."
} elseif ($latestBetaReady) {
  Add-Message -List $checks -Message "Drop pertence ao beta atual."
}

$filesRoot = Join-Path $DropRoot "arquivos"
$extractRoot = [string]$manifest.extractedPackage
$evidenceRoot = Join-Path $DropRoot "evidencias"

Test-RequiredDirectory -Checks $checks -Failures $failures -Path $filesRoot -Label "Pasta arquivos" | Out-Null
Test-RequiredDirectory -Checks $checks -Failures $failures -Path $extractRoot -Label "Pacote QA extraido" | Out-Null
Test-RequiredDirectory -Checks $checks -Failures $failures -Path $evidenceRoot -Label "Pasta evidencias" | Out-Null

$readmePath = [string]$manifest.readmePath
$runnerPath = [string]$manifest.vmRunnerPath
$sandboxPath = [string]$manifest.sandboxPath
$betaZipPath = [string]$manifest.betaZipPath
$qaZipPath = [string]$manifest.qaPortableZip

$readmeExists = Test-RequiredFile -Checks $checks -Failures $failures -Path $readmePath -Label "Guia do beta drop"
$runnerExists = Test-RequiredFile -Checks $checks -Failures $failures -Path $runnerPath -Label "Runner de VM"
$sandboxExists = Test-RequiredFile -Checks $checks -Failures $failures -Path $sandboxPath -Label "Arquivo Windows Sandbox"
$betaZipExists = Test-RequiredFile -Checks $checks -Failures $failures -Path $betaZipPath -Label "ZIP do beta interno"
$qaZipExists = Test-RequiredFile -Checks $checks -Failures $failures -Path $qaZipPath -Label "ZIP QA portatil"

if ($betaZipExists) {
  $betaHash = (Get-FileHash -LiteralPath $betaZipPath -Algorithm SHA256).Hash
  if (-not [string]::IsNullOrWhiteSpace([string]$manifest.betaZipSha256) -and [string]$manifest.betaZipSha256 -ne $betaHash) {
    Add-Message -List $failures -Message "SHA256 do ZIP beta diverge do manifesto."
  } else {
    Add-Message -List $checks -Message "SHA256 do ZIP beta confere."
  }
}

if ($qaZipExists) {
  $qaHash = (Get-FileHash -LiteralPath $qaZipPath -Algorithm SHA256).Hash
  if (-not [string]::IsNullOrWhiteSpace([string]$manifest.qaPortableZipSha256) -and [string]$manifest.qaPortableZipSha256 -ne $qaHash) {
    Add-Message -List $failures -Message "SHA256 do ZIP QA portatil diverge do manifesto."
  } else {
    Add-Message -List $checks -Message "SHA256 do ZIP QA portatil confere."
  }
}

$requiredExtractedFiles = @(
  "VERIFY-QA-PACKAGE.ps1",
  "RUN-INSTALL-SMOKE.ps1",
  "RUN-MANUAL-QA-EVIDENCE.ps1",
  "RUN-MANUAL-QA-QUICK-PASS.ps1",
  "LEIA-ME-QA-PORTATIL.md"
)
foreach ($fileName in $requiredExtractedFiles) {
  Test-RequiredFile -Checks $checks -Failures $failures -Path (Join-Path $extractRoot $fileName) -Label "Arquivo extraido $fileName" | Out-Null
}

if ($readmeExists) {
  $readme = Get-Content -LiteralPath $readmePath -Raw
  foreach ($requiredText in @("beta interno", "nao release publico", "RODAR-DENTRO-DA-VM.ps1", "qa:manual:receive", "HermesQA")) {
    if ($readme -notmatch [regex]::Escape($requiredText)) {
      Add-Message -List $failures -Message "Guia do beta drop nao contem: $requiredText"
    }
  }
  Add-Message -List $checks -Message "Guia do beta drop contem os avisos e comandos principais."
}

if (-not [string]::IsNullOrWhiteSpace([string]$manifest.receiveCommand) -and [string]$manifest.receiveCommand -match 'qa:manual:receive') {
  Add-Message -List $checks -Message "Comando de recebimento do QA esta presente no manifesto."
} else {
  Add-Message -List $failures -Message "Manifesto do beta drop nao contem comando de recebimento qa:manual:receive."
}

if ($runnerExists) {
  $runner = Get-Content -LiteralPath $runnerPath -Raw
  foreach ($requiredText in @("VERIFY-QA-PACKAGE.ps1", "RUN-INSTALL-SMOKE.ps1", "RUN-MANUAL-QA-EVIDENCE.ps1", "HermesQA")) {
    if ($runner -notmatch [regex]::Escape($requiredText)) {
      Add-Message -List $failures -Message "Runner de VM nao contem: $requiredText"
    }
  }
  Add-Message -List $checks -Message "Runner de VM contem a sequencia esperada."
}

if ($sandboxExists) {
  $sandbox = Get-Content -LiteralPath $sandboxPath -Raw
  foreach ($requiredText in @("<MappedFolder>", "<HostFolder>", "HermesBetaQA", "LEIA-ME-TESTE-BETA.md")) {
    if ($sandbox -notmatch [regex]::Escape($requiredText)) {
      Add-Message -List $failures -Message "Arquivo Sandbox nao contem: $requiredText"
    }
  }
  Add-Message -List $checks -Message "Arquivo Sandbox mapeia o beta drop."
}

$verifyQaPackagePath = Join-Path $extractRoot "VERIFY-QA-PACKAGE.ps1"
$verifyQaExitCode = $null
if (Test-Path -LiteralPath $verifyQaPackagePath -PathType Leaf) {
  Push-Location $extractRoot
  try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verifyQaPackagePath | Out-Host
    $verifyQaExitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
  } finally {
    Pop-Location
  }

  if ($verifyQaExitCode -eq 0) {
    Add-Message -List $checks -Message "VERIFY-QA-PACKAGE.ps1 passou no pacote extraido."
  } else {
    Add-Message -List $failures -Message "VERIFY-QA-PACKAGE.ps1 falhou com exit code $verifyQaExitCode."
  }
}

$status = if ($failures.Count -gt 0) { "FAILED" } else { "OK" }
$result = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  status = $status
  dropRoot = $DropRoot
  dropName = [string]$manifest.dropName
  betaPackage = [string]$manifest.betaPackage
  latestBetaPackage = if ($latestBetaReady) { [string]$latestBetaReady.handoffName } else { $null }
  readmePath = $readmePath
  runnerPath = $runnerPath
  sandboxPath = $sandboxPath
  receiveCommand = [string]$manifest.receiveCommand
  verifyQaPackageExitCode = $verifyQaExitCode
  checks = @($checks)
  warnings = @($warnings)
  failures = @($failures)
}

New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null
$jsonPath = Join-Path $OutputRoot "latest-beta-test-drop-verification.json"
$mdPath = Join-Path $OutputRoot "latest-beta-test-drop-verification.md"
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# Hermes Beta Test Drop Verification")
$markdown.Add("")
$markdown.Add("- Status: **$status**")
$markdown.Add("- Drop: $($result.dropName)")
$markdown.Add("- Beta: $($result.betaPackage)")
$markdown.Add("- Pasta: $DropRoot")
$markdown.Add("- Guia: $readmePath")
$markdown.Add("- Runner VM: $runnerPath")
$markdown.Add("- Windows Sandbox: $sandboxPath")
$markdown.Add("- Recebimento: $($result.receiveCommand)")
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
$markdown.Add("## Checks")
$markdown.Add("")
foreach ($check in $checks) {
  $markdown.Add("- $check")
}
$markdown | Set-Content -LiteralPath $mdPath -Encoding UTF8

Write-Host "Hermes beta test drop verification: $status"
Write-Host "Resumo: $mdPath"
Write-Host "JSON: $jsonPath"

if ($failures.Count -gt 0) {
  exit 1
}
