"use strict";

// CLDR windowsZones.xml, Unicode CLDR main (2026-11-13), Windows time-zone mapping.
// Source: https://github.com/unicode-org/cldr/blob/main/common/supplemental/windowsZones.xml
// The map is static at runtime. Unknown/ambiguous zones fail closed.
var ianaToWindows = require("./windows-time-zones.json");
var windowsIds = Object.create(null);
Object.keys(ianaToWindows).forEach(function (key) { windowsIds[ianaToWindows[key]] = true; });

function windowsZone(source) {
    if (typeof source !== "string" || !source || source.trim() !== source) throw new Error("MeshCentral server time-zone ID is missing or invalid.");
    var mapped = Object.prototype.hasOwnProperty.call(ianaToWindows, source) ? ianaToWindows[source] : null;
    if (!mapped && Object.prototype.hasOwnProperty.call(windowsIds, source)) mapped = source;
    if (!mapped) throw new Error("No safe Windows time-zone mapping for MeshCentral server zone: " + source);
    return mapped;
}

function snapshot(instant, zoneId) {
    if (!(instant instanceof Date) || !Number.isFinite(instant.getTime())) throw new Error("MeshCentral server UTC clock is invalid.");
    return { utc: instant.toISOString(), serverZone: zoneId, windowsZone: windowsZone(zoneId) };
}

function readServerSnapshot() {
    // Intl is bound to the MeshCentral Node process/OS TZ (never browser/operator data).
    var zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return snapshot(new Date(), zone);
}

function requireWindowsTarget(node) {
    var agentId = Number(node && node.agent && node.agent.id);
    // MeshAgent Windows console/service, x86/x64/ARM variants.
    if ([1, 2, 3, 4, 42, 43].indexOf(agentId) < 0) throw new Error("Server time synchronization requires a Windows MeshAgent.");
    var os = String(node && (node.osdesc || node.osDescription || node.os) || "");
    if (os && !/\bWindows\b/i.test(os)) throw new Error("Device OS is not Windows.");
}

function rejectClientValues(payload) {
    var values = payload && payload.variableValues;
    if (values != null && (typeof values !== "object" || Array.isArray(values) || Object.keys(values).length)) {
        throw new Error("Server time synchronization does not accept client time-zone or clock variables.");
    }
}

function psLiteral(value) {
    return String(value).replace(/'/g, "''");
}

var TEMPLATE = String.raw`$ErrorActionPreference = 'Stop'
$sourceUtcText = '__SOURCE_UTC__'
$sourceZoneId = '__SOURCE_ZONE__'
$windowsZoneId = '__WINDOWS_ZONE__'
$elapsed = [System.Diagnostics.Stopwatch]::StartNew()
$previous = $null
$requestedUtc = $null
$actual = $null
$zoneChanged = $false
$clockChanged = $false

function Get-SirkClockState {
    $now = Get-Date -ErrorAction Stop
    $zone = Get-TimeZone -ErrorAction Stop
    return [pscustomobject]@{
        utc = $now.ToUniversalTime().ToString('o', [System.Globalization.CultureInfo]::InvariantCulture)
        local = $now.ToString('o', [System.Globalization.CultureInfo]::InvariantCulture)
        timeZone = $zone.Id
    }
}

try {
    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
        throw 'Windows is required for server clock synchronization.'
    }
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'An elevated MeshAgent service token is required to change the system clock.'
    }
    $culture = [System.Globalization.CultureInfo]::InvariantCulture
    $styles = [System.Globalization.DateTimeStyles]::AssumeUniversal -bor [System.Globalization.DateTimeStyles]::AdjustToUniversal
    $serverUtc = [datetime]::ParseExact($sourceUtcText, 'yyyy-MM-ddTHH:mm:ss.fffZ', $culture, $styles)
    if ($serverUtc.Kind -ne [DateTimeKind]::Utc) { throw 'The server timestamp is not UTC.' }

    # Resolve the actual Windows zone ID before changing anything; no offset fallback.
    $installedZone = [TimeZoneInfo]::FindSystemTimeZoneById($windowsZoneId)
    if (-not $installedZone -or $installedZone.Id -cne $windowsZoneId) {
        throw ('The requested Windows time zone is unavailable: ' + $windowsZoneId)
    }

    # Windows API accepts UTC directly, avoiding ambiguous local times at DST fall-back.
    # Compile before modifying the zone so language policy errors leave the host unchanged.
    if (-not ('SirkServerClockNative' -as [type])) {
        Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class SirkServerClockNative {
    [StructLayout(LayoutKind.Sequential)]
    public struct SystemTime {
        public ushort Year;
        public ushort Month;
        public ushort DayOfWeek;
        public ushort Day;
        public ushort Hour;
        public ushort Minute;
        public ushort Second;
        public ushort Milliseconds;
    }
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool SetSystemTime(ref SystemTime time);
}
'@ -ErrorAction Stop
    }

    $previous = Get-SirkClockState
    if ($previous.timeZone -cne $windowsZoneId) {
        Set-TimeZone -Id $windowsZoneId -ErrorAction Stop
        $zoneChanged = $true
    }
    if ((Get-TimeZone -ErrorAction Stop).Id -cne $windowsZoneId) {
        throw 'Time-zone read-after-write mismatch.'
    }

    # Compensate script-local execution time, not unknown network/queue latency.
    $requestedUtc = $serverUtc.Add($elapsed.Elapsed)
    if ([math]::Abs(((Get-Date -ErrorAction Stop).ToUniversalTime() - $requestedUtc).TotalSeconds) -gt 2) {
        $utc = $serverUtc.Add($elapsed.Elapsed)
        $native = New-Object SirkServerClockNative+SystemTime
        $native.Year = [uint16]$utc.Year
        $native.Month = [uint16]$utc.Month
        $native.Day = [uint16]$utc.Day
        $native.Hour = [uint16]$utc.Hour
        $native.Minute = [uint16]$utc.Minute
        $native.Second = [uint16]$utc.Second
        $native.Milliseconds = [uint16]$utc.Millisecond
        if (-not [SirkServerClockNative]::SetSystemTime([ref]$native)) {
            $errorCode = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
            throw ('SetSystemTime failed (Win32 error {0}).' -f $errorCode)
        }
        $clockChanged = $true
        $requestedUtc = $utc
    }

    $actual = Get-SirkClockState
    $actualUtc = [datetime]::Parse($actual.utc, $culture, [System.Globalization.DateTimeStyles]::RoundtripKind)
    $skewSeconds = [math]::Abs(($actualUtc - $requestedUtc).TotalSeconds)
    if ($actual.timeZone -cne $windowsZoneId -or $skewSeconds -gt 5) {
        throw ('Clock read-after-write mismatch (UTC delta {0:N3}s, zone {1}).' -f $skewSeconds, $actual.timeZone)
    }
    $status = if ($zoneChanged -or $clockChanged) { 'success' } else { 'already-current' }
    [pscustomobject]@{
        status = $status
        source = @{ system = 'MeshCentral server'; utc = $sourceUtcText; timeZone = $sourceZoneId }
        previous = $previous
        requested = @{ utc = $requestedUtc.ToString('o', $culture); timeZone = $windowsZoneId }
        actual = $actual
        clockChanged = $clockChanged
        timeZoneChanged = $zoneChanged
        readAfterWriteDeltaSeconds = $skewSeconds
        transport = 'Network/queue latency is not measured or RTT-corrected; no NTP accuracy claim.'
    } | ConvertTo-Json -Depth 6 -Compress
} catch {
    $reason = $_.Exception.Message
    try { $actual = Get-SirkClockState } catch { $actual = @{ error = $_.Exception.Message } }
    $partial = $zoneChanged -or $clockChanged
    if ($previous -and $actual -and $actual.timeZone -and $previous.timeZone -cne $actual.timeZone) {
        $partial = $true
    }
    $failureStatus = if ($partial) { 'partial-failure' } else { 'failed' }
    [pscustomobject]@{
        status = $failureStatus
        error = $reason
        source = @{ system = 'MeshCentral server'; utc = $sourceUtcText; timeZone = $sourceZoneId }
        previous = $previous
        requested = @{ utc = if ($requestedUtc) { $requestedUtc.ToString('o', [System.Globalization.CultureInfo]::InvariantCulture) } else { $sourceUtcText }; timeZone = $windowsZoneId }
        actual = $actual
        clockChanged = $clockChanged
        timeZoneChanged = $zoneChanged
        transport = 'Network/queue latency is not measured or RTT-corrected.'
    } | ConvertTo-Json -Depth 6 -Compress
    throw ('Server clock synchronization ' + $failureStatus + ': ' + $reason)
}
`;

function buildPowerShell(state) {
    if (!state || typeof state.utc !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(state.utc)) throw new Error("Invalid server UTC instant.");
    if (snapshot(new Date(state.utc), state.serverZone).windowsZone !== state.windowsZone) throw new Error("Server time-zone mapping mismatch.");
    return TEMPLATE.replace(/__SOURCE_UTC__/g, psLiteral(state.utc))
        .replace(/__SOURCE_ZONE__/g, psLiteral(state.serverZone))
        .replace(/__WINDOWS_ZONE__/g, psLiteral(state.windowsZone));
}

module.exports = {
    windowsZone: windowsZone,
    snapshot: snapshot,
    readServerSnapshot: readServerSnapshot,
    requireWindowsTarget: requireWindowsTarget,
    rejectClientValues: rejectClientValues,
    buildPowerShell: buildPowerShell
};
