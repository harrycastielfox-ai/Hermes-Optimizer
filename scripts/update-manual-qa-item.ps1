param(
  [Parameter(Mandatory = $true)]
  [string]$ItemId,

  [Parameter(Mandatory = $true)]
  [ValidateSet("pending", "passed", "failed", "blocked", "skipped")]
  [string]$Status,

  [string]$Evidence = "",
  [string]$Notes = "",
  [string]$SessionPath,
  [string]$SessionsRoot
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
$items = @($session.items)
$target = $items | Where-Object { $_.id -eq $ItemId } | Select-Object -First 1

if (-not $target) {
  $knownIds = ($items | ForEach-Object { $_.id }) -join ", "
  throw "Item de QA '$ItemId' nao encontrado. Itens validos: $knownIds"
}

$target.status = $Status
if (-not [string]::IsNullOrWhiteSpace($Evidence)) {
  $target.evidence = $Evidence
}
if (-not [string]::IsNullOrWhiteSpace($Notes)) {
  $target.notes = $Notes
}

$session.status = "in-progress"
$updatedAt = (Get-Date).ToString("o")
if ($session.PSObject.Properties.Name -contains "updatedAt") {
  $session.updatedAt = $updatedAt
} else {
  $session | Add-Member -NotePropertyName "updatedAt" -NotePropertyValue $updatedAt
}
$session | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $sessionJsonPath -Encoding UTF8

Write-Host "Item atualizado: $ItemId -> $Status"
Write-Host "Sessao: $SessionPath"

$verifyScript = Join-Path $PSScriptRoot "verify-manual-qa-session.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verifyScript -SessionPath $SessionPath -AllowPending
exit $LASTEXITCODE
