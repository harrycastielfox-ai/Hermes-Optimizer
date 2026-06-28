param(
  [string]$BetaRoot,
  [string]$OutputRoot,
  [switch]$LaunchSandbox
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseRoot = Join-Path $root ".release"
if ([string]::IsNullOrWhiteSpace($BetaRoot)) {
  $BetaRoot = Join-Path $releaseRoot "beta-handoff"
}
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

function Copy-FileRequired {
  param(
    [string]$Source,
    [string]$Destination
  )

  if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) {
    throw "Arquivo obrigatorio nao encontrado: $Source"
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
  Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

function Get-SafePathForSandboxXml {
  param([string]$Path)

  return [System.Security.SecurityElement]::Escape($Path)
}

$readyGateScript = Join-Path $PSScriptRoot "verify-beta-ready-to-send.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $readyGateScript -BetaRoot $BetaRoot | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Beta ainda nao esta pronto para envio. Rode npm run release:beta e corrija as falhas."
}

$latestReadyPath = Join-Path $BetaRoot "latest-beta-ready.json"
$latestReady = Read-JsonFile -Path $latestReadyPath
if ([string]$latestReady.status -ne "OK") {
  throw "latest-beta-ready.json nao esta OK: $($latestReady.status)"
}

$handoffRoot = [string]$latestReady.handoffRoot
if ([string]::IsNullOrWhiteSpace($handoffRoot) -or -not (Test-Path -LiteralPath $handoffRoot -PathType Container)) {
  throw "Pasta do beta handoff nao encontrada: $handoffRoot"
}

$verificationPath = [string]$latestReady.verificationPath
$verification = Read-JsonFile -Path $verificationPath
if ([string]$verification.status -ne "OK") {
  throw "Verificacao do beta nao esta OK: $($verification.status)"
}

$qaPortableZip = [string]$verification.qaPortableZip
if ([string]::IsNullOrWhiteSpace($qaPortableZip) -or -not (Test-Path -LiteralPath $qaPortableZip -PathType Leaf)) {
  throw "ZIP QA portatil nao encontrado no beta: $qaPortableZip"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dropName = "$($latestReady.handoffName)-qa-drop-$timestamp"
$dropRoot = Join-Path $OutputRoot $dropName
$dropFilesRoot = Join-Path $dropRoot "arquivos"
$dropExtractRoot = Join-Path $dropRoot "qa-extraido"
$dropEvidenceRoot = Join-Path $dropRoot "evidencias"

New-Item -ItemType Directory -Force -Path $dropFilesRoot | Out-Null
New-Item -ItemType Directory -Force -Path $dropExtractRoot | Out-Null
New-Item -ItemType Directory -Force -Path $dropEvidenceRoot | Out-Null

$betaZipPath = [string]$latestReady.handoffZipPath
$betaZipName = Split-Path -Leaf $betaZipPath
$qaZipName = Split-Path -Leaf $qaPortableZip

Copy-FileRequired -Source $betaZipPath -Destination (Join-Path $dropFilesRoot $betaZipName)
if (Test-Path -LiteralPath "$betaZipPath.sha256" -PathType Leaf) {
  Copy-FileRequired -Source "$betaZipPath.sha256" -Destination (Join-Path $dropFilesRoot "$betaZipName.sha256")
}

Copy-FileRequired -Source $qaPortableZip -Destination (Join-Path $dropFilesRoot $qaZipName)
if (Test-Path -LiteralPath "$qaPortableZip.sha256" -PathType Leaf) {
  Copy-FileRequired -Source "$qaPortableZip.sha256" -Destination (Join-Path $dropFilesRoot "$qaZipName.sha256")
}

Expand-Archive -LiteralPath $qaPortableZip -DestinationPath $dropExtractRoot -Force
$extractedVerifyScript = Join-Path $dropExtractRoot "VERIFY-QA-PACKAGE.ps1"
if (-not (Test-Path -LiteralPath $extractedVerifyScript -PathType Leaf)) {
  throw "Falha ao extrair pacote QA portatil em $dropExtractRoot. VERIFY-QA-PACKAGE.ps1 nao foi encontrado."
}

$vmRunnerPath = Join-Path $dropRoot "RODAR-DENTRO-DA-VM.ps1"
$vmRunner = @"
`$ErrorActionPreference = "Stop"

`$dropRoot = Split-Path -Parent `$MyInvocation.MyCommand.Path
`$packageRoot = Join-Path `$dropRoot "qa-extraido"

if (-not (Test-Path -LiteralPath `$packageRoot -PathType Container)) {
  throw "Pacote extraido nao encontrado: `$packageRoot"
}

Push-Location `$packageRoot
try {
  powershell -NoProfile -ExecutionPolicy Bypass -File .\VERIFY-QA-PACKAGE.ps1
  powershell -NoProfile -ExecutionPolicy Bypass -File .\RUN-INSTALL-SMOKE.ps1
  powershell -NoProfile -ExecutionPolicy Bypass -File .\RUN-MANUAL-QA-EVIDENCE.ps1
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "QA concluida. Copie a pasta HermesQA de dentro do pacote extraido para o host."
"@
$vmRunner | Set-Content -LiteralPath $vmRunnerPath -Encoding UTF8

$sandboxPath = Join-Path $dropRoot "HERMES-BETA-QA.wsb"
$sandboxHostPath = Get-SafePathForSandboxXml -Path $dropRoot
$sandboxCommand = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process explorer.exe ''C:\Users\WDAGUtilityAccount\Desktop\HermesBetaQA''; Start-Process notepad.exe ''C:\Users\WDAGUtilityAccount\Desktop\HermesBetaQA\LEIA-ME-TESTE-BETA.md''"'
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
      <HostFolder>$sandboxHostPath</HostFolder>
      <SandboxFolder>C:\Users\WDAGUtilityAccount\Desktop\HermesBetaQA</SandboxFolder>
      <ReadOnly>false</ReadOnly>
    </MappedFolder>
  </MappedFolders>
  <LogonCommand>
    <Command>$sandboxCommand</Command>
  </LogonCommand>
</Configuration>
"@
$sandboxXml | Set-Content -LiteralPath $sandboxPath -Encoding UTF8

$receiveCommand = [string]$latestReady.nextCommandAfterVm
$readmePath = Join-Path $dropRoot "LEIA-ME-TESTE-BETA.md"
$readme = New-Object System.Collections.Generic.List[string]
$readme.Add("# Hermes Beta - Drop de QA")
$readme.Add("")
$readme.Add("- Beta: $($latestReady.handoffName)")
$readme.Add("- Status do beta: $($latestReady.status)")
$readme.Add("- Decisao beta: $($latestReady.betaDecision)")
$readme.Add("- Release publico: $($latestReady.publicReleaseStatus)")
$readme.Add("- ZIP beta: $betaZipName")
$readme.Add("- ZIP QA portatil: $qaZipName")
$readme.Add("- Pacote extraido: $dropExtractRoot")
$readme.Add("")
$readme.Add("## Como testar em VM ou maquina limpa")
$readme.Add("")
$readme.Add("1. Copie esta pasta inteira para a VM ou abra HERMES-BETA-QA.wsb se for usar Windows Sandbox.")
$readme.Add("2. Dentro da VM, abra PowerShell nesta pasta.")
$readme.Add("3. Rode:")
$readme.Add("")
$readme.Add("~~~powershell")
$readme.Add("powershell -NoProfile -ExecutionPolicy Bypass -File .\RODAR-DENTRO-DA-VM.ps1")
$readme.Add("~~~")
$readme.Add("")
$readme.Add("4. Siga as perguntas do coletor manual.")
$readme.Add("5. Ao finalizar, copie a pasta HermesQA gerada dentro de qa-extraido de volta para o computador principal.")
$readme.Add("")
$readme.Add("## Como consolidar no host")
$readme.Add("")
$readme.Add("No projeto Hermes, rode:")
$readme.Add("")
$readme.Add("~~~powershell")
$readme.Add($receiveCommand)
$readme.Add("~~~")
$readme.Add("")
$readme.Add("Se estiver usando Windows Sandbox com esta pasta mapeada, a pasta HermesQA pode ficar dentro deste drop em qa-extraido.")
$readme.Add("")
$readme.Add("## Importante")
$readme.Add("")
$readme.Add("- Este pacote e beta interno, nao release publico.")
$readme.Add("- O release publico continua NO-GO enquanto assinatura Authenticode e QA manual completa nao fecharem.")
$readme.Add("- O modo teste deve impedir mudancas reais no Windows.")
$readme | Set-Content -LiteralPath $readmePath -Encoding UTF8

$manifestPath = Join-Path $dropRoot "beta-test-drop-manifest.json"
$manifest = [pscustomObject]@{
  generatedAt        = (Get-Date).ToString("o")
  dropName           = $dropName
  dropRoot           = $dropRoot
  betaPackage        = [string]$latestReady.handoffName
  betaZipPath        = Join-Path $dropFilesRoot $betaZipName
  betaZipSha256      = [string]$latestReady.handoffZipSha256
  qaPortableZip      = Join-Path $dropFilesRoot $qaZipName
  qaPortableZipSha256 = [string]$verification.qaPortableZipSha256
  extractedPackage   = $dropExtractRoot
  vmRunnerPath       = $vmRunnerPath
  sandboxPath        = $sandboxPath
  readmePath         = $readmePath
  receiveCommand     = $receiveCommand
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

$latestDropPath = Join-Path $OutputRoot "latest-beta-test-drop.json"
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $latestDropPath -Encoding UTF8

$latestDropMarkdownPath = Join-Path $OutputRoot "latest-beta-test-drop.md"
$latestDropMarkdown = New-Object System.Collections.Generic.List[string]
$latestDropMarkdown.Add("# Hermes Latest Beta Test Drop")
$latestDropMarkdown.Add("")
$latestDropMarkdown.Add("- Drop: $dropName")
$latestDropMarkdown.Add("- Pasta: $dropRoot")
$latestDropMarkdown.Add("- Guia: $readmePath")
$latestDropMarkdown.Add("- Runner VM: $vmRunnerPath")
$latestDropMarkdown.Add("- Windows Sandbox: $sandboxPath")
$latestDropMarkdown.Add("- Recebimento: $receiveCommand")
$latestDropMarkdown | Set-Content -LiteralPath $latestDropMarkdownPath -Encoding UTF8

Write-Host "Hermes beta test drop gerado:"
Write-Host "- $dropRoot"
Write-Host "- $readmePath"
Write-Host "- $vmRunnerPath"
Write-Host "- $sandboxPath"
Write-Host "- $manifestPath"

if ($LaunchSandbox) {
  Write-Host "Abrindo Windows Sandbox..."
  Start-Process -FilePath $sandboxPath
} else {
  Write-Host "Sandbox nao aberto. Use -LaunchSandbox para abrir automaticamente."
}
