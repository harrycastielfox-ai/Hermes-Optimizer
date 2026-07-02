param(
  [string]$DropRoot,
  [string]$OutputRoot,
  [switch]$LaunchSandbox,
  [switch]$NoExplorer
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $root ".release\manual-qa-test-drop"
}

function Read-JsonFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "JSON nao encontrado: $Path"
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

if ([string]::IsNullOrWhiteSpace($DropRoot)) {
  $latestPath = Join-Path $OutputRoot "latest-manual-qa-test-drop.json"
  $latest = Read-JsonFile -Path $latestPath
  $DropRoot = [string]$latest.dropRoot
}

if ([string]::IsNullOrWhiteSpace($DropRoot) -or -not (Test-Path -LiteralPath $DropRoot -PathType Container)) {
  throw "Drop de QA manual nao encontrado: $DropRoot. Rode npm run qa:manual:drop primeiro."
}

$manifestPath = Join-Path $DropRoot "manual-qa-test-drop-manifest.json"
$manifest = Read-JsonFile -Path $manifestPath
$readmePath = [string]$manifest.readmePath
$runnerPath = [string]$manifest.vmRunnerPath
$sandboxPath = [string]$manifest.sandboxPath
$sandboxCommand = Get-Command WindowsSandbox.exe -ErrorAction SilentlyContinue

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
  readmePath       = $readmePath
  runnerPath       = $runnerPath
  sandboxPath      = $sandboxPath
  sandboxAvailable = [bool]$sandboxCommand
  sandboxLaunched  = $launchedSandbox
  receiveCheck     = "npm run qa:manual:drop:check"
  receiveCommand   = [string]$manifest.receiveCommand
}

$reportPath = Join-Path $DropRoot "manual-qa-test-drop-open.json"
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportPath -Encoding UTF8

Write-Host "Drop de QA manual pronto para teste:"
Write-Host "- Drop: $DropRoot"
Write-Host "- Guia: $readmePath"
Write-Host "- Runner VM: $runnerPath"
Write-Host "- Windows Sandbox: $sandboxPath"
Write-Host "- Sandbox disponivel: $(if ($sandboxCommand) { 'sim' } else { 'nao' })"
Write-Host ""
Write-Host "Dentro da VM/maquina limpa:"
Write-Host "powershell -NoProfile -ExecutionPolicy Bypass -File `"$runnerPath`" -QuickPassAll"
Write-Host ""
Write-Host "Depois, no host:"
Write-Host "npm run qa:manual:drop:check"
Write-Host $report.receiveCommand
Write-Host ""
Write-Host "Relatorio: $reportPath"
