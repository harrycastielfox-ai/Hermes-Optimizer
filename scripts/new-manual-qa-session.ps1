param(
  [string]$CandidatePath,
  [string]$OutputRoot,
  [string]$Tester = $env:USERNAME
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $root ".release\manual-qa"
}
if ([string]::IsNullOrWhiteSpace($CandidatePath)) {
  $candidatesRoot = Join-Path $root ".release\candidates"
  if (-not (Test-Path -LiteralPath $candidatesRoot -PathType Container)) {
    throw "Pasta de release candidates nao encontrada: $candidatesRoot"
  }

  $latestCandidate = Get-ChildItem -LiteralPath $candidatesRoot -Directory |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $latestCandidate) {
    throw "Nenhum release candidate encontrado. Execute npm run release:candidate primeiro."
  }

  $CandidatePath = $latestCandidate.FullName
}

if (-not (Test-Path -LiteralPath $CandidatePath -PathType Container)) {
  throw "Release candidate nao encontrado: $CandidatePath"
}

$manifestPath = Join-Path $CandidatePath "release-candidate-manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw "Manifesto do release candidate nao encontrado: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$sessionName = "manual-qa-$($manifest.version)-$timestamp"
$sessionDir = Join-Path $OutputRoot $sessionName
New-Item -ItemType Directory -Force -Path $sessionDir | Out-Null

$items = @(
  [pscustomobject]@{ id = "install-nsis"; priority = "P0"; area = "Instalacao"; title = "Instalar NSIS"; expected = "Instalador abre, UAC aparece quando necessario e app instala sem erro." },
  [pscustomobject]@{ id = "install-msi"; priority = "P0"; area = "Instalacao"; title = "Instalar MSI"; expected = "MSI instala sem erro ou registra erro reprodutivel." },
  [pscustomobject]@{ id = "normal-window"; priority = "P0"; area = "Janela"; title = "Janela normal"; expected = "Hermes abre em janela normal, permite arrastar, redimensionar, maximizar e restaurar." },
  [pscustomobject]@{ id = "sidebar-routes"; priority = "P0"; area = "Navegacao"; title = "Rotas laterais"; expected = "Dashboard, Otimizar, Anti-Cheat, Defender, Manutencao Programada e Configuracoes abrem sem tela branca." },
  [pscustomobject]@{ id = "scroll"; priority = "P0"; area = "Navegacao"; title = "Scroll do mouse"; expected = "Telas longas rolam com roda do mouse, sem barra quebrada ou conteudo preso." },
  [pscustomobject]@{ id = "dashboard-read-only"; priority = "P0"; area = "Dashboard"; title = "Analise somente leitura"; expected = "Analisar/diagnosticar atualiza dados locais sem mover arquivos, fechar processos ou alterar Windows." },
  [pscustomobject]@{ id = "phase2-locked"; priority = "P0"; area = "Otimizar"; title = "Botao 2 bloqueado antes da Fase 1"; expected = "Otimizar Tudo fica bloqueado ate Preparar PC concluir." },
  [pscustomobject]@{ id = "prepare-test"; priority = "P0"; area = "Otimizar"; title = "Botao 1 em modo teste"; expected = "Preparar PC mostra progresso, conclui, recomenda reinicio e nao aplica mudancas reais." },
  [pscustomobject]@{ id = "restart-gate"; priority = "P0"; area = "Otimizar"; title = "Reinicio entre fases"; expected = "Apos reiniciar, Hermes recupera estado da Fase 1 e libera Fase 2." },
  [pscustomobject]@{ id = "optimize-test-fate"; priority = "P0"; area = "Otimizar"; title = "Botao 2 com Fate Trigger"; expected = "Otimizar Tudo pede jogo alvo, Fate Trigger aparece como prioridade, fluxo termina com sucesso visual." },
  [pscustomobject]@{ id = "safe-mode-no-real-change"; priority = "P0"; area = "Seguranca"; title = "Modo teste sem mudanca real"; expected = "DNS, registro, servicos, processos, energia e arquivos do Windows nao sao alterados em modo teste." },
  [pscustomobject]@{ id = "defender-page"; priority = "P1"; area = "Defender"; title = "Defender preservado"; expected = "Pagina Defender nao promete desativar protecao; somente orienta/libera excecao especifica quando aplicavel." },
  [pscustomobject]@{ id = "scheduled-maintenance"; priority = "P1"; area = "Manutencao"; title = "Manutencao sem dados falsos"; expected = "Agendas aparecem apenas quando criadas; sem dados temporarios ou fake." },
  [pscustomobject]@{ id = "settings-language"; priority = "P1"; area = "Configuracoes"; title = "Textos e idioma"; expected = "Portugues sem acentos quebrados em telas principais; opcoes de idioma visiveis." },
  [pscustomobject]@{ id = "authenticode"; priority = "P0"; area = "Release"; title = "Assinatura Authenticode"; expected = "Para release publica, MSI e NSIS precisam estar Valid. NotSigned mantem NO-GO." }
)

$session = [pscustomobject]@{
  generatedAt    = (Get-Date).ToString("o")
  tester         = $Tester
  status         = "pending"
  candidatePath  = (Resolve-Path $CandidatePath).Path
  candidateName  = $manifest.candidateName
  version        = $manifest.version
  publicDecision = $manifest.publicDecision
  installers     = @($manifest.installers)
  items          = @($items | ForEach-Object {
    [pscustomobject]@{
      id       = $_.id
      priority = $_.priority
      area     = $_.area
      title    = $_.title
      expected = $_.expected
      status   = "pending"
      evidence = ""
      notes    = ""
    }
  })
}

$jsonPath = Join-Path $sessionDir "manual-qa-session.json"
$session | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$installerLines = (@($manifest.installers) | ForEach-Object {
  "- $($_.kind.ToUpperInvariant()): $($_.relativePath) | SHA256 $($_.sha256) | Authenticode $($_.signatureStatus)"
}) -join "`r`n"

$itemLines = ($items | ForEach-Object {
  "- [ ] [$($_.priority)] $($_.area) - $($_.title)`r`n  - Esperado: $($_.expected)`r`n  - Evidencia: `r`n  - Notas: "
}) -join "`r`n`r`n"

$markdown = @"
# Hermes Optimizer - Sessao de QA Manual

Status: pendente
Tester: $Tester
Gerado em: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Release candidate: $($manifest.candidateName)
Decisao publica atual: $($manifest.publicDecision)

## Instaladores

$installerLines

## Como preencher

- Marque cada item como aprovado ou falhou.
- Anexe print, video curto, hash, mensagem de erro ou observacao objetiva.
- Qualquer falha P0 mantem o release como NO-GO.
- NotSigned e aceitavel para teste interno, mas bloqueia release publica.

## Checklist

$itemLines

## Decisao final do QA manual

- [ ] APROVADO para proxima etapa interna
- [ ] REPROVADO / manter NO-GO

Resumo:

"@

$markdownPath = Join-Path $sessionDir "manual-qa-checklist.md"
$markdown | Set-Content -LiteralPath $markdownPath -Encoding UTF8

Write-Host "Sessao de QA manual criada: $sessionDir"
Write-Host "- $markdownPath"
Write-Host "- $jsonPath"
