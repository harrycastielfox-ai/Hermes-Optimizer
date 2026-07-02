param(
  [string]$OutputPath,
  [switch]$SkipRefresh
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

function Add-SectionList {
  param(
    [System.Collections.Generic.List[string]]$Markdown,
    [array]$Items,
    [string]$EmptyText
  )

  if ($Items -and $Items.Count -gt 0) {
    foreach ($item in $Items) {
      $Markdown.Add("- $item")
    }
  } else {
    $Markdown.Add("- $EmptyText")
  }
}

if (-not $SkipRefresh) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "prepare-signing-certificate.ps1")
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "signing-preflight.ps1")
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "release-status.ps1")
}

$certReportPath = Join-Path $releaseDir "signing-certificate-candidates.json"
$preflightPath = Join-Path $releaseDir "signing-preflight.json"
$releaseStatusPath = Join-Path $releaseDir "release-status.json"

$certReport = Read-JsonOrNull -Path $certReportPath
$preflight = Read-JsonOrNull -Path $preflightPath
$releaseStatus = Read-JsonOrNull -Path $releaseStatusPath

if (-not $certReport) {
  throw "Relatorio de certificados ausente. Rode npm run release:signing:certs."
}

if (-not $preflight) {
  throw "Preflight de assinatura ausente. Rode npm run release:signing:preflight."
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path $releaseDir "signing-handoff.md"
}

$jsonPath = [System.IO.Path]::ChangeExtension($OutputPath, ".json")
$readyCandidates = @($certReport.candidates | Where-Object { [bool]$_.readyForHermes })
$blockedCandidates = @($certReport.candidates | Where-Object { -not [bool]$_.readyForHermes })
$installerReports = @($preflight.installers)
$unsignedInstallers = @($installerReports | Where-Object { [string]$_.signatureStatus -ne "Valid" })

$handoff = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  publicReleaseStatus = if ($releaseStatus) { [string]$releaseStatus.publicStatus } else { $null }
  readyToConfigure = [bool]$certReport.readyToConfigure
  readyToSign = [bool]$preflight.readyToSign
  allInstallersSigned = [bool]$preflight.allInstallersSigned
  readyCandidateCount = $readyCandidates.Count
  blockedCandidateCount = $blockedCandidates.Count
  unsignedInstallerCount = $unsignedInstallers.Count
  timestampUrl = [string]$preflight.timestampUrl
  signtoolPath = [string]$preflight.signtoolPath
  certificateBlockers = @($certReport.blockers)
  signingBlockers = @($preflight.blockers)
  warnings = @(@($certReport.warnings) + @($preflight.warnings))
  outputPath = $OutputPath
  jsonPath = $jsonPath
}

$handoff | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# Hermes Signing Handoff")
$markdown.Add("")
$markdown.Add("Este arquivo resume exatamente o que falta para assinar os instaladores do Hermes.")
$markdown.Add("")
$markdown.Add("## Status atual")
$markdown.Add("")
$markdown.Add("- Pronto para configurar certificado: **$(if ($handoff.readyToConfigure) { 'SIM' } else { 'NAO' })**")
$markdown.Add("- Pronto para assinar: **$(if ($handoff.readyToSign) { 'SIM' } else { 'NAO' })**")
$markdown.Add("- Instaladores assinados: **$(if ($handoff.allInstallersSigned) { 'SIM' } else { 'NAO' })**")
$markdown.Add("- Certificados prontos encontrados: $($handoff.readyCandidateCount)")
$markdown.Add("- Certificados bloqueados encontrados: $($handoff.blockedCandidateCount)")
$markdown.Add("- Instaladores sem Authenticode Valid: $($handoff.unsignedInstallerCount)")
$markdown.Add("- SignTool: $(if ($handoff.signtoolPath) { $handoff.signtoolPath } else { 'nao encontrado' })")
$markdown.Add("- Timestamp: $($handoff.timestampUrl)")
$markdown.Add("")
$markdown.Add("## Bloqueios de certificado")
$markdown.Add("")
Add-SectionList -Markdown $markdown -Items @($handoff.certificateBlockers) -EmptyText "Nenhum bloqueio de certificado."
$markdown.Add("")
$markdown.Add("## Bloqueios de assinatura")
$markdown.Add("")
Add-SectionList -Markdown $markdown -Items @($handoff.signingBlockers) -EmptyText "Nenhum bloqueio de assinatura."
$markdown.Add("")
$markdown.Add("## Avisos")
$markdown.Add("")
Add-SectionList -Markdown $markdown -Items @($handoff.warnings) -EmptyText "Nenhum aviso."
$markdown.Add("")
$markdown.Add("## Certificado que o Hermes precisa")
$markdown.Add("")
$markdown.Add("- Tipo: Code Signing/Authenticode para Windows desktop.")
$markdown.Add("- Deve aparecer em `Cert:\CurrentUser\My` ou `Cert:\LocalMachine\My`.")
$markdown.Add("- Deve ter chave privada disponivel no Windows.")
$markdown.Add("- Deve ter Enhanced Key Usage de `Code Signing`.")
$markdown.Add("- Nao pode estar expirado.")
$markdown.Add("- O thumbprint SHA1 sera usado em `HERMES_CERT_THUMBPRINT`.")
$markdown.Add("")
$markdown.Add("## Certificados locais encontrados")
$markdown.Add("")
if ($certReport.candidates.Count -gt 0) {
  foreach ($candidate in $certReport.candidates) {
    $status = if ([bool]$candidate.readyForHermes) { "READY" } else { "BLOCKED" }
    $thumbprint = [string]($candidate.thumbprint)
    $subject = [string]($candidate.subject)
    $store = [string]($candidate.store)
    $hasPrivateKey = [string]($candidate.hasPrivateKey)
    $usage = [string]($candidate.usage)
    $notAfter = [string]($candidate.notAfter)
    $markdown.Add("- $status | ``$thumbprint`` | $subject | Store=$store | PrivateKey=$hasPrivateKey | Usage=$usage | Expires=$notAfter")
  }
} else {
  $markdown.Add("- Nenhum certificado local encontrado.")
}
$markdown.Add("")
$markdown.Add("## Instaladores atuais")
$markdown.Add("")
foreach ($installer in $installerReports) {
  $markdown.Add("- $($installer.kind.ToUpperInvariant()): $($installer.signatureStatus) | SHA256=$($installer.sha256) | $($installer.path)")
}
$markdown.Add("")
$markdown.Add("## Fluxo quando o certificado estiver pronto")
$markdown.Add("")
$markdown.Add("~~~powershell")
$markdown.Add('npm run release:signing:import-pfx -- -PfxPath "C:\caminho\certificado-code-signing.pfx" -PfxPassword "SENHA_DO_PFX"')
$markdown.Add(". .release/hermes-signing-env.ps1")
$markdown.Add("npm run release:signing:certs")
$markdown.Add('$env:HERMES_TIMESTAMP_URL = "http://timestamp.digicert.com"')
$markdown.Add("npm run release:signing:preflight")
$markdown.Add("npm run build:windows:real:signed")
$markdown.Add("npm run release:status")
$markdown.Add("~~~")
$markdown.Add("")
$markdown.Add("## Fluxo via GitHub Actions")
$markdown.Add("")
$markdown.Add("- Configure `HERMES_SIGNING_PFX_BASE64` e `HERMES_SIGNING_PFX_PASSWORD` nos secrets do repositorio.")
$markdown.Add("- Rode o workflow `Release Windows Signed`.")
$markdown.Add("- O workflow chama `npm run release:signing:import-pfx`, define o thumbprint e bloqueia publicacao se Authenticode nao ficar `Valid`.")
$markdown.Add("")
$markdown.Add("## Observacao")
$markdown.Add("")
$markdown.Add("Os certificados locais com `Usage=Unknown` nao devem ser usados para release publico. Eles podem existir por outros motivos no Windows, mas nao substituem um certificado Code Signing real.")

$markdown | Set-Content -LiteralPath $OutputPath -Encoding UTF8

Write-Host "Signing handoff gerado:"
Write-Host "- $OutputPath"
Write-Host "- $jsonPath"
Write-Host "Pronto para assinar: $(if ($handoff.readyToSign) { 'SIM' } else { 'NAO' })"
Write-Host "Instaladores sem assinatura valida: $($handoff.unsignedInstallerCount)"
