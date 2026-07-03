param(
  [string]$DropRoot,
  [string]$OutputRoot,
  [switch]$LaunchSandbox,
  [switch]$NoExplorer
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $root ".release\beta-test-drop"
}

function Read-JsonFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "JSON nao encontrado: $Path"
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

if ([string]::IsNullOrWhiteSpace($DropRoot)) {
  $latestPath = Join-Path $OutputRoot "latest-beta-test-drop.json"
  $latest = Read-JsonFile -Path $latestPath
  $DropRoot = [string]$latest.dropRoot
}

if ([string]::IsNullOrWhiteSpace($DropRoot) -or -not (Test-Path -LiteralPath $DropRoot -PathType Container)) {
  throw "Drop beta nao encontrado: $DropRoot. Rode npm run release:beta:drop primeiro."
}

$manifestPath = Join-Path $DropRoot "beta-test-drop-manifest.json"
$manifest = Read-JsonFile -Path $manifestPath
$readmePath = [string]$manifest.readmePath
$runnerPath = [string]$manifest.vmRunnerPath
$sandboxPath = [string]$manifest.sandboxPath
$sandboxCommand = Get-Command WindowsSandbox.exe -ErrorAction SilentlyContinue

$verifyDropScript = Join-Path $PSScriptRoot "verify-beta-test-drop.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verifyDropScript -DropRoot $DropRoot -OutputRoot $OutputRoot | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Drop beta atual falhou na verificacao. Rode npm run release:beta:drop para gerar outro."
}

if (-not $NoExplorer) {
  Start-Process explorer.exe -ArgumentList @($DropRoot)
  if (Test-Path -LiteralPath $readmePath -PathType Leaf) {
    Start-Process notepad.exe -ArgumentList @($readmePath)
  }
}

$launchedSandbox = $false
if ($LaunchSandbox) {
  if ($sandboxCommand -and (Test-Path -LiteralPath $sandboxPath -PathType Leaf)) {
    Start-Process -FilePath $sandboxPath
    $launchedSandbox = $true
  } else {
    Write-Host "Windows Sandbox nao encontrado neste Windows. Use uma VM ou maquina limpa e rode o runner manualmente."
  }
}

$report = [pscustomobject]@{
  generatedAt      = (Get-Date).ToString("o")
  dropRoot         = (Resolve-Path -LiteralPath $DropRoot).Path
  betaPackage      = [string]$manifest.betaPackage
  readmePath       = $readmePath
  runnerPath       = $runnerPath
  sandboxPath      = $sandboxPath
  sandboxAvailable = [bool]$sandboxCommand
  sandboxLaunched  = $launchedSandbox
  receiveCommand   = [string]$manifest.receiveCommand
}

$reportPath = Join-Path $DropRoot "beta-test-drop-open.json"
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportPath -Encoding UTF8

Write-Host "Drop beta pronto para teste:"
Write-Host "- Drop: $DropRoot"
Write-Host "- Beta: $($report.betaPackage)"
Write-Host "- Guia: $readmePath"
Write-Host "- Runner VM: $runnerPath"
Write-Host "- Windows Sandbox: $sandboxPath"
Write-Host "- Sandbox disponivel: $(if ($sandboxCommand) { 'sim' } else { 'nao' })"
Write-Host ""
Write-Host "Dentro da VM/maquina limpa:"
Write-Host "powershell -NoProfile -ExecutionPolicy Bypass -File `"$runnerPath`""
Write-Host ""
Write-Host "Depois, no host:"
Write-Host $report.receiveCommand
Write-Host ""
Write-Host "Relatorio: $reportPath"
