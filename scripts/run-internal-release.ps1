param(
  [string]$Version = "0.1.0",
  [switch]$SkipQa,
  [switch]$SkipManualSession,
  [switch]$SkipSigningPreflight,
  [switch]$SkipReleaseStatus
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$qaScript = Join-Path $PSScriptRoot "qa-release.ps1"
$createCandidateScript = Join-Path $PSScriptRoot "create-release-candidate.ps1"
$verifyCandidateScript = Join-Path $PSScriptRoot "verify-release-candidate.ps1"
$newManualQaScript = Join-Path $PSScriptRoot "new-manual-qa-session.ps1"
$manualQaStatusScript = Join-Path $PSScriptRoot "verify-manual-qa-session.ps1"
$signingPreflightScript = Join-Path $PSScriptRoot "signing-preflight.ps1"
$releaseStatusScript = Join-Path $PSScriptRoot "release-status.ps1"

function Invoke-HermesStep {
  param(
    [string]$Name,
    [scriptblock]$Script
  )

  Write-Host ""
  Write-Host "== $Name ==" -ForegroundColor Cyan
  & $Script
  if ($LASTEXITCODE -ne 0) {
    throw "Etapa falhou: $Name"
  }
}

Push-Location $root
try {
  if (-not $SkipQa) {
    Invoke-HermesStep "QA automatizado de release" {
      & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $qaScript
    }
  } else {
    Write-Host "QA automatizado de release: pulado por -SkipQa." -ForegroundColor Yellow
  }

  Invoke-HermesStep "Criar release candidate interno" {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $createCandidateScript -Version $Version
  }

  Invoke-HermesStep "Verificar release candidate interno" {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verifyCandidateScript
  }

  if (-not $SkipManualSession) {
    Invoke-HermesStep "Criar sessao de QA manual" {
      & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $newManualQaScript
    }
  } else {
    Write-Host "Sessao de QA manual: pulada por -SkipManualSession." -ForegroundColor Yellow
  }

  Invoke-HermesStep "Resumo da sessao de QA manual" {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $manualQaStatusScript -AllowPending
  }

  if (-not $SkipSigningPreflight) {
    Invoke-HermesStep "Preflight de assinatura" {
      & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $signingPreflightScript
    }
  } else {
    Write-Host "Preflight de assinatura: pulado por -SkipSigningPreflight." -ForegroundColor Yellow
  }

  if (-not $SkipReleaseStatus) {
    Invoke-HermesStep "Status consolidado de release" {
      & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $releaseStatusScript
    }
  } else {
    Write-Host "Status consolidado de release: pulado por -SkipReleaseStatus." -ForegroundColor Yellow
  }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Esteira interna concluida." -ForegroundColor Green
Write-Host "Resultado publico permanece condicionado a Authenticode Valid, certificado pronto e QA manual P0 aprovado."
