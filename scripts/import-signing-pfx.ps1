param(
  [string]$PfxPath = $env:HERMES_SIGNING_PFX_PATH,
  [string]$PfxBase64 = $env:HERMES_SIGNING_PFX_BASE64,
  [string]$PfxPassword = $env:HERMES_SIGNING_PFX_PASSWORD,
  [ValidateSet("CurrentUser", "LocalMachine")]
  [string]$StoreScope = "CurrentUser",
  [switch]$MachineKeySet,
  [switch]$Exportable
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root ".release"
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

function Normalize-Thumbprint {
  param([string]$Value)
  return ($Value -replace "\s", "").ToUpperInvariant()
}

function Get-CodeSigningUsage {
  param($Certificate)

  $enhancedUsages = @($Certificate.EnhancedKeyUsageList | ForEach-Object { $_.FriendlyName })
  if ($enhancedUsages.Count -eq 0) {
    return "Unknown"
  }
  if ($enhancedUsages -contains "Code Signing") {
    return "CodeSigning"
  }
  return ($enhancedUsages -join "; ")
}

if ([string]::IsNullOrWhiteSpace($PfxPath) -and [string]::IsNullOrWhiteSpace($PfxBase64)) {
  throw "Informe -PfxPath, HERMES_SIGNING_PFX_PATH ou HERMES_SIGNING_PFX_BASE64."
}
if ([string]::IsNullOrWhiteSpace($PfxPassword)) {
  throw "Informe -PfxPassword ou HERMES_SIGNING_PFX_PASSWORD."
}

$tempPfxPath = $null
if (-not [string]::IsNullOrWhiteSpace($PfxBase64)) {
  $tempPfxPath = Join-Path $releaseDir "hermes-signing-input.pfx"
  [System.IO.File]::WriteAllBytes($tempPfxPath, [Convert]::FromBase64String($PfxBase64))
  $PfxPath = $tempPfxPath
}

if (-not (Test-Path -LiteralPath $PfxPath -PathType Leaf)) {
  throw "PFX nao encontrado: $PfxPath"
}

$securePassword = ConvertTo-SecureString -String $PfxPassword -AsPlainText -Force
$keyStorageFlags = [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::PersistKeySet
if ($MachineKeySet -or $StoreScope -eq "LocalMachine") {
  $keyStorageFlags = $keyStorageFlags -bor [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::MachineKeySet
} else {
  $keyStorageFlags = $keyStorageFlags -bor [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::UserKeySet
}
if ($Exportable) {
  $keyStorageFlags = $keyStorageFlags -bor [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable
}

$certificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($PfxPath, $securePassword, $keyStorageFlags)
$usage = Get-CodeSigningUsage -Certificate $certificate
$blockers = New-Object System.Collections.Generic.List[string]

if ($usage -ne "CodeSigning") {
  $blockers.Add("PFX nao possui Enhanced Key Usage de Code Signing. Uso detectado: $usage")
}
if (-not $certificate.HasPrivateKey) {
  $blockers.Add("PFX nao possui chave privada disponivel.")
}
if ($certificate.NotAfter -lt (Get-Date)) {
  $blockers.Add("PFX expirado em $($certificate.NotAfter.ToString('yyyy-MM-dd')).")
}
if ($blockers.Count -gt 0) {
  foreach ($blocker in $blockers) {
    Write-Host "- $blocker" -ForegroundColor Yellow
  }
  throw "Importacao bloqueada: certificado PFX nao esta pronto para Code Signing."
}

$storeLocation = if ($StoreScope -eq "LocalMachine") {
  [System.Security.Cryptography.X509Certificates.StoreLocation]::LocalMachine
} else {
  [System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser
}
$store = [System.Security.Cryptography.X509Certificates.X509Store]::new("My", $storeLocation)
$store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
try {
  $store.Add($certificate)
} finally {
  $store.Close()
}

$thumbprint = Normalize-Thumbprint $certificate.Thumbprint
$envPath = Join-Path $releaseDir "hermes-signing-env.ps1"
@"
# Hermes signing environment.
# Gerado automaticamente por scripts/import-signing-pfx.ps1.
`$env:HERMES_CERT_THUMBPRINT = "$thumbprint"
`$env:HERMES_TIMESTAMP_URL = "http://timestamp.digicert.com"
"@ | Set-Content -LiteralPath $envPath -Encoding UTF8

$report = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  imported = $true
  store = "Cert:\$StoreScope\My"
  subject = $certificate.Subject
  issuer = $certificate.Issuer
  thumbprint = $thumbprint
  notAfter = $certificate.NotAfter.ToString("o")
  hasPrivateKey = [bool]$certificate.HasPrivateKey
  usage = $usage
  envPath = $envPath
}
$jsonPath = Join-Path $releaseDir "signing-pfx-import.json"
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

if ($tempPfxPath -and (Test-Path -LiteralPath $tempPfxPath -PathType Leaf)) {
  Remove-Item -LiteralPath $tempPfxPath -Force
}

Write-Host "PFX de assinatura importado."
Write-Host "- Store: Cert:\$StoreScope\My"
Write-Host "- Subject: $($certificate.Subject)"
Write-Host "- Thumbprint: $thumbprint"
Write-Host "- Env: $envPath"
Write-Host "- Evidencia: $jsonPath"

$prepareScript = Join-Path $PSScriptRoot "prepare-signing-certificate.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $prepareScript -Thumbprint $thumbprint -WriteEnvTemplate
exit $LASTEXITCODE
