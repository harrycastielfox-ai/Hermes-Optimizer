param(
  [string]$DropRoot,
  [string]$OutputRoot,
  [string]$PackageRoot
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $root ".release\manual-qa-test-drop"
}
if ([string]::IsNullOrWhiteSpace($PackageRoot)) {
  $PackageRoot = Join-Path $OutputRoot "packages"
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
$dropName = Split-Path -Leaf $DropRoot
$zipName = "$dropName.zip"
$zipPath = Join-Path $PackageRoot $zipName
$shaPath = "$zipPath.sha256"

New-Item -ItemType Directory -Force -Path $PackageRoot | Out-Null
if (Test-Path -LiteralPath $zipPath -PathType Leaf) {
  Remove-Item -LiteralPath $zipPath -Force
}
if (Test-Path -LiteralPath $shaPath -PathType Leaf) {
  Remove-Item -LiteralPath $shaPath -Force
}

Compress-Archive -LiteralPath $DropRoot -DestinationPath $zipPath -Force
$zipItem = Get-Item -LiteralPath $zipPath
$zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash
"$zipHash *$zipName" | Set-Content -LiteralPath $shaPath -Encoding ASCII

$packageManifestPath = Join-Path $PackageRoot "$dropName-package.json"
$packageManifest = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  dropName = $dropName
  dropRoot = (Resolve-Path -LiteralPath $DropRoot).Path
  candidateName = [string]$manifest.candidateName
  sessionPath = [string]$manifest.sessionPath
  zipPath = $zipPath
  zipSha256Path = $shaPath
  zipLengthBytes = $zipItem.Length
  zipSha256 = $zipHash
  runnerInsideZip = "$dropName\RODAR-QA-HERMES-NA-VM.ps1"
  readmeInsideZip = "$dropName\LEIA-ME-QA-MANUAL.md"
  receiveCheck = "npm run qa:manual:drop:check"
  receiveCommand = [string]$manifest.receiveCommand
}
$packageManifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $packageManifestPath -Encoding UTF8

$latestPackagePath = Join-Path $OutputRoot "latest-manual-qa-test-drop-package.json"
$packageManifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $latestPackagePath -Encoding UTF8

Write-Host "Pacote ZIP do drop de QA manual gerado:"
Write-Host "- ZIP: $zipPath"
Write-Host "- SHA256: $zipHash"
Write-Host "- SHA file: $shaPath"
Write-Host "- Manifesto: $packageManifestPath"
Write-Host ""
Write-Host "Na VM/maquina limpa: extraia o ZIP e rode:"
Write-Host "powershell -NoProfile -ExecutionPolicy Bypass -File .\$dropName\RODAR-QA-HERMES-NA-VM.ps1 -QuickPassAll"
Write-Host ""
Write-Host "Depois, no host:"
Write-Host "npm run qa:manual:drop:check"
Write-Host $packageManifest.receiveCommand
