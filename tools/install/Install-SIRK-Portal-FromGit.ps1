#Requires -RunAsAdministrator
[CmdletBinding()]
param(
    [string]$Repository = 'https://github.com/Eris92/MC-SIRK.git',
    [string]$Branch = 'main',
    [string]$MeshRoot = 'C:\Program Files\Open Source\MeshCentral',
    [string]$ServiceName = '',
    [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'
$DataRoot = Join-Path $MeshRoot 'meshcentral-data'
$PluginsRoot = Join-Path $DataRoot 'plugins'
$Target = Join-Path $PluginsRoot 'SIRKPortal'
$LegacyTargets = @(
    (Join-Path $PluginsRoot 'SIRK-Portal'),
    (Join-Path $PluginsRoot 'SirkPlatform')
)
$RuntimeData = Join-Path $DataRoot 'sirk-platform-data'
$RuntimeStatePath = Join-Path $RuntimeData 'runtime-state.json'
$StageRoot = Join-Path $env:TEMP ('SIRK-Portal-Git-' + [guid]::NewGuid().ToString('N'))
$SourceStage = Join-Path $StageRoot 'source'
$Stage = Join-Path $StageRoot 'SIRKPortal'
$BackupRoot = Join-Path $DataRoot 'plugin-backups'
$Backup = Join-Path $BackupRoot ('SIRKPortal-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$Git = (Get-Command git.exe -ErrorAction Stop).Source
$Node = (Get-Command node.exe -ErrorAction Stop).Source
$Npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$Icacls = (Get-Command icacls.exe -ErrorAction Stop).Source
$Takeown = (Get-Command takeown.exe -ErrorAction Stop).Source
$ResolvedServiceName = ''

function Invoke-Checked {
    param([string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory = '')
    $start = @{ FilePath = $FilePath; ArgumentList = $Arguments; Wait = $true; PassThru = $true; NoNewWindow = $true }
    if ($WorkingDirectory) { $start.WorkingDirectory = $WorkingDirectory }
    $process = Start-Process @start
    if ($process.ExitCode -ne 0) { throw ('Command failed ({0}): {1} {2}' -f $process.ExitCode, $FilePath, ($Arguments -join ' ')) }
}

function Resolve-MeshCentralService {
    param([string]$RequestedName, [string]$Root)
    $services = @(Get-CimInstance Win32_Service -ErrorAction Stop)
    if (-not [string]::IsNullOrWhiteSpace($RequestedName)) {
        $requested = @($services | Where-Object { [string]$_.Name -ieq $RequestedName })
        if ($requested.Count -ne 1) { throw ('MeshCentral service not found by explicit name: {0}' -f $RequestedName) }
        return $requested[0]
    }

    $standard = @($services | Where-Object { [string]$_.Name -ieq 'MeshCentral' })
    if ($standard.Count -eq 1) { return $standard[0] }

    $normalizedRoot = [IO.Path]::GetFullPath($Root).TrimEnd([char[]]'\/')
    $matches = @($services | Where-Object {
        $command = [Environment]::ExpandEnvironmentVariables([string]$_.PathName)
        $command -and
            $command.IndexOf($normalizedRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
            $command -match '(?i)(winservice\.js|meshcentral)'
    })
    if ($matches.Count -eq 1) { return $matches[0] }
    if ($matches.Count -gt 1) {
        throw ('Multiple MeshCentral service candidates were found under {0}: {1}. Pass -ServiceName explicitly.' -f $normalizedRoot, (($matches | ForEach-Object { $_.Name }) -join ', '))
    }
    throw ('Unable to detect the MeshCentral Windows service for {0}. Pass -ServiceName explicitly.' -f $normalizedRoot)
}

function Wait-ServiceState {
    param([string]$Name, [string]$State, [int]$TimeoutSeconds = 30)
    $desired = [System.Enum]::Parse([System.ServiceProcess.ServiceControllerStatus], $State, $true)
    $service = Get-Service -Name $Name -ErrorAction Stop
    if ($service.Status -ne $desired) {
        $service.WaitForStatus($desired, [TimeSpan]::FromSeconds($TimeoutSeconds))
        $service.Refresh()
    }
    if ($service.Status -ne $desired) { throw ('Service {0} did not reach state {1}.' -f $Name, $State) }
}

function Repair-RuntimeDataPermissions {
    param([string]$Path, [string]$ServiceAccount)
    New-Item $Path -ItemType Directory -Force | Out-Null
    Get-ChildItem $Path -Force -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
        try { $_.Attributes = $_.Attributes -band (-bnot [System.IO.FileAttributes]::ReadOnly) } catch {}
    }
    $grants = @('*S-1-5-18:(OI)(CI)F', '*S-1-5-32-544:(OI)(CI)F')
    if ($ServiceAccount -and $ServiceAccount -notin @('LocalSystem', 'NT AUTHORITY\SYSTEM')) { $grants += ('{0}:(OI)(CI)M' -f $ServiceAccount) }
    $arguments = @($Path, '/inheritance:e', '/T', '/C', '/Q')
    foreach ($grant in $grants) { $arguments += @('/grant:r', $grant) }
    & $Icacls @arguments | Out-Null
    if ($LASTEXITCODE -ne 0) {
        & $Takeown /F $Path /R /D Y | Out-Null
        if ($LASTEXITCODE -ne 0) { throw ('Unable to take ownership of: {0}' -f $Path) }
        & $Icacls @arguments | Out-Null
        if ($LASTEXITCODE -ne 0) { throw ('Unable to repair permissions on: {0}' -f $Path) }
    }
}

function Get-RuntimeManifest {
    param([string]$Path)
    $root = [IO.Path]::GetFullPath($Path).TrimEnd([char[]]'\/')
    return @(Get-ChildItem $root -File -Recurse | Sort-Object FullName | ForEach-Object {
        [pscustomobject]@{
            Path = $_.FullName.Substring($root.Length).TrimStart([char[]]'\/')
            Hash = (Get-FileHash -Path $_.FullName -Algorithm SHA256).Hash
        }
    })
}

function Assert-RuntimeManifest {
    param([object[]]$Expected, [string]$Path)
    $actual = @(Get-RuntimeManifest -Path $Path)
    if ($actual.Count -ne $Expected.Count) { throw ('Installed plugin file count differs from staged artifact: expected {0}, got {1}.' -f $Expected.Count, $actual.Count) }
    for ($index = 0; $index -lt $Expected.Count; $index++) {
        if ([string]$actual[$index].Path -cne [string]$Expected[$index].Path -or [string]$actual[$index].Hash -cne [string]$Expected[$index].Hash) {
            throw ('Installed plugin artifact differs from staged source at: {0}' -f $Expected[$index].Path)
        }
    }
}

function Wait-RuntimeState {
    param([string]$Path, [string]$Version, [string]$PluginRoot, [int]$TimeoutSeconds = 30)
    $expectedRoot = [IO.Path]::GetFullPath($PluginRoot).TrimEnd([char[]]'\/')
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    do {
        if (Test-Path $Path -PathType Leaf) {
            try {
                $state = Get-Content $Path -Raw | ConvertFrom-Json
                $reportedRoot = [IO.Path]::GetFullPath([string]$state.pluginRoot).TrimEnd([char[]]'\/')
                $rootMatches = [string]::Equals($reportedRoot, $expectedRoot, [StringComparison]::OrdinalIgnoreCase)
                if ([string]$state.version -ceq $Version -and
                    [string]$state.runtimeVersion -ceq $Version -and
                    $rootMatches -and
                    [int]$state.pid -gt 0) {
                    return $state
                }
            } catch {}
        }
        Start-Sleep -Milliseconds 250
    } while ([DateTime]::UtcNow -lt $deadline)
    throw ('MeshCentral service is running, but SIRK did not prove loaded runtime {0} from {1} within {2}s.' -f $Version, $expectedRoot, $TimeoutSeconds)
}

try {
    $serviceInfo = Resolve-MeshCentralService -RequestedName $ServiceName -Root $MeshRoot
    $ResolvedServiceName = [string]$serviceInfo.Name
    $ServiceAccount = [string]$serviceInfo.StartName

    New-Item $StageRoot -ItemType Directory -Force | Out-Null
    Invoke-Checked $Git @('clone', '--depth', '1', '--single-branch', '--branch', $Branch, $Repository, $SourceStage)

    $ConfigPath = Join-Path $SourceStage 'config.json'
    $Entry = Join-Path $SourceStage 'SIRKPortal.js'
    $AdminEntry = Join-Path $SourceStage 'SIRKPortalAdmin.js'
    if (-not (Test-Path $ConfigPath -PathType Leaf)) { throw 'Repository does not contain config.json.' }
    if (-not (Test-Path $Entry -PathType Leaf)) { throw 'Repository does not contain SIRKPortal.js.' }
    if (-not (Test-Path $AdminEntry -PathType Leaf)) { throw 'Repository does not contain SIRKPortalAdmin.js.' }

    $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
    if ([string]$config.shortName -cne 'SIRKPortal') { throw ('Invalid shortName: {0}' -f $config.shortName) }
    Invoke-Checked $Node @('--check', $Entry)
    Invoke-Checked $Node @('--check', $AdminEntry)
    if (-not $SkipTests) { Invoke-Checked $Npm @('test') $SourceStage }

    # Build a runtime-only artifact. Repository metadata, tests, documentation and
    # development tooling must never be copied into MeshCentral's plugin folder.
    New-Item $Stage -ItemType Directory -Force | Out-Null
    $RuntimeFiles = @(
        'admin.js',
        'config.json',
        'plugin-main.js',
        'SIRKPortal.js',
        'SIRKPortalAdmin.js'
    )
    $RuntimeDirectories = @('public', 'seed', 'server', 'views', 'web')
    foreach ($relativePath in $RuntimeFiles) {
        Copy-Item (Join-Path $SourceStage $relativePath) (Join-Path $Stage $relativePath) -Force
    }
    foreach ($relativePath in $RuntimeDirectories) {
        Copy-Item (Join-Path $SourceStage $relativePath) (Join-Path $Stage $relativePath) -Recurse -Force
    }
    $ExpectedManifest = @(Get-RuntimeManifest -Path $Stage)

    $service = Get-Service -Name $ResolvedServiceName -ErrorAction Stop
    if ($service.Status -ne 'Stopped') {
        Stop-Service -Name $ResolvedServiceName -Force -ErrorAction Stop
        Wait-ServiceState -Name $ResolvedServiceName -State 'Stopped'
    }

    New-Item $PluginsRoot -ItemType Directory -Force | Out-Null
    New-Item $BackupRoot -ItemType Directory -Force | Out-Null

    $current = $null
    foreach ($candidate in @($Target) + $LegacyTargets) {
        if (Test-Path $candidate) { $current = $candidate; break }
    }
    if ($current) { Copy-Item $current $Backup -Recurse -Force }

    Repair-RuntimeDataPermissions -Path $RuntimeData -ServiceAccount $ServiceAccount

    Remove-Item $Target -Recurse -Force -ErrorAction SilentlyContinue
    foreach ($legacy in $LegacyTargets) { Remove-Item $legacy -Recurse -Force -ErrorAction SilentlyContinue }
    Move-Item $Stage $Target

    $installedConfig = Get-Content (Join-Path $Target 'config.json') -Raw | ConvertFrom-Json
    if ([string]$installedConfig.version -cne [string]$config.version) {
        throw ('Installed config version differs from staged source: expected {0}, got {1}.' -f $config.version, $installedConfig.version)
    }
    Assert-RuntimeManifest -Expected $ExpectedManifest -Path $Target

    Remove-Item $RuntimeStatePath -Force -ErrorAction SilentlyContinue
    Get-ChildItem $RuntimeData -Filter 'runtime-state.json.*.tmp' -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

    Start-Service -Name $ResolvedServiceName -ErrorAction Stop
    Wait-ServiceState -Name $ResolvedServiceName -State 'Running'
    $runtimeState = Wait-RuntimeState -Path $RuntimeStatePath -Version ([string]$config.version) -PluginRoot $Target

    Write-Host ('Installed and verified SIRK Management Platform {0} from {1}@{2}' -f $config.version, $Repository, $Branch) -ForegroundColor Green
    Write-Host ('MeshCentral service: {0} ({1})' -f $ResolvedServiceName, $ServiceAccount)
    Write-Host ('Loaded SIRK runtime: {0}, PID {1}' -f $runtimeState.runtimeVersion, $runtimeState.pid)
    Write-Host ('MeshCentral plugin identifier: {0}' -f $config.shortName)
    Write-Host ('Plugin path: {0}' -f $Target)
    Write-Host ('Runtime data: {0}' -f $RuntimeData)
    Write-Warning 'If an older SIRK-Portal database entry remains visible in MeshCentral, remove it from the Plugins page after confirming this SIRKPortal installation works.'
}
catch {
    try {
        if ($ResolvedServiceName -and (Get-Service -Name $ResolvedServiceName -ErrorAction SilentlyContinue).Status -ne 'Running') {
            Start-Service -Name $ResolvedServiceName -ErrorAction SilentlyContinue
        }
    } catch {}
    throw
}
finally {
    Remove-Item $StageRoot -Recurse -Force -ErrorAction SilentlyContinue
}
