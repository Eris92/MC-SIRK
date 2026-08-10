<#
.SYNOPSIS
Validates the safe Windows Shell namespace contract used by Network Settings.

.DESCRIPTION
Resolves the Network Connections Shell namespace through CSIDL 49 on a real
Windows host. The harness intentionally does not invoke Properties or any verb
and therefore does not mutate network configuration. It also rejects the
historical dev.33 shell:ConnectionsFolder input before COM invocation.

.EXAMPLE
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\test\windows-network-shell-smoke.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

function Resolve-NetworkConnectionsNamespace {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [object]$Namespace
    )

    if (($Namespace -isnot [int]) -or ([int]$Namespace -ne 49)) {
        throw "Unsupported Network Connections namespace input: $Namespace"
    }

    $shell = New-Object -ComObject Shell.Application
    try {
        $folder = $shell.NameSpace([int]$Namespace)
        if ($null -eq $folder) {
            throw 'Shell.Application.NameSpace(49) did not resolve Network Connections.'
        }
        return $folder
    }
    finally {
        if ($null -ne $shell) {
            [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($shell)
        }
    }
}

$folder = Resolve-NetworkConnectionsNamespace -Namespace 49
try {
    if ($null -eq $folder.Self) {
        throw 'Resolved Network Connections namespace has no Shell FolderItem identity.'
    }
}
finally {
    if ($null -ne $folder) {
        [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($folder)
    }
}

$negativeRejected = $false
try {
    [void](Resolve-NetworkConnectionsNamespace -Namespace 'shell:ConnectionsFolder')
}
catch {
    $negativeRejected = $true
}

if (-not $negativeRejected) {
    throw 'Historical shell:ConnectionsFolder input must be rejected by the smoke harness.'
}

[pscustomobject]@{
    Namespace = 49
    Resolved = $true
    HistoricalInputRejected = $true
    MutatesNetworkConfiguration = $false
}
