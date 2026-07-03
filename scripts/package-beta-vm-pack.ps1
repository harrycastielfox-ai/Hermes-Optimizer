param(
  [string]$DropRoot,
  [string]$OutputRoot,
  [string]$VmPackRoot
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseRoot = Join-Path $root ".release"
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $releaseRoot "beta-test-drop"
}
if ([string]::IsNullOrWhiteSpace($VmPackRoot)) {
  $VmPackRoot = Join-Path $releaseRoot "beta-vm-pack"
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

if ([string]::IsNullOrWhiteSpace($DropRoot)) {
  $latestDropPath = Join-Path $OutputRoot "latest-beta-test-drop.json"
  $latestDrop = Read-JsonFile -Path $latestDropPath
  $DropRoot = [string]$latestDrop.dropRoot
}

if ([string]::IsNullOrWhiteSpace($DropRoot) -or -not (Test-Path -LiteralPath $DropRoot -PathType Container)) {
  throw "Drop beta nao encontrado: $DropRoot. Rode npm run release:beta:ship."
}

$doctorScript = Join-Path $PSScriptRoot "check-beta-doctor.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $doctorScript -DropRoot $DropRoot -OutputRoot $OutputRoot | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Beta doctor falhou. Corrija antes de gerar pack de VM."
}

$zipScript = Join-Path $PSScriptRoot "package-beta-test-drop.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $zipScript -DropRoot $DropRoot -OutputRoot $OutputRoot | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao gerar ZIP do beta drop."
}

$dropManifest = Read-JsonFile -Path (Join-Path $DropRoot "beta-test-drop-manifest.json")
$dropPackage = Read-JsonFile -Path (Join-Path $OutputRoot "latest-beta-test-drop-package.json")
$releaseStatus = Read-JsonFile -Path (Join-Path $releaseRoot "release-status.json")
$candidateManifest = Read-JsonFile -Path (Join-Path ([string]$releaseStatus.latestCandidate) "release-candidate-manifest.json")
$betaDoctor = Read-JsonFile -Path (Join-Path $OutputRoot "beta-doctor.json")
$betaSandbox = if (Test-Path -LiteralPath (Join-Path $OutputRoot "latest-beta-sandbox.json") -PathType Leaf) {
  Read-JsonFile -Path (Join-Path $OutputRoot "latest-beta-sandbox.json")
} else {
  $null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packName = "$($dropManifest.dropName)-vm-pack-$timestamp"
$packRoot = Join-Path $VmPackRoot $packName
New-Item -ItemType Directory -Force -Path $packRoot | Out-Null

$zipDestination = Join-Path $packRoot (Split-Path -Leaf ([string]$dropPackage.zipPath))
$shaDestination = "$zipDestination.sha256"
Copy-FileRequired -Source ([string]$dropPackage.zipPath) -Destination $zipDestination
Copy-FileRequired -Source ([string]$dropPackage.zipSha256Path) -Destination $shaDestination

$collectScriptPath = Join-Path $packRoot "collect-hermes-evidence.ps1"
$collectScript = @'
$ErrorActionPreference = "Continue"

$evidenceRoot = "C:\Temp\HermesQA"
New-Item -ItemType Directory -Force -Path $evidenceRoot | Out-Null

$logPath = Join-Path $evidenceRoot "vm-evidence-log.txt"
"Hermes VM evidence collection: $(Get-Date -Format o)" | Set-Content -LiteralPath $logPath -Encoding UTF8
"Usuario: $env:USERNAME" | Add-Content -LiteralPath $logPath -Encoding UTF8
"Computador: $env:COMPUTERNAME" | Add-Content -LiteralPath $logPath -Encoding UTF8
"OS: $((Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue).Caption)" | Add-Content -LiteralPath $logPath -Encoding UTF8

$processPath = Join-Path $evidenceRoot "processes.txt"
Get-Process | Sort-Object ProcessName | Select-Object ProcessName, Id, CPU, WorkingSet |
  Format-Table -AutoSize | Out-String | Set-Content -LiteralPath $processPath -Encoding UTF8

$installedPath = Join-Path $evidenceRoot "installed-hermes.txt"
Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* -ErrorAction SilentlyContinue |
  Where-Object { $_.DisplayName -match "Hermes" } |
  Select-Object DisplayName, DisplayVersion, Publisher, InstallLocation, UninstallString |
  Format-List | Out-String | Set-Content -LiteralPath $installedPath -Encoding UTF8

$notesPath = Join-Path $evidenceRoot "OBSERVACOES-DO-TESTADOR.txt"
if (-not (Test-Path -LiteralPath $notesPath -PathType Leaf)) {
  @"
Hermes Beta - Observacoes do testador

Preencha:
- Windows/VM:
- Instalador usado (MSI ou EXE):
- SmartScreen apareceu? Sim/Nao:
- O app abriu? Sim/Nao:
- Atalhos criados? Sim/Nao:
- Dashboard carregou? Sim/Nao:
- Otimizar abriu em modo teste? Sim/Nao:
- Anti-Cheat/Defender/Manutencao/Configuracoes abriram? Sim/Nao:
- Desinstalacao funcionou? Sim/Nao:
- Bugs encontrados:
"@ | Set-Content -LiteralPath $notesPath -Encoding UTF8
}

$zipPath = "C:\Temp\HermesQA.zip"
if (Test-Path -LiteralPath $zipPath -PathType Leaf) {
  Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -LiteralPath $evidenceRoot -DestinationPath $zipPath -Force

Write-Host "Evidencias coletadas em: $evidenceRoot"
Write-Host "ZIP de evidencias: $zipPath"
Write-Host "Traga a pasta ou ZIP para o host e rode:"
Write-Host 'npm run qa:manual:receive -- -EvidenceDropPath "C:\Temp\HermesQA"'
'@
$collectScript | Set-Content -LiteralPath $collectScriptPath -Encoding UTF8

$readmePath = Join-Path $packRoot "README-VM-TEST.md"
$checklistPath = Join-Path $packRoot "CHECKLIST-VM-TEST.md"

$installerLines = New-Object System.Collections.Generic.List[string]
foreach ($installer in @($candidateManifest.installers)) {
  $installerLines.Add("- $($installer.kind): $($installer.fileName)")
  $installerLines.Add("  - SHA256: $($installer.sha256)")
  $installerLines.Add("  - Authenticode: $($installer.signatureStatus)")
}

$readme = @"
# Hermes Beta unsigned - Teste em VM externa/outro PC limpo

Este pacote e para beta fechado. Ele nao e release publico.

O Windows host nao deve instalar nem executar MSI/EXE. Teste apenas em VM Windows limpa ou outro PC descartavel/limpo.

## Conteudo

- ZIP do beta/drop: $(Split-Path -Leaf $zipDestination)
- SHA256: $($dropPackage.zipSha256)
- Coletor de evidencias: collect-hermes-evidence.ps1
- Checklist: CHECKLIST-VM-TEST.md

## Instaladores do RC

$($installerLines -join "`r`n")

## Passo a passo

1. Crie ou use uma VM Windows limpa.
2. Copie este pack para dentro da VM.
3. Extraia o ZIP do beta/drop.
4. Abra o LEIA-ME-TESTE-BETA.md dentro da pasta extraida.
5. Instale manualmente o MSI ou EXE dentro da VM.
6. Observe se o SmartScreen aparece e registre isso no checklist.
7. Teste abertura, atalhos, Dashboard, Otimizar, Anti-Cheat, Defender, Manutencao e Configuracoes.
8. Teste a desinstalacao.
9. Rode dentro da VM:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\collect-hermes-evidence.ps1
~~~

10. Compacte ou copie C:\Temp\HermesQA para o host.
11. No host, rode:

~~~powershell
npm run qa:manual:receive -- -EvidenceDropPath "C:\Temp\HermesQA"
~~~

## Regras de seguranca

- Nao desative Defender, SmartScreen, UAC ou seguranca do Windows.
- Nao instale Hermes no Windows host.
- Nao rode MSI/EXE no Windows host.
- Nao e necessario Code Signing para este beta fechado.
- O release publico continua NO-GO sem Authenticode valido.
"@
$readme | Set-Content -LiteralPath $readmePath -Encoding UTF8

$checklist = @"
# Checklist VM Test - Hermes Beta

- [ ] VM Windows limpa criada/iniciada.
- [ ] ZIP do beta/drop copiado para dentro da VM.
- [ ] ZIP extraido dentro da VM.
- [ ] `LEIA-ME-TESTE-BETA.md` lido.
- [ ] SHA256 do pack conferido quando aplicavel.
- [ ] MSI instalado manualmente ou EXE instalado manualmente.
- [ ] SmartScreen observado e registrado.
- [ ] Hermes abriu apos instalacao.
- [ ] Atalho/menu iniciar verificado.
- [ ] Dashboard carregou.
- [ ] Otimizar abriu sem executar no host.
- [ ] Anti-Cheat abriu.
- [ ] Defender abriu.
- [ ] Manutencao abriu.
- [ ] Configuracoes abriu.
- [ ] Scroll/redimensionamento/navegacao basica verificados.
- [ ] Desinstalacao testada.
- [ ] `collect-hermes-evidence.ps1` executado.
- [ ] Pasta `C:\Temp\HermesQA` ou ZIP trazido para o host.
- [ ] Evidencias recebidas no host.
"@
$checklist | Set-Content -LiteralPath $checklistPath -Encoding UTF8

$manifestPath = Join-Path $packRoot "beta-vm-pack-manifest.json"
$manifest = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  packName = $packName
  packRoot = $packRoot
  betaDropName = [string]$dropManifest.dropName
  betaPackage = [string]$dropManifest.betaPackage
  betaDropZip = $zipDestination
  betaDropZipSha256 = [string]$dropPackage.zipSha256
  betaDropZipSha256Path = $shaDestination
  betaClosed = $true
  unsignedInstallerWarning = "Instaladores do beta estao sem Authenticode valido; use somente VM/outro PC limpo."
  publicRelease = [string]$releaseStatus.overallStatus
  sandboxStatus = [string]$betaDoctor.status
  sandboxPrepared = [bool]($betaSandbox -and (Test-Path -LiteralPath ([string]$betaSandbox.wsbPath) -PathType Leaf))
  installers = @($candidateManifest.installers | ForEach-Object {
    [pscustomobject]@{
      kind = [string]$_.kind
      fileName = [string]$_.fileName
      sha256 = [string]$_.sha256
      authenticode = [string]$_.signatureStatus
      signerSubject = $_.signerSubject
    }
  })
  returnEvidenceCommand = 'npm run qa:manual:receive -- -EvidenceDropPath "C:\Temp\HermesQA"'
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

$latestPath = Join-Path $VmPackRoot "latest-beta-vm-pack.json"
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $latestPath -Encoding UTF8

Write-Host "Hermes beta VM pack gerado:"
Write-Host "- Pack: $packRoot"
Write-Host "- ZIP: $zipDestination"
Write-Host "- SHA256: $($dropPackage.zipSha256)"
Write-Host "- README: $readmePath"
Write-Host "- Checklist: $checklistPath"
Write-Host "- Coletor: $collectScriptPath"
Write-Host "- Manifesto: $manifestPath"
