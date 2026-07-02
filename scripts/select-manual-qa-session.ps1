param(
  [string]$SessionPath,
  [string]$Name,
  [switch]$Best,
  [switch]$Clear,
  [string]$SessionsRoot
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($SessionsRoot)) {
  $SessionsRoot = Join-Path $root ".release\manual-qa"
}

$activePath = Join-Path $SessionsRoot "active-manual-qa-session.json"
$activeMarkdownPath = Join-Path $SessionsRoot "active-manual-qa-session.md"

function Read-JsonFileOrNull {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return $null
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Get-ManualQaSessionInfo {
  param([System.IO.DirectoryInfo]$Directory)

  $sessionPath = Join-Path $Directory.FullName "manual-qa-session.json"
  if (-not (Test-Path -LiteralPath $sessionPath -PathType Leaf)) {
    return $null
  }

  $session = Read-JsonFileOrNull -Path $sessionPath
  $verification = Read-JsonFileOrNull -Path (Join-Path $Directory.FullName "manual-qa-verification.json")
  $items = @($session.items)
  $p0Items = @($items | Where-Object { $_.priority -eq "P0" })
  $p0Passed = @($p0Items | Where-Object { $_.status -eq "passed" }).Count
  $p0Pending = @($p0Items | Where-Object { $_.status -eq "pending" }).Count
  $p0FailedOrBlocked = @($p0Items | Where-Object { $_.status -eq "failed" -or $_.status -eq "blocked" }).Count

  if ($verification) {
    $p0Passed = [int]$verification.p0Passed
    $p0Pending = [int]$verification.p0Pending
    $p0FailedOrBlocked = [int]$verification.p0FailedOrBlocked
  }

  return [pscustomobject]@{
    name = $Directory.Name
    path = $Directory.FullName
    candidateName = [string]$session.candidateName
    version = [string]$session.version
    tester = [string]$session.tester
    p0Total = $p0Items.Count
    p0Passed = $p0Passed
    p0Pending = $p0Pending
    p0FailedOrBlocked = $p0FailedOrBlocked
    manualDecision = if ($verification) { [string]$verification.manualDecision } else { $null }
    publicDecision = if ($verification) { [string]$verification.publicDecision } else { $null }
    lastWriteTime = $Directory.LastWriteTime.ToString("o")
  }
}

if ($Clear) {
  Remove-Item -LiteralPath $activePath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $activeMarkdownPath -Force -ErrorAction SilentlyContinue
  Write-Host "Sessao QA ativa removida. O Hermes voltara a usar a sessao mais recente."
  exit 0
}

if (-not (Test-Path -LiteralPath $SessionsRoot -PathType Container)) {
  throw "Pasta de sessoes de QA manual nao encontrada: $SessionsRoot"
}

$sessions = @(Get-ChildItem -LiteralPath $SessionsRoot -Directory | ForEach-Object { Get-ManualQaSessionInfo -Directory $_ } | Where-Object { $_ })
if ($sessions.Count -eq 0) {
  throw "Nenhuma sessao de QA manual encontrada em $SessionsRoot."
}

$selected = $null
if (-not [string]::IsNullOrWhiteSpace($SessionPath)) {
  $resolved = (Resolve-Path -LiteralPath $SessionPath).Path
  $selected = $sessions | Where-Object { $_.path -eq $resolved } | Select-Object -First 1
  if (-not $selected) {
    throw "Sessao informada nao encontrada na raiz de QA: $resolved"
  }
} elseif (-not [string]::IsNullOrWhiteSpace($Name)) {
  $selected = $sessions | Where-Object { $_.name -eq $Name } | Select-Object -First 1
  if (-not $selected) {
    throw "Sessao com nome '$Name' nao encontrada."
  }
} elseif ($Best) {
  $selected = $sessions |
    Sort-Object @{ Expression = "p0Passed"; Descending = $true },
      @{ Expression = "p0FailedOrBlocked"; Descending = $false },
      @{ Expression = "p0Pending"; Descending = $false },
      @{ Expression = "lastWriteTime"; Descending = $true } |
    Select-Object -First 1
} else {
  $selected = $sessions |
    Sort-Object @{ Expression = "lastWriteTime"; Descending = $true } |
    Select-Object -First 1
}

$record = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  sessionName = $selected.name
  sessionPath = $selected.path
  candidateName = $selected.candidateName
  version = $selected.version
  p0Passed = $selected.p0Passed
  p0Total = $selected.p0Total
  p0Pending = $selected.p0Pending
  p0FailedOrBlocked = $selected.p0FailedOrBlocked
  manualDecision = $selected.manualDecision
  publicDecision = $selected.publicDecision
  availableSessions = @($sessions)
}

$record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $activePath -Encoding UTF8

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# Hermes Active Manual QA Session")
$markdown.Add("")
$markdown.Add("- Sessao ativa: ``$($record.sessionName)``")
$markdown.Add("- Caminho: ``$($record.sessionPath)``")
$markdown.Add("- Candidate: $($record.candidateName)")
$markdown.Add("- P0: $($record.p0Passed)/$($record.p0Total)")
$markdown.Add("- Pendentes: $($record.p0Pending)")
$markdown.Add("- Falhou/bloqueou: $($record.p0FailedOrBlocked)")
$markdown.Add("")
$markdown.Add("## Sessoes disponiveis")
$markdown.Add("")
foreach ($session in @($sessions | Sort-Object @{ Expression = "p0Passed"; Descending = $true }, @{ Expression = "lastWriteTime"; Descending = $true })) {
  $markdown.Add("- ``$($session.name)`` - P0 $($session.p0Passed)/$($session.p0Total), pendentes $($session.p0Pending), bloqueados $($session.p0FailedOrBlocked)")
}

$markdown | Set-Content -LiteralPath $activeMarkdownPath -Encoding UTF8

Write-Host "Sessao QA ativa selecionada:"
Write-Host "- $($record.sessionName)"
Write-Host "- P0 $($record.p0Passed)/$($record.p0Total)"
Write-Host "- $($record.sessionPath)"
Write-Host "Resumo: $activeMarkdownPath"
