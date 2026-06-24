$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root ".release"
$reportPath = Join-Path $releaseDir "qa-latest.json"
$installerPath = Join-Path $root "src-tauri\target\release\bundle\nsis\Hermes Optimizer_0.1.0_x64-setup.exe"
$results = New-Object System.Collections.Generic.List[object]

New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

function Invoke-QaStep {
  param(
    [string]$Name,
    [string]$Command,
    [string[]]$Arguments
  )

  Write-Host ""
  Write-Host "== $Name ==" -ForegroundColor Cyan
  $watch = [System.Diagnostics.Stopwatch]::StartNew()
  $lines = New-Object System.Collections.Generic.List[string]
  $previousErrorActionPreference = $ErrorActionPreference

  try {
    $ErrorActionPreference = "Continue"
    & $Command @Arguments 2>&1 | ForEach-Object {
      $line = [string]$_
      $lines.Add($line)
      Write-Host $line
    }
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  $watch.Stop()

  $results.Add([pscustomobject]@{
    name       = $Name
    passed     = ($exitCode -eq 0)
    exitCode   = $exitCode
    durationMs = $watch.ElapsedMilliseconds
    outputTail = @($lines | Select-Object -Last 12)
  })
}

Push-Location $root
try {
  Invoke-QaStep "Release gates" "powershell.exe" @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", (Join-Path $PSScriptRoot "verify-release-gates.ps1")
  )
  Invoke-QaStep "TypeScript" "npx.cmd" @("tsc", "--noEmit")
  Invoke-QaStep "Lint" "npm.cmd" @("run", "lint")
  Invoke-QaStep "Build web" "npm.cmd" @("run", "build")
  Invoke-QaStep "Build Tauri frontend" "npm.cmd" @("run", "build:tauri")
  Invoke-QaStep "Cargo check" "cargo.exe" @("check", "--manifest-path", "src-tauri\Cargo.toml")
  Invoke-QaStep "Cargo test" "cargo.exe" @(
    "test",
    "--lib",
    "--manifest-path", "src-tauri\Cargo.toml"
  )
} finally {
  Pop-Location
}

$installerExists = Test-Path -LiteralPath $installerPath -PathType Leaf
$signatureStatus = "Missing"
$signerSubject = $null
if ($installerExists) {
  $signature = Get-AuthenticodeSignature -LiteralPath $installerPath
  $signatureStatus = [string]$signature.Status
  $signerSubject = $signature.SignerCertificate.Subject
}

$technicalPass = -not ($results | Where-Object { -not $_.passed })
$signatureValid = $signatureStatus -eq "Valid"
$stepResults = @($results | ForEach-Object { $_ })
$report = [pscustomobject]@{
  generatedAt     = (Get-Date).ToString("o")
  version         = "0.1.0"
  technicalPass   = $technicalPass
  releaseReady    = ($technicalPass -and $installerExists -and $signatureValid)
  installer       = [pscustomobject]@{
    path            = $installerPath
    exists          = $installerExists
    signatureStatus = $signatureStatus
    signerSubject   = $signerSubject
  }
  steps           = $stepResults
  manualBlockers  = @(
    "Instalacao e navegacao em maquina limpa Windows 10/11",
    "Execucao real controlada dos Botoes 1 e 2",
    "Validacao manual de rollback em VM descartavel",
    "Certificado oficial com Authenticode valido"
  )
}

$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding UTF8

Write-Host ""
Write-Host "Relatorio QA: $reportPath"
Write-Host "Tecnico: $(if ($technicalPass) { 'PASSOU' } else { 'FALHOU' })"
Write-Host "Instalador: $(if ($installerExists) { 'ENCONTRADO' } else { 'AUSENTE' })"
Write-Host "Assinatura: $signatureStatus"
Write-Host "Release publica: $(if ($report.releaseReady) { 'GO' } else { 'NO-GO' })"

if (-not $technicalPass) {
  exit 1
}
