# Jira Cache Assets|
# PL: Cache Jira - sprzęt|
# EN: Jira cache - assets|
# VariableSwitch: $Force, false, Wymuś odświeżenie|
# SirkWorkflow: JiraAssetsCache
# SirkSystemCredential: Jira
# SirkJiraAssetAql: objectType in objectTypeAndChildren("Sprzęt użytkownika") OR objectType = "Users" OR object HAVING outboundReferences(objectType = "Users") OR object HAVING inboundReferences(objectType = "Users")
# SirkJiraAssetLabelAttribute: Nazwa_sieciowa
# MultiHost: false
# runAsUser: 0

# Wykonanie jest celowo obsługiwane przez wspólny server-side owner Jira cache.
$Force | Out-Null
