#!/bin/sh
# Test double for the My Scripts PowerShell host (#407). Never used at runtime.
for last; do :; done
command=$(printf '%s' "$last" | base64 -d 2>/dev/null | iconv -f UTF-16LE -t UTF-8 2>/dev/null)
csr=$(printf '%s' "$command" | sed -n "s/.*\$CsrFile='\([^']*\)'.*/\1/p")
if [ -z "$csr" ] || [ ! -f "$csr" ]; then echo "CSR path missing"; exit 3; fi
printf '%s' "$csr" > "$SIRK_FAKE_TRACE"
case "$SIRK_FAKE_MODE" in
  issue) cp "$SIRK_FAKE_CERT" "$MYSCRIPTS_OUTPUT_DIR/certificate-1.cer"; echo "Certificate issued." ;;
  pending) echo "The CA left the request pending (RequestId 7). No certificate was issued."; exit 1 ;;
  silent) echo "done" ;;
esac
exit 0
