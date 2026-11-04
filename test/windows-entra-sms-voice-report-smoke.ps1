$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $projectRoot 'seed/MyScripts/Entra ID/Get-SmsVoicePolicyUsers.ps1'
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($sourcePath, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -ne 0) {
    throw ('Entra SMS/Voice PowerShell parser errors: ' + (($parseErrors | ForEach-Object { $_.Message }) -join '; '))
}

$matches = @($ast.FindAll({
    param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
        $node.Name -eq 'Protect-CsvCell'
}, $true))
if ($matches.Count -ne 1) { throw 'Expected exactly one CSV cell protection function.' }
. ([ScriptBlock]::Create($matches[0].Extent.Text))

$formulaSamples = @(
    '=HYPERLINK("https://example.com","open")',
    ' +SUM(A1:A2)',
    '-1+2',
    '@SUM(A1)',
    ([string][char]9 + '=cmd')
)
$cases = @()
foreach ($inputValue in $formulaSamples) {
    $cases += @{ Input=$inputValue; Expected=("'" + $inputValue) }
}
$cases += @{ Input='Safe display name'; Expected='Safe display name' }
$cases += @{ Input=''; Expected='' }
foreach ($case in $cases) {
    $actual = Protect-CsvCell $case.Input
    if ($actual -cne $case.Expected) {
        throw ('Unexpected CSV cell protection result for input: ' + $case.Input)
    }
}
Write-Output 'Entra SMS/Voice PowerShell parser and CSV formula protection: OK'
