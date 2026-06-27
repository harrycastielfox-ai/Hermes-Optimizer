param(
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
$candidatePath = [string]$session.candidatePath
if ([string]::IsNullOrWhiteSpace($candidatePath) -or -not (Test-Path -LiteralPath $candidatePath -PathType Container)) {
  throw "Release candidate da sessao nao encontrado: $candidatePath"
}

$installSmokeScript = Join-Path $PSScriptRoot "create-manual-qa-install-smoke.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installSmokeScript -SessionPath $SessionPath

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "hermes-manual-qa-portable-$($session.version)-$timestamp"
$portableRoot = Join-Path $SessionPath $packageName
$portableRc = Join-Path $portableRoot "HermesRC"
$portableQa = Join-Path $portableRoot "HermesQA"

New-Item -ItemType Directory -Force -Path $portableRc | Out-Null
New-Item -ItemType Directory -Force -Path $portableQa | Out-Null

Copy-Item -Path (Join-Path $candidatePath "*") -Destination $portableRc -Recurse -Force

$qaFiles = @(
  "run-install-smoke.ps1",
  "install-smoke-readme.md",
  "manual-qa-checklist.md",
  "manual-qa-session.json",
  "manual-qa-summary.md",
  "manual-qa-verification.json"
)

foreach ($fileName in $qaFiles) {
  $sourcePath = Join-Path $SessionPath $fileName
  if (Test-Path -LiteralPath $sourcePath -PathType Leaf) {
    Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $portableQa $fileName) -Force
  }
}

$launcherPath = Join-Path $portableRoot "RUN-INSTALL-SMOKE.ps1"
$launcher = @'
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$rcPath = Join-Path $root "HermesRC"
$qaPath = Join-Path $root "HermesQA"
$smokePath = Join-Path $qaPath "run-install-smoke.ps1"

if (-not (Test-Path -LiteralPath $smokePath -PathType Leaf)) {
  throw "run-install-smoke.ps1 nao encontrado em $smokePath"
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $smokePath -RcPath $rcPath -QaPath $qaPath
exit $LASTEXITCODE
'@
$launcher | Set-Content -LiteralPath $launcherPath -Encoding UTF8

$readmePath = Join-Path $portableRoot "LEIA-ME-QA-PORTATIL.md"
$readme = @"
# Hermes QA Portatil

- Sessao: $($session.candidateName)
- Versao: $($session.version)
- Origem: $SessionPath
- RC: $candidatePath

## Como usar em VM ou maquina limpa

1. Copie este pacote para uma VM ou maquina Windows limpa.
2. Extraia o ZIP em uma pasta local.
3. Abra PowerShell nessa pasta.
4. Rode:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\RUN-INSTALL-SMOKE.ps1
~~~

## O que conferir manualmente

- Instalacao NSIS e MSI.
- Janela normal, arrastar, redimensionar, maximizar e restaurar.
- Rotas: Dashboard, Otimizar, Anti-Cheat, Defender, Manutencao Programada e Configuracoes.
- Scroll em telas longas.
- Botao 1 Preparar PC em modo teste.
- Botao 2 bloqueado antes da Fase 1 e fluxo Fate Trigger depois da Fase 1.
- Nenhuma mudanca real no Windows em modo teste.

## Como voltar a evidencia

Depois do smoke, copie a pasta `HermesQA\install-smoke-*` de volta para:

~~~text
$SessionPath
~~~

No host do projeto, rode:

~~~powershell
npm run qa:manual:sync
npm run qa:manual:status
npm run release:status
~~~
"@
$readme | Set-Content -LiteralPath $readmePath -Encoding UTF8

$zipPath = Join-Path $SessionPath "$packageName.zip"
Compress-Archive -Path (Join-Path $portableRoot "*") -DestinationPath $zipPath -Force

$guidePath = Join-Path $SessionPath "manual-qa-portable.md"
$guide = @"
# Hermes Manual QA - Pacote Portatil

- Sessao: $($session.candidateName)
- Pasta: $portableRoot
- ZIP: $zipPath

## Proximo passo

Copie o ZIP para uma VM ou maquina Windows limpa, extraia e rode:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\RUN-INSTALL-SMOKE.ps1
~~~

Depois copie `HermesQA\install-smoke-*` de volta para esta sessao e rode:

~~~powershell
npm run qa:manual:sync
npm run qa:manual:status
npm run release:status
~~~
"@
$guide | Set-Content -LiteralPath $guidePath -Encoding UTF8

Write-Host "Pacote portatil de QA gerado:"
Write-Host "- $zipPath"
Write-Host "- $portableRoot"
Write-Host "- $guidePath"
