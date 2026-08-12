# Jira Cache Assets|
# PL: Cache Jira - sprzęt|
# EN: Jira cache - assets|
# VariableSwitch: $Force, false, Wymuś odświeżenie|
# SirkWorkflow: JiraAssetsCache
# SirkSystemCredential: Jira
# SirkJiraAssetAql: Key is not EMPTY
# SirkJiraAssetLabelAttribute: Nazwa_sieciowa
# MultiHost: false
# runAsUser: 0

# Wykonanie jest celowo obsługiwane przez wspólny server-side owner Jira cache.
$Force | Out-Null
