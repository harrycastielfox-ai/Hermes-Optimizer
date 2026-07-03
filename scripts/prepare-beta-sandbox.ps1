param(
  [string]$DropRoot,
  [string]$OutputRoot,
  [string]$EvidenceHostRoot,
  [switch]$EnableNetworking
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseRoot = Join-Path $root ".release"
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $releaseRoot "beta-test-drop"
}

function Read-JsonFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "JSON nao encontrado: $Path"
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Get-SafePathForSandboxXml {
  param([string]$Path)

  return [System.Security.SecurityElement]::Escape($Path)
}

if ([string]::IsNullOrWhiteSpace($DropRoot)) {
  $latestPath = Join-Path $OutputRoot "latest-beta-test-drop.json"
  $latest = Read-JsonFile -Path $latestPath
  $DropRoot = [string]$latest.dropRoot
}

if ([string]::IsNullOrWhiteSpace($DropRoot) -or -not (Test-Path -LiteralPath $DropRoot -PathType Container)) {
  throw "Drop beta nao encontrado: $DropRoot. Rode npm run release:beta:ship."
}

$doctorScript = Join-Path $PSScriptRoot "check-beta-doctor.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $doctorScript -DropRoot $DropRoot -OutputRoot $OutputRoot | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Beta doctor falhou. Corrija antes de preparar Sandbox."
}

$manifestPath = Join-Path $DropRoot "beta-test-drop-manifest.json"
$manifest = Read-JsonFile -Path $manifestPath

if ([string]::IsNullOrWhiteSpace($EvidenceHostRoot)) {
  $EvidenceHostRoot = Join-Path $DropRoot "sandbox-evidence"
}
New-Item -ItemType Directory -Force -Path $EvidenceHostRoot | Out-Null

$sandboxStartPath = Join-Path $DropRoot "sandbox-start.ps1"
$sandboxStart = @'
$ErrorActionPreference = "Continue"

$betaRoot = "C:\Users\WDAGUtilityAccount\Desktop\HermesBeta"
$evidenceRoot = "C:\Temp\HermesQA"
New-Item -ItemType Directory -Force -Path $evidenceRoot | Out-Null

$logPath = Join-Path $evidenceRoot "sandbox-session-log.txt"
"Hermes beta sandbox iniciado: $(Get-Date -Format o)" | Set-Content -LiteralPath $logPath -Encoding UTF8
"Usuario: $env:USERNAME" | Add-Content -LiteralPath $logPath -Encoding UTF8
"Computador: $env:COMPUTERNAME" | Add-Content -LiteralPath $logPath -Encoding UTF8
"BetaRoot: $betaRoot" | Add-Content -LiteralPath $logPath -Encoding UTF8
"EvidenceRoot: $evidenceRoot" | Add-Content -LiteralPath $logPath -Encoding UTF8

$installerReport = Join-Path $evidenceRoot "installers-disponiveis.txt"
"Instaladores encontrados:" | Set-Content -LiteralPath $installerReport -Encoding UTF8
Get-ChildItem -LiteralPath $betaRoot -Recurse -File -Include *.msi,*.exe -ErrorAction SilentlyContinue |
  Select-Object FullName, Length, LastWriteTime |
  Format-Table -AutoSize |
  Out-String |
  Add-Content -LiteralPath $installerReport -Encoding UTF8

$instructionsPath = Join-Path $evidenceRoot "INSTRUCOES-EVIDENCIA-HERMES.txt"
@"
Hermes Beta - Teste em Windows Sandbox

Este ambiente e descartavel. Ao fechar o Sandbox, a instalacao feita aqui sera perdida.
O Windows principal nao recebe a instalacao do Hermes.

Passos:
1. Abra a pasta HermesBeta no Desktop.
2. Leia LEIA-ME-TESTE-BETA.md.
3. Instale manualmente o MSI ou EXE dentro do Sandbox.
4. Abra o Hermes instalado dentro do Sandbox.
5. Navegue por Dashboard, Otimizar, Anti-Cheat, Defender, Manutencao e Configuracoes.
6. Salve prints, observacoes ou logs em C:\Temp\HermesQA.
7. Feche o Sandbox apenas depois de conferir que as evidencias apareceram no host.

Nao desative Defender, SmartScreen, UAC ou seguranca do Windows.
Nao rode otimizacoes reais no Windows principal.
"@ | Set-Content -LiteralPath $instructionsPath -Encoding UTF8

Start-Process explorer.exe -ArgumentList @($betaRoot)
Start-Process explorer.exe -ArgumentList @($evidenceRoot)

$readme = Join-Path $betaRoot "LEIA-ME-TESTE-BETA.md"
if (Test-Path -LiteralPath $readme -PathType Leaf) {
  Start-Process notepad.exe -ArgumentList @($readme)
}

Start-Process notepad.exe -ArgumentList @($instructionsPath)
'@
$sandboxStart | Set-Content -LiteralPath $sandboxStartPath -Encoding UTF8

$dropHostPath = Get-SafePathForSandboxXml -Path (Resolve-Path -LiteralPath $DropRoot).Path
$evidenceHostPath = Get-SafePathForSandboxXml -Path (Resolve-Path -LiteralPath $EvidenceHostRoot).Path
$networking = if ($EnableNetworking) { "Enable" } else { "Disable" }
$sandboxCommand = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\WDAGUtilityAccount\Desktop\HermesBeta\sandbox-start.ps1"'

$wsbPath = Join-Path $DropRoot "Run-Hermes-Beta-In-Sandbox.wsb"
$wsb = @"
<Configuration>
  <VGpu>Enable</VGpu>
  <Networking>$networking</Networking>
  <AudioInput>Disable</AudioInput>
  <VideoInput>Disable</VideoInput>
  <PrinterRedirection>Disable</PrinterRedirection>
  <ClipboardRedirection>Enable</ClipboardRedirection>
  <MappedFolders>
    <MappedFolder>
      <HostFolder>$dropHostPath</HostFolder>
      <SandboxFolder>C:\Users\WDAGUtilityAccount\Desktop\HermesBeta</SandboxFolder>
      <ReadOnly>true</ReadOnly>
    </MappedFolder>
    <MappedFolder>
      <HostFolder>$evidenceHostPath</HostFolder>
      <SandboxFolder>C:\Temp\HermesQA</SandboxFolder>
      <ReadOnly>false</ReadOnly>
    </MappedFolder>
  </MappedFolders>
  <LogonCommand>
    <Command>$sandboxCommand</Command>
  </LogonCommand>
</Configuration>
"@
$wsb | Set-Content -LiteralPath $wsbPath -Encoding UTF8

$report = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  dropRoot = (Resolve-Path -LiteralPath $DropRoot).Path
  betaPackage = [string]$manifest.betaPackage
  wsbPath = $wsbPath
  sandboxStartPath = $sandboxStartPath
  evidenceHostRoot = (Resolve-Path -LiteralPath $EvidenceHostRoot).Path
  betaMappedReadOnly = $true
  evidenceMappedWritable = $true
  networking = $networking
  publicRelease = "NO-GO"
  codeSigningRequired = $false
}

$jsonPath = Join-Path $OutputRoot "latest-beta-sandbox.json"
$mdPath = Join-Path $OutputRoot "latest-beta-sandbox.md"
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$markdown = @"
# Hermes Beta Sandbox

- Drop: $($report.dropRoot)
- Beta: $($report.betaPackage)
- WSB: $($report.wsbPath)
- Script Sandbox: $($report.sandboxStartPath)
- Evidencias no host: $($report.evidenceHostRoot)
- Beta somente leitura: $($report.betaMappedReadOnly)
- Evidencias gravaveis: $($report.evidenceMappedWritable)
- Rede no Sandbox: $($report.networking)
- Release publico: $($report.publicRelease)

## Abrir Sandbox

Abra o arquivo:

~~~powershell
$($report.wsbPath)
~~~

O Windows principal nao recebe instalacao do Hermes. A instalacao acontece somente dentro do Sandbox descartavel.
"@
$markdown | Set-Content -LiteralPath $mdPath -Encoding UTF8

Write-Host "Hermes beta sandbox preparado."
Write-Host "- WSB: $wsbPath"
Write-Host "- Script: $sandboxStartPath"
Write-Host "- Evidencias host: $EvidenceHostRoot"
Write-Host "- Rede: $networking"
Write-Host ""
$sandboxCommandOnHost = Get-Command WindowsSandbox.exe -ErrorAction SilentlyContinue
if ($sandboxCommandOnHost) {
  Write-Host "Abra o arquivo .wsb acima para iniciar o Sandbox."
} else {
  Write-Host "Windows Sandbox nao esta disponivel neste Windows."
  Write-Host "- Verifique edicao do Windows."
  Write-Host "- Verifique virtualizacao/Hyper-V."
  Write-Host "- Alternativa: use VM externa e copie o ZIP/drop beta."
}
Write-Host "Resumo: $mdPath"
Write-Host "JSON: $jsonPath"
