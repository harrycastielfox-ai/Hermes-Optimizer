$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$failures = New-Object System.Collections.Generic.List[string]

function Assert-True {
  param(
    [bool]$Condition,
    [string]$Message
  )

  if (-not $Condition) {
    $script:failures.Add($Message)
  }
}

function Read-Text {
  param([string]$Path)
  return Get-Content -LiteralPath $Path -Raw -Encoding UTF8
}

$packagePath = Join-Path $root "package.json"
$tauriConfigPath = Join-Path $root "src-tauri\tauri.conf.json"
$manifestPath = Join-Path $root "src-tauri\windows-app-manifest.xml"
$buildRsPath = Join-Path $root "src-tauri\build.rs"
$capabilityPath = Join-Path $root "src-tauri\capabilities\default.json"
$safeModeTsPath = Join-Path $root "src\lib\safe-mode.ts"
$safeModeRsPath = Join-Path $root "src-tauri\src\safe_mode.rs"
$buildModeSyncScript = Join-Path $root "scripts\verify-build-mode-sync.ps1"
$manualQaBulkPath = Join-Path $root "scripts\update-manual-qa-bulk.ps1"
$manualQaSelectPath = Join-Path $root "scripts\select-manual-qa-session.ps1"
$manualQaPlanPath = Join-Path $root "scripts\create-manual-qa-action-plan.ps1"
$manualQaDropPath = Join-Path $root "scripts\create-manual-qa-test-drop.ps1"
$manualQaDropVerifyPath = Join-Path $root "scripts\check-manual-qa-test-drop.ps1"
$manualQaDropReceivePath = Join-Path $root "scripts\receive-manual-qa-test-drop.ps1"
$manualQaDropOpenPath = Join-Path $root "scripts\open-manual-qa-test-drop.ps1"
$manualQaDropZipPath = Join-Path $root "scripts\package-manual-qa-test-drop.ps1"
$manualQaDropAutoPath = Join-Path $root "scripts\run-manual-qa-test-drop-auto.ps1"
$signingHandoffPath = Join-Path $root "scripts\create-signing-handoff.ps1"
$launchPlanPath = Join-Path $root "scripts\create-release-launch-plan.ps1"
$publicReleasePipelinePath = Join-Path $root "scripts\run-public-release-pipeline.ps1"
$qaWindowsDropWorkflowPath = Join-Path $root ".github\workflows\qa-windows-drop.yml"
$signedWindowsWorkflowPath = Join-Path $root ".github\workflows\release-windows-signed.yml"
$publicReleaseReadyPath = Join-Path $root "scripts\verify-public-release-ready.ps1"

$package = Read-Text $packagePath | ConvertFrom-Json
$tauriConfig = Read-Text $tauriConfigPath | ConvertFrom-Json
$cargoToml = Read-Text (Join-Path $root "src-tauri\Cargo.toml")
$oldBrand = 'liga' + 'hub'
$oldBrandPattern = "play\.$oldBrand|org\.$oldBrand"
$manifest = Read-Text $manifestPath
$buildRs = Read-Text $buildRsPath
$capability = Read-Text $capabilityPath | ConvertFrom-Json
$safeModeTs = Read-Text $safeModeTsPath
$safeModeRs = Read-Text $safeModeRsPath
$manualQaBulk = Read-Text $manualQaBulkPath
$manualQaSelect = Read-Text $manualQaSelectPath
$manualQaPlan = Read-Text $manualQaPlanPath
$manualQaDrop = Read-Text $manualQaDropPath
$manualQaDropVerify = Read-Text $manualQaDropVerifyPath
$manualQaDropReceive = Read-Text $manualQaDropReceivePath
$manualQaDropOpen = Read-Text $manualQaDropOpenPath
$manualQaDropZip = Read-Text $manualQaDropZipPath
$manualQaDropAuto = Read-Text $manualQaDropAutoPath
$signingHandoff = Read-Text $signingHandoffPath
$launchPlan = Read-Text $launchPlanPath
$publicReleasePipeline = Read-Text $publicReleasePipelinePath
$qaWindowsDropWorkflow = Read-Text $qaWindowsDropWorkflowPath
$signedWindowsWorkflow = Read-Text $signedWindowsWorkflowPath
$publicReleaseReady = Read-Text $publicReleaseReadyPath

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $buildModeSyncScript
Assert-True ($LASTEXITCODE -eq 0) `
  "Build mode sync precisa garantir frontend/backend juntos em test/real."

Assert-True ($manifest -match 'requestedExecutionLevel\s+level="requireAdministrator"') `
  "Manifest Windows precisa exigir requireAdministrator."
Assert-True ($buildRs -match 'windows-app-manifest\.xml') `
  "build.rs precisa embutir windows-app-manifest.xml."
Assert-True ([string]$tauriConfig.identifier -eq "com.hermesoptimizer.desktop") `
  "Identifier Tauri precisa usar o namespace Hermes: com.hermesoptimizer.desktop."
Assert-True ([string]$tauriConfig.identifier -notmatch $oldBrand) `
  "Identifier Tauri nao pode conter branding tecnico antigo."
Assert-True ((Read-Text $tauriConfigPath) -notmatch $oldBrandPattern) `
  "tauri.conf.json nao pode manter branding tecnico antigo."
Assert-True ($cargoToml -notmatch $oldBrandPattern) `
  "Cargo.toml nao pode manter repository/branding tecnico antigo."

& node (Join-Path $root "scripts\verify-optimization-catalog.mjs")
Assert-True ($LASTEXITCODE -eq 0) `
  "Catalogo de Otimizar Tudo precisa manter 150+ acoes e a meta HERMES_ACTION_TARGET sincronizada."

& node (Join-Path $root "scripts\verify-gamer-dependency-manifest.mjs")
Assert-True ($LASTEXITCODE -eq 0) `
  "Manifesto de dependencias gamer precisa manter instalacao bloqueada ate URL, SHA256 e assinatura."

& node (Join-Path $root "scripts\verify-feature-preservation.mjs")
Assert-True ($LASTEXITCODE -eq 0) `
  "Funcionalidades existentes precisam continuar preservadas mesmo fora da sidebar principal."

Assert-True ($safeModeTs -match 'VITE_HERMES_SAFE_TEST_MODE') `
  "Frontend precisa ler VITE_HERMES_SAFE_TEST_MODE."
Assert-True ($safeModeTs -match 'parseSafeModeFlag\(SAFE_TEST_MODE_ENV\)\s*\?\?\s*true') `
  "Frontend precisa manter modo teste como padrao."
Assert-True ($safeModeRs -match 'option_env!\("HERMES_SAFE_TEST_MODE"\)') `
  "Backend precisa ler HERMES_SAFE_TEST_MODE em tempo de build."
Assert-True ($safeModeRs -match 'DEFAULT_SAFE_TEST_MODE:\s*bool\s*=\s*true') `
  "Backend precisa manter modo teste como padrao."

$scripts = $package.scripts
Assert-True ([bool]$scripts.'build:windows:test') "package.json precisa ter build:windows:test."
Assert-True ([bool]$scripts.'build:windows:real') "package.json precisa ter build:windows:real."
Assert-True ([bool]$scripts.'build:windows:real:signed') "package.json precisa ter build:windows:real:signed."
Assert-True ([bool]$scripts.'verify:build-mode') "package.json precisa ter verify:build-mode."
Assert-True ([bool]$scripts.'verify:feature-preservation') "package.json precisa ter verify:feature-preservation."
Assert-True ([bool]$scripts.'qa:manual:bulk') "package.json precisa ter qa:manual:bulk para QA em lote com evidencia."
Assert-True ([bool]$scripts.'qa:manual:select') "package.json precisa ter qa:manual:select."
Assert-True ([bool]$scripts.'qa:manual:select:best') "package.json precisa ter qa:manual:select:best."
Assert-True ([bool]$scripts.'qa:manual:plan') "package.json precisa ter qa:manual:plan."
Assert-True ([bool]$scripts.'qa:manual:drop') "package.json precisa ter qa:manual:drop."
Assert-True ([bool]$scripts.'qa:manual:drop:verify') "package.json precisa ter qa:manual:drop:verify."
Assert-True ([bool]$scripts.'qa:manual:drop:open') "package.json precisa ter qa:manual:drop:open."
Assert-True ([bool]$scripts.'qa:manual:drop:sandbox') "package.json precisa ter qa:manual:drop:sandbox."
Assert-True ([bool]$scripts.'qa:manual:drop:zip') "package.json precisa ter qa:manual:drop:zip."
Assert-True ([bool]$scripts.'qa:manual:drop:auto') "package.json precisa ter qa:manual:drop:auto."
Assert-True ([bool]$scripts.'qa:manual:drop:auto:install') "package.json precisa ter qa:manual:drop:auto:install."
Assert-True ([bool]$scripts.'qa:manual:drop:check') "package.json precisa ter qa:manual:drop:check."
Assert-True ([bool]$scripts.'qa:manual:drop:receive') "package.json precisa ter qa:manual:drop:receive."
Assert-True ([bool]$scripts.'release:signing:handoff') "package.json precisa ter release:signing:handoff."
Assert-True ([bool]$scripts.'release:launch-plan') "package.json precisa ter release:launch-plan."
Assert-True ([bool]$scripts.'release:public:pipeline') "package.json precisa ter release:public:pipeline."
Assert-True ([bool]$scripts.'release:public:pipeline:preview') "package.json precisa ter release:public:pipeline:preview."
Assert-True ([bool]$scripts.'release:public:verify') "package.json precisa ter release:public:verify."
Assert-True ($manualQaBulk -match 'ConfirmBulkPass') `
  "QA manual em lote precisa exigir ConfirmBulkPass para aprovacao em massa."
Assert-True ($manualQaBulk -match 'install-nsis' -and $manualQaBulk -match 'install-msi' -and $manualQaBulk -match 'authenticode') `
  "QA manual em lote precisa proteger instaladores e Authenticode por padrao."
Assert-True ($manualQaBulk -match 'AllowProtected') `
  "QA manual em lote precisa exigir AllowProtected para itens criticos."
Assert-True ($manualQaSelect -match 'active-manual-qa-session' -and $manualQaSelect -match 'p0Passed' -and $manualQaSelect -match 'Best') `
  "QA manual precisa permitir selecionar sessao ativa e recuperar a sessao com melhor progresso."
Assert-True ($manualQaPlan -match 'qa:manual:receive' -and $manualQaPlan -match 'all-non-protected') `
  "Plano de QA manual precisa orientar receive da VM e aprovacao em lote nao protegida."
Assert-True ($manualQaDrop -match 'RODAR-QA-HERMES-NA-VM.ps1' -and $manualQaDrop -match 'HERMES-MANUAL-QA.wsb') `
  "Drop de QA manual precisa gerar runner de VM e arquivo Windows Sandbox."
Assert-True ($manualQaDropVerify -match 'manual-qa-test-drop-verification' -and $manualQaDropVerify -match 'RUN-INSTALL-SMOKE.ps1') `
  "Verificador do drop de QA manual precisa validar pacote, runner e smoke."
Assert-True ($manualQaDropReceive -match 'receive-manual-qa-evidence.ps1' -and $manualQaDropReceive -match 'HermesQA') `
  "Recebimento do drop de QA manual precisa chamar receive-manual-qa-evidence com HermesQA do drop."
Assert-True ($manualQaDropReceive -match 'CheckOnly' -and $manualQaDropReceive -match 'manual-qa-test-drop-receive-check') `
  "Recebimento do drop de QA manual precisa ter modo CheckOnly antes de importar evidencias."
Assert-True ($manualQaDropOpen -match 'WindowsSandbox.exe' -and $manualQaDropOpen -match 'explorer.exe' -and $manualQaDropOpen -match 'qa:manual:drop:check') `
  "Abridor do drop de QA manual precisa abrir pasta, suportar Sandbox e mostrar comandos de retorno."
Assert-True ($manualQaDropZip -match 'Compress-Archive' -and $manualQaDropZip -match 'SHA256' -and $manualQaDropZip -match 'RODAR-QA-HERMES-NA-VM.ps1') `
  "Empacotador do drop de QA manual precisa gerar ZIP com SHA256 e instrucoes de VM."
Assert-True ($manualQaDrop -match 'HERMES_QA_AUTO_SAFE' -and $manualQaDrop -match 'BLOCKED_BY_AUTO_SAFE') `
  "Runner do drop de QA manual precisa bloquear install smoke/GUI no modo automatico seguro."
Assert-True ($manualQaDropReceive -match 'HERMES_QA_ALLOW_WITHOUT_INSTALL_SMOKE') `
  "Recebimento do drop precisa permitir importacao controlada sem install smoke no modo automatico seguro."
Assert-True ($manualQaDropAuto -match 'qa:manual:drop:zip' -and $manualQaDropAuto -match 'RODAR-QA-HERMES-NA-VM.ps1' -and $manualQaDropAuto -match 'HERMES_QA_AUTO_SAFE' -and $manualQaDropAuto -match 'manual-qa-drop-auto-result') `
  "Fluxo automatico do drop precisa zipar, validar SHA256, extrair, rodar QuickPassAll em modo seguro e gerar relatorio."
Assert-True ($manualQaDropAuto -match 'build:windows:test' -and $manualQaDropAuto -match 'release:internal') `
  "Fluxo automatico do drop precisa inicializar build/sessao quando rodar em checkout limpo."
Assert-True ($manualQaDropAuto -match 'AllowInstallSmoke' -and $manualQaDropAuto -match 'Install smoke real exige') `
  "Fluxo automatico precisa ter modo explicito para install smoke real em runner/VM elevado."
Assert-True ($signingHandoff -match 'Code Signing' -and $signingHandoff -match 'HERMES_CERT_THUMBPRINT') `
  "Handoff de assinatura precisa explicar certificado Code Signing e HERMES_CERT_THUMBPRINT."
Assert-True ($launchPlan -match 'qa:manual:drop:open' -and $launchPlan -match 'release:signing:handoff' -and $launchPlan -match 'build:windows:real:signed') `
  "Plano de lancamento precisa orientar QA manual, handoff de assinatura e build real assinado."
Assert-True ($publicReleasePipeline -match 'AllowInstallSmoke' -and $publicReleasePipeline -match 'BuildSigned' -and $publicReleasePipeline -match 'RegenerateReleaseCandidate' -and $publicReleasePipeline -match 'release:public:verify' -and $publicReleasePipeline -match 'public-release-pipeline-latest') `
  "Pipeline publico precisa orquestrar QA, install smoke opt-in, assinatura opt-in, RC opt-in, gate publico e relatorio latest."
Assert-True ($qaWindowsDropWorkflow -match 'windows-latest' -and $qaWindowsDropWorkflow -match 'npm ci' -and $qaWindowsDropWorkflow -match 'qa:manual:drop:auto' -and $qaWindowsDropWorkflow -match 'qa:manual:drop:auto:install' -and $qaWindowsDropWorkflow -match 'actions/upload-artifact') `
  "Workflow QA Windows Drop precisa rodar em windows-latest, instalar dependencias, executar auto drop seguro/install opt-in e publicar artifacts."
Assert-True ($signedWindowsWorkflow -match 'windows-latest' -and $signedWindowsWorkflow -match 'HERMES_SIGNING_PFX_BASE64' -and $signedWindowsWorkflow -match 'HERMES_SIGNING_PFX_PASSWORD' -and $signedWindowsWorkflow -match 'build:windows:real:signed' -and $signedWindowsWorkflow -match 'release:public:verify' -and $signedWindowsWorkflow -match 'actions/upload-artifact') `
  "Workflow Release Windows Signed precisa importar PFX via secrets, gerar build real assinado, rodar gate publico e publicar instaladores/evidencias."
Assert-True ($publicReleaseReady -match 'unsignedInstallerCount' -and $publicReleaseReady -match 'signingAllInstallersSigned' -and $publicReleaseReady -match 'publicDecision' -and $publicReleaseReady -match 'Authenticode Valid') `
  "Gate de publicacao publica precisa bloquear P0 incompleto, instalador sem assinatura e RC NO-GO."

$permissions = @($capability.permissions)
$forbiddenPermissions = @(
  "shell:default",
  "fs:default",
  "dialog:default",
  "http:default",
  "process:default",
  "updater:default"
)

foreach ($forbidden in $forbiddenPermissions) {
  Assert-True (-not ($permissions -contains $forbidden)) "Permissao ampla proibida encontrada: $forbidden."
}

Assert-True ($permissions -contains "core:default") "Capability precisa manter core:default."
Assert-True ($permissions -contains "core:window:allow-start-dragging") `
  "Capability precisa permitir arrastar a janela customizada."
Assert-True ($permissions -contains "core:window:allow-toggle-maximize") `
  "Capability precisa permitir maximizar a janela customizada."

$csp = [string]$tauriConfig.app.security.csp
Assert-True ($csp -match "default-src 'self'") "CSP precisa limitar default-src a self."
Assert-True ($csp -match "script-src 'self'") "CSP precisa limitar scripts a self."
Assert-True ($csp -notmatch "'unsafe-eval'") "CSP nao pode liberar unsafe-eval."
Assert-True ($csp -match "object-src 'none'") "CSP precisa bloquear object-src."
Assert-True ($csp -match "base-uri 'self'") "CSP precisa limitar base-uri."
Assert-True ($csp -match "frame-ancestors 'none'") "CSP precisa bloquear embedding."
Assert-True ($csp -match "connect-src 'self' ipc:") "CSP precisa permitir somente self/ipc como base."

if ($failures.Count -gt 0) {
  Write-Host "Hermes release gates: FALHOU" -ForegroundColor Red
  foreach ($failure in $failures) {
    Write-Host "- $failure" -ForegroundColor Red
  }
  exit 1
}

Write-Host "Hermes release gates: OK" -ForegroundColor Green
Write-Host "- Manifest Windows exige administrador."
Write-Host "- Safe mode e controlado por variaveis de build e padrao teste."
Write-Host "- Build real/teste sincroniza frontend e backend."
Write-Host "- Permissoes Tauri continuam minimas."
Write-Host "- CSP contem as travas obrigatorias."
Write-Host "- Scripts de build test/real/signed existem."
Write-Host "- QA manual em lote existe com travas de evidencia e itens protegidos."
Write-Host "- Plano de acao do QA manual existe para VM, lote e assinatura."
Write-Host "- Drop de QA manual existe para VM/maquina limpa."
Write-Host "- Verificador do drop de QA manual existe."
Write-Host "- Abridor do drop de QA manual existe."
Write-Host "- ZIP exportavel do drop de QA manual existe."
Write-Host "- Fluxo automatico local do drop existe com logs, SHA256 e bloqueio seguro de install/GUI."
Write-Host "- Fluxo automatico possui modo opt-in de install smoke real para VM/runner elevado."
Write-Host "- Workflow GitHub Actions valida o drop em Windows efemero, com install smoke real opcional, e publica logs/ZIP como artifacts."
Write-Host "- Workflow manual de release assinado importa PFX via secrets, gera MSI/NSIS assinados e bloqueia publicacao se o gate publico falhar."
Write-Host "- Gate de publicacao publica bloqueia RC NO-GO e instaladores sem Authenticode Valid."
Write-Host "- Check de retorno do drop de QA manual existe."
Write-Host "- Recebimento automatico do drop de QA manual existe."
Write-Host "- Preservacao de rotas, motores e documentos importantes esta protegida."
Write-Host "- Handoff de assinatura existe para destravar Authenticode."
Write-Host "- Plano de lancamento final existe para orientar QA manual, assinatura e build publicavel."
Write-Host "- Pipeline publico unico existe para orquestrar checks, QA drop, assinatura opt-in, status e gate final."
