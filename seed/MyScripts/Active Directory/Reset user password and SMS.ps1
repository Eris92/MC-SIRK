#PL Reset hasła użytkownika i SMS | Resetuje hasło, odblokowuje konto i wysyła nowe hasło na numer AD mobile.
#EN Reset user password and SMS | Resets password, unlocks the account and sends the new password to AD mobile.
# Approval: true
# VariableUserRequiredPL: $AdUser, Użytkownik
# VariableUserRequiredEN: $AdUser, User
# VariableSwitchPL: $ChangeAtLogon=true, Wymuś zmianę hasła przy następnym logowaniu
# VariableSwitchEN: $ChangeAtLogon=true, Require password change at next logon
# SirkVariableOptionSource: AdUser=ad-users
# SirkSystemCredential: AD
# SirkSystemCredential: SMS
# MultiHost: false
# runAsUser: 0

$ErrorActionPreference = 'Stop'
Import-Module ActiveDirectory -ErrorAction Stop
. (Join-Path $env:MYSCRIPTS_SCRIPTS_ROOT '_shared\Sirk-AdSms.ps1')

$adSecure = ConvertTo-SecureString $env:MYSCRIPTS_AD_PASSWORD -AsPlainText -Force
$adCredential = [pscredential]::new($env:MYSCRIPTS_AD_LOGIN, $adSecure)
$user = Get-ADUser -Identity $AdUser -Server $env:MYSCRIPTS_AD_DOMAIN -Credential $adCredential -Properties DisplayName,Mobile
if ([string]::IsNullOrWhiteSpace([string]$user.Mobile)) { throw 'Selected user has no mobile number in Active Directory.' }
$password = New-SirkPassword
Set-ADAccountPassword -Identity $user -Reset -NewPassword (ConvertTo-SecureString $password -AsPlainText -Force) -Server $env:MYSCRIPTS_AD_DOMAIN -Credential $adCredential
Unlock-ADAccount -Identity $user -Server $env:MYSCRIPTS_AD_DOMAIN -Credential $adCredential
Set-ADUser -Identity $user -ChangePasswordAtLogon ([string]$ChangeAtLogon -match '^(1|true|yes|tak|on)$') -Server $env:MYSCRIPTS_AD_DOMAIN -Credential $adCredential
Send-SirkSms -Number ([string]$user.Mobile) -Text ("Nowe haslo dla konta $AdUser`: $password")
[ordered]@{ success = $true; user = [string]$user.SamAccountName; mobile = ([string]$user.Mobile -replace '.(?=.{4})','*'); changeAtLogon = ([string]$ChangeAtLogon -match '^(1|true|yes|tak|on)$') }
