# Jira Cache Users|Odświeża współdzielony 24-godzinny cache użytkowników Jira.
# PL: Cache Jira - użytkownicy|Używa świeżego cache albo wymusza ponowne pobranie wszystkich użytkowników Jira.
# EN: Jira cache - users|Uses the fresh cache or forces all Jira users to be downloaded again.
# VariableSwitch: $Force, false, Wymuś odświeżenie|Pobierz ponownie także wtedy, gdy cache ma mniej niż 24 godziny.
# SirkWorkflow: JiraUsersCache
# SirkSystemCredential: Jira
# MultiHost: false
# runAsUser: 0

# Wykonanie jest celowo obsługiwane przez wspólny server-side owner Jira cache.
$Force | Out-Null
