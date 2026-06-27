param(
  [string]$SessionPath,
  [string]$SessionsRoot,
  [ValidateSet("P0", "P1", "all")]
  [string]$Priority = "P0",
  [ValidateSet("pending", "failed", "blocked", "skipped", "all")]
  [string]$Status = "pending",
  [switch]$All
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

$filtered = @($items | Where-Object {
    ($Priority -eq "all" -or $_.priority -eq $Priority) -and
    ($Status -eq "all" -or $_.status -eq $Status)
  })

if ($filtered.Count -eq 0 -and $Priority -eq "P0" -and $Status -eq "pending") {
  $filtered = @($items | Where-Object { $_.priority -ne "P0" -and $_.status -eq "pending" })
}

if ($filtered.Count -eq 0) {
  Write-Host "Nenhum item encontrado para Priority=$Priority Status=$Status."
  Write-Host "Sessao: $SessionPath"
  exit 0
}

$selectedItems = if ($All) { $filtered } else { @($filtered | Select-Object -First 1) }
$nextMarkdownPath = Join-Path $SessionPath "manual-qa-next.md"
$markdown = New-Object System.Collections.Generic.List[string]

$markdown.Add("# Proximo QA Manual")
$markdown.Add("")
$markdown.Add("- Sessao: $($session.candidateName)")
$markdown.Add("- Caminho: $SessionPath")
$markdown.Add("- Filtro: prioridade $Priority, status $Status")
$markdown.Add("")

Write-Host "Sessao: $SessionPath"
Write-Host "Itens encontrados: $($filtered.Count)"

foreach ($item in $selectedItems) {
  $passCommand = 'npm run qa:manual:item -- -ItemId {0} -Status passed -Evidence "DESCREVA A EVIDENCIA"' -f $item.id
  $failCommand = 'npm run qa:manual:item -- -ItemId {0} -Status failed -Evidence "DESCREVA A FALHA"' -f $item.id
  $blockCommand = 'npm run qa:manual:item -- -ItemId {0} -Status blocked -Evidence "DESCREVA O BLOQUEIO"' -f $item.id
  $startCommand = 'npm run qa:manual:start -- -ItemId {0}' -f $item.id
  $launchCommand = 'npm run qa:manual:start -- -ItemId {0} -Launch' -f $item.id

  Write-Host ""
  Write-Host "[$($item.priority)] $($item.id) - $($item.title)"
  Write-Host "Area: $($item.area)"
  Write-Host "Esperado: $($item.expected)"
  Write-Host "Marcar passou:"
  Write-Host $passCommand
  Write-Host "Preparar alvo:"
  Write-Host $startCommand

  $markdown.Add("## [$($item.priority)] $($item.id) - $($item.title)")
  $markdown.Add("")
  $markdown.Add("- Area: $($item.area)")
  $markdown.Add("- Status atual: $($item.status)")
  $markdown.Add("- Esperado: $($item.expected)")
  $markdown.Add("")
  $markdown.Add("### Preparar alvo")
  $markdown.Add("")
  $markdown.Add("~~~powershell")
  $markdown.Add($startCommand)
  $markdown.Add($launchCommand)
  $markdown.Add("~~~")
  $markdown.Add("")
  $markdown.Add("### Marcar resultado")
  $markdown.Add("")
  $markdown.Add("~~~powershell")
  $markdown.Add($passCommand)
  $markdown.Add($failCommand)
  $markdown.Add($blockCommand)
  $markdown.Add("~~~")
  $markdown.Add("")
}

$markdown | Set-Content -LiteralPath $nextMarkdownPath -Encoding UTF8
Write-Host ""
Write-Host "Resumo: $nextMarkdownPath"
