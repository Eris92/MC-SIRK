# Jira Cache Assets|Odświeża współdzielony 24-godzinny cache całego sprzętu Jira Assets.
# PL: Cache Jira - sprzęt|Używa świeżego cache albo wymusza ponowne pobranie całego sprzętu użytkowników.
# EN: Jira cache - assets|Uses the fresh cache or forces all user equipment to be downloaded again.
# VariableSwitch: $Force, false, Wymuś odświeżenie|Pobierz ponownie także wtedy, gdy cache ma mniej niż 24 godziny.
# SirkWorkflow: JiraAssetsCache
# SirkSystemCredential: Jira
# SirkJiraAssetAql: objectType in objectTypeAndChildren("Sprzęt użytkownika")
# SirkJiraAssetLabelAttribute: Nazwa_sieciowa
# MultiHost: false
# runAsUser: 0

# Wykonanie jest celowo obsługiwane przez wspólny server-side owner Jira cache.
$Force | Out-Null
