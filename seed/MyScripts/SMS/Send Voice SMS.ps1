#PL Wyślij Voice SMS | Wysyła głosową wiadomość TTS do jednego lub wielu numerów.
#EN Send Voice SMS | Sends a TTS voice message to one or many phone numbers.
# Approval: false
# VariableRequiredPL: $PhoneNumbers, Numery telefonu | Rozdziel numery przecinkiem, średnikiem lub spacją
# VariableRequiredEN: $PhoneNumbers, Phone numbers | Separate numbers with comma, semicolon or space
# VariableRequiredPL: $Message, Wiadomość głosowa
# VariableRequiredEN: $Message, Voice message
# VariableSelectPL: $Lector=ewa, Lektor | Wybierz głos lektora |ewa=Ewa|maja=Maja|jan=Jan|jacek=Jacek|agnieszka=Agnieszka
# VariableSelectEN: $Lector=ewa, Lector | Select the lector voice |ewa=Ewa|maja=Maja|jan=Jan|jacek=Jacek|agnieszka=Agnieszka
# SirkWorkflow: VmsSend
# SirkSystemCredential: SMS
# MultiHost: false
# runAsUser: 0

# Wykonanie obsługuje bezpieczny server-side owner SMSAPI.
$PhoneNumbers, $Message, $Lector | Out-Null
