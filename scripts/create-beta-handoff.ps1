param(
  [string]$OutputRoot,
  [switch]$SkipDoctor
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseRoot = Join-Path $root ".release"
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $releaseRoot "beta-handoff"
}

function Read-JsonFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "JSON nao encontrado: $Path"
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Copy-FileIfExists {
  param(
    [string]$Source,
    [string]$Destination
  )

  if ([string]::IsNullOrWhiteSpace($Source)) {
    return $false
  }

  if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) {
    return $false
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
  Copy-Item -LiteralPath $Source -Destination $Destination -Force
  return $true
}

function Copy-DirectoryIfExists {
  param(
    [string]$Source,
    [string]$Destination
  )

  if ([string]::IsNullOrWhiteSpace($Source)) {
    return $false
  }

  if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
    return $false
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
  Copy-Item -LiteralPath $Source -Destination $Destination -Recurse -Force
  return $true
}

Write-Host ""
Write-Host "== Atualizando status de release =="
$releaseStatusScript = Join-Path $PSScriptRoot "release-status.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $releaseStatusScript | Out-Host

if (-not $SkipDoctor) {
  Write-Host ""
  Write-Host "== Validando pacote QA portatil =="
  $doctorScript = Join-Path $PSScriptRoot "check-manual-qa-package.ps1"
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $doctorScript | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "qa:manual:doctor falhou. Corrija o pacote QA antes de gerar handoff beta."
  }
}

$releaseStatusPath = Join-Path $releaseRoot "release-status.json"
$releaseStatus = Read-JsonFile -Path $releaseStatusPath

if (-not [bool]$releaseStatus.qaTechnicalPass) {
  throw "Beta interno bloqueado: QA tecnico nao passou."
}

if ([string]::IsNullOrWhiteSpace([string]$releaseStatus.latestCandidate)) {
  throw "Beta interno bloqueado: release candidate ausente."
}

if ([string]::IsNullOrWhiteSpace([string]$releaseStatus.latestManualQaPortableZip)) {
  throw "Beta interno bloqueado: pacote QA portatil ausente. Rode npm run qa:manual:portable."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$candidateName = Split-Path -Leaf ([string]$releaseStatus.latestCandidate)
$handoffName = "hermes-beta-interno-$timestamp"
$handoffRoot = Join-Path $OutputRoot $handoffName
$evidenceRoot = Join-Path $handoffRoot "evidencias"
$qaRoot = Join-Path $handoffRoot "qa-portatil"
$candidateRoot = Join-Path $handoffRoot "release-candidate"
$signingRoot = Join-Path $handoffRoot "assinatura"

New-Item -ItemType Directory -Force -Path $handoffRoot | Out-Null
New-Item -ItemType Directory -Force -Path $evidenceRoot | Out-Null
New-Item -ItemType Directory -Force -Path $qaRoot | Out-Null
New-Item -ItemType Directory -Force -Path $candidateRoot | Out-Null
New-Item -ItemType Directory -Force -Path $signingRoot | Out-Null

$copied = New-Object System.Collections.Generic.List[string]
$missing = New-Object System.Collections.Generic.List[string]

$filesToCopy = @(
  @{ source = (Join-Path $releaseRoot "release-status.json"); destination = (Join-Path $evidenceRoot "release-status.json") },
  @{ source = (Join-Path $releaseRoot "release-status.md"); destination = (Join-Path $evidenceRoot "release-status.md") },
  @{ source = (Join-Path $releaseRoot "qa-latest.json"); destination = (Join-Path $evidenceRoot "qa-latest.json") },
  @{ source = (Join-Path $releaseRoot "signing-preflight.json"); destination = (Join-Path $signingRoot "signing-preflight.json") },
  @{ source = (Join-Path $releaseRoot "signing-preflight.md"); destination = (Join-Path $signingRoot "signing-preflight.md") },
  @{ source = (Join-Path $releaseRoot "signing-certificate-candidates.json"); destination = (Join-Path $signingRoot "signing-certificate-candidates.json") },
  @{ source = (Join-Path $releaseRoot "signing-certificate-candidates.md"); destination = (Join-Path $signingRoot "signing-certificate-candidates.md") }
)

foreach ($entry in $filesToCopy) {
  if (Copy-FileIfExists -Source $entry.source -Destination $entry.destination) {
    $copied.Add($entry.destination)
  } else {
    $missing.Add($entry.source)
  }
}

$manualQaPath = [string]$releaseStatus.latestManualQa
if (-not [string]::IsNullOrWhiteSpace($manualQaPath)) {
  $manualReports = @(
    "manual-qa-summary.md",
    "manual-qa-verification.json",
    "manual-qa-package-doctor.md",
    "manual-qa-package-doctor.json",
    "manual-qa-portable.md"
  )

  foreach ($reportName in $manualReports) {
    $source = Join-Path $manualQaPath $reportName
    $destination = Join-Path $evidenceRoot $reportName
    if (Copy-FileIfExists -Source $source -Destination $destination) {
      $copied.Add($destination)
    } else {
      $missing.Add($source)
    }
  }
}

$qaZipPath = [string]$releaseStatus.latestManualQaPortableZip
$qaZipShaPath = if ($qaZipPath) { "$qaZipPath.sha256" } else { $null }
$qaManifestPath = [string]$releaseStatus.latestManualQaPortableManifest

foreach ($entry in @(
  @{ source = $qaZipPath; destination = (Join-Path $qaRoot (Split-Path -Leaf $qaZipPath)) },
  @{ source = $qaZipShaPath; destination = (Join-Path $qaRoot (Split-Path -Leaf $qaZipShaPath)) },
  @{ source = $qaManifestPath; destination = (Join-Path $qaRoot (Split-Path -Leaf $qaManifestPath)) }
)) {
  if (Copy-FileIfExists -Source $entry.source -Destination $entry.destination) {
    $copied.Add($entry.destination)
  } else {
    $missing.Add($entry.source)
  }
}

$candidatePath = [string]$releaseStatus.latestCandidate
Copy-DirectoryIfExists -Source (Join-Path $candidatePath "installers") -Destination (Join-Path $candidateRoot "installers") | Out-Null
Copy-DirectoryIfExists -Source (Join-Path $candidatePath "docs") -Destination (Join-Path $candidateRoot "docs") | Out-Null
foreach ($candidateFile in @("LEIA-ME-TESTE.md", "release-candidate-manifest.json", "release-candidate-verification.json", "qa-latest.json")) {
  $source = Join-Path $candidatePath $candidateFile
  $destination = Join-Path $candidateRoot $candidateFile
  if (Copy-FileIfExists -Source $source -Destination $destination) {
    $copied.Add($destination)
  } else {
    $missing.Add($source)
  }
}

$betaDecision = if ([bool]$releaseStatus.qaTechnicalPass -and -not [string]::IsNullOrWhiteSpace($qaZipPath)) {
  "BETA-INTERNAL-OK"
} else {
  "BETA-INTERNAL-BLOCKED"
}

$manifest = [pscustomobject]@{
  generatedAt              = (Get-Date).ToString("o")
  handoffName              = $handoffName
  betaDecision             = $betaDecision
  publicReleaseStatus      = [string]$releaseStatus.overallStatus
  candidateName            = $candidateName
  candidatePath            = $candidatePath
  qaTechnicalPass          = [bool]$releaseStatus.qaTechnicalPass
  manualDecision           = [string]$releaseStatus.manualDecision
  p0Passed                 = [int]$releaseStatus.p0Passed
  p0Total                  = [int]$releaseStatus.p0Total
  unsignedInstallerCount   = [int]$releaseStatus.unsignedInstallerCount
  qaPortableZip            = $qaZipPath
  qaPortableZipSha256      = [string]$releaseStatus.latestManualQaPortableZipSha256
  copied                   = @($copied)
  missing                  = @($missing | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  publicReleaseBlockers    = @($releaseStatus.blockers)
  nextCommandAfterVm       = 'npm run qa:manual:receive -- -EvidenceDropPath "C:\Temp\HermesQA"'
}

$manifestPath = Join-Path $handoffRoot "beta-handoff-manifest.json"
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

$blockersMarkdown = (@($releaseStatus.blockers) | ForEach-Object { "- $_" }) -join "`r`n"
if ([string]::IsNullOrWhiteSpace($blockersMarkdown)) {
  $blockersMarkdown = "- Nenhum bloqueio publico ativo."
}

$readme = @"
# Hermes Optimizer - Beta Interno

Decisao beta interna: **$betaDecision**

Status de release publico: **$($releaseStatus.overallStatus)**

Este pacote e para teste controlado. Ele nao e um lancamento publico enquanto QA manual em maquina limpa e assinatura Authenticode nao fecharem.

## O que este pacote contem

- release-candidate/: instaladores NSIS/MSI, manifesto, verificacao e docs do RC.
- qa-portatil/: ZIP para VM/maquina limpa, .sha256 e manifesto.
- evidencias/: status de release, QA tecnico, QA manual e doctor do pacote.
- assinatura/: preflight de assinatura e candidatos de certificado.

## Bloqueios para release publico

$blockersMarkdown

## Como testar o beta interno

1. Abra `qa-portatil`.
2. Copie o ZIP hermes-manual-qa-portable-*.zip para uma VM ou maquina Windows limpa.
3. Extraia e rode:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\VERIFY-QA-PACKAGE.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\RUN-INSTALL-SMOKE.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\RUN-MANUAL-QA-EVIDENCE.ps1
~~~

4. Copie a pasta HermesQA da VM para o host, por exemplo C:\Temp\HermesQA.
5. No projeto, rode:

~~~powershell
$($manifest.nextCommandAfterVm)
~~~

## Regra de publicacao

- Pode usar para beta interno controlado se o pacote QA estiver OK.
- Nao publicar em site/loja enquanto os instaladores estiverem NotSigned.
- Nao vender como release oficial antes de npm run release:status retornar GO.
"@

$readmePath = Join-Path $handoffRoot "LEIA-ME-BETA-INTERNO.md"
$readme | Set-Content -LiteralPath $readmePath -Encoding UTF8

$zipPath = Join-Path $OutputRoot "$handoffName.zip"
Compress-Archive -Path (Join-Path $handoffRoot "*") -DestinationPath $zipPath -Force
$zipItem = Get-Item -LiteralPath $zipPath
$zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash
$zipShaPath = Join-Path $OutputRoot "$handoffName.zip.sha256"
"$zipHash *$($zipItem.Name)" | Set-Content -LiteralPath $zipShaPath -Encoding ASCII

$latest = [pscustomobject]@{
  generatedAt          = (Get-Date).ToString("o")
  handoffName          = $handoffName
  handoffRoot          = $handoffRoot
  handoffZipPath       = $zipPath
  handoffZipSha256Path = $zipShaPath
  handoffZipSha256     = $zipHash
  manifestPath         = $manifestPath
  readmePath           = $readmePath
  betaDecision         = $betaDecision
  publicReleaseStatus  = [string]$releaseStatus.overallStatus
  candidateName        = $candidateName
  qaPortableZip        = $qaZipPath
  qaPortableZipSha256  = [string]$releaseStatus.latestManualQaPortableZipSha256
  nextCommandAfterVm   = [string]$manifest.nextCommandAfterVm
}
$latestPath = Join-Path $OutputRoot "latest-beta-handoff.json"
$latest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $latestPath -Encoding UTF8

$latestMarkdownPath = Join-Path $OutputRoot "latest-beta-handoff.md"
$latestMarkdown = @"
# Hermes Latest Beta Handoff

- Beta: $handoffName
- Decisao beta interna: $betaDecision
- Release publico: $($releaseStatus.overallStatus)
- ZIP: $zipPath
- ZIP SHA256: $zipHash
- Manifesto: $manifestPath
- README: $readmePath

## Depois do teste na VM

~~~powershell
$($manifest.nextCommandAfterVm)
~~~
"@
$latestMarkdown | Set-Content -LiteralPath $latestMarkdownPath -Encoding UTF8

Write-Host ""
Write-Host "Pacote beta interno gerado:"
Write-Host "- $handoffRoot"
Write-Host "- $zipPath"
Write-Host "- $zipShaPath"
Write-Host "- $manifestPath"
Write-Host "- $readmePath"
Write-Host "- $latestPath"
Write-Host "- $latestMarkdownPath"
Write-Host "Decisao beta interna: $betaDecision"
Write-Host "Release publico: $($releaseStatus.overallStatus)"
