$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'
$VerbosePreference = 'SilentlyContinue'
$InformationPreference = 'SilentlyContinue'

function Write-SirkJson {
    param([Parameter(Mandatory = $true)][object]$Value)
    $json = ConvertTo-Json -InputObject $Value -Depth 6 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $stream = [Console]::OpenStandardOutput()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Flush()
}

function ConvertTo-SirkLdapValue {
    param([string]$Value)
    $builder = New-Object System.Text.StringBuilder
    foreach ($character in ([string]$Value).ToCharArray()) {
        switch ([int][char]$character) {
            0 { [void]$builder.Append('\00') }
            40 { [void]$builder.Append('\28') }
            41 { [void]$builder.Append('\29') }
            42 { [void]$builder.Append('\2a') }
            92 { [void]$builder.Append('\5c') }
            default { [void]$builder.Append($character) }
        }
    }
    return $builder.ToString()
}

function Get-SirkDirectoryProperty {
    param(
        [Parameter(Mandatory = $true)][System.DirectoryServices.SearchResult]$Result,
        [Parameter(Mandatory = $true)][string]$Name
    )
    if ($Result.Properties.Contains($Name) -and $Result.Properties[$Name].Count -gt 0) {
        return [string]$Result.Properties[$Name][0]
    }
    return ''
}

$rootDse = $null
$root = $null
try {
    if ([string]::IsNullOrWhiteSpace($env:SIRK_AD_DOMAIN) -or
        [string]::IsNullOrWhiteSpace($env:SIRK_AD_LOGIN) -or
        [string]::IsNullOrWhiteSpace($env:SIRK_AD_PASSWORD)) {
        throw 'Active Directory integration is not configured.'
    }

    try {
        $utf8 = New-Object System.Text.UTF8Encoding($false)
        [Console]::InputEncoding = $utf8
        [Console]::OutputEncoding = $utf8
    } catch {}

    $matchMode = ([string]$env:SIRK_AD_MATCH_MODE).ToLowerInvariant()
    $wanted = @()
    if ($matchMode -eq 'upn') {
        $raw = [string]$env:SIRK_AD_UPNS_JSON
        if ([string]::IsNullOrWhiteSpace($raw)) { $raw = [Console]::In.ReadToEnd() }
        if (-not [string]::IsNullOrWhiteSpace($raw)) {
            $wanted = @(ConvertFrom-Json -InputObject $raw | ForEach-Object { ([string]$_).Trim().ToLowerInvariant() } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)
        }
        if ($wanted.Count -eq 0) {
            Write-SirkJson ([ordered]@{ ok = $true; rows = @() })
            return
        }
    }

    $authentication = [System.DirectoryServices.AuthenticationTypes]::Secure
    $rootDsePath = 'LDAP://' + $env:SIRK_AD_DOMAIN + '/RootDSE'
    $rootDse = New-Object System.DirectoryServices.DirectoryEntry($rootDsePath, $env:SIRK_AD_LOGIN, $env:SIRK_AD_PASSWORD, $authentication)
    $baseDn = [string]$rootDse.Properties['defaultNamingContext'][0]
    if ([string]::IsNullOrWhiteSpace($baseDn)) { throw 'Active Directory default naming context is unavailable.' }

    $rootPath = 'LDAP://' + $env:SIRK_AD_DOMAIN + '/' + $baseDn
    $root = New-Object System.DirectoryServices.DirectoryEntry($rootPath, $env:SIRK_AD_LOGIN, $env:SIRK_AD_PASSWORD, $authentication)
    $rows = New-Object System.Collections.Generic.List[object]
    $seen = @{}

    $queries = New-Object System.Collections.Generic.List[string]
    if ($matchMode -eq 'upn') {
        $chunkSize = 1000
        for ($offset = 0; $offset -lt $wanted.Count; $offset += $chunkSize) {
            $last = [Math]::Min($offset + $chunkSize, $wanted.Count)
            $parts = New-Object System.Collections.Generic.List[string]
            for ($index = $offset; $index -lt $last; $index++) {
                [void]$parts.Add('(userPrincipalName=' + (ConvertTo-SirkLdapValue $wanted[$index]) + ')')
            }
            [void]$queries.Add('(&(objectCategory=person)(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2))(|' + ($parts -join '') + '))')
        }
    } else {
        [void]$queries.Add('(&(objectCategory=person)(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))')
    }

    foreach ($ldap in $queries) {
        $searcher = New-Object System.DirectoryServices.DirectorySearcher($root)
        $results = $null
        try {
            $searcher.Filter = $ldap
            $searcher.PageSize = 1000
            $searcher.SizeLimit = if ($matchMode -eq 'upn') { 1000 } else { 10000 }
            $searcher.ServerTimeLimit = [TimeSpan]::FromSeconds(8)
            $searcher.ClientTimeout = [TimeSpan]::FromSeconds(10)
            [void]$searcher.PropertiesToLoad.Add('sAMAccountName')
            [void]$searcher.PropertiesToLoad.Add('displayName')
            [void]$searcher.PropertiesToLoad.Add('mail')
            [void]$searcher.PropertiesToLoad.Add('userPrincipalName')
            $results = $searcher.FindAll()
            foreach ($result in $results) {
                $sam = Get-SirkDirectoryProperty -Result $result -Name 'samaccountname'
                $upn = Get-SirkDirectoryProperty -Result $result -Name 'userprincipalname'
                if ([string]::IsNullOrWhiteSpace($sam) -or [string]::IsNullOrWhiteSpace($upn)) { continue }
                $key = $sam.ToLowerInvariant()
                if ($seen.ContainsKey($key)) { continue }
                $seen[$key] = $true
                $displayName = Get-SirkDirectoryProperty -Result $result -Name 'displayname'
                $mail = Get-SirkDirectoryProperty -Result $result -Name 'mail'
                $label = if ([string]::IsNullOrWhiteSpace($displayName)) { $sam } else { $displayName + ' (' + $sam + ')' }
                [void]$rows.Add([ordered]@{
                    value = $sam
                    label = $label
                    displayName = $displayName
                    email = $mail
                    upn = $upn
                    active = $true
                })
            }
        } finally {
            if ($results -ne $null) { $results.Dispose() }
            $searcher.Dispose()
        }
    }

    $sorted = @($rows | Sort-Object displayName, value | Select-Object -First 10000)
    Write-SirkJson ([ordered]@{ ok = $true; rows = $sorted })
} catch {
    Write-SirkJson ([ordered]@{ ok = $false; error = [string]$_.Exception.Message })
    exit 1
} finally {
    if ($root -ne $null) { $root.Dispose() }
    if ($rootDse -ne $null) { $rootDse.Dispose() }
}
