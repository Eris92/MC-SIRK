# PL: Raport zakresu SMS i Voice w Entra ID | Pokazuje zakres metod SMS/Voice i generuje CSV gotowy do pobrania.
# EN: Entra ID SMS and Voice policy scope report | Shows SMS/Voice authentication method scope and generates a downloadable CSV.
# Approval: false
# SirkSystemCredential: Entra
# runAsUser: 0

$ErrorActionPreference = 'Stop'

function Get-RequiredValue {
    param([string[]]$Names)
    foreach ($name in $Names) {
        $variable = Get-Variable -Name $name -Scope Script -ErrorAction SilentlyContinue
        if ($variable -and -not [string]::IsNullOrWhiteSpace([string]$variable.Value)) { return [string]$variable.Value }
        $envValue = [Environment]::GetEnvironmentVariable($name)
        if (-not [string]::IsNullOrWhiteSpace($envValue)) { return $envValue }
    }
    throw "Brak wymaganej wartości integracji Entra: $($Names -join '/')."
}

$tenantId = Get-RequiredValue @('TenantId', 'TenantID', 'MYSCRIPTS_ENTRA_TENANT_ID')
$clientId = Get-RequiredValue @('ClientId', 'ClientID', 'AppId', 'MYSCRIPTS_ENTRA_CLIENT_ID')
$clientSecret = Get-RequiredValue @('ClientSecret', 'AppSecret', 'MYSCRIPTS_ENTRA_CLIENT_SECRET')

$tokenResponse = Invoke-RestMethod -Method Post -Uri ("https://login.microsoftonline.com/{0}/oauth2/v2.0/token" -f [uri]::EscapeDataString($tenantId)) -ContentType 'application/x-www-form-urlencoded' -Body @{
    client_id = $clientId
    client_secret = $clientSecret
    scope = 'https://graph.microsoft.com/.default'
    grant_type = 'client_credentials'
}
if (-not $tokenResponse.access_token) { throw 'Nie udało się uzyskać tokenu Microsoft Graph.' }

$headers = @{ Authorization = "Bearer $($tokenResponse.access_token)" }
$graphRoot = 'https://graph.microsoft.com/v1.0'

function Invoke-GraphGet {
    param([Parameter(Mandatory=$true)][string]$Path)
    Invoke-RestMethod -Method Get -Uri ($graphRoot + $Path) -Headers $headers
}

function Get-TargetValue {
    param($Target, [string]$Name)
    if ($null -eq $Target) { return $null }
    $property = $Target.PSObject.Properties[$Name]
    if ($property) { return $property.Value }
    if ($Target.additionalProperties -and $Target.additionalProperties.$Name) { return $Target.additionalProperties.$Name }
    return $null
}

$groupNameCache = @{}
function Resolve-GroupName {
    param([string]$Id)
    if ([string]::IsNullOrWhiteSpace($Id)) { return '' }
    if ($groupNameCache.ContainsKey($Id)) { return $groupNameCache[$Id] }
    try {
        $group = Invoke-GraphGet ("/groups/{0}?`$select=displayName" -f [uri]::EscapeDataString($Id))
        $name = if ($group.displayName) { [string]$group.displayName } else { $Id }
    } catch { $name = $Id }
    $groupNameCache[$Id] = $name
    return $name
}

function Get-PolicyScope {
    param($Policy)
    $includeTargets = @($Policy.includeTargets)
    $excludeTargets = @($Policy.excludeTargets)
    $result = [ordered]@{
        IsAllUsers = $false
        IncludedGroups = @()
        ExcludedGroups = @()
        IncludedUsers = @()
        ExcludedUsers = @()
    }

    foreach ($target in $includeTargets) {
        $type = [string](Get-TargetValue $target 'targetType')
        $id = [string](Get-TargetValue $target 'id')
        if ($type -eq 'group') {
            if ($id -eq 'all_users') { $result.IsAllUsers = $true }
            elseif ($id) { $result.IncludedGroups += [PSCustomObject]@{ Id=$id; DisplayName=(Resolve-GroupName $id) } }
        } elseif ($type -eq 'user' -and $id) { $result.IncludedUsers += $id }
    }
    foreach ($target in $excludeTargets) {
        $type = [string](Get-TargetValue $target 'targetType')
        $id = [string](Get-TargetValue $target 'id')
        if ($type -eq 'group' -and $id) { $result.ExcludedGroups += [PSCustomObject]@{ Id=$id; DisplayName=(Resolve-GroupName $id) } }
        elseif ($type -eq 'user' -and $id) { $result.ExcludedUsers += $id }
    }
    [PSCustomObject]$result
}

$authPolicy = Invoke-GraphGet '/policies/authenticationMethodsPolicy'
$campaign = $authPolicy.registrationEnforcement.authenticationMethodsRegistrationCampaign
$campaignState = if ($campaign.state) { [string]$campaign.state } else { 'unknown' }
$displayCampaign = if ($campaignState -eq 'default') { 'Microsoft managed' } else { $campaignState }
Write-Output "Registration campaign: $displayCampaign"

$smsPolicy = Invoke-GraphGet '/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/sms'
$voicePolicy = Invoke-GraphGet '/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/voice'
Write-Output "SMS state: $($smsPolicy.state)"
Write-Output "Voice state: $($voicePolicy.state)"

$smsScope = if ($smsPolicy.state -eq 'enabled') { Get-PolicyScope $smsPolicy } else { $null }
$voiceScope = if ($voicePolicy.state -eq 'enabled') { Get-PolicyScope $voicePolicy } else { $null }

$export = [System.Collections.Generic.List[object]]::new()
foreach ($entry in @(@{ Name='SMS'; Scope=$smsScope }, @{ Name='Voice'; Scope=$voiceScope })) {
    $scope = $entry.Scope
    if (-not $scope) { continue }
    if ($scope.IsAllUsers) { $export.Add([PSCustomObject]@{ Policy=$entry.Name; Type='Include'; TargetType='AllUsers'; Id='all_users'; DisplayName='All Users' }) }
    foreach ($group in $scope.IncludedGroups) { $export.Add([PSCustomObject]@{ Policy=$entry.Name; Type='Include'; TargetType='Group'; Id=$group.Id; DisplayName=$group.DisplayName }) }
    foreach ($user in $scope.IncludedUsers) { $export.Add([PSCustomObject]@{ Policy=$entry.Name; Type='Include'; TargetType='User'; Id=$user; DisplayName='' }) }
    foreach ($group in $scope.ExcludedGroups) { $export.Add([PSCustomObject]@{ Policy=$entry.Name; Type='Exclude'; TargetType='Group'; Id=$group.Id; DisplayName=$group.DisplayName }) }
    foreach ($user in $scope.ExcludedUsers) { $export.Add([PSCustomObject]@{ Policy=$entry.Name; Type='Exclude'; TargetType='User'; Id=$user; DisplayName='' }) }
}

$csvPath = Join-Path $PSScriptRoot ("SmsVoicePolicyTargets_{0}.csv" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))
$export | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
Write-Output "Wygenerowano raport CSV: $csvPath"
Write-Output "Liczba rekordow: $($export.Count)"
Write-Output "CSV_DOWNLOAD: $csvPath"

if ($smsScope -or $voiceScope) {
    Write-Output 'Sep 1, 2026: Users in SMS/Voice scope are auto-enabled for passkeys when the registration campaign is Microsoft managed.'
    Write-Output 'Jan 28, 2027: Microsoft SMS/Voice delivery is retired; migrate to passkeys or a customer-managed provider.'
} else {
    Write-Output 'SMS/Voice disabled - no action required.'
}
