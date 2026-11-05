# PL: Podpisany plik RDP | Serwer MeshCentral tworzy i podpisuje plik .rdp (certyfikat z odcisku albo szablonu), a ten skrypt zapisuje go na pulpicie zalogowanego użytkownika.
# EN: Signed RDP file | The MeshCentral server builds and signs the .rdp file (certificate by thumbprint or template); this script saves it to the logged-on user's Desktop.
# runAsUser: 0
# SirkSystemCredential: CA
# SirkServerStage: CA/_Sign RDP file.ps1
# SirkRdpSigningThumbprint:
# SirkCaTemplate:
# VariablePL: $TargetHost, Host docelowy | Nazwa lub FQDN hosta w pliku RDP (puste = ten komputer)
# VariableEN: $TargetHost, Target host | Host name or FQDN written to the RDP file (empty = this computer)

# #406, mixed mode. Stage 1 runs on the MeshCentral server (CA/_Sign RDP file.ps1):
# the file is signed there with the server's certificate (thumbprint or template from
# the headers above / global CA defaults). Stage 2 (this script) runs on the selected
# device through the MeshAgent (SYSTEM) and only delivers the signed file:
# - $SirkStageFileName / $SirkStageFileBase64 are injected by the server, never typed by users.
# - The file name and the signature lines are checked before anything is written.
# - The Desktop of the interactive user is resolved from the console session
#   owner's profile (honouring Desktop folder redirection), never from input.
# - Existing <host>.rdp on the Desktop is overwritten (latest signed file wins).

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Get-Setting([string]$Name) {
    $variable = Get-Variable -Name $Name -ErrorAction SilentlyContinue
    if ($variable -and $null -ne $variable.Value) { return ([string]$variable.Value).Trim() }
    return ''
}

function Test-SignedRdpFile([string]$FileName, [byte[]]$Bytes) {
    if ($FileName -notmatch '^[A-Za-z0-9][A-Za-z0-9.-]{0,250}\.rdp$') { throw 'The server stage returned an invalid RDP file name.' }
    if (-not $Bytes -or $Bytes.Length -eq 0) { throw 'The server stage returned an empty RDP file.' }
    $text = [System.Text.Encoding]::Unicode.GetString($Bytes)
    if ($text -notmatch '(?m)^full address:s:\S+' -or $text -notmatch '(?m)^signscope:s:' -or $text -notmatch '(?m)^signature:s:\S+') { throw 'The RDP file from the server is not signed; it was not delivered.' }
    return $text
}

function Get-InteractiveDesktop {
    $account = [string](Get-CimInstance -ClassName Win32_ComputerSystem).UserName
    if ([string]::IsNullOrWhiteSpace($account)) { throw 'No interactive user is logged on; the RDP file cannot be delivered to a Desktop.' }
    $sid = (New-Object System.Security.Principal.NTAccount($account)).Translate([System.Security.Principal.SecurityIdentifier]).Value
    $profile = Get-CimInstance -ClassName Win32_UserProfile -Filter ("SID='{0}'" -f $sid)
    if (-not $profile -or -not $profile.LocalPath) { throw "Profile of the interactive user was not found." }
    $desktop = Join-Path $profile.LocalPath 'Desktop'
    $shellFolders = "Registry::HKEY_USERS\$sid\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders"
    $configured = (Get-ItemProperty -LiteralPath $shellFolders -Name Desktop -ErrorAction SilentlyContinue).Desktop
    if ($configured) {
        $expanded = ([string]$configured) -replace '%USERPROFILE%', $profile.LocalPath
        if ($expanded -notmatch '%') { $desktop = $expanded }
    }
    $desktop = [System.IO.Path]::GetFullPath($desktop)
    if (-not (Test-Path -LiteralPath $desktop -PathType Container)) { throw "Desktop folder of the interactive user does not exist: $desktop" }
    return [pscustomobject]@{ Account = $account; Path = $desktop }
}

$fileName = Get-Setting 'SirkStageFileName'
$encoded = Get-Setting 'SirkStageFileBase64'
if (-not $fileName -or -not $encoded) { throw 'The server stage did not provide the signed RDP file.' }
$bytes = try { [Convert]::FromBase64String($encoded) } catch { throw 'The signed RDP file from the server is not valid Base64.' }
[void](Test-SignedRdpFile $fileName $bytes)
$desktop = Get-InteractiveDesktop
$destination = Join-Path $desktop.Path $fileName
[System.IO.File]::WriteAllBytes($destination, $bytes)
Write-Output ("Signed RDP file delivered: {0}" -f $destination)
Write-Output ("User: {0}" -f $desktop.Account)
$stageOutput = Get-Setting 'SirkStageOutput'
if ($stageOutput) { Write-Output $stageOutput }
