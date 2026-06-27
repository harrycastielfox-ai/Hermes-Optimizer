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

$manualEvidenceLauncherPath = Join-Path $portableRoot "RUN-MANUAL-QA-EVIDENCE.ps1"
$manualEvidenceLauncher = @'
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$qaPath = Join-Path $root "HermesQA"
$sessionPath = Join-Path $qaPath "manual-qa-session.json"

if (-not (Test-Path -LiteralPath $sessionPath -PathType Leaf)) {
  throw "manual-qa-session.json nao encontrado em $sessionPath"
}

$session = Get-Content -LiteralPath $sessionPath -Raw | ConvertFrom-Json
$manualItemIds = @(
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

Write-Host ""
Write-Host "Hermes Manual QA Evidence"
Write-Host "Sessao: $($session.candidateName)"
Write-Host ""
Write-Host "Use: p=passou, f=falhou, b=bloqueado, s=ignorar, Enter=pendente."
Write-Host ""

$results = foreach ($itemId in $manualItemIds) {
  $item = @($session.items) | Where-Object { $_.id -eq $itemId } | Select-Object -First 1
  if (-not $item) {
    continue
  }

  Write-Host "[$($item.priority)] $($item.id) - $($item.title)"
  Write-Host "Esperado: $($item.expected)"
  $choice = (Read-Host "Resultado").Trim().ToLowerInvariant()
  $status = switch ($choice) {
    "p" { "passed" }
    "pass" { "passed" }
    "passou" { "passed" }
    "f" { "failed" }
    "falhou" { "failed" }
    "b" { "blocked" }
    "bloqueado" { "blocked" }
    "s" { "skipped" }
    "skip" { "skipped" }
    default { "pending" }
  }

  $evidence = ""
  $notes = ""
  if ($status -ne "pending") {
    $evidence = Read-Host "Evidencia curta"
    $notes = Read-Host "Notas opcionais"
  }

  [pscustomobject]@{
    id       = $item.id
    status   = $status
    evidence = $evidence
    notes    = $notes
  }

  Write-Host ""
}

$report = [pscustomobject]@{
  generatedAt   = (Get-Date).ToString("o")
  computerName  = $env:COMPUTERNAME
  userName      = $env:USERNAME
  candidateName = $session.candidateName
  version       = $session.version
  items         = @($results)
}

$evidencePath = Join-Path $qaPath "manual-qa-evidence.json"
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $evidencePath -Encoding UTF8

Write-Host "Evidencia salva em:"
Write-Host $evidencePath
Write-Host ""
Write-Host "Copie este arquivo junto com qualquer HermesQA\\install-smoke-* de volta para a sessao no host."
'@
$manualEvidenceLauncher | Set-Content -LiteralPath $manualEvidenceLauncherPath -Encoding UTF8

$verifyPackagePath = Join-Path $portableRoot "VERIFY-QA-PACKAGE.ps1"
$verifyPackage = @'
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$rcPath = Join-Path $root "HermesRC"
$qaPath = Join-Path $root "HermesQA"
$manifestPath = Join-Path $rcPath "release-candidate-manifest.json"
$failures = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

function Add-Failure {
  param([string]$Message)
  $script:failures.Add($Message)
}

function Assert-File {
  param(
    [string]$Path,
    [string]$Label
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    Add-Failure "$Label ausente: $Path"
    return $false
  }

  return $true
}

Write-Host ""
Write-Host "Hermes QA Package Verification"
Write-Host "Pacote: $root"
Write-Host ""

if (-not (Assert-File -Path $manifestPath -Label "Manifesto do RC")) {
  throw "Pacote invalido: manifesto do RC ausente."
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
Write-Host "RC: $($manifest.candidateName)"
Write-Host "Versao: $($manifest.version)"
Write-Host "Decisao publica do RC: $($manifest.publicDecision)"

if (-not [bool]$manifest.technicalPass) {
  $warnings.Add("RC nao marcou technicalPass=true.")
}

$requiredFiles = @(
  @{ path = (Join-Path $qaPath "run-install-smoke.ps1"); label = "Smoke de instalacao" },
  @{ path = (Join-Path $qaPath "manual-qa-session.json"); label = "Sessao de QA" },
  @{ path = (Join-Path $qaPath "manual-qa-checklist.md"); label = "Checklist manual" },
  @{ path = (Join-Path $root "RUN-INSTALL-SMOKE.ps1"); label = "Launcher de smoke" },
  @{ path = (Join-Path $root "RUN-MANUAL-QA-EVIDENCE.ps1"); label = "Launcher de evidencia manual" }
)

foreach ($required in $requiredFiles) {
  Assert-File -Path $required.path -Label $required.label | Out-Null
}

foreach ($installer in @($manifest.installers)) {
  $installerPath = Join-Path $rcPath ([string]$installer.relativePath)
  if (-not (Assert-File -Path $installerPath -Label "Instalador $($installer.kind)")) {
    continue
  }

  $item = Get-Item -LiteralPath $installerPath
  if ([int64]$installer.lengthBytes -ne $item.Length) {
    Add-Failure "Tamanho divergente em $($installer.kind): esperado $($installer.lengthBytes), atual $($item.Length)"
  }

  $hash = (Get-FileHash -LiteralPath $installerPath -Algorithm SHA256).Hash
  if ($hash -ne [string]$installer.sha256) {
    Add-Failure "SHA256 divergente em $($installer.kind): esperado $($installer.sha256), atual $hash"
  }

  $signature = Get-AuthenticodeSignature -LiteralPath $installerPath
  Write-Host "- $($installer.kind.ToUpperInvariant()): SHA256 OK, Authenticode $($signature.Status)"
  if ([string]$installer.signatureStatus -ne [string]$signature.Status) {
    $warnings.Add("Authenticode atual de $($installer.kind) difere do manifesto: manifesto=$($installer.signatureStatus), atual=$($signature.Status)")
  }
}

if ($warnings.Count -gt 0) {
  Write-Host ""
  Write-Host "Avisos:"
  foreach ($warning in $warnings) {
    Write-Host "- $warning"
  }
}

if ($failures.Count -gt 0) {
  Write-Host ""
  Write-Host "Falhas:"
  foreach ($failure in $failures) {
    Write-Host "- $failure"
  }
  exit 1
}

Write-Host ""
Write-Host "Pacote QA verificado. Pode rodar RUN-INSTALL-SMOKE.ps1."
'@
$verifyPackage | Set-Content -LiteralPath $verifyPackagePath -Encoding UTF8

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
4. Verifique a integridade do pacote:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\VERIFY-QA-PACKAGE.ps1
~~~

5. Rode:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\RUN-INSTALL-SMOKE.ps1
~~~

6. Depois dos testes visuais/fluxos, rode:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\RUN-MANUAL-QA-EVIDENCE.ps1
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

Depois do smoke e da evidencia manual, copie a pasta `HermesQA\install-smoke-*` e o arquivo `HermesQA\manual-qa-evidence.json` de volta para:

~~~text
$SessionPath
~~~

No host do projeto, rode:

~~~powershell
npm run qa:manual:receive
~~~

Se precisar depurar em etapas, use `npm run qa:manual:sync`, `npm run qa:manual:import`, `npm run qa:manual:status` e `npm run release:status` separadamente.

Se o smoke passar, o recebimento aprova os itens NSIS/MSI conforme o resultado e reabre os P0 que estavam bloqueados por falta de maquina limpa para revisao manual.
"@
$readme | Set-Content -LiteralPath $readmePath -Encoding UTF8

$zipPath = Join-Path $SessionPath "$packageName.zip"
Compress-Archive -Path (Join-Path $portableRoot "*") -DestinationPath $zipPath -Force
$zipItem = Get-Item -LiteralPath $zipPath
$zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash
$zipShaPath = Join-Path $SessionPath "$packageName.zip.sha256"
"$zipHash *$($zipItem.Name)" | Set-Content -LiteralPath $zipShaPath -Encoding ASCII

$portableManifestPath = Join-Path $SessionPath "$packageName-manifest.json"
$portableManifest = [pscustomobject]@{
  generatedAt     = (Get-Date).ToString("o")
  packageName     = $packageName
  sessionName     = Split-Path -Leaf $SessionPath
  candidateName   = $session.candidateName
  version         = $session.version
  zipPath         = $zipPath
  zipSha256Path   = $zipShaPath
  zipLengthBytes  = $zipItem.Length
  zipSha256       = $zipHash
  portableRoot    = $portableRoot
  requiredCommands = @(
    ".\VERIFY-QA-PACKAGE.ps1",
    ".\RUN-INSTALL-SMOKE.ps1",
    ".\RUN-MANUAL-QA-EVIDENCE.ps1"
  )
}
$portableManifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $portableManifestPath -Encoding UTF8

$guidePath = Join-Path $SessionPath "manual-qa-portable.md"
$guide = @"
# Hermes Manual QA - Pacote Portatil

- Sessao: $($session.candidateName)
- Pasta: $portableRoot
- ZIP: $zipPath
- ZIP SHA256: $zipHash
- ZIP SHA256 file: $zipShaPath
- Manifesto do pacote: $portableManifestPath

## Proximo passo

Copie o ZIP para uma VM ou maquina Windows limpa. Opcionalmente confira o hash antes de extrair:

~~~powershell
Get-FileHash -Algorithm SHA256 .\$($zipItem.Name)
~~~

Extraia e rode:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\VERIFY-QA-PACKAGE.ps1
~~~

Depois rode:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\RUN-INSTALL-SMOKE.ps1
~~~

Depois confira as telas/fluxos do app instalado e gere a evidencia manual:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\RUN-MANUAL-QA-EVIDENCE.ps1
~~~

Depois copie de volta para esta sessao:

- `HermesQA\install-smoke-*`
- `HermesQA\manual-qa-evidence.json`, se ele foi gerado

No host do projeto, rode:

~~~powershell
npm run qa:manual:receive
~~~

Quando o smoke voltar com launch detectado, o recebimento tira os P0 dependentes de maquina limpa do estado bloqueado e deixa esses itens prontos para aprovacao manual.
"@
$guide | Set-Content -LiteralPath $guidePath -Encoding UTF8

Write-Host "Pacote portatil de QA gerado:"
Write-Host "- $zipPath"
Write-Host "- $zipShaPath"
Write-Host "- $portableManifestPath"
Write-Host "- $portableRoot"
Write-Host "- $guidePath"
