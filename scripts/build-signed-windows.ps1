param(
  [ValidateSet("test", "real")]
  [string]$Mode = "real",

  [ValidateSet("all", "msi", "nsis")]
  [string]$Bundles = "all",

  [string]$CertificateThumbprint = $env:HERMES_CERT_THUMBPRINT,
  [string]$TimestampUrl = $env:HERMES_TIMESTAMP_URL,
  [switch]$Tsp
)

$ErrorActionPreference = "Stop"

$controlledBuild = Join-Path $PSScriptRoot "build-windows-controlled.ps1"
$arguments = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $controlledBuild,
  "-Mode", $Mode,
  "-Bundles", $Bundles,
  "-Signed"
)

if (-not [string]::IsNullOrWhiteSpace($CertificateThumbprint)) {
  $arguments += @("-CertificateThumbprint", $CertificateThumbprint)
}

if (-not [string]::IsNullOrWhiteSpace($TimestampUrl)) {
  $arguments += @("-TimestampUrl", $TimestampUrl)
}

if ($Tsp) {
  $arguments += "-Tsp"
}

& powershell.exe @arguments

exit $LASTEXITCODE
