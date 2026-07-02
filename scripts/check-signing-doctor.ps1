param(
  [switch]$SkipRefresh,
  [switch]$Strict
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root ".release"
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

function Read-JsonOrNull {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return $null
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Invoke-DoctorStep {
  param(
    [string]$Name,
    [string]$ScriptPath,
    [string[]]$Arguments = @()
  )

  Write-Host "Hermes signing doctor: $Name"
  $output = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ScriptPath @Arguments 2>&1
  $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
  foreach ($line in @($output)) {
    Write-Host $line
  }

  return [pscustomobject]@{
    name = $Name
    script = $ScriptPath
    exitCode = $exitCode
    passed = ($exitCode -eq 0)
  }
}

function Add-ListOrEmpty {
  param(
    [System.Collections.Generic.List[string]]$Markdown,
    [array]$Items,
    [string]$Empty
  )

  if ($Items -and @($Items).Count -gt 0) {
    foreach ($item in @($Items)) {
      $Markdown.Add("- $item")
    }
  } else {
    $Markdown.Add("- $Empty")
  }
}

$steps = @()
if (-not $SkipRefresh) {
  $steps += Invoke-DoctorStep -Name "verificar segredos de assinatura" -ScriptPath (Join-Path $PSScriptRoot "verify-no-signing-secrets.ps1")
  $steps += Invoke-DoctorStep -Name "listar certificados Code Signing" -ScriptPath (Join-Path $PSScriptRoot "prepare-signing-certificate.ps1")
  $steps += Invoke-DoctorStep -Name "executar preflight Authenticode" -ScriptPath (Join-Path $PSScriptRoot "signing-preflight.ps1")
  $steps += Invoke-DoctorStep -Name "atualizar status de release" -ScriptPath (Join-Path $PSScriptRoot "release-status.ps1")
  $steps += Invoke-DoctorStep -Name "gerar handoff de assinatura" -ScriptPath (Join-Path $PSScriptRoot "create-signing-handoff.ps1") -Arguments @("-SkipRefresh")
}

$certReportPath = Join-Path $releaseDir "signing-certificate-candidates.json"
$preflightPath = Join-Path $releaseDir "signing-preflight.json"
$releaseStatusPath = Join-Path $releaseDir "release-status.json"
$handoffPath = Join-Path $releaseDir "signing-handoff.json"

$certReport = Read-JsonOrNull -Path $certReportPath
$preflight = Read-JsonOrNull -Path $preflightPath
$releaseStatus = Read-JsonOrNull -Path $releaseStatusPath
$handoff = Read-JsonOrNull -Path $handoffPath

$stepFailures = @($steps | Where-Object { -not [bool]$_.passed })
$readyCandidateCount = if ($certReport) { @($certReport.candidates | Where-Object { [bool]$_.readyForHermes }).Count } else { 0 }
$blockedCandidateCount = if ($certReport) { @($certReport.candidates | Where-Object { -not [bool]$_.readyForHermes }).Count } else { 0 }
$unsignedInstallerCount = if ($releaseStatus -and ($releaseStatus.PSObject.Properties.Name -contains "unsignedInstallerCount")) {
  [int]$releaseStatus.unsignedInstallerCount
} elseif ($preflight) {
  @($preflight.installers | Where-Object { [string]$_.signatureStatus -ne "Valid" }).Count
} else {
  0
}

$certificateReady = if ($certReport) { [bool]$certReport.readyToConfigure } else { $false }
$readyToSign = if ($preflight) { [bool]$preflight.readyToSign } else { $false }
$allInstallersSigned = if ($preflight) { [bool]$preflight.allInstallersSigned } else { $false }
$publicStatus = if ($releaseStatus -and ($releaseStatus.PSObject.Properties.Name -contains "publicStatus") -and -not [string]::IsNullOrWhiteSpace([string]$releaseStatus.publicStatus)) {
  [string]$releaseStatus.publicStatus
} elseif ($releaseStatus -and ($releaseStatus.PSObject.Properties.Name -contains "manualPublicDecision")) {
  [string]$releaseStatus.manualPublicDecision
} else {
  "UNKNOWN"
}
$overallStatus = if ($releaseStatus) { [string]$releaseStatus.overallStatus } else { "UNKNOWN" }
$thumbprintConfigured = -not [string]::IsNullOrWhiteSpace($env:HERMES_CERT_THUMBPRINT)
$pfxBase64Configured = -not [string]::IsNullOrWhiteSpace($env:HERMES_SIGNING_PFX_BASE64)
$pfxPasswordConfigured = -not [string]::IsNullOrWhiteSpace($env:HERMES_SIGNING_PFX_PASSWORD)

$blockers = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

foreach ($failure in $stepFailures) {
  $blockers.Add("Etapa '$($failure.name)' falhou com exit code $($failure.exitCode).")
}

if (-not $certReport) {
  $blockers.Add("Relatorio de certificados ausente: $certReportPath")
} else {
  foreach ($item in @($certReport.blockers)) {
    $blockers.Add("Certificado: $item")
  }
  foreach ($item in @($certReport.warnings)) {
    $warnings.Add("Certificado: $item")
  }
}

if (-not $preflight) {
  $blockers.Add("Preflight de assinatura ausente: $preflightPath")
} else {
  foreach ($item in @($preflight.blockers)) {
    $blockers.Add("Preflight: $item")
  }
  foreach ($item in @($preflight.warnings)) {
    $warnings.Add("Preflight: $item")
  }
}

if ($unsignedInstallerCount -gt 0) {
  $warnings.Add("$unsignedInstallerCount instalador(es) ainda sem Authenticode Valid.")
}

$status = if ($overallStatus -eq "GO" -and $publicStatus -eq "GO" -and $allInstallersSigned -and $blockers.Count -eq 0) {
  "GO"
} elseif ($readyToSign -and -not $allInstallersSigned) {
  "READY_TO_SIGN"
} elseif (-not $certificateReady -or -not $readyToSign) {
  "NEEDS_CERTIFICATE"
} else {
  "NEEDS_PUBLIC_GATE"
}

$nextCommands = New-Object System.Collections.Generic.List[string]
if ($status -eq "GO") {
  $nextCommands.Add("npm run release:public:package")
} elseif (-not $pfxBase64Configured -and -not $thumbprintConfigured -and -not $certificateReady) {
  $nextCommands.Add('npm run release:signing:import-pfx -- -PfxPath "C:\caminho\certificado-code-signing.pfx" -PfxPassword "SENHA_DO_PFX"')
} elseif ($pfxBase64Configured -and $pfxPasswordConfigured -and -not $readyToSign) {
  $nextCommands.Add("npm run release:signing:import-pfx")
} elseif ($certificateReady -and -not $readyToSign) {
  $nextCommands.Add(". .release/hermes-signing-env.ps1")
  $nextCommands.Add("npm run release:signing:preflight")
} elseif ($readyToSign -and -not $allInstallersSigned) {
  $nextCommands.Add("npm run release:public:pipeline:signed")
} else {
  $nextCommands.Add("npm run release:public:verify")
  $nextCommands.Add("npm run release:public:package")
}

$report = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  status = $status
  strict = [bool]$Strict
  overallStatus = $overallStatus
  publicStatus = $publicStatus
  certificateReady = $certificateReady
  readyToSign = $readyToSign
  allInstallersSigned = $allInstallersSigned
  readyCandidateCount = $readyCandidateCount
  blockedCandidateCount = $blockedCandidateCount
  unsignedInstallerCount = $unsignedInstallerCount
  thumbprintConfigured = $thumbprintConfigured
  pfxBase64Configured = $pfxBase64Configured
  pfxPasswordConfigured = $pfxPasswordConfigured
  signtoolPath = if ($preflight) { [string]$preflight.signtoolPath } else { $null }
  timestampUrl = if ($preflight) { [string]$preflight.timestampUrl } else { $null }
  steps = @($steps)
  blockers = @($blockers)
  warnings = @($warnings)
  nextCommands = @($nextCommands)
  reports = [pscustomobject]@{
    certificateCandidates = $certReportPath
    signingPreflight = $preflightPath
    signingHandoff = if ($handoff) { [string]$handoff.outputPath } else { Join-Path $releaseDir "signing-handoff.md" }
    releaseStatus = $releaseStatusPath
  }
}

$jsonPath = Join-Path $releaseDir "signing-doctor.json"
$mdPath = Join-Path $releaseDir "signing-doctor.md"
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# Hermes Signing Doctor")
$markdown.Add("")
$markdown.Add("- Status: **$($report.status)**")
$markdown.Add("- Release geral: $overallStatus")
$markdown.Add("- Release publico: $publicStatus")
$markdown.Add("- Certificado pronto: $(if ($certificateReady) { 'sim' } else { 'nao' })")
$markdown.Add("- Pronto para assinar: $(if ($readyToSign) { 'sim' } else { 'nao' })")
$markdown.Add("- Instaladores assinados: $(if ($allInstallersSigned) { 'sim' } else { 'nao' })")
$markdown.Add("- Instaladores sem Authenticode Valid: $unsignedInstallerCount")
$markdown.Add("- Certificados prontos encontrados: $readyCandidateCount")
$markdown.Add("- Certificados bloqueados encontrados: $blockedCandidateCount")
$markdown.Add("- HERMES_CERT_THUMBPRINT configurado: $(if ($thumbprintConfigured) { 'sim' } else { 'nao' })")
$markdown.Add("- HERMES_SIGNING_PFX_BASE64 configurado: $(if ($pfxBase64Configured) { 'sim' } else { 'nao' })")
$markdown.Add("- HERMES_SIGNING_PFX_PASSWORD configurado: $(if ($pfxPasswordConfigured) { 'sim' } else { 'nao' })")
$markdown.Add("")
$markdown.Add("## Bloqueios")
$markdown.Add("")
Add-ListOrEmpty -Markdown $markdown -Items @($blockers) -Empty "Nenhum bloqueio."
$markdown.Add("")
$markdown.Add("## Avisos")
$markdown.Add("")
Add-ListOrEmpty -Markdown $markdown -Items @($warnings) -Empty "Nenhum aviso."
$markdown.Add("")
$markdown.Add("## Proximos comandos")
$markdown.Add("")
$markdown.Add("~~~powershell")
foreach ($command in @($nextCommands)) {
  $markdown.Add($command)
}
$markdown.Add("~~~")
$markdown.Add("")
$markdown.Add("## Relatorios")
$markdown.Add("")
$markdown.Add("- JSON: ``$jsonPath``")
$markdown.Add("- Certificados: ``$certReportPath``")
$markdown.Add("- Preflight: ``$preflightPath``")
$markdown.Add("- Handoff: ``$(Join-Path $releaseDir 'signing-handoff.md')``")
$markdown.Add("- Release status: ``$releaseStatusPath``")
$markdown | Set-Content -LiteralPath $mdPath -Encoding UTF8

Write-Host ""
Write-Host "Hermes signing doctor: $status"
Write-Host "- Certificado pronto: $(if ($certificateReady) { 'sim' } else { 'nao' })"
Write-Host "- Pronto para assinar: $(if ($readyToSign) { 'sim' } else { 'nao' })"
Write-Host "- Instaladores sem Authenticode Valid: $unsignedInstallerCount"
Write-Host "- Relatorio: $jsonPath"
Write-Host "- Resumo: $mdPath"
Write-Host "- Proximo comando: $($nextCommands[0])"

if ($Strict -and $status -ne "GO") {
  exit 1
}

if ($stepFailures.Count -gt 0) {
  exit 1
}
