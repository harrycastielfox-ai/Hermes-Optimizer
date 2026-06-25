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
  "Catalogo de Otimizar Tudo precisa manter a meta tecnica de 150+ acoes."

& node (Join-Path $root "scripts\verify-gamer-dependency-manifest.mjs")
Assert-True ($LASTEXITCODE -eq 0) `
  "Manifesto de dependencias gamer precisa manter instalacao bloqueada ate URL, SHA256 e assinatura."

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
Write-Host "- Permissoes Tauri continuam minimas."
Write-Host "- CSP contem as travas obrigatorias."
Write-Host "- Scripts de build test/real/signed existem."
