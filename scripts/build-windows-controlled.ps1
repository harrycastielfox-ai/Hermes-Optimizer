param(
  [ValidateSet("test", "real")]
  [string]$Mode = "test",

  [ValidateSet("all", "msi", "nsis")]
  [string]$Bundles = "all",

  [switch]$Signed,
  [string]$CertificateThumbprint = $env:HERMES_CERT_THUMBPRINT,
  [string]$TimestampUrl = $env:HERMES_TIMESTAMP_URL,
  [switch]$Tsp
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseGateScript = Join-Path $PSScriptRoot "verify-release-gates.ps1"
$safeModeValue = if ($Mode -eq "real") { "false" } else { "true" }
$bundleTargets = if ($Bundles -eq "all") { "msi,nsis" } else { $Bundles }

Write-Host "Validando release gates..."
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $releaseGateScript
if ($LASTEXITCODE -ne 0) {
  throw "Build bloqueado: os release gates do Hermes falharam."
}

$env:VITE_HERMES_SAFE_TEST_MODE = $safeModeValue
$env:HERMES_SAFE_TEST_MODE = $safeModeValue

Write-Host "Hermes Windows build"
Write-Host "Modo: $Mode"
Write-Host "Frontend VITE_HERMES_SAFE_TEST_MODE=$env:VITE_HERMES_SAFE_TEST_MODE"
Write-Host "Backend  HERMES_SAFE_TEST_MODE=$env:HERMES_SAFE_TEST_MODE"
Write-Host "Bundles: $bundleTargets"

if ($Mode -eq "real") {
  Write-Host "ATENCAO: este build libera execucao real nas engines implementadas." -ForegroundColor Yellow
}

$configPath = $null
if ($Signed) {
  if ([string]::IsNullOrWhiteSpace($CertificateThumbprint)) {
    throw "Defina HERMES_CERT_THUMBPRINT ou passe -CertificateThumbprint para assinar o instalador."
  }

  if ([string]::IsNullOrWhiteSpace($TimestampUrl)) {
    $TimestampUrl = "http://timestamp.digicert.com"
  }

  $releaseDir = Join-Path $root ".release"
  New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
  $configPath = Join-Path $releaseDir "tauri.windows.signing.generated.json"

  $config = @{
    bundle = @{
      windows = @{
        certificateThumbprint = $CertificateThumbprint.Trim()
        digestAlgorithm       = "sha256"
        timestampUrl          = $TimestampUrl.Trim()
        tsp                   = [bool]$Tsp
      }
    }
  }

  $config | ConvertTo-Json -Depth 8 | Set-Content -Path $configPath -Encoding UTF8
  Write-Host "Assinatura: $($CertificateThumbprint.Trim())"
  Write-Host "Timestamp: $($TimestampUrl.Trim())"
}

Push-Location $root
try {
  $tauriArgs = @("tauri", "build", "--bundles", $bundleTargets)
  if ($configPath) {
    $tauriArgs += @("--config", $configPath)
  }

  & npx.cmd @tauriArgs
} finally {
  Pop-Location
}
