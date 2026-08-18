$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$helper = Join-Path $root 'seed\MyScripts\_shared\Sirk-AdSms.ps1'
. $helper

$sample = -join @(
    [char]0x005A, [char]0x0061, [char]0x017C, [char]0x00F3, [char]0x0142, [char]0x0107, [char]0x0020,
    [char]0x0067, [char]0x0119, [char]0x015B, [char]0x006C, [char]0x0105, [char]0x0020,
    [char]0x006A, [char]0x0061, [char]0x017A, [char]0x0144
)
$body = ConvertTo-SirkSmsFormBody -Number '48500100200' -Text $sample -Sender 'SIRK'

if ($body -match '[^\x00-\x7F]') {
    throw 'SMS form body still contains non-ASCII characters; Windows PowerShell may recode them before transport.'
}
if ($body -notmatch 'encoding=utf-8') {
    throw 'SMSAPI UTF-8 encoding parameter is missing.'
}
if ($body -notmatch 'message=Za%C5%BC%C3%B3%C5%82%C4%87%20g%C4%99%C5%9Bl%C4%85%20ja%C5%BA%C5%84') {
    throw "Polish SMS text was not percent-encoded as UTF-8: $body"
}
if ($body -notmatch 'to=48500100200' -or $body -notmatch 'from=SIRK') {
    throw 'SMS form body lost required routing fields.'
}

Write-Host 'Windows PowerShell SMS UTF-8 percent-encoding smoke: OK'
