param(
  [string]$CertificateThumbprint = $env:HERMES_CERT_THUMBPRINT,
  [string]$TimestampUrl = $env:HERMES_TIMESTAMP_URL,
  [switch]$Tsp
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($CertificateThumbprint)) {
  throw "Defina HERMES_CERT_THUMBPRINT com o SHA1 thumbprint do certificado de assinatura instalado no Windows Certificate Store."
}

if ([string]::IsNullOrWhiteSpace($TimestampUrl)) {
  $TimestampUrl = "http://timestamp.digicert.com"
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
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

Write-Host "Gerando build Windows assinado com thumbprint $($CertificateThumbprint.Trim())."
Write-Host "Timestamp: $($TimestampUrl.Trim())"

Push-Location $root
try {
  npx tauri build --bundles msi,nsis --config $configPath
} finally {
  Pop-Location
}
