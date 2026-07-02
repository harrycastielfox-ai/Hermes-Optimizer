param(
  [switch]$NoWait
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root ".release"
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resultRoot = Join-Path $releaseDir "elevated-install-smoke-$timestamp"
$logPath = Join-Path $resultRoot "elevated-install-smoke.log"
$exitPath = Join-Path $resultRoot "elevated-install-smoke.exit"
$scriptPath = Join-Path $resultRoot "run-elevated-install-smoke.ps1"
New-Item -ItemType Directory -Force -Path $resultRoot | Out-Null

$innerScript = @"
`$ErrorActionPreference = "Continue"
Set-Location "$root"
`$logPath = "$logPath"
`$exitPath = "$exitPath"

function Write-Log {
  param([string]`$Message)
  `$line = "[{0}] {1}" -f (Get-Date).ToString("s"), `$Message
  `$line | Tee-Object -FilePath `$logPath -Append
}

try {
  Write-Log "Hermes elevated install smoke iniciado."
  Write-Log "Admin=`$([bool]([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))"
  & npm.cmd run qa:manual:drop:auto:install *>&1 | Tee-Object -FilePath `$logPath -Append
  `$exitCode = `$LASTEXITCODE
  Write-Log "qa:manual:drop:auto:install exit=`$exitCode"
  Set-Content -LiteralPath `$exitPath -Value `$exitCode -Encoding UTF8
  exit `$exitCode
} catch {
  Write-Log "Falha: `$(`$_.Exception.Message)"
  Set-Content -LiteralPath `$exitPath -Value 1 -Encoding UTF8
  exit 1
}
"@

$innerScript | Set-Content -LiteralPath $scriptPath -Encoding UTF8

$latestPath = Join-Path $releaseDir "latest-elevated-install-smoke.json"
$record = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  resultRoot = $resultRoot
  scriptPath = $scriptPath
  logPath = $logPath
  exitPath = $exitPath
  command = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
}
$record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $latestPath -Encoding UTF8

Write-Host "Abrindo install smoke real elevado..."
Write-Host "Log: $logPath"
Write-Host "Exit: $exitPath"

$process = Start-Process `
  -FilePath "powershell.exe" `
  -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $scriptPath) `
  -Verb RunAs `
  -PassThru

if (-not $NoWait) {
  $process.WaitForExit()
  if (Test-Path -LiteralPath $exitPath -PathType Leaf) {
    $exitCode = [int](Get-Content -LiteralPath $exitPath -Raw)
    Write-Host "Install smoke elevado terminou com exit code $exitCode"
    exit $exitCode
  }

  Write-Host "Processo elevado terminou, mas nao gravou exit file. Verifique o log: $logPath" -ForegroundColor Yellow
  exit 1
}
