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

$createScript = Join-Path $PSScriptRoot "create-beta-handoff.ps1"
$verifyScript = Join-Path $PSScriptRoot "verify-beta-handoff.ps1"

$createArgs = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $createScript,
  "-OutputRoot", $OutputRoot
)
if ($SkipDoctor) {
  $createArgs += "-SkipDoctor"
}

Write-Host ""
Write-Host "== Gerando beta interno =="
& powershell.exe @createArgs | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao gerar beta interno."
}

$latestPath = Join-Path $OutputRoot "latest-beta-handoff.json"
if (-not (Test-Path -LiteralPath $latestPath -PathType Leaf)) {
  throw "Ponteiro latest do beta nao encontrado: $latestPath"
}

$latest = Get-Content -LiteralPath $latestPath -Raw | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace([string]$latest.handoffRoot)) {
  throw "Ponteiro latest do beta nao contem handoffRoot."
}

Write-Host ""
Write-Host "== Verificando beta interno =="
& powershell.exe `
  -NoProfile `
  -ExecutionPolicy Bypass `
  -File $verifyScript `
  -BetaPath ([string]$latest.handoffRoot) | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao verificar beta interno."
}

$verificationPath = Join-Path ([string]$latest.handoffRoot) "beta-handoff-verification.json"
$verification = if (Test-Path -LiteralPath $verificationPath -PathType Leaf) {
  Get-Content -LiteralPath $verificationPath -Raw | ConvertFrom-Json
} else {
  $null
}

$summary = [pscustomobject]@{
  generatedAt          = (Get-Date).ToString("o")
  status               = if ($verification) { [string]$verification.status } else { "UNKNOWN" }
  betaDecision         = [string]$latest.betaDecision
  publicReleaseStatus  = [string]$latest.publicReleaseStatus
  handoffName          = [string]$latest.handoffName
  handoffRoot          = [string]$latest.handoffRoot
  handoffZipPath       = [string]$latest.handoffZipPath
  handoffZipSha256     = [string]$latest.handoffZipSha256
  verificationPath     = if ($verification) { $verificationPath } else { $null }
  nextCommandAfterVm   = [string]$latest.nextCommandAfterVm
}

$readyPath = Join-Path $OutputRoot "latest-beta-ready.json"
$summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $readyPath -Encoding UTF8

$readyMarkdownPath = Join-Path $OutputRoot "latest-beta-ready.md"
$readyMarkdown = @"
# Hermes Beta Interno Pronto

- Status: $($summary.status)
- Beta: $($summary.handoffName)
- Decisao beta interna: $($summary.betaDecision)
- Release publico: $($summary.publicReleaseStatus)
- ZIP: $($summary.handoffZipPath)
- ZIP SHA256: $($summary.handoffZipSha256)
- Verificacao: $($summary.verificationPath)

## Depois do teste na VM

~~~powershell
$($summary.nextCommandAfterVm)
~~~
"@
$readyMarkdown | Set-Content -LiteralPath $readyMarkdownPath -Encoding UTF8

Write-Host ""
Write-Host "Beta interno pronto."
Write-Host "Status: $($summary.status)"
Write-Host "ZIP: $($summary.handoffZipPath)"
Write-Host "SHA256: $($summary.handoffZipSha256)"
Write-Host "Resumo: $readyMarkdownPath"
Write-Host "JSON: $readyPath"
