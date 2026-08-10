# Label: Jira Asset Protocol
# Description: Generate a transfer or return protocol for a Jira Assets computer assigned to a Jira user.
# LabelPL: Protokół Jira Asset
# DescriptionPL: Generuje protokół przekazania lub zwrotu komputera Jira Assets przypisanego do użytkownika Jira.
# SirkWorkflow: JiraAssetProtocol
# VariableUserRequired: JiraUser,Użytkownik Jira | Wybierz użytkownika Jira, którego sprzęt ma zostać użyty w protokole
# VariableAssetRequired: PcName,Komputer | Wybierz komputer przypisany do użytkownika Jira
# VariableSwitch: IsTransferProtocol,Protokół przekazania | Włącz dla przekazania, wyłącz dla zwrotu
# VariableUserRequired: ItPerson,Osoba IT | Wybierz osobę IT z Jira albo wpisz własną nazwę
# ConfirmExecution: true
# ShowOnDesktop: false
# ShowWithoutDesktop: true
# MultiHost: false

$encoded = [string]$env:MYSCRIPTS_JIRA_PROTOCOL_DATA_B64
if ([string]::IsNullOrWhiteSpace($encoded)) {
    throw 'Normalized Jira Asset Protocol data is unavailable.'
}

try {
    $json = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encoded))
    $protocol = $json | ConvertFrom-Json
}
catch {
    throw "Unable to decode normalized Jira Asset Protocol data: $($_.Exception.Message)"
}

[pscustomobject]@{
    Workflow = 'JiraAssetProtocol'
    Mode = [string]$protocol.mode
    Date = [string]$protocol.date
    User = [string]$protocol.user
    ItPerson = [string]$protocol.itPerson
    Hostname = [string]$protocol.asset.hostname
    Model = [string]$protocol.asset.model
    SerialNumber = [string]$protocol.asset.serial
    InventoryNumber = [string]$protocol.asset.inventory
    JiraAssetKey = [string]$protocol.asset.key
}
