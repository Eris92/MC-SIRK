#PL Wyślij SMS | Wysyła jedną wiadomość do jednego lub wielu numerów.
#EN Send SMS | Sends one message to one or many phone numbers.
# Approval: true
# VariableRequiredPL: $PhoneNumbers, Numery telefonu | Rozdziel numery przecinkiem, średnikiem lub spacją
# VariableRequiredEN: $PhoneNumbers, Phone numbers | Separate numbers with comma, semicolon or space
# VariableRequiredPL: $Message, Wiadomość
# VariableRequiredEN: $Message, Message
# SirkWorkflow: SmsSend
# SirkSystemCredential: SMS
# MultiHost: false
# runAsUser: 0

# Wykonanie obsługuje bezpieczny server-side owner SMSAPI.
$PhoneNumbers, $Message | Out-Null
