param(
  [string]$ReleaseStatusPath,
  [string]$OutputRoot
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseRoot = Join-Path $root ".release"
if ([string]::IsNullOrWhiteSpace($ReleaseStatusPath)) {
  $ReleaseStatusPath = Join-Path $releaseRoot "release-status.json"
}
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $releaseRoot "public"
}

function Read-JsonFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "JSON nao encontrado: $Path"
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Copy-RequiredFile {
  param(
    [string]$Source,
    [string]$Destination
  )

  if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) {
    throw "Arquivo obrigatorio nao encontrado: $Source"
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
  Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

$publicVerifyScript = Join-Path $PSScriptRoot "verify-public-release-ready.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $publicVerifyScript -RefreshStatus
if ($LASTEXITCODE -ne 0) {
  throw "Pacote publico bloqueado: release:public:verify ainda esta NO-GO. Gere o pacote publico somente depois de Authenticode Valid em MSI/NSIS."
}

$status = Read-JsonFile -Path $ReleaseStatusPath
if ([string]$status.overallStatus -ne "GO") {
  throw "Pacote publico bloqueado: release-status esta $($status.overallStatus), esperado GO."
}

$candidatePath = [string]$status.latestCandidate
if ([string]::IsNullOrWhiteSpace($candidatePath) -or -not (Test-Path -LiteralPath $candidatePath -PathType Container)) {
  throw "Release candidate publico nao encontrado: $candidatePath"
}

$candidateManifestPath = Join-Path $candidatePath "release-candidate-manifest.json"
$candidateManifest = Read-JsonFile -Path $candidateManifestPath
if ([string]$candidateManifest.publicDecision -ne "GO") {
  throw "Pacote publico bloqueado: manifesto do RC esta $($candidateManifest.publicDecision), esperado GO."
}

New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "hermes-optimizer-$($candidateManifest.version)-public-$timestamp"
$packageRoot = Join-Path $OutputRoot $packageName
$installersRoot = Join-Path $packageRoot "installers"
$evidenceRoot = Join-Path $packageRoot "evidencias"
New-Item -ItemType Directory -Force -Path $installersRoot | Out-Null
New-Item -ItemType Directory -Force -Path $evidenceRoot | Out-Null

$packagedInstallers = @()
foreach ($installer in @($candidateManifest.installers)) {
  $sourcePath = Join-Path $candidatePath ([string]$installer.relativePath)
  $signature = Get-AuthenticodeSignature -LiteralPath $sourcePath
  if ([string]$signature.Status -ne "Valid") {
    throw "Pacote publico bloqueado: $($installer.kind) esta com Authenticode $($signature.Status), esperado Valid."
  }

  $destinationPath = Join-Path $installersRoot ([string]$installer.fileName)
  Copy-RequiredFile -Source $sourcePath -Destination $destinationPath
  $item = Get-Item -LiteralPath $destinationPath
  $hash = (Get-FileHash -LiteralPath $destinationPath -Algorithm SHA256).Hash

  $packagedInstallers += [pscustomobject]@{
    kind            = [string]$installer.kind
    fileName        = [string]$installer.fileName
    relativePath    = "installers/$($installer.fileName)"
    lengthBytes     = $item.Length
    sha256          = $hash
    signatureStatus = [string]$signature.Status
    signerSubject   = [string]$signature.SignerCertificate.Subject
    signerThumbprint = [string]$signature.SignerCertificate.Thumbprint
  }

  "$hash *$($installer.fileName)" | Set-Content -LiteralPath (Join-Path $installersRoot "$($installer.fileName).sha256") -Encoding ASCII
}

$evidenceFiles = @(
  @{ source = $ReleaseStatusPath; target = "release-status.json" },
  @{ source = (Join-Path $releaseRoot "release-status.md"); target = "release-status.md" },
  @{ source = (Join-Path $releaseRoot "public-release-ready.json"); target = "public-release-ready.json" },
  @{ source = (Join-Path $releaseRoot "public-release-ready.md"); target = "public-release-ready.md" },
  @{ source = $candidateManifestPath; target = "release-candidate-manifest.json" },
  @{ source = (Join-Path $candidatePath "release-candidate-verification.json"); target = "release-candidate-verification.json" },
  @{ source = (Join-Path $releaseRoot "signing-preflight.json"); target = "signing-preflight.json" },
  @{ source = (Join-Path $releaseRoot "signing-preflight.md"); target = "signing-preflight.md" }
)

foreach ($entry in $evidenceFiles) {
  if (Test-Path -LiteralPath $entry.source -PathType Leaf) {
    Copy-RequiredFile -Source $entry.source -Destination (Join-Path $evidenceRoot $entry.target)
  }
}

$manifest = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  packageName = $packageName
  version = [string]$candidateManifest.version
  sourceCandidate = $candidatePath
  publicDecision = "GO"
  installers = @($packagedInstallers)
  evidenceRoot = "evidencias"
}

$manifestPath = Join-Path $packageRoot "public-release-manifest.json"
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

$installerLines = ($packagedInstallers | ForEach-Object {
  "- {0}: {1} | SHA256 {2} | Authenticode {3}" -f $_.kind.ToUpperInvariant(), $_.relativePath, $_.sha256, $_.signatureStatus
}) -join "`r`n"

$readme = @"
# Hermes Optimizer $($candidateManifest.version) - Release Publico

Status: **GO**

Este pacote foi gerado somente depois de release:public:verify passar. Publicar apenas os instaladores desta pasta.

## Instaladores

$installerLines

## Evidencias

- public-release-manifest.json
- evidencias/release-status.json
- evidencias/public-release-ready.json
- evidencias/release-candidate-manifest.json
- evidencias/signing-preflight.json
"@
$readme | Set-Content -LiteralPath (Join-Path $packageRoot "LEIA-ME-PUBLICO.md") -Encoding UTF8

$latestJsonPath = Join-Path $OutputRoot "latest-public-release-package.json"
$latestMdPath = Join-Path $OutputRoot "latest-public-release-package.md"
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $latestJsonPath -Encoding UTF8
@"
# Hermes Latest Public Release Package

- Pacote: $packageRoot
- Manifesto: $manifestPath
- Status: GO
"@ | Set-Content -LiteralPath $latestMdPath -Encoding UTF8

Write-Host "Pacote publico gerado:"
Write-Host "- $packageRoot"
Write-Host "- $manifestPath"
