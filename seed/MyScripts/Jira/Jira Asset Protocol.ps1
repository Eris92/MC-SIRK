# Jira Asset Protocol|Generuje chroniony protokół PDF na podstawie aktualnych danych Jira Assets.
# PL: Protokół Jira Asset|Wybierz użytkownika, sprzęt i operację dla każdej pozycji oraz osobę IT.
# EN: Jira Asset Protocol|Select a Jira user, equipment, a per-asset operation and the IT person.
# VariableUserRequired: $JiraUser, Użytkownik Jira|Dane są pobierane z aktualnego profilu Jira i cache MC-SIRK.
# VariableAssetRequired: $PcName, Sprzęt|Lista obejmuje sprzęt z zakresu protokołu; operację wybiera się osobno dla każdej zaznaczonej pozycji.
# VariableUserRequired: $ItPerson, Osoba IT|Lista użytkowników MeshCentral; domyślnie aktualnie zalogowany operator.
# SirkWorkflow: JiraAssetProtocol
# SirkSystemCredential: Jira
# SirkJiraAssetAql: objectType in objectTypeAndChildren("Sprzęt użytkownika")
# SirkJiraAssetLabelAttribute: Nazwa_sieciowa
# SirkJiraAssetUserVariable: JiraUser
# MultiHost: false
# runAsUser: 0

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

throw 'Jira Asset Protocol musi być wykonywany przez kanoniczny workflow Jira w MC-SIRK.'
