param(
  [string[]]$Group = @(),
  [string[]]$ItemId = @(),

  [ValidateSet("passed", "failed", "blocked", "skipped")]
  [string]$Status = "passed",

  [string]$Evidence = "",
  [string]$Notes = "",
  [string]$SessionPath,
  [string]$SessionsRoot,
  [switch]$AllowOverwrite,
  [switch]$AllowProtected,
  [switch]$ConfirmBulkPass,
  [switch]$Preview
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

if ([string]::IsNullOrWhiteSpace($Evidence)) {
  throw "Informe -Evidence com uma evidencia curta e real do teste executado."
}

if ($Status -eq "passed" -and -not $ConfirmBulkPass) {
  throw "Aprovacao em lote exige -ConfirmBulkPass para evitar aprovar QA sem revisao real."
}

$sessionJsonPath = Join-Path $SessionPath "manual-qa-session.json"
if (-not (Test-Path -LiteralPath $sessionJsonPath -PathType Leaf)) {
  throw "Arquivo manual-qa-session.json ausente: $sessionJsonPath"
}

$session = Get-Content -LiteralPath $sessionJsonPath -Raw | ConvertFrom-Json
$items = @($session.items)
$protectedItems = @("install-nsis", "install-msi", "authenticode")
$groupMap = @{
  "visual-navigation" = @("normal-window", "sidebar-routes", "scroll")
  "optimize-flow" = @(
    "dashboard-read-only",
    "phase2-locked",
    "prepare-test",
    "restart-gate",
    "optimize-test-fate",
    "safe-mode-no-real-change"
  )
  "secondary-screens" = @("defender-page", "scheduled-maintenance", "settings-language")
  "all-p0-non-install" = @(
    "normal-window",
    "sidebar-routes",
    "scroll",
    "dashboard-read-only",
    "phase2-locked",
    "prepare-test",
    "restart-gate",
    "optimize-test-fate",
    "safe-mode-no-real-change"
  )
  "all-non-protected" = @(
    "normal-window",
    "sidebar-routes",
    "scroll",
    "dashboard-read-only",
    "phase2-locked",
    "prepare-test",
    "restart-gate",
    "optimize-test-fate",
    "safe-mode-no-real-change",
    "defender-page",
    "scheduled-maintenance",
    "settings-language"
  )
}

$requestedIds = New-Object System.Collections.Generic.List[string]
foreach ($groupName in $Group) {
  if (-not $groupMap.ContainsKey($groupName)) {
    $validGroups = ($groupMap.Keys | Sort-Object) -join ", "
    throw "Grupo desconhecido '$groupName'. Grupos validos: $validGroups"
  }

  foreach ($id in @($groupMap[$groupName])) {
    $requestedIds.Add($id)
  }
}

foreach ($id in $ItemId) {
  if (-not [string]::IsNullOrWhiteSpace($id)) {
    $requestedIds.Add($id)
  }
}

$targetIds = @($requestedIds | Select-Object -Unique)
if ($targetIds.Count -eq 0) {
  throw "Informe -Group e/ou -ItemId. Exemplo: npm run qa:manual:bulk -- -Group visual-navigation -Status passed -Evidence `"Validado em VM`" -ConfirmBulkPass"
}

$updated = New-Object System.Collections.Generic.List[string]
$skipped = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

foreach ($id in $targetIds) {
  $target = $items | Where-Object { $_.id -eq $id } | Select-Object -First 1
  if (-not $target) {
    $warnings.Add("Item desconhecido ignorado: $id")
    continue
  }

  if (($protectedItems -contains $id) -and -not $AllowProtected) {
    $skipped.Add("$id protegido; use install smoke/sync ou -AllowProtected conscientemente.")
    continue
  }

  if ($target.status -eq "passed" -and -not $AllowOverwrite) {
    $skipped.Add("$id ja passed")
    continue
  }

  if (-not $Preview) {
    $target.status = $Status
    $target.evidence = "QA em lote: $Evidence"
    if (-not [string]::IsNullOrWhiteSpace($Notes)) {
      $target.notes = $Notes
    }
  }

  $updated.Add("$id -> $Status")
}

$updatedAt = (Get-Date).ToString("o")
if (-not $Preview) {
  $session.status = "in-progress"
  if ($session.PSObject.Properties.Name -contains "updatedAt") {
    $session.updatedAt = $updatedAt
  } else {
    $session | Add-Member -NotePropertyName "updatedAt" -NotePropertyValue $updatedAt
  }
  $session | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $sessionJsonPath -Encoding UTF8
}

$report = [pscustomobject]@{
  generatedAt = $updatedAt
  preview     = [bool]$Preview
  sessionPath = (Resolve-Path $SessionPath).Path
  status      = $Status
  groups      = @($Group)
  itemIds     = @($targetIds)
  updated     = @($updated)
  skipped     = @($skipped)
  warnings    = @($warnings)
}

$reportPath = Join-Path $SessionPath "manual-qa-bulk-result.json"
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding UTF8

Write-Host "QA manual em lote: $(if ($Preview) { 'PREVIEW' } else { 'APLICADO' })"
Write-Host "Sessao: $SessionPath"
Write-Host "Atualizados: $($updated.Count)"
foreach ($line in $updated) {
  Write-Host "- $line"
}
if ($skipped.Count -gt 0) {
  Write-Host "Ignorados: $($skipped.Count)"
  foreach ($line in $skipped) {
    Write-Host "- $line"
  }
}
if ($warnings.Count -gt 0) {
  Write-Host "Avisos: $($warnings.Count)"
  foreach ($line in $warnings) {
    Write-Host "- $line"
  }
}
Write-Host "Relatorio: $reportPath"

if (-not $Preview) {
  $verifyScript = Join-Path $PSScriptRoot "verify-manual-qa-session.ps1"
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verifyScript -SessionPath $SessionPath -AllowPending
  exit $LASTEXITCODE
}
