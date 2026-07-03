param(
  [string]$DropRoot,
  [string]$OutputRoot
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

function Add-Message {
  param(
    [System.Collections.Generic.List[string]]$List,
    [string]$Message
  )

  $List.Add($Message)
}

$failures = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$checks = New-Object System.Collections.Generic.List[string]

if ([string]::IsNullOrWhiteSpace($DropRoot)) {
  $latestDropPath = Join-Path $OutputRoot "latest-beta-test-drop.json"
  $latestDrop = Read-JsonFile -Path $latestDropPath
  $DropRoot = [string]$latestDrop.dropRoot
}

if ([string]::IsNullOrWhiteSpace($DropRoot) -or -not (Test-Path -LiteralPath $DropRoot -PathType Container)) {
  Add-Message -List $failures -Message "Drop beta nao encontrado: $DropRoot. Rode npm run release:beta:ship."
} else {
  Add-Message -List $checks -Message "Drop beta encontrado."
}

if ($failures.Count -eq 0) {
  $verifyScript = Join-Path $PSScriptRoot "verify-beta-test-drop.ps1"
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verifyScript -DropRoot $DropRoot -OutputRoot $OutputRoot | Out-Host
  if ($LASTEXITCODE -ne 0) {
    Add-Message -List $failures -Message "Verificacao do drop beta falhou."
  } else {
    Add-Message -List $checks -Message "Drop beta validado."
  }
}

$releaseStatusPath = Join-Path $releaseRoot "release-status.json"
$releaseStatus = $null
if (Test-Path -LiteralPath $releaseStatusPath -PathType Leaf) {
  $releaseStatus = Read-JsonFile -Path $releaseStatusPath
  Add-Message -List $checks -Message "release-status.json encontrado."
} else {
  Add-Message -List $warnings -Message "release-status.json ausente. Rode npm run release:status para atualizar."
}

if ($releaseStatus) {
  if ([string]$releaseStatus.overallStatus -eq "GO") {
    Add-Message -List $failures -Message "Release publico esta GO; este fluxo e apenas para beta unsigned."
  } else {
    Add-Message -List $checks -Message "Release publico segue NO-GO, como esperado para beta unsigned."
  }

  if ([int]$releaseStatus.unsignedInstallerCount -gt 0) {
    Add-Message -List $checks -Message "Instaladores unsigned detectados; teste deve ficar isolado no Sandbox/VM."
  } else {
    Add-Message -List $warnings -Message "Nenhum instalador unsigned detectado no status atual."
  }
}

$sandboxCommand = Get-Command WindowsSandbox.exe -ErrorAction SilentlyContinue
$sandboxAvailable = [bool]$sandboxCommand
if ($sandboxAvailable) {
  Add-Message -List $checks -Message "WindowsSandbox.exe encontrado."
} else {
  Add-Message -List $warnings -Message "Windows Sandbox nao encontrado neste Windows."
}

$computerInfo = $null
try {
  $computerInfo = Get-ComputerInfo -Property WindowsProductName, WindowsEditionId, HyperVisorPresent -ErrorAction Stop
  Add-Message -List $checks -Message "Informacoes da edicao do Windows coletadas."
} catch {
  Add-Message -List $warnings -Message "Nao foi possivel coletar detalhes da edicao/virtualizacao: $($_.Exception.Message)"
}

$featureState = $null
try {
  $feature = Get-WindowsOptionalFeature -Online -FeatureName "Containers-DisposableClientVM" -ErrorAction Stop
  $featureState = [string]$feature.State
  if ($feature.State -eq "Enabled") {
    Add-Message -List $checks -Message "Recurso Windows Sandbox esta habilitado."
  } else {
    Add-Message -List $warnings -Message "Recurso Windows Sandbox nao esta habilitado: $featureState."
  }
} catch {
  Add-Message -List $warnings -Message "Nao foi possivel verificar recurso Windows Sandbox: $($_.Exception.Message)"
}

$manifest = $null
if ($DropRoot -and (Test-Path -LiteralPath (Join-Path $DropRoot "beta-test-drop-manifest.json") -PathType Leaf)) {
  $manifest = Read-JsonFile -Path (Join-Path $DropRoot "beta-test-drop-manifest.json")
  foreach ($path in @([string]$manifest.readmePath, [string]$manifest.betaZipPath, [string]$manifest.qaPortableZip)) {
    if ([string]::IsNullOrWhiteSpace($path) -or -not (Test-Path -LiteralPath $path -PathType Leaf)) {
      Add-Message -List $failures -Message "Arquivo do drop ausente: $path"
    }
  }
}

$status = if ($failures.Count -gt 0) {
  "FAILED"
} elseif ($sandboxAvailable) {
  "READY"
} else {
  "READY_WITHOUT_SANDBOX"
}

$result = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  status = $status
  dropRoot = if ($DropRoot) { (Resolve-Path -LiteralPath $DropRoot -ErrorAction SilentlyContinue).Path } else { $null }
  sandboxAvailable = $sandboxAvailable
  windowsProductName = if ($computerInfo) { [string]$computerInfo.WindowsProductName } else { $null }
  windowsEditionId = if ($computerInfo) { [string]$computerInfo.WindowsEditionId } else { $null }
  hyperVisorPresent = if ($computerInfo) { [bool]$computerInfo.HyperVisorPresent } else { $null }
  sandboxFeatureState = $featureState
  checks = @($checks)
  warnings = @($warnings)
  failures = @($failures)
}

New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null
$jsonPath = Join-Path $OutputRoot "beta-doctor.json"
$mdPath = Join-Path $OutputRoot "beta-doctor.md"
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# Hermes Beta Doctor")
$markdown.Add("")
$markdown.Add("- Status: **$status**")
$markdown.Add("- Drop: $($result.dropRoot)")
$markdown.Add("- Windows Sandbox disponivel: $($result.sandboxAvailable)")
$markdown.Add("- Windows: $($result.windowsProductName)")
$markdown.Add("- Edicao: $($result.windowsEditionId)")
$markdown.Add("- Hyper-V/virtualizacao presente: $($result.hyperVisorPresent)")
$markdown.Add("- Recurso Sandbox: $($result.sandboxFeatureState)")
$markdown.Add("")
$markdown.Add("## Quando Sandbox nao estiver disponivel")
$markdown.Add("")
$markdown.Add("- Verifique se a edicao do Windows suporta Windows Sandbox.")
$markdown.Add("- Verifique se a virtualizacao esta habilitada na BIOS/UEFI.")
$markdown.Add("- Verifique se o recurso Windows Sandbox esta habilitado nos recursos opcionais.")
$markdown.Add("- Alternativa: use uma VM externa e rode o beta drop dentro dela.")
$markdown.Add("")
$markdown.Add("## Falhas")
$markdown.Add("")
if ($failures.Count -gt 0) {
  foreach ($failure in $failures) { $markdown.Add("- $failure") }
} else {
  $markdown.Add("- Nenhuma falha encontrada.")
}
$markdown.Add("")
$markdown.Add("## Avisos")
$markdown.Add("")
if ($warnings.Count -gt 0) {
  foreach ($warning in $warnings) { $markdown.Add("- $warning") }
} else {
  $markdown.Add("- Nenhum aviso ativo.")
}
$markdown.Add("")
$markdown.Add("## Checks")
$markdown.Add("")
foreach ($check in $checks) { $markdown.Add("- $check") }
$markdown | Set-Content -LiteralPath $mdPath -Encoding UTF8

Write-Host "Hermes beta doctor: $status"
Write-Host "Resumo: $mdPath"
Write-Host "JSON: $jsonPath"
if (-not $sandboxAvailable) {
  Write-Host ""
  Write-Host "Windows Sandbox nao esta disponivel aqui."
  Write-Host "- Verifique edicao do Windows, virtualizacao e recurso opcional Windows Sandbox."
  Write-Host "- Alternativa: teste o ZIP/drop em uma VM externa."
}

if ($failures.Count -gt 0) {
  exit 1
}
