param(
  [string]$DropRoot,
  [string]$OutputRoot,
  [string]$PackageRoot
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $root ".release\beta-test-drop"
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
  $latestPath = Join-Path $OutputRoot "latest-beta-test-drop.json"
  $latest = Read-JsonFile -Path $latestPath
  $DropRoot = [string]$latest.dropRoot
}

if ([string]::IsNullOrWhiteSpace($DropRoot) -or -not (Test-Path -LiteralPath $DropRoot -PathType Container)) {
  throw "Drop beta nao encontrado: $DropRoot. Rode npm run release:beta:drop primeiro."
}

$verifyDropScript = Join-Path $PSScriptRoot "verify-beta-test-drop.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verifyDropScript -DropRoot $DropRoot -OutputRoot $OutputRoot | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Drop beta falhou na verificacao. Rode npm run release:beta:drop para gerar outro."
}

$manifestPath = Join-Path $DropRoot "beta-test-drop-manifest.json"
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
  betaPackage = [string]$manifest.betaPackage
  zipPath = $zipPath
  zipSha256Path = $shaPath
  zipLengthBytes = $zipItem.Length
  zipSha256 = $zipHash
  runnerInsideZip = "$dropName\RODAR-DENTRO-DA-VM.ps1"
  readmeInsideZip = "$dropName\LEIA-ME-TESTE-BETA.md"
  checkCommand = "npm run release:beta:drop:check"
  receiveCommand = "npm run release:beta:drop:receive"
}
$packageManifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $packageManifestPath -Encoding UTF8

$latestPackagePath = Join-Path $OutputRoot "latest-beta-test-drop-package.json"
$packageManifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $latestPackagePath -Encoding UTF8

Write-Host "Pacote ZIP do beta drop gerado:"
Write-Host "- ZIP: $zipPath"
Write-Host "- SHA256: $zipHash"
Write-Host "- SHA file: $shaPath"
Write-Host "- Manifesto: $packageManifestPath"
Write-Host ""
Write-Host "Na VM/maquina limpa: extraia o ZIP e rode:"
Write-Host "powershell -NoProfile -ExecutionPolicy Bypass -File .\$dropName\RODAR-DENTRO-DA-VM.ps1"
Write-Host ""
Write-Host "Depois, no host:"
Write-Host $packageManifest.checkCommand
Write-Host $packageManifest.receiveCommand
