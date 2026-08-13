#PL Wyślij e-mail przez SMTP Relay | Wysyła wiadomość tekstową lub HTML, opcjonalnie z załącznikami z dozwolonego katalogu serwera.
#EN Send mail through SMTP Relay | Sends a text or HTML message with optional attachments from the allowed server directory.
# Approval: true
# VariablePL: $From, Nadawca | Puste pole użyje domyślnego nadawcy z Integrations
# VariableEN: $From, Sender | Leave blank to use the default sender from Integrations
# VariableRequiredPL: $To, Do | Wiele adresów rozdziel przecinkiem, średnikiem lub nową linią
# VariableRequiredEN: $To, To | Separate multiple addresses with comma, semicolon or a new line
# VariablePL: $Cc, DW
# VariableEN: $Cc, CC
# VariablePL: $Bcc, UDW
# VariableEN: $Bcc, BCC
# VariableRequiredPL: $Subject, Temat
# VariableRequiredEN: $Subject, Subject
# VariableRequiredPL: $Body, Treść wiadomości
# VariableRequiredEN: $Body, Message body
# VariablePL: $Attachments, Załączniki | Ścieżki względne wobec dozwolonego katalogu lub pełne ścieżki w tym katalogu; po jednej w wierszu
# VariableEN: $Attachments, Attachments | Paths relative to the allowed root or full paths inside it; one per line
# VariableSwitchPL: $BodyAsHtml=false, Treść HTML
# VariableSwitchEN: $BodyAsHtml=false, HTML body
# SirkVariableMultiline: Body, Attachments
# SirkWorkflow: RelayMailSend
# SirkSystemCredential: SMTP
# MultiHost: false
# runAsUser: 0

$ErrorActionPreference = 'Stop'
$mail = $null
$smtp = $null

function ConvertTo-SirkMailAddresses {
    param([string]$Value)
    return @($Value -split '[;,\r\n]+' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

try {
    $sender = if ([string]::IsNullOrWhiteSpace([string]$From)) { [string]$env:MYSCRIPTS_SMTP_FROM } else { [string]$From }
    if ([string]::IsNullOrWhiteSpace($sender)) { throw 'Sender address is required.' }
    $toAddresses = ConvertTo-SirkMailAddresses $To
    $ccAddresses = ConvertTo-SirkMailAddresses $Cc
    $bccAddresses = ConvertTo-SirkMailAddresses $Bcc
    if ($toAddresses.Count -eq 0) { throw 'At least one recipient is required.' }

    $mail = [System.Net.Mail.MailMessage]::new()
    $mail.From = [System.Net.Mail.MailAddress]::new($sender)
    foreach ($address in $toAddresses) { [void]$mail.To.Add($address) }
    foreach ($address in $ccAddresses) { [void]$mail.CC.Add($address) }
    foreach ($address in $bccAddresses) { [void]$mail.Bcc.Add($address) }
    $mail.Subject = [string]$Subject
    $mail.Body = [string]$Body
    $mail.IsBodyHtml = [string]$BodyAsHtml -match '^(1|true|yes|tak|on)$'
    $mail.SubjectEncoding = [Text.Encoding]::UTF8
    $mail.BodyEncoding = [Text.Encoding]::UTF8
    $mail.HeadersEncoding = [Text.Encoding]::UTF8

    $attachmentPaths = @([string]$Attachments -split '[;\r\n]+' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    $attachmentCount = 0
    $attachmentBytes = [int64]0
    if ($attachmentPaths.Count -gt 0) {
        $rootInput = [string]$env:MYSCRIPTS_SMTP_ATTACHMENT_ROOT
        if ([string]::IsNullOrWhiteSpace($rootInput)) { throw 'SMTP attachment root is not configured.' }
        $rootPath = [IO.Path]::GetFullPath((Resolve-Path -LiteralPath $rootInput -ErrorAction Stop).ProviderPath).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
        $rootPrefix = $rootPath + [IO.Path]::DirectorySeparatorChar
        $maximumBytes = [int64]$env:MYSCRIPTS_SMTP_MAX_ATTACHMENT_BYTES
        if ($maximumBytes -le 0) { $maximumBytes = 25MB }
        foreach ($attachmentPath in $attachmentPaths) {
            $candidate = if ([IO.Path]::IsPathRooted($attachmentPath)) { $attachmentPath } else { Join-Path $rootPath $attachmentPath }
            $resolved = [IO.Path]::GetFullPath((Resolve-Path -LiteralPath $candidate -ErrorAction Stop).ProviderPath)
            if (-not $resolved.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Attachment is outside the configured attachment root.' }
            $file = Get-Item -LiteralPath $resolved -ErrorAction Stop
            if (-not $file.PSIsContainer -and $file.Length -ge 0) {
                $attachmentBytes += [int64]$file.Length
                if ($attachmentBytes -gt $maximumBytes) { throw 'Total attachment size exceeds the configured limit.' }
                [void]$mail.Attachments.Add([System.Net.Mail.Attachment]::new($file.FullName))
                $attachmentCount++
            } else { throw 'Attachment must be a file.' }
        }
    }

    $port = [int]$env:MYSCRIPTS_SMTP_PORT
    if ($port -lt 1 -or $port -gt 65535) { throw 'SMTP port is invalid.' }
    $smtp = [System.Net.Mail.SmtpClient]::new([string]$env:MYSCRIPTS_SMTP_SERVER, $port)
    $smtp.UseDefaultCredentials = $false
    $smtp.Credentials = $null
    $smtp.EnableSsl = [string]$env:MYSCRIPTS_SMTP_ENABLE_SSL -match '^(1|true|yes|tak|on)$'
    $smtp.DeliveryMethod = [System.Net.Mail.SmtpDeliveryMethod]::Network
    $smtp.Timeout = 30000
    $smtp.Send($mail)

    [ordered]@{
        success = $true
        recipients = $toAddresses.Count
        cc = $ccAddresses.Count
        bcc = $bccAddresses.Count
        attachments = $attachmentCount
        html = $mail.IsBodyHtml
    }
} finally {
    if ($mail) { $mail.Dispose() }
    if ($smtp) { $smtp.Dispose() }
}
