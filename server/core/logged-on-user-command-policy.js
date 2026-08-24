"use strict";

var MARKER = "$taskName='SIRK-UserCommand-'";
var DEFAULT_TIMEOUT_SECONDS = 240;

function activeSessionSource() {
    return [
        "using System;",
        "using System.Runtime.InteropServices;",
        "public static class SirkActiveWtsSession {",
        "  private enum WTS_CONNECTSTATE_CLASS { WTSActive, WTSConnected, WTSConnectQuery, WTSShadow, WTSDisconnected, WTSIdle, WTSListen, WTSReset, WTSDown, WTSInit }",
        "  [StructLayout(LayoutKind.Sequential)]",
        "  private struct WTS_SESSION_INFO { public int SessionID; public IntPtr pWinStationName; public WTS_CONNECTSTATE_CLASS State; }",
        "  [DllImport(\"wtsapi32.dll\", SetLastError=true)] private static extern bool WTSEnumerateSessions(IntPtr server, int reserved, int version, out IntPtr sessionInfo, out int count);",
        "  [DllImport(\"wtsapi32.dll\")] private static extern void WTSFreeMemory(IntPtr memory);",
        "  public static int GetActiveSessionId() {",
        "    IntPtr buffer=IntPtr.Zero; int count=0;",
        "    try {",
        "      if (!WTSEnumerateSessions(IntPtr.Zero, 0, 1, out buffer, out count)) return -1;",
        "      int size=Marshal.SizeOf(typeof(WTS_SESSION_INFO)); long current=buffer.ToInt64();",
        "      for (int index=0; index<count; index++) {",
        "        WTS_SESSION_INFO item=(WTS_SESSION_INFO)Marshal.PtrToStructure(new IntPtr(current), typeof(WTS_SESSION_INFO));",
        "        if (item.State==WTS_CONNECTSTATE_CLASS.WTSActive && item.SessionID>0) return item.SessionID;",
        "        current+=size;",
        "      }",
        "      return -1;",
        "    } finally { if (buffer!=IntPtr.Zero) WTSFreeMemory(buffer); }",
        "  }",
        "}"
    ].join("\n");
}

function runnerSource() {
    return [
        "param([Parameter(Mandatory=$true)][string]$WorkDir,[Parameter(Mandatory=$true)][int]$CommandType,[Parameter(Mandatory=$true)][int]$DirectPowerShell)",
        "$ErrorActionPreference='Stop'",
        "$outputPath=Join-Path $WorkDir 'output.txt'",
        "$exitPath=Join-Path $WorkDir 'exit.txt'",
        "$exitCode=0",
        "$captured=@()",
        "try{",
        "if($CommandType -eq 1){",
        "$scriptPath=Join-Path $WorkDir 'command.cmd'",
        "$captured=@(& $env:ComSpec '/d' '/s' '/c' ('call \"'+$scriptPath+'\"') 2>&1)",
        "if($null -ne $LASTEXITCODE){$exitCode=[int]$LASTEXITCODE}",
        "}else{",
        "$scriptPath=Join-Path $WorkDir 'command.ps1'",
        "if($DirectPowerShell -eq 1){",
        "$captured=@(& $scriptPath 2>&1)",
        "}else{",
        "$powerShell=Join-Path $env:SystemRoot 'System32\\WindowsPowerShell\\v1.0\\powershell.exe'",
        "$captured=@(& $powerShell '-NoProfile' '-NonInteractive' '-ExecutionPolicy' 'Bypass' '-File' $scriptPath 2>&1)",
        "if($null -ne $LASTEXITCODE){$exitCode=[int]$LASTEXITCODE}",
        "}",
        "}",
        "}catch{",
        "$captured+=($_ | Out-String)",
        "$exitCode=1",
        "}",
        "$lines=@($captured | ForEach-Object { if($null -ne $_){$_.ToString()} })",
        "$utf8=New-Object System.Text.UTF8Encoding($false)",
        "try{[IO.File]::WriteAllText($outputPath,($lines -join [Environment]::NewLine),$utf8)}catch{$exitCode=1}",
        "[IO.File]::WriteAllText($exitPath,[string]$exitCode,$utf8)",
        "exit $exitCode"
    ].join("\r\n");
}

function hiddenLauncherSource() {
    return [
        "Set fso = CreateObject(\"Scripting.FileSystemObject\")",
        "Set shell = CreateObject(\"WScript.Shell\")",
        "Set commandFile = fso.OpenTextFile(WScript.Arguments(0), 1, False, -1)",
        "commandLine = commandFile.ReadAll",
        "commandFile.Close",
        "exitCode = shell.Run(commandLine, 0, True)",
        "WScript.Quit exitCode"
    ].join("\r\n");
}

function commandBytes(command) {
    var value = Buffer.from(String(command && command.cmd || ""), "utf8");
    if (Number(command && command.type) !== 2) return value;
    return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), value]);
}

function buildLoggedOnUserLauncher(command, options) {
    options = options || {};
    var timeoutSeconds = Math.max(30, Math.min(270, Number(options.timeoutSeconds) || DEFAULT_TIMEOUT_SECONDS));
    var commandType = Number(command && command.type) === 1 ? 1 : 2;
    var runLevel = command && command.elevatedUserSession === true ? "Highest" : "Limited";
    var directPowerShell = commandType === 2 && command && command.elevatedUserSession === true ? 1 : 0;
    var command64 = commandBytes(command).toString("base64");
    var runner64 = Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from(runnerSource(), "utf8")
    ]).toString("base64");
    var launcher64 = Buffer.from(hiddenLauncherSource(), "utf8").toString("base64");
    var wts64 = Buffer.from(activeSessionSource(), "utf8").toString("base64");

    return [
        "$ErrorActionPreference='Stop'",
        "$taskName='SIRK-UserCommand-'+[guid]::NewGuid().ToString('N')",
        "$workDir=$null",
        "try{",
        "$wtsSource=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + wts64 + "'))",
        "if(-not ('SirkActiveWtsSession' -as [type])){Add-Type -TypeDefinition $wtsSource -Language CSharp -ErrorAction Stop}",
        "$sessionId=[SirkActiveWtsSession]::GetActiveSessionId()",
        "$explorer=@()",
        "if($sessionId -gt 0){$explorer=@(Get-Process explorer -IncludeUserName -ErrorAction SilentlyContinue | Where-Object { $_.SessionId -eq $sessionId -and $_.UserName } | Select-Object -First 1)}",
        "if(-not $explorer){$explorer=@(Get-Process explorer -IncludeUserName -ErrorAction SilentlyContinue | Where-Object { $_.SessionId -gt 0 -and $_.UserName } | Sort-Object SessionId -Descending | Select-Object -First 1)}",
        "if(-not $explorer){throw 'No interactive Windows user session was found.'}",
        "$sessionId=[int]$explorer.SessionId",
        "$userName=[string]$explorer.UserName",
        "$userSid=(New-Object Security.Principal.NTAccount($userName)).Translate([Security.Principal.SecurityIdentifier]).Value",
        "$workDir=Join-Path $env:ProgramData $taskName",
        "New-Item -ItemType Directory -Path $workDir -Force -ErrorAction Stop|Out-Null",
        "$icacls=Join-Path $env:SystemRoot 'System32\\icacls.exe'",
        "& $icacls $workDir '/inheritance:r' '/grant:r' '*S-1-5-18:(OI)(CI)F' ('*'+$userSid+':(OI)(CI)F') '/Q'|Out-Null",
        "if($LASTEXITCODE -ne 0){throw 'Unable to secure the logged-on-user command directory.'}",
        "$commandType=" + commandType,
        "$directPowerShell=" + directPowerShell,
        "$runnerMode=if($directPowerShell -eq 1){' -STA'}else{' -NonInteractive'}",
        "$commandName=if($commandType -eq 1){'command.cmd'}else{'command.ps1'}",
        "$commandPath=Join-Path $workDir $commandName",
        "$runnerPath=Join-Path $workDir 'runner.ps1'",
        "$launcherPath=Join-Path $workDir 'launcher.vbs'",
        "$launchCommandPath=Join-Path $workDir 'launch-command.txt'",
        "$outputPath=Join-Path $workDir 'output.txt'",
        "$exitPath=Join-Path $workDir 'exit.txt'",
        "[IO.File]::WriteAllBytes($commandPath,[Convert]::FromBase64String('" + command64 + "'))",
        "[IO.File]::WriteAllBytes($runnerPath,[Convert]::FromBase64String('" + runner64 + "'))",
        "[IO.File]::WriteAllBytes($launcherPath,[Convert]::FromBase64String('" + launcher64 + "'))",
        "$powerShell=Join-Path $env:SystemRoot 'System32\\WindowsPowerShell\\v1.0\\powershell.exe'",
        "$runnerCommand='\"'+$powerShell+'\" -NoProfile'+$runnerMode+' -ExecutionPolicy Bypass -WindowStyle Hidden -File \"'+$runnerPath+'\" -WorkDir \"'+$workDir+'\" -CommandType '+$commandType+' -DirectPowerShell '+$directPowerShell",
        "[IO.File]::WriteAllText($launchCommandPath,$runnerCommand,[Text.Encoding]::Unicode)",
        "$wscript=Join-Path $env:SystemRoot 'System32\\wscript.exe'",
        "$action=New-ScheduledTaskAction -Execute $wscript -Argument ('//B //NoLogo \"'+$launcherPath+'\" \"'+$launchCommandPath+'\"')",
        "$principal=New-ScheduledTaskPrincipal -UserId $userName -LogonType Interactive -RunLevel " + runLevel,
        "Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Force -ErrorAction Stop|Out-Null",
        "Start-ScheduledTask -TaskName $taskName -ErrorAction Stop",
        "$deadline=[DateTime]::UtcNow.AddSeconds(" + timeoutSeconds + ")",
        "while(-not (Test-Path -LiteralPath $exitPath -PathType Leaf)){if([DateTime]::UtcNow -ge $deadline){throw 'Logged-on-user command timed out.'};Start-Sleep -Milliseconds 200}",
        "$exitCodeText=[IO.File]::ReadAllText($exitPath).Trim()",
        "$exitCode=if($exitCodeText -match '^-?\\d+$'){[int]$exitCodeText}else{1}",
        "if(Test-Path -LiteralPath $outputPath -PathType Leaf){$output=[IO.File]::ReadAllText($outputPath,[Text.Encoding]::UTF8);if(-not [string]::IsNullOrWhiteSpace($output)){Write-Output $output.TrimEnd()}}",
        "if($exitCode -ne 0){throw ('Logged-on-user command failed with exit code {0}.' -f $exitCode)}",
        "}finally{",
        "if($taskName){Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue;Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue}",
        "if($workDir){Start-Sleep -Milliseconds 100;Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue}",
        "}"
    ].join(";");
}

function isNativeGuiLauncher(command) {
    var commandText = String(command && command.cmd || "");
    if (/\bcertmgr\.msc\b/i.test(commandText)) return false;
    return Number(command && command.runAsUser) === 2 &&
        Number(command && command.type) === 1 &&
        /^\s*start\s+\"\"\s+/i.test(commandText);
}

function transformCommand(command, options) {
    if (!command) return command;
    var runAsUser = Number(command.runAsUser);
    var type = Number(command.type);
    if ((runAsUser !== 1 && runAsUser !== 2) || (type !== 1 && type !== 2)) return command;
    if (isNativeGuiLauncher(command)) return command;
    if (String(command.cmd || "").indexOf(MARKER) >= 0) return command;

    return Object.assign({}, command, {
        cmd: buildLoggedOnUserLauncher(command, options),
        runAsUser: 0,
        type: 2
    });
}

function apply(plugin, options) {
    var device = plugin && plugin.runtime && plugin.runtime.context && plugin.runtime.context.device;
    if (!device || typeof device.sendRunCommands !== "function" || device.__sirkLoggedOnUserCommands) return;
    var original = device.sendRunCommands;
    device.sendRunCommands = function (context, command, responseId, sessionId) {
        return original.call(device, context, transformCommand(command, options), responseId, sessionId);
    };
    device.__sirkLoggedOnUserCommands = true;
}

module.exports.apply = apply;
module.exports.activeSessionSource = activeSessionSource;
module.exports.runnerSource = runnerSource;
module.exports.hiddenLauncherSource = hiddenLauncherSource;
module.exports.buildLoggedOnUserLauncher = buildLoggedOnUserLauncher;
module.exports.isNativeGuiLauncher = isNativeGuiLauncher;
module.exports.transformCommand = transformCommand;
