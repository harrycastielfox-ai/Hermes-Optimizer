param(
  [string]$ManualQaRoot,
  [string]$ManifestPath,
  [switch]$SkipPackageVerifier
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($ManualQaRoot)) {
  $ManualQaRoot = Join-Path $root ".release\manual-qa"
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

function Resolve-LatestManifest {
  param([string]$RootPath)

  if (-not (Test-Path -LiteralPath $RootPath -PathType Container)) {
    throw "Pasta de QA manual nao encontrada: $RootPath"
  }

  $manifestFile = Get-ChildItem -LiteralPath $RootPath -Recurse -File -Filter "hermes-manual-qa-portable-*-manifest.json" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $manifestFile) {
    throw "Nenhum manifesto de pacote QA portatil encontrado em $RootPath. Rode npm run qa:manual:portable."
  }

  return $manifestFile.FullName
}

if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
  $ManifestPath = Resolve-LatestManifest -RootPath $ManualQaRoot
}

if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
  throw "Manifesto do pacote QA portatil nao encontrado: $ManifestPath"
}

$manifest = Read-JsonFile -Path $ManifestPath
$failures = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

$zipPath = [string]$manifest.zipPath
$zipShaPath = [string]$manifest.zipSha256Path
$portableRoot = [string]$manifest.portableRoot

if ([string]::IsNullOrWhiteSpace($zipPath)) {
  Add-Finding -List $failures -Message "Manifesto nao informa zipPath."
} elseif (-not (Test-Path -LiteralPath $zipPath -PathType Leaf)) {
  Add-Finding -List $failures -Message "ZIP nao encontrado: $zipPath"
}

if ([string]::IsNullOrWhiteSpace($zipShaPath)) {
  Add-Finding -List $failures -Message "Manifesto nao informa zipSha256Path."
} elseif (-not (Test-Path -LiteralPath $zipShaPath -PathType Leaf)) {
  Add-Finding -List $failures -Message "Arquivo .sha256 nao encontrado: $zipShaPath"
}

if ([string]::IsNullOrWhiteSpace($portableRoot)) {
  Add-Finding -List $failures -Message "Manifesto nao informa portableRoot."
} elseif (-not (Test-Path -LiteralPath $portableRoot -PathType Container)) {
  Add-Finding -List $warnings -Message "Pasta extraida do pacote nao encontrada localmente: $portableRoot"
}

$actualZipHash = $null
$actualZipLength = 0
if (-not [string]::IsNullOrWhiteSpace($zipPath) -and (Test-Path -LiteralPath $zipPath -PathType Leaf)) {
  $zipItem = Get-Item -LiteralPath $zipPath
  $actualZipLength = $zipItem.Length
  $actualZipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash

  if ($actualZipHash -ne [string]$manifest.zipSha256) {
    Add-Finding -List $failures -Message "SHA256 do ZIP diverge do manifesto."
  }

  if ([int64]$manifest.zipLengthBytes -ne $actualZipLength) {
    Add-Finding -List $failures -Message "Tamanho do ZIP diverge do manifesto. Manifesto=$($manifest.zipLengthBytes), atual=$actualZipLength."
  }
}

if (-not [string]::IsNullOrWhiteSpace($zipShaPath) -and (Test-Path -LiteralPath $zipShaPath -PathType Leaf) -and $actualZipHash) {
  $shaText = Get-Content -LiteralPath $zipShaPath -Raw
  if (-not $shaText.Contains($actualZipHash)) {
    Add-Finding -List $failures -Message "Arquivo .sha256 nao contem o hash atual do ZIP."
  }
}

$requiredCommandsPresent = @()
$requiredCommandsMissing = @()
foreach ($command in @($manifest.requiredCommands)) {
  $commandText = [string]$command
  if ([string]::IsNullOrWhiteSpace($commandText)) {
    continue
  }

  $relativeCommand = $commandText -replace "^[.][\\/]", ""
  $commandPath = Join-Path $portableRoot $relativeCommand
  if (Test-Path -LiteralPath $commandPath -PathType Leaf) {
    $requiredCommandsPresent += $commandText
  } else {
    $requiredCommandsMissing += $commandText
    Add-Finding -List $failures -Message "Comando obrigatorio ausente no pacote: $commandText"
  }
}

$packageVerifierExitCode = $null
$packageVerifierRan = $false
$verifierPath = if (-not [string]::IsNullOrWhiteSpace($portableRoot)) {
  Join-Path $portableRoot "VERIFY-QA-PACKAGE.ps1"
} else {
  $null
}

if (-not $SkipPackageVerifier) {
  if ([string]::IsNullOrWhiteSpace($verifierPath) -or -not (Test-Path -LiteralPath $verifierPath -PathType Leaf)) {
    Add-Finding -List $failures -Message "VERIFY-QA-PACKAGE.ps1 ausente ou inacessivel."
  } else {
    Write-Host ""
    Write-Host "== Verificando pacote QA portatil =="
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verifierPath | Out-Host
    $packageVerifierExitCode = $LASTEXITCODE
    $packageVerifierRan = $true
    if ($packageVerifierExitCode -ne 0) {
      Add-Finding -List $failures -Message "VERIFY-QA-PACKAGE.ps1 retornou codigo $packageVerifierExitCode."
    }
  }
}

$releaseStatusScript = Join-Path $PSScriptRoot "release-status.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $releaseStatusScript | Out-Host
$releaseStatusPath = Join-Path $root ".release\release-status.json"
$releaseStatus = if (Test-Path -LiteralPath $releaseStatusPath -PathType Leaf) {
  Read-JsonFile -Path $releaseStatusPath
} else {
  $null
}

$doctorStatus = if ($failures.Count -gt 0) { "FAILED" } else { "OK" }
$sessionPath = if (-not [string]::IsNullOrWhiteSpace([string]$manifest.sessionName)) {
  Join-Path $ManualQaRoot ([string]$manifest.sessionName)
} else {
  Split-Path -Parent $ManifestPath
}

if (-not (Test-Path -LiteralPath $sessionPath -PathType Container)) {
  $sessionPath = Split-Path -Parent $ManifestPath
}

$report = [pscustomobject]@{
  generatedAt                    = (Get-Date).ToString("o")
  status                         = $doctorStatus
  manifestPath                   = (Resolve-Path -LiteralPath $ManifestPath).Path
  packageName                    = [string]$manifest.packageName
  candidateName                  = [string]$manifest.candidateName
  version                        = [string]$manifest.version
  zipPath                        = $zipPath
  zipLengthBytes                 = $actualZipLength
  zipSha256                      = $actualZipHash
  portableRoot                   = $portableRoot
  requiredCommandsPresent        = @($requiredCommandsPresent)
  requiredCommandsMissing        = @($requiredCommandsMissing)
  packageVerifierRan             = $packageVerifierRan
  packageVerifierExitCode        = $packageVerifierExitCode
  releaseStatus                  = if ($releaseStatus) { [string]$releaseStatus.overallStatus } else { $null }
  releaseStatusPath              = if (Test-Path -LiteralPath $releaseStatusPath -PathType Leaf) { (Resolve-Path -LiteralPath $releaseStatusPath).Path } else { $null }
  releaseBlockers                = if ($releaseStatus) { @($releaseStatus.blockers) } else { @() }
  failures                       = @($failures)
  warnings                       = @($warnings)
  nextCommandAfterVm             = 'npm run qa:manual:receive -- -EvidenceDropPath "C:\Temp\HermesQA"'
}

$jsonPath = Join-Path $sessionPath "manual-qa-package-doctor.json"
$mdPath = Join-Path $sessionPath "manual-qa-package-doctor.md"
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# Hermes Manual QA Package Doctor")
$markdown.Add("")
$markdown.Add("- Status: **$doctorStatus**")
$markdown.Add("- Pacote: $($report.packageName)")
$markdown.Add("- RC: $($report.candidateName)")
$markdown.Add("- ZIP: $($report.zipPath)")
$markdown.Add("- ZIP SHA256: $($report.zipSha256)")
$markdown.Add("- Verificador do pacote: $(if ($packageVerifierRan) { "executado, exit code $packageVerifierExitCode" } else { "pulado" })")
$markdown.Add("- Release status atual: $(if ($releaseStatus) { $releaseStatus.overallStatus } else { "ausente" })")
$markdown.Add("")
$markdown.Add("## Falhas")
$markdown.Add("")
if ($failures.Count -gt 0) {
  foreach ($failure in $failures) {
    $markdown.Add("- $failure")
  }
} else {
  $markdown.Add("- Nenhuma falha de integridade do pacote.")
}
$markdown.Add("")
$markdown.Add("## Avisos")
$markdown.Add("")
if ($warnings.Count -gt 0) {
  foreach ($warning in $warnings) {
    $markdown.Add("- $warning")
  }
} else {
  $markdown.Add("- Nenhum aviso do pacote.")
}
$markdown.Add("")
$markdown.Add("## Proximo passo")
$markdown.Add("")
$markdown.Add("1. Copie o ZIP para VM/maquina limpa e rode `VERIFY-QA-PACKAGE.ps1`, `RUN-INSTALL-SMOKE.ps1` e `RUN-MANUAL-QA-EVIDENCE.ps1`.")
$markdown.Add("2. Copie a pasta `HermesQA` de volta para o host, por exemplo `C:\Temp\HermesQA`.")
$markdown.Add("3. Rode:")
$markdown.Add("")
$markdown.Add("~~~powershell")
$markdown.Add($report.nextCommandAfterVm)
$markdown.Add("~~~")
$markdown | Set-Content -LiteralPath $mdPath -Encoding UTF8

Write-Host ""
Write-Host "Hermes QA package doctor: $doctorStatus"
Write-Host "ZIP: $zipPath"
Write-Host "SHA256: $actualZipHash"
Write-Host "Relatorio: $jsonPath"
Write-Host "Resumo: $mdPath"

if ($failures.Count -gt 0) {
  exit 1
}
