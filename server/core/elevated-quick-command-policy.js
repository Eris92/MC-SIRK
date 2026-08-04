"use strict";

var INTERACTIVE_MARKER = "$taskName='SIRK-Desktop-'";

function extractInteractiveCommand(commandText) {
    var source = String(commandText || "");
    if (source.indexOf(INTERACTIVE_MARKER) < 0 ||
        source.indexOf("New-ScheduledTaskPrincipal") < 0 ||
        source.indexOf("wscript.exe") < 0) return "";

    var encodedMatch = source.match(/FromBase64String\('([^']+)'\)/i);
    if (!encodedMatch) return "";

    var vbs;
    try { vbs = Buffer.from(encodedMatch[1], "base64").toString("utf8"); }
    catch (error) { return ""; }

    var runMatch = vbs.match(/shell\.Run\s+"([\s\S]*?)",\s*1,\s*False/i);
    if (!runMatch) return "";
    return runMatch[1].replace(/""/g, '"').trim();
}

function launcherSource() {
    return [
        "using System;",
        "using System.ComponentModel;",
        "using System.Diagnostics;",
        "using System.Runtime.InteropServices;",
        "using System.Text;",
        "using System.Security.Principal;",
        "public static class SirkInteractiveSystemLauncher {",
        "  private const uint TOKEN_ASSIGN_PRIMARY=0x0001;",
        "  private const uint TOKEN_DUPLICATE=0x0002;",
        "  private const uint TOKEN_QUERY=0x0008;",
        "  private const uint MAXIMUM_ALLOWED=0x02000000;",
        "  private const uint CREATE_NEW_CONSOLE=0x00000010;",
        "  private const uint CREATE_UNICODE_ENVIRONMENT=0x00000400;",
        "  private enum SECURITY_IMPERSONATION_LEVEL { SecurityAnonymous, SecurityIdentification, SecurityImpersonation, SecurityDelegation }",
        "  private enum TOKEN_TYPE { TokenPrimary=1, TokenImpersonation }",
        "  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]",
        "  private struct STARTUPINFO { public int cb; public string lpReserved; public string lpDesktop; public string lpTitle; public int dwX; public int dwY; public int dwXSize; public int dwYSize; public int dwXCountChars; public int dwYCountChars; public int dwFillAttribute; public int dwFlags; public short wShowWindow; public short cbReserved2; public IntPtr lpReserved2; public IntPtr hStdInput; public IntPtr hStdOutput; public IntPtr hStdError; }",
        "  [StructLayout(LayoutKind.Sequential)]",
        "  private struct PROCESS_INFORMATION { public IntPtr hProcess; public IntPtr hThread; public int dwProcessId; public int dwThreadId; }",
        "  [DllImport(\"advapi32.dll\", SetLastError=true)] private static extern bool OpenProcessToken(IntPtr processHandle, uint desiredAccess, out IntPtr tokenHandle);",
        "  [DllImport(\"advapi32.dll\", SetLastError=true)] private static extern bool DuplicateTokenEx(IntPtr existingToken, uint desiredAccess, IntPtr tokenAttributes, SECURITY_IMPERSONATION_LEVEL impersonationLevel, TOKEN_TYPE tokenType, out IntPtr newToken);",
        "  [DllImport(\"advapi32.dll\", CharSet=CharSet.Unicode, SetLastError=true)] private static extern bool CreateProcessAsUser(IntPtr token, string applicationName, StringBuilder commandLine, IntPtr processAttributes, IntPtr threadAttributes, bool inheritHandles, uint creationFlags, IntPtr environment, string currentDirectory, ref STARTUPINFO startupInfo, out PROCESS_INFORMATION processInformation);",
        "  [DllImport(\"userenv.dll\", SetLastError=true)] private static extern bool CreateEnvironmentBlock(out IntPtr environment, IntPtr token, bool inherit);",
        "  [DllImport(\"userenv.dll\", SetLastError=true)] private static extern bool DestroyEnvironmentBlock(IntPtr environment);",
        "  [DllImport(\"kernel32.dll\", SetLastError=true)] private static extern bool CloseHandle(IntPtr handle);",
        "  public static int Launch(string commandLine, int sessionId) {",
        "    if (!WindowsIdentity.GetCurrent().IsSystem) throw new InvalidOperationException(\"MeshAgent must run as LocalSystem to launch an elevated interactive command.\");",
        "    if (String.IsNullOrWhiteSpace(commandLine)) throw new ArgumentException(\"Command line is empty.\");",
        "    Process winlogon=null;",
        "    foreach (Process candidate in Process.GetProcessesByName(\"winlogon\")) {",
        "      try { if (candidate.SessionId==sessionId) { winlogon=candidate; break; } candidate.Dispose(); }",
        "      catch { candidate.Dispose(); }",
        "    }",
        "    if (winlogon==null) throw new InvalidOperationException(\"No winlogon process exists in interactive session \"+sessionId+\".\");",
        "    IntPtr sourceToken=IntPtr.Zero, primaryToken=IntPtr.Zero, environment=IntPtr.Zero;",
        "    PROCESS_INFORMATION processInfo=new PROCESS_INFORMATION();",
        "    try {",
        "      if (!OpenProcessToken(winlogon.Handle, TOKEN_ASSIGN_PRIMARY|TOKEN_DUPLICATE|TOKEN_QUERY, out sourceToken)) throw new Win32Exception(Marshal.GetLastWin32Error(), \"OpenProcessToken failed.\");",
        "      if (!DuplicateTokenEx(sourceToken, MAXIMUM_ALLOWED, IntPtr.Zero, SECURITY_IMPERSONATION_LEVEL.SecurityImpersonation, TOKEN_TYPE.TokenPrimary, out primaryToken)) throw new Win32Exception(Marshal.GetLastWin32Error(), \"DuplicateTokenEx failed.\");",
        "      uint flags=CREATE_NEW_CONSOLE;",
        "      if (CreateEnvironmentBlock(out environment, primaryToken, false)) flags|=CREATE_UNICODE_ENVIRONMENT; else environment=IntPtr.Zero;",
        "      STARTUPINFO startupInfo=new STARTUPINFO(); startupInfo.cb=Marshal.SizeOf(typeof(STARTUPINFO)); startupInfo.lpDesktop=\"winsta0\\\\default\";",
        "      StringBuilder mutableCommandLine=new StringBuilder(commandLine);",
        "      string currentDirectory=Environment.GetFolderPath(Environment.SpecialFolder.System);",
        "      if (!CreateProcessAsUser(primaryToken, null, mutableCommandLine, IntPtr.Zero, IntPtr.Zero, false, flags, environment, currentDirectory, ref startupInfo, out processInfo)) throw new Win32Exception(Marshal.GetLastWin32Error(), \"CreateProcessAsUser failed.\");",
        "      return processInfo.dwProcessId;",
        "    } finally {",
        "      if (processInfo.hThread!=IntPtr.Zero) CloseHandle(processInfo.hThread);",
        "      if (processInfo.hProcess!=IntPtr.Zero) CloseHandle(processInfo.hProcess);",
        "      if (environment!=IntPtr.Zero) DestroyEnvironmentBlock(environment);",
        "      if (primaryToken!=IntPtr.Zero) CloseHandle(primaryToken);",
        "      if (sourceToken!=IntPtr.Zero) CloseHandle(sourceToken);",
        "      winlogon.Dispose();",
        "    }",
        "  }",
        "}"
    ].join("\n");
}

function buildSystemLauncher(commandLine, label) {
    var source64 = Buffer.from(launcherSource(), "utf8").toString("base64");
    var command64 = Buffer.from(commandLine, "utf8").toString("base64");
    var safeLabel = String(label || "Quick command").replace(/'/g, "''");
    return [
        "$ErrorActionPreference='Stop'",
        "$explorer=@(Get-Process explorer -IncludeUserName -ErrorAction SilentlyContinue | Where-Object { $_.SessionId -gt 0 -and $_.UserName } | Sort-Object SessionId | Select-Object -First 1)",
        "if(-not $explorer){throw 'No interactive Windows user session was found.'}",
        "$source=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + source64 + "'))",
        "if(-not ('SirkInteractiveSystemLauncher' -as [type])){Add-Type -TypeDefinition $source -Language CSharp -ErrorAction Stop}",
        "$commandLine=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + command64 + "'))",
        "$processId=[SirkInteractiveSystemLauncher]::Launch($commandLine,[int]$explorer.SessionId)",
        "Write-Output ('Started elevated as NT AUTHORITY\\SYSTEM in interactive session {0}. PID {1}: " + safeLabel + "' -f $explorer.SessionId,$processId)"
    ].join(";");
}

function transformCommand(command) {
    if (!command || Number(command.runAsUser) !== 0 || Number(command.type) !== 2) return command;
    var commandLine = extractInteractiveCommand(command.cmd);
    if (!commandLine) return command;
    return Object.assign({}, command, {
        cmd: buildSystemLauncher(commandLine, command.label),
        runAsUser: 0,
        type: 2
    });
}

function apply(plugin) {
    var device = plugin && plugin.runtime && plugin.runtime.context && plugin.runtime.context.device;
    if (!device || typeof device.sendRunCommands !== "function" || device.__sirkElevatedQuickCommands) return;
    var original = device.sendRunCommands;
    device.sendRunCommands = function (context, command, responseId, sessionId) {
        return original.call(device, context, transformCommand(command), responseId, sessionId);
    };
    device.__sirkElevatedQuickCommands = true;
}

module.exports.apply = apply;
module.exports.buildSystemLauncher = buildSystemLauncher;
module.exports.extractInteractiveCommand = extractInteractiveCommand;
module.exports.transformCommand = transformCommand;
