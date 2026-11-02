param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("Win64","Android","All")]
    [string]$Platform,
    [string]$UnrealEngineRoot = $env:UE_ROOT,
    [string]$ArchiveRoot = (Join-Path $PSScriptRoot "..\Builds"),
    [ValidateSet("Development","Shipping")]
    [string]$Configuration = "Development"
)
$ErrorActionPreference = "Stop"
$Project = (Resolve-Path (Join-Path $PSScriptRoot "..\DhakaOpenWorldGame.uproject")).Path
$Validator = Join-Path $PSScriptRoot "validate_native_source.py"
if (-not (Test-Path $Validator)) { throw "Missing source validator: $Validator" }
python $Validator
if ($LASTEXITCODE -ne 0) { throw "Native source sanity validation failed; packaging stopped." }
if ([string]::IsNullOrWhiteSpace($UnrealEngineRoot)) {
    throw "Set UE_ROOT or pass -UnrealEngineRoot to your installed Unreal Engine 5.5 root."
}
$UAT = Join-Path $UnrealEngineRoot "Engine\Build\BatchFiles\RunUAT.bat"
if (-not (Test-Path $UAT)) { throw "RunUAT.bat not found at $UAT" }
New-Item -ItemType Directory -Force -Path $ArchiveRoot | Out-Null
$Targets = if ($Platform -eq "All") { @("Win64","Android") } else { @($Platform) }
foreach ($Target in $Targets) {
    $ArchivePath = Join-Path (Resolve-Path $ArchiveRoot).Path "$Target-$Configuration"
    $Args = @(
        "BuildCookRun",
        "-project=$Project",
        "-noP4",
        "-build",
        "-cook",
        "-stage",
        "-pak",
        "-archive",
        "-archivedirectory=$ArchivePath",
        "-platform=$Target",
        "-clientconfig=$Configuration",
        "-utf8output"
    )
    if ($Target -eq "Android") {
        # Requires Android Studio/SDK/NDK configured in Unreal Project Settings.
        $Args += "-cookflavor=ASTC"
    }
    Write-Host "Packaging $Target ($Configuration) -> $ArchivePath"
    & $UAT @Args
    if ($LASTEXITCODE -ne 0) { throw "Unreal Automation Tool failed for $Target with exit code $LASTEXITCODE" }
}
Write-Host "Requested package targets completed. Test each archive on its target device before release."
