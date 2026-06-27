param(
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
$candidatePath = [string]$session.candidatePath
if ([string]::IsNullOrWhiteSpace($candidatePath) -or -not (Test-Path -LiteralPath $candidatePath -PathType Container)) {
  throw "Release candidate da sessao nao encontrado: $candidatePath"
}

$installSmokeScript = Join-Path $PSScriptRoot "create-manual-qa-install-smoke.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installSmokeScript -SessionPath $SessionPath

$sandboxPath = Join-Path $SessionPath "hermes-manual-qa.wsb"
$sandboxLogonCommand = @"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process explorer.exe 'C:\Users\WDAGUtilityAccount\Desktop\HermesRC'; Start-Process notepad.exe 'C:\Users\WDAGUtilityAccount\Desktop\HermesRC\LEIA-ME-TESTE.md'"
"@

$sandboxXml = @"
<Configuration>
  <VGpu>Enable</VGpu>
  <Networking>Enable</Networking>
  <AudioInput>Disable</AudioInput>
  <VideoInput>Disable</VideoInput>
  <PrinterRedirection>Disable</PrinterRedirection>
  <ClipboardRedirection>Enable</ClipboardRedirection>
  <MappedFolders>
    <MappedFolder>
      <HostFolder>$candidatePath</HostFolder>
      <SandboxFolder>C:\Users\WDAGUtilityAccount\Desktop\HermesRC</SandboxFolder>
      <ReadOnly>true</ReadOnly>
    </MappedFolder>
    <MappedFolder>
      <HostFolder>$SessionPath</HostFolder>
      <SandboxFolder>C:\Users\WDAGUtilityAccount\Desktop\HermesQA</SandboxFolder>
      <ReadOnly>false</ReadOnly>
    </MappedFolder>
  </MappedFolders>
  <LogonCommand>
    <Command>$sandboxLogonCommand</Command>
  </LogonCommand>
</Configuration>
"@

$sandboxXml | Set-Content -LiteralPath $sandboxPath -Encoding UTF8

$guidePath = Join-Path $SessionPath "manual-qa-sandbox.md"
$nsisPath = Join-Path $candidatePath "installers\Hermes-Optimizer-0.1.0-nsis.exe"
$msiPath = Join-Path $candidatePath "installers\Hermes-Optimizer-0.1.0-msi.msi"

$guide = New-Object System.Collections.Generic.List[string]
$guide.Add("# Hermes Manual QA - Windows Sandbox")
$guide.Add("")
$guide.Add("- Sessao: $($session.candidateName)")
$guide.Add("- RC: $candidatePath")
$guide.Add("- Sandbox: $sandboxPath")
$guide.Add("")
$guide.Add("## Instaladores")
$guide.Add("")
$guide.Add("- NSIS: $nsisPath")
$guide.Add("- MSI: $msiPath")
$guide.Add("")
$guide.Add("## Como usar")
$guide.Add("")
$guide.Add("1. Abra `hermes-manual-qa.wsb` em uma maquina com Windows Sandbox habilitado.")
$guide.Add("2. Dentro do Sandbox, abra `Desktop\HermesRC\installers`.")
$guide.Add("3. Instale primeiro `Hermes-Optimizer-0.1.0-nsis.exe`.")
$guide.Add("4. Opcional para acelerar instalacao: rode `Desktop\HermesQA\run-install-smoke.ps1` no PowerShell do Sandbox.")
$guide.Add("5. Teste janela, rotas, scroll, Dashboard, Otimizar, Anti-Cheat, Defender, Manutencao e Configuracoes.")
$guide.Add("6. Salve prints ou notas em `Desktop\HermesQA`, que esta mapeado de volta para esta sessao.")
$guide.Add('7. Atualize o resultado no host com `npm run qa:manual:item`.')
$guide.Add("")
$guide.Add("## Observacoes")
$guide.Add("")
$guide.Add("- O RC e mapeado como leitura para evitar alteracao acidental do pacote.")
$guide.Add("- A pasta da sessao de QA e gravavel para evidencias.")
$guide.Add("- Windows Sandbox pode exigir Windows Pro/Enterprise e habilitacao manual como administrador.")

$guide | Set-Content -LiteralPath $guidePath -Encoding UTF8

Write-Host "Sandbox QA gerado:"
Write-Host "- $sandboxPath"
Write-Host "- $guidePath"

if ($Launch) {
  Write-Host "Abrindo Windows Sandbox..."
  Start-Process -FilePath $sandboxPath
} else {
  Write-Host "Modo seguro: sandbox nao foi aberto. Use -Launch para abrir."
}
