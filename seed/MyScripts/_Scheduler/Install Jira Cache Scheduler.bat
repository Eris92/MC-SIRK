@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "TASK_NAME=MC-SIRK Jira Cache Refresh"

if /I "%~1"=="--help" goto :help

if not "%~1"=="" (
    for %%I in ("%~1") do set "DATA_ROOT=%%~fI"
) else (
    for %%I in ("%~dp0..\..\..") do set "DATA_ROOT=%%~fI"
)

if not "%~2"=="" (
    for %%I in ("%~2") do set "PLUGIN_ROOT=%%~fI"
) else (
    for %%I in ("%~dp0..\..\..") do set "PLUGIN_ROOT=%%~fI"
)

if not exist "%DATA_ROOT%\secrets.json" goto :usage_error
if not exist "%DATA_ROOT%\.secret.key" goto :usage_error
if not exist "%DATA_ROOT%\settings.json" if not exist "%ProgramData%\SIRK Management Platform\settings.json" goto :usage_error
if not exist "%PLUGIN_ROOT%\server\core\jira-asset-service.js" goto :usage_error

set "NODE_EXE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%~fN"
if not defined NODE_EXE (
    echo ERROR: node.exe was not found in PATH.
    exit /b 3
)

set "RUNNER=%~dp0jira-cache-refresh.js"
if not exist "%RUNNER%" (
    echo ERROR: Scheduler runner was not found: "%RUNNER%"
    exit /b 3
)

fltmc.exe >nul 2>&1
if errorlevel 1 (
    echo ERROR: Run this BAT as Administrator.
    exit /b 5
)

set "SIRK_SCHEDULER_NODE=%NODE_EXE%"
set "SIRK_SCHEDULER_RUNNER=%RUNNER%"
set "SIRK_SCHEDULER_DATA_ROOT=%DATA_ROOT%"
set "SIRK_SCHEDULER_PLUGIN_ROOT=%PLUGIN_ROOT%"
set "SIRK_SCHEDULER_TASK=%TASK_NAME%"

powershell.exe -NoLogo -NoProfile -NonInteractive -Command ^
 "$ErrorActionPreference='Stop';" ^
 "$q=[char]34;" ^
 "$arguments=$q+$env:SIRK_SCHEDULER_RUNNER+$q+' '+$q+$env:SIRK_SCHEDULER_DATA_ROOT+$q+' '+$q+$env:SIRK_SCHEDULER_PLUGIN_ROOT+$q;" ^
 "$action=New-ScheduledTaskAction -Execute $env:SIRK_SCHEDULER_NODE -Argument $arguments -WorkingDirectory (Split-Path -Parent $env:SIRK_SCHEDULER_RUNNER);" ^
 "$trigger=New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Hours 1);" ^
 "$principal=New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest;" ^
 "$settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew;" ^
 "Register-ScheduledTask -TaskName $env:SIRK_SCHEDULER_TASK -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null;" ^
 "Start-ScheduledTask -TaskName $env:SIRK_SCHEDULER_TASK;" ^
 "Write-Output ('Scheduled task created: '+$env:SIRK_SCHEDULER_TASK)"

if errorlevel 1 (
    echo ERROR: Scheduled task creation failed.
    exit /b 4
)

echo Jira cache refresh is scheduled every 1 hour and the first run has started.
exit /b 0

:help
echo Usage:
echo   "%~nx0" "C:\path\to\sirk-platform-data" "C:\path\to\MC-SIRK-plugin"
echo.
echo The second path is optional when this BAT is inside the plugin seed/MyScripts/_Scheduler directory.
exit /b 0

:usage_error
echo ERROR: SIRK data or plugin files were not found.
echo Usage:
echo   "%~nx0" "C:\path\to\sirk-platform-data" "C:\path\to\MC-SIRK-plugin"
exit /b 2
