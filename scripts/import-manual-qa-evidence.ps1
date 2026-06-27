param(
  [string]$EvidencePath,
  [string]$SessionPath,
  [string]$SessionsRoot,
  [switch]$AllowOverwrite,
  [switch]$AllowWithoutInstallSmoke,
  [switch]$SkipSync
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($SessionsRoot)) {
  $SessionsRoot = Join-Path $root ".release\manual-qa"
}

if ([string]::IsNullOrWhiteSpace($SessionPath)) {
  if (-not (Test-Path -LiteralPath $SessionsRoot -PathType Container)) {
    throw "Pasta de sessoes de QA manual nao encontrada: $SessionsRoot"
  }

  $latestSession = Get-ChildItem -LiteralPath $SessionsRoot -Directory |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $latestSession) {
    throw "Nenhuma sessao de QA manual encontrada. Execute npm run qa:manual:new primeiro."
  }

  $SessionPath = $latestSession.FullName
}

if (-not (Test-Path -LiteralPath $SessionPath -PathType Container)) {
  throw "Sessao de QA manual nao encontrada: $SessionPath"
}

if ([string]::IsNullOrWhiteSpace($EvidencePath)) {
  $latestEvidence = Get-ChildItem -LiteralPath $SessionPath -Recurse -Filter "manual-qa-evidence.json" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $latestEvidence) {
    throw "manual-qa-evidence.json nao encontrado em $SessionPath. Copie o arquivo gerado na VM para esta sessao ou informe -EvidencePath."
  }

  $EvidencePath = $latestEvidence.FullName
}

if (-not (Test-Path -LiteralPath $EvidencePath -PathType Leaf)) {
  throw "Arquivo de evidencia manual nao encontrado: $EvidencePath"
}

if (-not $SkipSync) {
  $syncScript = Join-Path $PSScriptRoot "sync-manual-qa-automated.ps1"
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $syncScript -SessionPath $SessionPath | Out-Host
}

$sessionJsonPath = Join-Path $SessionPath "manual-qa-session.json"
if (-not (Test-Path -LiteralPath $sessionJsonPath -PathType Leaf)) {
  throw "Arquivo manual-qa-session.json ausente: $sessionJsonPath"
}

$session = Get-Content -LiteralPath $sessionJsonPath -Raw | ConvertFrom-Json
$evidence = Get-Content -LiteralPath $EvidencePath -Raw | ConvertFrom-Json
$items = @($session.items)
$evidenceItems = @($evidence.items)
$validStatuses = @("pending", "passed", "failed", "blocked", "skipped")
$protectedItems = @("install-nsis", "install-msi", "authenticode")

if ([string]$evidence.candidateName -ne [string]$session.candidateName) {
  throw "Evidencia pertence a outro RC. Evidencia=$($evidence.candidateName); Sessao=$($session.candidateName)"
}

$installNsis = $items | Where-Object { $_.id -eq "install-nsis" } | Select-Object -First 1
$installMsi = $items | Where-Object { $_.id -eq "install-msi" } | Select-Object -First 1
if (-not $AllowWithoutInstallSmoke -and (($installNsis.status -ne "passed") -or ($installMsi.status -ne "passed"))) {
  throw "Importacao bloqueada: rode o install smoke em VM/maquina limpa e sincronize ate install-nsis/install-msi ficarem passed. Use -AllowWithoutInstallSmoke apenas para debug interno."
}

$updated = New-Object System.Collections.Generic.List[string]
$skipped = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$sourceLabel = "Manual QA VM"
if (-not [string]::IsNullOrWhiteSpace([string]$evidence.computerName)) {
  $sourceLabel += " $($evidence.computerName)"
}
if (-not [string]::IsNullOrWhiteSpace([string]$evidence.generatedAt)) {
  $sourceLabel += " em $($evidence.generatedAt)"
}

foreach ($entry in $evidenceItems) {
  $itemId = [string]$entry.id
  $status = [string]$entry.status

  if ([string]::IsNullOrWhiteSpace($itemId)) {
    $warnings.Add("Entrada sem id ignorada.")
    continue
  }

  if ($protectedItems -contains $itemId) {
    $skipped.Add("$itemId protegido")
    continue
  }

  if ($validStatuses -notcontains $status) {
    $warnings.Add("Status invalido em ${itemId}: $status")
    continue
  }

  if ($status -eq "pending") {
    $skipped.Add("$itemId pending")
    continue
  }

  $target = $items | Where-Object { $_.id -eq $itemId } | Select-Object -First 1
  if (-not $target) {
    $warnings.Add("Item desconhecido ignorado: $itemId")
    continue
  }

  if ($target.status -eq "passed" -and -not $AllowOverwrite) {
    $skipped.Add("$itemId ja passed")
    continue
  }

  $entryEvidence = [string]$entry.evidence
  if ([string]::IsNullOrWhiteSpace($entryEvidence)) {
    $entryEvidence = "Confirmado em VM/maquina limpa."
  }

  $target.status = $status
  $target.evidence = "${sourceLabel}: $entryEvidence"
  $target.notes = [string]$entry.notes
  $updated.Add("$itemId -> $status")
}

$session.status = "in-progress"
$updatedAt = (Get-Date).ToString("o")
if ($session.PSObject.Properties.Name -contains "updatedAt") {
  $session.updatedAt = $updatedAt
} else {
  $session | Add-Member -NotePropertyName "updatedAt" -NotePropertyValue $updatedAt
}
$session | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $sessionJsonPath -Encoding UTF8

$importReport = [pscustomobject]@{
  generatedAt  = $updatedAt
  sessionPath  = (Resolve-Path $SessionPath).Path
  evidencePath = (Resolve-Path $EvidencePath).Path
  updated      = @($updated)
  skipped      = @($skipped)
  warnings     = @($warnings)
}
$importReportPath = Join-Path $SessionPath "manual-qa-import-result.json"
$importReport | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $importReportPath -Encoding UTF8

Write-Host "Evidencia manual importada."
Write-Host "Atualizados: $($updated.Count)"
foreach ($line in $updated) {
  Write-Host "- $line"
}
if ($warnings.Count -gt 0) {
  Write-Host "Avisos: $($warnings.Count)"
  foreach ($warning in $warnings) {
    Write-Host "- $warning"
  }
}
Write-Host "Relatorio: $importReportPath"

$verifyScript = Join-Path $PSScriptRoot "verify-manual-qa-session.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verifyScript -SessionPath $SessionPath -AllowPending
exit $LASTEXITCODE
