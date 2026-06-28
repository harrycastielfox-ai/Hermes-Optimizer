param(
  [string]$BetaRoot
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseRoot = Join-Path $root ".release"
if ([string]::IsNullOrWhiteSpace($BetaRoot)) {
  $BetaRoot = Join-Path $releaseRoot "beta-handoff"
}

function Read-JsonFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "JSON nao encontrado: $Path"
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Add-Message {
  param(
    [System.Collections.Generic.List[string]]$List,
    [string]$Message
  )

  $List.Add($Message)
}

$failures = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$checks = New-Object System.Collections.Generic.List[string]

$latestReadyPath = Join-Path $BetaRoot "latest-beta-ready.json"
$releaseStatusPath = Join-Path $releaseRoot "release-status.json"

$latestReady = $null
$releaseStatus = $null

if (Test-Path -LiteralPath $latestReadyPath -PathType Leaf) {
  $latestReady = Read-JsonFile -Path $latestReadyPath
  Add-Message -List $checks -Message "Ponteiro latest-beta-ready.json encontrado."
} else {
  Add-Message -List $failures -Message "Ponteiro latest-beta-ready.json ausente. Rode npm run release:beta."
}

if (Test-Path -LiteralPath $releaseStatusPath -PathType Leaf) {
  $releaseStatus = Read-JsonFile -Path $releaseStatusPath
  Add-Message -List $checks -Message "release-status.json encontrado."
} else {
  Add-Message -List $failures -Message "release-status.json ausente. Rode npm run release:status."
}

$handoffRoot = if ($latestReady) { [string]$latestReady.handoffRoot } else { $null }
$handoffZipPath = if ($latestReady) { [string]$latestReady.handoffZipPath } else { $null }
$verificationPath = if ($latestReady) { [string]$latestReady.verificationPath } else { $null }

if ($latestReady) {
  if ([string]$latestReady.status -ne "OK") {
    Add-Message -List $failures -Message "Beta mais recente nao esta OK: $($latestReady.status)"
  } else {
    Add-Message -List $checks -Message "Status do beta mais recente esta OK."
  }

  if ([string]$latestReady.betaDecision -ne "BETA-INTERNAL-OK") {
    Add-Message -List $failures -Message "Decisao beta interna nao esta OK: $($latestReady.betaDecision)"
  } else {
    Add-Message -List $checks -Message "Decisao beta interna OK."
  }

  if ([string]$latestReady.publicReleaseStatus -eq "GO") {
    Add-Message -List $warnings -Message "Release publico ja aparece como GO; confirme se ainda faz sentido enviar como beta separado."
  } else {
    Add-Message -List $checks -Message "Pacote deixa claro que nao e release publico final."
  }

  if ([string]$latestReady.nextCommandAfterVm -notmatch "qa:manual:receive") {
    Add-Message -List $failures -Message "Comando de retorno da VM nao aponta para qa:manual:receive."
  } else {
    Add-Message -List $checks -Message "Comando de retorno da VM configurado."
  }
}

if ([string]::IsNullOrWhiteSpace($handoffRoot) -or -not (Test-Path -LiteralPath $handoffRoot -PathType Container)) {
  Add-Message -List $failures -Message "Pasta do beta handoff ausente: $handoffRoot"
} else {
  Add-Message -List $checks -Message "Pasta do beta handoff encontrada."
}

if ([string]::IsNullOrWhiteSpace($handoffZipPath) -or -not (Test-Path -LiteralPath $handoffZipPath -PathType Leaf)) {
  Add-Message -List $failures -Message "ZIP do beta handoff ausente: $handoffZipPath"
} else {
  $zipHash = (Get-FileHash -LiteralPath $handoffZipPath -Algorithm SHA256).Hash
  if ($latestReady -and [string]$latestReady.handoffZipSha256 -ne $zipHash) {
    Add-Message -List $failures -Message "SHA256 do ZIP beta diverge do latest-beta-ready.json."
  } else {
    Add-Message -List $checks -Message "SHA256 do ZIP beta confere."
  }
}

$verification = $null
if ([string]::IsNullOrWhiteSpace($verificationPath) -or -not (Test-Path -LiteralPath $verificationPath -PathType Leaf)) {
  Add-Message -List $failures -Message "Verificacao do beta ausente: $verificationPath"
} else {
  $verification = Read-JsonFile -Path $verificationPath
  if ([string]$verification.status -ne "OK") {
    Add-Message -List $failures -Message "Verificacao do beta nao esta OK: $($verification.status)"
  } else {
    Add-Message -List $checks -Message "Verificacao do beta esta OK."
  }

  if (@($verification.failures).Count -gt 0) {
    Add-Message -List $failures -Message "Verificacao do beta possui falhas registradas."
  }
}

if (-not [string]::IsNullOrWhiteSpace($handoffRoot) -and (Test-Path -LiteralPath $handoffRoot -PathType Container)) {
  $testerGuidePath = Join-Path $handoffRoot "GUIA-TESTADOR-BETA.md"
  $readmePath = Join-Path $handoffRoot "LEIA-ME-BETA-INTERNO.md"

  if (Test-Path -LiteralPath $testerGuidePath -PathType Leaf) {
    $testerGuide = Get-Content -LiteralPath $testerGuidePath -Raw
    foreach ($requiredText in @("VERIFY-QA-PACKAGE.ps1", "RUN-INSTALL-SMOKE.ps1", "RUN-MANUAL-QA-EVIDENCE.ps1", "HermesQA", "modo teste")) {
      if ($testerGuide -notmatch [regex]::Escape($requiredText)) {
        Add-Message -List $failures -Message "Guia do testador nao contem: $requiredText"
      }
    }
    Add-Message -List $checks -Message "Guia do testador pronto."
  } else {
    Add-Message -List $failures -Message "GUIA-TESTADOR-BETA.md ausente."
  }

  if (Test-Path -LiteralPath $readmePath -PathType Leaf) {
    $readme = Get-Content -LiteralPath $readmePath -Raw
    if ($readme -notmatch "nao e um lancamento publico") {
      Add-Message -List $failures -Message "README beta nao reforca que nao e release publico."
    } else {
      Add-Message -List $checks -Message "README beta reforca escopo interno."
    }
  } else {
    Add-Message -List $failures -Message "LEIA-ME-BETA-INTERNO.md ausente."
  }

  foreach ($directory in @("release-candidate", "qa-portatil", "evidencias", "assinatura")) {
    $path = Join-Path $handoffRoot $directory
    if (Test-Path -LiteralPath $path -PathType Container) {
      Add-Message -List $checks -Message "Diretorio obrigatorio presente: $directory"
    } else {
      Add-Message -List $failures -Message "Diretorio obrigatorio ausente: $directory"
    }
  }
}

if ($verification) {
  if ([string]::IsNullOrWhiteSpace([string]$verification.qaPortableZip) -or -not (Test-Path -LiteralPath ([string]$verification.qaPortableZip) -PathType Leaf)) {
    Add-Message -List $failures -Message "ZIP QA portatil ausente no beta."
  } else {
    Add-Message -List $checks -Message "ZIP QA portatil presente no beta."
  }
}

if ($releaseStatus) {
  if (-not [bool]$releaseStatus.qaTechnicalPass) {
    Add-Message -List $failures -Message "QA tecnico nao passou; beta nao deve sair."
  } else {
    Add-Message -List $checks -Message "QA tecnico passou."
  }

  if ([string]$releaseStatus.overallStatus -eq "GO") {
    Add-Message -List $warnings -Message "release-status esta GO; revise se o beta ainda deve ser marcado como interno."
  } else {
    Add-Message -List $checks -Message "release-status permanece NO-GO publico, como esperado antes de assinatura/QA manual."
  }

  foreach ($blocker in @($releaseStatus.blockers)) {
    Add-Message -List $warnings -Message "Bloqueio publico preservado: $blocker"
  }
}

$status = if ($failures.Count -gt 0) { "FAILED" } else { "READY_TO_SEND" }
$result = [pscustomobject]@{
  generatedAt         = (Get-Date).ToString("o")
  status              = $status
  betaPackage         = if ($latestReady) { [string]$latestReady.handoffName } else { $null }
  betaZipPath         = $handoffZipPath
  betaZipSha256       = if ($latestReady) { [string]$latestReady.handoffZipSha256 } else { $null }
  betaDecision        = if ($latestReady) { [string]$latestReady.betaDecision } else { $null }
  publicReleaseStatus = if ($latestReady) { [string]$latestReady.publicReleaseStatus } else { $null }
  nextCommandAfterVm  = if ($latestReady) { [string]$latestReady.nextCommandAfterVm } else { $null }
  checks              = @($checks)
  warnings            = @($warnings)
  failures            = @($failures)
}

New-Item -ItemType Directory -Force -Path $BetaRoot | Out-Null
$jsonPath = Join-Path $BetaRoot "beta-ready-to-send.json"
$mdPath = Join-Path $BetaRoot "beta-ready-to-send.md"
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# Hermes Beta Ready To Send")
$markdown.Add("")
$markdown.Add("- Status: **$status**")
$markdown.Add("- Beta: $($result.betaPackage)")
$markdown.Add("- Decisao beta: $($result.betaDecision)")
$markdown.Add("- Release publico: $($result.publicReleaseStatus)")
$markdown.Add("- ZIP: $($result.betaZipPath)")
$markdown.Add("- ZIP SHA256: $($result.betaZipSha256)")
$markdown.Add("")
$markdown.Add("## Comando apos retorno da VM")
$markdown.Add("")
$markdown.Add("~~~powershell")
$markdown.Add([string]$result.nextCommandAfterVm)
$markdown.Add("~~~")
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

Write-Host "Hermes beta ready-to-send: $status"
Write-Host "Resumo: $mdPath"
Write-Host "JSON: $jsonPath"

if ($failures.Count -gt 0) {
  exit 1
}
