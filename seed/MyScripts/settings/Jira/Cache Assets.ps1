# Cache Assets|
# PL: Cache - sprzęt|
# EN: Cache - assets|
# VariableSwitch: $Force, false, Wymuś odświeżenie|
# SirkWorkflow: JiraAssetsCache
# SirkSystemCredential: Jira
# SirkJiraAssetAql: objectType in objectTypeAndChildren("Sprzęt użytkownika")
# SirkJiraAssetLabelAttribute: Nazwa_sieciowa
# MultiHost: false
# runAsUser: 0

# Wykonanie jest obsługiwane przez wspólny server-side owner cache.
$Force | Out-Null
