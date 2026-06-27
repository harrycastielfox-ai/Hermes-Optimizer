param(
  [string]$Version = "0.1.0",
  [string]$QaReportPath,
  [string]$OutputRoot
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($QaReportPath)) {
  $QaReportPath = Join-Path $root ".release\qa-latest.json"
}
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $root ".release\candidates"
}

if (-not (Test-Path -LiteralPath $QaReportPath -PathType Leaf)) {
  throw "Relatorio QA nao encontrado em $QaReportPath. Execute npm run qa:release antes de criar o pacote."
}

$qaReport = Get-Content -LiteralPath $QaReportPath -Raw | ConvertFrom-Json
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$candidateName = "hermes-optimizer-$Version-rc-$timestamp"
$candidateDir = Join-Path $OutputRoot $candidateName
$installersDir = Join-Path $candidateDir "installers"
$docsDir = Join-Path $candidateDir "docs"

New-Item -ItemType Directory -Force -Path $installersDir | Out-Null
New-Item -ItemType Directory -Force -Path $docsDir | Out-Null

$packagedInstallers = @()
foreach ($installer in @($qaReport.installers)) {
  if (-not $installer.exists) {
    throw "Instalador $($installer.kind) ausente no relatorio QA: $($installer.path)"
  }
  if (-not (Test-Path -LiteralPath $installer.path -PathType Leaf)) {
    throw "Instalador $($installer.kind) nao encontrado em disco: $($installer.path)"
  }

  $extension = [System.IO.Path]::GetExtension([string]$installer.path)
  $fileName = "Hermes-Optimizer-$Version-$($installer.kind)$extension"
  $destination = Join-Path $installersDir $fileName
  Copy-Item -LiteralPath $installer.path -Destination $destination -Force

  $packagedInstallers += [pscustomobject]@{
    kind            = $installer.kind
    fileName        = $fileName
    relativePath    = "installers/$fileName"
    sourcePath      = $installer.path
    lengthBytes     = (Get-Item -LiteralPath $destination).Length
    sha256          = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
    signatureStatus = $installer.signatureStatus
    signerSubject   = $installer.signerSubject
  }
}

$docSources = @(
  "docs\release-qa-checklist.md",
  "docs\relatorio-interno-release-0.1.0.md",
  "docs\build-assinado-windows.md"
)

foreach ($docSource in $docSources) {
  $sourcePath = Join-Path $root $docSource
  if (Test-Path -LiteralPath $sourcePath -PathType Leaf) {
    Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $docsDir ([System.IO.Path]::GetFileName($sourcePath))) -Force
  }
}

Copy-Item -LiteralPath $QaReportPath -Destination (Join-Path $candidateDir "qa-latest.json") -Force

$manifest = [pscustomobject]@{
  generatedAt    = (Get-Date).ToString("o")
  version        = $Version
  candidateName  = $candidateName
  technicalPass  = [bool]$qaReport.technicalPass
  releaseReady   = [bool]$qaReport.releaseReady
  publicDecision = if ($qaReport.releaseReady) { "GO" } else { "NO-GO" }
  installers     = $packagedInstallers
  manualBlockers = @($qaReport.manualBlockers)
  qaReport       = "qa-latest.json"
}

$manifestPath = Join-Path $candidateDir "release-candidate-manifest.json"
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

$installersMarkdown = ($packagedInstallers | ForEach-Object {
  '- `{0}` - SHA256 `{1}` - Authenticode `{2}`' -f $_.relativePath, $_.sha256, $_.signatureStatus
}) -join "`r`n"

$manualBlockersMarkdown = (@($qaReport.manualBlockers) | ForEach-Object { "- $_" }) -join "`r`n"

$readme = @"
# Hermes Optimizer $Version - Release Candidate

Decisao publica atual: **$($manifest.publicDecision)**

Este pacote foi gerado para validacao interna/manual. Se qualquer instalador estiver NotSigned, ele nao deve ser publicado como release oficial.

## Instaladores

$installersMarkdown

## Antes de testar

1. Use uma maquina limpa, VM descartavel ou ambiente controlado.
2. Instale primeiro o NSIS, depois repita com MSI se necessario.
3. Abra o Hermes pelo atalho normal e confirme o UAC de administrador.
4. Navegue por Dashboard, Otimizar, Anti-Cheat, Defender, Manutencao Programada e Configuracoes.
5. Execute Botao 1 em modo teste.
6. Reinicie quando o Hermes pedir.
7. Execute Botao 2 em modo teste, escolha Fate Trigger e confirme sucesso visual.
8. Nao considere release publica enquanto Authenticode estiver diferente de Valid.

## Bloqueios manuais ainda ativos

$manualBlockersMarkdown

## Evidencias

- qa-latest.json
- release-candidate-manifest.json
- docs/release-qa-checklist.md
- docs/relatorio-interno-release-0.1.0.md
- docs/build-assinado-windows.md
"@

$readme | Set-Content -LiteralPath (Join-Path $candidateDir "LEIA-ME-TESTE.md") -Encoding UTF8

Write-Host "Pacote RC criado: $candidateDir"
Write-Host "Decisao publica: $($manifest.publicDecision)"
foreach ($installer in $packagedInstallers) {
  Write-Host ("- {0}: {1} | {2}" -f $installer.kind.ToUpperInvariant(), $installer.fileName, $installer.signatureStatus)
}
