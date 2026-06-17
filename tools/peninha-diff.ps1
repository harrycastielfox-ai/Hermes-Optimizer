param(
  [string]$RunId = ""
)

$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$baseDir = Join-Path $root "diagnostics\peninha-analysis"

if ([string]::IsNullOrWhiteSpace($RunId)) {
  $latest = Get-ChildItem -Path $baseDir -Directory |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($null -eq $latest) {
    throw "Nenhuma captura encontrada em $baseDir"
  }
  $RunId = $latest.Name
}

$runDir = Join-Path $baseDir $RunId
$beforeDir = Join-Path $runDir "before"
$afterDir = Join-Path $runDir "after"
$diffDir = Join-Path $runDir "diff"
New-Item -ItemType Directory -Force -Path $diffDir | Out-Null

if (!(Test-Path $beforeDir) -or !(Test-Path $afterDir)) {
  throw "Capturas before/after incompletas para RunId $RunId"
}

function Read-JsonFile($path) {
  if (!(Test-Path $path)) { return $null }
  Get-Content $path -Raw | ConvertFrom-Json
}

function Flatten-Object {
  param(
    [object]$Value,
    [string]$Prefix = ""
  )
  $result = [ordered]@{}
  if ($null -eq $Value) {
    $result[$Prefix] = $null
    return $result
  }
  if ($Value -is [System.Array]) {
    $result[$Prefix] = ($Value | ConvertTo-Json -Depth 10 -Compress)
    return $result
  }
  if ($Value.PSObject.Properties.Count -gt 0 -and !($Value -is [string])) {
    foreach ($prop in $Value.PSObject.Properties) {
      $key = if ([string]::IsNullOrWhiteSpace($Prefix)) { $prop.Name } else { "$Prefix.$($prop.Name)" }
      $child = Flatten-Object -Value $prop.Value -Prefix $key
      foreach ($item in $child.GetEnumerator()) {
        $result[$item.Key] = $item.Value
      }
    }
    return $result
  }
  $result[$Prefix] = $Value
  return $result
}

$beforeSnapshot = Read-JsonFile (Join-Path $beforeDir "snapshot.json")
$afterSnapshot = Read-JsonFile (Join-Path $afterDir "snapshot.json")
$beforeFlat = Flatten-Object $beforeSnapshot
$afterFlat = Flatten-Object $afterSnapshot

$keys = @($beforeFlat.Keys + $afterFlat.Keys) | Sort-Object -Unique
$snapshotChanges = foreach ($key in $keys) {
  $beforeValue = $beforeFlat[$key]
  $afterValue = $afterFlat[$key]
  if ("$beforeValue" -ne "$afterValue") {
    [pscustomobject]@{
      key = $key
      before = $beforeValue
      after = $afterValue
    }
  }
}

$snapshotChanges |
  ConvertTo-Json -Depth 6 |
  Set-Content -Path (Join-Path $diffDir "snapshot-changes.json") -Encoding UTF8

$textFiles = @(
  "powercfg-active.txt",
  "powercfg-list.txt",
  "powercfg-a.txt",
  "bcdedit.txt",
  "netsh-tcp-global.txt",
  "netsh-ipv4-global.txt",
  "ipconfig-all.txt"
)

foreach ($file in $textFiles) {
  $before = Get-Content (Join-Path $beforeDir $file)
  $after = Get-Content (Join-Path $afterDir $file)
  Compare-Object -ReferenceObject $before -DifferenceObject $after |
    Out-String -Width 4096 |
    Set-Content -Path (Join-Path $diffDir "$file.diff.txt") -Encoding UTF8
}

$summary = [ordered]@{
  runId = $RunId
  generatedAt = (Get-Date).ToString("o")
  snapshotChangeCount = @($snapshotChanges).Count
  diffDir = $diffDir
}
$summary | ConvertTo-Json | Set-Content -Path (Join-Path $diffDir "summary.json") -Encoding UTF8

Write-Host "PENINHA_DIFF_RUN_ID=$RunId"
Write-Host "PENINHA_DIFF_DIR=$diffDir"
Write-Host "SNAPSHOT_CHANGES=$(@($snapshotChanges).Count)"
