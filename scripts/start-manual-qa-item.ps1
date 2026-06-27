param(
  [string]$ItemId,
  [string]$SessionPath,
  [string]$SessionsRoot,
  [switch]$Launch
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

$sessionJsonPath = Join-Path $SessionPath "manual-qa-session.json"
if (-not (Test-Path -LiteralPath $sessionJsonPath -PathType Leaf)) {
  throw "Arquivo manual-qa-session.json ausente: $sessionJsonPath"
}

$session = Get-Content -LiteralPath $sessionJsonPath -Raw | ConvertFrom-Json
$items = @($session.items)

if ([string]::IsNullOrWhiteSpace($ItemId)) {
  $next = $items | Where-Object { $_.priority -eq "P0" -and $_.status -eq "pending" } | Select-Object -First 1
  if (-not $next) {
    $next = $items | Where-Object { $_.status -eq "pending" } | Select-Object -First 1
  }
  if (-not $next) {
    throw "Nenhum item pendente encontrado nesta sessao."
  }
  $ItemId = $next.id
}

$item = $items | Where-Object { $_.id -eq $ItemId } | Select-Object -First 1
if (-not $item) {
  $knownIds = ($items | ForEach-Object { $_.id }) -join ", "
  throw "Item de QA '$ItemId' nao encontrado. Itens validos: $knownIds"
}

$candidatePath = [string]$session.candidatePath
if ([string]::IsNullOrWhiteSpace($candidatePath) -or -not (Test-Path -LiteralPath $candidatePath -PathType Container)) {
  throw "Release candidate da sessao nao encontrado: $candidatePath"
}

$targetPath = $null
$action = "review"

switch ($ItemId) {
  "install-nsis" {
    $installer = @($session.installers | Where-Object { $_.kind -eq "nsis" } | Select-Object -First 1)
    $targetPath = Join-Path $candidatePath $installer.relativePath
    $action = "launch-installer"
  }
  "install-msi" {
    $installer = @($session.installers | Where-Object { $_.kind -eq "msi" } | Select-Object -First 1)
    $targetPath = Join-Path $candidatePath $installer.relativePath
    $action = "launch-installer"
  }
  default {
    $targetPath = Join-Path $SessionPath "manual-qa-checklist.md"
    $action = "open-checklist"
  }
}

if (-not (Test-Path -LiteralPath $targetPath -PathType Leaf)) {
  throw "Alvo do QA nao encontrado: $targetPath"
}

$passCommand = 'npm run qa:manual:item -- -ItemId {0} -Status passed -Evidence "DESCREVA A EVIDENCIA"' -f $ItemId
$failCommand = 'npm run qa:manual:item -- -ItemId {0} -Status failed -Evidence "DESCREVA A FALHA"' -f $ItemId
$blockCommand = 'npm run qa:manual:item -- -ItemId {0} -Status blocked -Evidence "DESCREVA O BLOQUEIO"' -f $ItemId

Write-Host "Sessao: $SessionPath"
Write-Host "Release candidate: $candidatePath"
Write-Host "Item: [$($item.priority)] $($item.id) - $($item.title)"
Write-Host "Esperado: $($item.expected)"
Write-Host "Acao: $action"
Write-Host "Alvo: $targetPath"
Write-Host ""
Write-Host "Comandos para concluir:"
Write-Host $passCommand
Write-Host $failCommand
Write-Host $blockCommand

if ($Launch) {
  Write-Host ""
  Write-Host "Abrindo alvo..."
  Start-Process -FilePath $targetPath
} else {
  Write-Host ""
  Write-Host "Modo seguro: nada foi aberto. Use -Launch para abrir o alvo."
}
