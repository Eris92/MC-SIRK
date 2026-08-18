#PL Utwórz konto użytkownika i wyślij SMS | Tworzy konto AD w wybranej lokalizacji i wysyła hasło na podany numer.
#EN Create user and send SMS | Creates an AD account in a selected location and sends its password to the supplied number.
# Approval: true
# VariableRequiredPL: $FirstName, Imię
# VariableRequiredEN: $FirstName, First name
# VariableRequiredPL: $LastName, Nazwisko
# VariableRequiredEN: $LastName, Last name
# VariableRequiredPL: $Mobile, Nr telefonu
# VariableRequiredEN: $Mobile, Phone number
# VariableRequiredPL: $Email, E-mail
# VariableRequiredEN: $Email, E-mail
# VariableUserRequiredPL: $UserLocation, Lokalizacja użytkownika
# VariableUserRequiredEN: $UserLocation, User location
# VariableSwitchPL: $ChangeAtLogon=true, Wymuś zmianę hasła przy następnym logowaniu
# VariableSwitchEN: $ChangeAtLogon=true, Require password change at next logon
# SirkVariableOptionSource: UserLocation=ad-user-locations
# SirkSystemCredential: AD
# SirkSystemCredential: SMS
# MultiHost: false
# runAsUser: 0

$ErrorActionPreference = 'Stop'
Import-Module ActiveDirectory -ErrorAction Stop
. (Join-Path $env:MYSCRIPTS_SCRIPTS_ROOT '_shared\Sirk-AdSms.ps1')

$first=ConvertTo-SirkLoginPart $FirstName;$last=ConvertTo-SirkLoginPart $LastName
if(-not $first -or -not $last){throw 'First name and last name must contain login-compatible characters.'}
$allowedLocations = @($env:MYSCRIPTS_AD_USER_LOCATIONS_JSON | ConvertFrom-Json)
if (-not ($allowedLocations | Where-Object { [string]$_.dn -eq [string]$UserLocation })) { throw 'Selected user location is not allowed by the Active Directory integration settings.' }
$normalizedMobile = ([string]$Mobile -replace '[^0-9]', '')
if ($normalizedMobile -notmatch '^\d{9,15}$') { throw 'Phone number must contain between 9 and 15 digits.' }
if ([string]$Email -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') { throw 'E-mail address is invalid.' }
$sec=ConvertTo-SecureString $env:MYSCRIPTS_AD_PASSWORD -AsPlainText -Force;$cred=[pscredential]::new($env:MYSCRIPTS_AD_LOGIN,$sec)
$suffix=if($env:MYSCRIPTS_AD_UPN_SUFFIX){$env:MYSCRIPTS_AD_UPN_SUFFIX}else{$env:MYSCRIPTS_AD_DOMAIN}
if ($suffix -notmatch '^[A-Za-z0-9.-]+$') { throw 'The configured UPN suffix is invalid.' }
$login=$null
$maximumPrefixLength = [Math]::Min($first.Length, 18)
for($length=1;$length -le $maximumPrefixLength;$length++){$prefix=$first.Substring(0,$length)+'.';$candidate=$prefix+$last.Substring(0,[Math]::Min($last.Length,20-$prefix.Length));$candidateUpn=$candidate+'@'+$suffix;if(-not(Get-ADUser -Filter "SamAccountName -eq '$candidate' -or UserPrincipalName -eq '$candidateUpn'" -Server $env:MYSCRIPTS_AD_DOMAIN -Credential $cred)){$login=$candidate;break}}
if(-not $login){for($number=2;$number -le 9999;$number++){$numberText=[string]$number;$base=$first+'.'+$last;$candidate=$base.Substring(0,[Math]::Min($base.Length,20-$numberText.Length))+$numberText;$candidateUpn=$candidate+'@'+$suffix;if(-not(Get-ADUser -Filter "SamAccountName -eq '$candidate' -or UserPrincipalName -eq '$candidateUpn'" -Server $env:MYSCRIPTS_AD_DOMAIN -Credential $cred)){$login=$candidate;break}}}
if(-not $login){throw 'Could not allocate a unique AD login.'}
$upn=$login+'@'+$suffix;$password=New-SirkPassword
New-ADUser -Name $login -GivenName $FirstName -Surname $LastName -DisplayName ($FirstName+' '+$LastName) -SamAccountName $login -UserPrincipalName $upn -EmailAddress $Email -MobilePhone $normalizedMobile -Path $UserLocation -AccountPassword (ConvertTo-SecureString $password -AsPlainText -Force) -Enabled $true -ChangePasswordAtLogon ([string]$ChangeAtLogon -match '^(1|true|yes|tak|on)$') -Server $env:MYSCRIPTS_AD_DOMAIN -Credential $cred
$smsText = "Konto w domenie $($env:MYSCRIPTS_AD_DOMAIN) zostało utworzone. Tymczasowe hasło:`r`n`r`n$password"
Send-SirkSms -Number $normalizedMobile -Text $smsText
[ordered]@{success=$true;login=$login;userPrincipalName=$upn;location=$UserLocation;mobile=($normalizedMobile -replace '.(?=.{4})','*');changeAtLogon=([string]$ChangeAtLogon -match '^(1|true|yes|tak|on)$')}
