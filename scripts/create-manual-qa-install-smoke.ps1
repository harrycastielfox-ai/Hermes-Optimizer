param(
  [string]$SessionPath,
  [string]$SessionsRoot
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

$sessionJsonPath = Join-Path $SessionPath "manual-qa-session.json"
if (-not (Test-Path -LiteralPath $sessionJsonPath -PathType Leaf)) {
  throw "Arquivo manual-qa-session.json ausente: $sessionJsonPath"
}

$session = Get-Content -LiteralPath $sessionJsonPath -Raw | ConvertFrom-Json
$candidatePath = [string]$session.candidatePath
if ([string]::IsNullOrWhiteSpace($candidatePath) -or -not (Test-Path -LiteralPath $candidatePath -PathType Container)) {
  throw "Release candidate da sessao nao encontrado: $candidatePath"
}

$manifestPath = Join-Path $candidatePath "release-candidate-manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw "Manifesto do release candidate ausente: $manifestPath"
}

$smokeScriptPath = Join-Path $SessionPath "run-install-smoke.ps1"
$smokeReadmePath = Join-Path $SessionPath "install-smoke-readme.md"

$smokeScript = @'
param(
  [string]$RcPath = "C:\Users\WDAGUtilityAccount\Desktop\HermesRC",
  [string]$QaPath = "C:\Users\WDAGUtilityAccount\Desktop\HermesQA",
  [switch]$SkipMsi,
  [switch]$SkipNsis
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "== $Message ==" -ForegroundColor Cyan
}

function Get-HermesExecutableCandidates {
  $paths = @(
    (Join-Path $env:LOCALAPPDATA "Programs\Hermes Optimizer\Hermes Optimizer.exe"),
    (Join-Path $env:ProgramFiles "Hermes Optimizer\Hermes Optimizer.exe")
  )

  if (${env:ProgramFiles(x86)}) {
    $paths += (Join-Path ${env:ProgramFiles(x86)} "Hermes Optimizer\Hermes Optimizer.exe")
  }

  $scanRoots = @($env:LOCALAPPDATA, $env:ProgramFiles, ${env:ProgramFiles(x86)}) |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) -and (Test-Path -LiteralPath $_ -PathType Container) }

  foreach ($root in $scanRoots) {
    $matches = Get-ChildItem -LiteralPath $root -Filter "Hermes Optimizer.exe" -File -Recurse -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty FullName
    $paths += $matches
  }

  $paths | Select-Object -Unique
}

function Get-HermesInstallEvidence {
  $executables = @(Get-HermesExecutableCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf })
  $uninstallKeys = @(
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
  )

  $registryEntries = foreach ($key in $uninstallKeys) {
    Get-ItemProperty -Path $key -ErrorAction SilentlyContinue |
      Where-Object { [string]$_.DisplayName -like "*Hermes Optimizer*" } |
      Select-Object DisplayName, DisplayVersion, Publisher, InstallLocation, UninstallString, QuietUninstallString
  }

  [pscustomobject]@{
    executables     = @($executables)
    registryEntries = @($registryEntries)
  }
}

function Invoke-HermesUninstall {
  $evidence = Get-HermesInstallEvidence
  foreach ($entry in @($evidence.registryEntries)) {
    $quiet = [string]$entry.QuietUninstallString
    $normal = [string]$entry.UninstallString

    if (-not [string]::IsNullOrWhiteSpace($quiet)) {
      Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $quiet -Wait -WindowStyle Hidden
      continue
    }

    if ($normal -match "MsiExec\.exe.+\{") {
      $productCode = [regex]::Match($normal, "\{[0-9A-Fa-f-]{36}\}").Value
      if (-not [string]::IsNullOrWhiteSpace($productCode)) {
        Start-Process -FilePath "msiexec.exe" -ArgumentList @("/x", $productCode, "/qn", "/norestart") -Wait -WindowStyle Hidden
      }
    } elseif ($normal -match '^(?:"([^"]+)"|([^ ]+))') {
      $exe = if ($Matches[1]) { $Matches[1] } else { $Matches[2] }
      if (Test-Path -LiteralPath $exe -PathType Leaf) {
        Start-Process -FilePath $exe -ArgumentList "/S" -Wait -WindowStyle Hidden
      }
    }
  }
}

function Test-HermesLaunch {
  param(
    [array]$Executables
  )

  $exe = @($Executables | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1)
  if (-not $exe) {
    return [pscustomobject]@{
      attempted       = $false
      passed          = $false
      executablePath  = $null
      processId       = $null
      processName     = $null
      mainWindowTitle = $null
      exitCode        = $null
      error           = "Executavel instalado nao encontrado."
    }
  }

  try {
    $process = Start-Process -FilePath $exe -PassThru
    Start-Sleep -Seconds 8
    $running = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
    $title = if ($running) { [string]$running.MainWindowTitle } else { $null }
    $hasWindowOrProcess = [bool]$running

    if ($running) {
      if ($running.MainWindowHandle -ne 0) {
        $running.CloseMainWindow() | Out-Null
        Start-Sleep -Seconds 2
      }
      $stillRunning = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
      if ($stillRunning) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
      }
    }

    return [pscustomobject]@{
      attempted       = $true
      passed          = $hasWindowOrProcess
      executablePath  = $exe
      processId       = $process.Id
      processName     = $process.ProcessName
      mainWindowTitle = $title
      exitCode        = $process.ExitCode
      error           = $null
    }
  } catch {
    return [pscustomobject]@{
      attempted       = $true
      passed          = $false
      executablePath  = $exe
      processId       = $null
      processName     = $null
      mainWindowTitle = $null
      exitCode        = $null
      error           = $_.Exception.Message
    }
  }
}

function Test-HermesInstaller {
  param(
    [pscustomobject]$Installer,
    [string]$LogRoot
  )

  $installerPath = Join-Path $RcPath ([string]$Installer.relativePath)
  $kind = [string]$Installer.kind
  $logPath = Join-Path $LogRoot "$kind-install.log"

  Write-Step "Validando instalador $kind"
  if (-not (Test-Path -LiteralPath $installerPath -PathType Leaf)) {
    throw "Instalador ausente: $installerPath"
  }

  $file = Get-Item -LiteralPath $installerPath
  $hash = (Get-FileHash -LiteralPath $installerPath -Algorithm SHA256).Hash
  $signature = Get-AuthenticodeSignature -LiteralPath $installerPath

  if ($file.Length -ne [int64]$Installer.lengthBytes) {
    throw "Tamanho divergente em $kind. Manifesto=$($Installer.lengthBytes), atual=$($file.Length)"
  }
  if ($hash -ne [string]$Installer.sha256) {
    throw "SHA256 divergente em $kind."
  }

  Write-Step "Instalando $kind"
  $exitCode = $null
  if ($kind -eq "nsis") {
    $process = Start-Process -FilePath $installerPath -ArgumentList "/S" -Wait -PassThru
    $exitCode = $process.ExitCode
  } elseif ($kind -eq "msi") {
    $arguments = @("/i", "`"$installerPath`"", "/qn", "/norestart", "/L*v", "`"$logPath`"")
    $process = Start-Process -FilePath "msiexec.exe" -ArgumentList $arguments -Wait -PassThru
    $exitCode = $process.ExitCode
  } else {
    throw "Tipo de instalador desconhecido: $kind"
  }

  $installEvidence = Get-HermesInstallEvidence
  $launchEvidence = Test-HermesLaunch -Executables @($installEvidence.executables)
  $passed = ($exitCode -eq 0) -and
    (@($installEvidence.executables).Count -gt 0 -or @($installEvidence.registryEntries).Count -gt 0) -and
    [bool]$launchEvidence.passed

  [pscustomobject]@{
    kind             = $kind
    installerPath    = $installerPath
    exitCode         = $exitCode
    signatureStatus  = [string]$signature.Status
    sha256           = $hash
    lengthBytes      = $file.Length
    executableFound  = @($installEvidence.executables).Count -gt 0
    executables      = @($installEvidence.executables)
    registryFound    = @($installEvidence.registryEntries).Count -gt 0
    registryEntries  = @($installEvidence.registryEntries)
    launch           = $launchEvidence
    logPath          = if (Test-Path -LiteralPath $logPath -PathType Leaf) { $logPath } else { $null }
    passed           = $passed
  }
}

if (-not (Test-Path -LiteralPath $RcPath -PathType Container)) {
  throw "Pasta HermesRC nao encontrada: $RcPath"
}
if (-not (Test-Path -LiteralPath $QaPath -PathType Container)) {
  New-Item -ItemType Directory -Force -Path $QaPath | Out-Null
}

$manifestPath = Join-Path $RcPath "release-candidate-manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw "Manifesto do release candidate nao encontrado: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resultRoot = Join-Path $QaPath "install-smoke-$timestamp"
New-Item -ItemType Directory -Force -Path $resultRoot | Out-Null

$results = @()
$installers = @($manifest.installers)

try {
  if (-not $SkipNsis) {
    Invoke-HermesUninstall
    $nsis = $installers | Where-Object { $_.kind -eq "nsis" } | Select-Object -First 1
    if ($nsis) {
      $results += Test-HermesInstaller -Installer $nsis -LogRoot $resultRoot
    }
  }

  if (-not $SkipMsi) {
    Invoke-HermesUninstall
    $msi = $installers | Where-Object { $_.kind -eq "msi" } | Select-Object -First 1
    if ($msi) {
      $results += Test-HermesInstaller -Installer $msi -LogRoot $resultRoot
    }
  }
} finally {
  Invoke-HermesUninstall
}

$overallPassed = -not (@($results) | Where-Object { -not $_.passed })
$report = [pscustomobject]@{
  generatedAt    = (Get-Date).ToString("o")
  computerName   = $env:COMPUTERNAME
  userName       = $env:USERNAME
  candidateName  = $manifest.candidateName
  version        = $manifest.version
  overallPassed  = $overallPassed
  results        = @($results)
}

$jsonPath = Join-Path $resultRoot "install-smoke-result.json"
$mdPath = Join-Path $resultRoot "install-smoke-result.md"
$report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$resultLines = (@($results) | ForEach-Object {
  "- $($_.kind.ToUpperInvariant()): $(if ($_.passed) { 'PASSOU' } else { 'FALHOU' }) | ExitCode=$($_.exitCode) | Authenticode=$($_.signatureStatus) | Exe=$($_.executableFound) | Registry=$($_.registryFound) | Launch=$($_.launch.passed)"
}) -join "`r`n"

@"
# Hermes Install Smoke

- Candidate: $($manifest.candidateName)
- Versao: $($manifest.version)
- Resultado: $(if ($overallPassed) { "PASSOU" } else { "FALHOU" })

## Instaladores

$resultLines

## Evidencias

- JSON: $jsonPath
"@ | Set-Content -LiteralPath $mdPath -Encoding UTF8

Write-Host ""
Write-Host "Install smoke concluido: $(if ($overallPassed) { 'PASSOU' } else { 'FALHOU' })" -ForegroundColor $(if ($overallPassed) { "Green" } else { "Red" })
Write-Host "JSON: $jsonPath"
Write-Host "Resumo: $mdPath"

if (-not $overallPassed) {
  exit 1
}
'@

$smokeScript | Set-Content -LiteralPath $smokeScriptPath -Encoding UTF8

$readme = @"
# Hermes Install Smoke

Este script foi gerado para rodar dentro do Windows Sandbox da sessao de QA manual.

## Como executar no Sandbox

1. Abra `hermes-manual-qa.wsb`.
2. Dentro do Sandbox, abra PowerShell.
3. Rode:

    powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\WDAGUtilityAccount\Desktop\HermesQA\run-install-smoke.ps1

## O que ele valida

- Hash SHA256 e tamanho dos instaladores do RC.
- Status Authenticode lido na maquina limpa.
- Instalacao silenciosa NSIS.
- Instalacao silenciosa MSI.
- Presenca de executavel ou entrada de desinstalacao do Hermes.
- Abertura do Hermes instalado com processo/janela detectavel.
- Desinstalacao entre os testes para evitar conflito.

## Saida

O resultado fica em `Desktop\HermesQA\install-smoke-*/`, mapeado de volta para:

$SessionPath

Depois de revisar o resultado, marque install-nsis e install-msi com npm run qa:manual:item.
"@

$readme | Set-Content -LiteralPath $smokeReadmePath -Encoding UTF8

Write-Host "Smoke de instalacao gerado:"
Write-Host "- $smokeScriptPath"
Write-Host "- $smokeReadmePath"
