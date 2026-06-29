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
$controlledBuildPath = Join-Path $root "scripts\build-windows-controlled.ps1"
$safeModeTsPath = Join-Path $root "src\lib\safe-mode.ts"
$safeModeRsPath = Join-Path $root "src-tauri\src\safe_mode.rs"
$buildRsPath = Join-Path $root "src-tauri\build.rs"
$tauriConfigPath = Join-Path $root "src-tauri\tauri.conf.json"

$package = Read-Text $packagePath | ConvertFrom-Json
$controlledBuild = Read-Text $controlledBuildPath
$safeModeTs = Read-Text $safeModeTsPath
$safeModeRs = Read-Text $safeModeRsPath
$buildRs = Read-Text $buildRsPath
$tauriConfig = Read-Text $tauriConfigPath | ConvertFrom-Json

$scripts = $package.scripts
$buildWindowsTest = [string]$scripts.'build:windows:test'
$buildWindowsReal = [string]$scripts.'build:windows:real'
$buildWindowsRealSigned = [string]$scripts.'build:windows:real:signed'
$buildTauri = [string]$scripts.'build:tauri'

Assert-True ($buildWindowsTest -match 'build-windows-controlled\.ps1' -and $buildWindowsTest -match '-Mode test') `
  "build:windows:test precisa chamar build-windows-controlled.ps1 com -Mode test."
Assert-True ($buildWindowsReal -match 'build-windows-controlled\.ps1' -and $buildWindowsReal -match '-Mode real') `
  "build:windows:real precisa chamar build-windows-controlled.ps1 com -Mode real."
Assert-True ($buildWindowsRealSigned -match 'build-windows-controlled\.ps1' -and $buildWindowsRealSigned -match '-Mode real' -and $buildWindowsRealSigned -match '-Signed') `
  "build:windows:real:signed precisa chamar build-windows-controlled.ps1 com -Mode real -Signed."
Assert-True ($buildTauri -match 'vite build --config vite\.tauri\.config\.ts') `
  "build:tauri precisa usar vite.tauri.config.ts para o frontend Tauri."

Assert-True ($controlledBuild -match '\[ValidateSet\("test", "real"\)\]') `
  "build-windows-controlled.ps1 precisa limitar -Mode a test/real."
Assert-True ($controlledBuild -match '\$safeModeValue\s*=\s*if\s*\(\$Mode\s*-eq\s*"real"\)\s*\{\s*"false"\s*\}\s*else\s*\{\s*"true"\s*\}') `
  "build-windows-controlled.ps1 precisa mapear real=>false e test=>true."
Assert-True ($controlledBuild -match '\$env:VITE_HERMES_SAFE_TEST_MODE\s*=\s*\$safeModeValue') `
  "Build controlado precisa setar VITE_HERMES_SAFE_TEST_MODE."
Assert-True ($controlledBuild -match '\$env:HERMES_SAFE_TEST_MODE\s*=\s*\$safeModeValue') `
  "Build controlado precisa setar HERMES_SAFE_TEST_MODE."
Assert-True ($controlledBuild -match 'Frontend VITE_HERMES_SAFE_TEST_MODE=') `
  "Build controlado precisa imprimir o modo seguro do frontend."
Assert-True ($controlledBuild -match 'Backend\s+HERMES_SAFE_TEST_MODE=') `
  "Build controlado precisa imprimir o modo seguro do backend."
Assert-True ($controlledBuild -match '\$tauriArgs\s*=\s*@\("tauri", "build", "--bundles", \$bundleTargets\)') `
  "Build controlado precisa montar argumentos do Tauri build com bundles controlados."
Assert-True ($controlledBuild -match '& npx\.cmd @tauriArgs') `
  "Build controlado precisa chamar npx.cmd com os argumentos Tauri montados."

Assert-True ($safeModeTs -match 'parseSafeModeFlag\(SAFE_TEST_MODE_ENV\)\s*\?\?\s*true') `
  "Frontend precisa manter modo teste como default quando a variavel nao existe."
Assert-True ($safeModeTs -match '"false", "off", "real", "release"') `
  "Frontend precisa aceitar false/off/real/release para liberar modo real."
Assert-True ($safeModeTs -match '"true", "on", "test", "safe", "dry-run"') `
  "Frontend precisa aceitar true/on/test/safe/dry-run para modo teste."
Assert-True ($safeModeRs -match 'DEFAULT_SAFE_TEST_MODE:\s*bool\s*=\s*true') `
  "Backend precisa manter modo teste como default quando a variavel nao existe."
Assert-True ($safeModeRs -match '"false" \| "off" \| "real" \| "release"') `
  "Backend precisa aceitar false/off/real/release para liberar modo real."
Assert-True ($safeModeRs -match '"true" \| "on" \| "test" \| "safe" \| "dry-run"') `
  "Backend precisa aceitar true/on/test/safe/dry-run para modo teste."
Assert-True ($buildRs -match 'rerun-if-env-changed=HERMES_SAFE_TEST_MODE') `
  "build.rs precisa recompilar o backend quando HERMES_SAFE_TEST_MODE mudar."
Assert-True ([string]$tauriConfig.build.beforeBuildCommand -eq "npm run build:tauri") `
  "tauri.conf.json precisa chamar npm run build:tauri antes do bundle."

if ($failures.Count -gt 0) {
  Write-Host "Hermes build mode sync: FALHOU" -ForegroundColor Red
  foreach ($failure in $failures) {
    Write-Host "- $failure" -ForegroundColor Red
  }
  exit 1
}

Write-Host "Hermes build mode sync: OK" -ForegroundColor Green
Write-Host "- build:windows:test => frontend/backend em modo teste."
Write-Host "- build:windows:real => frontend/backend em modo real."
Write-Host "- build:windows:real:signed => modo real com assinatura obrigatoria."
Write-Host "- Frontend e backend continuam com modo teste como padrao seguro."
