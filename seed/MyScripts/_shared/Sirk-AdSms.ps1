function Get-SirkRandomIndex {
    param([Parameter(Mandatory = $true)][int]$Maximum)
    if ($Maximum -le 0) { throw 'Maximum must be greater than zero.' }
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $bytes = New-Object byte[] 4
        $range = [uint64][uint32]::MaxValue + 1
        $limit = $range - ($range % [uint64]$Maximum)
        do {
            $generator.GetBytes($bytes)
            $value = [BitConverter]::ToUInt32($bytes, 0)
        } while ([uint64]$value -ge $limit)
        return [int]([uint64]$value % [uint64]$Maximum)
    } finally {
        $generator.Dispose()
    }
}

function New-SirkPassword {
    $upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.ToCharArray()
    $lower = 'abcdefghijkmnopqrstuvwxyz'.ToCharArray()
    $digits = '23456789'.ToCharArray()
    $special = '!@#$%&*?'.ToCharArray()
    $all = $upper + $lower + $digits + $special
    $chars = [Collections.Generic.List[char]]::new()
    $chars.Add($upper[(Get-SirkRandomIndex $upper.Count)])
    $chars.Add($lower[(Get-SirkRandomIndex $lower.Count)])
    $chars.Add($digits[(Get-SirkRandomIndex $digits.Count)])
    $chars.Add($special[(Get-SirkRandomIndex $special.Count)])
    while ($chars.Count -lt 12) { $chars.Add($all[(Get-SirkRandomIndex $all.Count)]) }
    for ($index = $chars.Count - 1; $index -gt 0; $index--) {
        $swap = Get-SirkRandomIndex ($index + 1)
        $temporary = $chars[$index]; $chars[$index] = $chars[$swap]; $chars[$swap] = $temporary
    }
    return -join $chars
}

function ConvertTo-SirkLoginPart {
    param([Parameter(Mandatory = $true)][string]$Value)
    $normalized = $Value.ToLowerInvariant().Normalize([Text.NormalizationForm]::FormD)
    $builder = [Text.StringBuilder]::new()
    foreach ($character in $normalized.ToCharArray()) {
        if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($character) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$builder.Append($character)
        }
    }
    $result = $builder.ToString().Normalize([Text.NormalizationForm]::FormC)
    $result = $result.Replace([char]0x0142, [char]0x006c).Replace([char]0x0111, [char]0x0064)
    return ($result -replace '[^a-z0-9-]', '')
}

function Send-SirkSms {
    param([Parameter(Mandatory = $true)][string]$Number, [Parameter(Mandatory = $true)][string]$Text)
    if ([string]::IsNullOrWhiteSpace($env:MYSCRIPTS_SMS_API_TOKEN)) { throw 'SMSAPI credential is not configured.' }
    $normalizedNumber = ($Number -replace '[^0-9]', '')
    if ($normalizedNumber -notmatch '^\d{9,15}$') { throw 'Phone number must contain between 9 and 15 digits.' }
    $headers = @{ Authorization = "Bearer $($env:MYSCRIPTS_SMS_API_TOKEN)" }
    $body = @{ to = $normalizedNumber; message = $Text; format = 'json'; encoding = 'utf-8' }
    if ($env:MYSCRIPTS_SMS_SENDER) { $body.from = $env:MYSCRIPTS_SMS_SENDER }
    $response = Invoke-RestMethod -Uri ($env:MYSCRIPTS_SMS_API_URL.TrimEnd('/') + '/sms.do') -Method Post -Headers $headers -Body $body
    if ($response.error) { throw "SMSAPI error: $($response.message)" }
}
