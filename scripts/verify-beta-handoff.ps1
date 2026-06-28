param(
  [string]$BetaPath,
  [string]$BetaRoot
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($BetaRoot)) {
  $BetaRoot = Join-Path $root ".release\beta-handoff"
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

function Resolve-LatestHandoffDirectory {
  param([string]$RootPath)

  if (-not (Test-Path -LiteralPath $RootPath -PathType Container)) {
    throw "Pasta de beta handoff nao encontrada: $RootPath"
  }

  $latest = Get-ChildItem -LiteralPath $RootPath -Directory -Filter "hermes-beta-interno-*" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $latest) {
    throw "Nenhum beta handoff encontrado em $RootPath. Rode npm run release:beta:handoff."
  }

  return $latest.FullName
}

if ([string]::IsNullOrWhiteSpace($BetaPath)) {
  $BetaPath = Resolve-LatestHandoffDirectory -RootPath $BetaRoot
}

$handoffRoot = $null
$handoffZipPath = $null

if (Test-Path -LiteralPath $BetaPath -PathType Container) {
  $handoffRoot = (Resolve-Path -LiteralPath $BetaPath).Path
  $handoffZipPath = "$handoffRoot.zip"
} elseif (Test-Path -LiteralPath $BetaPath -PathType Leaf) {
  $handoffZipPath = (Resolve-Path -LiteralPath $BetaPath).Path
  $handoffRoot = Join-Path (Split-Path -Parent $handoffZipPath) ([System.IO.Path]::GetFileNameWithoutExtension($handoffZipPath))
} else {
  throw "Beta handoff nao encontrado: $BetaPath"
}

$failures = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$checks = New-Object System.Collections.Generic.List[string]

if (-not (Test-Path -LiteralPath $handoffRoot -PathType Container)) {
  Add-Finding -List $failures -Message "Pasta do beta handoff ausente: $handoffRoot"
}

if (-not (Test-Path -LiteralPath $handoffZipPath -PathType Leaf)) {
  Add-Finding -List $failures -Message "ZIP do beta handoff ausente: $handoffZipPath"
}

$manifestPath = Join-Path $handoffRoot "beta-handoff-manifest.json"
$readmePath = Join-Path $handoffRoot "LEIA-ME-BETA-INTERNO.md"
$testerGuidePath = Join-Path $handoffRoot "GUIA-TESTADOR-BETA.md"
$manifest = $null

if (Test-Path -LiteralPath $manifestPath -PathType Leaf) {
  $manifest = Read-JsonFile -Path $manifestPath
  $checks.Add("Manifesto do beta encontrado.")
} else {
  Add-Finding -List $failures -Message "Manifesto do beta ausente: $manifestPath"
}

if (Test-Path -LiteralPath $readmePath -PathType Leaf) {
  $readme = Get-Content -LiteralPath $readmePath -Raw
  if ($readme -notmatch "Beta Interno") {
    Add-Finding -List $failures -Message "LEIA-ME-BETA-INTERNO.md nao identifica o pacote como beta interno."
  }
  if ($readme -notmatch "nao e um lancamento publico") {
    Add-Finding -List $failures -Message "LEIA-ME-BETA-INTERNO.md nao deixa claro que nao e release publico."
  }
  $checks.Add("README beta encontrado e identificado.")
} else {
  Add-Finding -List $failures -Message "README beta ausente: $readmePath"
}

if (Test-Path -LiteralPath $testerGuidePath -PathType Leaf) {
  $testerGuide = Get-Content -LiteralPath $testerGuidePath -Raw
  if ($testerGuide -notmatch "Guia do Testador") {
    Add-Finding -List $failures -Message "GUIA-TESTADOR-BETA.md nao identifica o arquivo como guia do testador."
  }
  if ($testerGuide -notmatch "RUN-INSTALL-SMOKE.ps1") {
    Add-Finding -List $failures -Message "GUIA-TESTADOR-BETA.md nao instrui o smoke de instalacao."
  }
  if ($testerGuide -notmatch "RUN-MANUAL-QA-EVIDENCE.ps1") {
    Add-Finding -List $failures -Message "GUIA-TESTADOR-BETA.md nao instrui a coleta de evidencia manual."
  }
  if ($testerGuide -notmatch "modo teste") {
    Add-Finding -List $failures -Message "GUIA-TESTADOR-BETA.md nao deixa claro o comportamento esperado em modo teste."
  }
  $checks.Add("Guia do testador encontrado e validado.")
} else {
  Add-Finding -List $failures -Message "Guia do testador ausente: $testerGuidePath"
}

foreach ($requiredDirectory in @("release-candidate", "qa-portatil", "evidencias", "assinatura")) {
  $path = Join-Path $handoffRoot $requiredDirectory
  if (Test-Path -LiteralPath $path -PathType Container) {
    $checks.Add("Diretorio obrigatorio OK: $requiredDirectory")
  } else {
    Add-Finding -List $failures -Message "Diretorio obrigatorio ausente: $requiredDirectory"
  }
}

foreach ($requiredFile in @(
  "evidencias\release-status.json",
  "evidencias\release-status.md",
  "evidencias\manual-qa-package-doctor.json",
  "evidencias\manual-qa-package-doctor.md",
  "assinatura\signing-preflight.json",
  "assinatura\signing-certificate-candidates.json",
  "release-candidate\release-candidate-manifest.json",
  "release-candidate\release-candidate-verification.json",
  "release-candidate\qa-latest.json",
  "release-candidate\LEIA-ME-TESTE.md"
)) {
  $path = Join-Path $handoffRoot $requiredFile
  if (Test-Path -LiteralPath $path -PathType Leaf) {
    $checks.Add("Arquivo obrigatorio OK: $requiredFile")
  } else {
    Add-Finding -List $failures -Message "Arquivo obrigatorio ausente: $requiredFile"
  }
}

$handoffZipHash = $null
if (Test-Path -LiteralPath $handoffZipPath -PathType Leaf) {
  $handoffZipHash = (Get-FileHash -LiteralPath $handoffZipPath -Algorithm SHA256).Hash
  $handoffZipShaPath = "$handoffZipPath.sha256"
  if (-not (Test-Path -LiteralPath $handoffZipShaPath -PathType Leaf)) {
    Add-Finding -List $failures -Message "Arquivo .sha256 do beta ausente: $handoffZipShaPath"
  } else {
    $shaText = Get-Content -LiteralPath $handoffZipShaPath -Raw
    if (-not $shaText.Contains($handoffZipHash)) {
      Add-Finding -List $failures -Message "Arquivo .sha256 do beta nao contem o hash atual do ZIP."
    } else {
      $checks.Add("SHA256 do ZIP beta OK.")
    }
  }
}

$qaZip = Get-ChildItem -LiteralPath (Join-Path $handoffRoot "qa-portatil") -File -Filter "hermes-manual-qa-portable-*.zip" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
$qaManifestFile = Get-ChildItem -LiteralPath (Join-Path $handoffRoot "qa-portatil") -File -Filter "hermes-manual-qa-portable-*-manifest.json" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $qaZip) {
  Add-Finding -List $failures -Message "ZIP QA portatil ausente dentro do beta."
}
if (-not $qaManifestFile) {
  Add-Finding -List $failures -Message "Manifesto QA portatil ausente dentro do beta."
}

$qaZipHash = $null
if ($qaZip) {
  $qaZipHash = (Get-FileHash -LiteralPath $qaZip.FullName -Algorithm SHA256).Hash
  $qaShaPath = "$($qaZip.FullName).sha256"
  if (-not (Test-Path -LiteralPath $qaShaPath -PathType Leaf)) {
    Add-Finding -List $failures -Message "Arquivo .sha256 do QA portatil ausente dentro do beta."
  } else {
    $qaShaText = Get-Content -LiteralPath $qaShaPath -Raw
    if (-not $qaShaText.Contains($qaZipHash)) {
      Add-Finding -List $failures -Message "Arquivo .sha256 do QA portatil nao contem o hash atual."
    } else {
      $checks.Add("SHA256 do QA portatil OK.")
    }
  }
}

if ($qaManifestFile -and $qaZipHash) {
  $qaManifest = Read-JsonFile -Path $qaManifestFile.FullName
  if ([string]$qaManifest.zipSha256 -ne $qaZipHash) {
    Add-Finding -List $failures -Message "Hash do QA portatil diverge do manifesto copiado no beta."
  } else {
    $checks.Add("Manifesto do QA portatil confere com ZIP copiado.")
  }
}

$candidateManifestPath = Join-Path $handoffRoot "release-candidate\release-candidate-manifest.json"
$candidateManifest = if (Test-Path -LiteralPath $candidateManifestPath -PathType Leaf) {
  Read-JsonFile -Path $candidateManifestPath
} else {
  $null
}

if ($candidateManifest) {
  foreach ($installer in @($candidateManifest.installers)) {
    $installerPath = Join-Path (Join-Path $handoffRoot "release-candidate") ([string]$installer.relativePath)
    if (-not (Test-Path -LiteralPath $installerPath -PathType Leaf)) {
      Add-Finding -List $failures -Message "Instalador ausente no beta: $($installer.relativePath)"
      continue
    }

    $installerFile = Get-Item -LiteralPath $installerPath
    $installerHash = (Get-FileHash -LiteralPath $installerPath -Algorithm SHA256).Hash
    $signature = Get-AuthenticodeSignature -LiteralPath $installerPath
    if ($installerFile.Length -ne [int64]$installer.lengthBytes) {
      Add-Finding -List $failures -Message "Tamanho divergente em $($installer.fileName)."
    }
    if ($installerHash -ne [string]$installer.sha256) {
      Add-Finding -List $failures -Message "SHA256 divergente em $($installer.fileName)."
    }
    if ([string]$signature.Status -ne [string]$installer.signatureStatus) {
      Add-Finding -List $failures -Message "Authenticode divergente em $($installer.fileName)."
    }
  }
  $checks.Add("Instaladores do RC conferidos contra manifesto.")
}

if ($manifest) {
  if ([string]$manifest.betaDecision -ne "BETA-INTERNAL-OK") {
    Add-Finding -List $warnings -Message "Decisao beta interna nao esta OK: $($manifest.betaDecision)"
  }
  if ([string]$manifest.publicReleaseStatus -eq "GO") {
    Add-Finding -List $warnings -Message "Pacote beta aponta release publico GO; confirme se ainda faz sentido gerar beta separado."
  }
  if (@($manifest.missing).Count -gt 0) {
    Add-Finding -List $failures -Message "Manifesto do beta registrou arquivos ausentes: $(@($manifest.missing) -join '; ')"
  }
}

$status = if ($failures.Count -gt 0) { "FAILED" } else { "OK" }
$verification = [pscustomobject]@{
  generatedAt       = (Get-Date).ToString("o")
  status            = $status
  handoffRoot       = $handoffRoot
  handoffZipPath    = $handoffZipPath
  handoffZipSha256  = $handoffZipHash
  packageName       = if ($manifest) { [string]$manifest.handoffName } else { $null }
  betaDecision      = if ($manifest) { [string]$manifest.betaDecision } else { $null }
  publicReleaseStatus = if ($manifest) { [string]$manifest.publicReleaseStatus } else { $null }
  qaPortableZip     = if ($qaZip) { $qaZip.FullName } else { $null }
  qaPortableZipSha256 = $qaZipHash
  checks            = @($checks)
  failures          = @($failures)
  warnings          = @($warnings)
}

$jsonPath = Join-Path $handoffRoot "beta-handoff-verification.json"
$mdPath = Join-Path $handoffRoot "beta-handoff-verification.md"
$verification | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# Hermes Beta Handoff Verification")
$markdown.Add("")
$markdown.Add("- Status: **$status**")
$markdown.Add("- Pacote: $($verification.packageName)")
$markdown.Add("- Beta: $($verification.betaDecision)")
$markdown.Add("- Release publico: $($verification.publicReleaseStatus)")
$markdown.Add("- ZIP: $handoffZipPath")
$markdown.Add("- ZIP SHA256: $handoffZipHash")
$markdown.Add("")
$markdown.Add("## Falhas")
$markdown.Add("")
if ($failures.Count -gt 0) {
  foreach ($failure in $failures) {
    $markdown.Add("- $failure")
  }
} else {
  $markdown.Add("- Nenhuma falha encontrada.")
}
$markdown.Add("")
$markdown.Add("## Avisos")
$markdown.Add("")
if ($warnings.Count -gt 0) {
  foreach ($warning in $warnings) {
    $markdown.Add("- $warning")
  }
} else {
  $markdown.Add("- Nenhum aviso ativo.")
}
$markdown.Add("")
$markdown.Add("## Checks")
$markdown.Add("")
foreach ($check in $checks) {
  $markdown.Add("- $check")
}
$markdown | Set-Content -LiteralPath $mdPath -Encoding UTF8

Write-Host "Hermes beta handoff verification: $status"
Write-Host "ZIP: $handoffZipPath"
Write-Host "SHA256: $handoffZipHash"
Write-Host "Relatorio: $jsonPath"
Write-Host "Resumo: $mdPath"

if ($failures.Count -gt 0) {
  exit 1
}
