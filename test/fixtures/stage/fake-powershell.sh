#!/bin/sh
# Test double for the server stage (SirkServerStage). Never used at runtime.
printf '%s' "$SIRK_STAGE_VARIABLES_JSON|$SIRK_STAGE_NODE_JSON|$MYSCRIPTS_CA_TEMPLATE" > "$SIRK_FAKE_TRACE"
case "$SIRK_FAKE_MODE" in
  one) printf 'full address:s:pc01\r\nsignature:s:AAAA\r\n' > "$MYSCRIPTS_OUTPUT_DIR/pc01.rdp"; echo "Signed on SRV: pc01.rdp" ;;
  none) echo "nothing" ;;
  two) echo a > "$MYSCRIPTS_OUTPUT_DIR/a.rdp"; echo b > "$MYSCRIPTS_OUTPUT_DIR/b.rdp" ;;
  big) head -c 300000 /dev/zero > "$MYSCRIPTS_OUTPUT_DIR/big.rdp" ;;
  fail) echo "No valid certificate"; exit 1 ;;
esac
exit 0
