param(
  [string]$SessionPath,
  [string]$SessionsRoot,
  [switch]$AllowPending
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

$sessionJsonPath = Join-Path $SessionPath "manual-qa-session.json"
if (-not (Test-Path -LiteralPath $sessionJsonPath -PathType Leaf)) {
  throw "Arquivo manual-qa-session.json ausente: $sessionJsonPath"
}

$session = Get-Content -LiteralPath $sessionJsonPath -Raw | ConvertFrom-Json
$validStatuses = @("pending", "passed", "failed", "blocked", "skipped")
$items = @($session.items)
$failures = New-Object System.Collections.Generic.List[string]

foreach ($item in $items) {
  if ($validStatuses -notcontains [string]$item.status) {
    $failures.Add("Status invalido no item $($item.id): $($item.status)")
  }
  if ([string]::IsNullOrWhiteSpace([string]$item.priority)) {
    $failures.Add("Prioridade ausente no item $($item.id)")
  }
}

$p0Items = @($items | Where-Object { $_.priority -eq "P0" })
$p1Items = @($items | Where-Object { $_.priority -ne "P0" })
$p0Passed = @($p0Items | Where-Object { $_.status -eq "passed" })
$p0Pending = @($p0Items | Where-Object { $_.status -eq "pending" })
$p0Failed = @($p0Items | Where-Object { $_.status -eq "failed" -or $_.status -eq "blocked" })
$p0Skipped = @($p0Items | Where-Object { $_.status -eq "skipped" })
$p1PendingOrFailed = @($p1Items | Where-Object { $_.status -ne "passed" -and $_.status -ne "skipped" })

$installers = @($session.installers)
$unsignedInstallers = @($installers | Where-Object { $_.signatureStatus -ne "Valid" })

$manualDecision = "GO"
if ($failures.Count -gt 0 -or $p0Failed.Count -gt 0 -or $p0Skipped.Count -gt 0) {
  $manualDecision = "NO-GO"
} elseif ($p0Pending.Count -gt 0) {
  $manualDecision = "PENDING"
}

$publicDecision = $manualDecision
if ($unsignedInstallers.Count -gt 0) {
  $publicDecision = "NO-GO"
}

$summary = [pscustomobject]@{
  generatedAt             = (Get-Date).ToString("o")
  sessionPath             = (Resolve-Path $SessionPath).Path
  candidateName           = $session.candidateName
  version                 = $session.version
  tester                  = $session.tester
  manualDecision          = $manualDecision
  publicDecision          = $publicDecision
  allowPending            = [bool]$AllowPending
  totalItems              = $items.Count
  p0Total                 = $p0Items.Count
  p0Passed                = $p0Passed.Count
  p0Pending               = $p0Pending.Count
  p0FailedOrBlocked       = $p0Failed.Count
  p0Skipped               = $p0Skipped.Count
  p1PendingOrFailed       = $p1PendingOrFailed.Count
  unsignedInstallerCount  = $unsignedInstallers.Count
  failures                = @($failures)
  pendingP0Items          = @($p0Pending | ForEach-Object { $_.id })
  failedOrBlockedP0Items  = @($p0Failed | ForEach-Object { $_.id })
  skippedP0Items          = @($p0Skipped | ForEach-Object { $_.id })
  unsignedInstallers      = @($unsignedInstallers | ForEach-Object { $_.kind })
}

$summaryJsonPath = Join-Path $SessionPath "manual-qa-verification.json"
$summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $summaryJsonPath -Encoding UTF8

$pendingLines = if ($p0Pending.Count -gt 0) {
  ($p0Pending | ForEach-Object { "- PENDING [$($_.id)] $($_.title)" }) -join "`r`n"
} else {
  "- Nenhum P0 pendente."
}

$failedLines = if ($p0Failed.Count -gt 0) {
  ($p0Failed | ForEach-Object {
      $label = if ($_.status -eq "blocked") { "BLOCKED" } else { "FAIL" }
      "- $label [$($_.id)] $($_.title)"
    }) -join "`r`n"
} else {
  "- Nenhum P0 falhou/bloqueou."
}

$unsignedLines = if ($unsignedInstallers.Count -gt 0) {
  ($unsignedInstallers | ForEach-Object { "- $($_.kind.ToUpperInvariant()) Authenticode $($_.signatureStatus)" }) -join "`r`n"
} else {
  "- Todos os instaladores estao Valid."
}

$summaryMarkdown = @"
# Hermes Optimizer - Resultado QA Manual

Sessao: $($session.candidateName)
Tester: $($session.tester)
Manual: $manualDecision
Publico: $publicDecision

## Contagem

- P0 total: $($p0Items.Count)
- P0 aprovados: $($p0Passed.Count)
- P0 pendentes: $($p0Pending.Count)
- P0 falhou/bloqueou: $($p0Failed.Count)
- P0 ignorados: $($p0Skipped.Count)
- P1 pendentes/falhas: $($p1PendingOrFailed.Count)

## P0 pendentes

$pendingLines

## P0 falhou/bloqueou

$failedLines

## Assinatura

$unsignedLines
"@

$summaryMarkdownPath = Join-Path $SessionPath "manual-qa-summary.md"
$summaryMarkdown | Set-Content -LiteralPath $summaryMarkdownPath -Encoding UTF8

Write-Host "QA manual: $manualDecision"
Write-Host "Release publico: $publicDecision"
Write-Host "P0 aprovados: $($p0Passed.Count)/$($p0Items.Count)"
Write-Host "P0 pendentes: $($p0Pending.Count)"
Write-Host "P0 falhou/bloqueou: $($p0Failed.Count)"
Write-Host "Instaladores sem assinatura valida: $($unsignedInstallers.Count)"
Write-Host "Resumo: $summaryMarkdownPath"

if (-not $AllowPending -and ($manualDecision -ne "GO" -or $publicDecision -ne "GO")) {
  exit 1
}
