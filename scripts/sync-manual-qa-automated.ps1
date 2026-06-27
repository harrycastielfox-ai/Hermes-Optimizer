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
$items = @($session.items)
$authenticodeItem = $items | Where-Object { $_.id -eq "authenticode" } | Select-Object -First 1

function Invoke-NpmPrecheck {
  param(
    [string]$ScriptName
  )

  Push-Location $root
  try {
    & npm.cmd run $ScriptName --silent | Out-Null
    return $LASTEXITCODE -eq 0
  } finally {
    Pop-Location
  }
}

function Add-ManualQaPrecheckEvidence {
  param(
    [string]$ItemId,
    [string]$Evidence,
    [string]$Notes
  )

  $item = $items | Where-Object { $_.id -eq $ItemId } | Select-Object -First 1
  if (-not $item) {
    return
  }

  if ($item.status -ne "pending") {
    return
  }

  if ([string]::IsNullOrWhiteSpace([string]$item.evidence)) {
    $item.evidence = $Evidence
  }

  if ([string]::IsNullOrWhiteSpace([string]$item.notes)) {
    $item.notes = $Notes
  }
}

function Set-ManualQaItemResult {
  param(
    [string]$ItemId,
    [string]$Status,
    [string]$Evidence,
    [string]$Notes,
    [switch]$OnlyPending,
    [switch]$OnlyPendingOrBlocked
  )

  $item = $items | Where-Object { $_.id -eq $ItemId } | Select-Object -First 1
  if (-not $item) {
    return
  }

  if ($OnlyPending -and $item.status -ne "pending") {
    return
  }

  if ($OnlyPendingOrBlocked -and $item.status -ne "pending" -and $item.status -ne "blocked") {
    return
  }

  $item.status = $Status
  $item.evidence = $Evidence
  $item.notes = $Notes
}

function Add-EvidenceLine {
  param(
    [string]$Current,
    [string]$Line
  )

  if ([string]::IsNullOrWhiteSpace($Current)) {
    return $Line
  }

  if ($Current.Contains($Line)) {
    return $Current
  }

  return "$Current $Line"
}

function Reset-CleanInstallBlockedItems {
  param(
    [string]$InstallSmokePath,
    [bool]$HasLaunchEvidence
  )

  if (-not $HasLaunchEvidence) {
    return 0
  }

  $dependentItemIds = @(
    "normal-window",
    "sidebar-routes",
    "scroll",
    "dashboard-read-only",
    "phase2-locked",
    "prepare-test",
    "restart-gate",
    "optimize-test-fate",
    "safe-mode-no-real-change"
  )
  $unblocked = 0
  $evidenceLine = "Prerequisito de instalacao limpa atendido por install smoke com launch detectado: $InstallSmokePath."
  $notesLine = "Item reaberto automaticamente para validacao manual no app instalado."

  foreach ($itemId in $dependentItemIds) {
    $item = $items | Where-Object { $_.id -eq $itemId } | Select-Object -First 1
    if (-not $item -or $item.status -ne "blocked") {
      continue
    }

    $evidence = [string]$item.evidence
    $notes = [string]$item.notes
    $isCleanInstallBlock =
      $evidence -match "instalacao do RC em maquina limpa|WindowsSandbox\.exe|install-smoke" -or
      $notes -match "Retomar apos validar NSIS/MSI|Windows Sandbox ou VM limpa"

    if (-not $isCleanInstallBlock) {
      continue
    }

    $item.status = "pending"
    $item.evidence = Add-EvidenceLine -Current $evidence -Line $evidenceLine
    $item.notes = Add-EvidenceLine -Current $notes -Line $notesLine
    $unblocked += 1
  }

  return $unblocked
}

function Get-LatestInstallSmokeReport {
  $reports = Get-ChildItem -LiteralPath $SessionPath -Recurse -Filter "install-smoke-result.json" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending

  if (-not $reports) {
    return $null
  }

  $reportPath = $reports[0].FullName
  $report = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
  if ([string]$report.candidateName -ne [string]$session.candidateName) {
    return $null
  }

  [pscustomobject]@{
    path   = $reportPath
    report = $report
  }
}

if (-not $authenticodeItem) {
  throw "Item 'authenticode' nao encontrado na sessao de QA manual."
}

$installerReports = @()
foreach ($installer in @($session.installers)) {
  $installerPath = if (-not [string]::IsNullOrWhiteSpace([string]$installer.relativePath) -and
    -not [string]::IsNullOrWhiteSpace($candidatePath)) {
    Join-Path $candidatePath ([string]$installer.relativePath)
  } else {
    [string]$installer.sourcePath
  }

  $exists = Test-Path -LiteralPath $installerPath -PathType Leaf
  $signatureStatus = "Missing"
  $signerSubject = $null
  $sha256 = $null
  $lengthBytes = 0

  if ($exists) {
    $signature = Get-AuthenticodeSignature -LiteralPath $installerPath
    $signatureStatus = [string]$signature.Status
    if ($signature.SignerCertificate) {
      $signerSubject = $signature.SignerCertificate.Subject
    }
    $sha256 = (Get-FileHash -LiteralPath $installerPath -Algorithm SHA256).Hash
    $lengthBytes = (Get-Item -LiteralPath $installerPath).Length
  }

  $installer.signatureStatus = $signatureStatus
  $installer.signerSubject = $signerSubject
  $installer.sha256 = $sha256
  $installer.lengthBytes = $lengthBytes

  $installerReports += [pscustomobject]@{
    kind            = [string]$installer.kind
    path            = $installerPath
    exists          = $exists
    signatureStatus = $signatureStatus
    signerSubject   = $signerSubject
  }
}

$invalidInstallers = @($installerReports | Where-Object { $_.signatureStatus -ne "Valid" })
$evidence = ($installerReports | ForEach-Object {
    "$($_.kind.ToUpperInvariant()) Authenticode=$($_.signatureStatus)"
  }) -join "; "

if ($invalidInstallers.Count -eq 0 -and $installerReports.Count -gt 0) {
  $authenticodeItem.status = "passed"
  $authenticodeItem.evidence = $evidence
  $authenticodeItem.notes = "Sincronizado automaticamente por qa:manual:sync."
} else {
  $authenticodeItem.status = "blocked"
  $authenticodeItem.evidence = $evidence
  $authenticodeItem.notes = "Bloqueado automaticamente: release publica exige MSI/NSIS com Authenticode Valid."
}

$precheckReports = @()
$uiShellOk = Invoke-NpmPrecheck -ScriptName "verify:ui-shell"
$precheckReports += [pscustomobject]@{ name = "verify:ui-shell"; passed = $uiShellOk }
if ($uiShellOk) {
  Add-ManualQaPrecheckEvidence `
    -ItemId "normal-window" `
    -Evidence "Precheck tecnico passou: npm run verify:ui-shell validou chrome customizado, arraste, maximizar e alcas de redimensionamento." `
    -Notes "Ainda exige confirmacao manual no app instalado em maquina limpa."
  Add-ManualQaPrecheckEvidence `
    -ItemId "sidebar-routes" `
    -Evidence "Precheck tecnico passou: npm run verify:ui-shell validou sidebar aprovada e rotas principais." `
    -Notes "Ainda exige abrir as rotas no app instalado em maquina limpa."
  Add-ManualQaPrecheckEvidence `
    -ItemId "scroll" `
    -Evidence "Precheck tecnico passou: npm run verify:ui-shell validou areas rolaveis nas rotas principais." `
    -Notes "Ainda exige testar a roda do mouse no app instalado em maquina limpa."
}

$optimizationFlowOk = Invoke-NpmPrecheck -ScriptName "verify:optimization-flow"
$precheckReports += [pscustomobject]@{ name = "verify:optimization-flow"; passed = $optimizationFlowOk }
if ($optimizationFlowOk) {
  Add-ManualQaPrecheckEvidence `
    -ItemId "phase2-locked" `
    -Evidence "Precheck tecnico passou: npm run verify:optimization-flow validou Botao 2 bloqueado antes da Fase 1." `
    -Notes "Ainda exige confirmar visualmente no app instalado em maquina limpa."
  Add-ManualQaPrecheckEvidence `
    -ItemId "optimize-test-fate" `
    -Evidence "Precheck tecnico passou: npm run verify:optimization-flow validou selecao de jogo, Fate Trigger e sucesso final." `
    -Notes "Ainda exige executar o fluxo em modo teste no app instalado em maquina limpa."
}

$safeModeFlowOk = Invoke-NpmPrecheck -ScriptName "verify:safe-mode-flow"
$precheckReports += [pscustomobject]@{ name = "verify:safe-mode-flow"; passed = $safeModeFlowOk }
if ($safeModeFlowOk) {
  Add-ManualQaPrecheckEvidence `
    -ItemId "dashboard-read-only" `
    -Evidence "Precheck tecnico passou: npm run verify:safe-mode-flow validou Dashboard/Analise Agora como somente leitura." `
    -Notes "Ainda exige confirmar a tela no app instalado em maquina limpa."
  Add-ManualQaPrecheckEvidence `
    -ItemId "prepare-test" `
    -Evidence "Precheck tecnico passou: npm run verify:safe-mode-flow validou Botao 1 em dry-run quando o modo teste esta ativo." `
    -Notes "Ainda exige rodar o fluxo no app instalado em maquina limpa."
  Add-ManualQaPrecheckEvidence `
    -ItemId "safe-mode-no-real-change" `
    -Evidence "Precheck tecnico passou: npm run verify:safe-mode-flow validou Botao 1, Botao 2 e verificacao pos-execucao sem alteracao real em modo teste." `
    -Notes "Ainda exige comparacao manual em maquina limpa antes do GO."
}

$brandingOk = Invoke-NpmPrecheck -ScriptName "verify:branding-copy"
$precheckReports += [pscustomobject]@{ name = "verify:branding-copy"; passed = $brandingOk }
if ($brandingOk) {
  Add-ManualQaPrecheckEvidence `
    -ItemId "settings-language" `
    -Evidence "Precheck tecnico passou: npm run verify:branding-copy validou copy principal e acentos em telas centrais." `
    -Notes "Ainda exige revisao visual das Configuracoes no app instalado."
}

$installSmoke = Get-LatestInstallSmokeReport
$installSmokeUnblocked = 0
if ($installSmoke) {
  $smokeLaunchPassed = $false
  foreach ($result in @($installSmoke.report.results)) {
    $kind = [string]$result.kind
    $itemId = switch ($kind) {
      "nsis" { "install-nsis" }
      "msi" { "install-msi" }
      default { $null }
    }

    if ([string]::IsNullOrWhiteSpace($itemId)) {
      continue
    }

    $resultStatus = if ([bool]$result.passed) { "passed" } else { "failed" }
    $resultLabel = if ([bool]$result.passed) { "PASSOU" } else { "FALHOU" }
    $launchPassed = if ($result.PSObject.Properties.Name -contains "launch") { [bool]$result.launch.passed } else { $false }
    if ([bool]$result.passed -and $launchPassed) {
      $smokeLaunchPassed = $true
    }
    $resultEvidence = "Install smoke $resultLabel ($kind): ExitCode=$($result.exitCode); Authenticode=$($result.signatureStatus); Exe=$($result.executableFound); Registry=$($result.registryFound); Launch=$launchPassed; JSON=$($installSmoke.path)"
    $resultNotes = "Sincronizado automaticamente a partir do smoke de instalacao em Sandbox. Revisar o JSON/Markdown antes de publicar."

    Set-ManualQaItemResult `
      -ItemId $itemId `
      -Status $resultStatus `
      -Evidence $resultEvidence `
      -Notes $resultNotes `
      -OnlyPendingOrBlocked
  }

  $installSmokeUnblocked = Reset-CleanInstallBlockedItems `
    -InstallSmokePath $installSmoke.path `
    -HasLaunchEvidence $smokeLaunchPassed
}

$session.status = "in-progress"
$updatedAt = (Get-Date).ToString("o")
if ($session.PSObject.Properties.Name -contains "updatedAt") {
  $session.updatedAt = $updatedAt
} else {
  $session | Add-Member -NotePropertyName "updatedAt" -NotePropertyValue $updatedAt
}

$session | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $sessionJsonPath -Encoding UTF8

Write-Host "QA automatizado sincronizado."
Write-Host "Item authenticode: $($authenticodeItem.status)"
Write-Host "Evidencia: $evidence"
foreach ($precheck in $precheckReports) {
  Write-Host "Precheck $($precheck.name): $(if ($precheck.passed) { 'PASSOU' } else { 'FALHOU' })"
}
if ($installSmoke) {
  Write-Host "Install smoke: sincronizado de $($installSmoke.path)"
  Write-Host "Itens reabertos por install smoke: $installSmokeUnblocked"
} else {
  Write-Host "Install smoke: nenhum resultado encontrado nesta sessao."
}
Write-Host "Sessao: $SessionPath"

$verifyScript = Join-Path $PSScriptRoot "verify-manual-qa-session.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verifyScript -SessionPath $SessionPath -AllowPending
exit $LASTEXITCODE
