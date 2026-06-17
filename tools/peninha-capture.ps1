param(
  [ValidateSet("before", "after")]
  [string]$Label = "before",
  [string]$RunId = ""
)

$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$baseDir = Join-Path $root "diagnostics\peninha-analysis"
New-Item -ItemType Directory -Force -Path $baseDir | Out-Null

if ([string]::IsNullOrWhiteSpace($RunId)) {
  if ($Label -eq "after") {
    $latest = Get-ChildItem -Path $baseDir -Directory |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if ($null -ne $latest) {
      $RunId = $latest.Name
    }
  }
  if ([string]::IsNullOrWhiteSpace($RunId)) {
    $RunId = Get-Date -Format "yyyyMMdd-HHmmss"
  }
}

$runDir = Join-Path $baseDir $RunId
$outDir = Join-Path $runDir $Label
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Save-Text {
  param(
    [string]$Name,
    [scriptblock]$Script
  )
  try {
    & $Script | Out-String -Width 4096 | Set-Content -Path (Join-Path $outDir $Name) -Encoding UTF8
  } catch {
    "ERROR: $($_.Exception.Message)" | Set-Content -Path (Join-Path $outDir $Name) -Encoding UTF8
  }
}

function Save-Json {
  param(
    [string]$Name,
    [scriptblock]$Script,
    [int]$Depth = 8
  )
  try {
    & $Script | ConvertTo-Json -Depth $Depth | Set-Content -Path (Join-Path $outDir $Name) -Encoding UTF8
  } catch {
    @{ error = $_.Exception.Message } | ConvertTo-Json | Set-Content -Path (Join-Path $outDir $Name) -Encoding UTF8
  }
}

function Get-RegValue {
  param([string]$Path, [string]$Name)
  try {
    $item = Get-ItemProperty -Path $Path -Name $Name -ErrorAction SilentlyContinue
    if ($null -eq $item) { return $null }
    return $item.$Name
  } catch {
    return $null
  }
}

$capture = [ordered]@{
  label = $Label
  runId = $RunId
  capturedAt = (Get-Date).ToString("o")
  computerName = $env:COMPUTERNAME
  userName = $env:USERNAME
  os = Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber, OSArchitecture, LastBootUpTime
  cpu = Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed
  gpu = Get-CimInstance Win32_VideoController | Select-Object Name, DriverVersion, AdapterRAM
  memory = Get-CimInstance Win32_ComputerSystem | Select-Object TotalPhysicalMemory, Manufacturer, Model
  registry = [ordered]@{
    gameMode = [ordered]@{
      autoGameModeEnabled = Get-RegValue "HKCU:\Software\Microsoft\GameBar" "AutoGameModeEnabled"
      allowAutoGameMode = Get-RegValue "HKCU:\Software\Microsoft\GameBar" "AllowAutoGameMode"
    }
    gameDvr = [ordered]@{
      gameDvrEnabled = Get-RegValue "HKCU:\System\GameConfigStore" "GameDVR_Enabled"
      appCaptureEnabled = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR" "AppCaptureEnabled"
    }
    visual = [ordered]@{
      enableTransparency = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" "EnableTransparency"
      visualFxSetting = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" "VisualFXSetting"
      dragFullWindows = Get-RegValue "HKCU:\Control Panel\Desktop" "DragFullWindows"
      fontSmoothing = Get-RegValue "HKCU:\Control Panel\Desktop" "FontSmoothing"
      minAnimate = Get-RegValue "HKCU:\Control Panel\Desktop\WindowMetrics" "MinAnimate"
      iconsOnly = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" "IconsOnly"
      taskbarAnimations = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" "TaskbarAnimations"
      listviewAlphaSelect = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" "ListviewAlphaSelect"
      listviewShadow = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" "ListviewShadow"
      enableAeroPeek = Get-RegValue "HKCU:\Software\Microsoft\Windows\DWM" "EnableAeroPeek"
    }
    privacy = [ordered]@{
      advertisingInfoEnabled = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo" "Enabled"
      tailoredExperiences = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\Privacy" "TailoredExperiencesWithDiagnosticDataEnabled"
      publishUserActivities = Get-RegValue "HKCU:\Software\Policies\Microsoft\Windows\System" "PublishUserActivities"
      uploadUserActivities = Get-RegValue "HKCU:\Software\Policies\Microsoft\Windows\System" "UploadUserActivities"
      locationConsent = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\location" "Value"
      recallDisableAiDataAnalysis = Get-RegValue "HKCU:\Software\Policies\Microsoft\Windows\WindowsAI" "DisableAIDataAnalysis"
    }
    contentDelivery = [ordered]@{
      contentDeliveryAllowed = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" "ContentDeliveryAllowed"
      oemPreInstalledAppsEnabled = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" "OemPreInstalledAppsEnabled"
      preInstalledAppsEnabled = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" "PreInstalledAppsEnabled"
      silentInstalledAppsEnabled = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" "SilentInstalledAppsEnabled"
      systemPaneSuggestionsEnabled = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" "SystemPaneSuggestionsEnabled"
      subscribedContent338388Enabled = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" "SubscribedContent-338388Enabled"
      subscribedContent338389Enabled = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" "SubscribedContent-338389Enabled"
    }
    storageSense = [ordered]@{
      enabled = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy" "01"
    }
    startupDelay = [ordered]@{
      startupDelayInMSec = Get-RegValue "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize" "StartupDelayInMSec"
    }
  }
}

$capture | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $outDir "snapshot.json") -Encoding UTF8

Save-Json "services.json" {
  Get-CimInstance Win32_Service |
    Select-Object Name, DisplayName, State, StartMode, PathName |
    Sort-Object Name
}

Save-Json "startup.json" {
  Get-CimInstance Win32_StartupCommand |
    Select-Object Name, Command, Location, User |
    Sort-Object Name
}

Save-Json "scheduled-tasks.json" {
  Get-ScheduledTask |
    Select-Object TaskName, TaskPath, State, Author, Description |
    Sort-Object TaskPath, TaskName
}

Save-Json "processes.json" {
  Get-Process |
    Select-Object Name, Id, Path, MainWindowTitle, CPU, WorkingSet64 |
    Sort-Object Name
}

Save-Json "network-adapters.json" {
  Get-NetAdapter |
    Select-Object Name, InterfaceDescription, Status, LinkSpeed, MacAddress
}

Save-Json "dns.json" {
  Get-DnsClientServerAddress |
    Select-Object InterfaceAlias, AddressFamily, ServerAddresses |
    Sort-Object InterfaceAlias, AddressFamily
}

Save-Json "uwp-packages.json" {
  Get-AppxPackage |
    Select-Object Name, PackageFullName, Version, InstallLocation |
    Sort-Object Name
}

Save-Json "installed-products.json" {
  $paths = @(
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
  )
  Get-ItemProperty $paths |
    Where-Object { $_.DisplayName } |
    Select-Object DisplayName, DisplayVersion, Publisher, InstallDate, UninstallString |
    Sort-Object DisplayName
}

Save-Text "powercfg-active.txt" { powercfg /GETACTIVESCHEME }
Save-Text "powercfg-list.txt" { powercfg /L }
Save-Text "powercfg-a.txt" { powercfg /A }
Save-Text "bcdedit.txt" { bcdedit /enum }
Save-Text "netsh-tcp-global.txt" { netsh int tcp show global }
Save-Text "netsh-ipv4-global.txt" { netsh int ipv4 show global }
Save-Text "netsh-winsock.txt" { netsh winsock show catalog }
Save-Text "ipconfig-all.txt" { ipconfig /all }

$manifest = [ordered]@{
  runId = $RunId
  label = $Label
  outDir = $outDir
  capturedAt = (Get-Date).ToString("o")
}
$manifest | ConvertTo-Json | Set-Content -Path (Join-Path $runDir "$Label-manifest.json") -Encoding UTF8

Write-Host "PENINHA_CAPTURE_RUN_ID=$RunId"
Write-Host "PENINHA_CAPTURE_DIR=$outDir"
